var http = require('http');
var fs = require('fs');

function index(res) {
	fs.readFile('index.html', function (error, data) {
		res.write(data);
		res.end();
	})
}

function hello() { 
	console.log("Request handler 'hello' was called."); 
	return "Hello Hello";
} 

exports.index = index;
exports.hello = hello;
