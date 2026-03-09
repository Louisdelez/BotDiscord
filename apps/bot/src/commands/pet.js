const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { prisma } = require('shared');
const sharp = require('sharp');
const path = require('path');
const { t, resolveLocale } = require('i18n');

const ASSETS = path.join(__dirname, '..', '..', 'assets', 'pets');

const SPECIES = {
  cat: { emoji: '🐱', name: 'Chat' },
  dog: { emoji: '🐶', name: 'Chien' },
  dragon: { emoji: '🐉', name: 'Dragon' },
  phoenix: { emoji: '🦅', name: 'Phénix' },
  wolf: { emoji: '🐺', name: 'Loup' },
  rabbit: { emoji: '🐰', name: 'Lapin' },
};

function getSpeciesName(locale, key) {
  return t(locale, `bot.pet.species.${key}`);
}

function petImage(species, action) {
  return path.join(ASSETS, species, `${action}.png`);
}

async function createBattleImage(species1, species2) {
  const img1 = sharp(petImage(species1, 'battle')).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).flop(); // flip to face right
  const img2 = sharp(petImage(species2, 'battle')).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }); // already faces left

  const [buf1, buf2] = await Promise.all([img1.png().toBuffer(), img2.png().toBuffer()]);

  const combined = await sharp({
    create: { width: 560, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: buf1, left: 0, top: 0 },
      { input: buf2, left: 304, top: 0 },
    ])
    .png()
    .toBuffer();

  return combined;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pet')
    .setDescription('Gérer votre animal virtuel')
    .addSubcommand(sub => sub
      .setName('adopt')
      .setDescription('Adopter un animal')
      .addStringOption(o => o.setName('nom').setDescription('Nom de l\'animal').setRequired(true))
      .addStringOption(o => o.setName('espèce').setDescription('Espèce').setRequired(true)
        .addChoices(...Object.entries(SPECIES).map(([k, v]) => ({ name: `${v.emoji} ${v.name}`, value: k })))))
    .addSubcommand(sub => sub.setName('stats').setDescription('Voir les stats de votre animal'))
    .addSubcommand(sub => sub.setName('feed').setDescription('Nourrir votre animal'))
    .addSubcommand(sub => sub.setName('play').setDescription('Jouer avec votre animal'))
    .addSubcommand(sub => sub.setName('train').setDescription('Entraîner votre animal'))
    .addSubcommand(sub => sub
      .setName('battle')
      .setDescription('Combattre un autre animal')
      .addUserOption(o => o.setName('adversaire').setDescription('L\'adversaire').setRequired(true))),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!user) return interaction.reply({ content: t(locale, 'common.userNotFound'), ephemeral: true });

    const member = await prisma.guildMember.findFirst({ where: { userId: user.id, guildId: guild.id } });
    if (!member) return interaction.reply({ content: t(locale, 'common.memberNotFound'), ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'adopt') {
      const existing = await prisma.pet.findFirst({ where: { memberId: member.id } });
      if (existing) return interaction.reply({ content: t(locale, 'bot.pet.alreadyHas', { name: existing.name }), ephemeral: true });

      const name = interaction.options.getString('nom');
      const species = interaction.options.getString('espèce');

      const pet = await prisma.pet.create({
        data: { guildId: guild.id, memberId: member.id, name, species },
      });

      const spName = getSpeciesName(locale, species);
      const attachment = new AttachmentBuilder(petImage(species, 'default'), { name: 'pet.png' });
      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.pet.adopted', { species: spName }))
        .setDescription(t(locale, 'bot.pet.adoptedDesc', { species: spName, name }))
        .setColor(0x2ecc71)
        .setThumbnail('attachment://pet.png')
        .addFields(
          { name: t(locale, 'bot.pet.fieldHunger'), value: statBar(100), inline: true },
          { name: t(locale, 'bot.pet.fieldHappiness'), value: statBar(100), inline: true },
          { name: t(locale, 'bot.pet.fieldEnergy'), value: statBar(100), inline: true },
        );

      await interaction.reply({ embeds: [embed], files: [attachment] });
      return;
    }

    const pet = await prisma.pet.findFirst({ where: { memberId: member.id } });
    if (!pet) return interaction.reply({ content: t(locale, 'bot.pet.noPet'), ephemeral: true });

    // Decay stats over time
    await decayPetStats(pet);
    const freshPet = await prisma.pet.findUnique({ where: { id: pet.id } });

    if (sub === 'stats') {
      const spName = getSpeciesName(locale, freshPet.species);
      const attachment = new AttachmentBuilder(petImage(freshPet.species, 'default'), { name: 'pet.png' });
      const embed = new EmbedBuilder()
        .setTitle(`${spName} — ${freshPet.name}`)
        .setColor(0x3498db)
        .setThumbnail('attachment://pet.png')
        .addFields(
          { name: t(locale, 'bot.pet.fieldSpecies'), value: spName, inline: true },
          { name: t(locale, 'bot.pet.fieldLevel'), value: `${freshPet.level}`, inline: true },
          { name: t(locale, 'bot.pet.fieldXp'), value: `${freshPet.xp}/${freshPet.level * 100}`, inline: true },
          { name: t(locale, 'bot.pet.fieldHunger'), value: statBar(freshPet.hunger), inline: true },
          { name: t(locale, 'bot.pet.fieldHappiness'), value: statBar(freshPet.happiness), inline: true },
          { name: t(locale, 'bot.pet.fieldEnergy'), value: statBar(freshPet.energy), inline: true },
          { name: t(locale, 'bot.pet.fieldWins'), value: `${freshPet.wins}`, inline: true },
          { name: t(locale, 'bot.pet.fieldLosses'), value: `${freshPet.losses}`, inline: true },
        );
      await interaction.reply({ embeds: [embed], files: [attachment] });
    }

    if (sub === 'feed') {
      if (freshPet.hunger >= 100) return interaction.reply({ content: t(locale, 'bot.pet.notHungry', { name: freshPet.name }), ephemeral: true });
      const gain = Math.min(30, 100 - freshPet.hunger);
      await prisma.pet.update({ where: { id: freshPet.id }, data: { hunger: freshPet.hunger + gain, lastFedAt: new Date() } });

      const attachment = new AttachmentBuilder(petImage(freshPet.species, 'feed'), { name: 'feed.png' });
      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.pet.fed', { name: freshPet.name }))
        .setDescription(t(locale, 'bot.pet.fedHunger', { hunger: freshPet.hunger + gain }))
        .setColor(0x2ecc71)
        .setThumbnail('attachment://feed.png');
      await interaction.reply({ embeds: [embed], files: [attachment] });
    }

    if (sub === 'play') {
      if (freshPet.energy < 10) return interaction.reply({ content: t(locale, 'bot.pet.tooTired', { name: freshPet.name }), ephemeral: true });
      const happGain = Math.min(25, 100 - freshPet.happiness);
      const xpGain = 15 + Math.floor(Math.random() * 10);
      const newXp = freshPet.xp + xpGain;
      let newLevel = freshPet.level;
      if (newXp >= freshPet.level * 100) newLevel++;

      await prisma.pet.update({
        where: { id: freshPet.id },
        data: { happiness: freshPet.happiness + happGain, energy: freshPet.energy - 10, xp: newXp >= newLevel * 100 ? newXp - (freshPet.level * 100) : newXp, level: newLevel, lastPlayedAt: new Date() },
      });

      const isLevelUp = newLevel > freshPet.level;
      const imgAction = isLevelUp ? 'levelup' : 'play';
      const attachment = new AttachmentBuilder(petImage(freshPet.species, imgAction), { name: `${imgAction}.png` });
      let desc = t(locale, 'bot.pet.playResult', { name: freshPet.name, xp: xpGain });
      if (isLevelUp) desc += '\n' + t(locale, 'bot.pet.levelUpNotice', { level: newLevel });

      const embed = new EmbedBuilder()
        .setTitle(isLevelUp ? t(locale, 'bot.pet.levelUp', { name: freshPet.name }) : t(locale, 'bot.pet.playTitle', { name: freshPet.name }))
        .setDescription(desc)
        .setColor(isLevelUp ? 0xf1c40f : 0x2ecc71)
        .setThumbnail(`attachment://${imgAction}.png`);
      await interaction.reply({ embeds: [embed], files: [attachment] });
    }

    if (sub === 'train') {
      if (freshPet.energy < 20) return interaction.reply({ content: t(locale, 'bot.pet.tooTired', { name: freshPet.name }), ephemeral: true });

      const cooldown = freshPet.lastTrainedAt ? (Date.now() - new Date(freshPet.lastTrainedAt).getTime()) / 1000 : 9999;
      if (cooldown < 3600) return interaction.reply({ content: t(locale, 'bot.pet.trainCooldown', { name: freshPet.name, time: `<t:${Math.floor((new Date(freshPet.lastTrainedAt).getTime() + 3600000) / 1000)}:R>` }), ephemeral: true });

      const xpGain = 30 + Math.floor(Math.random() * 20);
      const newXp = freshPet.xp + xpGain;
      let newLevel = freshPet.level;
      if (newXp >= freshPet.level * 100) newLevel++;

      await prisma.pet.update({
        where: { id: freshPet.id },
        data: { energy: freshPet.energy - 20, hunger: Math.max(0, freshPet.hunger - 15), xp: newXp >= newLevel * 100 ? newXp - (freshPet.level * 100) : newXp, level: newLevel, lastTrainedAt: new Date() },
      });

      const isLevelUp = newLevel > freshPet.level;
      const imgAction = isLevelUp ? 'levelup' : 'train';
      const attachment = new AttachmentBuilder(petImage(freshPet.species, imgAction), { name: `${imgAction}.png` });
      let desc = t(locale, 'bot.pet.trainResult', { name: freshPet.name, xp: xpGain });
      if (isLevelUp) desc += '\n' + t(locale, 'bot.pet.levelUpNotice', { level: newLevel });

      const embed = new EmbedBuilder()
        .setTitle(isLevelUp ? t(locale, 'bot.pet.levelUp', { name: freshPet.name }) : t(locale, 'bot.pet.trainTitle', { name: freshPet.name }))
        .setDescription(desc)
        .setColor(isLevelUp ? 0xf1c40f : 0xe67e22)
        .setThumbnail(`attachment://${imgAction}.png`);
      await interaction.reply({ embeds: [embed], files: [attachment] });
    }

    if (sub === 'battle') {
      const opponent = interaction.options.getUser('adversaire');
      if (opponent.id === interaction.user.id) return interaction.reply({ content: t(locale, 'bot.pet.cantFightSelf'), ephemeral: true });

      const oppUser = await prisma.user.findUnique({ where: { discordId: opponent.id } });
      if (!oppUser) return interaction.reply({ content: t(locale, 'bot.pet.opponentNotFound'), ephemeral: true });
      const oppMember = await prisma.guildMember.findFirst({ where: { userId: oppUser.id, guildId: guild.id } });
      if (!oppMember) return interaction.reply({ content: t(locale, 'bot.pet.opponentNotFound'), ephemeral: true });
      const oppPet = await prisma.pet.findFirst({ where: { memberId: oppMember.id } });
      if (!oppPet) return interaction.reply({ content: t(locale, 'bot.pet.opponentNoPet', { opponent: opponent.username }), ephemeral: true });

      if (freshPet.energy < 15) return interaction.reply({ content: t(locale, 'bot.pet.tooTired', { name: freshPet.name }), ephemeral: true });

      const myPower = freshPet.level * 10 + Math.floor(Math.random() * 20);
      const oppPower = oppPet.level * 10 + Math.floor(Math.random() * 20);
      const win = myPower >= oppPower;

      const sp1Name = getSpeciesName(locale, freshPet.species);
      const sp2Name = getSpeciesName(locale, oppPet.species);

      await prisma.pet.update({ where: { id: freshPet.id }, data: { wins: { increment: win ? 1 : 0 }, losses: { increment: win ? 0 : 1 }, energy: freshPet.energy - 15 } });
      await prisma.pet.update({ where: { id: oppPet.id }, data: { wins: { increment: win ? 0 : 1 }, losses: { increment: win ? 1 : 0 } } });

      // Create battle image: pet A (left) vs pet B flipped (right)
      const battleBuffer = await createBattleImage(freshPet.species, oppPet.species);
      const attachment = new AttachmentBuilder(battleBuffer, { name: 'battle.png' });

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.pet.battleTitle'))
        .setDescription(t(locale, 'bot.pet.battleSubtitle', { pet1: freshPet.name, species1: sp1Name, level1: freshPet.level, pet2: oppPet.name, species2: sp2Name, level2: oppPet.level }))
        .setImage('attachment://battle.png')
        .addFields(
          { name: t(locale, 'bot.pet.fieldPower'), value: `${myPower} vs ${oppPower}`, inline: true },
          { name: t(locale, 'bot.pet.fieldResult'), value: t(locale, 'bot.pet.battleResult', { name: win ? freshPet.name : oppPet.name }), inline: true },
        )
        .setColor(win ? 0x2ecc71 : 0xe74c3c);

      await interaction.reply({ embeds: [embed], files: [attachment] });
    }
  },
};

async function decayPetStats(pet) {
  const now = Date.now();
  const hoursSinceUpdate = (now - new Date(pet.updatedAt).getTime()) / 3600000;
  if (hoursSinceUpdate < 1) return;

  const decay = Math.floor(hoursSinceUpdate * 3);
  await prisma.pet.update({
    where: { id: pet.id },
    data: {
      hunger: Math.max(0, pet.hunger - decay),
      happiness: Math.max(0, pet.happiness - Math.floor(decay * 0.5)),
      energy: Math.min(100, pet.energy + Math.floor(hoursSinceUpdate * 5)),
    },
  });
}

function statBar(value) {
  const filled = Math.round(value / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  if (value > 60) return `\`${bar}\` ${value}/100`;
  if (value > 30) return `\`${bar}\` ${value}/100`;
  return `\`${bar}\` ${value}/100`;
}
