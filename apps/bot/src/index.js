require('dotenv').config({ path: '../../.env' });
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands } = require('./loader');
const { loadEvents } = require('./loader');
const { loadAll } = require('i18n');
const Redis = require('ioredis');
const cron = require('node-cron');
const { checkReminders } = require('./modules/reminders');
const { generateDailyRecaps } = require('./modules/dailyRecap');
const { runAutonomousAgent } = require('./modules/autonomousAgent');
const { checkCryptoAlerts } = require('./modules/cryptoAlerts');
const { cleanupExpiredSpawns } = require('./modules/creatures');
const { postDailyPolls } = require('./modules/dailyPoll');
const { checkExpiredSanctions } = require('./modules/moderationScheduler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.redis = new Redis(process.env.REDIS_URL);

async function main() {
  loadAll();
  await loadCommands(client);
  await loadEvents(client);

  // Check reminders every 30 seconds
  cron.schedule('*/30 * * * * *', () => checkReminders(client));

  // Daily recap at 20:00
  cron.schedule('0 20 * * *', () => generateDailyRecaps(client));

  // Autonomous agent every 60 minutes
  cron.schedule('0 * * * *', () => runAutonomousAgent(client));

  // Crypto alerts every 2 minutes
  cron.schedule('*/2 * * * *', () => checkCryptoAlerts(client));

  // Cleanup expired creature spawns every minute
  cron.schedule('* * * * *', () => cleanupExpiredSpawns());

  // Poll of the Day — check every hour
  cron.schedule('0 * * * *', () => postDailyPolls(client));

  // Auto-unmute/unban expired sanctions every minute
  cron.schedule('* * * * *', () => checkExpiredSanctions(client));

  await client.login(process.env.DISCORD_TOKEN);

  const { initMusicBridge } = require('./modules/musicBridge');
  initMusicBridge(client);

  const { initSetupBridge } = require('./modules/setupBridge');
  initSetupBridge(client);
}

main().catch(console.error);
