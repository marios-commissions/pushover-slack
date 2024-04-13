const { WebClient } = require('@slack/web-api');
const { RTMClient } = require('@slack/rtm-api');
const config = require('./config.json');


async function notify(message, priority) {
	console.log(`Notifying "${message}" with priority ${priority}.`);

	const url = new URL('https://api.pushover.net/1/messages.json');

	url.searchParams.set('token', config.pushover.api);
	url.searchParams.set('user', config.pushover.user);
	url.searchParams.set('message', message);
	url.searchParams.set('priority', priority);

	if (priority === 2) {
		url.searchParams.set('retry', '30');
		url.searchParams.set('expire', '600');
	}

	const res = await fetch(url, { method: 'POST' });

	console.log('Got response:', await res.text());
}

const webClient = new WebClient(config.token);
const rtmClient = new RTMClient(config.token);

function getUser(id) {
	try {
		return webClient.users.info({ user: id }).then(r => r.user);
	} catch (error) {
		console.error('Failed to request user:', error);
		return null;
	}
}

async function init() {
	rtmClient.addListener('message', (msg) => {
		console.log(`Message received from [User ${msg.user} : Channel ${msg.channel}]`);

		if (!msg.text.startsWith('!') || !config.users.includes(msg.user)) {
			return;
		}

		const priority = msg.text.startsWith('!!') ? 2 : 0;
		notify(msg.text.slice(priority === 2 ? 2 : 1, msg.text.length), priority);
	});

	await rtmClient.start();

	if (!rtmClient.activeUserId) {
		console.error('Failed to authenticate with Slack!');
		return process.exit(-1);
	}

	const currentUser = await getUser(rtmClient.activeUserId);

	console.log(`Logged in as ${currentUser?.name}.`);
}

init();