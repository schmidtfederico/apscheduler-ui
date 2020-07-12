from apscheduler.triggers.cron import CronTrigger
from gevent import monkey
monkey.patch_all()
import os
import time

os.environ['TZ'] = 'America/Los_Angeles'

time.tzset()

import time
import random
import json
from datetime import timedelta, datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.triggers.interval import IntervalTrigger

from apschedulerui.web import SchedulerUI
import logging

logging.basicConfig(level=logging.WARNING)


def waiting_job(n_secs=None):
    time.sleep(n_secs if n_secs is not None else random.uniform(10, 45))

    if random.uniform(0, 1) < 0.1:
        raise RuntimeError('A wild RuntimeError appeared!')


job_store_1 = MemoryJobStore()
job_store_2 = MemoryJobStore()
executor_1 = ThreadPoolExecutor(max_workers=2)
executor_2 = ThreadPoolExecutor(max_workers=10)

test_scheduler = BackgroundScheduler(
    jobstores={
        'in_memory_1': job_store_1,
        'in_memory_2': job_store_2
    },
    executors={
        'small_thread_pool': executor_1,
        'larger_thread_pool': executor_2
    },
    job_defauls={
        'coalesce': True,
        'max_instances': 1
    }
)

web_server = SchedulerUI(test_scheduler, capabilities={
    'pause_scheduler': True,
    'stop_scheduler': True,
    'pause_job': True,
    'run_job': True,
    'remove_job': True
})

print('Start web server.')

web_server.start()

print(json.dumps(web_server._scheduler_listener.scheduler_summary(), indent=4))

test_scheduler.add_job(
    waiting_job,
    args=[90],
    name='Wait once',
    id='wait_once',
    jobstore='in_memory_1',
    next_run_time=datetime.now() + timedelta(seconds=45)
)
test_scheduler.add_job(
    waiting_job,
    name='Wait 1 minute every 10 minutes',
    trigger=IntervalTrigger(minutes=10),
    args=[60],
    next_run_time=datetime.now() + timedelta(seconds=2),
    jobstore='in_memory_2'
)

test_scheduler.add_job(
    waiting_job,
    name='Wait some seconds every 2 minutes',
    trigger=IntervalTrigger(minutes=2),
    args=[],
    next_run_time=datetime.now() + timedelta(seconds=2),
    jobstore='in_memory_2'
)

test_scheduler.add_job(
    waiting_job,
    name='Wait some seconds every 5 minutes',
    trigger=CronTrigger.from_crontab('*/5 * * * *'),
    args=[],
    jobstore='in_memory_2'
)

test_scheduler.add_job(
    waiting_job,
    name='Max instances every 4 minutes',
    trigger=CronTrigger.from_crontab('*/2 * * * *'),
    args=[150],
    jobstore='in_memory_2'
)

test_scheduler.get_jobs()

test_scheduler.start(paused=True)

test_scheduler.resume()

time.sleep(50)

for i in range(20):
    mins = random.randint(1, 10)

    test_scheduler.add_job(
        waiting_job,
        name='[Job #%02d] Do something interesting every %d minutes' % (i+1, mins),
        trigger=IntervalTrigger(minutes=mins),
        args=[],
        jobstore='in_memory_2'
    )

    time.sleep(random.randint(5, 60))

print('Blocking main thread.')

while True:
    time.sleep(1000000)
