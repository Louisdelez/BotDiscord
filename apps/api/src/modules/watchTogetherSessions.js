// WatchTogether session manager — one session per voice channel
const sessions = new Map(); // channelId -> Session
const cleanupTimers = new Map(); // channelId -> timeout

function getSession(channelId) {
  return sessions.get(channelId) || null;
}

function joinSession(channelId, guildId, userId, username, ws) {
  if (cleanupTimers.has(channelId)) {
    clearTimeout(cleanupTimers.get(channelId));
    cleanupTimers.delete(channelId);
  }

  let session = sessions.get(channelId);
  if (!session) {
    session = {
      guildId,
      channelId,
      queue: [],
      currentIndex: 0,
      startedAt: null,
      playing: false,
      pausedAt: null,
      volume: 80,
      listeners: new Map(),
    };
    sessions.set(channelId, session);
  }

  if (session.listeners.has(userId)) {
    session.listeners.delete(userId);
  }

  session.listeners.set(userId, { ws, username });
  ws.watchTogetherChannel = channelId;

  broadcastState(channelId);
}

function leaveSession(channelId, userId) {
  const session = sessions.get(channelId);
  if (!session) return;

  session.listeners.delete(userId);

  if (session.listeners.size === 0) {
    const timer = setTimeout(() => {
      sessions.delete(channelId);
      cleanupTimers.delete(channelId);
    }, 30000);
    cleanupTimers.set(channelId, timer);
  } else {
    broadcastState(channelId);
  }
}

function addVideo(channelId, videoInfo, userId) {
  const session = sessions.get(channelId);
  if (!session) return;

  session.queue.push({ ...videoInfo, addedBy: userId });

  if (session.queue.length === 1 && !session.playing) {
    session.currentIndex = 0;
    session.startedAt = Date.now();
    session.playing = true;
    session.pausedAt = null;
  }

  broadcastState(channelId);
}

function skip(channelId) {
  const session = sessions.get(channelId);
  if (!session) return;

  if (session.currentIndex < session.queue.length - 1) {
    session.currentIndex++;
    session.startedAt = Date.now();
    session.playing = true;
    session.pausedAt = null;
  } else {
    session.playing = false;
    session.startedAt = null;
    session.pausedAt = null;
  }

  broadcastState(channelId);
}

function pause(channelId) {
  const session = sessions.get(channelId);
  if (!session || !session.playing) return;

  session.pausedAt = (Date.now() - session.startedAt) / 1000;
  session.playing = false;
  broadcastState(channelId);
}

function resume(channelId) {
  const session = sessions.get(channelId);
  if (!session || session.playing) return;
  if (session.pausedAt == null) return;

  session.startedAt = Date.now() - session.pausedAt * 1000;
  session.pausedAt = null;
  session.playing = true;
  broadcastState(channelId);
}

function seek(channelId, position) {
  const session = sessions.get(channelId);
  if (!session) return;

  if (session.playing) {
    session.startedAt = Date.now() - position * 1000;
  } else {
    session.pausedAt = position;
  }

  broadcastState(channelId);
}

function broadcastState(channelId) {
  const session = sessions.get(channelId);
  if (!session) return;

  const state = serializeState(session);
  const payload = JSON.stringify({ type: 'watch:state', channelId, data: state });

  session.listeners.forEach(({ ws }) => {
    if (ws.readyState === 1) ws.send(payload);
  });
}

function serializeState(session) {
  return {
    guildId: session.guildId,
    channelId: session.channelId,
    queue: session.queue,
    currentIndex: session.currentIndex,
    currentVideo: session.queue[session.currentIndex] || null,
    startedAt: session.startedAt,
    playing: session.playing,
    pausedAt: session.pausedAt,
    volume: session.volume,
    listeners: Array.from(session.listeners.entries()).map(([id, { username }]) => ({ id, username })),
  };
}

function heartbeat() {
  sessions.forEach((session, channelId) => {
    if (session.listeners.size === 0) return;

    const sync = JSON.stringify({
      type: 'watch:sync',
      channelId,
      data: {
        playing: session.playing,
        startedAt: session.startedAt,
        pausedAt: session.pausedAt,
        currentIndex: session.currentIndex,
      },
    });

    session.listeners.forEach(({ ws }) => {
      if (ws.readyState === 1) ws.send(sync);
    });
  });
}

function handleVoiceLeave(guildId, userId) {
  sessions.forEach((session, channelId) => {
    if (session.guildId === guildId && session.listeners.has(userId)) {
      leaveSession(channelId, userId);
    }
  });
}

module.exports = {
  getSession,
  joinSession,
  leaveSession,
  addVideo,
  skip,
  pause,
  resume,
  seek,
  broadcastState,
  heartbeat,
  handleVoiceLeave,
};
