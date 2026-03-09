const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confess')
    .setDescription('Envoyer une confession anonyme')
    .addStringOption(o => o.setName('message').setDescription('Votre confession').setRequired(true)),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const guild = await prisma.guild.findUnique({
      where: { discordId: interaction.guild.id },
      include: { config: true },
    });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });
    if (!guild.config?.confessionsEnabled) return interaction.reply({ content: t(locale, 'bot.confess.disabled'), ephemeral: true });

    const content = interaction.options.getString('message');
    const count = await prisma.confession.count({ where: { guildId: guild.id } });
    const number = count + 1;

    const moderationEnabled = guild.config.confessionModerationEnabled && guild.config.confessionModChannelId;

    const confession = await prisma.confession.create({
      data: {
        guildId: guild.id,
        content,
        authorId: interaction.user.id,
        number,
        approved: !moderationEnabled,
        reviewed: !moderationEnabled,
      },
    });

    if (moderationEnabled) {
      // Send to mod review channel
      const modChannel = interaction.guild.channels.cache.get(guild.config.confessionModChannelId);
      if (modChannel) {
        const modEmbed = new EmbedBuilder()
          .setTitle(t(locale, 'bot.confess.moderationTitle', { number }))
          .setDescription(content)
          .setColor(0xe67e22)
          .addFields(
            { name: t(locale, 'bot.confess.fieldAuthor'), value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
            { name: t(locale, 'bot.confess.fieldId'), value: confession.id, inline: true },
          )
          .setTimestamp()
          .setFooter({ text: t(locale, 'bot.confess.moderationLabel') });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`confess_approve_${confession.id}`).setLabel(t(locale, 'bot.confess.approve')).setEmoji('✅').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`confess_reject_${confession.id}`).setLabel(t(locale, 'bot.confess.reject')).setEmoji('❌').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`confess_reveal_${confession.id}`).setLabel(t(locale, 'bot.confess.viewAuthor')).setEmoji('👁️').setStyle(ButtonStyle.Secondary),
        );

        const modMsg = await modChannel.send({ embeds: [modEmbed], components: [row] });
        await prisma.confession.update({ where: { id: confession.id }, data: { modMessageId: modMsg.id } });
      }

      await interaction.reply({ content: t(locale, 'bot.confess.sentModerated'), ephemeral: true });
    } else {
      // Direct publish (no moderation)
      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.confess.title', { number }))
        .setDescription(content)
        .setColor(0x9b59b6)
        .setTimestamp()
        .setFooter({ text: t(locale, 'bot.confess.anonymous') });

      const channelId = guild.config.confessionChannelId;
      if (channelId) {
        const channel = interaction.guild.channels.cache.get(channelId);
        if (channel) {
          const msg = await channel.send({ embeds: [embed] });
          await prisma.confession.update({ where: { id: confession.id }, data: { messageId: msg.id } });
        }
      } else {
        await interaction.channel.send({ embeds: [embed] });
      }

      await interaction.reply({ content: t(locale, 'bot.confess.sent'), ephemeral: true });
    }
  },
};
