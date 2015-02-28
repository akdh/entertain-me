var _ = require('underscore');

module.exports = function(Response) {
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
