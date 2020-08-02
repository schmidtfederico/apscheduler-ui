import time
import unittest
from datetime import datetime, timedelta

try:
    from mock import patch
except ImportError:
    from unittest.mock import patch

from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.schedulers.background import BackgroundScheduler

from apschedulerui.watcher import SchedulerWatcher
from apschedulerui.web import SchedulerUI


class TestWebServer(unittest.TestCase):
    def setUp(self):
        self.scheduler = BackgroundScheduler()
        self.scheduler.add_job(lambda: 1, id='a_job', trigger='interval', minutes=10)
        self.scheduler.start()

    def tearDown(self):
        self.scheduler.shutdown()

    def test_webserver_init(self):
        scheduler_server = SchedulerUI(self.scheduler)

        self.assertIsInstance(scheduler_server._scheduler_listener, SchedulerWatcher)

        self.assertRaises(TypeError, SchedulerUI, self.scheduler, operation_timeout=None)
        self.assertRaises(ValueError, SchedulerUI, self.scheduler, operation_timeout=-1)

        self.assertRaises(TypeError, SchedulerUI, self.scheduler, capabilities=set())

    @patch('flask.Flask.add_url_rule')
    def test_webserver_capabilities(self, mock_add_url_rule):
        SchedulerUI(self.scheduler)

        mock_add_url_rule.assert_called()
        base_call_count = mock_add_url_rule.call_count

        mock_add_url_rule.reset_mock()

        SchedulerUI(self.scheduler, capabilities={'pause_job': True})

        self.assertEqual(2 + base_call_count, mock_add_url_rule.call_count)

        mock_add_url_rule.reset_mock()
        SchedulerUI(self.scheduler, capabilities={'run_job': True})
        self.assertEqual(1 + base_call_count, mock_add_url_rule.call_count)

        mock_add_url_rule.reset_mock()
        SchedulerUI(self.scheduler, capabilities={'pause_scheduler': True})

        self.assertEqual(
            2 + base_call_count,
            mock_add_url_rule.call_count,
            'Web server should register scheduler pause and resume endpoints'
        )

        mock_add_url_rule.reset_mock()
        SchedulerUI(self.scheduler, capabilities={'stop_scheduler': True})

        self.assertEqual(
            2 + base_call_count,
            mock_add_url_rule.call_count,
            'Web server should register scheduler stop and start endpoints'
        )

        mock_add_url_rule.reset_mock()
        SchedulerUI(self.scheduler, capabilities={'remove_job': True})

        self.assertEqual(
            1 + base_call_count,
            mock_add_url_rule.call_count,
            'Web server should register the endpoint to remove a job'
        )

    @patch('flask.Flask.send_static_file')
    def test_index_retrieval(self, mock_send_static_file):
        SchedulerUI(self.scheduler).index('/any_path')

        mock_send_static_file.assert_called_with('index.html')

    @patch('flask.abort')
    @patch('apscheduler.schedulers.background.BackgroundScheduler.pause')
    def test_scheduler_commands_are_serialized(self, mock_pause, mock_abort):
        ui = SchedulerUI(self.scheduler, operation_timeout=0.01)

        with ui._scheduler_lock:
            # If we acquire the lock, every command we send to the web server should be aborted on lock acquire timeout.
            ui.pause_scheduler()

            mock_abort.assert_called()
            mock_pause.assert_not_called()

            ui.resume_scheduler()
            ui.stop_scheduler()
            ui.start_scheduler()
            ui.pause_job('a_job')
            ui.resume_job('a_job')
            ui.run_job('a_job')
            ui.remove_job('a_job')

            self.assertEqual(8, mock_abort.call_count)

    @patch('apscheduler.schedulers.background.BackgroundScheduler.pause')
    @patch('apscheduler.schedulers.background.BackgroundScheduler.resume')
    @patch('apscheduler.schedulers.background.BackgroundScheduler.shutdown')
    @patch('apscheduler.schedulers.background.BackgroundScheduler.start')
    def test_scheduler_requests(self, mock_start, mock_shutdown, mock_resume, mock_pause):
        ui = SchedulerUI(self.scheduler)

        ui.pause_scheduler()
        mock_pause.assert_called()

        ui.resume_scheduler()
        mock_resume.assert_called()

        ui.stop_scheduler()
        mock_shutdown.assert_called()

        ui.start_scheduler()
        mock_start.assert_called()

    @patch('apscheduler.schedulers.background.BackgroundScheduler.remove_job')
    @patch('apscheduler.schedulers.background.BackgroundScheduler.resume_job')
    @patch('apscheduler.schedulers.background.BackgroundScheduler.pause_job')
    def test_job_requests(self, mock_pause_job, mock_resume_job, mock_remove_job):
        ui = SchedulerUI(self.scheduler)

        ui.pause_job('a_job')
        mock_pause_job.assert_called()

        ui.resume_job('a_job')
        mock_resume_job.assert_called()

        ui.remove_job('a_job')
        mock_remove_job.assert_called()

    @patch('flask.abort')
    def test_missing_jobs_requests_are_aborted(self, mock_abort):
        ui = SchedulerUI(self.scheduler)

        ui.pause_job('non_existing_job')
        ui.resume_job('non_existing_job')
        ui.run_job('non_existing_job')

        self.assertEqual(3, mock_abort.call_count)

        mock_abort.reset_mock()

        response = ui.run_job(job_id=None)
        self.assertEqual(response.status_code, 404, 'Requests with missing job_id should fail')

    @patch('flask_socketio.SocketIO.run')
    def test_webserver_start(self, mock_run):
        ui = SchedulerUI(self.scheduler)

        self.assertEqual(0, len(ui._scheduler_listener.listeners))

        ui.start()

        self.assertEqual(1, len(ui._scheduler_listener.listeners))
        self.assertEqual(ui, ui._scheduler_listener.listeners[0], 'Webserver should register itself as listener')

        # SocketIO.run should be called by the web server thread on start.
        mock_run.assert_called_with(ui._web_server, host='0.0.0.0', port=5000)

    @patch('flask_socketio.SocketIO.emit')
    @patch('flask_socketio.SocketIO.run')
    def test_scheduler_events_are_emitted_to_clients(self, mock_run, mock_emit):
        ui = SchedulerUI(self.scheduler)
        ui.start()

        mock_run.assert_called()

        # Pause scheduler.
        self.scheduler.pause()
        mock_emit.assert_called_once()
        self.assertEqual('scheduler_paused', mock_emit.call_args[0][1]['event_name'])

        mock_emit.reset_mock()

        # Resume it.
        self.scheduler.resume()
        self.assertEqual('scheduler_resumed', mock_emit.call_args[0][1]['event_name'])

        # Stop it.
        mock_emit.reset_mock()
        self.scheduler.shutdown()
        self.assertEqual('scheduler_shutdown', mock_emit.call_args[0][1]['event_name'])

        # Start it again.
        mock_emit.reset_mock()
        self.scheduler.start()
        self.assertEqual('scheduler_started', mock_emit.call_args[0][1]['event_name'])

    @patch('flask_socketio.SocketIO.emit')
    @patch('flask_socketio.SocketIO.run')
    def test_job_events_are_emitted_to_clients(self, mock_run, mock_emit):
        ui = SchedulerUI(self.scheduler)
        ui.start()

        self.scheduler.add_job(
            lambda: time.sleep(0.1),
            id='waiting_job',
            name='Waiting job',
            trigger='interval',
            seconds=0.2,
            next_run_time=datetime.now() + timedelta(milliseconds=50)
        )

        mock_emit.assert_called_once()
        emitted_event = mock_emit.call_args[0][1]

        self.assertEqual('job_added', emitted_event['event_name'])
        self.assertIn('properties', emitted_event)
        self.assertIsInstance(datetime.strptime(emitted_event['event_ts'], '%Y-%m-%d %H:%M:%S.%f'), datetime)

        mock_emit.reset_mock()

        time.sleep(0.1)
        # Job submission event.
        mock_emit.assert_called_once()

    @patch('flask_socketio.SocketIO.emit')
    @patch('flask_socketio.SocketIO.run')
    def test_jobstore_events_are_emitted_to_clients(self, mock_run, mock_emit):
        ui = SchedulerUI(self.scheduler)
        ui.start()

        # Job store addition.
        self.scheduler.add_jobstore(MemoryJobStore(), alias='in_memory')

        mock_emit.assert_called_once()
        self.assertEqual('jobstore_event', mock_emit.call_args[0][0])

        emitted_event = mock_emit.call_args[0][1]
        self.assertEqual('in_memory', emitted_event['jobstore_name'])
        self.assertEqual('jobstore_added', emitted_event['event_name'])
        self.assertIsInstance(datetime.strptime(emitted_event['event_ts'], '%Y-%m-%d %H:%M:%S.%f'), datetime)

        # Job store removal.
        mock_emit.reset_mock()
        self.scheduler.remove_jobstore('in_memory')

        mock_emit.assert_called_once()
        emitted_event = mock_emit.call_args[0][1]
        self.assertEqual('in_memory', emitted_event['jobstore_name'])
        self.assertEqual('jobstore_removed', emitted_event['event_name'])
        self.assertIsInstance(datetime.strptime(emitted_event['event_ts'], '%Y-%m-%d %H:%M:%S.%f'), datetime)

    @patch('flask_socketio.SocketIO.emit')
    @patch('flask_socketio.SocketIO.run')
    def test_executors_events_are_emitted_to_clients(self, mock_run, mock_emit):
        ui = SchedulerUI(self.scheduler)
        ui.start()

        # Executor addition.
        self.scheduler.add_executor(ThreadPoolExecutor(max_workers=1), alias='thread_pool')

        mock_emit.assert_called_once()
        self.assertEqual('executor_event', mock_emit.call_args[0][0])

        emitted_event = mock_emit.call_args[0][1]
        self.assertEqual('thread_pool', emitted_event['executor_name'])
        self.assertEqual('executor_added', emitted_event['event_name'])
        self.assertIsInstance(datetime.strptime(emitted_event['event_ts'], '%Y-%m-%d %H:%M:%S.%f'), datetime)

        # Executor removal.
        mock_emit.reset_mock()
        self.scheduler.remove_executor('thread_pool')

        mock_emit.assert_called_once()
        emitted_event = mock_emit.call_args[0][1]
        self.assertEqual('thread_pool', emitted_event['executor_name'])
        self.assertEqual('executor_removed', emitted_event['event_name'])
        self.assertIsInstance(datetime.strptime(emitted_event['event_ts'], '%Y-%m-%d %H:%M:%S.%f'), datetime)

    @patch('flask_socketio.emit')
    def test_connected_clients_get_initialized(self, mock_emit):
        ui = SchedulerUI(self.scheduler, capabilities={'run_job': True})
        ui.start(port=5001, host='localhost')

        time.sleep(0.1)

        import socketio

        socket_client = socketio.Client()
        socket_client.connect('ws://localhost:5001')
        socket_client.emit('connected')  # Notify server that we're now connected, as frontend would do.

        time.sleep(0.1)

        self.assertEqual(2, mock_emit.call_count, 'emit should be called twice when a client connects')

        first_call = mock_emit.call_args_list[0]
        second_call = mock_emit.call_args_list[1]

        self.assertEqual('init_jobs', first_call[0][0], 'First argument of the first emit should be event name')

        self.assertEqual(
            'init_capabilities',
            second_call[0][0],
            'First argument of the second emit shoud be the init_capabilities event name'
        )
        self.assertEqual(
            ui.capabilities,
            second_call[0][1],
            "Second argument of init_capabilities should equal the web server's capabilities"
        )

        socket_client.disconnect()
