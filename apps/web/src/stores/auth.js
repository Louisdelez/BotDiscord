import { create } from 'zustand';
import { api } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  login: (token) => {
    localStorage.setItem('token', token);
    return useAuthStore.getState().fetchUser();
  },

  fetchUser: async () => {
    try {
      const user = await api.get('/auth/me');
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null });
  },
}));
