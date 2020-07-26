import time
import unittest
from datetime import timedelta, datetime

from apscheduler.events import EVENT_ALL
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.schedulers.background import BackgroundScheduler

from apschedulerui.watcher import SchedulerWatcher


class TestSchedulerListener(unittest.TestCase):

    def setUp(self):
        self.scheduler = BackgroundScheduler()
        self.scheduler.add_jobstore(MemoryJobStore(), alias='in_memory')
        self.scheduler.add_executor(ThreadPoolExecutor(1), alias='secondary_executor')

        self.scheduler.start()

    def tearDown(self):
        self.scheduler.shutdown()

    def test_watcher_injection(self):
        watcher = SchedulerWatcher(self.scheduler)

        self.assertEqual(watcher.scheduler, self.scheduler, 'Watcher should keep a reference to the scheduler')
        self.assertEqual(1, len(self.scheduler._listeners), 'Watcher should inject itself as a scheduler listener')

        self.assertEqual(
            self.scheduler._listeners[0][1], EVENT_ALL, 'Watcher should register iself to watch all events'
        )

    def test_scheduler_inspection(self):
        self.scheduler.add_job(lambda: 0, jobstore='in_memory', trigger='interval', minutes=60, id='test_job')

        watcher = SchedulerWatcher(self.scheduler)

        self.assertEqual('running', watcher.scheduler_info['state'], 'Watcher should inspect scheduler status')
        self.assertEqual(
            str(self.scheduler.timezone),
            watcher.scheduler_info['timezone'],
            'Watcher should inspect scheduler timezone'
        )
        self.assertEqual(
            'BackgroundScheduler', watcher.scheduler_info['class'], 'Watcher should inspect scheduler class'
        )

        self.assertEqual(2, len(watcher.jobstores), 'Watcher should inspect all scheduler jobstores')
        self.assertIn('in_memory', watcher.jobstores, 'Watcher should have inspected the in_memory jobstore')

        self.assertEqual(2, len(watcher.executors), 'Watcher should inspect all scheduler executors')
        self.assertIn('secondary_executor', watcher.executors, 'Watcher should have inspected the secondary_executor')

        self.assertEqual(1, len(watcher.jobs), 'Watcher should inspect all jobs in scheduler on init')
        self.assertIn('test_job', watcher.jobs, 'Watcher should index jobs by id')

    def test_job_properties(self):
        watcher = SchedulerWatcher(self.scheduler)

        self.scheduler.add_job(
            lambda x, y: x + y,
            id='added_job',
            name='Added job',
            jobstore='in_memory',
            trigger='interval',
            minutes=60,
            args=(1,),
            kwargs={'y': 2}
        )

        self.assertIn('added_job', watcher.jobs)

        job_properties = watcher.jobs['added_job']['properties']

        self.assertEqual('added_job', job_properties['id'], 'Job properties should have the job id')
        self.assertEqual('Added job', job_properties['name'], 'Job properties should have the job name')
        self.assertIn('trigger', job_properties, 'Job properties should have a representation of the trigger')
        self.assertEqual('in_memory', job_properties['jobstore'], 'Job properties should have the jobstore name')
        self.assertEqual('default', job_properties['executor'], 'Job properties should have the executor name')
        self.assertIn('lambda', job_properties['func'], 'Job properties should have the function string repr')
        self.assertIn('func_ref', job_properties, 'Job properties should have the function reference')
        self.assertEqual('(1,)', job_properties['args'], 'Job properties should have the job arguments')
        self.assertEqual("{'y': 2}", job_properties['kwargs'], 'Job properties should have the job keyword arguments')
        self.assertIn('pending', job_properties, 'Job properties should have the job pending status')
        self.assertFalse(job_properties['pending'], 'Job status should not be pending')
        self.assertIn('coalesce', job_properties, 'Job properties should have the job coalesce configuration')
        self.assertIn('next_run_time', job_properties, 'Job properties should have the next run time calculated')
        self.assertIn('misfire_grace_time', job_properties, 'Job properties should have the misfire grace time')
        self.assertIn('max_instances', job_properties, 'Job properties should have the max instances configuration')

    def test_job_inspection_matches_job_added_event(self):
        # We're going to add two jobs that should have the exact same properties, except for the id, in two different
        # stages of the usage: before the watcher is created and after we start watching for events.
        def job_function(x, y):
            return x + y
        next_run_time = datetime.now() + timedelta(hours=1)

        # Job that is added before the user calls us.
        self.scheduler.add_job(
            job_function,
            id='job_1',
            name='Added job',
            jobstore='in_memory',
            trigger='interval',
            minutes=60,
            args=(1,),
            kwargs={'y': 2},
            next_run_time=next_run_time
        )

        watcher = SchedulerWatcher(self.scheduler)

        # Job that gets added after we start watching.
        self.scheduler.add_job(
            job_function,
            id='job_2',
            name='Added job',
            jobstore='in_memory',
            trigger='interval',
            minutes=60,
            args=(1,),
            kwargs={'y': 2},
            next_run_time=next_run_time
        )

        self.assertEqual(2, len(watcher.jobs))

        job_1 = watcher.jobs['job_1']
        job_2 = watcher.jobs['job_2']

        for property_name in job_1['properties'].keys():
            # All properties, except the id, should match.
            if property_name == 'id':
                continue
            self.assertEqual(job_1['properties'][property_name], job_2['properties'][property_name])

    def test_all_events_have_a_processing_method(self):
        for event_name in list(SchedulerWatcher.apscheduler_events.values()):
            self.assertIn(event_name, dir(SchedulerWatcher))

    def test_job_execution_monitoring(self):
        watcher = SchedulerWatcher(self.scheduler)

        self.scheduler.add_job(
            lambda: time.sleep(0.02),
            id='waiting_job',
            name='Waiting job',
            jobstore='in_memory',
            trigger='interval',
            seconds=0.2,
            next_run_time=datetime.now()
        )

        job_events = watcher.jobs['waiting_job']['events']

        self.assertEqual(1, len(job_events))
        self.assertEqual('job_added', job_events[0]['event_name'])
        time.sleep(0.05)
        self.assertEqual(3, len(job_events), 'Job execution needs to be tracked in job events')
        self.assertEqual(
            'job_submitted',
            job_events[1]['event_name'],
            'Job submision needs to be tracked in job events'
        )
        self.assertEqual('job_executed', job_events[2]['event_name'], 'Job execution needs to be tracked in job events')

        time.sleep(0.2)

        self.assertEqual(5, len(job_events), 'Subsequent executions get tracked')

    def test_job_failure_monitoring(self):
        watcher = SchedulerWatcher(self.scheduler)

        self.scheduler.add_job(
            lambda: 0 / 0,
            id='failing_job',
            name='Failing job',
            jobstore='in_memory',
            trigger='interval',
            next_run_time=datetime.now(),
            minutes=60
        )

        failing_job_events = watcher.jobs['failing_job']['events']

        time.sleep(0.05)
        self.assertEqual(3, len(failing_job_events))
        self.assertEqual('job_error', failing_job_events[2]['event_name'])

    def test_removed_jobs_are_flagged(self):
        pass

    def test_modified_job_properties_are_tracked(self):
        pass

    def test_removing_a_jobstore_removes_all_jobs(self):
        pass