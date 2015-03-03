var _ = require('underscore');
var Validator = require('jsonschema').Validator;

var schema = {
    "type": "object",
    "properties": {
        "suggestions": {
            "type": "array",
            "items": {"type": "number"},
            "maxItems": 50
        }
    }
}

module.exports = function(Response) {
    Response.observe('before save', function(ctx, next) {
        if(ctx.instance && !ctx.instance.error) {
            var validator = new Validator();
            var result = validator.validate(ctx.instance.body, schema);
            if(!result.valid) {
                ctx.instance.error = result.errors;
            }
        }
        next();
    })

    Response.prototype.score = function(cb) {
        var documentIds = this.body.suggestions;
        this.request(function(err, request) {
            request.preferences({where: {personId: request.personId, documentId: {inq: documentIds}}, order: 'updated DESC'}, function(err, preferences) {
                var preferencesByDocumentId = _.groupBy(preferences, 'documentId');
                var likedDocumentIds = _.filter(documentIds, function(documentId) {
                    return preferencesByDocumentId[documentId] && preferencesByDocumentId[documentId][0] && preferencesByDocumentId[documentId][0].rating === 5;
                });
                cb(null, likedDocumentIds.length / documentIds.length);
            });
        });
    }
}
