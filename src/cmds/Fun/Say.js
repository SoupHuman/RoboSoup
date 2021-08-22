module.exports = {
	name: 'say',
	description: 'Say something!',
	execute(message, args) {
		message.channel.send(`${args}`);
	},
};
