const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createModAction } = require('../modules/moderation');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser un membre')
    .addUserOption(o => o.setName('user').setDescription('Le membre').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction, client) {
    const locale = resolveLocale(interaction.locale);
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || t(locale, 'common.noReason');
    const member = interaction.guild.members.cache.get(target.id);

    if (!member) return interaction.reply({ content: t(locale, 'common.memberNotFound'), ephemeral: true });

    await member.kick(reason);
    await createModAction(interaction, 'KICK', target, reason, null, client);

    await interaction.reply({ content: t(locale, 'bot.kick.success', { target: target.username, reason }) });
  },
};
