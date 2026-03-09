const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createModAction } = require('../modules/moderation');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Rendre muet un membre')
    .addUserOption(o => o.setName('user').setDescription('Le membre').setRequired(true))
    .addIntegerOption(o => o.setName('duration').setDescription('Durée en minutes').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const locale = resolveLocale(interaction.locale);
    const target = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || t(locale, 'common.noReason');
    const member = interaction.guild.members.cache.get(target.id);

    if (!member) return interaction.reply({ content: t(locale, 'common.memberNotFound'), ephemeral: true });

    await member.timeout(duration * 60 * 1000, reason);
    await createModAction(interaction, 'MUTE', target, reason, duration * 60, client);

    await interaction.reply({ content: t(locale, 'bot.mute.success', { target: target.username, duration, reason }) });
  },
};
