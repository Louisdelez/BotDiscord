import { clsx } from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

const LOCALE_MAP = { fr: 'fr-FR', en: 'en-US', de: 'de-DE', it: 'it-IT', es: 'es-ES' };

export function formatDate(date, locale = 'fr') {
  return new Intl.DateTimeFormat(LOCALE_MAP[locale] || 'fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function discordAvatar(id, hash, size = 128) {
  if (!hash) return `https://cdn.discordapp.com/embed/avatars/${(Number(id) || 0) % 5}.png`;
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.webp?size=${size}`;
}

export function guildIcon(id, hash, size = 128) {
  if (!hash) return null;
  return `https://cdn.discordapp.com/icons/${id}/${hash}.webp?size=${size}`;
}
