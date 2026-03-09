import { create } from 'zustand';
import { ws } from '../lib/websocket';

export const useWebPlayerStore = create((set, get) => ({
  channelId: null,
  guildId: null,
  joined: false,
  currentTrack: null,
  queue: [],
  currentIndex: 0,
  playing: false,
  startedAt: null,
  pausedAt: null,
  volume: 80,
  listeners: [],

  _unsubs: [],

  init() {
    const unsub1 = ws.subscribe('webplayer:state', (msg) => {
      get()._handleStateUpdate(msg.data);
    });
    const unsub2 = ws.subscribe('webplayer:sync', (msg) => {
      get()._handleSync(msg.data);
    });
    set({ _unsubs: [unsub1, unsub2] });
  },

  cleanup() {
    get()._unsubs.forEach(fn => fn?.());
    set({ _unsubs: [] });
  },

  _handleStateUpdate(data) {
    set({
      channelId: data.channelId,
      guildId: data.guildId,
      joined: true,
      currentTrack: data.currentTrack,
      queue: data.tracks || [],
      currentIndex: data.currentIndex,
      playing: data.playing,
      startedAt: data.startedAt,
      pausedAt: data.pausedAt,
      volume: data.volume,
      listeners: data.listeners || [],
    });
  },

  _handleSync(data) {
    set({
      playing: data.playing,
      startedAt: data.startedAt,
      pausedAt: data.pausedAt,
      currentIndex: data.currentIndex,
    });
  },

  joinChannel(guildId, channelId) {
    ws.send({ type: 'webplayer:join', guildId, channelId });
    set({ guildId, channelId });
  },

  leaveChannel() {
    const { channelId } = get();
    if (channelId) {
      ws.send({ type: 'webplayer:leave', channelId });
    }
    set({
      channelId: null, guildId: null, joined: false,
      currentTrack: null, queue: [], playing: false,
      startedAt: null, pausedAt: null, listeners: [],
    });
  },

  addTrack(url) {
    const { channelId } = get();
    if (channelId) {
      ws.send({ type: 'webplayer:add', channelId, track: { url, title: url, source: 'URL' } });
    }
  },

  skip() {
    const { channelId } = get();
    if (channelId) ws.send({ type: 'webplayer:skip', channelId });
  },

  pause() {
    const { channelId } = get();
    if (channelId) ws.send({ type: 'webplayer:pause', channelId });
  },

  resume() {
    const { channelId } = get();
    if (channelId) ws.send({ type: 'webplayer:resume', channelId });
  },

  seek(pos) {
    const { channelId } = get();
    if (channelId) ws.send({ type: 'webplayer:seek', channelId, position: pos });
  },

  setVolume(v) {
    set({ volume: v });
  },

  getTargetPosition() {
    const { playing, startedAt, pausedAt } = get();
    if (pausedAt != null) return pausedAt;
    if (playing && startedAt) return (Date.now() - startedAt) / 1000;
    return 0;
  },
}));
