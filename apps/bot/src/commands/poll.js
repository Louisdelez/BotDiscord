const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Créer un sondage')
    .addStringOption(o => o.setName('question').setDescription('La question').setRequired(true))
    .addStringOption(o => o.setName('options').setDescription('Options séparées par | (ex: Oui|Non|Peut-être)').setRequired(true))
    .addStringOption(o => o.setName('durée').setDescription('Durée (ex: 1h, 30m, 1d)')),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const question = interaction.options.getString('question');
    const optionsStr = interaction.options.getString('options');
    const duration = interaction.options.getString('durée');
    const options = optionsStr.split('|').map(s => s.trim()).filter(Boolean).slice(0, 10);

    if (options.length < 2) return interaction.reply({ content: t(locale, 'bot.poll.minOptions'), ephemeral: true });

    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const endsAt = duration ? new Date(Date.now() + parseTime(duration)) : null;
    const votes = {};
    options.forEach((_, i) => { votes[i] = []; });

    const embed = buildPollEmbed(question, options, votes, interaction.user.username, endsAt, locale);

    const rows = [];
    for (let i = 0; i < options.length; i += 5) {
      const row = new ActionRowBuilder();
      for (let j = i; j < Math.min(i + 5, options.length); j++) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll_vote_${j}`)
            .setLabel(options[j])
            .setEmoji(EMOJIS[j])
            .setStyle(ButtonStyle.Secondary)
        );
      }
      rows.push(row);
    }

    const reply = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

    await prisma.poll.create({
      data: {
        guildId: guild.id,
        channelId: interaction.channel.id,
        messageId: reply.id,
        question,
        options,
        votes: JSON.stringify(votes),
        authorId: interaction.user.id,
        endsAt,
      },
    });
  },
};

function buildPollEmbed(question, options, votes, author, endsAt, locale) {
  const totalVotes = Object.values(votes).reduce((sum, v) => sum + v.length, 0);

  const description = options.map((opt, i) => {
    const count = (votes[i] || []).length;
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
    return `${EMOJIS[i]} **${opt}**\n${bar} ${pct}% (${count})`;
  }).join('\n\n');

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${question}`)
    .setDescription(description)
    .setColor(0x0071e3)
    .setFooter({ text: t(locale, 'bot.poll.footer', { author, votes: totalVotes }) });

  if (endsAt) embed.addFields({ name: t(locale, 'bot.poll.fieldEnd'), value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>` });

  return embed;
}

function parseTime(str) {
  const match = str?.match(/^(\d+)\s*(m|h|d|j)$/i);
  if (!match) return 3600000;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const mult = { m: 60000, h: 3600000, d: 86400000, j: 86400000 };
  return num * (mult[unit] || 3600000);
}

module.exports.buildPollEmbed = buildPollEmbed;
module.exports.EMOJIS = EMOJIS;
