const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Statistiques du serveur')
    .addIntegerOption(o => o.setName('jours').setDescription('Nombre de jours (défaut: 7)').setMinValue(1).setMaxValue(90)),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const days = interaction.options.getInteger('jours') || 7;

    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [stats, topUsers, totalMembers, badgeCount] = await Promise.all([
      prisma.dailyStat.findMany({
        where: { guildId: guild.id, date: { gte: since } },
        orderBy: { date: 'asc' },
      }),
      prisma.guildMember.findMany({
        where: { guildId: guild.id },
        include: { user: true },
        orderBy: { messageCount: 'desc' },
        take: 5,
      }),
      prisma.guildMember.count({ where: { guildId: guild.id } }),
      prisma.badgeAward.count({
        where: { member: { guildId: guild.id } },
      }),
    ]);

    const totalMessages = stats.reduce((s, d) => s + d.messageCount, 0);
    const totalVoice = stats.reduce((s, d) => s + d.voiceMinutes, 0);
    const avgMessages = stats.length > 0 ? Math.round(totalMessages / stats.length) : 0;

    const topUsersStr = topUsers.slice(0, 5).map((m, i) =>
      `${i + 1}. **${m.user.username}** — ${m.messageCount} msgs (Niv. ${m.level})`
    ).join('\n') || t(locale, 'common.none');

    const voiceHours = Math.floor(totalVoice / 60);
    const voiceMin = totalVoice % 60;

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'bot.stats.title', { days }))
      .setColor(0x3498db)
      .addFields(
        { name: t(locale, 'bot.stats.messages'), value: `${totalMessages.toLocaleString()} total\n${avgMessages}/jour`, inline: true },
        { name: t(locale, 'bot.stats.voiceTime'), value: `${voiceHours}h ${voiceMin}min`, inline: true },
        { name: t(locale, 'bot.stats.members'), value: `${totalMembers}`, inline: true },
        { name: t(locale, 'bot.stats.badgesDistributed'), value: `${badgeCount}`, inline: true },
        { name: t(locale, 'bot.stats.topMembers'), value: topUsersStr },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
