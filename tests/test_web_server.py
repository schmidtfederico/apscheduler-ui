import unittest

from apscheduler.schedulers.background import BackgroundScheduler

from apschedulerui.watcher import SchedulerWatcher
from apschedulerui.web import SchedulerUI


class TestWebServer(unittest.TestCase):
    def setUp(self):
        self.scheduler = BackgroundScheduler()
        self.scheduler.start()

    def tearDown(self):
        self.scheduler.shutdown()

    def test_webserver_init(self):
        scheduler_server = SchedulerUI(self.scheduler)

        self.assertIsInstance(scheduler_server._scheduler_listener, SchedulerWatcher)
