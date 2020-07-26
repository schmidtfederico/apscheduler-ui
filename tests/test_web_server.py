import time
import unittest
from unittest.mock import patch
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

    @patch('flask.Flask.send_static_file')
    def test_index_retrieval(self, mock_send_static_file):
        SchedulerUI(self.scheduler).index('/any_path')

        mock_send_static_file.assert_called_with('index.html')

    @patch('flask.abort')
    @patch('apscheduler.schedulers.background.BackgroundScheduler.pause')
    def test_scheduler_commands_are_serialized(self, mock_pause, mock_abort):
        ui = SchedulerUI(self.scheduler, operation_timeout=0.01)

        with ui._scheduler_lock:
            # If we acquire the lock every command we send to the webserver should be aborted.
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
        mock_run.assert_called_with(ui._web_server, host='0.0.0.0', port=12673)

    @patch('flask_socketio.SocketIO.emit')
    def test_scheduler_events_are_emitted_to_clients(self, mock_emit):
        ui = SchedulerUI(self.scheduler)
        ui.start()

        self.scheduler.add_job(lambda: 0, id='job_1', name='Job 1')

        mock_emit.assert_called_once()

    @patch('flask_socketio.SocketIO.emit')
    def test_job_events_are_emitted_to_clients(self, mock_emit):
        pass

    @patch('flask_socketio.emit')
    def test_connected_clients_get_initialized(self, mock_emit):
        pass