const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createModAction } = require('../modules/moderation');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertir un membre')
    .addUserOption(o => o.setName('user').setDescription('Le membre').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const locale = resolveLocale(interaction.locale);
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || t(locale, 'common.noReason');

    await createModAction(interaction, 'WARN', target, reason, null, client);

    try {
      await target.send(t(locale, 'bot.warn.dm', { guild: interaction.guild.name, reason }));
    } catch {}

    await interaction.reply({ content: t(locale, 'bot.warn.success', { target: target.username, reason }) });
  },
};
