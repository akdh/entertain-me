var server = require('./server');
var ds = server.dataSources.db;
var lbTables = ['User', 'AccessToken', 'ACL', 'RoleMapping', 'Role', 'document', 'person', 'preference', 'subscription', 'location', 'service', 'request', 'response']
ds.automigrate(lbTables, function(err) {
    if(err) throw err;
    console.log('Created.');
    ds.disconnect();
})
