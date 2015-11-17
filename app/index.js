// index.js 
var server = require("./js/server.js"); 
var router = require("./js/router.js"); 
var requestHandlers = require("./js/requestHandlers.js"); 

var handle = {}
handle["/"] = requestHandlers.index;
handle["/hello"] = requestHandlers.hello;   
server.start(router.route, handle);
