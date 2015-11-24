var http = require('http');
var fs = require('fs');

function index(res) {
  res.writeHead(200, {"Content-Type": "text/html"});
	var htmlFile = fs.readFileSync("view/index.html");
	res.write(htmlFile);
  res.end();
}

function audience(res) { 
  res.writeHead(200, {"Content-Type": "text/html"});
	var htmlFile = fs.readFileSync("view/audienceView.html");
	res.write(htmlFile);
  res.end();
} 

exports.index = index;
exports.audience = audience;
