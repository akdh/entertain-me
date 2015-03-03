var http = require('http');
var https = require('https');
var url = require('url');

module.exports = {
    post: function(urlStr, options, callback) {
        var postStr = JSON.stringify(options.json);
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
            res.on('error', function(err) {
                callback(err, res, null);
            });
            res.on('end', function() {
                try {
                    var obj = JSON.parse(body);
                    callback(null, res, obj);
                } catch(err) {
                    callback(err, res, null);
                }
            });
        });

        req.on('error', function(err) {
            callback(err, null, null);
        });

        req.write(postStr);
        req.end();
    }
}
