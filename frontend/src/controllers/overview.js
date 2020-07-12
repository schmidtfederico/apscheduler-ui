
import SchedulerPlot from '../view/scheduler_plot';

var jobList = angular.module('overviewModule', []);

jobList.controller('overviewController', ['$scope', '$rootScope', '$controller', 'capabilitiesService',
    function ($scope, $rootScope, $controller, capabilitiesService) {
    angular.extend(this, $controller('jobActionsController', {$scope: $scope}));

    $scope.scheduler = null;

    $scope.display_mode = localStorage.getItem('display_mode') || 'timeline';
    $scope.plot_interval = localStorage.getItem('plot_interval') || 'Hour';
    $scope.filter_query = '';
    $scope.plot_loaded = false;

    $scope.capabilities = capabilitiesService;

    let plot_time_interval = 60 * 1000;

    let scheduler_plot = new SchedulerPlot($scope.scheduler, plot_time_interval);

    let plots_container = document.getElementById('plots-container');
    let main_plot = document.getElementById('plotly-main-plot');
    let upper_axis = document.getElementById('plotly-upper-axis');
    let lower_axis = document.getElementById('plotly-lower-axis');

    function renderPlot() {
        if($scope.display_mode !== 'timeline' || $scope.scheduler === undefined) return;
        console.log('redraw ' + new Date());

        scheduler_plot.time_interval = plot_time_interval;
        scheduler_plot.scheduler = $scope.scheduler;
        scheduler_plot.target_plot_width = plots_container.getBoundingClientRect().width;
        if($scope.filter_query !== undefined) {
            scheduler_plot.jobs_filter = $scope.filter_query;
        }
        scheduler_plot.plot(main_plot, upper_axis, lower_axis);
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
            }, Math.max(scheduler_plot.time_interval * 0.95, 5000))

            renderPlot();
        }
    }

    let resizeDebounce = null;

    window.addEventListener('resize', function() {
        if (resizeDebounce) {
            window.clearTimeout(resizeDebounce);
        }
        resizeDebounce = window.setTimeout(renderPlot, 100);
    });

    $scope.$watch('display_mode', function (new_value) {
        if(new_value === 'timeline') {
            full_redraw = true;
            plot_render_interval = window.setInterval(plot_render_pipeline, 500);
        } else {
            if(plot_render_interval) window.clearInterval(plot_render_interval);
        }
        localStorage.setItem('display_mode', new_value);
    });

    let search_debounce = null;

    $scope.$watch('filter_query', function () {
        if(search_debounce) {
            window.clearTimeout(search_debounce);
        }
        search_debounce = window.setTimeout(renderPlot, 300);
    });

    $scope.$watch(function() {
      return $rootScope.scheduler;
    }, function() {
        $scope.scheduler = $rootScope.scheduler;
        full_redraw = true;
    }, true);

    $scope.$watch('plot_interval', function (value) {
        // Make sure we store this config, so that if user reloads the view we can keep their preferences.
        localStorage.setItem('plot_interval', value);

        plot_time_interval = {
            'Hour': 60 * 60 * 1000,
            'Minute': 60 * 1000
        }[value];

        full_redraw = true;
        $scope.plot_loaded = false;
    })
}]);