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

var request_suggestions = function(services, data, cb) {
    // TODO: Log final response
    var Request = loopback.getModel('request');

    services = _.filter(services, function(service) { return service.subscriptions().length > 0 })
    services = _.sample(services, 5)
    var subscriptions = _.map(services, function(service) { return _.sample(service.subscriptions()) })
    var person = data.person;
    var location = data.location;

    Request.create({body: data, personId: person.id, locationId: location.id}, function(err, requestInstance) {
        async.map(subscriptions, function(subscription, cb) {
            request.post(subscription.callback_url, {json: data}, function(err, response, body) {
                if(!err && response.statusCode != 200) {
                    err = "HTTP status code must be 200, it was: " + response.statusCode;
                }
                requestInstance.responses.create({'subscriptionId': subscription.id, body: body, error: err}, function(err, response) {
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

    Person.suggestions = function(personId, locationId, type, duration, group, season, cb) {
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
            } else if(!(type == null || type in ['Business', 'Holiday', 'Other'])) {
                cb("Invalid trip type: " + type, null);
            } else if(!(duration == null || duration in ['Night out', 'Day trip', 'Weekend trip', 'Longer'])) {
                cb("Invalid trip duration.", null);
            } else if(!(group == null || group in ['Alone', 'Friends', 'Family', 'Other'])) {
                cb("Invalid group type.", null);
            } else if(!(season == null || season in ['Winter', 'Summer', 'Autumn', 'Spring'])) {
                cb("Invalid trip season.", null);
            } else {
                var data = {person: results.person, location: results.location, type: type, duration: duration, group: group, season: season};
                request_suggestions(results.services, data,  cb)
            }
        })
    }

    Person.remoteMethod(
        'suggestions',
        {
            accepts: [
                {arg: 'id', type: 'Number', required: true, description: 'User id'},
                {arg: 'locationId', type: 'Number', required: true, http: {source: 'query'}},
                {arg: 'type', type: 'String', http: {source: 'query'}},
                {arg: 'duration', type: 'String', http: {source: 'query'}},
                {arg: 'group', type: 'String', http: {source: 'query'}},
                {arg: 'season', type: 'String', http: {source: 'query'}}
            ],
            description: 'Get a list of ordered suggestions.',
            http: {path: '/:id/suggestions'},
            returns: {arg: 'documents', type: 'Object', root: true}
        }
    );
};
