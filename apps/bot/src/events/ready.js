const { t, resolveLocale } = require('i18n');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    const locale = 'fr';
    console.log(`Bot connected as ${client.user.tag}`);
    console.log(`Serving ${client.guilds.cache.size} guilds`);
  },
};
