const { prisma } = require('shared');
const { EmbedBuilder } = require('discord.js');
const { t } = require('i18n');

async function handleStarReaction(reaction, user, client) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => {});
  if (reaction.message.partial) await reaction.message.fetch().catch(() => {});

  const message = reaction.message;
  const guild = await prisma.guild.findUnique({
    where: { discordId: message.guild.id },
    include: { config: true },
  });

  if (!guild?.config?.starboardEnabled || !guild.config.starboardChannelId) return;

  const starEmoji = guild.config.starboardEmoji || '⭐';
  if (reaction.emoji.name !== starEmoji) return;

  const threshold = guild.config.starboardThreshold || 3;
  const starboardChannelId = guild.config.starboardChannelId;

  // Don't starboard messages from the starboard channel itself
  if (message.channel.id === starboardChannelId) return;

  const starCount = reaction.count;

  // Check if entry already exists
  let entry = await prisma.starboardEntry.findUnique({
    where: { originalMessageId: message.id },
  });

  const starboardChannel = message.guild.channels.cache.get(starboardChannelId);
  if (!starboardChannel) return;

  if (starCount >= threshold) {
    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setDescription(message.content || t('fr', 'bot.starboard.noText'))
      .addFields({ name: 'Source', value: `[${t('fr', 'bot.starboard.viewMessage')}](${message.url})` })
      .setColor(0xf1c40f)
      .setTimestamp(message.createdAt)
      .setFooter({ text: `${starEmoji} ${starCount}` });

    // Add first image attachment if present
    const attachment = message.attachments.first();
    if (attachment?.contentType?.startsWith('image/')) {
      embed.setImage(attachment.url);
    }

    if (entry) {
      // Update existing starboard message
      if (entry.starboardMessageId) {
        try {
          const starMsg = await starboardChannel.messages.fetch(entry.starboardMessageId);
          await starMsg.edit({ content: `${starEmoji} **${starCount}** | <#${message.channel.id}>`, embeds: [embed] });
        } catch {}
      }
      await prisma.starboardEntry.update({
        where: { id: entry.id },
        data: { starCount },
      });
    } else {
      // Create new starboard entry
      const starMsg = await starboardChannel.send({
        content: `${starEmoji} **${starCount}** | <#${message.channel.id}>`,
        embeds: [embed],
      });

      await prisma.starboardEntry.create({
        data: {
          guildId: guild.id,
          originalMessageId: message.id,
          originalChannelId: message.channel.id,
          starboardMessageId: starMsg.id,
          authorId: message.author.id,
          content: message.content?.slice(0, 500),
          attachmentUrl: attachment?.url,
          starCount,
        },
      });
    }
  } else if (entry) {
    // Update count even if below threshold
    await prisma.starboardEntry.update({
      where: { id: entry.id },
      data: { starCount },
    });
  }
}

module.exports = { handleStarReaction };
