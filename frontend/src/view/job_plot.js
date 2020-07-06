
import SchedulerPlot from "./scheduler_plot";

export default class JobPlot extends SchedulerPlot {

    constructor(job_id, scheduler, target_plot_width=1300, min_intervals=6) {
        let cum_sum = 0;

        const executions = scheduler.jobs[job_id].executions;
        const execution_id = Object.keys(executions);

        let avg_execution_diff = 100 * 1000;

        if(execution_id.length > 1) {
            for(let i = 1; i < execution_id.length; i++) {
                cum_sum += executions[execution_id[i]].start_ts - executions[execution_id[i - 1]].start_ts;
            }
            avg_execution_diff = cum_sum / (execution_id.length - 1);
        }

        let time_interval = Math.pow(10, Math.round(Math.log10(avg_execution_diff)));

        super(scheduler, time_interval, target_plot_width, min_intervals, 100);
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
