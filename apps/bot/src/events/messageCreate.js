const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');
const { handleXP } = require('../modules/xp');
const { handleAutomod } = require('../modules/automod');
const { handleChatbot } = require('../modules/chatbot');
const { handleKeywordAlerts } = require('../modules/keywordAlerts');
const { checkAndAwardBadges } = require('../modules/badges');
const { maybeSpawnCreature } = require('../modules/creatures');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;
    const locale = 'fr';

    const guild = await prisma.guild.findUnique({
      where: { discordId: message.guild.id },
      include: { config: true, xpConfig: true, aiConfig: true },
    });
    if (!guild) return;

    // Ensure user and member exist
    const user = await prisma.user.upsert({
      where: { discordId: message.author.id },
      update: { username: message.author.username, avatar: message.author.avatar },
      create: { discordId: message.author.id, username: message.author.username, avatar: message.author.avatar },
    });

    const member = await prisma.guildMember.upsert({
      where: { userId_guildId: { userId: user.id, guildId: guild.id } },
      update: { messageCount: { increment: 1 } },
      create: { userId: user.id, guildId: guild.id, messageCount: 1 },
    });

    // Update daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.dailyStat.upsert({
      where: { guildId_date: { guildId: guild.id, date: today } },
      update: { messageCount: { increment: 1 } },
      create: { guildId: guild.id, date: today, messageCount: 1 },
    });

    // Pipeline: automod → XP → badges → chatbot → creatures → keyword alerts
    if (guild.config?.aiEnabled && guild.config?.automodEnabled) {
      const blocked = await handleAutomod(message, guild, member, client);
      if (blocked) return;
    }

    if (guild.config?.xpEnabled) {
      await handleXP(message, guild, member, client);
    }

    // Check badges after XP
    checkAndAwardBadges(member, guild.id).catch(() => {});

    if (guild.config?.aiEnabled && guild.aiConfig?.chatChannelId === message.channel.id) {
      await handleChatbot(message, guild, client);
    }

    // Creature spawning
    if (guild.config?.creaturesEnabled) {
      maybeSpawnCreature(message, guild, client).catch(() => {});
    }

    // Keyword alerts (non-blocking)
    handleKeywordAlerts(message, client).catch(() => {});
  },
};
