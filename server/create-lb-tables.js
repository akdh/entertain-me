var server = require('./server');
var ds = server.dataSources.db;
ds.automigrate(function(err) {
    if(err) throw err;
    ds.connector.query('CREATE UNIQUE INDEX documentId_personId_idx ON preference (documentId, personId) WHERE parentId IS NULL');
    console.log('Created.');
    ds.disconnect();
})
