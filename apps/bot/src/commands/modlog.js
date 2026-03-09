const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlog')
    .setDescription('Voir les logs de modération d\'un membre')
    .addUserOption(o => o.setName('user').setDescription('Le membre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const target = interaction.options.getUser('user');

    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const user = await prisma.user.findUnique({ where: { discordId: target.id } });
    if (!user) return interaction.reply({ content: t(locale, 'bot.modlog.noLogs'), ephemeral: true });

    const member = await prisma.guildMember.findFirst({
      where: { userId: user.id, guildId: guild.id },
    });
    if (!member) return interaction.reply({ content: t(locale, 'bot.modlog.noLogs'), ephemeral: true });

    const logs = await prisma.moderationLog.findMany({
      where: { guildId: guild.id, targetId: member.id },
      include: { moderator: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (logs.length === 0) return interaction.reply({ content: t(locale, 'bot.modlog.noLogs'), ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'bot.modlog.title', { target: target.username }))
      .setColor(0x0071e3)
      .setDescription(
        logs.map(l =>
          t(locale, 'bot.modlog.entry', {
            action: l.action,
            moderator: l.moderator?.user?.username || t(locale, 'bot.modlog.system'),
            reason: l.reason || t(locale, 'bot.modlog.na'),
            timestamp: Math.floor(l.createdAt.getTime() / 1000),
          })
        ).join('\n\n')
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
