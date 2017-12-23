 'use strict';

var path = require('path');
var config = require('config');
var ScriptServer = require('scriptserver');
var eventEmitter = require('events').EventEmitter;

var mcs = Object.create(new eventEmitter()); 
Object.assign(mcs, {
	init: function () {
		var mcJar = config.get('mcJar');
		var mcArgs = config.get('mcArgs');
		var mcPath = path.dirname(mcJar);

		this.status = { state: 'idle' };
		this.scriptServer = new ScriptServer({
			core: {
				jar: mcJar,
				args: mcArgs
			},
			spawnOpts: { cwd: mcPath }
		});

		this.scriptServer.on('console', line => {
			//mcs.emit('log', line);
			// done loading output

			//[17:44:54] [Server thread/INFO]: Done (12.160s)! For help, type "help" or "?"
			var result = line.match(/^\[.+\]: Done \(\d+\.\d+s\)! For help, type "help" or "\?"$/);
			if (result) {
				this.updateState('running');
			}

			//[17:47:08] [Server thread/INFO]: depuits joined the game
			//[17:48:38] [Server thread/INFO]: depuits left the game


			//[14:55:26] [Server thread/INFO]: Stopping server
			result = line.match(/^\[.+\]: Stopping server$/);
			if (result) {
				this.updateState('stopping');
 				
 				//wait a few second for finishing up
 				setTimeout(() => { 
					this.scriptServer.stop();
					this.status.startTime = undefined;
					this.updateState('idle');
				}, 5000);
			}
		});
	},

	start: function start() {
		this.scriptServer.start();

		this.status.startTime = new Date();
		this.updateState('starting');
	},
	stop: function stop() {
		this.command({ cmd: 'stop' });
	},
	command: function command(data) {
		console.log('sending cmd: ' + data.cmd);
		this.scriptServer.send(data.cmd);
	},

	updateState: function(state) {
		this.status.state = state;
		this.emit('status', this.status);
		this.emit('log', state);
	}
});

module.exports = mcs;
