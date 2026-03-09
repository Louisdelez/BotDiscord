const fs = require('fs');
const path = require('path');

const SUPPORTED_LOCALES = ['fr', 'en', 'de', 'it', 'es'];
const DEFAULT_LOCALE = 'fr';
const cache = {};

function loadAll() {
  for (const locale of SUPPORTED_LOCALES) {
    const filePath = path.join(__dirname, 'locales', `${locale}.json`);
    cache[locale] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}

function t(locale, key, params = {}) {
  const lang = cache[locale] || cache[DEFAULT_LOCALE];
  let str = lang?.[key] ?? cache[DEFAULT_LOCALE]?.[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return str;
}

function resolveLocale(raw) {
  if (!raw) return DEFAULT_LOCALE;
  const short = raw.split('-')[0].toLowerCase();
  return SUPPORTED_LOCALES.includes(short) ? short : DEFAULT_LOCALE;
}

module.exports = { SUPPORTED_LOCALES, DEFAULT_LOCALE, loadAll, t, resolveLocale, cache };
