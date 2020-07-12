import 'angular';
import 'angular-route';
import 'angular-socket-io';

import 'jquery';

import 'bootstrap/dist/js/bootstrap';
import 'angular-ui-bootstrap';
import io from 'socket.io-client';

import '@fortawesome/fontawesome-free/js/fontawesome'
import '@fortawesome/fontawesome-free/js/solid'
import '@fortawesome/fontawesome-free/js/regular'

import './css/index.less';

import Scheduler from './model/scheduler';

import './controllers/confirmModal';
import './controllers/job_actions';
import './controllers/job';
import './controllers/overview';
import './controllers/navbar';


require('ng-cache-loader?prefix=static/partials!./partials/job.html');
require('ng-cache-loader?prefix=static/partials!./partials/overview.html');


let schedulerApp = angular.module('scheduler', [
    'ngRoute',
    'btford.socket-io',
    'ui.bootstrap',
    // controllers modules
    'navbarModule',
    'overviewModule',
    'jobsModule',
    'modalsControllers',
    'jobActionsModule'
]);

schedulerApp.factory('socket', ['socketFactory', function (socketFactory) {
    if (!location.origin)
        location.origin = location.protocol + "//" + location.host;

    return socketFactory({
        prefix: '',
        ioSocket: io.connect(location.origin)
    });
}]);


schedulerApp.service('capabilitiesService', ['socket', function (socket) {
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
}]);


schedulerApp.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    // Configure app routes.
    $routeProvider.
        when('/', {
            templateUrl: 'static/partials/overview.html',
            controller: 'overviewController'
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

schedulerApp.run(['socket', '$rootScope', function (socket, $rootScope) {
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
}]);


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