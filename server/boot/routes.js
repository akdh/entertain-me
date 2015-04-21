var loopback = require('loopback');
var bodyParser = require('body-parser');
var _ = require('underscore');

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
                res.render('login', {layout: 'base', error: err});
            } else {
                res.redirect('/client/locations.html?access_token=' + token.id)
            }
        })
    });

    app.get('/client/register.html', function(req, res) {
        res.render('register', {layout: 'base'});
    });
    app.post('/client/register.html', function(req, res) {
        console.log({
            email: req.body.emailInput,
            password: req.body.passwordInput
        })
        Person.create({
            email: req.body.emailInput,
            password: req.body.passwordInput
        }, function(err, token) {
            if(err) {
                res.render('register', {layout: 'base', error: err});
            } else {
                res.redirect('/client/locations.html?access_token=' + token.id)
            }
        })
    });

    app.get('/client/suggestions.html', function(req, res) {
        AccessToken.findForRequest(req, {}, function(err, accessToken) {
            if(accessToken == undefined) {
                return res.redirect('/client/login.html');
           } else {
            Person.findById(accessToken.userId, function(err, person) {
                person.preferences(function(err, preferences) {
                    console.log(person, err, preferences)
                    preferences = _.indexBy(preferences, 'documentId');
                    Person.suggestions(accessToken.userId, req.query.locationId, function(err, suggestions) {
                        _.each(suggestions.documents, function(document, i) { suggestions.documents[i].preference = preferences[document.id] } )
                        res.render('suggestions', {layout: 'base', suggestions: suggestions, person: person, accessToken: accessToken.id});
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
                    res.render('locations', {layout: 'base', locations: locations, accessToken: accessToken.id});
                })
           }
        });
    });
}
