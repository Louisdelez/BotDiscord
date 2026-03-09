const webPlayerSessions = require('./webPlayerSessions');
const watchTogetherSessions = require('./watchTogetherSessions');
const gameSessions = require('./gameSessions');

function handleWsMessage(ws, msg, redisPub) {
  let data;
  try {
    data = JSON.parse(msg);
  } catch {
    return;
  }

  const { type, guildId } = data;

  switch (type) {
    case 'subscribe':
      // Handled in index.js already
      break;

    // Bot music controls — forward to bot via Redis
    case 'music:skip':
    case 'music:pause':
    case 'music:resume':
    case 'music:stop':
    case 'music:getState':
      redisPub.publish('api-commands', JSON.stringify({ type, guildId }));
      break;

    case 'music:volume':
      redisPub.publish('api-commands', JSON.stringify({ type, guildId, volume: data.volume }));
      break;

    case 'music:add':
      redisPub.publish('api-commands', JSON.stringify({ type, guildId, query: data.query }));
      break;

    // Web player controls
    case 'webplayer:join':
      webPlayerSessions.joinSession(data.channelId, guildId, ws.userId, ws.username, ws);
      break;

    case 'webplayer:leave':
      webPlayerSessions.leaveSession(data.channelId, ws.userId);
      break;

    case 'webplayer:add':
      webPlayerSessions.addTrack(data.channelId, data.track, ws.userId);
      break;

    case 'webplayer:skip':
      webPlayerSessions.skip(data.channelId);
      break;

    case 'webplayer:pause':
      webPlayerSessions.pause(data.channelId);
      break;

    case 'webplayer:resume':
      webPlayerSessions.resume(data.channelId);
      break;

    case 'webplayer:seek':
      webPlayerSessions.seek(data.channelId, data.position);
      break;

    // WatchTogether controls
    case 'watch:join':
      watchTogetherSessions.joinSession(data.channelId, guildId, ws.userId, ws.username, ws);
      break;

    case 'watch:leave':
      watchTogetherSessions.leaveSession(data.channelId, ws.userId);
      break;

    case 'watch:add':
      watchTogetherSessions.addVideo(data.channelId, data.video, ws.userId);
      break;

    case 'watch:skip':
      watchTogetherSessions.skip(data.channelId);
      break;

    case 'watch:pause':
      watchTogetherSessions.pause(data.channelId);
      break;

    case 'watch:resume':
      watchTogetherSessions.resume(data.channelId);
      break;

    case 'watch:seek':
      watchTogetherSessions.seek(data.channelId, data.position);
      break;

    // Game session controls
    case 'game:join': {
      const joinResult = gameSessions.joinSession(data.sessionId, ws.discordId, ws.username, ws);
      if (joinResult.error) {
        ws.send(JSON.stringify({ type: 'game:error', error: joinResult.error, sessionId: joinResult.sessionId }));
      }
      break;
    }

    case 'game:leave':
      gameSessions.leaveSession(data.sessionId, ws.discordId);
      break;

    case 'game:start': {
      const startResult = gameSessions.startGame(data.sessionId, ws.discordId);
      if (startResult.error) {
        ws.send(JSON.stringify({ type: 'game:error', error: startResult.error }));
      }
      break;
    }

    case 'game:action': {
      const actionResult = gameSessions.handleAction(data.sessionId, ws.discordId, data.action);
      if (actionResult.error) {
        ws.send(JSON.stringify({ type: 'game:error', error: actionResult.error }));
      }
      break;
    }

    case 'game:rematch': {
      const rematchResult = gameSessions.rematch(data.sessionId, ws.discordId);
      if (rematchResult.error) {
        ws.send(JSON.stringify({ type: 'game:error', error: rematchResult.error }));
      }
      break;
    }
  }
}

module.exports = { handleWsMessage };
