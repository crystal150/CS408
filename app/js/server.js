var static = require('node-static');
var http = require('http');
var url = require('url');
var file = new(static.Server)();
var urls = {};
var populations = {};


function start(route, handle) { 
	function onRequest(req, res) { 
		file.serve(req, res);
		var pathname = url.parse(req.url).pathname;
		console.log("Request for " + pathname + " received.");
		route(handle, pathname, res);
	}
	var app = http.createServer(onRequest).listen(2014); 
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

		socket.on('generate', function () {
//			do {
			new_url = Math.floor(Math.random() * 1000000);
	//		} while(("/" + new_url) in urls)
			urls["/" + new_url] = true;
			populations[new_url] = -1;
			log('Generate URL: ', new_url);
			socket.emit('move', new_url);
		});

		socket.on('message', function (room, message, numClient) {
			log('Got message: ', message, numClient);
			io.sockets.in(room).emit('message', message, numClient); // should be room only
		});

		socket.on('grant', function (room, numClient) {
			log('Grant: ', numClient);
			io.sockets.in(room).emit('grant', numClient);
		});

		socket.on('create or join', function (room, name, comment) {
			var numClients = io.sockets.clients(room).length;
			populations[room] += 1;

			log('Room ' + room + ' has ' + numClients + ' client(s)');
			log('Request to create or join room', room);

			if (numClients == 0){
				socket.join(room);
				socket.emit('created', room);
			} else if (numClients < 10) {
				io.sockets.in(room).emit('join', room, populations[room], name, comment);
				socket.join(room);
				socket.emit('joined', room, populations[room]);
			} else { // max ten clients
				socket.emit('full', room);
			}
			socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
			socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

		});
	});


} 
 
exports.start = start;
exports.urls = urls;
