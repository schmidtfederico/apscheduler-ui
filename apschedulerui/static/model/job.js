
class Job {
    constructor(state) {
        this.id = null;
        this.name = null;
        this.trigger = null;
        this.jobstore = null;
        this.executor = null;

        this.config = {
            func: null,
            func_ref: null,
            args: null,
            kwargs: null,
            coalesce: null,
            misfire_grace_time: null,
            max_instances: null
        }

        this.stats = {
            pending: null,
            current_status: null,
            first_event_ts: null,
            last_event_ts: null,
            max_ts: null,
            added_ts: null,
            modified_ts: null,
            removed_ts: null
        }

        this.properties = {};
        this.events = [];
        this.executions = {};
        this.next_run_times = [];

        this.init_from_server(state);
    }

    init_from_server(state) {
        this.properties = state.properties;

        this.id = state.properties.id;
        this.name = state.properties.name;
        this.trigger = state.properties.trigger;
        this.jobstore = state.properties.jobstore;
        this.executor = state.properties.executor;
        this.config.func = state.properties.func;
        this.config.func_ref = state.properties.func_ref;
        this.config.args = state.properties.args;
        this.config.kwargs = state.properties.kwargs;
        this.config.coalesce = state.properties.coalesce;
        this.config.misfire_grace_time = state.properties.misfire_grace_time;
        this.config.max_instances = state.properties.max_instances;

        this.stats.pending = state.properties.pending;
        this.stats.added_ts = new Date(state.added_time);
        this.stats.modified_ts = new Date(state.modified_time);

        if(state.removed_time !== undefined) {
            this.stats.removed_ts = new Date(state.removed_time);
        }

        if(state.properties.next_run_time !== null && state.properties.next_run_time.length > 0) {
            for(let idx in state.properties.next_run_time) {
                this.next_run_times.push(new Date(state.properties.next_run_time[idx]));
            }
        }
    }

    min_ts() {
        if(this.stats.first_event_ts === null) return this.stats.added_ts;

        return (this.stats.added_ts < this.stats.first_event_ts) ? this.stats.added_ts : this.stats.first_event_ts;
    }

    max_ts() {
        if(this.next_run_times === undefined) return this.stats.last_event_ts;

        let max_next_run = Math.max( ...this.next_run_times );

        return (max_next_run > this.stats.last_event_ts) ? max_next_run : this.stats.last_event_ts;
    }

    process_job_event(event) {
        if(this.stats.last_event_ts === null || event.ts > this.stats.last_event_ts) {
            this.stats.last_event_ts = event.ts;
            this.stats.current_status = event.event_name;
        }

        if(this.stats.first_event_ts === null || event.ts < this.stats.first_event_ts) {
            this.stats.first_event_ts = event.ts;
        }

        if(event.next_run_times !== undefined) {
            this.next_run_times = []
            event.next_run_times.forEach(ts => this.next_run_times.push(new Date(ts)));
        }

        if(this[event.event_name] !== undefined) {
            this[event.event_name](event);
        } else {
            console.log('Unknown event received', event);
        }
    }

    job_modified(event) {
        this.stats.modified_ts = event.ts;
        // TODO: re-read job properties!
        this.events.push(event);
    }

    job_removed(event) {
        this.stats.removed_ts = event.ts;
        this.events.push(event);
    }

    job_submitted(event) {
        if(event.scheduled_run_ts !== undefined && this.executions[event.scheduled_run_ts] === undefined) {
            this.executions[event.scheduled_run_ts] = {'events': []};
        }

        this.executions[event.scheduled_run_ts]['start_ts'] = event.ts;

        if(this.executions[event.scheduled_run_ts]['end_ts'] === undefined) {
            this.executions[event.scheduled_run_ts]['end_ts'] = event.ts;
            this.executions[event.scheduled_run_ts]['status'] = event.event_name;
        }

        this.executions[event.scheduled_run_ts]['events'].push(event);
    }

    job_executed(event) {
        this.job_ended(event);
    }

    job_error(event) {
        this.job_ended(event);
    }

    job_missed(event) {
        this.job_ended(event);
        this.events.push(event);
    }

    job_ended(event) {
        if(event.scheduled_run_ts !== undefined && this.executions[event.scheduled_run_ts] === undefined) {
            this.executions[event.scheduled_run_ts] = {'events': []};
        }

        if(this.executions[event.scheduled_run_ts]['start_ts'] === undefined) {
            this.executions[event.scheduled_run_ts]['start_ts'] = event.ts;
        }
        this.executions[event.scheduled_run_ts]['end_ts'] = event.ts;
        this.executions[event.scheduled_run_ts]['status'] = event.event_name;
        this.executions[event.scheduled_run_ts]['events'].push(event);
    }

    job_max_instances(event) {
        this.events.push(event);
    }
}