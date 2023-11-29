const checkPermission = (interaction, manager) => {
    const guildConfig = manager.getGuildOptions(interaction.guild.id);
    if (!interaction.member.roles.cache.some(role => guildConfig.adminRoles.includes(role.id))) {
        interaction.reply(`You don't have the permission to use this command`);
        return false;
    }
    return true;
}