
const event_aesthetics = {
    job_submitted: {
        fill: '#597EFF',
        size: 11,
        border_color: '#2B3046',
        border_size: 2
    },
    job_executed: {
        fill: '#3EBF91',
        size: 11,
        border_color: '#2B3046',
        border_size: 2
    },
    job_error: {
        fill: '#FF6464',
        size: 11,
        border_color: '#2B3046',
        border_size: 2
    },
    job_running: {
        fill: '#597EFF',
        size: 11,
        border_color: 'rgba(89, 126, 255, 0.7)',
        border_size: 2
    },
    job_missed: {
        fill: '#2B2F46',
        size: 11,
        border_color: '#FF6464',
        border_size: 2
    },
    job_added: {
        fill: '#2B3046',
        size: 6,
        border_color: '#3EBF91',
        border_size: 1
    },
    job_modified: {
        fill: '#2B3046',
        size: 6,
        border_color: '#597EFF',
        border_size: 1
    },
    job_removed: {
        fill: '#2B3046',
        size: 6,
        border_color: '#FF6464',
        border_size: 1
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

const plot_aesthetics = {
    grid_color: '#474966',
    grid_width: 1,
    minor_breaks_color: "#2B2C3D",
    font: ''
};

const jobs_aesthetics = {
    card_background: "#2F344D",
    card_opacity: 0.8,
    card_axis_color: "#373C54",
    card_axis_width: 1
}

module.exports = {
    event_aesthetics: event_aesthetics,
    plot_aesthetics: plot_aesthetics,
    jobs_aesthetics: jobs_aesthetics
}