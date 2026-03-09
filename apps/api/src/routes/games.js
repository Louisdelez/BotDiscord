const express = require('express');
const { prisma } = require('shared');
const router = express.Router();
const gameSessions = require('../modules/gameSessions');

// Create a game session
router.post('/:guildId/games', async (req, res) => {
  const { guildId } = req.params;
  const { gameType } = req.body;
  const discordId = req.discordId;

  // Fetch username from DB
  const user = await prisma.user.findUnique({
    where: { discordId },
    select: { username: true },
  });
  const username = user?.username || 'Unknown';

  const result = gameSessions.createSession(gameType, guildId, discordId, username);
  if (result.error) {
    return res.status(400).json({ error: result.error, sessionId: result.sessionId });
  }

  res.json({ sessionId: result.sessionId });
});

// List active game sessions for a guild
router.get('/:guildId/games', (req, res) => {
  const { guildId } = req.params;
  const lobbySessions = gameSessions.getGuildSessions(guildId);
  res.json(lobbySessions);
});

// Get a specific session
router.get('/:guildId/games/:sessionId', (req, res) => {
  const session = gameSessions.getSession(req.params.sessionId);
  if (!session || session.guildId !== req.params.guildId) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const players = Array.from(session.players.entries()).map(([id, p]) => ({
    id,
    username: p.username,
    playerNumber: p.playerNumber,
  }));

  res.json({
    id: session.id,
    gameType: session.gameType,
    guildId: session.guildId,
    hostId: session.hostId,
    phase: session.phase,
    playerCount: session.players.size,
    maxPlayers: session.config.maxPlayers,
    players,
  });
});

module.exports = router;
