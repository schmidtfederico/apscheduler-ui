
const event_aesthetics = {
    job_submitted: {
        fill: '#597EFF',
        size: 10,
        border_color: '#2B3046',
        border_size: 1
    },
    job_executed: {
        fill: '#3EBF91',
        size: 10,
        border_color: '#2B3046',
        border_size: 1
    },
    job_error: {
        fill: '#FF6464',
        size: 10,
        border_color: '#2B3046',
        border_size: 1
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

    constructor(time_interval, target_plot_width=1300, min_intervals=12, interval_size_px=60) {
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
        return Object.keys(this.jobs).length;
    }

    min_ts() {
        var ts = null;
        for(var job_id in this.jobs) {
            if(ts === null || ts > this.jobs[job_id].min_ts)
                ts = this.jobs[job_id].min_ts;
        }

        return ts;
    }

    max_ts() {
        var ts = null;
        for(var job_id in this.jobs) {
            if(ts === null || ts < this.jobs[job_id].max_ts)
                ts = this.jobs[job_id].max_ts;
        }

        return ts;
    }

    now_ts() {
        var ts = null;
        for(var job_id in this.jobs) {
            if(ts === null || ts < this.jobs[job_id].last_event_ts)
                ts = this.jobs[job_id].last_event_ts;
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
        var n_intervals = Math.round(this.n_intervals() / 2, 0);
        return truncated_now - n_intervals * this.time_interval;
    }

    x_max() {
        var truncated_now = Math.floor(this.now_ts() / this.time_interval) * this.time_interval;
        var n_intervals = Math.round(this.n_intervals() / 2, 0);
        return truncated_now + n_intervals * this.time_interval;
    }

    add_job(job_id, job_name) {
        if(!this.jobs.hasOwnProperty(job_id)) {
            this.jobs[job_id] = {
                'y': 66 + this.n_jobs() * 86,
                'name': job_name,
                'min_ts': null,
                'max_ts': null,
                'last_event_ts': null,
                'current_status': null
            };
        }
    }

    update_job(job_id, event_ts, event_name=null) {
        let job = this.jobs[job_id];
        if(job.max_ts === null || event_ts > job.max_ts) {
            job.max_ts = event_ts;
        }

        if(job.min_ts === null || event_ts < job.min_ts) {
            job.min_ts = event_ts;
        }

        if(event_name) {
            if(job.last_event_ts === null || job.last_event_ts < event_ts) {
                job.last_event_ts = event_ts;
                job.current_status = event_name;
            }
        }

        return job;
    }

    add_scheduled_event(job_id, event_ts) {
        var job = this.update_job(job_id, event_ts);

        this.add_point(
            'point_events',
            job.y,
            + event_ts,
            event_aesthetics['job_scheduled'].fill,
            event_aesthetics['job_scheduled'].border_color,
            'circle',
            event_aesthetics['job_scheduled'].size,
            event_aesthetics['job_scheduled'].border_size
        );
    }

    add_job_event(job_id, event_ts, event_name, event_scheduled_ts) {
        let point_group = null;
        let event_group = 'point_events';

        if(event_name !== 'job_missed' && event_name !== 'job_max_instances') {
            event_group = 'job_events';
            point_group = job_id + ':' + event_scheduled_ts;
        }

        console.log(event_name, point_group, event_group);

        let job = this.update_job(job_id, event_ts, event_name);

        this.add_point(
            event_group,
            job.y,
            + event_ts,
            event_aesthetics[event_name].fill,  // fill color
            event_aesthetics[event_name].border_color,  // border color
            'circle',
            event_aesthetics[event_name].size,
            event_aesthetics[event_name].border_size,
            point_group
        );
    }

    add_point(marker_type, y, x, fill, border_color, symbol, size, line_width, group=null) {
        this.markers[marker_type].y.push(y);
        this.markers[marker_type].x.push(x);
        this.markers[marker_type].fill.push(fill);
        this.markers[marker_type].border.push(border_color);
        this.markers[marker_type].symbol.push(symbol);
        this.markers[marker_type].size.push(size);
        this.markers[marker_type].line_width.push(line_width);
        
        if(group !== null) {
            this.markers[marker_type].groups.push(group);
            this.markers[marker_type].styles[group] = {
                'line': {'color': fill, 'size': line_width},
                'marker': {'color': fill, 'line': {'color': fill, 'size': line_width}}
            }    
        }
    }

    get_now_marker() {
        var now = (+ this.now_ts());

        return {
            'x': [now, now],
            'y': [this.y_min() + 3, this.y_max() - 3],
            'symbol': ['triangle-down', 'triangle-up'],
        }
    }

    get_plot_data() {
        var now_marker = this.get_now_marker();

        return [
            // Job events backgrounds.
            {
                "mode": "markers+lines",
                "type": "scatter",
                "x": this.markers['job_events'].x,
                "y": this.markers['job_events'].y,
                "line": {
                    "width": 12,
                    "color": "#2B3046"
                },
                "marker": {
                    "line": {
                        "width": 1,
                        "color": "#2B3046",
                    },
                    "size": 12,
                    "color": "#2B3046",
                    "opacity": 1,
                    "maxdisplayed": 0,
                    "symbol": this.markers['job_events'].symbol
                },
                "transforms": [{
                    "type": 'groupby',
                    "groups": this.markers['job_events'].groups
                }],
                "hoverinfo": "x+y",
                "cliponaxis": false,
                "hoverlabel": {
                    "namelength": 15
                },
                "showlegend": false,
                "hovertemplate": ""
            },
            // Job events.
            {
                "mode": "markers+lines",
                "type": "scatter",
                "x": this.markers['job_events'].x,
                "y": this.markers['job_events'].y,
                "line": {
                    "width": 11
                },
                "marker": {
                    "line": {
                        "width": this.markers['job_events'].line_width,
                        "color": this.markers['job_events'].border,
                    },
                    "size": this.markers['job_events'].size,
                    "color": this.markers['job_events'].fill,
                    "opacity": 1,
                    "maxdisplayed": 0,
                    "symbol": this.markers['job_events'].symbol
                },
                "transforms": [{
                    "type": 'groupby',
                    "groups": this.markers['job_events'].groups,
                    "styles": this.markers['job_events'].styles
                }],
                "hoverinfo": "x+y",
                "cliponaxis": false,
                "hoverlabel": {
                    "namelength": 15
                },
                "showlegend": false,
                "hovertemplate": ""
            },
            // Scheduled events.
            {
                "mode": "markers",
                "type": "scatter",
                "x": this.markers['point_events'].x,
                "y": this.markers['point_events'].y,
                "line": {
                    "width": 11
                },
                "marker": {
                    "line": {
                        "width": this.markers['point_events'].line_width,
                        "color": this.markers['point_events'].border,
                    },
                    "size": this.markers['point_events'].size,
                    "color": this.markers['point_events'].fill,
                    "opacity": 1,
                    "maxdisplayed": 0,
                    "symbol": this.markers['point_events'].symbol
                },
                "transforms": [{
                    "type": 'groupby',
                    "groups": this.markers['point_events'].groups,
                    "styles": this.markers['point_events'].styles
                }],
                "hoverinfo": "x+y",
                "cliponaxis": false,
                "hoverlabel": {
                    "namelength": 15
                },
                "showlegend": false,
                "hovertemplate": ""
            },
            // Now marker.
            {
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
            }
        ];
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

    get_plot_shapes() {
        var shapes = [];

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

        // Add job cards.
        for(var job_id in this.jobs) {
            var job = this.jobs[job_id];

            shapes.push({
                "type": "path",
                "path": this.job_background(+ job.min_ts, + job.max_ts, job.y - 50, job.y + 20),
                "layer": "below",
                "fillcolor": "#2F344D"
            })

            shapes.push({
                "type": "line",
                "x0": job.min_ts,
                "x1": job.max_ts,
                "y0": job.y,
                "y1": job.y,
                "line": {
                    "color": "#474966",
                    "width": 1
                },
                "opacity": 0.8,
                "layer": "below"
            })
        }

        return shapes;
    }

    get_plot_annotations() {
        var annotations = [];

        // Add job names.
        for(var job_id in this.jobs) {
            var job = this.jobs[job_id];

            annotations.push({
                "x": + job.min_ts,
                "y": job.y - 34,
                "text": job.name
            });
        }

        return annotations;
    }

    plot(plot_element, lower_axis_element) {
        var main_plot_layout = JSON.parse(JSON.stringify(figure_template));  // TODO: make this more efficient. :\

        main_plot_layout.layout.margin.b = 0;
        main_plot_layout.layout.height = this.plot_height();
        main_plot_layout.layout.width = this.plot_width();
        main_plot_layout.layout.xaxis.tick0 = this.x_min();
        main_plot_layout.layout.xaxis.dtick = this.time_interval * 2;
        main_plot_layout.layout.xaxis.range = [this.x_min(), this.x_max()];
        main_plot_layout.layout.yaxis.range = [this.y_max(), this.y_min()];
        main_plot_layout.layout.shapes = this.get_plot_shapes();
        main_plot_layout.layout.annotations = this.get_plot_annotations();

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
            data: this.get_plot_data(),
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
