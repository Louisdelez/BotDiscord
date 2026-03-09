const { SlashCommandBuilder, EmbedBuilder, GuildScheduledEventPrivacyLevel, GuildScheduledEventEntityType } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Gérer les événements')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Créer un template d\'événement')
      .addStringOption(o => o.setName('name').setDescription('Nom').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Description'))
      .addIntegerOption(o => o.setName('duration').setDescription('Durée en minutes')))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Lister les templates'))
    .addSubcommand(sub => sub
      .setName('use')
      .setDescription('Utiliser un template pour créer un événement Discord')
      .addStringOption(o => o.setName('name').setDescription('Nom du template').setRequired(true))
      .addStringOption(o => o.setName('date').setDescription('Date (YYYY-MM-DD HH:MM)').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('delete')
      .setDescription('Supprimer un template')
      .addStringOption(o => o.setName('name').setDescription('Nom du template').setRequired(true))),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const sub = interaction.options.getSubcommand();
    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    switch (sub) {
      case 'create': {
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description') || '';
        const duration = interaction.options.getInteger('duration');

        await prisma.eventTemplate.create({
          data: { guildId: guild.id, name, description, duration },
        });

        await interaction.reply(t(locale, 'bot.event.created', { name }));
        break;
      }

      case 'list': {
        const templates = await prisma.eventTemplate.findMany({
          where: { guildId: guild.id },
          orderBy: { createdAt: 'desc' },
        });

        if (templates.length === 0) {
          return interaction.reply({ content: t(locale, 'bot.event.noTemplates'), ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle(t(locale, 'bot.event.title'))
          .setColor(0x3498db)
          .setDescription(templates.map(tmpl =>
            `**${tmpl.name}** — ${tmpl.description || t(locale, 'bot.event.noDescription')} ${tmpl.duration ? `(${tmpl.duration}min)` : ''}`
          ).join('\n'));

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'use': {
        const name = interaction.options.getString('name');
        const dateStr = interaction.options.getString('date');

        const template = await prisma.eventTemplate.findFirst({
          where: { guildId: guild.id, name },
        });
        if (!template) return interaction.reply({ content: t(locale, 'bot.event.notFound'), ephemeral: true });

        const startDate = new Date(dateStr);
        if (isNaN(startDate.getTime())) {
          return interaction.reply({ content: t(locale, 'bot.event.invalidDate'), ephemeral: true });
        }

        const endDate = template.duration
          ? new Date(startDate.getTime() + template.duration * 60000)
          : new Date(startDate.getTime() + 3600000); // 1h par défaut

        try {
          const event = await interaction.guild.scheduledEvents.create({
            name: template.name,
            description: template.description || undefined,
            scheduledStartTime: startDate,
            scheduledEndTime: endDate,
            privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
            entityType: GuildScheduledEventEntityType.External,
            entityMetadata: { location: interaction.guild.name },
          });

          await interaction.reply(t(locale, 'bot.event.eventCreated', { name: template.name, date: startDate.toLocaleString('fr-FR') }));
        } catch (err) {
          await interaction.reply({ content: t(locale, 'bot.event.error', { message: err.message }), ephemeral: true });
        }
        break;
      }

      case 'delete': {
        const name = interaction.options.getString('name');

        const template = await prisma.eventTemplate.findFirst({
          where: { guildId: guild.id, name },
        });
        if (!template) return interaction.reply({ content: t(locale, 'bot.event.notFound'), ephemeral: true });

        await prisma.eventTemplate.delete({ where: { id: template.id } });
        await interaction.reply(t(locale, 'bot.event.deleted', { name }));
        break;
      }
    }
  },
};
