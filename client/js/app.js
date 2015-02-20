angular.module('app', ['lbServices'])
    .controller('Person', ['$scope', 'Person', function($scope, Person) {
        $scope.login = function() {
            Person.login({'email': $scope.email, 'password': $scope.password})
        }
        $scope.register = function() {
            Person.create({'email': $scope.email, 'password': $scope.password}).$promise
            .then(function(person) {
                console.log(person)
            })
        }
        $scope.logout = function() {
            Person.logout()
        }
    }])
    .controller('Location', ['$scope', 'Location', function($scope, Location) {
        Location.find().$promise
        .then(function(locations) {
            $scope.locations = locations
        })
    }])
    .controller('Suggestion', ['$scope', '$http', 'Person', function($scope, $http, Person) {
        var suggestions_promise = $http.post('/suggestions' + window.location.search)
        Person.getCurrent().$promise
        .then(function(person) {
            $scope.person = person
            Person.prototype$__get__preferences({'id': person.id}).$promise
            .then(function(preferences) {

                var preferencesByDocumentId = {}
                for(var i = 0; i < preferences.length; i++) {
                    preferencesByDocumentId[preferences[i].documentId] = preferences[i]
                }
                suggestions_promise
                .then(function(res) {
                    var documents = res.data
                    for(var i = 0; i < documents.length; i++) {
                        documents[i].preference = preferencesByDocumentId[documents[i].id]
                    }
                    $scope.documents = res.data
                })
            })
        })

        $scope.updatePreference = function(document) {
            var preference = document.preference
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