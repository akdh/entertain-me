module.exports = function(Subscription) {
    Subscription.observe('before delete', function(ctx, next) {
        Subscription.updateAll(ctx.where, {deleted: new Date()}, function(err, count) {
            ctx.where['deleted'] = null;
            next(err);
        })
    })
};
