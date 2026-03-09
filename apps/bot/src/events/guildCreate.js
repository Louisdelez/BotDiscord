const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  name: 'guildCreate',
  async execute(guild) {
    const locale = 'fr';
    console.log(`Joined guild: ${guild.name} (${guild.id})`);

    await prisma.guild.upsert({
      where: { discordId: guild.id },
      update: { name: guild.name, icon: guild.icon, ownerId: guild.ownerId },
      create: {
        discordId: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
      },
    });

    // Create default configs
    const dbGuild = await prisma.guild.findUnique({ where: { discordId: guild.id } });
    await prisma.guildConfig.upsert({
      where: { guildId: dbGuild.id },
      update: {},
      create: { guildId: dbGuild.id },
    });
    await prisma.xPConfig.upsert({
      where: { guildId: dbGuild.id },
      update: {},
      create: { guildId: dbGuild.id },
    });
    await prisma.aIConfig.upsert({
      where: { guildId: dbGuild.id },
      update: {},
      create: { guildId: dbGuild.id },
    });
  },
};
