import { create } from 'zustand';
import { ws } from '../lib/websocket';

export const useBotMusicStore = create((set, get) => ({
  currentTrack: null,
  queue: [],
  playing: false,
  paused: false,
  volume: 50,
  startedAt: null,
  position: 0,

  _interval: null,

  init(guildId) {
    // Subscribe to music state updates
    ws.subscribe('music:state', (msg) => {
      if (msg.guildId === guildId) {
        get()._handleStateUpdate(msg.data);
      }
    });

    // Request initial state
    ws.send({ type: 'music:getState', guildId });

    // Position ticker
    const interval = setInterval(() => {
      const { playing, paused, startedAt } = get();
      if (playing && !paused && startedAt) {
        set({ position: (Date.now() - startedAt) / 1000 });
      }
    }, 500);
    set({ _interval: interval });
  },

  cleanup() {
    const { _interval } = get();
    if (_interval) clearInterval(_interval);
  },

  _handleStateUpdate(data) {
    set({
      currentTrack: data.currentTrack,
      queue: data.queue || [],
      playing: data.playing,
      paused: data.paused,
      volume: data.volume,
      startedAt: data.startedAt,
      position: data.startedAt ? (Date.now() - data.startedAt) / 1000 : 0,
    });
  },

  skip: (guildId) => ws.send({ type: 'music:skip', guildId }),
  pause: (guildId) => ws.send({ type: 'music:pause', guildId }),
  resume: (guildId) => ws.send({ type: 'music:resume', guildId }),
  stop: (guildId) => ws.send({ type: 'music:stop', guildId }),
  setVolume: (guildId, volume) => ws.send({ type: 'music:volume', guildId, volume }),
  addTrack: (guildId, query) => ws.send({ type: 'music:add', guildId, query }),
  requestState: (guildId) => ws.send({ type: 'music:getState', guildId }),
}));
