// http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

angular.module('app', ['lbServices'])
    .controller('Person', ['$scope', 'Person', function($scope, Person) {
        Person.getCurrent().$promise
        .then(function(person) {
            $scope.person = person;
        });
        $scope.login = function() {
            $scope.error = undefined;
            Person.login({'email': $scope.email, 'password': $scope.password}).$promise
            .then(function(person) {
                $scope.person = person.user;
            }, function(response) {
                $scope.error = response.data.error.message;
            })
        }
        $scope.register = function() {
            $scope.error = undefined;
            Person.create({'email': $scope.email, 'password': $scope.password}).$promise
            .then(function() {
                $scope.login();
            }, function(response) {
                $scope.error = response.data.error.message;
            })
        }
        $scope.logout = function() {
            Person.logout();
            $scope.person = undefined;
        }
    }])
    .controller('Location', ['$scope', 'Location', function($scope, Location) {
        Location.find().$promise
        .then(function(locations) {
            $scope.locations = locations
        })
    }])
    .controller('Suggestion', ['$scope', 'Person', function($scope, Person) {
        Person.getCurrent().$promise
        .then(function(person) {
            var locationId = getParameterByName('locationId')
            var personId = person.id
            var suggestions_promise = Person.suggestions({'personId': personId, 'locationId': locationId}, {}).$promise

            $scope.person = person
            Person.prototype$__get__preferences({'id': person.id}).$promise
            .then(function(preferences) {

                var preferencesByDocumentId = {}
                for(var i = 0; i < preferences.length; i++) {
                    preferencesByDocumentId[preferences[i].documentId] = preferences[i]
                }
                suggestions_promise
                .then(function(res) {
                    var documents = res.documents
                    for(var i = 0; i < documents.length; i++) {
                        documents[i].preference = preferencesByDocumentId[documents[i].id]
                    }
                    $scope.documents = documents
                    $scope.requestId = res.requestId
                })
            })
        })

        $scope.updatePreference = function(document) {
            var preference = document.preference
            preference.requestId = $scope.requestId
            preference.documentId = preference.documentId || document.id
            if(preference.id) {
                Person.prototype$__updateById__preferences({'id': $scope.person.id, 'fk': preference.id}, preference).$promise
                .then(function(preference) {
                    document.preference = preference
                })
            } else {
                Person.prototype$__create__preferences({'id': $scope.person.id}, preference).$promise
                .then(function(preference) {
                    document.preference = preference
                })
            }
        }
    }])