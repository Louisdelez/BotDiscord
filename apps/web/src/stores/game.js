import { create } from 'zustand';
import { api } from '../lib/api';
import { ws } from '../lib/websocket';

let initialized = false;

export const useGameStore = create((set, get) => ({
  // Lobby state
  lobbySessions: [],
  // Current active session
  sessionId: null,
  sessionState: null,
  error: null,

  // Listen to game WebSocket events (only once)
  init() {
    if (initialized) return;
    initialized = true;

    ws.subscribe('game:state', (msg) => {
      const { sessionId } = get();
      if (msg.sessionId === sessionId) {
        set({ sessionState: msg.data, error: null });
      }
    });

    ws.subscribe('game:lobby', (msg) => {
      set({ lobbySessions: msg.data });
    });

    ws.subscribe('game:error', (msg) => {
      set({ error: msg.error });
      // If error contains a sessionId (already in game), auto-join it
      if (msg.sessionId) {
        get().joinSession(msg.sessionId);
      }
    });
  },

  // Fetch lobby sessions via REST
  fetchLobbySessions: async (guildId) => {
    try {
      const data = await api.get(`/guilds/${guildId}/games`);
      set({ lobbySessions: data });
    } catch {
      set({ lobbySessions: [] });
    }
  },

  // Create a new game session
  createSession: async (guildId, gameType) => {
    try {
      const data = await api.post(`/guilds/${guildId}/games`, { gameType });
      set({ sessionId: data.sessionId, error: null });
      // Join via WebSocket
      ws.send({ type: 'game:join', sessionId: data.sessionId });
      return data.sessionId;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  // Join an existing session
  joinSession: (sessionId) => {
    set({ sessionId, error: null });
    ws.send({ type: 'game:join', sessionId });
  },

  // Leave current session
  leaveSession: () => {
    const { sessionId } = get();
    if (sessionId) {
      ws.send({ type: 'game:leave', sessionId });
    }
    set({ sessionId: null, sessionState: null, error: null });
  },

  // Start the game (host only)
  startGame: () => {
    const { sessionId } = get();
    if (sessionId) {
      ws.send({ type: 'game:start', sessionId });
    }
  },

  // Send a game action
  sendAction: (action) => {
    const { sessionId } = get();
    if (sessionId) {
      ws.send({ type: 'game:action', sessionId, action });
    }
  },

  // Request rematch
  rematch: () => {
    const { sessionId } = get();
    if (sessionId) {
      ws.send({ type: 'game:rematch', sessionId });
    }
  },

  // Reset store
  reset: () => {
    set({ sessionId: null, sessionState: null, error: null });
  },
}));
