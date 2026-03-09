const { SlashCommandBuilder } = require('discord.js');
const { prisma, aiGenerate } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Poser une question à l\'IA')
    .addStringOption(o => o.setName('question').setDescription('Votre question').setRequired(true)),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    await interaction.deferReply();

    const question = interaction.options.getString('question');

    try {
      const guild = await prisma.guild.findUnique({
        where: { discordId: interaction.guild.id },
        include: { aiConfig: true },
      });
      const aiConfig = guild?.aiConfig || {};

      const reply = (await aiGenerate(aiConfig, question, { temperature: 0.7, maxTokens: 500 })) || t(locale, 'bot.ask.noResponse');

      if (reply.length > 2000) {
        await interaction.editReply(reply.slice(0, 2000));
      } else {
        await interaction.editReply(reply);
      }
    } catch {
      await interaction.editReply(t(locale, 'bot.ask.aiUnavailable'));
    }
  },
};
