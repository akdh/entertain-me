var request = require('request');
var loopback = require('loopback');
var async = require('async');

module.exports = function(Subscription) {
    Subscription.observe('before delete', function(ctx, next) {
        Subscription.updateAll(ctx.where, {deleted: new Date()}, function(err, count) {
            ctx.where['deleted'] = null;
            next(err);
        })
    })

    Subscription.observe('before save', function(ctx, next) {
        var Person = loopback.getModel('person');
        var Location = loopback.getModel('location');

        if(ctx.instance) {
            var url = ctx.instance.callback_url;
        } else {
            var url = ctx.data.callback_url;
        }
        async.parallel({
            person: function(cb) {
                Person.findOne({include: {relation: 'preferences', scope: {fields: ['rating', 'documentId']}}, fields: {id: true}}, cb);
            },
            location: function(cb) {
                Location.findOne(cb);
            }
        }, function(err, results) {
            if(err) {
                cb(err, null);
            } else if(results.person === null) {
                cb("Invalid personId.", null);
            } else if(results.location === null) {
                cb("Invalide locationId.", null);
            } else {
                var data = {person: results.person, location: results.location};
                request.post(url, {json: data}, function(err, response, body) {
                    if(err) {
                        next(err);
                    }
                    if(response.statusCode != 200) {
                        next("HTTP status code must be 200, it was: " + response.statusCode);
                    }
                    next();
                });
            }
        })
    });
};
