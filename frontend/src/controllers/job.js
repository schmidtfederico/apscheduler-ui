
import JobPlot from '../view/job_plot';
import '../css/job.less';

var job = angular.module('jobsModule', []);

job.controller('jobController', ['$scope', '$rootScope', '$routeParams', '$controller', 'capabilitiesService',
    function ($scope, $rootScope, $routeParams, $controller, capabilitiesService) {
    angular.extend(this, $controller('jobActionsController', {$scope: $scope}));

    // Decode jobId, as it'll come encoded since we can't control what users set it to.
    $scope.jobId = decodeURIComponent($routeParams.jobId);

    $scope.jobs = null;
    $scope.plot_loaded = false;

    $scope.show_job_controls = false;
    $scope.capabilities = capabilitiesService;

    let job_plot = null;

    let plots_container = document.getElementById('plots-container');
    let main_plot = document.getElementById('plotly-main-plot');
    let upper_axis = document.getElementById('plotly-upper-axis');

    function renderPlot() {
        if($rootScope.scheduler === undefined) return;
        console.log('redraw job plot ' + new Date());

        job_plot.scheduler = $rootScope.scheduler;
        job_plot.target_plot_width = plots_container.getBoundingClientRect().width;
        job_plot.plot(main_plot, upper_axis, null);

        if(!$scope.plot_loaded) {
            $scope.plot_loaded = true;
            $scope.$apply();
        }
    }

    let full_redraw = true;
    let interval_forced_redraw = null;
    let plot_render_interval = null;

    function plot_render_pipeline() {
        if(full_redraw) {
            full_redraw = false;

            if(interval_forced_redraw) {
                window.clearTimeout(interval_forced_redraw);
            }

            interval_forced_redraw = window.setTimeout(function () {
                // Trigger next forced redraw when we're approaching the boundaries of the next interval.
                full_redraw = true;
            }, Math.max(job_plot.time_interval * 0.95, 5000))

            renderPlot();
        }
    }

    $scope.$watch(function() {
        return $rootScope.scheduler.jobs[$scope.jobId];
    }, function() {
        $scope.jobs = $rootScope.scheduler.jobs;
        $scope.job = $rootScope.scheduler.jobs[$scope.jobId];

        if(!job_plot) {
            job_plot = new JobPlot($scope.jobId, $rootScope.scheduler);
        }

        full_redraw = true;
        plot_render_interval = window.setInterval(plot_render_pipeline, 500);
    }, true);

    let resizeDebounce = null;

    window.addEventListener('resize', function() {
        if (resizeDebounce) {
            window.clearTimeout(resizeDebounce);
        }
        resizeDebounce = window.setTimeout(renderPlot, 100);
    });

}]);