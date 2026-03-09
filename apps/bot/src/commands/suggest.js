const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('shared');
const { getEmbedding, cosineSimilarity } = require('../modules/embeddings');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Proposer une suggestion')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Créer une suggestion')
      .addStringOption(o => o.setName('idée').setDescription('Votre suggestion').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('export')
      .setDescription('Exporter une suggestion')
      .addStringOption(o => o.setName('id').setDescription('ID de la suggestion').setRequired(true))
      .addStringOption(o => o.setName('plateforme').setDescription('Plateforme cible')
        .addChoices(
          { name: 'GitHub', value: 'github' },
          { name: 'Trello', value: 'trello' },
          { name: 'Linear', value: 'linear' },
          { name: 'Jira', value: 'jira' },
        ))),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const sub = interaction.options.getSubcommand();

    const guild = await prisma.guild.findUnique({
      where: { discordId: interaction.guild.id },
      include: { config: true, aiConfig: true },
    });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    if (sub === 'export') {
      return handleExport(interaction, guild, locale);
    }

    const content = interaction.options.getString('idée');

    // Deduplication check via embeddings
    let embedding = [];
    try {
      embedding = await getEmbedding(content, guild.aiConfig);

      if (embedding.length > 0) {
        const existing = await prisma.suggestion.findMany({
          where: { guildId: guild.id, status: { in: ['PENDING', 'APPROVED'] } },
        });

        const similar = existing.filter(s => {
          if (!s.embedding || s.embedding.length === 0) return false;
          return cosineSimilarity(embedding, s.embedding) > 0.8;
        });

        if (similar.length > 0) {
          return interaction.reply({
            content: t(locale, 'bot.suggest.similar', { content: similar[0].content.slice(0, 100) + '...' }),
            ephemeral: true,
          });
        }
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'bot.suggest.title'))
      .setDescription(content)
      .setColor(0x2ecc71)
      .addFields(
        { name: t(locale, 'bot.suggest.fieldFor'), value: '0', inline: true },
        { name: t(locale, 'bot.suggest.fieldAgainst'), value: '0', inline: true },
        { name: t(locale, 'bot.suggest.fieldStatus'), value: t(locale, 'bot.suggest.statusPending'), inline: true },
      )
      .setFooter({ text: t(locale, 'bot.suggest.footer', { author: interaction.user.username }) })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('suggest_up').setEmoji('👍').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('suggest_down').setEmoji('👎').setStyle(ButtonStyle.Danger),
    );

    const channelId = guild.config?.suggestionsChannelId;
    const targetChannel = channelId ? interaction.guild.channels.cache.get(channelId) : interaction.channel;

    const msg = await targetChannel.send({ embeds: [embed], components: [row] });

    await prisma.suggestion.create({
      data: {
        guildId: guild.id,
        content,
        authorId: interaction.user.id,
        authorName: interaction.user.username,
        messageId: msg.id,
        embedding,
      },
    });

    if (channelId && channelId !== interaction.channel.id) {
      await interaction.reply({ content: t(locale, 'bot.suggest.sent'), ephemeral: true });
    } else {
      await interaction.reply({ content: t(locale, 'bot.suggest.sentInChannel'), ephemeral: true });
    }
  },
};

async function handleExport(interaction, guild, locale) {
  const platform = interaction.options.getString('plateforme') || 'github';
  const suggestionId = interaction.options.getString('id');
  const suggestion = await prisma.suggestion.findFirst({
    where: { guildId: guild.id, id: suggestionId },
  });
  if (!suggestion) return interaction.reply({ content: t(locale, 'bot.suggest.notFound'), ephemeral: true });

  await interaction.deferReply({ ephemeral: true });

  const title = `[Suggestion] ${suggestion.content.slice(0, 80)}`;
  const body = `## Suggestion Discord\n\n${suggestion.content}\n\n---\n*Par ${suggestion.authorName} | ${suggestion.upvotes.length} upvotes, ${suggestion.downvotes.length} downvotes*`;

  try {
    switch (platform) {
      case 'github': {
        if (!guild.config?.githubEnabled || !guild.config?.githubToken || !guild.config?.githubRepo) {
          return interaction.editReply(t(locale, 'bot.suggest.githubNotConfigured'));
        }
        const res = await fetch(`https://api.github.com/repos/${guild.config.githubRepo}/issues`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${guild.config.githubToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({ title, body, labels: ['suggestion', 'discord'] }),
        });
        const issue = await res.json();
        await interaction.editReply(t(locale, 'bot.suggest.githubCreated', { url: issue.html_url }));
        break;
      }

      case 'trello': {
        if (!guild.config?.trelloEnabled || !guild.config?.trelloToken || !guild.config?.trelloBoardId) {
          return interaction.editReply(t(locale, 'bot.suggest.trelloNotConfigured'));
        }
        // Get first list of the board
        const listsRes = await fetch(`https://api.trello.com/1/boards/${guild.config.trelloBoardId}/lists?key=${guild.config.trelloToken.split(':')[0]}&token=${guild.config.trelloToken.split(':')[1]}`);
        const lists = await listsRes.json();
        if (!lists.length) return interaction.editReply(t(locale, 'bot.suggest.trelloNoList'));

        const cardRes = await fetch(`https://api.trello.com/1/cards?key=${guild.config.trelloToken.split(':')[0]}&token=${guild.config.trelloToken.split(':')[1]}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idList: lists[0].id, name: title, desc: body }),
        });
        const card = await cardRes.json();
        await interaction.editReply(t(locale, 'bot.suggest.trelloCreated', { url: card.shortUrl }));
        break;
      }

      case 'linear': {
        if (!guild.config?.linearEnabled || !guild.config?.linearApiKey || !guild.config?.linearTeamId) {
          return interaction.editReply(t(locale, 'bot.suggest.linearNotConfigured'));
        }
        const linearRes = await fetch('https://api.linear.app/graphql', {
          method: 'POST',
          headers: {
            'Authorization': guild.config.linearApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `mutation { issueCreate(input: { teamId: "${guild.config.linearTeamId}", title: "${title.replace(/"/g, '\\"')}", description: "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" }) { success issue { url } } }`,
          }),
        });
        const linearData = await linearRes.json();
        const issueUrl = linearData.data?.issueCreate?.issue?.url;
        await interaction.editReply(issueUrl ? t(locale, 'bot.suggest.linearCreated', { url: issueUrl }) : t(locale, 'bot.suggest.linearError'));
        break;
      }

      case 'jira': {
        if (!guild.config?.jiraEnabled || !guild.config?.jiraUrl || !guild.config?.jiraEmail || !guild.config?.jiraToken || !guild.config?.jiraProject) {
          return interaction.editReply(t(locale, 'bot.suggest.jiraNotConfigured'));
        }
        const auth = Buffer.from(`${guild.config.jiraEmail}:${guild.config.jiraToken}`).toString('base64');
        const jiraRes = await fetch(`${guild.config.jiraUrl}/rest/api/3/issue`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              project: { key: guild.config.jiraProject },
              summary: title,
              description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: suggestion.content }] }] },
              issuetype: { name: 'Task' },
            },
          }),
        });
        const jiraData = await jiraRes.json();
        const jiraUrl = jiraData.key ? `${guild.config.jiraUrl}/browse/${jiraData.key}` : null;
        await interaction.editReply(jiraUrl ? t(locale, 'bot.suggest.jiraCreated', { url: jiraUrl }) : t(locale, 'bot.suggest.jiraError'));
        break;
      }
    }
  } catch (err) {
    console.error('Export error:', err.message);
    await interaction.editReply(t(locale, 'bot.suggest.exportError', { platform }));
  }
}
