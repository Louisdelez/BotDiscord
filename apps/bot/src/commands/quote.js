const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Sauvegarder ou voir une citation')
    .addSubcommand(sub => sub
      .setName('save')
      .setDescription('Sauvegarder une citation')
      .addUserOption(o => o.setName('auteur').setDescription('Qui a dit ça').setRequired(true))
      .addStringOption(o => o.setName('citation').setDescription('La citation').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('random')
      .setDescription('Afficher une citation aléatoire'))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Lister les citations')
      .addUserOption(o => o.setName('auteur').setDescription('Filtrer par auteur'))),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'save') {
      const author = interaction.options.getUser('auteur');
      const content = interaction.options.getString('citation');

      await prisma.quote.create({
        data: {
          guildId: guild.id,
          content,
          authorId: author.id,
          authorName: author.username,
          savedById: interaction.user.id,
          channelId: interaction.channel.id,
        },
      });

      const embed = new EmbedBuilder()
        .setDescription(`"${content}"`)
        .setColor(0xf5a623)
        .setFooter({ text: t(locale, 'bot.quote.footer', { author: author.username, savedBy: interaction.user.username }) });

      await interaction.reply({ content: t(locale, 'bot.quote.saved'), embeds: [embed] });
    }

    if (sub === 'random') {
      const quotes = await prisma.quote.findMany({ where: { guildId: guild.id } });
      if (quotes.length === 0) return interaction.reply({ content: t(locale, 'bot.quote.noQuotes'), ephemeral: true });

      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      const embed = new EmbedBuilder()
        .setDescription(`"${quote.content}"`)
        .setColor(0xf5a623)
        .setFooter({ text: `— ${quote.authorName}` })
        .setTimestamp(quote.createdAt);

      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'list') {
      const author = interaction.options.getUser('auteur');
      const where = { guildId: guild.id };
      if (author) where.authorId = author.id;

      const quotes = await prisma.quote.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10 });
      if (quotes.length === 0) return interaction.reply({ content: t(locale, 'bot.quote.noResults'), ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.quote.title'))
        .setColor(0xf5a623)
        .setDescription(quotes.map((q, i) => `**${i + 1}.** "${q.content}" — *${q.authorName}*`).join('\n\n'));

      await interaction.reply({ embeds: [embed] });
    }
  },
};
