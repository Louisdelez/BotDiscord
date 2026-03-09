const { prisma, aiChat } = require('shared');
const { getEmbedding, cosineSimilarity } = require('./embeddings');
const { t } = require('i18n');

// Simple in-memory conversation context (per channel)
const conversations = new Map();
const MAX_CONTEXT = 10;

async function handleChatbot(message, guild, client) {
  const aiConfig = guild.aiConfig;
  if (!aiConfig) return;

  // Build context
  const channelId = message.channel.id;
  if (!conversations.has(channelId)) conversations.set(channelId, []);
  const history = conversations.get(channelId);

  history.push({ role: 'user', content: `${message.author.username}: ${message.content}` });
  if (history.length > MAX_CONTEXT) history.shift();

  // Search FAQ for relevant entries
  let faqContext = '';
  try {
    faqContext = await searchFAQ(guild.id, message.content, aiConfig);
  } catch {}

  // Load server memories for tone learning
  let memoryContext = '';
  if (aiConfig.toneLearningEnabled) {
    try {
      memoryContext = await loadServerMemories(guild.id, message.content, aiConfig);
    } catch {}
  }

  const systemPrompt = [
    aiConfig.systemPrompt || t('fr', 'bot.chatbot.defaultPrompt'),
    faqContext ? `\n${t('fr', 'bot.chatbot.faqContext')}\n${faqContext}` : '',
    memoryContext ? `\n${t('fr', 'bot.chatbot.toneContext')}\n${memoryContext}` : '',
  ].join('');

  try {
    await message.channel.sendTyping();

    const reply = (await aiChat(aiConfig, [
      { role: 'system', content: systemPrompt },
      ...history,
    ])) || t('fr', 'bot.chatbot.noReply');

    history.push({ role: 'assistant', content: reply });

    // Split long messages
    const chunks = splitMessage(reply, 2000);
    for (const chunk of chunks) {
      await message.reply(chunk);
    }

    // Tone learning: detect memorable phrases (1 in 50 messages)
    if (aiConfig.toneLearningEnabled && Math.random() < 0.02) {
      detectMemorablePhrase(message, guild.id, aiConfig).catch(() => {});
    }
  } catch (err) {
    console.error('Chatbot error:', err.message);
    await message.reply(t('fr', 'bot.chatbot.error')).catch(() => {});
  }
}

async function searchFAQ(guildId, query, aiConfig) {
  const entries = await prisma.fAQEntry.findMany({ where: { guildId } });
  if (entries.length === 0) return '';

  // Try embedding-based search first
  try {
    const queryEmbedding = await getEmbedding(query, aiConfig);
    const scored = entries
      .filter(e => e.embedding.length > 0)
      .map(e => ({ ...e, score: cosineSimilarity(queryEmbedding, e.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length > 0 && scored[0].score > 0.5) {
      return scored.map(e => `Q: ${e.question}\nR: ${e.answer}`).join('\n\n');
    }
  } catch {}

  // Fallback: keyword matching
  const queryWords = query.toLowerCase().split(/\s+/);
  const matched = entries.filter(e => {
    const text = `${e.question} ${e.answer} ${e.tags.join(' ')}`.toLowerCase();
    return queryWords.some(w => w.length > 3 && text.includes(w));
  }).slice(0, 3);

  return matched.map(e => `Q: ${e.question}\nR: ${e.answer}`).join('\n\n');
}

async function loadServerMemories(guildId, query, aiConfig) {
  const memories = await prisma.serverMemory.findMany({
    where: { guildId },
    orderBy: { frequency: 'desc' },
    take: 10,
  });
  if (memories.length === 0) return '';

  // Try to find relevant memories via embedding
  try {
    const queryEmbedding = await getEmbedding(query, aiConfig);
    const scored = memories
      .filter(m => m.embedding.length > 0)
      .map(m => ({ ...m, score: cosineSimilarity(queryEmbedding, m.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (scored.length > 0 && scored[0].score > 0.3) {
      return scored.map(m => `[${m.type}] ${m.content}`).join('\n');
    }
  } catch {}

  // Fallback: return top frequency memories
  return memories.slice(0, 5).map(m => `[${m.type}] ${m.content}`).join('\n');
}

async function detectMemorablePhrase(message, guildId, aiConfig) {
  try {
    const content = await aiChat(aiConfig || {}, [{
      role: 'system',
      content: 'Analyse le message. S\'il contient une expression mémorable, un inside joke, ou un meme du serveur, réponds avec un JSON: {"memorable": true, "type": "inside_joke|meme|catchphrase", "content": "l\'expression"}. Sinon, réponds {"memorable": false}.',
    }, {
      role: 'user',
      content: message.content,
    }], { temperature: 0.3, maxTokens: 200, json: true });

    const parsed = JSON.parse(content || '{"memorable": false}');

    if (parsed.memorable && parsed.content) {
      const embedding = await getEmbedding(parsed.content, aiConfig);

      // Check for duplicates
      const existing = await prisma.serverMemory.findMany({ where: { guildId } });
      for (const mem of existing) {
        if (mem.embedding.length > 0 && cosineSimilarity(embedding, mem.embedding) > 0.85) {
          // Update frequency instead
          await prisma.serverMemory.update({
            where: { id: mem.id },
            data: { frequency: { increment: 1 }, lastSeenAt: new Date() },
          });
          return;
        }
      }

      await prisma.serverMemory.create({
        data: {
          guildId,
          type: parsed.type || 'catchphrase',
          content: parsed.content,
          embedding,
        },
      });
    }
  } catch {}
}

function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  while (text.length > 0) {
    chunks.push(text.slice(0, maxLen));
    text = text.slice(maxLen);
  }
  return chunks;
}

module.exports = { handleChatbot };
