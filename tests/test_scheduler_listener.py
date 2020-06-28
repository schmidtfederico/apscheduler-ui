import unittest

from apschedulerui.watcher import SchedulerWatcher


class TestSchedulerListener(unittest.TestCase):

    def test_all_events_have_a_processing_method(self):
        for event_name in list(SchedulerWatcher.apscheduler_events.values()):
            self.assertIn(event_name, dir(SchedulerWatcher))
