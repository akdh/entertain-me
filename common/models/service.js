module.exports = function(Service) {
    Service.disableRemoteMethod('deleteById', true);
    Service.disableRemoteMethod('__updateById__subscriptions', false);
};
