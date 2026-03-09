import { useLocaleStore } from '../stores/locale';

const locales = import.meta.glob('../../../../packages/i18n/src/locales/*.json', { eager: true });

const cache = {};
for (const [path, mod] of Object.entries(locales)) {
  const code = path.match(/([a-z]{2})\.json$/)?.[1];
  if (code) cache[code] = mod.default || mod;
}

function translate(locale, key, params = {}) {
  const lang = cache[locale] || cache['fr'];
  let str = lang?.[key] ?? cache['fr']?.[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return str;
}

export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return (key, params) => translate(locale, key, params);
}

export { translate, cache };
