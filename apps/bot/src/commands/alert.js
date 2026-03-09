const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert')
    .setDescription('Alertes par mots-clés')
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Ajouter un mot-clé à surveiller')
      .addStringOption(o => o.setName('keyword').setDescription('Le mot-clé').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Supprimer un mot-clé')
      .addStringOption(o => o.setName('keyword').setDescription('Le mot-clé').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Lister vos alertes')),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!user) return interaction.reply({ content: t(locale, 'common.userNotFound'), ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const keyword = interaction.options.getString('keyword').toLowerCase();

      await prisma.keywordAlert.upsert({
        where: { userId_guildDiscordId_keyword: { userId: user.id, guildDiscordId: interaction.guild.id, keyword } },
        update: {},
        create: { userId: user.id, guildDiscordId: interaction.guild.id, keyword },
      });

      await interaction.reply({ content: t(locale, 'bot.alert.added', { keyword }), ephemeral: true });
    }

    if (sub === 'remove') {
      const keyword = interaction.options.getString('keyword').toLowerCase();

      await prisma.keywordAlert.deleteMany({
        where: { userId: user.id, guildDiscordId: interaction.guild.id, keyword },
      });

      await interaction.reply({ content: t(locale, 'bot.alert.removed', { keyword }), ephemeral: true });
    }

    if (sub === 'list') {
      const alerts = await prisma.keywordAlert.findMany({
        where: { userId: user.id, guildDiscordId: interaction.guild.id },
      });

      if (alerts.length === 0) return interaction.reply({ content: t(locale, 'bot.alert.noAlerts'), ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.alert.title'))
        .setColor(0xf39c12)
        .setDescription(alerts.map(a => `• **${a.keyword}**`).join('\n'));

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
