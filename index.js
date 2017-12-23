 'use strict';

var config = require('config');
var express = require('express');
var bodyParser = require('body-parser');

var mcServer = require('./lib/mcServer');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var port = config.get('port');

app.use(bodyParser.json());
app.use(express.static('public'));

mcServer.init();
mcServer.on('status', status => {
	io.emit('status', status);
});
mcServer.on('log', line => {
	io.emit('log', line);
});

io.on('connection', function (socket) {
	socket.on('start', (data) => {
		mcServer.start();
	});	
	socket.on('stop', (data) => {
		mcServer.stop();
	});
	socket.on('command', (data) => {
		mcServer.command(data);
	});

	io.emit('status', mcServer.status);
});

// we first need to start up the web server
server.listen(port, () => {
	console.log('App listening on port ' + port);
});

exports.app = app;
exports.server = server;
exports.io = io;
