import { create } from 'zustand';
import { api } from '../lib/api';

export const useGuildStore = create((set, get) => ({
  guilds: [],
  currentGuild: null,
  loading: false,

  fetchGuilds: async () => {
    set({ loading: true });
    const guilds = await api.get('/auth/guilds');
    set({ guilds, loading: false });
  },

  selectGuild: (guildId) => {
    const guild = get().guilds.find(g => g.id === guildId);
    set({ currentGuild: guild });
    localStorage.setItem('selectedGuild', guildId);
  },

  restoreGuild: () => {
    const saved = localStorage.getItem('selectedGuild');
    if (saved) {
      const guild = get().guilds.find(g => g.id === saved);
      if (guild) set({ currentGuild: guild });
    }
  },

  hasRole: (minRole) => {
    const current = get().currentGuild;
    if (!current) return true; // No guild selected = show all nav items
    const hierarchy = { USER: 0, MOD: 1, ADMIN: 2 };
    return (hierarchy[current.role] || 0) >= (hierarchy[minRole] || 0);
  },
}));
