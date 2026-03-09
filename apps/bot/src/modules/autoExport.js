const { EmbedBuilder } = require('discord.js');
const { t } = require('i18n');

async function autoExportSuggestion(suggestion, guild, upvoteCount, downvoteCount, channel) {
  const platform = guild.config.autoExportPlatform || 'github';
  const title = `[Suggestion] ${suggestion.content.slice(0, 80)}`;
  const body = `## Suggestion Discord\n\n${suggestion.content}\n\n---\n*Par ${suggestion.authorName} | ${upvoteCount} upvotes, ${downvoteCount} downvotes*\n*Auto-exporté après ${upvoteCount} votes positifs*`;

  let exportUrl = null;

  switch (platform) {
    case 'github': {
      if (!guild.config.githubEnabled || !guild.config.githubToken || !guild.config.githubRepo) return;
      const res = await fetch(`https://api.github.com/repos/${guild.config.githubRepo}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${guild.config.githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ title, body, labels: ['suggestion', 'discord', 'auto-export'] }),
      });
      const issue = await res.json();
      exportUrl = issue.html_url;
      break;
    }

    case 'trello': {
      if (!guild.config.trelloEnabled || !guild.config.trelloToken || !guild.config.trelloBoardId) return;
      const [apiKey, token] = guild.config.trelloToken.split(':');
      const listsRes = await fetch(`https://api.trello.com/1/boards/${guild.config.trelloBoardId}/lists?key=${apiKey}&token=${token}`);
      const lists = await listsRes.json();
      if (!lists.length) return;

      const cardRes = await fetch(`https://api.trello.com/1/cards?key=${apiKey}&token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idList: lists[0].id, name: title, desc: body }),
      });
      const card = await cardRes.json();
      exportUrl = card.shortUrl;
      break;
    }

    case 'linear': {
      if (!guild.config.linearEnabled || !guild.config.linearApiKey || !guild.config.linearTeamId) return;
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
      exportUrl = linearData.data?.issueCreate?.issue?.url;
      break;
    }

    case 'jira': {
      if (!guild.config.jiraEnabled || !guild.config.jiraUrl || !guild.config.jiraEmail || !guild.config.jiraToken || !guild.config.jiraProject) return;
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
      exportUrl = jiraData.key ? `${guild.config.jiraUrl}/browse/${jiraData.key}` : null;
      break;
    }
  }

  if (exportUrl && channel) {
    const embed = new EmbedBuilder()
      .setTitle(t('fr', 'bot.autoExport.title'))
      .setDescription(t('fr', 'bot.autoExport.desc', { votes: upvoteCount, platform }))
      .addFields({ name: t('fr', 'bot.autoExport.fieldLink'), value: exportUrl })
      .setColor(0x2ecc71)
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  }
}

module.exports = { autoExportSuggestion };
