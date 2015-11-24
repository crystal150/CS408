var static = require('node-static');
var http = require('http');
var url = require('url');
var file = new(static.Server)();

function start(route, handle) { 
	function onRequest(req, res) { 
		file.serve(req, res);
		var pathname = url.parse(req.url).pathname;
		console.log("Request for " + pathname + " received.");
		route(handle, pathname, res);
	}
	var app = http.createServer(onRequest).listen(2013); 
	console.log("Server has started.");

	var io = require('socket.io').listen(app);
	io.sockets.on('connection', function (socket){

		function log(){
			var array = [">>> "];
			for (var i = 0; i < arguments.length; i++) {
				array.push(arguments[i]);
			}
				socket.emit('log', array);
		}

		socket.on('message', function (message) {
			log('Got message: ', message);
			socket.broadcast.emit('message', message); // should be room only
		});

		socket.on('grant', function (numClient) {
			log('Grant: ', numClient);
			socket.broadcast.emit('grant', numClient);
		});

		socket.on('create or join', function (room) {
			var numClients = io.sockets.clients(room).length;

			log('Room ' + room + ' has ' + numClients + ' client(s)');
			log('Request to create or join room', room);

			if (numClients == 0){
				socket.join(room);
				socket.emit('created', room);
			} else if (numClients < 10) {
				io.sockets.in(room).emit('join', room, numClients);
				socket.join(room);
				socket.emit('joined', room, numClients);
			} else { // max ten clients
				socket.emit('full', room);
			}
			socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
			socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

		});
	});


} 
 
exports.start = start;
