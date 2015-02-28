var should = require('chai').should();
var app = require('../server/server.js');
var loopback = require('loopback');
var Request = app.models.Request;
var Response = app.models.Response;
var Person = app.models.Person;
var async = require('async');

describe('Response', function() {
    describe('#score', function() {
        it('should be 0.2 if one item is rated 5', function(done) {
            Person.findOrCreate({email: 'test@example.com'}, {email: 'test@example.com', password: 'password'}, function(err, person) {
                person.preferences.destroyAll(function(err) {
                    Request.create({personId: person.id, locationId: 1}, function(err, request) {
                        var body = {suggestions: [1, 2, 3, 4, 5]};
                        Response.create({body: body, requestId: request.id, subscriptionId: 1}, function(err, response) {
                            person.preferences.create({documentId: 1, requestId: request.id, rating: 5}, function(err, preference) {
                                response.score(function(err, score) {
                                    score.should.equal(0.2);
                                    done();
                                });
                            });
                        });
                    });
                })
            });
        });
    });
});
