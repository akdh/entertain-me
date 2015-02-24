var _ = require('underscore');
var http = require('http');
var https = require('https');
var url = require('url');
var loopback = require('loopback');
var app = loopback();
var Validator = require('jsonschema').Validator;

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
    // TODO: Log the responses from each service
    // TODO: Log final response

    services = _.filter(services, function(service) { return service.subscriptions().length > 0 })
    var urls = _.map(services, function(service) { return _.sample(service.subscriptions()).callback_url })
    var responses = [];
    var data = {'person': person, 'location': location};
    var responded = false;
    _.each(urls, function(url) {
        post(url, data, function(err, body) {
            responses.push(body)
            if(!responded && responses.length === urls.length) {
                responded = true;
                return_response(responses, cb);
            }
        })
    })
    if(!responded && urls.length === 0) {
        responded = true;
        return_response(responses, cb);
    }

    setTimeout(function() {
        if(!responded) {
            responded = true;
            return_response(responses, cb);
        }
    }, 1000);
}

module.exports = function(Person) {
    Person.disableRemoteMethod('deleteById', true);
    Person.disableRemoteMethod('__delete__preferences', false);
    Person.disableRemoteMethod('__destroyById__preferences', false);

    Person.suggestions = function(personId, locationId, cb) {
        var Service = loopback.getModel('service');
        var Location = loopback.getModel('location');

        Person.findOne({where: {id: personId}, include: {relation: 'preferences', scope: {fields: ['rating', 'documentId']}}, fields: {id: true}}, function(err, person) {
            if(err) {
                cb(err, null);
                return;
            }
            if(person === null) {
                cb("Invalid personId.", null);
                return;
            }
            Location.findById(locationId, function(err, location) {
                if(err) {
                    cb(err, null);
                    return;
                }
                if(location === null) {
                    cb("Invalide locationId.", null);
                    return;
                }
                Service.find({'include': 'subscriptions'}, function(err, services) {
                    if(err) {
                        cb(err, null);
                        return;
                    }
                    request_suggestions(services, person, location, cb);
                })
            })
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
