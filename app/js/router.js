function route(handle, pathname, res) { 
	console.log("About to route a request for " + pathname);
	if (typeof handle[pathname] === 'function') { 
		return handle[pathname](res);
	} else if (pathname === '/js/lib/adapter.js') {
		console.log("No request handler found for " + pathname);
		return "404 Not found";
	} else if (pathname === '/js/main.js') {
		console.log("No request handler found for " + pathname);
		return "404 Not found";
	} else {
		return handle["audience"](res);
	}
}   

exports.route = route;
