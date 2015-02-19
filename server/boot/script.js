var _ = require('underscore');
var http = require('http');
var https = require('https');
var url = require('url');

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

module.exports = function(app) {
    var Service = app.models.service;

    app.post('/suggestions', function(req, res) {
        if(!('personId' in req.query)) {
            res.status(400).send('personId missing.');
            return;
        }
        if(!('locationId' in req.query)) {
            res.status(400).send('locationId missing.');
            return;
        }

        Service.find({'include': 'subscriptions'}, function(err, services) {
            // TODO: Limit the number of requests that are sent
            // TODO: Add a time limit to how long services can take to respond
            // TODO: Log the responses from each service
            // TODO: Combine responses intelligently, log final response

            services = _.filter(services, function(service) { return service.subscriptions().length > 0 })
            var urls = _.map(services, function(service) { return _.sample(service.subscriptions()).callback_url })
            var responses = [];
            var data = {'personId': req.query.personId, 'locationId': req.query.locationId};
            post(urls[0], data, function(err, body) {
                responses.push(body)
                if(responses.length === urls.length) {
                    res.json(responses)
                }
            })
        })
    })
}
