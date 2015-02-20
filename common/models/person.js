var _ = require('underscore');
var http = require('http');
var https = require('https');
var url = require('url');
var loopback = require('loopback');
var app = loopback();

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

module.exports = function(Person) {
    Person.suggestions = function(personId, locationId, cb) {
        var Service = loopback.getModel('service');
        var Document = loopback.getModel('document');

        Service.find({'include': 'subscriptions'}, function(err, services) {
            // TODO: Limit the number of requests that are sent
            // TODO: Add a time limit to how long services can take to respond
            // TODO: Log the responses from each service
            // TODO: Combine responses intelligently, log final response

            services = _.filter(services, function(service) { return service.subscriptions().length > 0 })
            var urls = _.map(services, function(service) { return _.sample(service.subscriptions()).callback_url })
            var responses = [];
            var data = {'personId': personId, 'locationId': locationId};
            _.each(urls, function(url) {
                post(url, data, function(err, body) {
                    responses.push(body)
                    if(responses.length === urls.length) {
                        // Return response
                    }
                })
            })
            if(urls.length === 0) {
                // Return response
            }

            var documentIds = [7, 1, 4, 14, 66, 9];
            Document.find({'where': {'id': {'inq': documentIds}}}, function(err, documents) {
                documentsById = _.indexBy(documents, 'id')
                documents = _.map(documentIds, function(documentId) { return documentsById[documentId] })
                cb(null, documents)
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
