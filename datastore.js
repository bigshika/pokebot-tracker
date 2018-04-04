var days = [
	"sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
];

var months = [
	'jan', 'feb','mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

var ReadingListFlag = false;
var Botkit = require('botkit');
var emojireplace = require('./emojireplace.js');

exports.updateMission = (list, initialEmoji, replacementEmoji, index) => {
	var mission = list[initialEmoji][index];
	list[replacementEmoji] = list.hasOwnProperty(replacementEmoji) ? list[replacementEmoji].concat([mission]) : [mission];
	if (list[initialEmoji].length === 1) {
		delete list[initialEmoji];
	} else if (list[initialEmoji].length > 1) {
		list[initialEmoji].splice(index, 1);
	}
}

exports.addMission = (list, item, type) => {
	var emoji;
	var itemPrefix;
	if (item === '') {return;}
	switch (type) {
		default:
		case 'plot':
		case 'side':
			emoji = emojireplace.todoEmoji();
			itemPrefix = '';
			break;
		case 'read':
			emoji = emojireplace.todoEmoji();
			itemPrefix = 'Read ';
			type = 'side';
			break;
		case 'pollinate':
			emoji = ':bee:';
			itemPrefix = 'Pollinate ';
			type = 'plot';
			break;
		case 'til':
			emoji = emojireplace.lootEmoji();
			itemPrefix = '';
			break
	};
	item = [itemPrefix + item];
	var quests = list[type].hasOwnProperty(emoji) ? list[type][emoji].concat(item) : item;
	list[type][emoji] = quests;
	return emoji;
}

exports.getTruncatedListString = (list) => {
	return getListString(list, false);
}

exports.getFullListString = (list) => {
	return getListString(list, true);
}

function getListString (list, printAllCategories) {
	var headers = {
		'plot': '*Plot Missions:*',
		'side': '*Side Quests:*',
		'til': '*TIL:*',
	}
	if (ReadingListFlag) {
		headers['read'] = '*Reading List:*';
	}
	var categoryKeys = Object.keys(headers);
	var string = '';
	if (list.user) {
		string = '*@' + list.user + '\'s Quest Log*';
	}
	for (var i = 0; i < categoryKeys.length; i++) {
		var catKey = categoryKeys[i];
		if (!printAllCategories && (catKey === 'plot' || catKey === 'side') && (Object.keys(list['plot']).length === 0 && Object.keys(list['side']).length == 0)) {
			continue;
		}
		string = string + '\n' + headers[catKey] + buildListString(Object.keys(list[catKey]), list[catKey]);
	}
	return string;
}

function buildListString(keys, sublist) {
	var string = ''; 
	if (keys.length > 0) {
		for (var i = 0; i < keys.length; i++) {
			var currentKey = keys[i];
			if (currentKey === ':pokeball:') {continue; }
			for (var j = 0; j < sublist[currentKey].length; j++) {
				string =  string + '\n' + currentKey + ' ' + sublist[currentKey][j];
			}
		}
		if (sublist[':pokeball:']) {
			for (var j = 0; j < sublist[':pokeball:'].length; j++) {
					string =  string + '\n' + ':pokeball:' + ' ' + sublist[':pokeball:'][j];
			}
		}
	} else {
		string = string + '\n' + ':question_block:';
	}
	return string;
}

exports.createUserData = () => {
	return {
		'id': '',
		'timestamp': '',
		'channel': '',
		'plot': {},
		'side': {},
		'til': {},
		'read': {}
	};
}

exports.getFileName = (message) => {
	var dateObj = new Date(message.ts * 1000);
	var day = days[dateObj.getDay()];
	var date = dateObj.getDate();
	var month = months[dateObj.getMonth()];
	return message.user + day + date + month;
}