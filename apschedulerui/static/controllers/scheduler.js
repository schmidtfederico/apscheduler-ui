var controller = angular.module('schedulerModule', []);

controller.controller('schedulerController', function ($scope, $rootScope, $modal, $http, $location, capabilitiesService) {
    $scope.capabilities = capabilitiesService;

    let create_modal = function(action_name) {
        return $modal.open({
            templateUrl: '/static/partials/modals/confirm.html',
            controller: 'ConfirmModalController',
            resolve: {
                action: function () {
                    return action_name
                }
            }
        });
    }

    $scope.start_scheduler = function () {
        console.log('Send start_scheduler request');
        $http.post('/api/scheduler/start')
    }

    $scope.resume_scheduler = function () {
        console.log('Send resume_scheduler request');
        $http.post('/api/scheduler/resume')
    }

    $scope.pause_scheduler = function () {
        let confirm_modal = create_modal('pause the scheduler');

        confirm_modal.result.then(function () {
            console.log('Send pause_scheduler request');
            $http.post('/api/scheduler/pause');
        });
    }

    $scope.stop_scheduler = function () {
        let confirm_modal = create_modal('stop the scheduler');

        confirm_modal.result.then(function () {
            console.log('Send stop_scheduler request');
            $http.post('/api/scheduler/stop');
        });
    }
});