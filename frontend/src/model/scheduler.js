
import Job from './job';

class Scheduler {
    constructor(state) {
        this.class = "BaseScheduler";
        this.state = "stopped";
        this.timezone = "";
        this.jobstore_retry_interval = null;
        this.misfire_grace_time = null;
        this.coalesce = null;
        this.max_instances = null;

        this.jobstores = {};
        this.executors = {};
        this.jobs = {};

        this.init_from_server(state);
    }

    init_from_server(state) {
        this.class = state.scheduler["class"];
        this.state = state.scheduler["state"];
        this.timezone = state.scheduler["timezone"];
        this.jobstore_retry_interval = state.scheduler["jobstore_retry_interval"];
        this.misfire_grace_time = state.scheduler["misfire_grace_time"];
        this.coalesce = state.scheduler["coalesce"];
        this.max_instances = state.scheduler["max_instances"];

        // TODO: create model for job executors.
        this.executors = state.executors;
        // TODO: create model for job stores.
        this.jobstores = state.jobstores;

        Object.keys(state.jobs).forEach(job_id => {
            this.jobs[job_id] = new Job(state.jobs[job_id]);

            if(state.jobs[job_id].events !== undefined && state.jobs[job_id].events.length > 0) {
                state.jobs[job_id].events.forEach(event => {
                    this.process_event(event)
                });
            }
        });
    }

    process_event(event) {
        event.ts = new Date(event.event_ts);

        if(event.scheduled_run_time !== undefined) event.scheduled_run_ts = new Date(event.scheduled_run_time);

        if(this[event.event_name] !== undefined) {
            this[event.event_name](event)
        } else if(event.event_name.startsWith('job_') && event.job_id !== undefined) {
            if(this.jobs[event.job_id] !== undefined) {
                this.jobs[event.job_id].process_job_event(event);
            } else {
                console.log('Unknown job event ', event);
            }
        } else {
            console.log('Unknown event ', event);
        }
    }

    scheduler_started(event) {
        this.state = 'running';
    }

    scheduler_shutdown(event) {
        this.state = 'stopped';
    }

    scheduler_paused(event) {
        this.state = 'paused';
    }

    scheduler_resumed(event) {
        this.state = 'running';
    }

    executor_added(event) {

    }

    executor_removed(event) {

    }

    jobstore_added(event) {

    }

    jobstore_removed(event) {

    }

    job_added(event) {
        this.jobs[event.job_id] = new Job(event);
        // Process event so that next_run_times get updated.
        this.jobs[event.job_id].process_job_event(event);
    }

    all_jobs_removed(event) {
        Object.keys(this.jobs).forEach(job_id => {
            this.jobs[job_id].process_job_event(event);
        });
    }
}

export default Scheduler;