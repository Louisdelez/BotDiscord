const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    const locale = resolveLocale(interaction.locale);
    // Handle button interactions
    if (interaction.isButton()) {
      return handleButton(interaction, client);
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error in command ${interaction.commandName}:`, error);
      const reply = { content: t(locale, 'bot.errors.generic'), ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
};

async function handleButton(interaction, client) {
  const locale = resolveLocale(interaction.locale);
  const id = interaction.customId;

  try {
    // Poll votes
    if (id.startsWith('poll_vote_')) {
      const optionIdx = parseInt(id.replace('poll_vote_', ''));
      const poll = await prisma.poll.findFirst({ where: { messageId: interaction.message.id } });
      if (!poll || poll.closed) return interaction.reply({ content: t(locale, 'bot.poll.ended'), ephemeral: true });

      const votes = JSON.parse(poll.votes);

      // Remove previous vote
      for (const key of Object.keys(votes)) {
        votes[key] = votes[key].filter(v => v !== interaction.user.id);
      }
      // Add new vote
      if (!votes[optionIdx]) votes[optionIdx] = [];
      votes[optionIdx].push(interaction.user.id);

      await prisma.poll.update({ where: { id: poll.id }, data: { votes: JSON.stringify(votes) } });

      // Rebuild embed
      const { buildPollEmbed, EMOJIS } = require('../commands/poll');
      const totalVotes = Object.values(votes).reduce((s, v) => s + v.length, 0);
      const embed = buildPollEmbed(poll.question, poll.options, votes, t(locale, 'bot.interactionCreate.pollTitle'), poll.endsAt);

      await interaction.update({ embeds: [embed] });
    }

    // Suggestion votes
    if (id === 'suggest_up' || id === 'suggest_down') {
      const suggestion = await prisma.suggestion.findFirst({ where: { messageId: interaction.message.id } });
      if (!suggestion) return interaction.reply({ content: t(locale, 'bot.suggest.notFound'), ephemeral: true });

      let upvotes = suggestion.upvotes;
      let downvotes = suggestion.downvotes;

      // Remove from both
      upvotes = upvotes.filter(v => v !== interaction.user.id);
      downvotes = downvotes.filter(v => v !== interaction.user.id);

      // Add to chosen
      if (id === 'suggest_up') upvotes.push(interaction.user.id);
      else downvotes.push(interaction.user.id);

      await prisma.suggestion.update({ where: { id: suggestion.id }, data: { upvotes, downvotes } });

      // Update embed
      const embed = interaction.message.embeds[0];
      const { EmbedBuilder } = require('discord.js');
      const newEmbed = EmbedBuilder.from(embed)
        .spliceFields(0, 3,
          { name: t(locale, 'bot.suggest.fieldFor'), value: `${upvotes.length}`, inline: true },
          { name: t(locale, 'bot.suggest.fieldAgainst'), value: `${downvotes.length}`, inline: true },
          { name: t(locale, 'bot.suggest.fieldStatus'), value: t(locale, 'bot.suggest.statusPending'), inline: true },
        );

      await interaction.update({ embeds: [newEmbed] });

      // Auto-export if threshold reached
      if (!suggestion.exported) {
        const guild = await prisma.guild.findUnique({
          where: { id: suggestion.guildId },
          include: { config: true },
        });
        if (guild?.config?.autoExportEnabled && upvotes.length >= (guild.config.autoExportThreshold || 5)) {
          try {
            const { autoExportSuggestion } = require('../modules/autoExport');
            await autoExportSuggestion(suggestion, guild, upvotes.length, downvotes.length, interaction.channel);
            await prisma.suggestion.update({ where: { id: suggestion.id }, data: { exported: true } });
          } catch (err) {
            console.error('Auto-export error:', err.message);
          }
        }
      }
    }

    // Adventure votes
    if (id.startsWith('adv_vote_')) {
      const choiceIdx = parseInt(id.replace('adv_vote_', ''));
      const adventure = await prisma.adventure.findFirst({ where: { messageId: interaction.message.id, active: true } });
      if (!adventure) return interaction.reply({ content: t(locale, 'bot.interactionCreate.adventureEnded'), ephemeral: true });

      const votes = JSON.parse(adventure.votes);
      // Remove previous vote
      for (const key of Object.keys(votes)) {
        votes[key] = votes[key].filter(v => v !== interaction.user.id);
      }
      if (!votes[choiceIdx]) votes[choiceIdx] = [];
      votes[choiceIdx].push(interaction.user.id);

      await prisma.adventure.update({ where: { id: adventure.id }, data: { votes: JSON.stringify(votes) } });

      const totalVotes = Object.values(votes).reduce((s, v) => s + v.length, 0);
      await interaction.reply({ content: t(locale, 'bot.interactionCreate.voteRegistered', { votes: totalVotes }), ephemeral: true });
    }

    // Quiz answers
    if (id.startsWith('quiz_')) {
      const parts = id.split('_');
      const chosen = parseInt(parts[1]);
      const correct = parseInt(parts[2]);

      if (chosen === correct) {
        await interaction.reply({ content: t(locale, 'bot.quiz.correct', { user: interaction.user.username }), ephemeral: false });

        // Award quiz badge
        try {
          const { awardSpecificBadge } = require('../modules/badges');
          const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
          const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
          if (guild && user) {
            const member = await prisma.guildMember.findFirst({
              where: { userId: user.id, guildId: guild.id },
            });
            if (member) {
              await awardSpecificBadge(member.id, guild.id, 'quiz_first_win');
            }
          }
        } catch {}
      } else {
        await interaction.reply({ content: t(locale, 'bot.quiz.wrong', { user: interaction.user.username }), ephemeral: true });
      }
    }

    // Confession moderation buttons
    if (id.startsWith('confess_approve_') || id.startsWith('confess_reject_') || id.startsWith('confess_reveal_')) {
      const parts = id.split('_');
      const action = parts[1];
      const confessionId = parts.slice(2).join('_');

      const confession = await prisma.confession.findUnique({ where: { id: confessionId } });
      if (!confession) return interaction.reply({ content: t(locale, 'bot.confess.notFound'), ephemeral: true });

      if (action === 'reveal') {
        return interaction.reply({ content: t(locale, 'bot.confess.authorReveal', { authorId: confession.authorId }), ephemeral: true });
      }

      if (confession.reviewed) return interaction.reply({ content: t(locale, 'bot.confess.alreadyProcessed'), ephemeral: true });

      const guild = await prisma.guild.findUnique({
        where: { id: confession.guildId },
        include: { config: true },
      });

      if (action === 'approve') {
        await prisma.confession.update({ where: { id: confessionId }, data: { approved: true, reviewed: true } });

        const embed = new EmbedBuilder()
          .setTitle(t(locale, 'bot.confess.title', { number: confession.number }))
          .setDescription(confession.content)
          .setColor(0x9b59b6)
          .setTimestamp()
          .setFooter({ text: t(locale, 'bot.confess.anonymous') });

        const channelId = guild?.config?.confessionChannelId;
        if (channelId) {
          const channel = interaction.guild.channels.cache.get(channelId);
          if (channel) {
            const msg = await channel.send({ embeds: [embed] });
            await prisma.confession.update({ where: { id: confessionId }, data: { messageId: msg.id } });
          }
        }

        // Update mod message
        const { EmbedBuilder: EB } = require('discord.js');
        const approvedEmbed = EB.from(interaction.message.embeds[0])
          .setTitle(t(locale, 'bot.confess.approved', { number: confession.number }))
          .setColor(0x2ecc71);
        await interaction.update({ embeds: [approvedEmbed], components: [] });
      } else if (action === 'reject') {
        await prisma.confession.update({ where: { id: confessionId }, data: { approved: false, reviewed: true } });

        const { EmbedBuilder: EB } = require('discord.js');
        const rejectedEmbed = EB.from(interaction.message.embeds[0])
          .setTitle(t(locale, 'bot.confess.rejected', { number: confession.number }))
          .setColor(0xe74c3c);
        await interaction.update({ embeds: [rejectedEmbed], components: [] });
      }
      return;
    }

    // Onboarding interest buttons
    if (id.startsWith('onboard_role_') || id.startsWith('onboard_interest_')) {
      const roleId = id.replace('onboard_role_', '').replace('onboard_interest_', '');

      try {
        // Try to find the guild member
        const guildMember = interaction.guild
          ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
          : null;

        if (guildMember) {
          if (guildMember.roles.cache.has(roleId)) {
            await guildMember.roles.remove(roleId);
            await interaction.reply({ content: t(locale, 'bot.interactionCreate.roleRemoved'), ephemeral: true });
          } else {
            await guildMember.roles.add(roleId);
            await interaction.reply({ content: t(locale, 'bot.interactionCreate.roleAdded'), ephemeral: true });
          }
        } else {
          await interaction.reply({ content: t(locale, 'bot.interactionCreate.cannotModifyRoles'), ephemeral: true });
        }
      } catch {
        await interaction.reply({ content: t(locale, 'bot.interactionCreate.roleError'), ephemeral: true });
      }
    }
  } catch (err) {
    console.error('Button handler error:', err.message);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: t(locale, 'bot.interactionCreate.error'), ephemeral: true }).catch(() => {});
    }
  }
}
