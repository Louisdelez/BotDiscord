const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma, xpForLevel } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Voir votre rang ou celui d\'un membre')
    .addUserOption(o => o.setName('user').setDescription('Le membre')),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const target = interaction.options.getUser('user') || interaction.user;

    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const user = await prisma.user.findUnique({ where: { discordId: target.id } });
    if (!user) return interaction.reply({ content: t(locale, 'common.userNotFound'), ephemeral: true });

    const member = await prisma.guildMember.findFirst({
      where: { userId: user.id, guildId: guild.id },
      include: {
        badgeAwards: { include: { badge: true }, take: 10 },
      },
    });
    if (!member) return interaction.reply({ content: t(locale, 'bot.rank.noXpData'), ephemeral: true });

    // Get rank position
    const rank = await prisma.guildMember.count({
      where: { guildId: guild.id, xp: { gt: member.xp } },
    }) + 1;

    const needed = xpForLevel(member.level);
    let current = member.xp;
    for (let i = 0; i < member.level; i++) current -= xpForLevel(i);

    const progress = Math.floor((current / needed) * 20);
    const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);

    const voiceHours = Math.floor(member.voiceMinutes / 60);
    const voiceMin = member.voiceMinutes % 60;

    const badgeStr = member.badgeAwards.length > 0
      ? member.badgeAwards.map(a => a.badge.icon).join(' ')
      : t(locale, 'bot.rank.noBadges');

    const embed = new EmbedBuilder()
      .setTitle(`${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(member.profileColor ? parseInt(member.profileColor.replace('#', ''), 16) : 0x0071e3)
      .addFields(
        { name: t(locale, 'bot.rank.fieldRank'), value: `#${rank}`, inline: true },
        { name: t(locale, 'bot.rank.fieldLevel'), value: `${member.level}`, inline: true },
        { name: t(locale, 'bot.rank.fieldXp'), value: `${member.xp.toLocaleString()}`, inline: true },
        { name: t(locale, 'bot.rank.fieldProgress'), value: `${bar} ${current}/${needed}` },
        { name: t(locale, 'bot.rank.fieldMessages'), value: `${member.messageCount.toLocaleString()}`, inline: true },
        { name: t(locale, 'bot.rank.fieldVocal'), value: t(locale, 'bot.rank.vocalTime', { hours: voiceHours, minutes: voiceMin }), inline: true },
        { name: t(locale, 'bot.rank.fieldBadges'), value: badgeStr, inline: true },
      );

    if (member.bio) embed.setDescription(member.bio);

    await interaction.reply({ embeds: [embed] });
  },
};
