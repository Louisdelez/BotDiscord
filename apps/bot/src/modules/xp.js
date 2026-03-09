const { prisma, xpForLevel } = require('shared');
const { t } = require('i18n');

async function handleXP(message, guild, member, client) {
  const config = guild.xpConfig;
  if (!config) return;

  // Check excluded channels/roles
  if (config.excludedChannels.includes(message.channel.id)) return;
  if (message.member.roles.cache.some(r => config.excludedRoles.includes(r.id))) return;

  // Cooldown check
  if (member.lastXpAt) {
    const elapsed = (Date.now() - new Date(member.lastXpAt).getTime()) / 1000;
    if (elapsed < config.xpCooldown) return;
  }

  // Calculate XP
  const xpGain = Math.floor(config.xpPerMessage * config.multiplier);
  const newXp = member.xp + xpGain;

  // Check level up
  let newLevel = member.level;
  let xpNeeded = xpForLevel(newLevel);
  let remaining = newXp - sumXpToLevel(member.level);

  while (remaining >= xpForLevel(newLevel)) {
    remaining -= xpForLevel(newLevel);
    newLevel++;
  }

  const leveledUp = newLevel > member.level;

  await prisma.guildMember.update({
    where: { id: member.id },
    data: { xp: newXp, level: newLevel, lastXpAt: new Date() },
  });

  if (leveledUp) {
    message.channel.send(t('fr', 'bot.xp.levelUp', { userId: message.author.id, level: newLevel }));

    // Check role rewards
    const rewards = await prisma.roleReward.findMany({
      where: { guildId: guild.id, level: { lte: newLevel } },
    });
    for (const reward of rewards) {
      if (!message.member.roles.cache.has(reward.roleId)) {
        await message.member.roles.add(reward.roleId).catch(() => {});
      }
    }

    // Publish event
    client.redis.publish('bot-events', JSON.stringify({
      type: 'levelUp',
      guildId: message.guild.id,
      data: { userId: message.author.id, username: message.author.username, level: newLevel },
    }));
  }
}

function sumXpToLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

module.exports = { handleXP };
