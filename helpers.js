var helpText = 'The following todo list commands are available:' +
	'\n`.todo {task}` - Adds {task} to your plot mission list\n`.list` - Replies with a link to your list or will initialise a new list\n`.side {task}` - Adds a side quest' +
	'\n`.bee {url}` - Adds a pollination to your plot missions list\n`.read {url}` - Adds a reading list item to your side quests list\n`.til {learning}` - Adds a learning to the TIL list' +
	'\n`.catch {emoji}` - Catches a task Pokémon';

module.exports = {
	makeResponseObject: makeResponseObject,
	helpText: helpText,
}

function isWhiteListed(channel, whiteList) {
	return whiteList.indexOf(channel) >= 0;
}

function removeCommand(string) {
	return string.replace(/^\.\w+\b\s*/, '');
}

function makeResponseObject(text, channel) {
	return {
		'text': text,
		'icon_emoji': ':pokeball:',
		'username': 'PokéBot',
		'channel': channel,
		'unfurl_links': true
	};
}