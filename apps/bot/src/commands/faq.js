const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Chercher dans la FAQ')
    .addStringOption(o => o.setName('query').setDescription('Votre recherche').setRequired(true)),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const query = interaction.options.getString('query');
    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const entries = await prisma.fAQEntry.findMany({ where: { guildId: guild.id } });
    if (entries.length === 0) return interaction.reply({ content: t(locale, 'bot.faq.empty'), ephemeral: true });

    // Simple keyword search
    const queryWords = query.toLowerCase().split(/\s+/);
    const results = entries
      .map(e => {
        const text = `${e.question} ${e.answer} ${e.tags.join(' ')}`.toLowerCase();
        const score = queryWords.filter(w => w.length > 2 && text.includes(w)).length;
        return { ...e, score };
      })
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (results.length === 0) return interaction.reply({ content: t(locale, 'bot.faq.noResults'), ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'bot.faq.title'))
      .setColor(0x0071e3)
      .setDescription(results.map(r => `**${r.question}**\n${r.answer}`).join('\n\n'));

    await interaction.reply({ embeds: [embed] });
  },
};
