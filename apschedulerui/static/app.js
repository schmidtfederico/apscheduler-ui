

let schedulerApp = angular.module('scheduler', [
    'ngRoute',
    'btford.socket-io',
    'ui.bootstrap',
    // controllers modules
    'schedulerModule',
    'jobListModule',
    'jobsModule',
    'modalsControllers'
]);

schedulerApp.factory('socket', function (socketFactory) {
    if (!location.origin)
        location.origin = location.protocol + "//" + location.host;

    return socketFactory({
        prefix: '',
        ioSocket: io.connect(location.origin)
    });
});


schedulerApp.service('capabilitiesService', function (socket) {
    this.can_control_jobs = false;
    this.can_control_scheduler = false;
    this.run_job = false;
    this.pause_job = false;
    this.remove_job = false;
    this.pause_scheduler = false;
    this.stop_scheduler = false;

    socket.on('init_capabilities', (json) => {
        console.log('init_capabilities', json);

        Object.keys(json).forEach(capability => this[capability] = json[capability]);

        this.can_control_jobs = this.pause_job ||
            this.run_job ||
            this.remove_job;

        this.can_control_scheduler = this.pause_scheduler || this.stop_scheduler;
    })
});

// schedulerApp.constant('jobsConstants', {
//     status: {
//         JOB_STATUS_RUNNING: 1,
//         JOB_STATUS_WAITING: 2,
//         JOB_STATUS_FINISHED: 3,
//         JOB_STATUS_ERROR: 4,
//         JOB_STATUS_INACTIVE: 5
//     },
//     status_description: {
//         1: { css: 'label-info', text: 'Running'},
//         2: { css: 'label-warning', text: 'Waiting'},
//         3: { css: 'label-success', text: 'Finished'},
//         4: { css: 'label-danger', text: 'Error'},
//         5: { css: 'label-default', text: 'Inactive'},
//         unknown: { css: 'label-default', text: 'Unknown'}
//     }
// });

schedulerApp.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    // Configure app routes.
    $routeProvider.
        when('/', {
            templateUrl: 'static/partials/overview.html',
            controller: 'jobListController'
        }).
        when('/job/:jobId', {
            templateUrl: 'static/partials/job.html',
            controller: 'jobController'
        }).
        otherwise({
            redirectTo: '/'
        });

    $locationProvider.html5Mode(true);
}]);

schedulerApp.run(function (socket, $rootScope) {
    $rootScope.backendConnected = false;

    $rootScope.Utils = {
        keys: function(obj) {
            if(obj !== null && obj !== undefined) return Object.keys(obj);
            return [];
        }
    };

    socket.on('connect', function () {
        $rootScope.backendConnected = true;
        socket.emit('connected');
    });

    socket.on('disconnect', function () {
        $rootScope.backendConnected = false;
    });

    socket.on('init_jobs', function(json) {
        console.log('init_jobs', json);
        $rootScope.scheduler = new Scheduler(json);
    })

    socket.on('job_event', function(json) {
        console.log('job_event', json);
        $rootScope.scheduler.process_event(json);
    })
    socket.on('scheduler_event', function(json) {
        console.log('scheduler_event', json);
        $rootScope.scheduler.process_event(json);
    })
});


// Filter to change dictionaries to arrays.
schedulerApp.filter('toArray', function () {
    return function (obj, addKey) {
        if (!(obj instanceof Object)) {
            return obj;
        }

        if (addKey === false) {
            return Object.values(obj);
        } else {
            return Object.keys(obj).map(function (key) {
                return Object.defineProperty(obj[key], '$key', {enumerable: false, value: key});
            });
        }
    };
});

schedulerApp.filter('jobsFilter', function() {
    return function (jobs, filter_query) {
        let out = [];
        if(jobs) {
            for(let i = 0; i < jobs.length; i++) {
                if(jobs[i].contains(filter_query)) {
                    out.push(jobs[i]);
                }
            }
        }
        return out;
    }
})

schedulerApp.filter('encodeURI', function() {
    return function(uri) {
        if(uri) return window.encodeURIComponent(uri);
        return "";
    }
});