module.exports = function(Location) {
    Location.disableRemoteMethod('create', true);
    Location.disableRemoteMethod('upsert', true);
    Location.disableRemoteMethod('findOne', true);
    Location.disableRemoteMethod('deleteById', true);
    Location.disableRemoteMethod('updateAll', true);
    Location.disableRemoteMethod('updateAttributes', false);
};
