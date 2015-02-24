var async = require('async');

var create_update = function(Model, instance, cb) {
    instance.parentId = instance.id;
    instance.id = undefined;
    Model.create(instance, function(err, instance) {
        cb(err);
    });
}

module.exports = function(Preference) {
    Preference.observe('before save', function(ctx, next) {
        if(ctx.instance) {
            var oldInstance = JSON.parse(JSON.stringify(ctx.instance));
            if(!ctx.instance.parentId) {
                ctx.instance.updated = new Date();
            }
            if(ctx.instance.isNewRecord()) {
                next();
            } else {
                create_update(Preference, oldInstance, next);
            }
        } else {
            ctx.data.updated = new Date();

            Preference.find({where: ctx.where}, function(err, instances) {
                async.each(instances, function(instance, cb) {
                    instance = JSON.parse(JSON.stringify(instance));
                    create_update(Preference, instance, cb)
                }, function(err) {
                    next(err);
                });
            })
        }
    })
};
