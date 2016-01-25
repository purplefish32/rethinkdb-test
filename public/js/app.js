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
    //console.log('There is a new event : ' + event);
    //console.log(event);
    //console.log(event.new_val);
    document.getElementById('event-list').innerHTML += makeEventRow(event.new_val);
})

var makeEventRow = function(data) {
  return '<div class="message alert alert-info">' + '<h4>' + data.title + '</h4> User : ' + data.user + '<br>Date : ' + data.createdAt + '</div>';
}