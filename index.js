const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config()
const { Client, Events, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const DKPManager = require('./DKPManager/DKPManager.js');
const Worker = require('./worker/Worker.js');
const Logger = require('./utils/Logger');
const Auctioner = require('./Auctioner/Auctioner.js');


const dbClient = require('./db.js');
try {
	dbClient.connect();
} catch (error) {
	console.error(error);
}

const dkpManager = new DKPManager(dbClient);
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const auctioner = new Auctioner(dkpManager);

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.DirectMessages] });
const worker = new Worker(client, dkpManager);
const logger = new Logger(client);

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

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (!interaction.guild) {
		await interaction.reply(`This command can only be used in a discord server`);
		return;
	}

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		if (command.restricted) {
			const guildConfig = await dkpManager.getGuildOptions(interaction.guild.id);
			if (!guildConfig || !interaction.member.roles.cache.has(guildConfig.adminRole)) {
				interaction.reply(`You don't have the permission to use this command`);
				return;
			}
		}
		await command.execute(interaction, dkpManager, logger);
	} catch (error) {
		console.error(error);
		if (!fs.existsSync('error.log')) {
			fs.writeFileSync('error.log', '');
		}
		const errorLog = `[${new Date().toLocaleString()}] ${error}\n`;
		fs.appendFileSync('error.log', errorLog);



		console.error(`Error executing command ${interaction.commandName}: ${error}`);
	}
});

client.once(Events.ClientReady, async c => {
	try {
		console.log(`Started refreshing ${commands.length} application commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const rest = new REST().setToken(token);
		//await rest.put(Routes.applicationCommands(clientId), { body: [] });
		await rest.put(Routes.applicationCommands(clientId), { body: commands })
		console.log(`Successfully reloaded application commands.`);

		//uncomment to force reload
		c.guilds.cache.forEach(async guild => {
			console.log(`Started refreshing ${commands.length} application (/) commands for guild: ${guild.name} (${guild.id}).`);
			// The put method is used to fully refresh all commands in the guild with the current set
			await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: commands });
			await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: [] });
			console.log(`Successfully reloaded application (/) commands for guild: ${guild.name} (${guild.id}).`);
		});


	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}

	console.log(`Ready! Logged in as ${c.user.tag}`);
	worker.start();
});

client.login(token);

