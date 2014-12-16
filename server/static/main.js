$(function() {
    $('a[href="#"]').click(function(event) {
        event.preventDefault()
        var elem = $(event.target)
        var feedback = elem.text()
        var attraction_id = elem.parent().data('id')
        if(feedback === 'Like') {
            url = '/like/' + attraction_id + '.json'
            data = {}
        } else {
            url = '/rate/' + attraction_id + '.json'
            data = {'rating': parseInt(feedback, 10)}
        }
        $.post(url, data)
    })
})
