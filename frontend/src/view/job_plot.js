
import SchedulerPlot from "./scheduler_plot";

export default class JobPlot extends SchedulerPlot {

    constructor(job_id, scheduler, target_plot_width=1300, min_intervals=6) {
        // Default job plot interval to 1 minute.
        let avg_execution_diff = 60 * 1000;

        const executions = scheduler.jobs[job_id].executions;
        const execution_id = Object.keys(executions);

        // Try to estimate the best time interval to plot this job by calculating the average diff in time between
        // past job executions and next run times (if any).
        let cum_sum = 0;
        let data_points = 0;

        if(execution_id.length > 1) {
            for(let i = 1; i < execution_id.length; i++) {
                cum_sum += executions[execution_id[i]].start_ts - executions[execution_id[i - 1]].start_ts;
                data_points++;
            }
        }

        const next_run_times = scheduler.jobs[job_id].next_run_times;

        if(next_run_times && next_run_times.length > 1) {
            for (let i = 1; i < next_run_times.length; i++) {
                cum_sum += next_run_times[i] - next_run_times[i - 1];
                data_points++;
            }
        }

        if(data_points > 0) avg_execution_diff = cum_sum / data_points;

        // Round to minutes.
        let time_interval = Math.round(avg_execution_diff / (60000)) * 60000;

        super(scheduler, time_interval, target_plot_width, min_intervals, 60);
        this.job_id = job_id;
    }

    add_plot_shapes() { return null; }

    job_background() { return null; }

    n_jobs() {
        return 1;
    }

    render_job_name() { return null; }

    plot_height() {
        return 70;
    }

    get_jobs_order() {
        return [this.job_id];
    }
}
