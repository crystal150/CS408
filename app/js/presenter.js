var socket = io.connect();

$(document).ready(function(){
    $("#produce").click(function(){
        $(this).addClass("disabled");
				socket.emit('generate');
    });
});

socket.on('move', function(address){
  location.href = location.href + address;
});
