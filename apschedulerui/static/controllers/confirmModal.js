
var modals = angular.module('modalsControllers', []);

modals.controller('ConfirmModalController', function ($scope, $modalInstance, action) {
    $scope.action = action;

    $scope.ok = function () {
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
});