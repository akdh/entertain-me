var loopback = require('loopback');
var boot = require('loopback-boot');
var User = require('loopback-boot');

var app = module.exports = loopback();

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname);

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    console.log('Web server listening at: %s', app.get('url'));
  });
};

var User = app.models.User;

// start the server if `$ node server.js`
if (require.main === module) {
  app.start();
}
