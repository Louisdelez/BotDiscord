const { prisma, aiGenerate } = require('shared');
const { t } = require('i18n');

const SPAM_PATTERNS = [
  /(.)\1{10,}/,                    // repeated chars
  /discord\.gg\/\w+/i,            // discord invites
  /(https?:\/\/[^\s]+){3,}/,      // multiple links
];

const TOXIC_PATTERNS = [
  /\b(niqu|fdp|ntm|tg|pd|connard|salop|merde|putain)\b/i,
];

async function handleAutomod(message, guild, member, client) {
  const config = guild.config;
  if (!config?.automodEnabled) return false;

  // Quick regex pass
  if (config.automodSpamEnabled) {
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(message.content)) {
        await moderate(message, guild, member, client, 'WARN', t('fr', 'bot.automod.spamDetected'), 0.9, true);
        return true;
      }
    }
  }

  if (config.automodLinksEnabled && /https?:\/\/[^\s]+/i.test(message.content)) {
    await message.delete().catch(() => {});
    message.channel.send({ content: `<@${message.author.id}> ${t('fr', 'bot.automod.noLinks')}` })
      .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    return true;
  }

  // Quick toxicity check with regex
  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(message.content)) {
      await moderate(message, guild, member, client, 'WARN', t('fr', 'bot.automod.toxicDetected'), 0.8, true);
      return true;
    }
  }

  // Ollama AI moderation (if threshold is set and content is long enough)
  if (message.content.length > 20) {
    try {
      const analysis = await getAIModeration(message.content, config, guild.aiConfig || {});

      if (analysis.toxicity >= (config.automodToxicityThreshold || 0.7)) {
        const reason = analysis.reason || t('fr', 'bot.automod.toxicReason', { score: analysis.toxicity.toFixed(2) });
        await moderate(message, guild, member, client, 'WARN', reason, analysis.toxicity, true);
        return true;
      }
    } catch {
      // Ollama unavailable, skip AI check
    }
  }

  return false;
}

async function getAIModeration(content, config, aiConfig) {
  const enhancedPrompt = config.automodSarcasmDetection || config.automodSubtleHarassment
    ? `Analyse ce message Discord et évalue:
1. toxicity: score de 0.0 à 1.0 (0=ok, 1=très toxique)
2. sarcasm: est-ce du sarcasme ? (true/false)
3. subtle_harassment: harcèlement subtil ? (true/false)
4. reason: raison en français si toxique

Réponds UNIQUEMENT en JSON: {"toxicity": 0.0, "sarcasm": false, "subtle_harassment": false, "reason": ""}

Message: "${content}"`
    : `Rate the toxicity of this message on a scale from 0.0 to 1.0 where 0 is perfectly fine and 1 is extremely toxic. Reply ONLY with a number.\n\nMessage: "${content}"`;

  const response = (await aiGenerate(aiConfig, enhancedPrompt)).trim();

  // Try to parse JSON response for enhanced moderation
  if (config.automodSarcasmDetection || config.automodSubtleHarassment) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        let toxicity = parseFloat(parsed.toxicity) || 0;

        // Boost score for subtle harassment
        if (config.automodSubtleHarassment && parsed.subtle_harassment) {
          toxicity = Math.min(1, toxicity + 0.3);
        }

        // Reduce score for detected sarcasm (less likely to be real aggression)
        if (config.automodSarcasmDetection && parsed.sarcasm && toxicity < 0.8) {
          toxicity = Math.max(0, toxicity - 0.2);
        }

        return { toxicity, reason: parsed.reason || '' };
      }
    } catch {}
  }

  // Fallback: simple number parsing
  const score = parseFloat(response);
  return { toxicity: isNaN(score) ? 0 : Math.min(1, Math.max(0, score)), reason: '' };
}

async function moderate(message, guild, member, client, action, reason, aiScore, automated) {
  await message.delete().catch(() => {});

  // Find or create a bot member for the moderator field
  const botUser = await prisma.user.upsert({
    where: { discordId: client.user.id },
    update: {},
    create: { discordId: client.user.id, username: client.user.username },
  });
  const botMember = await prisma.guildMember.upsert({
    where: { userId_guildId: { userId: botUser.id, guildId: guild.id } },
    update: {},
    create: { userId: botUser.id, guildId: guild.id, role: 'ADMIN' },
  });

  await prisma.moderationLog.create({
    data: {
      guildId: guild.id,
      action,
      reason,
      moderatorId: botMember.id,
      targetId: member.id,
      aiScore,
      aiContext: message.content.slice(0, 500),
      automated,
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

  // Notify
  message.channel.send({ content: `<@${message.author.id}> ${reason}` })
    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));

  client.redis.publish('bot-events', JSON.stringify({
    type: 'modAction',
    guildId: message.guild.id,
    data: { action, target: message.author.username, reason, aiScore, automated },
  }));
}

module.exports = { handleAutomod };
