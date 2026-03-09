const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createModAction } = require('../modules/moderation');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre')
    .addUserOption(o => o.setName('user').setDescription('Le membre').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Raison'))
    .addIntegerOption(o => o.setName('duration').setDescription('Durée en minutes (vide = permanent)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    const locale = resolveLocale(interaction.locale);
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || t(locale, 'common.noReason');
    const duration = interaction.options.getInteger('duration');

    await interaction.guild.members.ban(target, { reason });
    await createModAction(interaction, 'BAN', target, reason, duration ? duration * 60 : null, client);

    const durationText = duration ? ` ${t(locale, 'bot.ban.durationText', { duration })}` : ` ${t(locale, 'bot.ban.permanent')}`;
    await interaction.reply({ content: t(locale, 'bot.ban.success', { target: target.username, durationText, reason }) });
  },
};
