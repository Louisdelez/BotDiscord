// Game session manager — handles online multiplayer game sessions
const { Connect4Engine } = require('./gameEngines/Connect4Engine');

// Lazy-load engines to avoid crashes if some aren't ready yet
function loadEngine(name) {
  try {
    return require(`./gameEngines/${name}`);
  } catch (e) {
    console.warn(`Game engine ${name} not available:`, e.message);
    return null;
  }
}

const GAME_CONFIGS = {
  connect4: { minPlayers: 2, maxPlayers: 2, engineModule: 'Connect4Engine', engineClass: 'Connect4Engine' },
  chess:    { minPlayers: 2, maxPlayers: 2, engineModule: 'ChessEngine', engineClass: 'ChessEngine' },
  shogi:    { minPlayers: 2, maxPlayers: 2, engineModule: 'ShogiEngine', engineClass: 'ShogiEngine' },
  go:       { minPlayers: 2, maxPlayers: 2, engineModule: 'GoEngine', engineClass: 'GoEngine' },
  uno:      { minPlayers: 2, maxPlayers: 10, engineModule: 'UnoEngine', engineClass: 'UnoEngine' },
  jass:     { minPlayers: 4, maxPlayers: 4, engineModule: 'JassEngine', engineClass: 'JassEngine' },
  poker:    { minPlayers: 2, maxPlayers: 8, engineModule: 'PokerEngine', engineClass: 'PokerEngine' },
  mahjong:  { minPlayers: 4, maxPlayers: 4, engineModule: 'MahjongEngine', engineClass: 'MahjongEngine' },
  monopoly: { minPlayers: 2, maxPlayers: 6, engineModule: 'MonopolyEngine', engineClass: 'MonopolyEngine' },
  werewolf: { minPlayers: 6, maxPlayers: 12, engineModule: 'WerewolfEngine', engineClass: 'WerewolfEngine' },
};

const sessions = new Map(); // sessionId -> Session
const cleanupTimers = new Map(); // sessionId -> timeout
const userSessions = new Map(); // discordId -> sessionId (one active game per user)

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function createEngineInstance(gameType, playerCount, options = {}) {
  const config = GAME_CONFIGS[gameType];
  const mod = loadEngine(config.engineModule);
  if (!mod) return null;
  const Engine = mod[config.engineClass];
  if (!Engine) return null;

  switch (gameType) {
    case 'go':
      return new Engine(options.boardSize || 19);
    case 'uno':
    case 'poker':
    case 'monopoly':
    case 'werewolf':
      return new Engine(playerCount);
    case 'jass':
    case 'mahjong':
      return new Engine();
    default:
      return new Engine();
  }
}

function createSession(gameType, guildId, hostId, hostUsername, options = {}) {
  const config = GAME_CONFIGS[gameType];
  if (!config) return { error: 'Unknown game type' };

  // Check if user already in a session
  if (userSessions.has(hostId)) {
    const existingId = userSessions.get(hostId);
    const existing = sessions.get(existingId);
    if (existing && existing.phase !== 'finished') {
      return { error: 'Already in a game session', sessionId: existingId };
    }
    userSessions.delete(hostId);
  }

  const sessionId = generateId();
  const session = {
    id: sessionId,
    gameType,
    guildId,
    hostId,
    phase: 'lobby', // lobby | playing | finished
    players: new Map(), // discordId -> { username, playerNumber, ws }
    spectators: new Map(), // discordId -> { username, ws }
    engine: null,
    config,
    options, // game-specific options (e.g. board size for Go)
    createdAt: Date.now(),
  };

  session.players.set(hostId, { username: hostUsername, playerNumber: 1, ws: null });
  userSessions.set(hostId, sessionId);
  sessions.set(sessionId, session);

  return { sessionId, session };
}

function joinSession(sessionId, userId, username, ws) {
  const session = sessions.get(sessionId);
  if (!session) return { error: 'Session not found' };

  // Already in this session — reconnect
  if (session.players.has(userId)) {
    const player = session.players.get(userId);
    player.ws = ws;
    player.username = username;
    ws.gameSessionId = sessionId;
    broadcastState(sessionId);
    return { success: true, playerNumber: player.playerNumber };
  }

  if (session.spectators.has(userId)) {
    session.spectators.get(userId).ws = ws;
    ws.gameSessionId = sessionId;
    broadcastState(sessionId);
    return { success: true, spectator: true };
  }

  // Join as player if room available and in lobby
  if (session.phase === 'lobby' && session.players.size < session.config.maxPlayers) {
    if (userSessions.has(userId)) {
      const existingId = userSessions.get(userId);
      const existing = sessions.get(existingId);
      if (existing && existing.phase !== 'finished') {
        return { error: 'Already in another game session', sessionId: existingId };
      }
      userSessions.delete(userId);
    }

    const playerNumber = session.players.size + 1;
    session.players.set(userId, { username, playerNumber, ws });
    ws.gameSessionId = sessionId;
    userSessions.set(userId, sessionId);
    broadcastState(sessionId);
    return { success: true, playerNumber };
  }

  // Join as spectator
  if (session.phase !== 'finished') {
    session.spectators.set(userId, { username, ws });
    ws.gameSessionId = sessionId;
    broadcastState(sessionId);
    return { success: true, spectator: true };
  }

  return { error: 'Cannot join this session' };
}

function leaveSession(sessionId, userId) {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.spectators.delete(userId);

  if (session.players.has(userId)) {
    const player = session.players.get(userId);
    player.ws = null;

    if (session.phase === 'lobby') {
      session.players.delete(userId);
      userSessions.delete(userId);

      if (session.players.size === 0) {
        scheduleCleanup(sessionId);
        return;
      }

      if (session.hostId === userId) {
        session.hostId = session.players.keys().next().value;
      }

      let num = 1;
      for (const [, p] of session.players) {
        p.playerNumber = num++;
      }
    }

    if (session.phase === 'playing') {
      let allDisconnected = true;
      for (const [, p] of session.players) {
        if (p.ws) { allDisconnected = false; break; }
      }
      if (allDisconnected) {
        scheduleCleanup(sessionId);
        return;
      }
    }
  }

  broadcastState(sessionId);
}

function startGame(sessionId, userId) {
  const session = sessions.get(sessionId);
  if (!session) return { error: 'Session not found' };
  if (session.hostId !== userId) return { error: 'Only the host can start' };
  if (session.phase !== 'lobby') return { error: 'Game already started' };
  if (session.players.size < session.config.minPlayers) {
    return { error: `Need at least ${session.config.minPlayers} players` };
  }

  const engine = createEngineInstance(session.gameType, session.players.size, session.options);
  if (!engine) {
    return { error: 'Game engine not available' };
  }

  session.engine = engine;
  session.phase = 'playing';
  broadcastState(sessionId);
  return { success: true };
}

function handleAction(sessionId, userId, action) {
  const session = sessions.get(sessionId);
  if (!session) return { error: 'Session not found' };
  if (session.phase !== 'playing') return { error: 'Game not in progress' };

  const player = session.players.get(userId);
  if (!player) return { error: 'Not a player in this game' };

  const playerIndex = player.playerNumber - 1; // 0-based

  // Route to game-specific handler
  let result;
  switch (session.gameType) {
    case 'connect4':
      result = handleConnect4Action(session, player, action);
      break;
    case 'chess':
      result = handleChessAction(session, player, action);
      break;
    case 'shogi':
      result = handleShogiAction(session, player, action);
      break;
    case 'go':
      result = handleGoAction(session, player, action);
      break;
    case 'uno':
      result = handleUnoAction(session, player, playerIndex, action);
      break;
    case 'jass':
      result = handleJassAction(session, player, playerIndex, action);
      break;
    case 'poker':
      result = handlePokerAction(session, player, playerIndex, action);
      break;
    case 'mahjong':
      result = handleMahjongAction(session, player, playerIndex, action);
      break;
    case 'monopoly':
      result = handleMonopolyAction(session, player, playerIndex, action);
      break;
    case 'werewolf':
      result = handleWerewolfAction(session, player, playerIndex, action);
      break;
    default:
      result = { error: 'Unknown game type' };
  }

  return result;
}

// =================== CONNECT4 ===================
function handleConnect4Action(session, player, action) {
  if (session.engine.currentPlayer !== player.playerNumber) {
    return { error: 'Not your turn' };
  }
  if (action.type !== 'drop') return { error: 'Invalid action' };

  const col = parseInt(action.col, 10);
  if (isNaN(col) || col < 0 || col > 6) return { error: 'Invalid column' };

  const success = session.engine.dropPiece(col);
  if (!success) return { error: 'Cannot drop in this column' };

  checkGameOver(session);
  broadcastState(session.id);
  return { success: true };
}

// =================== CHESS ===================
function handleChessAction(session, player, action) {
  const engine = session.engine;
  // Player 1 = white, Player 2 = black
  if (engine.currentPlayer !== player.playerNumber) {
    return { error: 'Not your turn' };
  }

  if (action.type === 'move') {
    const success = engine.move(action.from, action.to, action.promotion);
    if (!success) return { error: 'Invalid move' };
    checkGameOver(session);
    broadcastState(session.id);
    return { success: true };
  }

  return { error: 'Invalid action' };
}

// =================== SHOGI ===================
function handleShogiAction(session, player, action) {
  const engine = session.engine;
  if (engine.currentPlayer !== player.playerNumber) {
    // Allow getLegalMoves/getLegalDrops queries for current player
    if (action.type === 'getLegalMoves' || action.type === 'getLegalDrops') {
      // These are read-only queries, allow them
    } else {
      return { error: 'Not your turn' };
    }
  }

  switch (action.type) {
    case 'move': {
      const success = engine.move(action.fromRow, action.fromCol, action.toRow, action.toCol, action.promote);
      if (!success) return { error: 'Invalid move' };
      checkGameOver(session);
      broadcastState(session.id);
      return { success: true };
    }
    case 'drop': {
      const success = engine.drop(action.pieceType, action.row, action.col);
      if (!success) return { error: 'Invalid drop' };
      checkGameOver(session);
      broadcastState(session.id);
      return { success: true };
    }
    case 'getLegalMoves': {
      const moves = engine.getLegalMoves(action.row, action.col);
      // Send moves back to requesting player only
      const ws = player.ws;
      if (ws?.readyState === 1) {
        ws.send(JSON.stringify({ type: 'game:legalMoves', sessionId: session.id, moves }));
      }
      return { success: true };
    }
    case 'getLegalDrops': {
      const drops = engine.getLegalDrops(action.pieceType);
      const ws = player.ws;
      if (ws?.readyState === 1) {
        ws.send(JSON.stringify({ type: 'game:legalDrops', sessionId: session.id, drops }));
      }
      return { success: true };
    }
    default:
      return { error: 'Invalid action' };
  }
}

// =================== GO ===================
function handleGoAction(session, player, action) {
  const engine = session.engine;
  const playerColor = player.playerNumber === 1 ? 'black' : 'white';

  if (action.type === 'confirmScore') {
    if (typeof engine.confirmScoring === 'function') {
      engine.confirmScoring();
      session.phase = 'finished';
      scheduleCleanup(session.id, 300000);
      broadcastState(session.id);
      return { success: true };
    }
    return { error: 'Cannot confirm score' };
  }

  if (engine.currentPlayer !== playerColor) {
    return { error: 'Not your turn' };
  }

  switch (action.type) {
    case 'place': {
      const result = engine.placeStone(action.row, action.col);
      if (!result.success) return { error: result.error || 'Invalid move' };
      broadcastState(session.id);
      return { success: true };
    }
    case 'pass': {
      engine.pass();
      if (engine.phase === 'scoring') {
        // Don't end game yet — wait for confirmScore
      }
      broadcastState(session.id);
      return { success: true };
    }
    default:
      return { error: 'Invalid action' };
  }
}

// =================== UNO ===================
function handleUnoAction(session, player, playerIndex, action) {
  const engine = session.engine;
  if (engine.currentPlayerIndex !== playerIndex) {
    return { error: 'Not your turn' };
  }

  switch (action.type) {
    case 'playCard': {
      const success = engine.playCard(playerIndex, action.cardIndex);
      if (!success) return { error: 'Cannot play this card' };
      checkGameOver(session);
      broadcastState(session.id);
      return { success: true };
    }
    case 'drawCard': {
      const success = engine.drawCard(playerIndex);
      if (!success) return { error: 'Cannot draw' };
      broadcastState(session.id);
      return { success: true };
    }
    case 'chooseColor': {
      if (typeof engine.chooseColor === 'function') {
        engine.chooseColor(action.color);
        broadcastState(session.id);
        return { success: true };
      }
      return { error: 'Cannot choose color now' };
    }
    case 'endTurn': {
      if (typeof engine.endTurn === 'function') {
        engine.endTurn();
        broadcastState(session.id);
        return { success: true };
      }
      return { error: 'Cannot end turn' };
    }
    default:
      return { error: 'Invalid action' };
  }
}

// =================== JASS ===================
function handleJassAction(session, player, playerIndex, action) {
  const engine = session.engine;

  switch (action.type) {
    case 'playCard': {
      if (engine.currentPlayer !== playerIndex) return { error: 'Not your turn' };
      const success = engine.playCard(playerIndex, action.cardIndex);
      if (!success) return { error: 'Cannot play this card' };
      checkGameOver(session);
      broadcastState(session.id);
      return { success: true };
    }
    case 'chooseTrump': {
      if (typeof engine.chooseTrump === 'function') {
        const success = engine.chooseTrump(action.trump);
        if (!success) return { error: 'Cannot choose trump' };
        broadcastState(session.id);
        return { success: true };
      }
      return { error: 'Invalid action' };
    }
    default:
      return { error: 'Invalid action' };
  }
}

// =================== POKER ===================
function handlePokerAction(session, player, playerIndex, action) {
  const engine = session.engine;
  if (engine.currentPlayer !== playerIndex) return { error: 'Not your turn' };

  let success = false;
  switch (action.type) {
    case 'fold':
      success = typeof engine.fold === 'function' && engine.fold(playerIndex);
      break;
    case 'call':
      success = typeof engine.call === 'function' && engine.call(playerIndex);
      break;
    case 'raise':
      success = typeof engine.raise === 'function' && engine.raise(playerIndex, action.amount);
      break;
    case 'check':
      success = typeof engine.check === 'function' && engine.check(playerIndex);
      break;
    case 'allIn':
      success = typeof engine.allIn === 'function' && engine.allIn(playerIndex);
      break;
    default:
      return { error: 'Invalid action' };
  }

  if (!success) return { error: 'Invalid action' };
  checkGameOver(session);
  broadcastState(session.id);
  return { success: true };
}

// =================== MAHJONG ===================
function handleMahjongAction(session, player, playerIndex, action) {
  const engine = session.engine;

  switch (action.type) {
    case 'discard': {
      if (engine.currentPlayer !== playerIndex) return { error: 'Not your turn' };
      const success = typeof engine.discard === 'function' && engine.discard(playerIndex, action.tileIndex);
      if (!success) return { error: 'Cannot discard' };
      checkGameOver(session);
      broadcastState(session.id);
      return { success: true };
    }
    case 'draw': {
      if (engine.currentPlayer !== playerIndex) return { error: 'Not your turn' };
      const success = typeof engine.draw === 'function' && engine.draw(playerIndex);
      if (!success) return { error: 'Cannot draw' };
      broadcastState(session.id);
      return { success: true };
    }
    case 'claim': {
      const success = typeof engine.claim === 'function' && engine.claim(playerIndex, action.claimType, action.tiles);
      if (!success) return { error: 'Cannot claim' };
      broadcastState(session.id);
      return { success: true };
    }
    case 'declareWin': {
      const success = typeof engine.declareWin === 'function' && engine.declareWin(playerIndex);
      if (!success) return { error: 'Cannot declare win' };
      checkGameOver(session);
      broadcastState(session.id);
      return { success: true };
    }
    case 'skipClaim': {
      const success = typeof engine.skipClaim === 'function' && engine.skipClaim(playerIndex);
      if (!success) return { error: 'Cannot skip' };
      broadcastState(session.id);
      return { success: true };
    }
    default:
      return { error: 'Invalid action' };
  }
}

// =================== MONOPOLY ===================
function handleMonopolyAction(session, player, playerIndex, action) {
  const engine = session.engine;
  if (engine.currentPlayer !== playerIndex && action.type !== 'respondTrade') {
    return { error: 'Not your turn' };
  }

  let success = false;
  switch (action.type) {
    case 'rollDice':
      success = typeof engine.rollDice === 'function' && engine.rollDice();
      break;
    case 'buyProperty':
      success = typeof engine.buyProperty === 'function' && engine.buyProperty(playerIndex);
      break;
    case 'endTurn':
      success = typeof engine.endTurn === 'function' && engine.endTurn();
      break;
    case 'buildHouse':
      success = typeof engine.buildHouse === 'function' && engine.buildHouse(action.propertyIndex);
      break;
    case 'mortgage':
      success = typeof engine.mortgage === 'function' && engine.mortgage(action.propertyIndex);
      break;
    case 'unmortgage':
      success = typeof engine.unmortgage === 'function' && engine.unmortgage(action.propertyIndex);
      break;
    case 'payBail':
      success = typeof engine.payBail === 'function' && engine.payBail();
      break;
    case 'useGetOutOfJailCard':
      success = typeof engine.useGetOutOfJailCard === 'function' && engine.useGetOutOfJailCard();
      break;
    case 'declareBankruptcy':
      success = typeof engine.declareBankruptcy === 'function' && engine.declareBankruptcy(playerIndex);
      break;
    default:
      return { error: 'Invalid action' };
  }

  if (!success) return { error: 'Invalid action' };
  checkGameOver(session);
  broadcastState(session.id);
  return { success: true };
}

// =================== WEREWOLF ===================
function handleWerewolfAction(session, player, playerIndex, action) {
  const engine = session.engine;

  switch (action.type) {
    case 'vote': {
      const success = typeof engine.vote === 'function' && engine.vote(playerIndex, action.targetIndex);
      if (!success) return { error: 'Cannot vote' };
      checkGameOver(session);
      broadcastState(session.id);
      return { success: true };
    }
    case 'nightAction': {
      const success = typeof engine.nightAction === 'function' && engine.nightAction(playerIndex, action.targetIndex);
      if (!success) return { error: 'Cannot perform night action' };
      checkGameOver(session);
      broadcastState(session.id);
      return { success: true };
    }
    case 'skip': {
      const success = typeof engine.skip === 'function' && engine.skip(playerIndex);
      if (!success) return { error: 'Cannot skip' };
      broadcastState(session.id);
      return { success: true };
    }
    default:
      return { error: 'Invalid action' };
  }
}

// =================== HELPERS ===================
function checkGameOver(session) {
  const engine = session.engine;
  if (engine.gameOver) {
    session.phase = 'finished';
    scheduleCleanup(session.id, 300000);
  }
}

function rematch(sessionId, userId) {
  const session = sessions.get(sessionId);
  if (!session) return { error: 'Session not found' };
  if (session.phase !== 'finished') return { error: 'Game not finished' };
  if (!session.players.has(userId)) return { error: 'Not a player' };

  session.engine = createEngineInstance(session.gameType, session.players.size, session.options);
  if (!session.engine) return { error: 'Game engine not available' };
  session.phase = 'playing';

  if (cleanupTimers.has(sessionId)) {
    clearTimeout(cleanupTimers.get(sessionId));
    cleanupTimers.delete(sessionId);
  }

  broadcastState(sessionId);
  return { success: true };
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function getGuildSessions(guildId) {
  const result = [];
  for (const [id, session] of sessions) {
    if (session.guildId === guildId && session.phase !== 'finished') {
      result.push(serializeSessionLobby(session));
    }
  }
  return result;
}

function broadcastState(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;

  // For games with hidden info, send personalized state to each player
  const hasHiddenInfo = ['uno', 'jass', 'poker', 'mahjong', 'werewolf'].includes(session.gameType);

  if (hasHiddenInfo && session.engine && typeof session.engine.serialize === 'function') {
    // Send personalized state to each player
    session.players.forEach(({ ws }, userId) => {
      if (ws?.readyState !== 1) return;
      const player = session.players.get(userId);
      const playerIndex = player.playerNumber - 1;
      const state = serializeState(session, playerIndex);
      ws.send(JSON.stringify({ type: 'game:state', sessionId, data: state }));
    });

    // Send spectator view (no hidden info) to spectators
    session.spectators.forEach(({ ws }) => {
      if (ws?.readyState !== 1) return;
      const state = serializeState(session, null);
      ws.send(JSON.stringify({ type: 'game:state', sessionId, data: state }));
    });
  } else {
    // Public info — same state for everyone
    const state = serializeState(session);
    const payload = JSON.stringify({ type: 'game:state', sessionId, data: state });

    session.players.forEach(({ ws }) => {
      if (ws?.readyState === 1) ws.send(payload);
    });
    session.spectators.forEach(({ ws }) => {
      if (ws?.readyState === 1) ws.send(payload);
    });
  }

  broadcastLobbyUpdate(session.guildId);
}

function broadcastLobbyUpdate(guildId) {
  const lobbySessions = getGuildSessions(guildId);
  const payload = JSON.stringify({ type: 'game:lobby', guildId, data: lobbySessions });

  if (broadcastToGuild) {
    broadcastToGuild(guildId, payload);
  }
}

let broadcastToGuild = null;

function setBroadcastToGuild(fn) {
  broadcastToGuild = fn;
}

function serializeSessionLobby(session) {
  return {
    id: session.id,
    gameType: session.gameType,
    guildId: session.guildId,
    hostId: session.hostId,
    phase: session.phase,
    playerCount: session.players.size,
    maxPlayers: session.config.maxPlayers,
    players: Array.from(session.players.entries()).map(([id, p]) => ({
      id,
      username: p.username,
      playerNumber: p.playerNumber,
    })),
    createdAt: session.createdAt,
  };
}

function serializeState(session, forPlayerIndex = undefined) {
  const engineData = session.engine
    ? (typeof session.engine.serialize === 'function'
      ? (forPlayerIndex !== undefined
        ? session.engine.serialize(forPlayerIndex)
        : session.engine.serialize())
      : null)
    : null;

  return {
    id: session.id,
    gameType: session.gameType,
    guildId: session.guildId,
    hostId: session.hostId,
    phase: session.phase,
    players: Array.from(session.players.entries()).map(([id, p]) => ({
      id,
      username: p.username,
      playerNumber: p.playerNumber,
      connected: !!p.ws,
    })),
    spectators: Array.from(session.spectators.entries()).map(([id, s]) => ({
      id,
      username: s.username,
    })),
    engine: engineData,
  };
}

function scheduleCleanup(sessionId, delay = 30000) {
  if (cleanupTimers.has(sessionId)) {
    clearTimeout(cleanupTimers.get(sessionId));
  }
  const timer = setTimeout(() => {
    const session = sessions.get(sessionId);
    if (session) {
      for (const userId of session.players.keys()) {
        if (userSessions.get(userId) === sessionId) {
          userSessions.delete(userId);
        }
      }
      sessions.delete(sessionId);
    }
    cleanupTimers.delete(sessionId);
  }, delay);
  cleanupTimers.set(sessionId, timer);
}

function handleDisconnect(userId) {
  const sessionId = userSessions.get(userId);
  if (sessionId) {
    leaveSession(sessionId, userId);
  }
}

module.exports = {
  createSession,
  joinSession,
  leaveSession,
  startGame,
  handleAction,
  rematch,
  getSession,
  getGuildSessions,
  handleDisconnect,
  setBroadcastToGuild,
};
