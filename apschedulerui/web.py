import logging
import threading
import flask
import flask_socketio

from apschedulerui.watcher import SchedulerWatcher, SchedulerEventsListener


class SchedulerUI(SchedulerEventsListener):

    def __init__(self, scheduler, capabilities=None):
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

        if isinstance(capabilities, dict):
            self.capabilities.update(capabilities)

        self._scheduler_listener = SchedulerWatcher(scheduler)

        self._web_server = flask.Flask(__name__ )
        self._socket_io = None

        try:
            # TODO: see if we can support eventlet in the future.
            self._socket_io = flask_socketio.SocketIO(self._web_server, async_mode='gevent')
        except ValueError:
            self._socket_io = flask_socketio.SocketIO(self._web_server, async_mode='threading')

        self._init_endpoints()

        self._web_server_thread = None

    def _init_endpoints(self):
        if 'pause_job' in self.capabilities and self.capabilities['pause_job'] is True:
            self._web_server.add_url_rule('/api/job/pause/<job_id>', 'pause_job', self.pause_job, methods=['POST'])
            self._web_server.add_url_rule('/api/job/resume/<job_id>', 'resume_job', self.resume_job, methods=['POST'])

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

        self._web_server.add_url_rule('/', 'index', self.index, defaults={'path': ''})
        self._web_server.add_url_rule('/<path:path>', 'index', self.index)

        self._socket_io.on_event('connected', self.client_connected)

    def index(self, path):
        return self._web_server.send_static_file('index_ng.html')

    def pause_scheduler(self):
        # TODO: acquire lock!
        self.scheduler.pause()
        return 'ok'

    def resume_scheduler(self):
        # TODO: acquire lock!
        self.scheduler.resume()
        return 'ok'

    def stop_scheduler(self):
        # TODO: acquire lock!
        self.scheduler.shutdown(wait=False)
        return 'ok'

    def start_scheduler(self):
        # TODO: acquire lock!
        self.scheduler.start()
        return 'ok'

    def pause_job(self, job_id):
        # TODO: acquire lock!
        self.scheduler.pause_job(job_id)
        return 'ok'

    def resume_job(self, job_id):
        # TODO: acquire lock!
        self.scheduler.resume_job(job_id)
        return 'ok'

    def remove_job(self, job_id):
        # TODO: acquire lock!
        self.scheduler.remove_job(job_id)
        return 'ok'

    def client_connected(self):
        logging.info('Client connected')
        flask_socketio.emit('init_jobs', self._scheduler_listener.scheduler_summary())
        flask_socketio.emit('init_capabilities', self.capabilities)

    def job_event(self, event):
        self._socket_io.emit('job_event', event)

    def scheduler_event(self, event):
        self._socket_io.emit('scheduler_event', event)

    def start(self, daemon=True, **kwargs):
        self._scheduler_listener.add_listener(self)
        self._web_server_thread = threading.Thread(target=self._start, name='apscheduler-ui', kwargs=kwargs)
        self._web_server_thread.daemon = daemon
        self._web_server_thread.start()

    def _start(self, host='0.0.0.0', port=12673):
        self._socket_io.run(self._web_server, host=host, port=port)

