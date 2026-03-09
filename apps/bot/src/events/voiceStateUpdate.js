const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const locale = 'fr';
    const userId = oldState.member?.id || newState.member?.id;
    if (!userId) return;

    // Publish voice state changes for the API
    client.redis.publish('voice-state-updates', JSON.stringify({
      type: 'voiceState',
      guildId: newState.guild.id,
      userId,
      channelId: newState.channelId,
      oldChannelId: oldState.channelId,
    }));

    // Maintain voicemembers sets
    if (newState.channelId) {
      await client.redis.sadd(`voicemembers:${newState.guild.id}:${newState.channelId}`, userId);
    }
    if (oldState.channelId) {
      await client.redis.srem(`voicemembers:${oldState.guild.id}:${oldState.channelId}`, userId);
    }

    // User joined a voice channel
    if (!oldState.channelId && newState.channelId) {
      await client.redis.set(`voice:${newState.guild.id}:${userId}`, Date.now().toString());
    }

    // User left a voice channel
    if (oldState.channelId && !newState.channelId) {
      const joinTime = await client.redis.get(`voice:${oldState.guild.id}:${userId}`);
      if (!joinTime) return;

      await client.redis.del(`voice:${oldState.guild.id}:${userId}`);

      const minutes = Math.floor((Date.now() - parseInt(joinTime)) / 60000);
      if (minutes < 1) return;

      const guild = await prisma.guild.findUnique({
        where: { discordId: oldState.guild.id },
        include: { xpConfig: true },
      });
      if (!guild) return;

      const user = await prisma.user.findUnique({ where: { discordId: userId } });
      if (!user) return;

      const member = await prisma.guildMember.findUnique({
        where: { userId_guildId: { userId: user.id, guildId: guild.id } },
      });
      if (!member) return;

      // Update voice minutes
      const updatedMember = await prisma.guildMember.update({
        where: { id: member.id },
        data: { voiceMinutes: { increment: minutes } },
      });

      // Update daily stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.dailyStat.upsert({
        where: { guildId_date: { guildId: guild.id, date: today } },
        update: { voiceMinutes: { increment: minutes } },
        create: { guildId: guild.id, date: today, voiceMinutes: minutes },
      });

      // Award voice XP if enabled
      if (guild.xpConfig?.voiceXpEnabled) {
        const xpGain = minutes * (guild.xpConfig.xpPerVoiceMinute || 2);
        await prisma.guildMember.update({
          where: { id: member.id },
          data: { xp: { increment: xpGain } },
        });
      }

      // Check badges
      try {
        const { checkAndAwardBadges } = require('../modules/badges');
        await checkAndAwardBadges(updatedMember, guild.id);
      } catch {}
    }

    // User switched channels (not leave)
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      // Keep tracking, no action needed
    }
  },
};
