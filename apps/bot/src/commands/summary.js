const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma, aiGenerate } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('summary')
    .setDescription('Résumer les derniers messages du channel')
    .addIntegerOption(o => o.setName('count').setDescription('Nombre de messages (max 100)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    await interaction.deferReply();

    const count = Math.min(interaction.options.getInteger('count') || 50, 100);
    const messages = await interaction.channel.messages.fetch({ limit: count });

    const content = messages
      .reverse()
      .filter(m => !m.author.bot && m.content)
      .map(m => `${m.author.username}: ${m.content}`)
      .join('\n');

    if (!content) return interaction.editReply(t(locale, 'bot.summary.notEnough'));

    // Chunk if needed
    const truncated = content.slice(0, 3000);

    try {
      const guild = await prisma.guild.findUnique({
        where: { discordId: interaction.guild.id },
        include: { aiConfig: true },
      });
      const aiConfig = guild?.aiConfig || {};

      const response = await aiGenerate(aiConfig, t(locale, 'bot.summary.prompt', { text: truncated }), { temperature: 0.3, maxTokens: 500 });
      await interaction.editReply(t(locale, 'bot.summary.result', { count, summary: response || t(locale, 'bot.summary.error') }));
    } catch {
      await interaction.editReply(t(locale, 'bot.summary.aiUnavailable'));
    }
  },
};
