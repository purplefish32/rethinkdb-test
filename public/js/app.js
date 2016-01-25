$(document).ready(function() {
	$.get( "/api/event/get", function( events ) {

	  	$.each(JSON.parse(events), function( index, event ) {
		  	$('#event-list').prepend(makeEventRow(event));
		  	$("time.timeago").timeago();
		});

	});

    $("time.timeago").timeago();
});

var socket = io.connect();

socket.on('connect', function(message) {
    //console.log('Connected');
    $('#not-connected').hide();
    $('#connected').show();

})

/*socket.on('message', function(message) {
    console.log('The server has a message for you: ' + message);
})*/

socket.on('event', function(event) {
    $('#event-list').prepend(makeEventRow(event.new_val));
    $("time.timeago").timeago();
})

var makeEventRow = function(data) {
  return '<li class="event">' + '<h4>' + data.title +':' + data.app + ':' + data.branch + '</h4> User : ' + data.user + '<br>Date : <time class="timeago" datetime="' + data.createdAt + '">' + data.createdAt + '</time><img height="32" class="thumbnail" src="' + data.avatar + '"/></li>';
}