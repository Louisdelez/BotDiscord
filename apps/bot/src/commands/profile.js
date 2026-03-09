const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma, xpForLevel } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Voir ou modifier votre profil')
    .addSubcommand(sub => sub
      .setName('view')
      .setDescription('Voir votre profil ou celui d\'un membre')
      .addUserOption(o => o.setName('user').setDescription('Le membre')))
    .addSubcommand(sub => sub
      .setName('edit')
      .setDescription('Modifier votre profil')
      .addStringOption(o => o.setName('bio').setDescription('Votre bio'))
      .addStringOption(o => o.setName('color').setDescription('Couleur du profil (hex, ex: #ff5733)'))),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const sub = interaction.options.getSubcommand();

    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    if (sub === 'edit') {
      const bio = interaction.options.getString('bio');
      const color = interaction.options.getString('color');

      const user = await prisma.user.upsert({
        where: { discordId: interaction.user.id },
        update: { username: interaction.user.username },
        create: { discordId: interaction.user.id, username: interaction.user.username },
      });

      const data = {};
      if (bio !== null) data.bio = bio;
      if (color !== null) data.profileColor = color;

      await prisma.guildMember.upsert({
        where: { userId_guildId: { userId: user.id, guildId: guild.id } },
        update: data,
        create: { userId: user.id, guildId: guild.id, ...data },
      });

      return interaction.reply({ content: t(locale, 'bot.profile.updated'), ephemeral: true });
    }

    // View profile
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await prisma.user.findUnique({ where: { discordId: target.id } });
    if (!user) return interaction.reply({ content: t(locale, 'common.userNotFound'), ephemeral: true });

    const member = await prisma.guildMember.findFirst({
      where: { userId: user.id, guildId: guild.id },
      include: {
        badgeAwards: { include: { badge: true } },
        pets: { take: 3 },
        rpgCharacter: true,
      },
    });
    if (!member) return interaction.reply({ content: t(locale, 'bot.profile.notFound'), ephemeral: true });

    const rank = await prisma.guildMember.count({
      where: { guildId: guild.id, xp: { gt: member.xp } },
    }) + 1;

    const voiceHours = Math.floor(member.voiceMinutes / 60);
    const voiceMin = member.voiceMinutes % 60;

    const badgeStr = member.badgeAwards.length > 0
      ? member.badgeAwards.map(a => `${a.badge.icon} ${a.badge.name}`).join('\n')
      : t(locale, 'bot.profile.noBadges');

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'bot.profile.title', { target: target.username }))
      .setThumbnail(target.displayAvatarURL())
      .setColor(member.profileColor ? parseInt(member.profileColor.replace('#', ''), 16) : 0x0071e3)
      .addFields(
        { name: t(locale, 'bot.profile.fieldStats'), value: t(locale, 'bot.profile.statsValue', { rank, level: member.level, xp: member.xp.toLocaleString(), messages: member.messageCount.toLocaleString() }), inline: false },
        { name: t(locale, 'bot.profile.fieldVocal'), value: t(locale, 'bot.profile.vocalTime', { hours: voiceHours, minutes: voiceMin }), inline: true },
        { name: t(locale, 'bot.profile.fieldMemberSince'), value: `<t:${Math.floor(new Date(member.createdAt).getTime() / 1000)}:R>`, inline: true },
        { name: t(locale, 'bot.profile.fieldBadges'), value: badgeStr, inline: false },
      );

    if (member.bio) embed.setDescription(`*${member.bio}*`);

    if (member.pets.length > 0) {
      embed.addFields({
        name: t(locale, 'bot.profile.fieldPets'),
        value: member.pets.map(p => t(locale, 'bot.profile.petEntry', { name: p.name, species: p.species, level: p.level })).join(', '),
      });
    }

    if (member.rpgCharacter) {
      embed.addFields({
        name: t(locale, 'bot.profile.fieldRpg'),
        value: t(locale, 'bot.profile.rpgEntry', { name: member.rpgCharacter.name, className: member.rpgCharacter.className, level: member.rpgCharacter.level }),
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
