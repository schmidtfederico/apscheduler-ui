import logging
from abc import abstractmethod
from datetime import datetime

import apscheduler.events
import apscheduler.schedulers.base

from multiprocessing import RLock


class SchedulerEventsListener:

    @abstractmethod
    def _scheduler_event(self, event):
        """
        Event triggered whenever the scheduler status changes.

        Args:
            event (dict):
        """

    @abstractmethod
    def _job_event(self, event):
        """
        Event triggered when a job is added, modified, removed, when it's submitted for execution or when executing it
        finishes.

        Args:
            event (dict):
        """

    @abstractmethod
    def _jobstore_event(self, event):
        """
        Triggered any time an job store is added or removed from the scheduler.

        Args:
            event (dict):
        """

    @abstractmethod
    def _executor_event(self, event):
        """
        Triggered any time an executor is added or removed from the scheduler.

        Args:
            event (dict):
        """


class SchedulerWatcher:

    scheduler_states = {
        apscheduler.schedulers.base.STATE_RUNNING: 'running',
        apscheduler.schedulers.base.STATE_PAUSED: 'paused',
        apscheduler.schedulers.base.STATE_STOPPED: 'stopped'
    }

    apscheduler_events = {
        apscheduler.events.EVENT_SCHEDULER_STARTED: 'scheduler_started',
        apscheduler.events.EVENT_SCHEDULER_PAUSED: 'scheduler_paused',
        apscheduler.events.EVENT_SCHEDULER_SHUTDOWN: 'scheduler_shutdown',
        apscheduler.events.EVENT_SCHEDULER_RESUMED: 'scheduler_resumed',

        apscheduler.events.EVENT_EXECUTOR_ADDED: 'executor_added',
        apscheduler.events.EVENT_EXECUTOR_REMOVED: 'executor_removed',

        apscheduler.events.EVENT_JOBSTORE_ADDED: 'jobstore_added',
        apscheduler.events.EVENT_JOBSTORE_REMOVED: 'jobstore_removed',

        apscheduler.events.EVENT_ALL_JOBS_REMOVED: 'all_jobs_removed',
        apscheduler.events.EVENT_JOB_ADDED: 'job_added',
        apscheduler.events.EVENT_JOB_REMOVED: 'job_removed',
        apscheduler.events.EVENT_JOB_MODIFIED: 'job_modified',

        apscheduler.events.EVENT_JOB_EXECUTED: 'job_executed',
        apscheduler.events.EVENT_JOB_ERROR: 'job_error',
        apscheduler.events.EVENT_JOB_MISSED: 'job_missed',

        apscheduler.events.EVENT_JOB_SUBMITTED: 'job_submitted',
        apscheduler.events.EVENT_JOB_MAX_INSTANCES: 'job_max_instances'
    }

    def __init__(self, scheduler, max_events_per_job=100):
        """
        Inspects the scheduler, registers itself as a scheduler event listener and keeps track of all changes to the
        scheduler and its jobs.

        Args:
            scheduler (apscheduler.schedulers.base.BaseScheduler):
                A reference to the scheduler we'd like to watch.

            max_events_per_job (int):
                The maximum amount of events we'll keep in-memory for each job to send to the clients when they connect.
        """
        self.scheduler = scheduler
        self.listeners = []
        self.max_events_per_job = max_events_per_job

        self.jobstores = {}
        self.executors = {}
        self.scheduler_info = {}
        self.jobs = {}

        self.write_lock = RLock()

        with self.write_lock:
            # Append ourselves as listeners of the scheduler first.
            self.scheduler.add_listener(self._process_event, mask=apscheduler.events.EVENT_ALL)
            # Inspect scheduler to init our attributes.
            self._inspect_scheduler()

    def add_listener(self, listener: SchedulerEventsListener):
        if listener not in self.listeners:
            self.listeners.append(listener)

    def _inspect_scheduler(self):
        if hasattr(self.scheduler, '_jobstores') and isinstance(self.scheduler._jobstores, dict):
            self.jobstores = {
                alias: self._repr_jobstore(store) for alias, store in self.scheduler._jobstores.items()
            }

        if hasattr(self.scheduler, '_executors') and isinstance(self.scheduler._executors, dict):
            self.executors = {
                alias: self._repr_executor(executor) for alias, executor in self.scheduler._executors.items()
            }

        self.scheduler_info.update({
            'class': type(self.scheduler).__name__,
            'state': self.scheduler_states[self.scheduler.state],
            'timezone': str(self.scheduler.timezone),
            'jobstore_retry_interval': self.scheduler.jobstore_retry_interval
        })

        if hasattr(self.scheduler, '_job_defaults'):
            self.scheduler_info.update(self.scheduler._job_defaults)

        init_ts = self._repr_ts(datetime.now(tz=self.scheduler.timezone))

        if len(self.jobstores) > 0:
            for jobstore_alias in self.jobstores.keys():
                self._jobstore_added(jobstore_alias, init_ts)
        else:
            for job in self.scheduler.get_jobs():
                if job.id not in self.jobs:
                    self._job_added(job.id, job.jobstore, init_ts, job)

    def _process_event(self, event):
        """
        Scheduler events listener. Dispatches events to the corresponding method.
        Args:
            event (apscheduler.events.SchedulerEvent):
        """
        if event.code in self.apscheduler_events:
            event_ts = self._repr_ts(datetime.now(tz=self.scheduler.timezone))
            event_name = self.apscheduler_events[event.code]
            self.__getattribute__(event_name)(event, event_name, event_ts)

    def scheduler_started(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.SchedulerEvent):
        """
        with self.write_lock:
            self.scheduler_info['state'] = self.scheduler_states[self.scheduler.state]

        self.notify_scheduler_event(event_name, event_ts)

    def scheduler_shutdown(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.SchedulerEvent):
        """
        with self.write_lock:
            self.scheduler_info['state'] = self.scheduler_states[self.scheduler.state]

        self.notify_scheduler_event(event_name, event_ts)

    def scheduler_paused(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.SchedulerEvent):
        """
        with self.write_lock:
            self.scheduler_info['state'] = self.scheduler_states[self.scheduler.state]

        self.notify_scheduler_event(event_name, event_ts)

    def scheduler_resumed(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.SchedulerEvent):
        """
        with self.write_lock:
            self.scheduler_info['state'] = self.scheduler_states[self.scheduler.state]

        self.notify_scheduler_event(event_name, event_ts)

    def executor_added(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.SchedulerEvent):
        """
        executor = None
        if hasattr(self.scheduler, '_executors') and isinstance(self.scheduler._executors, dict):
            try:
                executor = self.scheduler._executors[event.alias]
            except KeyError:
                logging.getLogger('apschedulerui').warning('Failed to locate executor "%s" in scheduler' % event.alias)

        with self.write_lock:
            self.executors[event.alias] = self._repr_executor(executor) if executor else None

        self.notify_executor_event(event_name, event_ts, event.alias)

    def executor_removed(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.SchedulerEvent):
        """
        with self.write_lock:
            if event.alias in self.executors:
                del self.executors[event.alias]

        self.notify_executor_event(event_name, event_ts, event.alias)

    def jobstore_added(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.SchedulerEvent):
        """
        self._jobstore_added(event.alias, event_ts)

        self.notify_jobstore_event(event_name, event_ts, event.alias)

    def jobstore_removed(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.SchedulerEvent):
        """
        with self.write_lock:
            for job_id in self.jobs.keys():
                if self.jobs[job_id]['properties']['jobstore'] == event.alias:
                    self._job_removed(job_id, event_ts)

            if event.alias in self.jobstores:
                del self.jobstores[event.alias]

        self.notify_jobstore_event(event_name, event_ts, event.alias)

    def all_jobs_removed(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.SchedulerEvent):
        """
        with self.write_lock:
            for job_id in self.jobs.keys():
                self._job_removed(job_id, removal_ts=event_ts)

    def job_added(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.JobEvent):
        """
        self._job_added(event.job_id, event.jobstore, event_ts)

    def job_removed(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.JobEvent):
        """
        self._job_removed(event.job_id, removal_ts=event_ts)

    def job_modified(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.JobEvent):
        """
        self._job_modified(event.job_id, event.jobstore, event_ts)

    def job_executed(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.JobExecutionEvent):
        """
        self._job_execution_event(event.job_id, event.jobstore, event_name, event_ts,
                                  retval=event.retval,
                                  scheduled_run_time=self._repr_ts(event.scheduled_run_time))

    def job_error(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.JobExecutionEvent):
        """
        self._job_execution_event(event.job_id, event.jobstore, event_name, event_ts,
                                  retval=event.retval,
                                  exception=str(event.exception),
                                  traceback=str(event.traceback),
                                  scheduled_run_time=self._repr_ts(event.scheduled_run_time))

    def job_missed(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.JobExecutionEvent):
        """
        self._job_execution_event(event.job_id, event.jobstore, event_name, event_ts,
                                  scheduled_run_time=self._repr_ts(event.scheduled_run_time))

    def job_submitted(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.JobSubmissionEvent):
        """
        self._job_execution_event(event.job_id, event.jobstore, event_name, event_ts,
                                  scheduled_run_time=self._repr_ts(event.scheduled_run_times[0]))

    def job_max_instances(self, event, event_name, event_ts):
        """
        Args:
            event (apscheduler.events.JobSubmissionEvent):
        """
        self._job_execution_event(event.job_id, event.jobstore, event_name, event_ts,
                                  scheduled_run_time=self._repr_ts(event.scheduled_run_times[0]))

    def scheduler_summary(self):
        return {
            'executors': {name: str(executor) for name, executor in self.executors.items()},
            'jobstores': {name: str(jobstore) for name, jobstore in self.jobstores.items()},
            'scheduler': self.scheduler_info,
            'jobs': self.jobs
        }

    def notify_scheduler_event(self, event_name, event_ts):
        for listener in self.listeners:
            listener._scheduler_event({
                'event_name': event_name,
                'event_ts': event_ts
            })

    def notify_job_event(self, event):
        event['next_run_times'] = []

        job = self.scheduler.get_job(job_id=event['job_id'])

        if job:
            next_run_time = job.next_run_time
            while next_run_time and len(event['next_run_times']) < 11:
                event['next_run_times'].append(self._repr_ts(next_run_time))
                next_run_time = job.trigger.get_next_fire_time(next_run_time, next_run_time)

        for listener in self.listeners:
            listener._job_event(event)

    def notify_executor_event(self, event_name, event_ts, executor_name):
        for listener in self.listeners:
            listener._executor_event({
                'event_name': event_name,
                'event_ts': event_ts,
                'executor_name': executor_name
            })

    def notify_jobstore_event(self, event_name, event_ts, jobstore_name):
        for listener in self.listeners:
            listener._jobstore_event({
                'event_name': event_name,
                'event_ts': event_ts,
                'jobstore_name': jobstore_name
            })

    def _job_added(self, job_id, jobstore, added_ts, job=None):
        with self.write_lock:
            if job_id in self.jobs:
                return

            self.jobs[job_id] = {
                'added_time': added_ts,
                'modified_time': added_ts,
                'removed_time': None,
                'properties': self._repr_job(
                    self.scheduler.get_job(job_id, jobstore) if job is None else job,
                    jobstore=jobstore
                ),
                'events': []
            }

            event = {
                'job_id': job_id,
                'event_name': 'job_added',
                'event_ts': added_ts
            }

            event.update(self.jobs[job_id])

            self._append_job_event(event)

        self.notify_job_event(event)

    def _job_modified(self, job_id, jobstore, event_ts):
        with self.write_lock:
            self.jobs[job_id]['properties'] = self._repr_job(
                self.scheduler.get_job(job_id, jobstore),
                jobstore=jobstore
            )
            self.jobs[job_id]['modified_time'] = event_ts

            event = {
                'job_id': job_id,
                'event_name': 'job_modified',
                'event_ts': event_ts,
                'properties': self.jobs[job_id]['properties']
            }

            self._append_job_event(event)

        self.notify_job_event(event)

    def _job_removed(self, job_id, removal_ts):
        with self.write_lock:
            self.jobs[job_id]['removed_time'] = removal_ts

            event = {
                'job_id': job_id,
                'event_name': 'job_removed',
                'event_ts': removal_ts
            }

            self._append_job_event(event)

        self.notify_job_event(event)

    def _job_execution_event(self, job_id, jobstore, event_name, event_ts, **kwargs):
        with self.write_lock:
            if job_id not in self.jobs:
                self._job_added(job_id, jobstore, event_ts)

            event = {
                'job_id': job_id,
                'event_name': event_name,
                'event_ts': event_ts,
                'next_run_times': []
            }
            event.update(kwargs)

            self._append_job_event(event)

        self.notify_job_event(event)

    def _jobstore_added(self, jobstore, event_ts):
        with self.write_lock:
            for job in self.scheduler.get_jobs(jobstore=jobstore):
                self._job_added(job.id, jobstore, event_ts, job)

            if hasattr(self.scheduler, '_jobstores') and isinstance(self.scheduler._jobstores, dict):
                self.jobstores[jobstore] = self._repr_jobstore(self.scheduler._jobstores[jobstore])

    def _repr_job(self, job, jobstore=None):
        next_run_time = self._repr_ts(getattr(job, 'next_run_time', None))
        return {
            'id': job.id,
            'name': job.name,
            'trigger': self._repr_trigger(job.trigger),
            'jobstore': jobstore,
            'executor': job.executor,
            'func': str(job.func),
            'func_ref': job.func_ref,
            'args': str(job.args),
            'kwargs': str(job.kwargs),
            'pending': job.pending,
            'coalesce': getattr(job, 'coalesce', None),
            'next_run_time': [next_run_time] if next_run_time else None,
            'misfire_grace_time': getattr(job, 'misfire_grace_time', None),
            'max_instances': getattr(job, 'max_instances', None)
        }

    def _append_job_event(self, e):
        if 'events' in e:
            del e['events']  # Make sure we won't be appending to the event list a reference to itself!

        job_id = e['job_id']

        self.jobs[job_id]['events'].append(e)

        if len(self.jobs[job_id]['events']) > self.max_events_per_job:
            # Limit job event log size.
            self.jobs[job_id]['events'] = self.jobs[job_id]['events'][-self.max_events_per_job:]

    def _repr_ts(self, ts):
        """
        Args:
            ts (datetime):

        Returns:
            str: The timestamp string representation.
        """
        if ts:
            return ts.strftime('%Y-%m-%d %H:%M:%S.%f')
        return None

    def _repr_trigger(self, trigger):
        return str(trigger)

    def _repr_jobstore(self, jobstore):
        return str(jobstore)

    def _repr_executor(self, jobstore):
        return str(jobstore)
