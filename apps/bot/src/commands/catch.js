const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { CATCH_RATES, RARITY_COLORS } = require('../modules/creatures');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('catch')
    .setDescription('Capturer une créature sauvage'),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const spawn = await prisma.creatureSpawn.findFirst({
      where: { guildId: guild.id, channelId: interaction.channel.id, active: true },
    });

    if (!spawn) {
      return interaction.reply({ content: t(locale, 'bot.catch.noCreature'), ephemeral: true });
    }

    // Get creature template
    const creature = await prisma.creature.findFirst({
      where: { guildId: guild.id, name: spawn.creatureName },
    });
    if (!creature) {
      return interaction.reply({ content: t(locale, 'bot.catch.notFound'), ephemeral: true });
    }

    // Ensure member exists
    const user = await prisma.user.upsert({
      where: { discordId: interaction.user.id },
      update: { username: interaction.user.username },
      create: { discordId: interaction.user.id, username: interaction.user.username },
    });
    const member = await prisma.guildMember.upsert({
      where: { userId_guildId: { userId: user.id, guildId: guild.id } },
      update: {},
      create: { userId: user.id, guildId: guild.id },
    });

    // Catch probability based on rarity
    const catchRate = CATCH_RATES[spawn.rarity] || 0.5;
    const caught = Math.random() < catchRate;

    if (!caught) {
      // Deactivate spawn on failed legendary/epic catch
      if (spawn.rarity === 'legendary' || spawn.rarity === 'epic') {
        await prisma.creatureSpawn.update({
          where: { id: spawn.id },
          data: { active: false },
        });
      }

      const isRare = spawn.rarity === 'legendary' || spawn.rarity === 'epic';
      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.catch.missed'))
        .setDescription(isRare ? t(locale, 'bot.catch.escapedGone', { name: creature.name }) : t(locale, 'bot.catch.escaped', { name: creature.name }))
        .setColor(0xe74c3c);

      return interaction.reply({ embeds: [embed] });
    }

    // Deactivate spawn
    await prisma.creatureSpawn.update({
      where: { id: spawn.id },
      data: { active: false },
    });

    const shiny = Math.random() < 0.01;

    // Create collected creature
    await prisma.collectedCreature.create({
      data: {
        guildId: guild.id,
        memberId: member.id,
        creatureName: creature.name,
        hp: creature.baseHp,
        attack: creature.baseAtk,
        defense: creature.baseDef,
        rarity: creature.rarity,
        element: creature.element,
        shiny,
      },
    });

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'bot.catch.caught', { emoji: creature.emoji }))
      .setDescription(t(locale, 'bot.catch.caughtDesc', { user: interaction.user.username, name: creature.name }) + (shiny ? t(locale, 'bot.catch.caughtShiny') : ''))
      .setColor(RARITY_COLORS[creature.rarity])
      .addFields(
        { name: t(locale, 'bot.catch.fieldRarity'), value: creature.rarity, inline: true },
        { name: t(locale, 'bot.catch.fieldElement'), value: creature.element, inline: true },
        { name: t(locale, 'bot.catch.fieldStats'), value: `❤️${creature.baseHp} ⚔️${creature.baseAtk} 🛡️${creature.baseDef}`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
