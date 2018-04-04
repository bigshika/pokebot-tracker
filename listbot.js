'use strict';

var Botkit = require('botkit');
var emojireplace = require('./emojireplace.js');
var datastore = require('./datastore.js');
var helpers = require('./helpers.js');

var usersById = {};
var channelLookup = {};

var me = 'sana_o';

var controller = Botkit.slackbot({
	debug: false,
	json_file_store: 'store'
});

var bot = controller.spawn({
	token: process.env.SLACK_TOKEN
}).startRTM(function (err, bot, payload) {
	payload.users.forEach(function (x) { return usersById[x.id] = x; });
	// Cache the available channels and groups. These should be treated as the same, but have different api calls, so caching the api calls too.
	var myChannels = payload.channels.filter(function (x) { return x.is_member; });
	myChannels.forEach(function (x) {
		return x.api = {
			info: bot.api.channels.info,
		};
	});
	payload.groups.forEach(function (x) {
		return x.api = {
			info: bot.api.groups.info,
		};
	});
	myChannels = myChannels.concat(payload.groups);
	for (var i = 0, len = myChannels.length; i < len; i++) {
		channelLookup[myChannels[i].id] = myChannels[i];
	}
});

controller.hears(["^\\.list\\b", "^\\.getlist\\b"], ["direct_message", "direct_mention", "ambient"], function (bot, message) {
	getData(message, function (list) {
		if (!list.user) {
			list.user = getUserName(message.user);
			sayNewList(message, list);
		} else {
			var messageTimestamp = list.timestamp * 1000000;
			var url = 'https://' + bot.team_info.domain + '.slack.com/archives/' + channelLookup[list.channel].name + '/p' + messageTimestamp;
			var responseObj = helpers.makeResponseObject(url);
			responseObj['unfurl_links'] = true;
			bot.reply(message, responseObj);
		}
	});
});


controller.hears(["^\\.todo\\b"], ["direct_message", "direct_mention", "ambient"], function (bot, message) {
	var text = removeCommand(message.text);
	if (text === '') { return; }
	text = fixUrls(text);
	getData(message, addThingsToDoToList, text, 'plot');
});

controller.hears(["^\\.pollinate\\b", "^\\.bee\\b"], ["direct_message", "direct_mention", "ambient"], function (bot, message) {
	var text = removeCommand(message.text);
	if (text === '') { return; }
	text = fixUrls(text);
	getData(message, addThingsToDoToList, text, 'pollinate');
});

controller.hears(["^\\.side\\b"], ["direct_message", "direct_mention", "ambient"], function (bot, message) {
	var text = removeCommand(message.text);
	if (text === '') { return; }
	text = fixUrls(text);
	getData(message, addThingsToDoToList, text, 'side');
});

controller.hears(["^\\.read\\b"], ["direct_message", "direct_mention", "ambient"], function (bot, message) {
	var text = removeCommand(message.text);
	if (text === '') { return; }
	text = fixUrls(text);
	getData(message, addThingsToDoToList, text, 'read');
});

controller.hears(["^\\.til\\b"], ["direct_message", "direct_mention", "ambient"], function (bot, message) {
	var text = removeCommand(message.text);
	if (text === '') { return; }
	text = fixUrls(text);
	getData(message, addThingsToDoToList, text, 'til');
});

controller.hears(["^\\.done\\b", "^\\.catch\\b"], ["direct_message", "direct_mention", "mention", "ambient"], function (bot, message) {
	var text = removeCommand(message.text).split(' ');
	if (text.length < 1 || !/^:\w+:$/.test(text[0])) { console.log('goodbye!'); return; }
	var emoji = text[0];
	getData(message, function (list) {
		var response = helpers.makeResponseObject();
		if (!list.plot.hasOwnProperty(emoji) && !list.side.hasOwnProperty(emoji)) {
			response.text = "Can't find a " + emoji + ", sorry!";
			bot.reply(message, response);
			return;
		}
		var type = list.plot.hasOwnProperty(emoji) ? 'plot' : 'side';
		if (list[type][emoji].length > 1 && (text.length === 1 || isNaN(parseInt(text[1])))) {
			response.text = "Sorry, that's ambiguous. Try again with which number " + emoji + " you want to catch!";
			bot.reply(message, response);
			return;
		} else if (list[type][emoji].length > 1 && (list[type][emoji].length < parseInt(text[1]))) {
			response.text = "You'll need to be more specific to catch a " + emoji + "!";
			bot.reply(message, response);
			return;
		}
		var index = list[type][emoji].length > 1 ? parseInt(text[1]) - 1 : 0;
		datastore.updateMission(list[type], emoji, ':pokeball:', index);
		if (!list.timestamp) {
			list.user = getUserName(message.user);
			sayNewList(message, list);
		} else {
			updateList(list);
		}
		bot.reply(message, helpers.makeResponseObject('Gotcha! ' + emoji + ' was caught!'));
	});
});

controller.hears(["^\\.help\\b", "^\\.pokedex\\b"], ["direct_message", "direct_mention", "mention", "ambient"], function (bot, message) {
	bot.reply(message, helpers.makeResponseObject(helpers.helpText));
});

controller.hears(['^\\.fml\\b'], ["direct_message", "direct_mention", "mention", "ambient"], function (bot, message) {
	bot.reply(message, helpers.makeResponseObject('(╯°□°)╯︵ ┻━┻'));
});

function botResponse(message, reactions, whitelist, conversationObject) {
	reactions.forEach(function (emoji) {
		addReaction(message, emoji);
	});

	if (helpers.isWhiteListed(getChannelName(message.channel), whitelist)) {
		bot.reply(message, conversationObject);
	} else {
		directReply(message, conversationObject);
	}
}

function removeCommand(string) {
	return string.replace(/^\.\w+\b\s*/, '');
} ``

function fixUrls(string) {
	return string.replace('<', '').replace('>', '');
}

function directReply(message, responseObj, callback) {
	bot.api.im.open({ 'user': message.user }, function (err, response) {
		responseObj.channel = response.channel.id;
		bot.say(responseObj, function (err, response) {
			if (typeof callback === 'function') {
				callback();
			}
		});
	});
}

function addReaction(message, emoji) {
	bot.api.reactions.add({
		timestamp: message.ts,
		channel: message.channel,
		name: emoji,
	});
}

function getData(message, handleResponse, text, typeOfMission) {
	controller.storage.users.get(datastore.getFileName(message), function (err, userData) {
		var data = userData;
		if (!userData) {
			data = datastore.createUserData();
			data.id = datastore.getFileName(message);
			data.channel = message.channel;
		}
		handleResponse(data, message, text, typeOfMission);
	});
}

function addThingsToDoToList(list, message, text, typeOfMission) {
	var emoji = datastore.addMission(list, text, typeOfMission);
	if (!list.user) {
		list.user = getUserName(message.user);
		sayNewList(message, list);
	} else {
		updateList(list);
	}
	if (typeOfMission === 'til') {
		var congratsObject = helpers.makeResponseObject("Congrats! You learned a thing! Have a " + emoji + "!");
		bot.reply(message, congratsObject);
	} else if (typeof emoji !== 'undefined') {
		addReaction(message, emoji.replace(/:/g, ''));
	}
}

function getUserName(userId) {
	return usersById[userId].name;
}

function getUserLink(userId) {
	return '<@' + getUserName(userId) + '>';
}

function getChannelName(channelId) {
	if (typeof channelId === 'undefined' || channelId.startsWith('D')) { return '' }
	if (typeof channelLookup[channelId] === 'undefined') { return '' } // I shouldn't need this, need to fix by handling invites properly
	return channelLookup[channelId].name;
}

function sayNewList(message, list) {
	bot.say(helpers.makeResponseObject(datastore.getFullListString(list), list.channel), function (err, resp) {
		list.timestamp = resp.ts;
		controller.storage.users.save(list);
	});
}

function updateList(list) {
	var responseObj = helpers.makeResponseObject(datastore.getFullListString(list), list.channel);
	responseObj.ts = list.timestamp;
	bot.api.chat.update(responseObj);
	controller.storage.users.save(list);
}