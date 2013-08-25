(function($) {
    var i,
        songs = [];

    window.songs = songs;

    $.ajax({
        type:'GET',
        datatype:'json',
        url:'http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=srijanshetty&api_key=6204323154c56b8ee6f70edb5616a730&limit=10&format=json',
        success : function(data) {
            getTracks(data);
        },
        complete: function(){
            console.log('Got the list of tracks');
        },
        error : function(e,d,f){
            console.log(f);
        },
    });

    function getTracks(data) {
        for (i=0; i<10; ++i) {
            console.log(data.toptracks.track[i].name);
            songs[i].artist = data.toptracks.track[i].artist && data.toptracks.track[i].artist.name;
            songs[i].name = data.toptracks.track[i].name;
        }
        console.log(songs);
    }
})(window.jQuery);

function parseFile(file, callback) {
    if (localStorage[file.name])
        return callback(JSON.parse(localStorage[file.name]));
    ID3v2.parseFile(file, function(tags) {
        //to not overflow localstorage
        localStorage[file.name] = JSON.stringify({
            Title: tags.Title,
            Artist: tags.Artist,
            Album: tags.Album,
            Genre: tags.Genre
        });
        callback(tags);
    })
}

function runSearch(query) {
    console.log(query);
    var regex = new RegExp(query.trim().replace(/\s+/g, '.*'), 'ig');
    console.log(regex);
    for (var i = $('songtable').getElementsByTagName('tr'), l = i.length; l--; ) {
        if (regex.test(i[l].innerHTML)) {
            i[l].className = 'visible'
        } else {
            i[l].className = 'hidden';
        }
    }
}

function canPlay(type) {
    var a = document.createElement('audio');
    return !!(a.canPlayType && a.canPlayType(type).replace(/no/, ''));
}

function $(id) {
    return document.getElementById(id)
}

function getSongs(files) {
    var queue = [];

    var mp3 = canPlay('audio/mpeg;'),
        ogg = canPlay('audio/ogg; codecs="vorbis"');

    for (var i = 0; i < files.length; i++) {
        var file = files[i];

        var path = file.webkitRelativePath || file.mozFullPath || file.name;
        if (path.indexOf('.AppleDouble') != -1) {
            // Meta-data folder on Apple file systems, skip
            continue;
        }
        var size = file.size || file.fileSize || 4096;
        if (size < 4095) {
            // Most probably not a real MP3
            console.log(path);
            continue;
        }

        if (file.name.indexOf('mp3') != -1) { //only does mp3 for now
            if (mp3) {
                queue.push(file);
            }
        }
        if (file.name.indexOf('ogg') != -1 || file.name.indexOf('oga') != -1) {
            if (ogg) {
                queue.push(file);
            }
        }
    }

    var process = function() {
        if (queue.length) {

            var f = queue.shift();
            parseFile(f, function(tags) {
                console.log(tags);
                var tr = document.createElement('tr');
                var t2 = guessSong(f.webkitRelativePath || f.mozFullPath || f.name);
                //it should be innerText/contentText but its annoying.
                var td = document.createElement('td');
                td.innerHTML = tags.Title || t2.Title;
                tr.appendChild(td);

                var td = document.createElement('td');
                td.innerHTML = tags.Artist || t2.Artist;
                tr.appendChild(td);

                var td = document.createElement('td');
                td.innerHTML = tags.Album || t2.Album;
                tr.appendChild(td);

                var td = document.createElement('td');
                td.innerHTML = tags.Genre || "";
                tr.appendChild(td);
                tr.onclick = function() {
                    var pl = document.createElement('tr');
                    var st = document.createElement('td');
                    st.innerHTML = tags.Title || t2.Title;
                    pl.appendChild(st);
                    $("playtable").appendChild(pl);
                    pl.file = f;
                    pl.className = 'visible';
                    pl.onclick = function(e) {
                        if (e && e.button == 1) {
                            pl.parentNode.removeChild(pl);
                        } else {
                            var url;
                            if (window.createObjectURL) {
                                url = window.createObjectURL(f)
                            } else if (window.createBlobURL) {
                                url = window.createBlobURL(f)
                            } else if (window.URL && window.URL.createObjectURL) {
                                url = window.URL.createObjectURL(f)
                            } else if (window.webkitURL && window.webkitURL.createObjectURL) {
                                url = window.webkitURL.createObjectURL(f)
                            }

                            $("player").src = url;
                            $("player").play();
                            for (var i = document.querySelectorAll('.playing'), l = i.length; l--; ) {
                                i[l].className = '';
                            }
                            pl.className += ' playing';
                            currentSong = pl;
                        }
                    }
                    if ($("playtable").childNodes.length == 1)
                        pl.onclick();
                }
                $('songtable').appendChild(tr);
                process();
            })
            var lq = queue.length;
            setTimeout(function() {
                if (queue.length == lq) {
                    process();
                }
            }, 300);
        }
    }
    process();

    if(navigator.geolocation) {
      computeSpeed();
    } else {
        document.write('<p>Your Browser does not support this feature</p>');
    }
}

var currentSong = 0,
    first = true,
    old_longitude,
    old_latitude,
    prev_regex = null;

function nextSong() {
    try {
        currentSong.nextSibling.onclick();
    } catch (e) {
        currentSong = document.querySelector("#playtable tr");
        currentSong.onclick();
    }
}

function shuffle() {
    var pt = document.getElementById('playtable');
    //fisher yates shuffle. hopefully.
    for (var i = document.querySelectorAll("#playtable tr"), l = i.length; l--; ) {
        var j = Math.floor(Math.random() * l);
        var jel = i[j], iel = i[l];
        var jref = jel.nextSibling, iref = iel.nextSibling;
        pt.insertBefore(jel, iref);
        pt.insertBefore(iel, jref);
    }
}

function empty() {
    var pt = document.getElementById('playtable');
    pt.innerHTML = '';
}

onload = function() {
    //with no dependencies, it should be fine to use this instead of ondomcontentloaded
    var a = document.createElement('audio');
    if (!a.canPlayType)
        $("support").innerHTML += "Your browser does not support HTML5 Audio<br>";
    if (!(a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, '')))
        $("support").innerHTML += "Your browser does not support Ogg Vorbis Playback<br>";
    if (!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, '')))
        $("support").innerHTML += "Your browser does not support MP3 Playback<br>";
    var f = document.createElement('input');
    f.type = 'file';
    if (!('multiple' in f))
        $("support").innerHTML += "Your browser does not support selecting multiple files<br>";
    if (!('webkitdirectory' in f))
        if (!('multiple' in f))
            $("support").innerHTML += "Your browser probably does not support selecting directories<br>";
    if (window.createObjectURL) {
    } else if (window.createBlobURL) {
    } else if (window.URL && window.URL.createObjectURL) {
    } else if (window.webkitURL && window.webkitURL.createObjectURL) {
    } else {
        $("support").innerHTML += "Your browser probably does not support Object URLs<br>";
    }
}

function computeSpeed() {
    var speed = null,
        regex;
    console.log('time');

    navigator.geolocation.getCurrentPosition(function (position) {
        if(!first) {
            dis = calculateDistance(position.coords.latitude, position.coords.longitude, old_latitude, old_longitude);
            speed = dis*1000/5;
            $('log').innerHTML += '<br/>' + speed;
            if (speed <= 2 && speed >= 0) {
                regex = /alternative/gi;
            } else if (speed > 2 ) {
                regex = /rock/gi;
            }

            playList(regex, regexSame(prev_regex, regex));
            prev_regex = regex;
        } else {
            first = false;
        }
        old_longitude = position.coords.longitude;
        old_latitude = position.coords.latitude;
    });
    setTimeout(computeSpeed, 5000);
}

// Compute the distance on the basis of coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = (lat2 - lat1).toRad();
    var dLon = (lon2 - lon1).toRad();
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

Number.prototype.toRad = function() {
    return this * Math.PI / 180;
}

function playList(regex, dontChange) {
    // If there is no change in speed
    if (dontChange){
       return;
    }

    empty();
    // Add all songs to now playing
    for (var i = $('songtable').getElementsByTagName('tr'), l = i.length; l--; ) {
        if (regex.test(i[l].innerHTML)) {
            console.log(i[l]);
            i[l].onclick();
        }
    }
}

// Checking the equality of regexs
function regexSame(r1, r2) {
    if (r1 instanceof RegExp && r2 instanceof RegExp) {
        var props = ["global", "multiline", "ignoreCase", "source"];
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            if (r1[prop] !== r2[prop]) {
                return(false);
            }
        }
        return(true);
    }
    return(false);
}
