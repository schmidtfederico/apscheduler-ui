var scheduler_mock_data = {
    "executors": {
        "small_thread_pool": "<apscheduler.executors.pool.ThreadPoolExecutor object at 0x7fdb6007ad90>",
        "larger_thread_pool": "<apscheduler.executors.pool.ThreadPoolExecutor object at 0x7fdb60094110>",
        "default": "<apscheduler.executors.pool.ThreadPoolExecutor object at 0x7fdb78445190>"
    },
    "jobstores": {
        "in_memory_1": "<MemoryJobStore>",
        "in_memory_2": "<MemoryJobStore>",
        "default": "<MemoryJobStore>"
    },
    "scheduler": {
        "class": "BackgroundScheduler",
        "state": "stopped",
        "timezone": "America/Argentina/Buenos_Aires",
        "jobstore_retry_interval": 10.0,
        "misfire_grace_time": 1,
        "coalesce": true,
        "max_instances": 1
    },
    "jobs": {
        "wait_once": {
            "added_time": "2020-05-21T20:29:42.024427",
            "modified_time": "2020-05-21T22:29:42.025184",
            "removed_time": "2020-05-21T22:29:42.025184",
            "properties": {
                "id": "wait_once",
                "name": "Wait once",
                "trigger": "date[2020-05-21 22:29:42 -03]",
                "jobstore": "in_memory_1",
                "executor": "default",
                "func": "<function waiting_job at 0x7fdba0116560>",
                "func_ref": "__main__:waiting_job",
                "args": "()",
                "kwargs": "{}",
                "pending": false,
                "coalesce": true,
                "next_run_time": null,
                "misfire_grace_time": 1,
                "max_instances": 1
            },
            "events": [
                {
                    "job_id": "wait_once",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T21:19:42.025245",
                    "scheduled_run_time": "2020-05-21T21:19:42.025245"
                },
                {
                    "job_id": "wait_once",
                    "event_name": "job_executed",
                    "event_ts": "2020-05-21T22:29:50.583252",
                    "scheduled_run_time": "2020-05-21T21:19:42.025245",
                    "retval": null
                }
            ]
        },
        "fe6f8a64f3c141b6b7a75d6887ef8e0e": {
            "added_time": "2020-05-21T20:29:42.024533",
            "modified_time": "2020-05-21T22:29:42.024533",
            "removed_time": null,
            "properties": {
                "id": "fe6f8a64f3c141b6b7a75d6887ef8e0e",
                "name": "Wait 1 minute every 30 minutes",
                "trigger": "interval[0:30:00]",
                "jobstore": "in_memory_2",
                "executor": "default",
                "func": "<function waiting_job at 0x7fdba0116560>",
                "func_ref": "__main__:waiting_job",
                "args": "(60,)",
                "kwargs": "{}",
                "pending": false,
                "coalesce": true,
                "next_run_time": ["2020-05-21T23:29:44.029112", "2020-05-21T23:59:44.029112"],
                "misfire_grace_time": 1,
                "max_instances": 1
            },
            "events": [
                {
                    "job_id": "fe6f8a64f3c141b6b7a75d6887ef8e0e",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T20:29:44.029112",
                    "scheduled_run_time": "2020-05-21T20:29:44.029112"
                },
                {
                    "job_id": "fe6f8a64f3c141b6b7a75d6887ef8e0e",
                    "event_name": "job_error",
                    "event_ts": "2020-05-21T20:35:44.022134",
                    "scheduled_run_time": "2020-05-21T20:29:44.029112",
                    "retval": null
                },
                {
                    "job_id": "fe6f8a64f3c141b6b7a75d6887ef8e0e",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T21:29:44.029112",
                    "scheduled_run_time": "2020-05-21T21:29:44.029112"
                },
                {
                    "job_id": "fe6f8a64f3c141b6b7a75d6887ef8e0e",
                    "event_name": "job_executed",
                    "event_ts": "2020-05-21T21:35:44.022134",
                    "scheduled_run_time": "2020-05-21T21:29:44.029112",
                    "retval": null
                },
                {
                    "job_id": "fe6f8a64f3c141b6b7a75d6887ef8e0e",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T22:29:44.029112",
                    "scheduled_run_time": "2020-05-21T22:29:44.029112"
                },
                {
                    "job_id": "fe6f8a64f3c141b6b7a75d6887ef8e0e",
                    "event_name": "job_executed",
                    "event_ts": "2020-05-21T22:35:44.022134",
                    "scheduled_run_time": "2020-05-21T22:29:44.029112",
                    "retval": null
                },
                {
                    "job_id": "fe6f8a64f3c141b6b7a75d6887ef8e0e",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T22:59:44.029112",
                    "scheduled_run_time": "2020-05-21T22:59:44.029112"
                },
            ]
        },
        "test_job": {
            "added_time": "2020-05-21T12:00:00.000",
            "modified_time": "2020-05-21T12:00:00.000",
            "properties": {
                "id": "test_job",
                "name": "Test Job #1",
                "trigger": "cron[0 * * * *]",
                "jobstore": "in_memory_1",
                "executor": "default",
                "func": "<function waiting_job at 0x7fdba0116560>",
                "func_ref": "__main__:waiting_job",
                "args": "()",
                "kwargs": "{}",
                "pending": false,
                "coalesce": true,
                "next_run_time": ["2020-05-22T00:00:00.000", "2020-05-22T01:00:00.000", "2020-05-22T02:00:00.000", "2020-05-22T03:00:00.000", "2020-05-22T04:00:00.000"],
                "misfire_grace_time": 1,
                "max_instances": 1
            },
            "events": [
                {
                    "job_id": "test_job",
                    "event_name": "job_missed",
                    "event_ts": "2020-05-21T12:00:00.000",
                    "scheduled_run_time": "2020-05-21T12:00:00.000"
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T13:00:00.000",
                    "scheduled_run_time": "2020-05-21T13:00:00.000"
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_executed",
                    "event_ts": "2020-05-21T13:45:50.583252",
                    "scheduled_run_time": "2020-05-21T13:00:00.000",
                    "retval": null
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T14:00:00.000",
                    "scheduled_run_time": "2020-05-21T14:00:00.000"
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_executed",
                    "event_ts": "2020-05-21T14:57:50.583252",
                    "scheduled_run_time": "2020-05-21T14:00:00.000",
                    "retval": null
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T15:00:00.000",
                    "scheduled_run_time": "2020-05-21T15:00:00.000"
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_executed",
                    "event_ts": "2020-05-21T16:15:50.583252",
                    "scheduled_run_time": "2020-05-21T15:00:00.000",
                    "retval": null
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_max_instances",
                    "event_ts": "2020-05-21T16:00:00.000",
                    "scheduled_run_time": "2020-05-21T16:00:00.000"
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T17:00:00.000",
                    "scheduled_run_time": "2020-05-21T17:00:00.000"
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_executed",
                    "event_ts": "2020-05-21T17:15:50.583252",
                    "scheduled_run_time": "2020-05-21T17:00:00.000",
                    "retval": null
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T18:00:00.000",
                    "scheduled_run_time": "2020-05-21T18:00:00.000"
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_executed",
                    "event_ts": "2020-05-21T18:10:50.583252",
                    "scheduled_run_time": "2020-05-21T18:00:00.000",
                    "retval": null
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T19:00:00.000",
                    "scheduled_run_time": "2020-05-21T19:00:00.000"
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_executed",
                    "event_ts": "2020-05-21T19:07:50.583252",
                    "scheduled_run_time": "2020-05-21T19:00:00.000",
                    "retval": null
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T20:00:00.000",
                    "scheduled_run_time": "2020-05-21T20:00:00.000"
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_executed",
                    "event_ts": "2020-05-21T20:05:50.583252",
                    "scheduled_run_time": "2020-05-21T20:00:00.000",
                    "retval": null
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T21:00:00.000",
                    "scheduled_run_time": "2020-05-21T21:00:00.000"
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_executed",
                    "event_ts": "2020-05-21T21:05:50.583252",
                    "scheduled_run_time": "2020-05-21T21:00:00.000",
                    "retval": null
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T22:00:00.000",
                    "scheduled_run_time": "2020-05-21T22:00:00.000"
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_error",
                    "event_ts": "2020-05-21T22:05:00.583252",
                    "scheduled_run_time": "2020-05-21T22:00:00.000",
                    "retval": null
                },
                {
                    "job_id": "test_job",
                    "event_name": "job_submitted",
                    "event_ts": "2020-05-21T23:00:00.000",
                    "scheduled_run_time": "2020-05-21T23:00:00.000"
                }
            ]
        }
    }
};
