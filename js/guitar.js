let interval_1, interval_2, scrolling

let show_chords = localStorage.getItem('show_chords') || true

// load songs
const titles = []
const songs = $('template').html().split("---\n").map(function(song) {
    song = song.replace(/\[/g, "\<span class=note\>\[")
    song = song.replace(/\]\ ?/g, "\]\ \<\/span\>")
    song = song.split("\n")
    titles.push($('<a href="#">').text(song.shift()))
    return $('<pre>').html(song.join("\n"))
})

$('nav').append(titles)

// click handlers
$('nav a').click(function(e) {
    e.preventDefault()
    localStorage.setItem('last_song', $(this).index())
    $('nav a').removeClass('active')
    $(this).addClass('active')
    $('content').html(songs[$(this).index()])
    show_chords ? $('.note').show() : $('.note').hide()
    var not_in_view = $('.active').length && ($('.active').position().top > window.innerHeight - 40 || $('.active').position().top < $('nav').scrollTop() + 40)

    if (not_in_view) {
        $('nav').scrollTop($('.active').position().top / 2)
    }
})

$('#add_song').click(function() {
    $('#add_song_modal').toggle()
})

// autoload last viewed song
$('nav a').eq(localStorage.getItem('last_song')).click()

// hotkeys
press('&').to(function() {
    if (!$('.active').length) {
        $('nav a').first().click()
    } else if ($('.active').is($('nav a').first())) {
        $('nav a').last().click()
    } else {
        $('.active').prev().click()
    }
})

press('(').to(function() {
    if (!$('.active').length) {
        $('nav a').first().click()
    } else if ($('.active').is($('nav a').last())) {
        $('nav a').first().click()
    } else {
        $('.active').next().click()
    }
})

$('#toggle_chords').click(function() {
    (show_chords = !show_chords) ? $('.note').show() : $('.note').hide()
    localStorage.setItem('show_chords', show_chords)
})

$('#toggle_theme').click(function() {
    $('*').toggleClass('high_contrast_mode')
})

$('#toggle_autoscroll').click(function() {
    $('#autoscroll').toggleClass('highlight')
    if (scrolling = !scrolling) {
        var countdown = 10
        $('#countdown').text("in " + countdown)
        interval_1 = setInterval(function() {
            if (countdown-- > 0) {
                $('#countdown').text(" " + countdown)
            } else {
                $('#countdown').text('')
                clearInterval(interval_1)
                interval_2 = setInterval(function() {
                    $(document).scrollTop($(document).scrollTop() + 1)
                }, 200)
            }

        }, 1000)
    } else {
        clearInterval(interval_1)
        clearInterval(interval_2)
        $('#countdown').text('')
    }

})
