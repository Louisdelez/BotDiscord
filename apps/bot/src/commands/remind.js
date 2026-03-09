const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Créer un rappel')
    .addStringOption(o => o.setName('message').setDescription('Le message du rappel').setRequired(true))
    .addStringOption(o => o.setName('dans').setDescription('Dans combien de temps (ex: 10m, 2h, 1d)').setRequired(true))
    .addStringOption(o => o.setName('récurrence').setDescription('Récurrence').addChoices(
      { name: 'Une fois', value: 'once' },
      { name: 'Quotidien', value: 'daily' },
      { name: 'Hebdomadaire', value: 'weekly' },
    )),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const message = interaction.options.getString('message');
    const timeStr = interaction.options.getString('dans');
    const recurring = interaction.options.getString('récurrence');

    const ms = parseTime(timeStr);
    if (!ms) return interaction.reply({ content: t(locale, 'bot.remind.invalidFormat'), ephemeral: true });

    const remindAt = new Date(Date.now() + ms);

    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!user) return interaction.reply({ content: t(locale, 'common.userNotFound'), ephemeral: true });

    await prisma.reminder.create({
      data: {
        userId: user.id,
        guildId: guild.id,
        channelId: interaction.channel.id,
        message,
        remindAt,
        recurring: recurring === 'once' ? null : recurring,
      },
    });

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'bot.remind.title'))
      .setColor(0x0071e3)
      .addFields(
        { name: t(locale, 'bot.remind.fieldMessage'), value: message },
        { name: t(locale, 'bot.remind.fieldIn'), value: timeStr },
        { name: t(locale, 'bot.remind.fieldDate'), value: `<t:${Math.floor(remindAt.getTime() / 1000)}:F>` },
      );

    if (recurring && recurring !== 'once') {
      embed.addFields({ name: t(locale, 'bot.remind.fieldRecurrence'), value: recurring });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

function parseTime(str) {
  const match = str.match(/^(\d+)\s*(m|min|h|hr|d|j|s)$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, min: 60000, h: 3600000, hr: 3600000, d: 86400000, j: 86400000 };
  return num * (multipliers[unit] || 0);
}
