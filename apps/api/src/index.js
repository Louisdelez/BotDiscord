require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const guildRoutes = require('./routes/guilds');
const musicRoutes = require('./routes/music');
const gameRoutes = require('./routes/games');
const { errorHandler } = require('./middleware/error');
const { authMiddleware } = require('./middleware/auth');
const { handleWsMessage } = require('./modules/wsHandler');
const webPlayerSessions = require('./modules/webPlayerSessions');
const watchTogetherSessions = require('./modules/watchTogetherSessions');
const gameSessions = require('./modules/gameSessions');

const app = express();
const server = http.createServer(app);

// Redis pub/sub
const redisSub = new Redis(process.env.REDIS_URL);
const redisPub = new Redis(process.env.REDIS_URL);
redisSub.subscribe('bot-events', 'voice-state-updates');

// WebSocket
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Map();

wss.on('connection', (ws, req) => {
  // Auth: parse token from query string
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      ws.userId = payload.userId;
      ws.discordId = payload.discordId;
      ws.username = payload.username || 'Unknown';
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }
  }

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      // Guild subscription (existing behavior)
      if (data.type === 'subscribe' && data.guildId) {
        ws.guildId = data.guildId;
        if (!wsClients.has(data.guildId)) wsClients.set(data.guildId, new Set());
        wsClients.get(data.guildId).add(ws);
      }
      // Route all messages through handler
      handleWsMessage(ws, msg, redisPub);
    } catch {}
  });

  ws.on('close', () => {
    if (ws.guildId && wsClients.has(ws.guildId)) {
      wsClients.get(ws.guildId).delete(ws);
    }
    // Clean up web player session
    if (ws.webPlayerChannel) {
      webPlayerSessions.leaveSession(ws.webPlayerChannel, ws.userId);
    }
    // Clean up WatchTogether session
    if (ws.watchTogetherChannel) {
      watchTogetherSessions.leaveSession(ws.watchTogetherChannel, ws.userId);
    }
    // Clean up game session
    if (ws.discordId) {
      gameSessions.handleDisconnect(ws.discordId);
    }
  });
});

// Set up game sessions broadcast to guild
gameSessions.setBroadcastToGuild((guildId, payload) => {
  const clients = wsClients.get(guildId);
  if (clients) {
    clients.forEach(ws => {
      if (ws.readyState === 1) ws.send(payload);
    });
  }
});

// Redis message handler
redisSub.on('message', (channel, message) => {
  try {
    const event = JSON.parse(message);

    if (channel === 'bot-events') {
      const clients = wsClients.get(event.guildId);
      if (clients) {
        const payload = JSON.stringify(event);
        clients.forEach(ws => {
          if (ws.readyState === 1) ws.send(payload);
        });
      }
    }

    if (channel === 'voice-state-updates') {
      // Auto-eject from web player when user leaves voice channel
      if (event.oldChannelId && !event.channelId) {
        webPlayerSessions.handleVoiceLeave(event.guildId, event.userId);
        watchTogetherSessions.handleVoiceLeave(event.guildId, event.userId);
      }
    }
  } catch {}
});

// Web player heartbeat
setInterval(() => {
  webPlayerSessions.heartbeat();
  watchTogetherSessions.heartbeat();
}, 5000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Public routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);

// Protected routes
app.use('/guilds', authMiddleware, guildRoutes);
app.use('/guilds', authMiddleware, musicRoutes);
app.use('/guilds', authMiddleware, gameRoutes);

app.use(errorHandler);

const PORT = process.env.API_PORT || 3001;
server.listen(PORT, () => console.log(`API running on port ${PORT}`));
