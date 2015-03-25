var loopback = require('loopback');

module.exports = function(Service) {
    Service.disableRemoteMethod('deleteById', true);
    Service.disableRemoteMethod('__updateById__subscriptions', false);

    Service.validatesPresenceOf('username');

    Service.subscription_requests = function(serviceId, subscriptionId, cb) {
        var Response = loopback.getModel('response');
        Response.find({where: {subscriptionId: subscriptionId}, include: 'request'}, cb);
    }

    Service.remoteMethod(
        'subscription_requests',
        {
            accepts: [
                {arg: 'id', type: 'Number', required: true, description: 'User id'},
                {arg: 'fk', type: 'Number', required: true, description: 'Foreign key for subscriptions'}
            ],
            description: 'Get a list of suggestion responses for a subscription.',
            http: {path: '/:id/subscriptions/:fk/requests', verb: 'GET'},
            returns: {arg: 'responses', type: 'Object'}
        }
    );

};
