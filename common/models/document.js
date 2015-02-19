module.exports = function(Document) {
    Document.disableRemoteMethod('create', true);
    Document.disableRemoteMethod('upsert', true);
    Document.disableRemoteMethod('findOne', true);
    Document.disableRemoteMethod('deleteById', true);
    Document.disableRemoteMethod('updateAll', true);
    Document.disableRemoteMethod('updateAttributes', false);
};
