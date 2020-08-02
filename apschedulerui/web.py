import logging
import threading
from datetime import datetime

import flask
import flask_socketio
from apscheduler.jobstores.base import JobLookupError
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from flask import Response

from apschedulerui.watcher import SchedulerWatcher, SchedulerEventsListener


class SchedulerUI(SchedulerEventsListener):

    def __init__(self, scheduler, capabilities=None, operation_timeout=1):
        """

        Args:
            scheduler (apscheduler.schedulers.base.BaseScheduler):

        Returns:

        """
        self.scheduler = scheduler
        self.capabilities = {
            'pause_job': False,
            'remove_job': False,
            'pause_scheduler': False,
            'stop_scheduler': False,
            'run_job': False,
        }

        if not (isinstance(operation_timeout, int) or isinstance(operation_timeout, float)):
            raise TypeError('operation_timeout should be either an int or a float')

        if operation_timeout <= 0:
            raise ValueError('operation_timeout should be a positive number')

        self.operation_timeout = operation_timeout

        if capabilities is not None:
            if isinstance(capabilities, dict):
                self.capabilities.update(capabilities)
            else:
                raise TypeError('capabilities should be a dict of str -> bool pairs')

        self._scheduler_listener = SchedulerWatcher(scheduler)

        self._web_server = flask.Flask(__name__)
        self._socket_io = None

        try:
            # TODO: see if we can support eventlet in the future.
            self._socket_io = flask_socketio.SocketIO(self._web_server, async_mode='gevent')
        except ValueError:
            self._socket_io = flask_socketio.SocketIO(self._web_server, async_mode='threading')

        self._init_endpoints()

        self._web_server_thread = None
        self._scheduler_lock = threading.Lock()

    def _init_endpoints(self):
        if self.capabilities.get('pause_scheduler', False):
            self._web_server.add_url_rule(
                '/api/scheduler/pause', 'pause_scheduler', self.pause_scheduler, methods=['POST']
            )
            self._web_server.add_url_rule(
                '/api/scheduler/resume', 'resume_scheduler', self.resume_scheduler, methods=['POST']
            )

        if self.capabilities.get('stop_scheduler', False):
            self._web_server.add_url_rule(
                '/api/scheduler/stop', 'stop_scheduler', self.stop_scheduler, methods=['POST']
            )
            self._web_server.add_url_rule(
                '/api/scheduler/start', 'start_scheduler', self.start_scheduler, methods=['POST']
            )

        if self.capabilities.get('remove_job', False):
            self._web_server.add_url_rule('/api/job/<job_id>/remove', 'remove_job', self.remove_job, methods=['POST'])

        if self.capabilities.get('pause_job', False):
            self._web_server.add_url_rule('/api/job/<job_id>/pause', 'pause_job', self.pause_job, methods=['POST'])
            self._web_server.add_url_rule('/api/job/<job_id>/resume', 'resume_job', self.resume_job, methods=['POST'])

        if self.capabilities.get('run_job', False):
            self._web_server.add_url_rule('/api/job/<job_id>/run_now', 'run_job', self.run_job, methods=['POST'])

        self._web_server.add_url_rule('/', 'index', self.index, defaults={'path': ''})
        self._web_server.add_url_rule('/<path:path>', 'index', self.index)

        self._socket_io.on_event('connected', self.client_connected)

    def index(self, path):
        return self._web_server.send_static_file('index.html')

    def _exec_scheduler_command(self, func, *args, **kwargs):
        if self._scheduler_lock.acquire(timeout=self.operation_timeout):
            try:
                func(*args, **kwargs)
                return 'ok'
            except JobLookupError:
                flask.abort(404, description="Job not found")
            finally:
                self._scheduler_lock.release()
        else:
            flask.abort(408, description="Failed to acquire scheduler lock to perform operation")

    def pause_scheduler(self):
        return self._exec_scheduler_command(self.scheduler.pause)

    def resume_scheduler(self):
        return self._exec_scheduler_command(self.scheduler.resume)

    def stop_scheduler(self):
        return self._exec_scheduler_command(self.scheduler.shutdown, wait=False)

    def start_scheduler(self):
        return self._exec_scheduler_command(self.scheduler.start)

    def pause_job(self, job_id):
        return self._exec_scheduler_command(self.scheduler.pause_job, job_id)

    def resume_job(self, job_id):
        return self._exec_scheduler_command(self.scheduler.resume_job, job_id)

    def run_job(self, job_id, next_run_time=None):
        logging.getLogger('apschedulerui').info('Running job %s' % job_id)
        if not job_id:
            return Response(status=404)

        if not next_run_time:
            next_run_time = datetime.now()

        def _run_job():
            job = self.scheduler.get_job(job_id)

            if not job:
                raise JobLookupError(job_id)

            # If a job is periodic (has an interval trigger) it should be triggered by modifying the trigger it already
            # has. Otherwise, it can be rescheduled to be ran now.
            if isinstance(job.trigger, IntervalTrigger) or isinstance(job.trigger, CronTrigger):
                self.scheduler.modify_job(job_id, next_run_time=next_run_time)
            else:
                job.reschedule(trigger='date', run_date=next_run_time)

        return self._exec_scheduler_command(_run_job)

    def remove_job(self, job_id):
        return self._exec_scheduler_command(self.scheduler.remove_job, job_id)

    def client_connected(self):
        logging.getLogger('apschedulerui').debug('Client connected')
        flask_socketio.emit('init_jobs', self._scheduler_listener.scheduler_summary())
        flask_socketio.emit('init_capabilities', self.capabilities)

    def job_event(self, event):
        self._socket_io.emit('job_event', event)

    def scheduler_event(self, event):
        self._socket_io.emit('scheduler_event', event)

    def jobstore_event(self, event):
        self._socket_io.emit('jobstore_event', event)

    def executor_event(self, event):
        self._socket_io.emit('executor_event', event)

    def start(self, host='0.0.0.0', port=5000, daemon=True):
        self._scheduler_listener.add_listener(self)
        self._web_server_thread = threading.Thread(target=self._start, name='apscheduler-ui', args=(host, port))
        self._web_server_thread.daemon = daemon
        self._web_server_thread.start()

    def _start(self, host, port):
        self._socket_io.run(self._web_server, host=host, port=port)
