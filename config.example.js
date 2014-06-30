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
var config = {

	/**
	 * Defines the bot nickname.
	 * @var string
	 */
	nickname:			"DeadCode",

	/**
	 * Defines the bot username (ident).
	 * @var string
	 */
	username:			"DEADC0DE",

	/**
	 * Defines the bot realname (gecos).
	 * @var string
	 */
	realname:			"0xDEADC0DE",

	/**
	 * Defines the channel to send messages to.
	 * @var string
	 */
	channel:			"#Akkarin",

	/**
	 * IRC Server specific settings.
	 */
	server:				{

		/**
		 * Defines the server address.
		 * @var string
		 */
		address:			"irc.example.org",

		/**
		 * Defines the server port.
		 * @var integer
		 */
		port:				6667,

		/**
		 * Specifies whether the connection should be established via SSL.
		 * @var boolean
		 */
		secure:				false,

		/**
		 * Specifies the modes to set on the bot on connect (null if not used).
		 * @var string
		 */
		userModes:			"+B",

		/**
		 * Defines whether expired certificates should be accepted.
		 * @var boolean
		 */
		acceptExpired:			false,

		/**
		 * Defines whether self signed certificates should be accepted.
		 * @var boolean
		 */
		acceptSelfSigned:		false

	},

	/**
	 * Provides support for NickServ authentication.
	 */
	nickserv:			{

		/**
		 * Defines whether the bot should try authenticating with NickServ.
		 */
		enabled:			false,

		/**
		 * Defines the nickname to use for authentication (null if not used).
		 * @var string
		 */
		username:			"0xDeadCode",

		/**
		 * Defines the password to use for authentication.
		 * @var string
		 */
		password:			"1234",

		/**
		 * Defines the command to use for authentication (null if PRIVMSG should be used).
		 * @var string
		 */
		command:			null
	},

	/**
	 * Defines GitHub specific settings.
	 */
	github:				{

		/**
		 * Defines the Webhook-Secret.
		 * @var string
		 */
		secret:				"1234"
	},

	/**
	 * Defines Atlassian Connect specific settings.
	 */
	atlassianConnect:		{

		/**
		 * Defines whether Atlassian Connect is actually enabled.
		 * Note: Do not enable this unless you really plan on linking JIRA. The first installation to connect
		 * is deemed to be the trusted instance. New installations will be rejected.
		 * @var boolean
		 */
		enabled:			false
	},

	/**
	 * Defines Web-Server specific settings.
	 */
	web:				{

		/**
		 * Defines the address to bind to (defaults to all addresses).
		 * @var string
		 */
		address:			undefined,

		/**
		 * Defines the port to bind to.
		 * @var integer
		 */
		port:				7001
	}
};

// DO NOT TOUCH THIS LINE
module.exports = config;