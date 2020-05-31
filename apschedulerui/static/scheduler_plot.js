
const event_aesthetics = {
    job_submitted: {
        fill: '#597EFF',
        size: 10,
        border_color: '#2B3046',
        border_size: 2
    },
    job_executed: {
        fill: '#3EBF91',
        size: 10,
        border_color: '#2B3046',
        border_size: 2
    },
    job_error: {
        fill: '#FF6464',
        size: 10,
        border_color: '#2B3046',
        border_size: 2
    },
    job_running: {
        fill: '#597EFF',
        size: 10,
        border_color: 'rgba(89, 126, 255, 0.7)',
        border_size: 1
    },
    job_missed: {
        fill: '#2B2F46',
        size: 11,
        border_color: '#FF6464',
        border_size: 2
    },
    job_max_instances: {
        fill: '#FF6464',
        size: 10,
        border_color: '#2B3046',
        border_size: 3
    },
    job_scheduled: {
        fill: '#2B3046',
        size: 11,
        border_color: '#969FCC',
        border_size: 2
    }
};



var figure_template = {
    "layout": {
        "autosize": false,
        "font": {
            "color": "rgb(150, 159, 204)",
            "family": "IBM Plex Sans"
        },
        "xaxis": {
            "side": "top",
            "type": "date",
            "ticklen": 8,
            "showgrid": true,
            "tickmode": "linear",
            "gridcolor": "#474966",
            "linecolor": "#474966",
            "tickcolor": "#474966",
            "tickwidth": 1,
            "automargin": false,
            "tickformat": "",
            "fixedrange": true
        },
        "yaxis": {
            "type": "linear",
            "dtick": 86,
            "tick0": 66,
            "gridcolor": "#373C54",
            "tickson": "labels",
            "showgrid": false,
            "showline": false,
            "tickmode": "linear",
            "showspikes": false,
            "showticklabels": false,
            "fixedrange": true
        },
        "margin": {
            "b": 40,
            "l": 50,
            "r": 50,
            "t": 40,
            "pad": 0
        },
        "template": {
            "layout": {
                "shapedefaults": {
                    "line": {
                        "width": 0
                    },
                    "opacity": 1
                },
                "annotationdefaults": {
                    "font": {
                        "size": 14,
                        "color": "rgb(231, 235, 255)",
                        "family": "IBM Plex Sans"
                    },
                    "arrowhead": 0,
                    "arrowcolor": "#f2f5fa",
                    "arrowwidth": 1,
                    "xanchor": "left",
                    "yanchor": "top",
                    "showarrow": false
                }
            }
        },
        "hoverlabel": {
            "font": {
                "color": "rgb(231, 235, 255)",
                "family": "IBM Plex Sans"
            },
            "bgcolor": "rgb(71, 73, 102)",
            "bordercolor": "rgb(71, 73, 102)"
        },
        "hovermode": "closest",
        "showlegend": false,
        "plot_bgcolor": "rgb(29, 30, 46)",
        "paper_bgcolor": "rgb(29, 30, 46)"
    },
    "frames": []
}


class SchedulerPlot {
    markers = {
        'job_events': {
            'x': [],
            'y': [],
            'fill': [],
            'border': [],
            'symbol': [],
            'size': [],
            'line_width': [],
            'groups': [],
            'styles': {}
        },
        'point_events': {
            'x': [],
            'y': [],
            'fill': [],
            'border': [],
            'symbol': [],
            'size': [],
            'line_width': []
        }
    }

    jobs = {};

    constructor(scheduler, time_interval, target_plot_width=1300, min_intervals=12, interval_size_px=60) {
        this.scheduler = scheduler;
        this.time_interval = time_interval;
        this.interval_size_px = interval_size_px;
        this.target_plot_width = target_plot_width;
        this.min_intervals = min_intervals;
    }

    n_intervals() {
        // 100 is the right + left padding, in px.
        var max_intervals = Math.floor((this.target_plot_width - 100) / this.interval_size_px);

        return Math.max(this.min_intervals, max_intervals);
    }

    plot_width() {
        return this.n_intervals() * this.interval_size_px + 100;
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
            "hoverinfo": false,
            "cliponaxis": false,
            "showlegend": false,
            "hovertemplate": null
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
                "symbol": 'circle'
            },
            "hoverinfo": "x+y",
            "cliponaxis": false,
            "hoverlabel": {
                "namelength": 15
            },
            "showlegend": false,
            "hovertemplate": ""
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

        this.add_plot_shapes(shapes);

        let job_ids = this.get_jobs_order();

        for(let job_idx in job_ids) {
            let job_id = job_ids[job_idx];
            let job = this.scheduler.jobs[job_id];

            let job_y = 66 + job_idx * 86;
            let executions = job.executions;
            let execution_keys = Object.keys(executions).sort();

            for(let execution_idx in execution_keys) {
                let execution_key = execution_keys[execution_idx];
                let execution = executions[execution_key];

                // Job events backgrounds.
                executions_data.push(this.render_execution_background(job_y, execution));
                executions_data.push(this.render_execution(job_y, execution));
            }

            for(let event_idx in job.events) {
                let event = job.events[event_idx];
                let aes = event_aesthetics[event.event_name];

                point_events.x.push(event.ts);
                point_events.y.push(job_y);
                point_events.fill.push(aes.fill);
                point_events.border_color.push(aes.border_color);
                point_events.size.push(aes.size);
                point_events.border_size.push(aes.border_size);
            }

            for(let event_idx in job.next_run_times) {
                let aes = event_aesthetics['job_scheduled'];

                point_events.x.push(+ job.next_run_times[event_idx]);
                point_events.y.push(job_y);
                point_events.fill.push(aes.fill);
                point_events.border_color.push(aes.border_color);
                point_events.size.push(aes.size);
                point_events.border_size.push(aes.border_size);
            }

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

            // Add job cards.
            shapes.push({
                "type": "path",
                "path": this.job_background(+ job_min_ts, + job_max_ts, job_y - 50, job_y + 20),
                "layer": "below",
                "fillcolor": "#2F344D"
            })

            shapes.push({
                "type": "line",
                "x0": job_min_ts,
                "x1": job_max_ts,
                "y0": job_y,
                "y1": job_y,
                "line": {
                    "color": "#474966",
                    "width": 1
                },
                "opacity": 0.8,
                "layer": "below"
            })

            annotations.push({
                "x": + job_min_ts,
                "y": job_y - 34,
                "text": job.name
            });
        }

        // Job events that have no duration (schedued executions, missfires, max_instances).
        executions_data.push({
            "mode": "markers",
            "type": "scatter",
            "x": point_events.x,
            "y": point_events.y,
            "line": {
                "width": 11
            },
            "marker": {
                "line": {
                    "width": point_events.border_size,
                    "color": point_events.border_color,
                },
                "size": point_events.size,
                "color": point_events.fill,
                "opacity": 1,
                "maxdisplayed": 0,
                "symbol": point_events.symbol
            },
            "hoverinfo": "x+y",
            "cliponaxis": false,
            "hoverlabel": {
                "namelength": 15
            },
            "showlegend": false,
            "hovertemplate": ""
        });

        var now_marker = this.get_now_marker();

        // Now marker.
        executions_data.push({
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
            }
        });

        return {
            'data': executions_data,
            'shapes': shapes,
            'annotations': annotations
        };
    }

    job_background(x0, x1, y0, y1, radius_px=5) {
        x0 -= (20 / this.interval_size_px) * this.time_interval;
        x1 += (20 / this.interval_size_px) * this.time_interval;

        var card_x_range = x1 - x0;
        var card_y_range = (y1 - y0);

        var x_size_px = (card_x_range / this.time_interval) * this.interval_size_px;
        var y_size_px = 70;

        var y_radius = (radius_px / y_size_px) * card_y_range;
        var x_radius = (radius_px / x_size_px) * card_x_range;

        var p1 = x0 + ' ' + (y0 + y_radius);
        var p2 = (x0 + x_radius) + ',' + y0;
        var p3 = (x1 - x_radius) + ',' + y0;
        var p4 = x1 + ' ' + (y0 + y_radius);
        var p5 = x1 + ' ' + (y1 - y_radius);
        var p6 = (x1 - x_radius) + ',' + y1;
        var p7 = (x0 + x_radius) + ',' + y1;
        var p8 = x0 + ' ' + (y1 - y_radius);

        var q1 = x0 + ' ' + y0;
        var q2 = x1 + ' ' + y0;
        var q3 = x1 + ' ' + y1;
        var q4 = x0 + ' ' + y1;


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
                "color": "#474966",
                "width": 2
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
                "color": "#474966",
                "width": 2
            },
            "layer": "below"
        })

        // Minor breaks.
        for(var x = this.x_min() + this.time_interval; x < this.x_max(); x += this.time_interval) {
            shapes.push({
                "type": "line",
                "x0": x,
                "x1": x,
                "y0": this.y_min(),
                "y1": this.y_max(),
                "line": {
                    "color": "#2B2C3D",
                    "width": 1
                },
                "layer": "below"
            })            
        }

        return shapes;
    }

    plot(plot_element, lower_axis_element) {
        var main_plot_layout = JSON.parse(JSON.stringify(figure_template));  // TODO: make this more efficient. :\

        let plot_elements = this.get_plot_data();

        main_plot_layout.layout.margin.b = 0;
        main_plot_layout.layout.height = this.plot_height();
        main_plot_layout.layout.width = this.plot_width();
        main_plot_layout.layout.xaxis.tick0 = this.x_min();
        main_plot_layout.layout.xaxis.dtick = this.time_interval * 2;
        main_plot_layout.layout.xaxis.range = [this.x_min(), this.x_max()];
        main_plot_layout.layout.yaxis.range = [this.y_max(), this.y_min()];
        main_plot_layout.layout.shapes = plot_elements['shapes'];
        main_plot_layout.layout.annotations = plot_elements['annotations'];

        var lower_axis_layout = JSON.parse(JSON.stringify(figure_template));  // TODO: make this more efficient. :\

        lower_axis_layout.layout.margin.t = 0;
        lower_axis_layout.layout.height = 41;
        lower_axis_layout.layout.width = this.plot_width();
        lower_axis_layout.layout.xaxis.side = "bottom";
        lower_axis_layout.layout.xaxis.tick0 = this.x_min();
        lower_axis_layout.layout.xaxis.dtick = this.time_interval * 2;
        lower_axis_layout.layout.xaxis.range = [this.x_min(), this.x_max()];
        lower_axis_layout.layout.yaxis.range = [this.y_max(), this.y_min()];

        plot_element.style["width"] = this.plot_width() + 'px';
        plot_element.style["height"] = this.plot_height() + 'px';
        lower_axis_element.style["width"] = this.plot_width() + 'px';
        lower_axis_element.style["height"] = 41 + 'px';

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
    }
}
