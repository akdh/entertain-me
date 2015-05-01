var loopback = require('loopback');
var bodyParser = require('body-parser');
var _ = require('underscore');
var valid_tags = require('../valid-tags.json').tags;

module.exports = function(app) {
    var Person = app.models.Person;
    var Location = app.models.Location;
    var AccessToken = app.models.AccessToken;

    app.use(bodyParser.urlencoded({extended: false}));

    app.set('view engine', 'hbs');

    app.get('/client/logout.html', function(req, res) {
        AccessToken.findForRequest(req, {}, function(err, accessToken) {
            if(accessToken == undefined) {
                return res.redirect('/client/login.html');
           } else {
            Person.logout(accessToken.id, function(err) {
                res.redirect('/client/login.html');
            });
           }
        });
    });

    app.get('/client/login.html', function(req, res) {
        res.render('login', {layout: 'base'});
    });
    app.post('/client/login.html', function(req, res) {
        Person.login({
            email: req.body.emailInput,
            password: req.body.passwordInput
        }, function(err, token) {
            if(err) {
                res.render('login', {layout: 'base', tags: JSON.stringify(valid_tags), error: err});
            } else {
                res.redirect('/client/locations.html?access_token=' + token.id)
            }
        })
    });

    app.get('/client/register.html', function(req, res) {
        res.render('register', {layout: 'base', tags: JSON.stringify(valid_tags)});
    });
    app.post('/client/register.html', function(req, res) {
        Person.create({
            email: req.body.emailInput,
            password: req.body.passwordInput
        }, function(err, token) {
            if(err) {
                res.render('register', {layout: 'base', tags: JSON.stringify(valid_tags), error: err});
            } else {
                res.redirect('/client/locations.html?access_token=' + token.id)
            }
        })
    });

    app.get('/client/person.html', function(req, res) {
        AccessToken.findForRequest(req, {}, function(err, accessToken) {
            if(accessToken == undefined) {
                return res.redirect('/client/login.html');
           } else {
                res.render('person', {layout: 'base', tags: JSON.stringify(valid_tags), accessToken: accessToken.id});
           }
        });

    });
    app.post('/client/person.html', function(req, res) {
        AccessToken.findForRequest(req, {}, function(err, accessToken) {
            if(accessToken == undefined) {
                return res.redirect('/client/login.html');
            } else {
                Person.findById(accessToken.userId, function(err, person) {
                    person.updateAttributes({gender: req.body.gender, age: req.body.age}, function(err, person) {
                        if(err) {
                            return res.send(err);
                        }
                        res.render('person', {layout: 'base', tags: JSON.stringify(valid_tags), accessToken: accessToken.id});
                    })
                });
            }
        });
    });

    app.get('/client/suggestions.html', function(req, res) {
        AccessToken.findForRequest(req, {}, function(err, accessToken) {
            if(accessToken == undefined) {
                return res.redirect('/client/login.html');
           } else {
            Person.findById(accessToken.userId, function(err, person) {
                person.preferences(function(err, preferences) {
                    preferences = _.indexBy(preferences, 'documentId');
                    Person.suggestions(accessToken.userId, req.query.locationId, req.query.type || null, req.query.duration || null, req.query.group || null, req.query.season || null, function(err, suggestions) {
                        if(err) {
                            return res.send(err);
                        }
                        _.each(suggestions.documents, function(document, i) { suggestions.documents[i].preference = preferences[document.id] } )
                        res.render('suggestions', {layout: 'base', tags: JSON.stringify(valid_tags), raw_tags: valid_tags, suggestions: suggestions, person: person, accessToken: accessToken.id});
                    });
                })
            })
           }
        });
    });

    app.get('/client/locations.html', function(req, res) {
        AccessToken.findForRequest(req, {}, function(err, accessToken) {
            if(accessToken == undefined) {
                return res.redirect('/client/login.html');
           } else {
                Location.find(function(err, locations) {
                    res.render('locations', {layout: 'base', tags: JSON.stringify(valid_tags), locations: locations, accessToken: accessToken.id});
                })
           }
        });
    });
}
