const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Voir le classement XP du serveur'),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);

    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const top = await prisma.guildMember.findMany({
      where: { guildId: guild.id },
      include: { user: true },
      orderBy: { xp: 'desc' },
      take: 10,
    });

    if (top.length === 0) return interaction.reply({ content: t(locale, 'common.noData'), ephemeral: true });

    const medals = ['🥇', '🥈', '🥉'];
    const description = top.map((m, i) =>
      `${medals[i] || `**${i + 1}.**`} ${m.user.username} — ${t(locale, 'bot.leaderboard.entry', { level: m.level, xp: m.xp.toLocaleString() })}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'bot.leaderboard.title'))
      .setColor(0x0071e3)
      .setDescription(description);

    await interaction.reply({ embeds: [embed] });
  },
};
