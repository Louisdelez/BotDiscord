import { create } from 'zustand';

const SUPPORTED_LOCALES = ['fr', 'en', 'de', 'it', 'es'];
const DEFAULT_LOCALE = 'fr';

function detectLocale() {
  const saved = localStorage.getItem('locale');
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  const nav = navigator.language?.split('-')[0]?.toLowerCase();
  return SUPPORTED_LOCALES.includes(nav) ? nav : DEFAULT_LOCALE;
}

export const useLocaleStore = create((set) => ({
  locale: detectLocale(),
  setLocale: (code) => {
    if (!SUPPORTED_LOCALES.includes(code)) return;
    localStorage.setItem('locale', code);
    set({ locale: code });
  },
}));

export { SUPPORTED_LOCALES, DEFAULT_LOCALE };
