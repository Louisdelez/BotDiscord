const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('badges')
    .setDescription('Voir les badges du serveur')
    .addUserOption(o => o.setName('user').setDescription('Voir les badges d\'un membre')),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const target = interaction.options.getUser('user') || interaction.user;

    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const badges = await prisma.badge.findMany({
      where: { guildId: guild.id },
      include: { awards: true },
    });

    const user = await prisma.user.findUnique({ where: { discordId: target.id } });
    const member = user ? await prisma.guildMember.findFirst({
      where: { userId: user.id, guildId: guild.id },
    }) : null;

    const earnedIds = new Set();
    if (member) {
      const awards = await prisma.badgeAward.findMany({
        where: { memberId: member.id },
        select: { badgeId: true },
      });
      awards.forEach(a => earnedIds.add(a.badgeId));
    }

    if (badges.length === 0) {
      return interaction.reply({ content: t(locale, 'bot.badges.noBadges'), ephemeral: true });
    }

    const lines = badges.map(b => {
      const owned = earnedIds.has(b.id);
      const status = owned ? '✅' : '🔒';
      return `${status} ${b.icon} **${b.name}** — ${b.description} (${b.awards.length} obtenu${b.awards.length > 1 ? 's' : ''})`;
    });

    const earned = badges.filter(b => earnedIds.has(b.id)).length;

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'bot.badges.title', { target: target.username }))
      .setDescription(lines.join('\n'))
      .setColor(0xf1c40f)
      .setFooter({ text: t(locale, 'bot.badges.earned', { earned, total: badges.length }) })
      .setThumbnail(target.displayAvatarURL());

    await interaction.reply({ embeds: [embed] });
  },
};
