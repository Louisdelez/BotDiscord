const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const locale = 'fr';
    const guild = await prisma.guild.findUnique({
      where: { discordId: member.guild.id },
      include: { config: true, onboardingConfig: true },
    });
    if (!guild) return;

    // Update daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.dailyStat.upsert({
      where: { guildId_date: { guildId: guild.id, date: today } },
      update: { joinCount: { increment: 1 }, memberCount: member.guild.memberCount },
      create: { guildId: guild.id, date: today, joinCount: 1, memberCount: member.guild.memberCount },
    });

    // Welcome message
    if (guild.config?.welcomeEnabled && guild.config?.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(guild.config.welcomeChannelId);
      if (channel) {
        const text = (guild.config.welcomeMessage || t(locale, 'bot.welcome.defaultMessage', { user: `<@${member.id}>`, server: member.guild.name }))
          .replace('{user}', `<@${member.id}>`)
          .replace('{server}', member.guild.name);

        if (guild.config.welcomeUseEmbed) {
          const embed = new EmbedBuilder()
            .setTitle(t(locale, 'bot.welcome.title', { server: member.guild.name }))
            .setDescription(text)
            .setColor(parseInt((guild.config.welcomeEmbedColor || '#0071e3').replace('#', ''), 16))
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            .setTimestamp()
            .setFooter({ text: `${t(locale, 'bot.welcome.memberNumber')}${member.guild.memberCount}` });

          if (guild.config.welcomeImageUrl) {
            embed.setImage(guild.config.welcomeImageUrl);
          }
          if (guild.config.welcomeBannerUrl) {
            embed.setThumbnail(guild.config.welcomeBannerUrl);
          }

          channel.send({ embeds: [embed] });
        } else {
          channel.send(text);
        }
      }
    }

    // Intelligent onboarding
    if (guild.onboardingConfig?.enabled) {
      const onboarding = guild.onboardingConfig;

      // Send DM with personalized welcome
      if (onboarding.welcomeDmEnabled) {
        try {
          const roles = JSON.parse(onboarding.roles || '[]');
          const interestCategories = JSON.parse(onboarding.interestCategories || '[]');
          const dmMessage = onboarding.welcomeDmMessage || `${t(locale, 'bot.welcome.dmWelcome', { server: member.guild.name })}\n\n${t(locale, 'bot.welcome.dmHelp')}`;

          const embed = new EmbedBuilder()
            .setTitle(t(locale, 'bot.welcome.title', { server: member.guild.name }))
            .setDescription(dmMessage)
            .setColor(0x0071e3)
            .setThumbnail(member.guild.iconURL());

          const allRoles = [...roles];

          // Add interest-based roles if enabled
          if (onboarding.interestBasedRoles && interestCategories.length > 0) {
            embed.addFields({
              name: t(locale, 'bot.welcome.chooseInterests'),
              value: interestCategories.map(c => `${c.emoji} ${c.label}`).join('\n'),
            });

            interestCategories.forEach(c => {
              allRoles.push({ emoji: c.emoji, roleId: c.roleId, label: c.label, isInterest: true });
            });
          }

          if (roles.length > 0) {
            embed.addFields({
              name: t(locale, 'bot.welcome.chooseRoles'),
              value: roles.map(r => `${r.emoji} ${r.label}`).join('\n'),
            });
          }

          if (allRoles.length > 0) {
            const rows = [];
            for (let i = 0; i < allRoles.length; i += 5) {
              const row = new ActionRowBuilder();
              for (let j = i; j < Math.min(i + 5, allRoles.length); j++) {
                const prefix = allRoles[j].isInterest ? 'onboard_interest_' : 'onboard_role_';
                row.addComponents(
                  new ButtonBuilder()
                    .setCustomId(`${prefix}${allRoles[j].roleId}`)
                    .setLabel(allRoles[j].label)
                    .setEmoji(allRoles[j].emoji)
                    .setStyle(allRoles[j].isInterest ? ButtonStyle.Secondary : ButtonStyle.Primary)
                );
              }
              rows.push(row);
            }

            await member.send({ embeds: [embed], components: rows });
          } else {
            await member.send({ embeds: [embed] });
          }
        } catch {
          // DMs might be closed
        }
      }

      // Schedule follow-up if enabled
      if (onboarding.followUpEnabled && onboarding.followUpDelay > 0) {
        const followUpKey = `followup:${member.guild.id}:${member.id}`;
        const followUpTime = Date.now() + (onboarding.followUpDelay || 24) * 3600 * 1000;
        await client.redis.set(followUpKey, JSON.stringify({
          guildId: member.guild.id,
          userId: member.id,
          message: onboarding.followUpMessage || t(locale, 'bot.welcome.followUpDefault', { server: member.guild.name }),
          sendAt: followUpTime,
        }));
      }
    }

    // Publish event
    client.redis.publish('bot-events', JSON.stringify({
      type: 'memberJoin',
      guildId: member.guild.id,
      data: { userId: member.id, username: member.user.username },
    }));
  },
};
