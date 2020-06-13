

class SchedulerPlot {
    constructor(scheduler, time_interval, target_plot_width=1300, min_intervals=12, interval_size_px=60) {
        this.scheduler = scheduler;
        this.time_interval = time_interval;
        this.interval_size_px = interval_size_px;
        this.target_plot_width = target_plot_width;
        this.min_intervals = min_intervals;
    }

    n_intervals() {
        // (this.interval_size_px * 2) is the right + left padding, in px.
        let max_intervals = Math.floor((this.target_plot_width - this.interval_size_px * 2) / this.interval_size_px);
        let n_intervals = Math.max(this.min_intervals, max_intervals);

        return n_intervals + n_intervals % 2;  // The amount of intervals should be divisible by 2.
    }

    plot_width() {
        return this.n_intervals() * this.interval_size_px + this.interval_size_px * 2;
    }

    plot_height() {
        return 16 + this.n_jobs() * 86 + 40;
    }

    n_jobs() {
        return Object.keys(this.scheduler.jobs).length;
    }

    min_ts() {
        let ts = null;
        for(let job_id in this.scheduler.jobs) {
            if(ts === null || ts > this.scheduler.jobs[job_id].min_ts())
                ts = this.scheduler.jobs[job_id].min_ts();
        }

        return ts;
    }

    max_ts() {
        let ts = null;
        for(let job_id in this.scheduler.jobs) {
            if(ts === null || ts < this.scheduler.jobs[job_id].max_ts())
                ts = this.scheduler.jobs[job_id].max_ts();
        }

        return ts;
    }

    now_ts() {
        let ts = null;
        for(let job_id in this.scheduler.jobs) {
            if(ts === null || ts < this.scheduler.jobs[job_id].stats.last_event_ts)
                ts = this.scheduler.jobs[job_id].stats.last_event_ts;
        }

        return ts;
    }

    y_min() {
        return 0;
    }

    y_max() {
        return 16 + this.n_jobs() * 86;
    }

    x_min() {
        var truncated_now = Math.floor(this.now_ts() / this.time_interval) * this.time_interval;
        var n_intervals = Math.round(this.n_intervals() / 2);
        return truncated_now - n_intervals * this.time_interval;
    }

    x_max() {
        var truncated_now = Math.floor(this.now_ts() / this.time_interval) * this.time_interval;
        var n_intervals = Math.round(this.n_intervals() / 2);
        return truncated_now + n_intervals * this.time_interval;
    }

    get_now_marker() {
        var now = (+ this.now_ts());

        return {
            'x': [now, now],
            'y': [this.y_min() + 3, this.y_max() - 3],
            'symbol': ['triangle-down', 'triangle-up'],
        }
    }

    get_jobs_order() {
        return Object.keys(this.scheduler.jobs);
    }

    render_execution_background(job_y, execution) {
        let aes = event_aesthetics[execution.status];

        return {
            "mode": "markers+lines",
            "type": "scatter",
            "x": [execution.start_ts, execution.end_ts],
            "y": [job_y, job_y],
            "line": {
                "width": aes.size + aes.border_size,
                "color": aes.border_color
            },
            "marker": {
                "line": {
                    "width": 0
                },
                "size": aes.size + aes.border_size,
                "color": aes.border_color,
                "opacity": 1,
                "symbol": 'circle'
            },
            "hoverinfo": "skip",
            "cliponaxis": false
        }
    }

    render_execution(job_y, execution) {
        let aes = event_aesthetics[execution.status];

        return {
            "mode": "markers+lines",
            "type": "scatter",
            "x": [execution.start_ts, execution.end_ts],
            "y": [job_y, job_y],
            "line": {
                "width": aes.size
            },
            "marker": {
                "line": {
                    "width": 0
                },
                "size": aes.size,
                "color": aes.fill,
                "opacity": 1,
                "symbol": "circle"
            },
            "hoverinfo": "x",
            "cliponaxis": false
        };
    }

    get_plot_data() {
        let shapes = [];
        let annotations = [];
        let executions_data = [];
        let point_events = {
            'x': [],
            'y': [],
            'symbol': [],
            'fill': [],
            'size': [],
            'border_color': [],
            'border_size': []
        };

        let added_events = {
            'x': [],
            'y': [],
            'fill': [],
            'size': [],
            'border_color': [],
            'border_size': []
        };

        this.add_plot_shapes(shapes);

        let job_ids = this.get_jobs_order();

        for(let job_idx in job_ids) {
            let job_id = job_ids[job_idx];
            let job = this.scheduler.jobs[job_id];

            let job_y = 66 + job_idx * 86;

            let job_min_ts = job.min_ts();
            let job_max_ts = job.max_ts();

            if(job_min_ts < this.x_min()) {
                job_min_ts = this.x_min();
                // TODO: add indicator.
            }

            if(job_max_ts > this.x_max()) {
                job_max_ts = this.x_max();
                // TODO: add indicator.
            }

            let executions = job.executions;
            let execution_keys = Object.keys(executions).sort();

            for(let execution_idx in execution_keys) {
                let execution_key = execution_keys[execution_idx];
                let execution = executions[execution_key];

                if(execution.start_ts < job_min_ts) continue;

                // Job events backgrounds.
                executions_data.push(this.render_execution_background(job_y, execution));
                executions_data.push(this.render_execution(job_y, execution));
            }

            if(job.stats.added_ts !== undefined && job.stats.added_ts >= job_min_ts) {
                let aes = event_aesthetics['job_added'];

                added_events.x.push(job.stats.added_ts);
                added_events.y.push(job_y);
                added_events.fill.push(aes.fill);
                added_events.border_color.push(aes.border_color);
                added_events.size.push(aes.size);
                added_events.border_size.push(aes.border_size);
            }

            for(let event_idx in job.events) {
                let event = job.events[event_idx];
                let aes = event_aesthetics[event.event_name];

                if(event.ts < job_min_ts) continue;

                point_events.x.push(event.ts);
                point_events.y.push(job_y);
                point_events.fill.push(aes.fill);
                point_events.border_color.push(aes.border_color);
                point_events.size.push(aes.size);
                point_events.border_size.push(aes.border_size);
            }

            for(let event_idx in job.next_run_times) {
                let aes = event_aesthetics['job_scheduled'];

                point_events.x.push(job.next_run_times[event_idx]);
                point_events.y.push(job_y);
                point_events.fill.push(aes.fill);
                point_events.border_color.push(aes.border_color);
                point_events.size.push(aes.size);
                point_events.border_size.push(aes.border_size);
            }

            // Add job cards.
            shapes.push({
                "type": "path",
                "path": this.job_background(+ job_min_ts, + job_max_ts, job_y - 50, job_y + 20),
                "layer": "below",
                "fillcolor": jobs_aesthetics.card_background,
                "opacity": jobs_aesthetics.card_opacity
            })

            // Add y-grid inside job card.
            shapes.push({
                "type": "line",
                "x0": job_min_ts,
                "x1": job_max_ts,
                "y0": job_y,
                "y1": job_y,
                "line": {
                    "color": jobs_aesthetics.card_axis_color,
                    "width": plot_aesthetics.grid_width
                },
                "opacity": jobs_aesthetics.card_opacity,
                "layer": "below"
            })

            annotations.push({
                "x": + job_min_ts,
                "y": job_y - 34,
                "text": job.name
            });
        }

        let plot_data = [];

        plot_data.push({
            "mode": "markers",
            "type": "scatter",
            "x": added_events.x,
            "y": added_events.y,
            "marker": {
                "line": {
                    "width": added_events.border_size,
                    "color": added_events.border_color,
                },
                "size": added_events.size,
                "color": added_events.fill,
                "opacity": 1
            },
            "hoverinfo": "x",
            "cliponaxis": false
        });

        executions_data.forEach(e => plot_data.push(e));

        // Job events that have no duration (schedued executions, missfires, max_instances).
        plot_data.push({
            "mode": "markers",
            "type": "scatter",
            "x": point_events.x,
            "y": point_events.y,
            "marker": {
                "line": {
                    "width": point_events.border_size,
                    "color": point_events.border_color,
                },
                "size": point_events.size,
                "color": point_events.fill,
                "opacity": 1,
                "symbol": point_events.symbol
            },
            "hoverinfo": "x",
            "cliponaxis": false
        });

        var now_marker = this.get_now_marker();

        // Now marker.
        plot_data.push({
            "mode": "markers+lines",
            "type": "scatter",
            "x": now_marker.x,
            "y": now_marker.y,
            "marker": {
                "line": {
                    "width": 0
                },
                "size": 8,
                "color": event_aesthetics['job_running'].fill,
                // data.border.push('rgba(89, 126, 255, 0.8)');
                "opacity": 1,
                "maxdisplayed": 0,
                "symbol": now_marker.symbol
            },
            "hoverinfo": "skip"
        });

        return {
            'data': plot_data,
            'shapes': shapes,
            'annotations': annotations
        };
    }

    job_background(x0, x1, y0, y1, radius_px=5) {
        x0 -= (20 / this.interval_size_px) * this.time_interval;
        x1 += (20 / this.interval_size_px) * this.time_interval;

        let card_x_range = x1 - x0;
        let card_y_range = (y1 - y0);

        let x_size_px = (card_x_range / this.time_interval) * this.interval_size_px;
        let y_size_px = 70;

        let y_radius = (radius_px / y_size_px) * card_y_range;
        let x_radius = (radius_px / x_size_px) * card_x_range;

        let p1 = x0 + ' ' + (y0 + y_radius);
        let p2 = (x0 + x_radius) + ',' + y0;
        let p3 = (x1 - x_radius) + ',' + y0;
        let p4 = x1 + ' ' + (y0 + y_radius);
        let p5 = x1 + ' ' + (y1 - y_radius);
        let p6 = (x1 - x_radius) + ',' + y1;
        let p7 = (x0 + x_radius) + ',' + y1;
        let p8 = x0 + ' ' + (y1 - y_radius);

        let q1 = x0 + ' ' + y0;
        let q2 = x1 + ' ' + y0;
        let q3 = x1 + ' ' + y1;
        let q4 = x0 + ' ' + y1;

        return "M " + p1 + " Q " + q1 + ' ' + p2 + ' L ' + p3 + " Q " + q2 + ' ' + p4 + ' L ' + p5 + " Q " + q3 + ' ' + p6 + ' L ' + p7 + ' Q ' + q4 + ' ' + p8 + " Z";
    }

    add_plot_shapes(shapes) {
        shapes.push({
            "type": "line",
            "x0": this.x_min(),
            "x1": this.x_min(),
            "y0": this.y_min(),
            "y1": this.y_max(),
            "cliponaxis": false,
            "line": {
                "color": plot_aesthetics.grid_color,
                "width": plot_aesthetics.grid_width
            },
            "layer": "below"
        })

        // Plot box.
        shapes.push({
            "type": "line",
            "x0": this.x_max(),
            "x1": this.x_max(),
            "y0": this.y_min(),
            "y1": this.y_max(),
            "cliponaxis": false,
            "line": {
                "color": plot_aesthetics.grid_color,
                "width": plot_aesthetics.grid_width
            },
            "layer": "below"
        })

        // Minor breaks.
        for(let x = this.x_min() + this.time_interval; x < this.x_max(); x += this.time_interval) {
            shapes.push({
                "type": "line",
                "x0": x,
                "x1": x,
                "y0": this.y_min(),
                "y1": this.y_max(),
                "line": {
                    "color": plot_aesthetics.minor_breaks_color,
                    "width": plot_aesthetics.grid_width
                },
                "layer": "below"
            })            
        }

        return shapes;
    }

    get_layout(layout_height = null, layout_width = null) {
        let layout = JSON.parse(figure_template);  // TODO: make this more efficient. :\

        if(layout_height === null) layout_height = this.plot_height();
        if(layout_width === null) layout_width = this.plot_width();

        layout.layout.width = layout_width;
        layout.layout.height = layout_height;

        layout.layout.xaxis.tick0 = this.x_min();
        layout.layout.xaxis.dtick = this.time_interval * 2;
        layout.layout.xaxis.range = [this.x_min(), this.x_max()];
        layout.layout.yaxis.range = [this.y_max(), this.y_min()];
        layout.layout.margin.l = this.interval_size_px;
        layout.layout.margin.r = this.interval_size_px;

        return layout;
    }

    plot(plot_element, upper_axis_element, lower_axis_element) {
        let main_plot_layout = this.get_layout();
        let plot_elements = this.get_plot_data();

        main_plot_layout.layout.xaxis.side = false;
        main_plot_layout.layout.xaxis.showline = false;
        main_plot_layout.layout.xaxis.linecolor = false;
        main_plot_layout.layout.margin.r = 0;
        main_plot_layout.layout.margin.l = 0;
        main_plot_layout.layout.xaxis.range = [this.x_min() - this.time_interval, this.x_max() + this.time_interval];
        main_plot_layout.layout.shapes = plot_elements['shapes'];
        main_plot_layout.layout.annotations = plot_elements['annotations'];

        let lower_axis_layout = this.get_layout(41);
        lower_axis_layout.layout.xaxis.side = "bottom";
        lower_axis_layout.layout.margin.b = 40;

        let upper_axis_layout = this.get_layout(41);
        upper_axis_layout.layout.xaxis.side = "top";
        upper_axis_layout.layout.margin.t = 40;


        plot_element.style["width"] = this.plot_width() + 'px';
        plot_element.style["height"] = this.plot_height() + 'px';
        lower_axis_element.style["width"] = this.plot_width() + 'px';
        lower_axis_element.style["height"] = 41 + 'px';
        upper_axis_element.style["width"] = this.plot_width() + 'px';
        upper_axis_element.style["height"] = 41 + 'px';


        Plotly.newPlot(plot_element,  {
            data: plot_elements['data'],
            layout: main_plot_layout.layout,
            frames: main_plot_layout.frames,
            config: {"displayModeBar": false}
        });

        Plotly.newPlot(lower_axis_element,  {
            layout: lower_axis_layout.layout,
            config: {"displayModeBar": false, "staticPlot": true}
        });

        Plotly.newPlot(upper_axis_element,  {
            layout: upper_axis_layout.layout,
            config: {"displayModeBar": false, "staticPlot": true}
        });
    }
}
