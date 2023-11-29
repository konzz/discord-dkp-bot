const { SlashCommandBuilder } = require('discord.js');
const LogParser = require('../logParser/logParser');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('parsedkps')
		.setDescription('Parses the logs for DKP')
        .addStringOption(option => option.setName('comment').setDescription('The user to parse').setRequired(true))
        .addIntegerOption(option => option.setName('dkps').setDescription('The ammount of dkps').setRequired(true))
		.addBooleanOption(option => option.setName('raid').setDescription('Is this a raid?').setRequired(true))
        .addStringOption(option => option.setName('log').setDescription('The log to parse').setRequired(true)),
	async execute(interaction, manager) {
		const guild = interaction.guild.id;
		const comment = interaction.options.getString('comment');
		const dkps = interaction.options.getInteger('dkps');
		const raid = interaction.options.getBoolean('raid');
		const log = interaction.options.getString('log');
		const parser = new LogParser();
		const parsed = parser.parse(log);
		const characters = parsed.characters.map(c => `${c}`);
		const errors = [];
		for (const character of parsed.characters) {
			try {
				await manager.addByCharacter(guild, character, dkps, comment, raid);
			}
			catch (e) {
				errors.push(e);
			}
		}

		await interaction.channel.send({embeds: [{
			color: 3447003,
			title: comment,
			fields: [
				{ name: "DKPS", value: dkps},
				{ name: "Characters", value: characters.sort().join('\n')},
			  	{name: "errors", value: errors.join('\n')}
			]
		  }]
		})

		await interaction.reply(`Parsed ${characters.length} characters`);
	},
	restricted: true,
};