var _ = require('underscore');
var loopback = require('loopback');
var async = require('async');
var request = require('request');

var return_response = function(request, responses, cb) {
    responses = _.reject(responses, function(response) { return response.error });
    responses = _.map(responses, function(response) { return response.body['suggestions'] });
    var documentIds = _.uniq(_.without(_.flatten(_.zip.apply(_, responses)), undefined));
    if(documentIds.length === 0) {
        documentIds = [7, 1, 4, 14, 66, 9];
    }

    var Document = loopback.getModel('document');
    Document.find({'where': {'id': {'inq': documentIds}}}, function(err, documents) {
        documentsById = _.indexBy(documents, 'id');
        documents = _.map(documentIds, function(documentId) { return documentsById[documentId] });
        cb(null, {documents: documents, requestId: request.id});
    });
}

var post_with_timeout = function(url, options, cb) {
    var timeout_error = 'Timed_out!';
    async.parallel([
        function(cb) {
            request.post(url, options, function(err, response, body) {
                cb(err, {response: response, body: body})
            })
        },
        function(cb) {
            setTimeout(function() {
                cb(timeout_error, null);
            }, 1000);
        }
    ], function(err, results) {
        if(results[0] && err == timeout_error) {
            err = null;
        }
        cb(err, results[0] && results[0].response, results[0] && results[0].body)
    });
}

var request_suggestions = function(services, person, location, cb) {
    // TODO: Log final response
    var Request = loopback.getModel('request');

    services = _.filter(services, function(service) { return service.subscriptions().length > 0 })
    services = _.sample(services, 5)
    var subscriptions = _.map(services, function(service) { return _.sample(service.subscriptions()) })
    var data = {'person': person, 'location': location};

    Request.create({body: data, personId: person.id, locationId: location.id}, function(err, request) {
        async.map(subscriptions, function(subscription, cb) {
            post_with_timeout(subscription.callback_url, {json: data}, function(err, response, body) {
                if(!err && response.statusCode != 200) {
                    err = "HTTP status code must be 200, it was: " + response.statusCode;
                }
                request.responses.create({'subscriptionId': subscription.id, body: body, error: err}, function(err, response) {
                    cb(null, response);
                });
            });
        }, function(err, responses) {
            return_response(request, responses, cb);
        });
    });
}

module.exports = function(Person) {
    Person.disableRemoteMethod('deleteById', true);
    Person.disableRemoteMethod('__delete__preferences', false);
    Person.disableRemoteMethod('__destroyById__preferences', false);

    Person.suggestions = function(personId, locationId, cb) {
        var Service = loopback.getModel('service');
        var Location = loopback.getModel('location');

        async.parallel({
            person: function(cb) {
                Person.findOne({where: {id: personId}, include: {relation: 'preferences', scope: {fields: ['rating', 'documentId']}}, fields: {id: true}}, cb);
            },
            location: function(cb) {
                Location.findById(locationId, cb);
            },
            services: function(cb) {
                Service.find({'include': 'subscriptions'}, cb);
            }
        }, function(err, results) {
            if(err) {
                cb(err, null);
            } else if(results.person === null) {
                cb("Invalid personId.", null);
            } else if(results.location === null) {
                cb("Invalide locationId.", null);
            } else {
                request_suggestions(results.services, results.person, results.location, cb)
            }
        })
    }

    Person.remoteMethod(
        'suggestions',
        {
            accepts: [
                {arg: 'id', type: 'Number', required: true, description: 'User id'},
                {arg: 'locationId', type: 'Number', required: true, http: {source: 'query'}},
            ],
            description: 'Get a list of ordered suggestions.',
            http: {path: '/:id/suggestions'},
            returns: {arg: 'documents', type: 'Object', root: true}
        }
    );
};
