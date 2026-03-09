const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

const RARITY_EMOJI = { common: '⚪', uncommon: '🟢', rare: '🔵', epic: '🟣', legendary: '🟡' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('collection')
    .setDescription('Gérer votre collection de créatures')
    .addSubcommand(sub => sub
      .setName('view')
      .setDescription('Voir votre collection')
      .addUserOption(o => o.setName('user').setDescription('Voir la collection d\'un membre')))
    .addSubcommand(sub => sub
      .setName('detail')
      .setDescription('Détail d\'une créature')
      .addStringOption(o => o.setName('name').setDescription('Nom de la créature').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('release')
      .setDescription('Relâcher une créature')
      .addStringOption(o => o.setName('name').setDescription('Nom de la créature').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('rename')
      .setDescription('Renommer une créature')
      .addStringOption(o => o.setName('name').setDescription('Nom actuel').setRequired(true))
      .addStringOption(o => o.setName('nickname').setDescription('Nouveau surnom').setRequired(true))),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const sub = interaction.options.getSubcommand();
    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const target = sub === 'view' ? (interaction.options.getUser('user') || interaction.user) : interaction.user;
    const user = await prisma.user.findUnique({ where: { discordId: target.id } });
    if (!user) return interaction.reply({ content: t(locale, 'common.memberNotFound'), ephemeral: true });

    const member = await prisma.guildMember.findFirst({
      where: { userId: user.id, guildId: guild.id },
    });
    if (!member) return interaction.reply({ content: t(locale, 'common.noData'), ephemeral: true });

    switch (sub) {
      case 'view': {
        const creatures = await prisma.collectedCreature.findMany({
          where: { guildId: guild.id, memberId: member.id },
          orderBy: [{ rarity: 'asc' }, { creatureName: 'asc' }],
        });

        if (creatures.length === 0) {
          return interaction.reply({ content: t(locale, 'bot.collection.empty'), ephemeral: true });
        }

        const PAGE_SIZE = 10;
        const pages = [];
        for (let i = 0; i < creatures.length; i += PAGE_SIZE) {
          const page = creatures.slice(i, i + PAGE_SIZE);
          pages.push(page.map((c, idx) => {
            const name = c.nickname || c.creatureName;
            const shiny = c.shiny ? ' ✨' : '';
            return `${RARITY_EMOJI[c.rarity]} **${name}**${shiny} — Niv.${c.level} (${c.rarity})`;
          }).join('\n'));
        }

        const embed = new EmbedBuilder()
          .setTitle(t(locale, 'bot.collection.title', { target: target.username }))
          .setDescription(pages[0])
          .setColor(0x3498db)
          .setFooter({ text: t(locale, 'bot.collection.footer', { count: creatures.length, pages: pages.length }) });

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'detail': {
        const name = interaction.options.getString('name');
        const creature = await prisma.collectedCreature.findFirst({
          where: { guildId: guild.id, memberId: member.id, creatureName: name },
        });
        if (!creature) return interaction.reply({ content: t(locale, 'bot.collection.notInCollection'), ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle(`${RARITY_EMOJI[creature.rarity]} ${creature.nickname || creature.creatureName}${creature.shiny ? ' ✨' : ''}`)
          .setColor(creature.shiny ? 0xf1c40f : 0x3498db)
          .addFields(
            { name: t(locale, 'bot.collection.fieldRarity'), value: creature.rarity, inline: true },
            { name: t(locale, 'bot.collection.fieldElement'), value: creature.element, inline: true },
            { name: t(locale, 'bot.collection.fieldLevel'), value: `${creature.level}`, inline: true },
            { name: t(locale, 'bot.collection.fieldHp'), value: `${creature.hp}`, inline: true },
            { name: t(locale, 'bot.collection.fieldAtk'), value: `${creature.attack}`, inline: true },
            { name: t(locale, 'bot.collection.fieldDef'), value: `${creature.defense}`, inline: true },
          );

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'release': {
        const name = interaction.options.getString('name');
        const creature = await prisma.collectedCreature.findFirst({
          where: { guildId: guild.id, memberId: member.id, creatureName: name },
        });
        if (!creature) return interaction.reply({ content: t(locale, 'bot.collection.notInCollection'), ephemeral: true });

        await prisma.collectedCreature.delete({ where: { id: creature.id } });
        await interaction.reply(t(locale, 'bot.collection.released', { name: creature.nickname || creature.creatureName }));
        break;
      }

      case 'rename': {
        const name = interaction.options.getString('name');
        const nickname = interaction.options.getString('nickname');
        const creature = await prisma.collectedCreature.findFirst({
          where: { guildId: guild.id, memberId: member.id, creatureName: name },
        });
        if (!creature) return interaction.reply({ content: t(locale, 'bot.collection.notInCollection'), ephemeral: true });

        await prisma.collectedCreature.update({
          where: { id: creature.id },
          data: { nickname },
        });
        await interaction.reply(t(locale, 'bot.collection.renamed', { name, nickname }));
        break;
      }
    }
  },
};
