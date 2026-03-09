const { prisma } = require('shared');
const { EmbedBuilder } = require('discord.js');
const { t } = require('i18n');

async function handleKeywordAlerts(message, client) {
  const alerts = await prisma.keywordAlert.findMany({
    where: { guildDiscordId: message.guild.id },
    include: { user: true },
  });

  if (alerts.length === 0) return;

  const content = message.content.toLowerCase();

  for (const alert of alerts) {
    if (alert.user.discordId === message.author.id) continue;
    if (!content.includes(alert.keyword.toLowerCase())) continue;

    try {
      const discordUser = await client.users.fetch(alert.user.discordId);
      if (!discordUser) continue;

      const embed = new EmbedBuilder()
        .setTitle(t('fr', 'bot.keywordAlerts.title', { keyword: alert.keyword }))
        .setDescription(t('fr', 'bot.keywordAlerts.desc', { author: message.author.username, channel: message.channel.name, content: message.content.slice(0, 500) }))
        .setColor(0xf39c12)
        .setTimestamp()
        .setFooter({ text: message.guild.name });

      await discordUser.send({ embeds: [embed] }).catch(() => {});
    } catch {}
  }
}

module.exports = { handleKeywordAlerts };
