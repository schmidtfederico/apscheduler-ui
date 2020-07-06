
var job_actions = angular.module('jobActionsModule', []);

job_actions.controller('jobActionsController', ['$scope', '$modal', '$http', 'capabilitiesService',
    function ($scope, $modal, $http, capabilitiesService) {

    $scope.capabilities = capabilitiesService;

    let create_modal = function(action_name) {
        return $modal.open({
            templateUrl: 'static/partials/confirm_modal.html',
            controller: 'ConfirmModalController',
            resolve: {
                action: function () {
                    return action_name
                }
            }
        });
    }

    $scope.run_job = function (job) {
        console.log('Send run_job request');
        $http.post('/api/job/' + job.id + '/run_now');
    }

    $scope.pause_job = function (job) {
        console.log('Send pause_job request');
        $http.post('/api/job/' + job.id + '/pause');
    }

    $scope.resume_job = function (job) {
        console.log('Send resume_job request');
        $http.post('/api/job/' + job.id + '/resume');
    }

    $scope.remove_job = function (job) {
        let confirm_modal = create_modal(
            'remove job "' + job.name + '" (id: ' + job.id + ')'
        );

        confirm_modal.result.then(function () {
            console.log('Send remove_job request');
            $http.post('/api/job/' + job.id + '/remove');
        });
    }

}]);
