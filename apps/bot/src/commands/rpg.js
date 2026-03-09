const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

const CLASSES = {
  warrior: { nameKey: 'bot.rpg.classes.warrior', emoji: '⚔️', baseHp: 150, baseAtk: 12, baseDef: 8 },
  mage: { nameKey: 'bot.rpg.classes.mage', emoji: '🧙', baseHp: 90, baseAtk: 18, baseDef: 3 },
  rogue: { nameKey: 'bot.rpg.classes.rogue', emoji: '🗡️', baseHp: 100, baseAtk: 15, baseDef: 5 },
  healer: { nameKey: 'bot.rpg.classes.healer', emoji: '💚', baseHp: 110, baseAtk: 8, baseDef: 6 },
};

const ADVENTURES = [
  { nameKey: 'bot.rpg.adventures.darkForest', minLevel: 1, goldReward: [10, 30], xpReward: [20, 50], enemyKeys: ['bot.rpg.enemies.goblin', 'bot.rpg.enemies.wolf', 'bot.rpg.enemies.giantSpider'] },
  { nameKey: 'bot.rpg.adventures.cursedDungeon', minLevel: 3, goldReward: [30, 70], xpReward: [50, 100], enemyKeys: ['bot.rpg.enemies.skeleton', 'bot.rpg.enemies.ghost', 'bot.rpg.enemies.necromancer'] },
  { nameKey: 'bot.rpg.adventures.dragonMountain', minLevel: 5, goldReward: [70, 150], xpReward: [100, 200], enemyKeys: ['bot.rpg.enemies.orc', 'bot.rpg.enemies.troll', 'bot.rpg.enemies.dragon'] },
  { nameKey: 'bot.rpg.adventures.infernalAbyss', minLevel: 8, goldReward: [150, 300], xpReward: [200, 400], enemyKeys: ['bot.rpg.enemies.demon', 'bot.rpg.enemies.lich', 'bot.rpg.enemies.archdemon'] },
];

const ITEM_KEYS = ['bot.rpg.items.healingPotion', 'bot.rpg.items.rustySword', 'bot.rpg.items.woodenShield', 'bot.rpg.items.magicAmulet', 'bot.rpg.items.speedBoots', 'bot.rpg.items.invisibilityCape', 'bot.rpg.items.strengthRing'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rpg')
    .setDescription('Jeu de rôle IdleRPG')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Créer un personnage')
      .addStringOption(o => o.setName('nom').setDescription('Nom du personnage').setRequired(true))
      .addStringOption(o => o.setName('classe').setDescription('Classe').setRequired(true)
        .addChoices(...Object.entries(CLASSES).map(([k, v]) => ({ name: `${v.emoji} ${v.name}`, value: k })))))
    .addSubcommand(sub => sub.setName('stats').setDescription('Voir votre personnage'))
    .addSubcommand(sub => sub.setName('adventure').setDescription('Partir en aventure'))
    .addSubcommand(sub => sub.setName('daily').setDescription('Récompense quotidienne'))
    .addSubcommand(sub => sub
      .setName('duel')
      .setDescription('Défier un joueur')
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

    if (sub === 'create') {
      const existing = await prisma.rPGCharacter.findUnique({ where: { memberId: member.id } });
      if (existing) return interaction.reply({ content: t(locale, 'bot.rpg.alreadyHasChar'), ephemeral: true });

      const name = interaction.options.getString('nom');
      const className = interaction.options.getString('classe');
      const cls = CLASSES[className];

      await prisma.rPGCharacter.create({
        data: {
          guildId: guild.id,
          memberId: member.id,
          name,
          className,
          hp: cls.baseHp,
          maxHp: cls.baseHp,
          attack: cls.baseAtk,
          defense: cls.baseDef,
        },
      });

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.rpg.created', { emoji: cls.emoji, name }))
        .setDescription(t(locale, 'bot.rpg.createdSubtitle', { className: t(locale, cls.nameKey) }))
        .setColor(0x9b59b6)
        .addFields(
          { name: t(locale, 'bot.rpg.fieldHp'), value: `${cls.baseHp}`, inline: true },
          { name: t(locale, 'bot.rpg.fieldAtk'), value: `${cls.baseAtk}`, inline: true },
          { name: t(locale, 'bot.rpg.fieldDef'), value: `${cls.baseDef}`, inline: true },
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const char = await prisma.rPGCharacter.findUnique({ where: { memberId: member.id } });
    if (!char) return interaction.reply({ content: t(locale, 'bot.rpg.noCharacter'), ephemeral: true });

    const cls = CLASSES[char.className];

    if (sub === 'stats') {
      const embed = new EmbedBuilder()
        .setTitle(`${cls.emoji} ${char.name}`)
        .setColor(0x9b59b6)
        .addFields(
          { name: t(locale, 'bot.rpg.fieldClass'), value: t(locale, cls.nameKey), inline: true },
          { name: t(locale, 'bot.rpg.fieldLevel'), value: `${char.level}`, inline: true },
          { name: t(locale, 'bot.rpg.fieldXp'), value: `${char.xp}/${char.level * 100}`, inline: true },
          { name: t(locale, 'bot.rpg.fieldHp'), value: `${char.hp}/${char.maxHp}`, inline: true },
          { name: t(locale, 'bot.rpg.fieldAtk'), value: `${char.attack}`, inline: true },
          { name: t(locale, 'bot.rpg.fieldDef'), value: `${char.defense}`, inline: true },
          { name: t(locale, 'bot.rpg.fieldGold'), value: `${char.gold}`, inline: true },
          { name: t(locale, 'bot.rpg.fieldInventory'), value: char.inventory.length > 0 ? char.inventory.join(', ') : t(locale, 'bot.rpg.empty'), inline: false },
        );
      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'adventure') {
      const cooldown = char.lastAdventureAt ? (Date.now() - new Date(char.lastAdventureAt).getTime()) / 1000 : 9999;
      if (cooldown < 300) return interaction.reply({ content: t(locale, 'bot.rpg.waitCooldown', { time: `<t:${Math.floor((new Date(char.lastAdventureAt).getTime() + 300000) / 1000)}:R>` }), ephemeral: true });

      const available = ADVENTURES.filter(a => char.level >= a.minLevel);
      const adv = available[Math.floor(Math.random() * available.length)];
      const enemyKey = adv.enemyKeys[Math.floor(Math.random() * adv.enemyKeys.length)];
      const enemy = t(locale, enemyKey);

      const power = char.attack + char.defense + char.level * 2 + Math.floor(Math.random() * 20);
      const enemyPower = adv.minLevel * 10 + Math.floor(Math.random() * 15);
      const won = power > enemyPower;

      const goldEarned = won ? rand(adv.goldReward[0], adv.goldReward[1]) : 0;
      const xpEarned = won ? rand(adv.xpReward[0], adv.xpReward[1]) : Math.floor(rand(adv.xpReward[0], adv.xpReward[1]) * 0.3);
      const hpLost = won ? rand(5, 15) : rand(20, 40);

      // Level up check
      let newXp = char.xp + xpEarned;
      let newLevel = char.level;
      let leveledUp = false;
      if (newXp >= char.level * 100) {
        newXp -= char.level * 100;
        newLevel++;
        leveledUp = true;
      }

      // Item drop
      const itemDropKey = won && Math.random() < 0.3 ? ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)] : null;
      const itemDrop = itemDropKey ? t(locale, itemDropKey) : null;
      const newInventory = itemDrop ? [...char.inventory, itemDrop] : char.inventory;

      await prisma.rPGCharacter.update({
        where: { id: char.id },
        data: {
          xp: newXp,
          level: newLevel,
          gold: char.gold + goldEarned,
          hp: Math.max(1, char.hp - hpLost),
          attack: leveledUp ? char.attack + 2 : char.attack,
          defense: leveledUp ? char.defense + 1 : char.defense,
          maxHp: leveledUp ? char.maxHp + 10 : char.maxHp,
          inventory: newInventory,
          lastAdventureAt: new Date(),
        },
      });

      const advName = t(locale, adv.nameKey);
      const embed = new EmbedBuilder()
        .setTitle(`${won ? '🏆' : '💀'} ${advName}`)
        .setDescription(`${cls.emoji} **${char.name}** affronte un **${enemy}** !\n\n${won ? t(locale, 'bot.rpg.victory') : t(locale, 'bot.rpg.defeat')}`)
        .setColor(won ? 0x2ecc71 : 0xe74c3c)
        .addFields(
          { name: t(locale, 'bot.rpg.fieldGoldReward'), value: `+${goldEarned}`, inline: true },
          { name: t(locale, 'bot.rpg.fieldXpReward'), value: `+${xpEarned}`, inline: true },
          { name: t(locale, 'bot.rpg.fieldHpLost'), value: `-${hpLost}`, inline: true },
        );

      if (leveledUp) embed.addFields({ name: t(locale, 'bot.rpg.levelUp'), value: `${t(locale, 'bot.rpg.fieldLevel')} ${newLevel}` });
      if (itemDrop) embed.addFields({ name: t(locale, 'bot.rpg.itemFound'), value: itemDrop });

      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'daily') {
      const cooldown = char.lastDailyAt ? (Date.now() - new Date(char.lastDailyAt).getTime()) / 1000 : 99999;
      if (cooldown < 86400) return interaction.reply({ content: t(locale, 'bot.rpg.dailyAlreadyClaimed', { time: `<t:${Math.floor((new Date(char.lastDailyAt).getTime() + 86400000) / 1000)}:R>` }), ephemeral: true });

      const gold = 50 + char.level * 10;
      const hp = Math.min(char.maxHp, char.hp + 50);

      await prisma.rPGCharacter.update({
        where: { id: char.id },
        data: { gold: char.gold + gold, hp, lastDailyAt: new Date() },
      });

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.rpg.dailyReward'))
        .setColor(0xf1c40f)
        .addFields(
          { name: t(locale, 'bot.rpg.fieldGold'), value: `+${gold}`, inline: true },
          { name: t(locale, 'bot.rpg.fieldHpRestored'), value: `+50`, inline: true },
        );

      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duel') {
      const opponent = interaction.options.getUser('adversaire');
      if (opponent.id === interaction.user.id) return interaction.reply({ content: t(locale, 'bot.rpg.cantFightSelf'), ephemeral: true });

      const oppUser = await prisma.user.findUnique({ where: { discordId: opponent.id } });
      if (!oppUser) return interaction.reply({ content: t(locale, 'bot.rpg.opponentNotFound'), ephemeral: true });
      const oppMember = await prisma.guildMember.findFirst({ where: { userId: oppUser.id, guildId: guild.id } });
      if (!oppMember) return interaction.reply({ content: t(locale, 'bot.rpg.opponentNotFound'), ephemeral: true });
      const oppChar = await prisma.rPGCharacter.findUnique({ where: { memberId: oppMember.id } });
      if (!oppChar) return interaction.reply({ content: t(locale, 'bot.rpg.opponentNoChar', { opponent: opponent.username }), ephemeral: true });

      const myPower = char.attack + char.level * 3 + Math.floor(Math.random() * 20) - oppChar.defense;
      const oppPower = oppChar.attack + oppChar.level * 3 + Math.floor(Math.random() * 20) - char.defense;
      const won = myPower >= oppPower;

      const goldBet = Math.min(50, char.gold, oppChar.gold);

      await prisma.rPGCharacter.update({ where: { id: char.id }, data: { gold: char.gold + (won ? goldBet : -goldBet) } });
      await prisma.rPGCharacter.update({ where: { id: oppChar.id }, data: { gold: oppChar.gold + (won ? -goldBet : goldBet) } });

      const cls2 = CLASSES[oppChar.className];
      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.rpg.duelTitle'))
        .setDescription(t(locale, 'bot.rpg.duelSubtitle', { emoji1: cls.emoji, char1: char.name, level1: char.level, emoji2: cls2.emoji, char2: oppChar.name, level2: oppChar.level }))
        .addFields(
          { name: t(locale, 'bot.rpg.fieldResult'), value: won ? `🏆 **${char.name}** gagne ! (+${goldBet}💰)` : `🏆 **${oppChar.name}** gagne ! (+${goldBet}💰)` },
        )
        .setColor(won ? 0x2ecc71 : 0xe74c3c);

      await interaction.reply({ embeds: [embed] });
    }
  },
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
