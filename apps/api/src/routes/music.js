const { Router } = require('express');
const Redis = require('ioredis');
const webPlayerSessions = require('../modules/webPlayerSessions');
const watchTogetherSessions = require('../modules/watchTogetherSessions');

const router = Router({ mergeParams: true });
const redisPub = new Redis(process.env.REDIS_URL);

// --- Feature 1: Bot music control (REST) ---

router.post('/:guildId/music/skip', (req, res) => {
  redisPub.publish('api-commands', JSON.stringify({ type: 'music:skip', guildId: req.params.guildId }));
  res.json({ ok: true });
});

router.post('/:guildId/music/pause', (req, res) => {
  redisPub.publish('api-commands', JSON.stringify({ type: 'music:pause', guildId: req.params.guildId }));
  res.json({ ok: true });
});

router.post('/:guildId/music/resume', (req, res) => {
  redisPub.publish('api-commands', JSON.stringify({ type: 'music:resume', guildId: req.params.guildId }));
  res.json({ ok: true });
});

router.post('/:guildId/music/stop', (req, res) => {
  redisPub.publish('api-commands', JSON.stringify({ type: 'music:stop', guildId: req.params.guildId }));
  res.json({ ok: true });
});

router.post('/:guildId/music/volume', (req, res) => {
  const volume = Number(req.body.volume);
  if (isNaN(volume)) return res.status(400).json({ error: 'Invalid volume' });
  redisPub.publish('api-commands', JSON.stringify({ type: 'music:volume', guildId: req.params.guildId, volume }));
  res.json({ ok: true });
});

router.post('/:guildId/music/add', (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  redisPub.publish('api-commands', JSON.stringify({ type: 'music:add', guildId: req.params.guildId, query }));
  res.json({ ok: true });
});

router.get('/:guildId/music/state', (req, res) => {
  redisPub.publish('api-commands', JSON.stringify({ type: 'music:getState', guildId: req.params.guildId }));
  res.json({ ok: true, message: 'State will be sent via WebSocket' });
});

// --- Feature 2: Web Player ---

router.get('/:guildId/voice-channels', async (req, res) => {
  try {
    const redis = new Redis(process.env.REDIS_URL);
    const keys = await redis.keys(`voicemembers:${req.params.guildId}:*`);
    const channels = [];

    for (const key of keys) {
      const channelId = key.split(':')[2];
      const members = await redis.smembers(key);
      if (members.length > 0) {
        channels.push({ channelId, members });
      }
    }

    redis.disconnect();
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch voice channels' });
  }
});

router.get('/:guildId/channels/:channelId/webplayer/state', (req, res) => {
  const session = webPlayerSessions.getSession(req.params.channelId);
  if (!session) return res.json({ active: false });
  res.json({
    active: true,
    tracks: session.tracks,
    currentIndex: session.currentIndex,
    playing: session.playing,
    startedAt: session.startedAt,
    pausedAt: session.pausedAt,
    volume: session.volume,
  });
});

// --- Feature 3: WatchTogether ---

router.get('/:guildId/channels/:channelId/watchtogether/state', (req, res) => {
  const session = watchTogetherSessions.getSession(req.params.channelId);
  if (!session) return res.json({ active: false });
  res.json({
    active: true,
    queue: session.queue,
    currentIndex: session.currentIndex,
    playing: session.playing,
    startedAt: session.startedAt,
    pausedAt: session.pausedAt,
    volume: session.volume,
  });
});

module.exports = router;
