/*
 * Copyright (C) 2014 Johannes Donath <johannesd@evil-co.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// dependencies
var irc = require ('irc');

/**
 * Manages all IRC interactions.
 * @param config The configuration file.
 * @constructor
 */
var IRCManager = function (config) {
	"use strict";

	/**
	 * Constructor
	 * @param config The configuration.
	 */
	this.initialize = function (config) {
		this.configuration = config;

		// connect
		this.connect ();
	};

	/**
	 * Connects to the IRC server.
	 */
	this.connect = function () {
		// log
		console.log ("Connecting to " + this.configuration.server.address + " on port " + (this.configuration.server.secure ? "+" : "") + this.configuration.server.port + ".");
		console.log ("Nickname to be used: " + this.configuration.nickname);
		console.log ("Channels to be joined: " + this.configuration.channel);
		console.log ("NickServ authentication is " + (this.configuration.nickserv.enabled ? "ENABLED" : "DISABLED") + ".");

		// create client instance
		this.irc = new irc.Client (this.configuration.server.address, this.configuration.nickname, {
			userName:		this.configuration.username,
			realName:		this.configuration.realname,
			port:			this.configuration.server.port,
			channels:		[this.configuration.channel],
			secure:			this.configuration.server.secure,
			selfSigned:		this.configuration.server.acceptSelfSigned,
			certExpired:		this.configuration.server.acceptExpired,

			autoConnect:		false
		});

		// hook events
		this.hookEvents ();

		// connect
		this.irc.connect (5, this.proxy (this.connected, this));
	};

	/**
	 * Callback for established connections.
	 */
	this.connected = function () {
		// set modes
		if (!!this.configuration.server.userModes) this.irc.send ("MODE", this.configuration.nickname, this.configuration.server.userModes);

		// authenticate with NickServ
		if (this.configuration.nickserv.enabled) {
			// execute command
			if (!!this.configuration.nickserv.command) {
				// build arguments
				var args = [this.configuration.nickserv.command];
				if (this.configuration.nickserv.username != null) args.push (this.configuration.nickserv.password);
				args.push (this.configuration.nickserv.password);

				// send message
				this.irc.send.apply (this.irc, args);
			} else
				// use message
				this.irc.say ('NickServ', "IDENTIFY " + (!!this.configuration.nickserv.username ? this.configuration.nickserv.username + " " : "") + this.configuration.nickserv.password);
		}
	};

	/**
	 * Hooks all IRC client events.
	 */
	this.hookEvents = function () {

	};

	/**
	 * Creates a simple function proxy.
	 * @param func The function to execute.
	 * @param context The context to execute in.
	 * @returns {Function}
	 */
	this.proxy = function (func, context) {
		return function () {
			func.apply (context, arguments);
		}
	};

	/**
	 * Sends a message to the channel.
	 * @param message The message.
	 */
	this.sendMessage = function (message) {
		this.irc.say (this.configuration.channel, message);
	};

	// Constructor
	this.initialize (config);
};

module.exports = IRCManager;