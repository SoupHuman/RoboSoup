const fs = require('fs');
const Discord = require('discord.js');
const { prefix, token } = require('./config.json');

const client = new Discord.Client();
client.cmds = new Discord.Collection();
client.cooldowns = new Discord.Collection();

const cmdFolders = fs.readdirSync('./cmds');

for (const folder of cmdFolders) {
	const cmdFiles = fs.readdirSync(`./cmds/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of cmdFiles) {
		const cmd = require(`./cmds/${folder}/${file}`);
		client.cmds.set(cmd.name, cmd);
	}
}

client.once('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
	if (!msg.content.startsWith(prefix) || msg.author.bot) return;

	const args = msg.content.slice(prefix.length).trim().split(/ +/);
	const cmdName = args.shift().toLowerCase();

	const cmd = client.cmds.get(cmdName)
		|| client.cmds.find(command => command.aliases && command.aliases.includes(cmdName));

	if (!cmd) return;

	if (cmd.guildOnly && msg.channel.type === 'dm') {
		return msg.reply('I can\'t execute that command inside DMs!');
	}

	if (cmd.permissions) {
		const authorPerms = msg.channel.permissionsFor(msg.author);
		if (!authorPerms || !authorPerms.has(cmd.permissions)) {
			return msg.reply('You can not do this!');
		}
	}

	if (cmd.args && !args.length) {
		let reply = `You didn't provide any arguments, ${msg.author}!`;

		if (cmd.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${cmd.name} ${cmd.usage}\``;
		}

		return msg.channel.send(reply);
	}

	const { cooldowns } = client;

	if (!cooldowns.has(cmd.name)) {
		cooldowns.set(cmd.name, new Discord.Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(cmd.name);
	const cooldownAmount = (cmd.cooldown || 3) * 1000;

	if (timestamps.has(msg.author.id)) {
		const expirationTime = timestamps.get(msg.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return msg.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${cmd.name}\` cmd.`);
		}
	}

	timestamps.set(msg.author.id, now);
	setTimeout(() => timestamps.delete(msg.author.id), cooldownAmount);

	try {
		cmd.execute(msg, args);
	} catch (error) {
		console.error(error);
		msg.reply('there was an error trying to execute that cmd!');
	}
});

client.login(token);