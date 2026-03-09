const { prisma, aiChat } = require('shared');
const { t } = require('i18n');

async function runAutonomousAgent(client) {
  const guilds = await prisma.guild.findMany({
    include: { aiConfig: true },
  });

  for (const guild of guilds) {
    if (!guild.aiConfig?.autonomousAgentEnabled || !guild.aiConfig?.agentChannelId) continue;

    try {
      await analyzeGuild(guild, client);
    } catch (err) {
      console.error(`Agent error for guild ${guild.name}:`, err.message);
    }
  }
}

async function analyzeGuild(guild, client) {
  const discordGuild = client.guilds.cache.get(guild.discordId);
  if (!discordGuild) return;

  const agentChannel = discordGuild.channels.cache.get(guild.aiConfig.agentChannelId);
  if (!agentChannel) return;

  // Fetch recent messages from active channels
  const recentMessages = [];
  const textChannels = discordGuild.channels.cache.filter(c => c.isTextBased() && !c.isThread());

  for (const [, channel] of textChannels) {
    try {
      const msgs = await channel.messages.fetch({ limit: 50 });
      const recent = msgs.filter(m =>
        !m.author.bot &&
        Date.now() - m.createdTimestamp < (guild.aiConfig.agentAnalysisInterval || 60) * 60 * 1000
      );
      recent.forEach(m => recentMessages.push({
        content: m.content,
        author: m.author.username,
        channel: channel.name,
      }));
    } catch {
      // No permission to read
    }
  }

  if (recentMessages.length < 5) return;

  // Ask Ollama to detect trending topics
  const messagesText = recentMessages
    .slice(0, 100)
    .map(m => `[#${m.channel}] ${m.author}: ${m.content}`)
    .join('\n');

  try {
    const content = (await aiChat(guild.aiConfig, [{
      role: 'system',
      content: t('fr', 'bot.autonomousAgent.prompt'),
    }, {
      role: 'user',
      content: `Analyse ces ${recentMessages.length} messages récents:\n\n${messagesText}`,
    }], { temperature: 0.3, maxTokens: 500, json: true })) || '{"topics": []}';

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return;
    }

    if (!parsed.topics || parsed.topics.length === 0) return;

    // Save trending topics and post summary
    const { EmbedBuilder } = require('discord.js');
    const topicsToPost = [];

    for (const topic of parsed.topics.slice(0, 3)) {
      await prisma.trendingTopic.create({
        data: {
          guildId: guild.id,
          topic: topic.topic,
          summary: topic.summary,
          messageCount: topic.messageCount || 0,
        },
      });
      topicsToPost.push(topic);
    }

    if (topicsToPost.length > 0) {
      const embed = new EmbedBuilder()
        .setTitle(t('fr', 'bot.autonomousAgent.trendingTitle'))
        .setColor(0x9b59b6)
        .setDescription(topicsToPost.map((tp, i) =>
          `**${i + 1}. ${tp.topic}**\n${tp.summary} (${tp.messageCount || '?'} messages)`
        ).join('\n\n'))
        .setFooter({ text: t('fr', 'bot.autonomousAgent.agentName') })
        .setTimestamp();

      await agentChannel.send({ embeds: [embed] });

      // Auto-create Discord scheduled events for high-engagement topics
      const { GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } = require('discord.js');
      for (const topic of topicsToPost) {
        if ((topic.messageCount || 0) < 10) continue;
        try {
          const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
          startTime.setMinutes(0, 0, 0);
          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour

          await discordGuild.scheduledEvents.create({
            name: `Discussion: ${topic.topic}`.slice(0, 100),
            description: `${topic.summary}\n\n${t('fr', 'bot.autonomousAgent.eventDesc', { count: topic.messageCount || '?' })}`.slice(0, 1000),
            scheduledStartTime: startTime,
            scheduledEndTime: endTime,
            privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
            entityType: GuildScheduledEventEntityType.External,
            entityMetadata: { location: `#${agentChannel.name}` },
          });

          await agentChannel.send(t('fr', 'bot.autonomousAgent.eventCreated', { topic: topic.topic, hour: startTime.getHours() }));
        } catch (err) {
          console.error('Auto-event creation error:', err.message);
        }
      }
    }
  } catch (err) {
    console.error('Agent analysis error:', err.message);
  }
}

module.exports = { runAutonomousAgent };
