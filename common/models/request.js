module.exports = function(Request) {
    Request.observe('before save', function(ctx, next) {
        if(ctx.instance) {
            ctx.instance.updated = new Date();
        } else {
            ctx.data.updated = new Date();
        }
        next();
    });
};
