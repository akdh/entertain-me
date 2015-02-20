module.exports = function(Preference) {
    Preference.observe('before save', function(ctx, next) {
        var instance = ctx.instance || ctx.data
        var where = {
            'documentId': instance.documentId,
            'personId': instance.personId
        }
        if(instance.id) {
            where['id'] = {'neq': instance.id}
        }
        Preference.count(where, function(err, count) {
            if(err || count != 0) {
                next(new Error('Preference with documentId and personId already exists.'))
            } else {
                next()
            }
        })
    })
};
