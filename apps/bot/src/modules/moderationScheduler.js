const { prisma } = require('shared');
const { t } = require('i18n');

/**
 * Check for expired mutes/bans and automatically lift them.
 * ModerationLog.duration is stored in seconds.
 * createdAt + duration = expiry time.
 */
async function checkExpiredSanctions(client) {
  try {
    const now = new Date();

    // Find active MUTE/BAN logs with a duration that have expired
    const expiredLogs = await prisma.moderationLog.findMany({
      where: {
        action: { in: ['MUTE', 'BAN'] },
        duration: { not: null },
      },
      include: {
        guild: true,
        target: { include: { user: true } },
      },
    });

    for (const log of expiredLogs) {
      const expiresAt = new Date(log.createdAt.getTime() + log.duration * 1000);
      if (expiresAt > now) continue;

      // Check if already lifted (UNMUTE/UNBAN exists after this log)
      const alreadyLifted = await prisma.moderationLog.findFirst({
        where: {
          guildId: log.guildId,
          targetId: log.targetId,
          action: log.action === 'MUTE' ? 'UNMUTE' : 'UNBAN',
          createdAt: { gt: log.createdAt },
        },
      });
      if (alreadyLifted) continue;

      const discordGuild = client.guilds.cache.get(log.guild.discordId);
      if (!discordGuild) continue;

      try {
        if (log.action === 'MUTE') {
          const member = await discordGuild.members.fetch(log.target.user.discordId).catch(() => null);
          if (member && member.isCommunicationDisabled()) {
            await member.timeout(null, t('fr', 'bot.moderationScheduler.muteExpired'));
            console.log(`Auto-unmuted ${log.target.user.username} in ${log.guild.name}`);
          }
        } else if (log.action === 'BAN') {
          const bans = await discordGuild.bans.fetch().catch(() => new Map());
          if (bans.has(log.target.user.discordId)) {
            await discordGuild.members.unban(log.target.user.discordId, t('fr', 'bot.moderationScheduler.banExpired'));
            console.log(`Auto-unbanned ${log.target.user.discordId} in ${log.guild.name}`);
          }
        }

        // Create log entry for the auto-lift
        await prisma.moderationLog.create({
          data: {
            guildId: log.guildId,
            action: log.action === 'MUTE' ? 'UNMUTE' : 'UNBAN',
            reason: t('fr', 'bot.moderationScheduler.sanctionExpired', { duration: Math.round(log.duration / 60) }),
            moderatorId: log.moderatorId,
            targetId: log.targetId,
            automated: true,
          },
        });

        // Notify in mod log channel
        const guild = await prisma.guild.findUnique({
          where: { id: log.guildId },
          include: { config: true },
        });
        if (guild?.config?.modLogChannelId) {
          const logChannel = discordGuild.channels.cache.get(guild.config.modLogChannelId);
          if (logChannel) {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
              .setTitle(t('fr', 'bot.moderationScheduler.title', { action: log.action === 'MUTE' ? 'Unmute' : 'Unban' }))
              .setDescription(t('fr', 'bot.moderationScheduler.desc', { userId: log.target.user.discordId }))
              .addFields(
                { name: t('fr', 'bot.moderationScheduler.fieldOriginal'), value: `${log.action} — ${log.reason || t('fr', 'common.noReason')}`, inline: true },
                { name: t('fr', 'bot.moderationScheduler.fieldDuration'), value: `${Math.round(log.duration / 60)} min`, inline: true },
              )
              .setColor(0x2ecc71)
              .setTimestamp();
            await logChannel.send({ embeds: [embed] });
          }
        }
      } catch (err) {
        console.error(`Auto-lift error for ${log.target.user?.discordId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Moderation scheduler error:', err.message);
  }
}

module.exports = { checkExpiredSanctions };
