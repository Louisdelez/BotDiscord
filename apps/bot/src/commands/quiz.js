const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

const TRIVIA_CATEGORIES = [
  { name: 'Culture générale', value: 'general' },
  { name: 'Science', value: 'science' },
  { name: 'Histoire', value: 'history' },
  { name: 'Gaming', value: 'gaming' },
  { name: 'Musique', value: 'music' },
  { name: 'Cinéma', value: 'cinema' },
];

const CATEGORY_KEYS = {
  general: 'bot.quiz.catGeneral',
  science: 'bot.quiz.catScience',
  history: 'bot.quiz.catHistory',
  gaming: 'bot.quiz.catGaming',
  music: 'bot.quiz.catMusic',
  cinema: 'bot.quiz.catCinema',
};

const DEFAULT_QUESTIONS = {
  general: [
    { qKey: 'bot.quiz.q.capitalAustralia', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], correct: 2 },
    { qKey: 'bot.quiz.q.humanBones', options: ['186', '206', '226', '256'], correct: 1 },
    { qKey: 'bot.quiz.q.biggestOcean', options: ['Atlantique', 'Indien', 'Pacifique', 'Arctique'], correct: 2 },
  ],
  science: [
    { qKey: 'bot.quiz.q.goldSymbol', options: ['Or', 'Au', 'Ag', 'Fe'], correct: 1 },
    { qKey: 'bot.quiz.q.planetCount', options: ['7', '8', '9', '10'], correct: 1 },
    { qKey: 'bot.quiz.q.lightSpeed', options: ['300 000 km/s', '150 000 km/s', '1 000 000 km/s', '30 000 km/s'], correct: 0 },
  ],
  history: [
    { qKey: 'bot.quiz.q.frenchRevolution', options: ['1776', '1789', '1804', '1812'], correct: 1 },
    { qKey: 'bot.quiz.q.monaPainter', options: ['Michel-Ange', 'Raphaël', 'Léonard de Vinci', 'Botticelli'], correct: 2 },
    { qKey: 'bot.quiz.q.colosseumEmpire', options: ['Grec', 'Romain', 'Byzantin', 'Perse'], correct: 1 },
  ],
  gaming: [
    { qKey: 'bot.quiz.q.bestSellingGame', options: ['GTA V', 'Tetris', 'Minecraft', 'Wii Sports'], correct: 2 },
    { qKey: 'bot.quiz.q.firstMario', options: ['1981', '1983', '1985', '1987'], correct: 2 },
    { qKey: 'bot.quiz.q.witcher3Studio', options: ['Bethesda', 'CD Projekt Red', 'BioWare', 'Ubisoft'], correct: 1 },
  ],
  music: [
    { qKey: 'bot.quiz.q.bohemianRhapsody', options: ['The Beatles', 'Led Zeppelin', 'Queen', 'Pink Floyd'], correct: 2 },
    { qKey: 'bot.quiz.q.ukuleleStrings', options: ['4', '5', '6', '8'], correct: 0 },
    { qKey: 'bot.quiz.q.kpopCountry', options: ['Japon', 'Chine', 'Corée du Sud', 'Thaïlande'], correct: 2 },
  ],
  cinema: [
    { qKey: 'bot.quiz.q.inceptionDirector', options: ['Steven Spielberg', 'Christopher Nolan', 'James Cameron', 'Ridley Scott'], correct: 1 },
    { qKey: 'bot.quiz.q.firstOscar', options: ['Wings', 'Sunrise', 'The Jazz Singer', 'Metropolis'], correct: 0 },
    { qKey: 'bot.quiz.q.harryPotterFilms', options: ['6', '7', '8', '9'], correct: 2 },
  ],
};

const LETTERS = ['🇦', '🇧', '🇨', '🇩'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('Lancer un quiz')
    .addStringOption(o => o.setName('catégorie').setDescription('Catégorie')
      .addChoices(...TRIVIA_CATEGORIES)),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const category = interaction.options.getString('catégorie') || 'general';
    const questions = DEFAULT_QUESTIONS[category] || DEFAULT_QUESTIONS.general;
    const q = questions[Math.floor(Math.random() * questions.length)];

    const categoryName = t(locale, CATEGORY_KEYS[category] || 'bot.quiz.catGeneral');

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'bot.quiz.title', { category: categoryName }))
      .setDescription(`**${t(locale, q.qKey)}**\n\n${q.options.map((o, i) => `${LETTERS[i]} ${o}`).join('\n')}`)
      .setColor(0x3498db)
      .setFooter({ text: t(locale, 'bot.quiz.timer') });

    const row = new ActionRowBuilder().addComponents(
      q.options.map((_, i) => new ButtonBuilder()
        .setCustomId(`quiz_${i}_${q.correct}`)
        .setEmoji(LETTERS[i])
        .setStyle(ButtonStyle.Secondary)
      )
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    // Auto-reveal after 30s
    setTimeout(async () => {
      try {
        const correctEmbed = new EmbedBuilder()
          .setTitle(t(locale, 'bot.quiz.timeUp'))
          .setDescription(t(locale, 'bot.quiz.correctAnswer', { letter: LETTERS[q.correct], answer: q.options[q.correct] }))
          .setColor(0xf39c12);
        await msg.edit({ embeds: [correctEmbed], components: [] });
      } catch {}
    }, 30000);
  },
};
