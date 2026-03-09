const { Router } = require('express');
const { prisma } = require('shared');
const { requireRole } = require('../middleware/auth');
const Redis = require('ioredis');
const { getTemplates, getTemplateById, getPresets } = require('../modules/serverSetupTemplates');
const crypto = require('crypto');

const router = Router();
const redisPub = new Redis(process.env.REDIS_URL);

// Get guild info
router.get('/:guildId', async (req, res) => {
  // Check member role to determine what configs to include
  const member = await prisma.guildMember.findFirst({
    where: {
      user: { discordId: req.discordId },
      guild: { discordId: req.params.guildId },
    },
  });
  const role = member?.role || 'USER';
  const isAdmin = role === 'ADMIN' || role === 'OWNER';

  const guild = await prisma.guild.findUnique({
    where: { discordId: req.params.guildId },
    include: isAdmin
      ? { config: true, xpConfig: true, aiConfig: true, musicConfig: true, onboardingConfig: true }
      : { xpConfig: true },
  });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  res.json(guild);
});

// Get/Update guild config
router.get('/:guildId/config', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
  res.json(config || {});
});

router.patch('/:guildId/config', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const config = await prisma.guildConfig.upsert({
    where: { guildId: guild.id },
    update: req.body,
    create: { guildId: guild.id, ...req.body },
  });
  res.json(config);
});

// Moderation logs
router.get('/:guildId/moderation', requireRole('MOD'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const { page = 1, limit = 20, action } = req.query;
  const where = { guildId: guild.id };
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.moderationLog.findMany({
      where,
      include: {
        moderator: { include: { user: true } },
        target: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit),
    }),
    prisma.moderationLog.count({ where }),
  ]);

  res.json({ logs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
});

// XP Leaderboard
router.get('/:guildId/xp/leaderboard', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const { limit = 20 } = req.query;
  const members = await prisma.guildMember.findMany({
    where: { guildId: guild.id },
    include: { user: true },
    orderBy: { xp: 'desc' },
    take: Number(limit),
  });
  res.json(members);
});

// XP Config
router.get('/:guildId/xp/config', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const config = await prisma.xPConfig.findUnique({ where: { guildId: guild.id } });
  res.json(config || {});
});

router.patch('/:guildId/xp/config', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const config = await prisma.xPConfig.upsert({
    where: { guildId: guild.id },
    update: req.body,
    create: { guildId: guild.id, ...req.body },
  });
  res.json(config);
});

// Role rewards
router.get('/:guildId/xp/rewards', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const rewards = await prisma.roleReward.findMany({
    where: { guildId: guild.id },
    orderBy: { level: 'asc' },
  });
  res.json(rewards);
});

router.post('/:guildId/xp/rewards', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const reward = await prisma.roleReward.create({
    data: { guildId: guild.id, ...req.body },
  });
  res.json(reward);
});

router.delete('/:guildId/xp/rewards/:rewardId', requireRole('ADMIN'), async (req, res) => {
  await prisma.roleReward.delete({ where: { id: req.params.rewardId } });
  res.json({ success: true });
});

// AI Config
router.get('/:guildId/ai/config', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const config = await prisma.aIConfig.findUnique({ where: { guildId: guild.id } });
  res.json(config || {});
});

router.patch('/:guildId/ai/config', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const config = await prisma.aIConfig.upsert({
    where: { guildId: guild.id },
    update: req.body,
    create: { guildId: guild.id, ...req.body },
  });
  res.json(config);
});

// FAQ CRUD
router.get('/:guildId/ai/faq', requireRole('MOD'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const entries = await prisma.fAQEntry.findMany({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(entries);
});

router.post('/:guildId/ai/faq', requireRole('MOD'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const entry = await prisma.fAQEntry.create({
    data: { guildId: guild.id, ...req.body },
  });
  res.json(entry);
});

router.patch('/:guildId/ai/faq/:faqId', requireRole('MOD'), async (req, res) => {
  const entry = await prisma.fAQEntry.update({
    where: { id: req.params.faqId },
    data: req.body,
  });
  res.json(entry);
});

router.delete('/:guildId/ai/faq/:faqId', requireRole('MOD'), async (req, res) => {
  await prisma.fAQEntry.delete({ where: { id: req.params.faqId } });
  res.json({ success: true });
});

// AI Memories
router.get('/:guildId/ai/memories', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const memories = await prisma.serverMemory.findMany({
    where: { guildId: guild.id },
    orderBy: { lastSeenAt: 'desc' },
    take: 50,
  });
  res.json(memories);
});

router.delete('/:guildId/ai/memories/:memoryId', requireRole('ADMIN'), async (req, res) => {
  await prisma.serverMemory.delete({ where: { id: req.params.memoryId } });
  res.json({ success: true });
});

// Stats
router.get('/:guildId/stats', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const { days = 30 } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  const stats = await prisma.dailyStat.findMany({
    where: { guildId: guild.id, date: { gte: since } },
    orderBy: { date: 'asc' },
  });

  const totals = await prisma.guildMember.aggregate({
    where: { guildId: guild.id },
    _sum: { messageCount: true, xp: true, voiceMinutes: true },
    _count: true,
  });

  const modCount = await prisma.moderationLog.count({
    where: { guildId: guild.id, createdAt: { gte: since } },
  });

  const badgeCount = await prisma.badgeAward.count({
    where: { member: { guildId: guild.id } },
  });

  res.json({ stats, totals, modCount, badgeCount });
});

// Stats detailed
router.get('/:guildId/stats/detailed', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const { days = 30 } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  const [stats, voiceLeaderboard, badgeLeaderboard] = await Promise.all([
    prisma.dailyStat.findMany({
      where: { guildId: guild.id, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
    prisma.guildMember.findMany({
      where: { guildId: guild.id, voiceMinutes: { gt: 0 } },
      include: { user: true },
      orderBy: { voiceMinutes: 'desc' },
      take: 20,
    }),
    prisma.guildMember.findMany({
      where: { guildId: guild.id },
      include: { user: true, badgeAwards: true },
      orderBy: { xp: 'desc' },
      take: 20,
    }),
  ]);

  res.json({ stats, voiceLeaderboard, badgeLeaderboard });
});

// ============= BADGES =============

router.get('/:guildId/badges', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const badges = await prisma.badge.findMany({
    where: { guildId: guild.id },
    include: { _count: { select: { awards: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(badges);
});

router.post('/:guildId/badges', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const badge = await prisma.badge.create({
    data: { guildId: guild.id, ...req.body },
  });
  res.json(badge);
});

router.patch('/:guildId/badges/:badgeId', requireRole('ADMIN'), async (req, res) => {
  const badge = await prisma.badge.update({
    where: { id: req.params.badgeId },
    data: req.body,
  });
  res.json(badge);
});

router.delete('/:guildId/badges/:badgeId', requireRole('ADMIN'), async (req, res) => {
  await prisma.badge.delete({ where: { id: req.params.badgeId } });
  res.json({ success: true });
});

// ============= TRENDING TOPICS =============

router.get('/:guildId/trending', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const topics = await prisma.trendingTopic.findMany({
    where: { guildId: guild.id },
    orderBy: { detectedAt: 'desc' },
    take: 20,
  });
  res.json(topics);
});

// ============= COMMUNITY =============

// Polls
router.get('/:guildId/polls', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const polls = await prisma.poll.findMany({ where: { guildId: guild.id }, orderBy: { createdAt: 'desc' }, take: 20 });
  res.json(polls);
});

// Quotes
router.get('/:guildId/quotes', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const quotes = await prisma.quote.findMany({ where: { guildId: guild.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(quotes);
});

// Confessions
router.get('/:guildId/confessions', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const confessions = await prisma.confession.findMany({ where: { guildId: guild.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(confessions);
});

// Suggestions
router.get('/:guildId/suggestions', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const suggestions = await prisma.suggestion.findMany({ where: { guildId: guild.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(suggestions);
});

router.patch('/:guildId/suggestions/:id', requireRole('MOD'), async (req, res) => {
  const suggestion = await prisma.suggestion.update({ where: { id: req.params.id }, data: req.body });
  res.json(suggestion);
});

// Export suggestion to GitHub
router.post('/:guildId/suggestions/:id/export-github', requireRole('MOD'), async (req, res) => {
  const guild = await prisma.guild.findUnique({
    where: { discordId: req.params.guildId },
    include: { config: true },
  });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  if (!guild.config?.githubEnabled || !guild.config?.githubToken || !guild.config?.githubRepo) {
    return res.status(400).json({ error: 'GitHub integration not configured' });
  }

  const suggestion = await prisma.suggestion.findUnique({ where: { id: req.params.id } });
  if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' });

  try {
    const response = await fetch(`https://api.github.com/repos/${guild.config.githubRepo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${guild.config.githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        title: `[Suggestion] ${suggestion.content.slice(0, 80)}`,
        body: `## Suggestion Discord\n\n${suggestion.content}\n\n---\n*Par ${suggestion.authorName} | ${suggestion.upvotes.length} upvotes, ${suggestion.downvotes.length} downvotes*`,
        labels: ['suggestion', 'discord'],
      }),
    });

    const issue = await response.json();
    res.json({ success: true, issueUrl: issue.html_url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create GitHub issue' });
  }
});

// Reaction roles
router.get('/:guildId/reactionroles', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const rrs = await prisma.reactionRole.findMany({ where: { guildId: guild.id } });
  res.json(rrs);
});

router.delete('/:guildId/reactionroles/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.reactionRole.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ============= GAMES =============

router.get('/:guildId/games/pets', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const pets = await prisma.pet.findMany({
    where: { guildId: guild.id },
    include: { member: { include: { user: true } } },
    orderBy: { level: 'desc' },
    take: 20,
  });
  res.json(pets);
});

router.get('/:guildId/games/rpg', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const characters = await prisma.rPGCharacter.findMany({
    where: { guildId: guild.id },
    include: { member: { include: { user: true } } },
    orderBy: { level: 'desc' },
    take: 20,
  });
  res.json(characters);
});

// ============= CREATURES =============

router.get('/:guildId/creatures', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const creatures = await prisma.creature.findMany({
    where: { guildId: guild.id },
    orderBy: { rarity: 'asc' },
  });
  res.json(creatures);
});

router.get('/:guildId/creatures/collection', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const collectors = await prisma.guildMember.findMany({
    where: { guildId: guild.id },
    include: {
      user: true,
      _count: { select: { collectedCreatures: true } },
    },
    orderBy: { collectedCreatures: { _count: 'desc' } },
    take: 20,
  });
  res.json(collectors.filter(c => c._count.collectedCreatures > 0));
});

// ============= PLAYLISTS =============

router.get('/:guildId/playlists', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const playlists = await prisma.playlist.findMany({
    where: { guildId: guild.id },
    include: { _count: { select: { tracks: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(playlists);
});

router.get('/:guildId/playlists/:playlistId', async (req, res) => {
  const playlist = await prisma.playlist.findUnique({
    where: { id: req.params.playlistId },
    include: { tracks: { orderBy: { position: 'asc' } } },
  });
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  res.json(playlist);
});

router.delete('/:guildId/playlists/:playlistId', requireRole('ADMIN'), async (req, res) => {
  await prisma.playlist.delete({ where: { id: req.params.playlistId } });
  res.json({ success: true });
});

// ============= CRYPTO ALERTS =============

router.get('/:guildId/crypto/alerts', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const alerts = await prisma.cryptoAlert.findMany({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(alerts);
});

router.delete('/:guildId/crypto/alerts/:alertId', requireRole('ADMIN'), async (req, res) => {
  await prisma.cryptoAlert.delete({ where: { id: req.params.alertId } });
  res.json({ success: true });
});

// ============= EVENT TEMPLATES =============

router.get('/:guildId/events/templates', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const templates = await prisma.eventTemplate.findMany({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(templates);
});

router.post('/:guildId/events/templates', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const template = await prisma.eventTemplate.create({
    data: { guildId: guild.id, ...req.body },
  });
  res.json(template);
});

router.patch('/:guildId/events/templates/:templateId', requireRole('ADMIN'), async (req, res) => {
  const template = await prisma.eventTemplate.update({
    where: { id: req.params.templateId },
    data: req.body,
  });
  res.json(template);
});

router.delete('/:guildId/events/templates/:templateId', requireRole('ADMIN'), async (req, res) => {
  await prisma.eventTemplate.delete({ where: { id: req.params.templateId } });
  res.json({ success: true });
});

// ============= DAILY RECAPS =============

router.get('/:guildId/recaps', async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const recaps = await prisma.dailyRecap.findMany({ where: { guildId: guild.id }, orderBy: { date: 'desc' }, take: 30 });
  res.json(recaps);
});

// ============= ONBOARDING =============

router.get('/:guildId/onboarding', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const config = await prisma.onboardingConfig.findUnique({ where: { guildId: guild.id } });
  res.json(config || {});
});

router.patch('/:guildId/onboarding', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const config = await prisma.onboardingConfig.upsert({
    where: { guildId: guild.id },
    update: req.body,
    create: { guildId: guild.id, ...req.body },
  });
  res.json(config);
});

// ============= MUSIC =============

router.get('/:guildId/music/config', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const config = await prisma.musicConfig.findUnique({ where: { guildId: guild.id } });
  res.json(config || {});
});

router.patch('/:guildId/music/config', requireRole('ADMIN'), async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { discordId: req.params.guildId } });
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const config = await prisma.musicConfig.upsert({
    where: { guildId: guild.id },
    update: req.body,
    create: { guildId: guild.id, ...req.body },
  });
  res.json(config);
});

// ============= SERVER SETUP =============

// Get predefined templates (summary)
router.get('/:guildId/setup/templates', requireRole('ADMIN'), async (req, res) => {
  res.json(getTemplates());
});

// Get a single predefined template
router.get('/:guildId/setup/templates/:id', requireRole('ADMIN'), async (req, res) => {
  const template = getTemplateById(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
});

// Get presets
router.get('/:guildId/setup/presets', requireRole('ADMIN'), async (req, res) => {
  res.json(getPresets());
});

// Get community templates (public, sorted by uses)
router.get('/:guildId/setup/community', async (req, res) => {
  const templates = await prisma.setupTemplate.findMany({
    where: { isPublic: true },
    orderBy: [{ uses: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });
  res.json(templates);
});

// Get a single community template
router.get('/:guildId/setup/community/:id', async (req, res) => {
  const template = await prisma.setupTemplate.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
});

// Save a community template
router.post('/:guildId/setup/community', requireRole('ADMIN'), async (req, res) => {
  const { name, description, icon, tags, roles, categories, isPublic } = req.body;

  // Get username from DB
  const user = await prisma.user.findFirst({ where: { discordId: req.discordId } });

  const template = await prisma.setupTemplate.create({
    data: {
      name,
      description,
      icon: icon || '📋',
      tags: tags || [],
      roles: roles || [],
      categories: categories || [],
      authorId: req.discordId,
      authorName: user?.username || 'Unknown',
      sourceGuildId: req.params.guildId,
      isPublic: isPublic || false,
    },
  });
  res.json(template);
});

// Like a community template
router.post('/:guildId/setup/community/:id/like', async (req, res) => {
  const template = await prisma.setupTemplate.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const userId = req.discordId;
  const alreadyLiked = template.likes.includes(userId);

  const updated = await prisma.setupTemplate.update({
    where: { id: req.params.id },
    data: {
      likes: alreadyLiked
        ? template.likes.filter(id => id !== userId)
        : [...template.likes, userId],
    },
  });
  res.json(updated);
});

// Delete own community template
router.delete('/:guildId/setup/community/:id', async (req, res) => {
  const template = await prisma.setupTemplate.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  if (template.authorId !== req.discordId) return res.status(403).json({ error: 'Not your template' });

  await prisma.setupTemplate.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Apply setup (template/preset/custom/community)
router.post('/:guildId/setup/apply', requireRole('ADMIN'), async (req, res) => {
  const { source, templateId, communityTemplateId, roles, categories } = req.body;
  const requestId = crypto.randomUUID();

  let setupRoles = roles || [];
  let setupCategories = categories || [];

  // If applying a predefined template
  if (source === 'template' && templateId) {
    const template = getTemplateById(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    setupRoles = template.roles;
    setupCategories = template.categories;
  }

  // If applying a community template
  if (source === 'community' && communityTemplateId) {
    const template = await prisma.setupTemplate.findUnique({ where: { id: communityTemplateId } });
    if (!template) return res.status(404).json({ error: 'Community template not found' });
    setupRoles = template.roles;
    setupCategories = template.categories;
  }

  redisPub.publish('api-commands', JSON.stringify({
    type: 'setup:apply',
    guildId: req.params.guildId,
    requestId,
    roles: setupRoles,
    categories: setupCategories,
    communityTemplateId: communityTemplateId || null,
  }));

  res.json({ requestId });
});

module.exports = router;
