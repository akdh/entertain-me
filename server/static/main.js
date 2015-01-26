$(function() {
    $('li a').click(function(event) {
        event.preventDefault()
        var elem = $(event.target)
        var feedback = elem.text()
        var attraction_id = parseInt(elem.parent().data('id'), 10)
        var user_id = elem.parent().data('user')
        data = {}
        if(feedback === 'Like') {
            data['like'] = true
        } else if($.inArray(feedback, ['1', '2', '3', '4', '5']) !== -1) {
            data['rating'] = parseInt(feedback, 10)
        } else {
            data['read'] = true
        }
        $.ajax({
            type: 'POST',
            url: '/profile/' + user_id + '/' + attraction_id,
            data: JSON.stringify(data),
            success: function() {
                if(data['read'] === true) {
                    window.location.href = elem.attr('href')
                }
            },
            dataType: 'json',
            contentType: 'application/json'
        })
    })
})
