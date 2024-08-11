const { SlashCommandBuilder, PermissionFlagsBits, Routes, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const uniqid = require('uniqid');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dkphistory')
        .setDescription('Shows the DKP history of a player')
        .addUserOption(option => option.setName('player').setDescription('The player').setRequired(false)),
    async execute(interaction, manager) {
        await interaction.deferReply({ ephemeral: true });
        const guild = interaction.guild.id;
        const user = interaction.options.getUser('player') || interaction.user;

        const player = await manager.getPlayer(guild, user.id);
        let ticks = 0;
        const log = player.log.sort((a, b) => b.date - a.date)
            .map((e, index, entries) => {
                if (e.comment === 'Tick' && entries[index + 1]?.comment == 'Tick' && entries[index + 1]?.raid._id.toString() === e.raid._id.toString()) {
                    console.log('Tick increase!');
                    ticks++;
                    raid = e.raid;
                    return;
                }
                if (e.comment === 'Tick') {
                    console.log('Tick increase! final');
                    ticks++;
                    const message = `- <t:${Math.floor(e.date / 1000)}:d>  **${ticks}**${e.raid ? ` *${e.raid.name}* ` : ' '}*aggregated ticks*`
                    ticks = 0;
                    return message;
                }
                return `- <t:${Math.floor(e.date / 1000)}:d>  **${e.dkp}**${e.raid ? ` *${e.raid.name}* ` : ' '}*${e.comment}*`;
            }).filter(e => e);
        if (log.length < 40) {
            await interaction.editReply({ content: log.join('\n'), ephemeral: true });
            return;
        }

        const pages = Math.ceil(log.length / 40);
        let currentPage = 0;
        const id = uniqid();
        const previousPageButton = new ButtonBuilder().setCustomId(`previousPage_${id}`).setLabel('Previous Page').setDisabled(true).setStyle(ButtonStyle.Primary);
        const nextPageButton = new ButtonBuilder().setCustomId(`nextPage_${id}`).setLabel('Next Page').setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(previousPageButton, nextPageButton);
        const embed = {
            title: `DKP History of ${user.username}`,
            description: log.slice(currentPage * 40, (currentPage + 1) * 40).join('\n'),
            footer: {
                text: `${currentPage + 1}/${pages}`,
            },
        };

        await interaction.editReply({ embeds: [embed], ephemeral: true, components: [row] });

        const collectorFilter = i => i.user.id === interaction.user.id && i.customId.endsWith(id);
        const collector = interaction.channel.createMessageComponentCollector({ time: 120_000, filter: collectorFilter });
        collector.on('collect', async i => {
            await i.deferUpdate();
            if (i.customId.startsWith('previousPage')) {
                currentPage--;
            } else if (i.customId.startsWith('nextPage')) {
                currentPage++;
            }
            previousPageButton.setDisabled(currentPage === 0);
            nextPageButton.setDisabled(currentPage === pages - 1);
            embed.description = log.slice(currentPage * 40, (currentPage + 1) * 40).join('\n');
            embed.footer.text = `${currentPage + 1}/${pages}`;
            await interaction.editReply({ embeds: [embed], components: [row] });
        });

        collector.on('end', async () => {
            previousPageButton.setDisabled(true);
            nextPageButton.setDisabled(true);
            await interaction.editReply({
                components: [row]
            });
        });
    },
}; 