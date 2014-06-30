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
var crypto = require ("crypto");
var irc = require ("irc");
var util = require ("util");

/**
 * Handles GitHub Webhook calls.
 * @param ircManager The IRCManager instance.
 * @param config The configuration.
 * @constructor
 */
var GitHubHookManager = function (ircManager, config) {
	"use strict";

	/**
	 * Constructs a new instance of GitHubHookManager.
	 * @param ircManager The IRCManager instance.
	 * @param config The configuration.
	 */
	this.initialize = function (express, ircManager, config) {
		this.configuration = config;
		this.irc = ircManager;
		this.express = express;
		this.connectSecret = null;

		// hook
		this.hookExpress ();
		this.hookEvents ();
	};

	/**
	 * Creates a message signature.
	 * @param message The message.
	 * @returns {*}
	 */
	this.createSignature = function (message) {
		return crypto.createHmac ('sha1', this.configuration.github.secret)
			.update (message)
			.digest ('hex');
	};

	/**
	 * Handles HTTP requests.
	 * @param request The request.
	 * @param response The response.
	 */
	this.handleRequest = function (request, response) {
		// set content type
		response.set ("Content-Type", "text/plain");

		// debug
		console.log ("Received message from " + request.ip + " ...");

		// check for signature
		if (request.get ("X-Hub-Signature") == undefined) {
			// no signature - deny access
			response.status (403);
			response.send ("Access Denied: No Signature");
			console.log ("Denied access for " + request.ip + " on GitHub API: No signature.");
			return;
		}

		// verify signature
		var signature = this.createSignature (request.body);

		if (this.unifySignature (request.get ("X-Hub-Signature")) != signature) {
			// invalid signature - deny access
			response.status (403);
			response.send ("Access Denied: Invalid Signature\nReceived: " + request.get ("X-Hub-Signature"));
			console.log ("Denied access for " + request.ip + " on GitHub API: Received invalid signature \"" + request.get ("X-Hub-Signature") + "\".");
			console.log ("Expected signature \"" + signature + "\" but received \"" + this.unifySignature(request.get ("X-Hub-Signature")) + "\".");
			return;
		}

		// verify event name
		if (request.get ("X-GitHub-Event") == undefined) {
			// missing event - deny access
			response.status (400);
			response.send ("Error: Missing event name");
			console.log ("Received invalid data from " + request.ip + ": Missing X-GitHub-Event header.");
			return;
		}

		// decode body
		var data = null;

		try {
			data = JSON.parse (request.body);
		} catch (err) {
			// reply
			response.status (400);
			response.send ("Error: Invalid data received.");
			console.log ("Received invalid data from " + request.ip + ": " + request.body);
			console.log ("The error was: " + err);
			return;
		}

		// handle message
		this.emit (request.get ("X-GitHub-Event"), data);

		// debug
		console.log ("Handled message of type " + request.get ("X-GitHub-Event") + ".");

		// ok!
		response.status (200);
		response.send ("OK");

	};

	/**
	 * Hooks all events.
	 */
	this.hookEvents = function () {
		// commit comment
		this.addListener ("commit_comment", this.proxy (function (data) {
			console.log ("Received a commit_comment event from GitHub.");
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", data.repository.name) + "] " + irc.colors.wrap ("dark_green", data.comment.user.login) + " commented on commit " + irc.colors.wrap ("dark_red", data.comment.commit_id) + ": " + irc.colors.wrap ("dark_blue", data.comment.html_url));
		}, this));

		// fork
		this.addListener ("fork", this.proxy (function (data) {
			console.log ("Received a fork event from GitHub.");
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", data.repository.name) + "] The repository has been forked to " + irc.colors.wrap ("dark_green", data.forkee.full_name) + ": " + irc.colors.wrap ("dark_blue", data.forkee.html_url));
		}, this));

		// issue comment
		this.addListener ("issue_comment", this.proxy (function (data) {
			console.log ("Received an issue_comment event from GitHub.");
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", data.repository.name) + "] " + irc.colors.wrap ("dark_green", data.comment.user.login) + " commented on issue \"" + irc.colors.wrap ("orange", data.issue.title) + "\" " + irc.colors.wrap ("dark_red", "#" + data.issue.number) + ": " + irc.colors.wrap ("dark_blue", data.comment.html_url));
		}, this));

		// issues
		this.addListener ("issues", this.proxy (function (data) {
			console.log ("Received an issues event from GitHub.");
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", data.repository.name) + "] " + irc.colors.wrap ("dark_green", data.issue.user.login) + " " + data.action + " issue \"" + irc.colors.wrap ("orange", data.issue.title) + "\" " + irc.colors.wrap ("dark_red", "#" + data.issue.number) + ": " + irc.colors.wrap ("dark_blue", data.issue.html_url));
		}, this));

		// member
		this.addListener ("member", this.proxy (function (data) {
			console.log ("Received a member event from GitHub.");
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", data.repository.name) + "] " + irc.colors.wrap ("dark_green", data.member.login) + " was added to the list collaborators: " + irc.colors.wrap ("dark_red", data.member.html_url));
		}, this));

		// ping
		this.addListener ("ping", this.proxy (function (data) {
			console.log ("Received a ping from GitHub: " + data.zen);
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", "GitHub") + "]" + " Received WebHook installation ping: " + irc.colors.wrap ("dark_blue", data.zen));
		}, this));

		// pull_request
		this.addListener ("pull_request", this.proxy (function (data) {
			console.log ("Received a pull_request event from GitHub.");
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", data.repository.name) + "] " + irc.colors.wrap ("dark_green", data.pull_request.user.login) + " " + (data.action == "synchronize" ? "synchronized" : data.action) + " a pull request \"" + irc.colors.wrap ("orange", data.pull_request.title) + "\" " + irc.colors.wrap ("dark_red", "#" + data.number) + ": " + irc.colors.wrap ("dark_blue", data.pull_request.html_url));
		}, this));

		// pull_request_review_comment
		this.addListener ("pull_request_review_comment", this.proxy (function (data) {
			console.log ("Received a pull_request_review_comment event from GitHub.");
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", data.repository.name) + "] " + irc.colors.wrap ("dark_green", data.comment.user.login) + " commented on a diff of pull request " + irc.colors.wrap ("dark_red", "#" + data.pull_request.number) + " \"" + irc.colors.wrap ("orange", data.pull_request.title) + "\": " + irc.colors.wrap ("dark_blue", data.comment.html_url));
		}, this));

		// push
		this.addListener ("push", this.proxy (function (data) {
			console.log ("Received a push event from GitHub.");
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", data.repository.name) + "] " + irc.colors.wrap ("dark_green", (data.size == undefined ? "1" : data.size)) + " " + (data.size == undefined ? "commit has" : "commits have") + " been pushed to " + irc.colors.wrap ("dark_red", data.ref) + ": " + irc.colors.wrap ("dark_blue", data.compare));
		}, this));

		// release
		this.addListener ("release", this.proxy (function (data) {
			console.log ("Received a release event from GitHub.");
			this.irc.sendMessage ("[" + irc.colors.wrap ("dark_blue", data.repository.name) + "] " + irc.colors.wrap ("dark_green", data.release.author.login) + " " + data.action + " release " + irc.colors.wrap ("dark_red", data.release.name + " (" + data.release.tag_name + ")") + ": " + irc.colors.wrap ("dark_blue", data.release.html_url));
		}, this));
	};

	/**
	 * Hooks all express URLs.
	 */
	this.hookExpress = function () {
		this.express.post ("/github", this.proxy (this.handleRequest, this));
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

	/**
	 * Unifies a GitHub webhook signature.
	 * @param signature The signature.
	 * @returns string
	 */
	this.unifySignature = function (signature) {
		return signature.replace (/^sha1=(.*)/i, "$1");
	}

	// call constructor
	this.initialize (ircManager, config);
};
util.inherits (GitHubHookManager, process.EventEmitter);

// export
module.exports = GitHubHookManager;