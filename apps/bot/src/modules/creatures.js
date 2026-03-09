const { prisma } = require('shared');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('i18n');

const DEFAULT_CREATURES = [
  { name: 'Flamby', emoji: '🔥', rarity: 'common', baseHp: 40, baseAtk: 12, baseDef: 5, element: 'fire' },
  { name: 'Aquali', emoji: '💧', rarity: 'common', baseHp: 45, baseAtk: 10, baseDef: 8, element: 'water' },
  { name: 'Terrok', emoji: '🪨', rarity: 'common', baseHp: 55, baseAtk: 8, baseDef: 12, element: 'earth' },
  { name: 'Zephyr', emoji: '💨', rarity: 'common', baseHp: 35, baseAtk: 14, baseDef: 4, element: 'air' },
  { name: 'Sparky', emoji: '⚡', rarity: 'common', baseHp: 38, baseAtk: 13, baseDef: 5, element: 'neutral' },
  { name: 'Florax', emoji: '🌿', rarity: 'uncommon', baseHp: 50, baseAtk: 11, baseDef: 10, element: 'earth' },
  { name: 'Ignium', emoji: '🌋', rarity: 'uncommon', baseHp: 45, baseAtk: 15, baseDef: 7, element: 'fire' },
  { name: 'Ondine', emoji: '🌊', rarity: 'uncommon', baseHp: 55, baseAtk: 12, baseDef: 11, element: 'water' },
  { name: 'Ventus', emoji: '🌪️', rarity: 'uncommon', baseHp: 40, baseAtk: 16, baseDef: 6, element: 'air' },
  { name: 'Luminos', emoji: '✨', rarity: 'uncommon', baseHp: 42, baseAtk: 14, baseDef: 8, element: 'neutral' },
  { name: 'Pyrodon', emoji: '🐲', rarity: 'rare', baseHp: 60, baseAtk: 18, baseDef: 12, element: 'fire' },
  { name: 'Leviath', emoji: '🐋', rarity: 'rare', baseHp: 70, baseAtk: 14, baseDef: 16, element: 'water' },
  { name: 'Golem', emoji: '🗿', rarity: 'rare', baseHp: 80, baseAtk: 12, baseDef: 20, element: 'earth' },
  { name: 'Griffon', emoji: '🦅', rarity: 'rare', baseHp: 55, baseAtk: 20, baseDef: 10, element: 'air' },
  { name: 'Crystax', emoji: '💎', rarity: 'rare', baseHp: 60, baseAtk: 16, baseDef: 14, element: 'neutral' },
  { name: 'Infernox', emoji: '😈', rarity: 'epic', baseHp: 75, baseAtk: 24, baseDef: 15, element: 'fire' },
  { name: 'Tsunami', emoji: '🌀', rarity: 'epic', baseHp: 85, baseAtk: 20, baseDef: 18, element: 'water' },
  { name: 'Titan', emoji: '⛰️', rarity: 'epic', baseHp: 100, baseAtk: 16, baseDef: 25, element: 'earth' },
  { name: 'Tempest', emoji: '🌩️', rarity: 'epic', baseHp: 65, baseAtk: 28, baseDef: 12, element: 'air' },
  { name: 'Celestia', emoji: '🌟', rarity: 'legendary', baseHp: 90, baseAtk: 30, baseDef: 20, element: 'neutral' },
  { name: 'Draconix', emoji: '🐉', rarity: 'legendary', baseHp: 100, baseAtk: 28, baseDef: 22, element: 'fire' },
  { name: 'Poseidon', emoji: '🔱', rarity: 'legendary', baseHp: 95, baseAtk: 25, baseDef: 25, element: 'water' },
];

const RARITY_WEIGHTS = { common: 50, uncommon: 25, rare: 15, epic: 8, legendary: 2 };
const RARITY_COLORS = { common: 0x95a5a6, uncommon: 0x2ecc71, rare: 0x3498db, epic: 0x9b59b6, legendary: 0xf39c12 };
const CATCH_RATES = { common: 0.90, uncommon: 0.70, rare: 0.45, epic: 0.20, legendary: 0.05 };

async function ensureDefaultCreatures(guildId) {
  const existing = await prisma.creature.findMany({ where: { guildId } });
  if (existing.length > 0) return;
  await prisma.creature.createMany({
    data: DEFAULT_CREATURES.map(c => ({ guildId, ...c })),
    skipDuplicates: true,
  });
}

function pickRarity() {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'common';
}

async function maybeSpawnCreature(message, guild, client) {
  const spawnRate = guild.config?.creatureSpawnRate || 50;
  if (Math.random() * 100 > (100 / spawnRate)) return;

  // Check if there's already an active spawn in this channel
  const activeSpawn = await prisma.creatureSpawn.findFirst({
    where: { guildId: guild.id, channelId: message.channel.id, active: true },
  });
  if (activeSpawn) return;

  await ensureDefaultCreatures(guild.id);

  const rarity = pickRarity();
  const creatures = await prisma.creature.findMany({
    where: { guildId: guild.id, rarity },
  });
  if (creatures.length === 0) return;

  const creature = creatures[Math.floor(Math.random() * creatures.length)];
  const shiny = Math.random() < 0.01;

  const embed = new EmbedBuilder()
    .setTitle(t('fr', 'bot.creatures.wildAppears', { emoji: creature.emoji }))
    .setDescription(`${t('fr', 'bot.creatures.wildDesc', { name: creature.name, rarity })}${shiny ? t('fr', 'bot.creatures.wildShiny') : ''}`)
    .setColor(RARITY_COLORS[rarity])
    .addFields(
      { name: '❤️ HP', value: `${creature.baseHp}`, inline: true },
      { name: '⚔️ ATK', value: `${creature.baseAtk}`, inline: true },
      { name: '🛡️ DEF', value: `${creature.baseDef}`, inline: true },
    )
    .setFooter({ text: t('fr', 'bot.creatures.catchPrompt') });

  const msg = await message.channel.send({ embeds: [embed] });

  await prisma.creatureSpawn.create({
    data: {
      guildId: guild.id,
      channelId: message.channel.id,
      messageId: msg.id,
      creatureName: creature.name,
      rarity: creature.rarity,
      active: true,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });
}

async function cleanupExpiredSpawns() {
  await prisma.creatureSpawn.updateMany({
    where: { active: true, expiresAt: { lte: new Date() } },
    data: { active: false },
  });
}

module.exports = { maybeSpawnCreature, cleanupExpiredSpawns, CATCH_RATES, RARITY_COLORS };
