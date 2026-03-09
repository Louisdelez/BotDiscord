const { prisma, aiGenerate } = require('shared');
const { EmbedBuilder } = require('discord.js');
const { t } = require('i18n');

async function generateDailyRecaps(client) {
  try {
    const guilds = await prisma.guild.findMany({
      include: { config: true, aiConfig: true },
    });

    for (const guild of guilds) {
      if (!guild.aiConfig?.dailyRecapEnabled) continue;
      if (!guild.config?.recapChannelId) continue;

      try {
        await generateRecapForGuild(client, guild);
      } catch (err) {
        console.error(`Recap error for guild ${guild.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Daily recap error:', err.message);
  }
}

async function generateRecapForGuild(client, guild) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get today's stats
  const stat = await prisma.dailyStat.findFirst({
    where: { guildId: guild.id, date: today },
  });

  if (!stat || stat.messageCount === 0) return;

  // Get channel to send recap
  const channel = await client.channels.fetch(guild.config.recapChannelId).catch(() => null);
  if (!channel) return;

  // Get most active members today
  const activeMembers = await prisma.guildMember.findMany({
    where: { guildId: guild.id },
    include: { user: true },
    orderBy: { messageCount: 'desc' },
    take: 5,
  });

  // Get recent mod actions
  const modActions = await prisma.moderationLog.count({
    where: { guildId: guild.id, createdAt: { gte: today } },
  });

  // Try to generate AI summary
  let aiSummary = '';
  try {
    aiSummary = await generateAISummary(guild, stat);
  } catch {
    aiSummary = '';
  }

  const embed = new EmbedBuilder()
    .setTitle(t('fr', 'bot.dailyRecap.title'))
    .setColor(0x3498db)
    .setTimestamp()
    .addFields(
      { name: t('fr', 'bot.dailyRecap.messages'), value: `${stat.messageCount}`, inline: true },
      { name: t('fr', 'bot.dailyRecap.newMembers'), value: `${stat.joinCount}`, inline: true },
      { name: t('fr', 'bot.dailyRecap.modActions'), value: `${modActions}`, inline: true },
    );

  if (activeMembers.length > 0) {
    embed.addFields({
      name: t('fr', 'bot.dailyRecap.mostActive'),
      value: activeMembers.map((m, i) => `${i + 1}. **${m.user.username}** (${m.messageCount} msg)`).join('\n'),
    });
  }

  if (aiSummary) {
    embed.setDescription(aiSummary);
  }

  await channel.send({ embeds: [embed] });

  // Save recap
  await prisma.dailyRecap.upsert({
    where: { guildId_date: { guildId: guild.id, date: today } },
    update: { summary: aiSummary || t('fr', 'bot.dailyRecap.noAiSummary'), messageCount: stat.messageCount, activeUsers: activeMembers.length },
    create: { guildId: guild.id, date: today, summary: aiSummary || t('fr', 'bot.dailyRecap.noAiSummary'), messageCount: stat.messageCount, activeUsers: activeMembers.length },
  });
}

async function generateAISummary(guild, stat) {
  const response = await aiGenerate(
    guild.aiConfig || {},
    t('fr', 'bot.dailyRecap.prompt', { messages: stat.messageCount, members: stat.joinCount, modActions: stat.modActions }),
  );
  return response?.trim() || '';
}

module.exports = { generateDailyRecaps };
