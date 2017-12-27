²²²²²²²²²²²²² 'use strict';

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

		this.status = { state: 'idle', players: [] };
		this.scriptServer = new ScriptServer({
			core: {
				jar: mcJar,
				args: mcArgs
			},
			spawnOpts: { cwd: mcPath }
		});

		this.scriptServer.on('console', line => {
			//this.emit('log', line);
			// done loading output

			//[17:44:54] [Server thread/INFO]: Done (12.160s)! For help, type "help" or "?"
			let result = line.match(/^\[.+\]: Done \(\d+\.\d+s\)! For help, type "help" or "\?"$/);
			if (result) {
				this.status.players = []; // clear player list on startup
				this.updateState('running');

				// not sure if this connect is needed
				if (this.scriptServer.rcon.state != 'connected') {
					console.log('reconnecting rcon');
					this.emit('log', 'reconnecting rcon');
					this.scriptServer.rcon.connect(); // make sure the rcon reconnects
				}
			}

			//[17:47:08] [Server thread/INFO]: depuits joined the game
			result = line.match(/^\[.+\]: (.+) joined the game$/);
			if (result) {
				let plyr = result[1];
				// should we check if the player was already added?
				this.status.players.push({ name: plyr, date: new Date() });
				this.emit('status', this.status);
			}
			//[17:48:38] [Server thread/INFO]: depuits left the game
			result = line.match(/^\[.+\]: (.+) left the game$/);
			if (result) {
				let plyr = result[1];
				for (let i = this.status.players.length; i >= 0; --i) {
					if (this.status.player[i].name === plyr) {
						this.status.players.splice(i, 1); // remove the player if found
					}
				}
				this.emit('status', this.status);
			}

			//[14:55:26] [Server thread/INFO]: Stopping server
			result = line.match(/^\[.+\]: Stopping server$/);
			if (result) {
				this.status.players = []; // clear player list on shutdown
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
		this.status.players = []; // clear player list on startup
	},
	stop: function stop() {
		this.command({ cmd: 'stop' });
	},
	command: function command(data) {
		console.log('sending cmd: ' + data.cmd);
		this.emit('log', 'cmd: ' + data.cmd);
		this.scriptServer.send(data.cmd);
	},

	updateState: function(state) {
		this.status.state = state;
		this.emit('status', this.status);
		this.emit('log', state);
	}
});

module.exports = mcs;
