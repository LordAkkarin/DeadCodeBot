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
var bodyParser = require ('body-parser');
var express = require ('express');
var irc = require ('irc');
var IrcManager = require ('./lib/IRCManager.js');
var GitHubHookManager = require ('./lib/GitHubHookManager.js');
var ConnectHookManager = require ('./lib/ConnectHookManager.js');

// include configuration
var config = require ('./config.js');

// create IRC manager
var manager = new IrcManager (config);

// create express instance
var app = express ();

// add middlewares
app.use (bodyParser.text ({ type: 'application/json' }));
app.use (express.static (__dirname + '/public'));

// create hook instances
if (config.github.enabled) new GitHubHookManager (app, manager, config);
if (config.atlassianConnect.enabled) new ConnectHookManager (app, manager, config);

// start listening
app.listen (config.web.port, config.web.address);