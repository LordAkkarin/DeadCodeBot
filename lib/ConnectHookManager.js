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
var fs = require ("fs");
var irc = require ("irc");
var jws = require ("jws");
var util = require ("util");

/**
 * Handles Atlassian Conect requests.
 * @param express The express instance.
 * @param irc The IRC manager.
 * @param config The configuration.
 * @constructor
 */
var ConnectHookManager = function (express, ircManager, config) {
	"use strict";

	/**
	 * Initializes the instance.
	 * @param express The express instance.
	 * @param irc The IRC instance.
	 * @param config The configuration.
	 */
	this.initialize = function (express, irc, config) {
		this.express = express;
		this.irc = irc;
		this.configuration = config;
		this.connectSecret = null;

		// load connect secret
		if (fs.existsSync (__dirname + "/../connect-secret")) this.connectSecret = fs.readFileSync (__dirname + "/../connect-secret");

		// hook events
		this.hookExpress ();
		this.hookEvents ();
	};

	/**
	 * Returns the JIRA installation URL.
	 * @param restURL The rest URL.
	 * @returns string
	 */
	this.getJiraUrl = function (restURL) {
		return restURL.replace (/^(.*)\/rest\/api(.*)$/i, "$1");
	}

	/**
	 * Handles JIRA installation.
	 * @param request The request.
	 * @param response The response.
	 */
	this.handleInstallation = function (request, response) {
		// cancel if connect is disabled
		if (!this.configuration.atlassianConnect.enabled) {
			// log
			console.log (request.ip + " has requested an Atlassian Connect installation. However Connect is currently disabled. Please enable it before trying to install the integration.");

			// respond
			response.status (404);
			response.send ();
			return;
		}

		// check configuration state
		fs.exists (__dirname + "/../connect-secret", this.proxy (function (exists) {
			// check whether setup has already been finished
			if (exists) {
				// log
				console.log ("Received an Atlassian Connect installation request from " + request.ip + ". However the system is locked as an application token already exists.");

				// respond
				response.status (400);
				response.send ();
				return;
			}

			// de-serialize data
			var data = JSON.parse (request.body);

			// store secret
			this.connectSecret = data.sharedSecret;
			fs.writeFile (__dirname + "/../connect-secret", this.connectSecret, function (error) {
				if (error) console.log ("Could not write connect token: " + error);
			});

			// log
			console.log ("Successfully connected to Atlassian application on " + request.ip + ".");

			// respond
			response.status (204);
			response.send ();
		}, this));
	};

	/**
	 * Handles requests.
	 * @param request The request.
	 * @param response The response.
	 */
	this.handleRequest = function (request, response) {
		response.set ("Content-Type", "text/plain");

		// verify authorization
		if (!request.get ("Authorization")) {
			// log
			console.log (request.ip + " tried to access the JIRA hooks API.");

			// send response
			response.status (400);
			response.send ("Access Denied: Missing Authorization");

			return;
		}

		// verify authorization signature
		var signature = request.get ("Authorization").replace (/^JWT (.*)/i, "$1");
		if (!jws.verify (signature, this.connectSecret)) {
			// log
			console.log (request.ip + " tried to access the JIRA hooks API without a proper signature.");

			// send response
			response.status (400);
			response.send ("Access Denied: Invalid Signature");

			return;
		}

		// decode
		var data = null;

		try {
			data = JSON.parse (request.body);
		} catch (error) {
			// reply
			response.status (400);
			response.send ("Error: Invalid data received.");
			console.log ("Received invalid data from " + request.ip + ": " + request.body);
			console.log ("The error was: " + err);
			return;
		}

		// handle
		console.log ("Received message of type " + data.webhookEvent + " from JIRA.");
		this.emit (data.webhookEvent, data);
	};

	/**
	 * Hooks all internal events.
	 */
	this.hookEvents = function () {
		// jira:issue_created
		this.addListener ("jira:issue_created", this.proxy (function (data) {
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", "JIRA") + "] " + irc.colors.wrap ("dark_green", data.user.displayName) + " created the issue " + irc.colors.wrap ("dark_red", "\"" + data.issue.fields.summary + "\" (" + data.issue.key + ")") + ": " + irc.colors.wrap ("dark_blue", this.getJiraUrl (data.issue.self) + "/browse/" + data.issue.key));
		}, this));

		// jira:issue_deleted
		this.addListener ("jira:issue_deleted", this.proxy (function (data) {
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", "JIRA") + "] " + irc.colors.wrap ("dark_green", data.user.displayName) + " deleted the issue " + irc.colors.wrap ("dark_red", "\"" + data.issue.fields.summary + "\" (" + data.issue.key + ")") + ": " + irc.colors.wrap ("dark_blue", this.getJiraUrl (data.issue.self) + "/browse/" + data.issue.key));
		}, this));

		// jira:issue_updated
		this.addListener ("jira:issue_updated", this.proxy (function (data) {
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", "JIRA") + "] " + irc.colors.wrap ("dark_green", data.user.displayName) + " updated the issue " + irc.colors.wrap ("dark_red", "\"" + data.issue.fields.summary + "\" (" + data.issue.key + ")") + ": " + irc.colors.wrap ("dark_blue", this.getJiraUrl (data.issue.self) + "/browse/" + data.issue.key));
		}, this));
	};

	/**
	 * Hooks express.
	 */
	this.hookExpress = function () {
		this.express.post ("/jira/installation", this.proxy (this.handleInstallation, this));
		this.express.post ("/jira", this.proxy (this.handleRequest, this));
	};

	/**
	 * Creates a simple proxy function.
	 * @param func The function to execute.
	 * @param context The context to execute in.
	 * @returns {Function} The proxy.
	 */
	this.proxy = function (func, context) {
		return function () {
			func.apply (context, arguments);
		}
	};

	// call constructor
	this.initialize (express, ircManager, config);
};
util.inherits (ConnectHookManager, process.EventEmitter);

// export
module.exports = ConnectHookManager;