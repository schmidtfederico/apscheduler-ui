
import '../css/modals.less';

var modals = angular.module('modalsControllers', []);

modals.controller('ConfirmModalController', ['$scope', '$modalInstance', 'action', function ($scope, $modalInstance, action) {
    $scope.action = action;

    $scope.ok = function () {
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
}]);
