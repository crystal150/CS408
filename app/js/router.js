var server = require("./server.js");



function route(handle, pathname, res) { 
	console.log("About to route a request for " + pathname);
	if (typeof handle[pathname] === 'function') { 
		return handle[pathname](res);
	} else if (pathname in server.urls) {
		if (server.urls[pathname]){
			server.urls[pathname] = false;
			return handle["presenter"](res);
		}
		return handle["audience"](res);
	} else {
		console.log("No request handler found for " + pathname);
		return "404 Not found";
		//return handle["audience"](res);
	}
}   

exports.route = route;
