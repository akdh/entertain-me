var _ = require('underscore');
var http = require('http');
var https = require('https');
var url = require('url');
var loopback = require('loopback');
var Validator = require('jsonschema').Validator;
var async = require('async');

var post = function(urlStr, data, callback) {
    var postStr = JSON.stringify(data);
    var options = url.parse(urlStr);

    var request = http.request;
    if(options.protocol === 'https:') {
        request = https.request;
    }

    options['method'] = 'POST';
    options['headers'] = {
        'Content-Type': 'application/json',
        'Content-Length': postStr.length
    };

    var req = request(options, function(res) {
        var body = '';
        res.on('data', function(chunk) {
            body += chunk;
        });
        res.on('end', function() {
            try {
                var obj = JSON.parse(body);
                callback(null, obj);
            } catch(err) {
                callback(err, null)
            }
        })
    })

    req.write(postStr);
    req.end();
}

var schema = {
    "type": "object",
    "properties": {
        "suggestions": {
            "type": "array",
            "items": {"type": "number"},
            "maxItems": 50
        }
    }
}

var is_valid_response = function(response) {
    var validator = new Validator();
    var result = validator.validate(response, schema);
    return result.valid;
}

var return_response = function(responses, cb) {
    responses = _.filter(responses, is_valid_response);
    responses = _.map(responses, function(response) { return response['suggestions'] });
    var documentIds = _.without(_.flatten(_.zip.apply(_, responses)), undefined);
    if(documentIds.length === 0) {
        documentIds = [7, 1, 4, 14, 66, 9];
    }

    var Document = loopback.getModel('document');
    Document.find({'where': {'id': {'inq': documentIds}}}, function(err, documents) {
        documentsById = _.indexBy(documents, 'id');
        documents = _.map(documentIds, function(documentId) { return documentsById[documentId] });
        cb(null, documents);
    });
}

var request_suggestions = function(services, person, location, cb) {
    // TODO: Limit the number of requests that are sent
    // TODO: Log final response
    var Request = loopback.getModel('request');
    var Response = loopback.getModel('response');

    services = _.filter(services, function(service) { return service.subscriptions().length > 0 })
    var subscriptions = _.map(services, function(service) { return _.sample(service.subscriptions()) })
    var responses = [];
    var data = {'person': person, 'location': location};
    var responded = false;

    Request.create({body: data, personId: person.id, locationId: location.id}, function(err, request) {
        _.each(subscriptions, function(subscription) {
            Response.create({'requestId': request.id, 'subscriptionId': subscription.id}, function(err, response) {
                post(subscription.callback_url, data, function(err, body) {
                    response.updateAttribute('body', body, function(err, response) {
                        responses.push(body)
                        if(!responded && responses.length === subscriptions.length) {
                            responded = true;
                            return_response(responses, cb);
                        }
                    })
                })
            })
        })
        if(!responded && subscriptions.length === 0) {
            responded = true;
            return_response(responses, cb);
        }

        setTimeout(function() {
            if(!responded) {
                responded = true;
                return_response(responses, cb);
            }
        }, 1000);
    })
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
            'accepts': [
                {'arg': 'personId', 'type': 'Number', 'required': true, 'http': { 'source': 'query' } },
                {'arg': 'locationId', 'type': 'Number', 'required': true, 'http': { 'source': 'query' } }
            ],
            'returns': {'arg': 'documents', 'type': 'Array'}
        }
    );
};
