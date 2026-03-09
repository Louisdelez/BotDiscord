const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adventure')
    .setDescription('Aventure textuelle collaborative')
    .addSubcommand(sub => sub
      .setName('start')
      .setDescription('Lancer une nouvelle aventure')
      .addStringOption(o => o.setName('thème').setDescription('Thème (fantasy, sci-fi, horreur, pirate)').addChoices(
        { name: '🏰 Fantasy', value: 'fantasy' },
        { name: '🚀 Sci-Fi', value: 'scifi' },
        { name: '👻 Horreur', value: 'horror' },
        { name: '🏴‍☠️ Pirate', value: 'pirate' },
      )))
    .addSubcommand(sub => sub.setName('status').setDescription('Voir l\'aventure en cours')),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const active = await prisma.adventure.findFirst({ where: { guildId: guild.id, active: true } });
      if (active) return interaction.reply({ content: t(locale, 'bot.adventure.alreadyRunning'), ephemeral: true });

      const theme = interaction.options.getString('thème') || 'fantasy';
      const story = generateStory(theme, 1);

      const embed = new EmbedBuilder()
        .setTitle(`📖 ${story.title}`)
        .setDescription(story.text)
        .setColor(0x9b59b6)
        .setFooter({ text: t(locale, 'bot.adventure.step', { step: 1, maxSteps: 10 }) });

      const row = new ActionRowBuilder().addComponents(
        story.choices.map((choice, i) => new ButtonBuilder()
          .setCustomId(`adv_vote_${i}`)
          .setLabel(choice)
          .setStyle(ButtonStyle.Primary)
        )
      );

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

      const votes = {};
      story.choices.forEach((_, i) => { votes[i] = []; });

      await prisma.adventure.create({
        data: {
          guildId: guild.id,
          channelId: interaction.channel.id,
          messageId: msg.id,
          title: story.title,
          story: story.text,
          choices: story.choices,
          votes: JSON.stringify(votes),
          authorId: interaction.user.id,
        },
      });

      // Auto-advance after 2 minutes
      setTimeout(() => advanceAdventure(guild.id, interaction.channel, interaction.client), 120000);
    }

    if (sub === 'status') {
      const active = await prisma.adventure.findFirst({ where: { guildId: guild.id, active: true } });
      if (!active) return interaction.reply({ content: t(locale, 'bot.adventure.noActive'), ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`📖 ${active.title}`)
        .setDescription(active.story)
        .setColor(0x9b59b6)
        .setFooter({ text: t(locale, 'bot.adventure.step', { step: active.step, maxSteps: active.maxSteps }) });

      await interaction.reply({ embeds: [embed] });
    }
  },
};

const STORIES = {
  fantasy: [
    { title: 'La Forêt Enchantée', texts: ['Vous pénétrez dans une forêt mystérieuse. Des lucioles dansent entre les arbres centenaires. Un sentier se divise devant vous.', 'Les arbres murmurent des secrets anciens. Une créature lumineuse apparaît.', 'Un donjon apparaît entre les arbres. La porte est entrouverte.'] },
  ],
  scifi: [
    { title: 'Station Orion', texts: ['L\'alarme retentit dans la station spatiale. Les systèmes défaillent un par un. Vous devez agir vite.', 'Le réacteur principal montre des signes de surcharge. Un signal inconnu est détecté.', 'Un vaisseau alien se rapproche. Vos senseurs captent une transmission.'] },
  ],
  horror: [
    { title: 'Le Manoir Abandonné', texts: ['La porte du manoir grince en s\'ouvrant. L\'air est glacial. Des murmures proviennent de l\'étage.', 'Une ombre traverse le couloir. Le sol craque sous vos pas.', 'Vous trouvez un journal intime. Les dernières pages sont tachées de sang.'] },
  ],
  pirate: [
    { title: 'L\'Île au Trésor', texts: ['Votre navire approche d\'une île mystérieuse. La carte indique un trésor enfoui. Mais vous n\'êtes pas seuls.', 'Des traces de pas mènent vers la jungle. Un perroquet crie au loin.', 'Vous découvrez une grotte cachée derrière une cascade.'] },
  ],
};

const CHOICES_POOL = [
  ['Explorer le chemin de gauche', 'Prendre le chemin de droite', 'Attendre et observer'],
  ['Foncer tête baissée', 'Chercher une entrée secrète', 'Appeler à l\'aide'],
  ['Examiner de plus près', 'Fuir rapidement', 'Tenter une approche diplomatique'],
  ['Utiliser la force', 'Utiliser la ruse', 'Chercher un allié'],
];

function generateStory(theme, step) {
  const stories = STORIES[theme] || STORIES.fantasy;
  const story = stories[0];
  const textIdx = Math.min(step - 1, story.texts.length - 1);
  const choicesIdx = (step - 1) % CHOICES_POOL.length;

  return {
    title: story.title,
    text: story.texts[textIdx],
    choices: CHOICES_POOL[choicesIdx],
  };
}

async function advanceAdventure(guildId, channel, client) {
  try {
    const locale = 'fr';
    const adventure = await prisma.adventure.findFirst({ where: { guildId, active: true } });
    if (!adventure) return;

    const votes = JSON.parse(adventure.votes);
    const totalVotes = Object.values(votes).reduce((s, v) => s + v.length, 0);

    let winningChoice = 0;
    if (totalVotes > 0) {
      let max = 0;
      Object.entries(votes).forEach(([idx, voters]) => {
        if (voters.length > max) { max = voters.length; winningChoice = parseInt(idx); }
      });
    }

    const newStep = adventure.step + 1;
    if (newStep > adventure.maxSteps) {
      await prisma.adventure.update({ where: { id: adventure.id }, data: { active: false } });
      const embed = new EmbedBuilder()
        .setTitle(`📖 ${adventure.title} — FIN`)
        .setDescription(t(locale, 'bot.adventure.ended', { votes: totalVotes }))
        .setColor(0xf1c40f);
      await channel.send({ embeds: [embed] });
      return;
    }

    const chosenText = adventure.choices[winningChoice] || 'Explorer';
    const story = generateStory('fantasy', newStep);
    const newText = t(locale, 'bot.adventure.chosenOption', { choice: chosenText, text: story.text });

    const newVotes = {};
    story.choices.forEach((_, i) => { newVotes[i] = []; });

    await prisma.adventure.update({
      where: { id: adventure.id },
      data: { story: newText, choices: story.choices, votes: JSON.stringify(newVotes), step: newStep },
    });

    const embed = new EmbedBuilder()
      .setTitle(`📖 ${adventure.title}`)
      .setDescription(newText)
      .setColor(0x9b59b6)
      .setFooter({ text: t(locale, 'bot.adventure.stepVote', { step: newStep, maxSteps: adventure.maxSteps }) });

    const row = new ActionRowBuilder().addComponents(
      story.choices.map((choice, i) => new ButtonBuilder()
        .setCustomId(`adv_vote_${i}`)
        .setLabel(choice)
        .setStyle(ButtonStyle.Primary)
      )
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });
    await prisma.adventure.update({ where: { id: adventure.id }, data: { messageId: msg.id } });

    setTimeout(() => advanceAdventure(guildId, channel, client), 120000);
  } catch (err) {
    console.error('Adventure advance error:', err.message);
  }
}

module.exports.advanceAdventure = advanceAdventure;
