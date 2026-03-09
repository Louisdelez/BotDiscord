const { prisma } = require('shared');
const { t } = require('i18n');

async function createModAction(interaction, action, target, reason, duration, client) {
  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) throw new Error('Guild not found in database');

  // Ensure users exist in DB
  const modUser = await prisma.user.upsert({
    where: { discordId: interaction.user.id },
    update: { username: interaction.user.username },
    create: { discordId: interaction.user.id, username: interaction.user.username },
  });
  const targetUser = await prisma.user.upsert({
    where: { discordId: target.id },
    update: { username: target.username || target.user?.username },
    create: { discordId: target.id, username: target.username || target.user?.username || 'Unknown' },
  });

  const modMember = await prisma.guildMember.upsert({
    where: { userId_guildId: { userId: modUser.id, guildId: guild.id } },
    update: {},
    create: { userId: modUser.id, guildId: guild.id },
  });
  const targetMember = await prisma.guildMember.upsert({
    where: { userId_guildId: { userId: targetUser.id, guildId: guild.id } },
    update: {},
    create: { userId: targetUser.id, guildId: guild.id },
  });

  const log = await prisma.moderationLog.create({
    data: {
      guildId: guild.id,
      action,
      reason,
      duration,
      moderatorId: modMember.id,
      targetId: targetMember.id,
    },
  });

  // Update daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.dailyStat.upsert({
    where: { guildId_date: { guildId: guild.id, date: today } },
    update: { modActions: { increment: 1 } },
    create: { guildId: guild.id, date: today, modActions: 1 },
  });

  // Publish event
  client.redis.publish('bot-events', JSON.stringify({
    type: 'modAction',
    guildId: interaction.guild.id,
    data: { action, target: targetUser.username, moderator: modUser.username, reason },
  }));

  return log;
}

module.exports = { createModAction };
