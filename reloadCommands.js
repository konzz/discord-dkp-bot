const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config()
const { Client, Events, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const dbClient = require('./db.js');
dbClient.connect();
const DKPManager = require('./DKPManager/DKPManager.js');
const dkpManager = new DKPManager(dbClient);
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commands = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}


client.once(Events.ClientReady, async c => {
	
	console.log(`Ready! Logged in as ${c.user.tag}`);
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
        const rest = new REST().setToken(token);
		c.guilds.cache.forEach(async guild => {
			console.log(`Started refreshing ${commands.length} application (/) commands for guild: ${guild.name} (${guild.id}).`);

			// The put method is used to fully refresh all commands in the guild with the current set
			await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: [] })
			const data = await rest.put(
				Routes.applicationGuildCommands(clientId, guild.id),
				{ body: commands },
			);

			console.log(`Successfully reloaded ${data.length} application (/) commands for guild: ${guild.name} (${guild.id}).`);
		});
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
});

client.login(token);
