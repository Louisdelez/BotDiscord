const { prisma } = require('shared');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('i18n');

const POLL_QUESTIONS = [
  { question: t('fr', 'bot.dailyPoll.q1'), options: ['FPS', 'RPG', 'MOBA', 'Autre'] },
  { question: t('fr', 'bot.dailyPoll.q2'), options: ['Matin', 'Nuit', 'Après-midi', 'Non-stop'] },
  { question: t('fr', 'bot.dailyPoll.q3'), options: ['Pizza', 'Burger', 'Les deux', 'Aucun'] },
  { question: t('fr', 'bot.dailyPoll.q4'), options: ['Discord', 'Twitter/X', 'Instagram', 'Reddit'] },
  { question: t('fr', 'bot.dailyPoll.q5'), options: ['Film', 'Série', 'Les deux', 'Anime'] },
  { question: t('fr', 'bot.dailyPoll.q6'), options: ['Café', 'Thé', 'Les deux', 'Ni l\'un ni l\'autre'] },
  { question: t('fr', 'bot.dailyPoll.q7'), options: ['Remote', 'Bureau', 'Hybride', 'Pas de pref'] },
  { question: t('fr', 'bot.dailyPoll.q8'), options: ['Windows', 'macOS', 'Linux', 'Autre'] },
  { question: t('fr', 'bot.dailyPoll.q9'), options: ['Été', 'Hiver', 'Printemps', 'Automne'] },
  { question: t('fr', 'bot.dailyPoll.q10'), options: ['Pop/Rock', 'Rap/Hip-hop', 'Électro', 'Autre'] },
  { question: t('fr', 'bot.dailyPoll.q11'), options: ['Chat', 'Chien', 'Les deux', 'Autre animal'] },
  { question: t('fr', 'bot.dailyPoll.q12'), options: ['Solo', 'Multi', 'Les deux', 'Je joue pas'] },
  { question: t('fr', 'bot.dailyPoll.q13'), options: ['JavaScript', 'Python', 'Rust', 'Autre'] },
  { question: t('fr', 'bot.dailyPoll.q14'), options: ['Dark', 'Light', 'Ça dépend', 'Auto'] },
  { question: t('fr', 'bot.dailyPoll.q15'), options: ['Manette', 'Clavier/souris', 'Les deux', 'Écran tactile'] },
];

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

async function postDailyPolls(client) {
  const guilds = await prisma.guild.findMany({ include: { config: true } });

  for (const guild of guilds) {
    if (!guild.config?.pollOfTheDayEnabled || !guild.config?.pollOfTheDayChannelId) continue;

    const now = new Date();
    const [hours, minutes] = (guild.config.pollOfTheDayTime || '12:00').split(':').map(Number);
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Only post within the matching hour (cron runs hourly)
    if (currentHour !== hours) continue;

    try {
      const discordGuild = client.guilds.cache.get(guild.discordId);
      if (!discordGuild) continue;

      const channel = discordGuild.channels.cache.get(guild.config.pollOfTheDayChannelId);
      if (!channel) continue;

      // Pick a random question
      const poll = POLL_QUESTIONS[Math.floor(Math.random() * POLL_QUESTIONS.length)];

      const votes = {};
      poll.options.forEach((_, i) => { votes[i] = []; });

      const embed = new EmbedBuilder()
        .setTitle(t('fr', 'bot.dailyPoll.title', { question: poll.question }))
        .setDescription(poll.options.map((opt, i) => `${EMOJIS[i]} **${opt}** — 0%`).join('\n\n'))
        .setColor(0xf39c12)
        .setFooter({ text: t('fr', 'bot.dailyPoll.footer') })
        .setTimestamp();

      const row = new ActionRowBuilder();
      poll.options.forEach((opt, i) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll_vote_${i}`)
            .setLabel(opt)
            .setEmoji(EMOJIS[i])
            .setStyle(ButtonStyle.Secondary)
        );
      });

      const msg = await channel.send({ embeds: [embed], components: [row] });

      await prisma.poll.create({
        data: {
          guildId: guild.id,
          channelId: channel.id,
          messageId: msg.id,
          question: poll.question,
          options: poll.options,
          votes: JSON.stringify(votes),
          authorId: client.user.id,
        },
      });
    } catch (err) {
      console.error(`Daily poll error for ${guild.name}:`, err.message);
    }
  }
}

module.exports = { postDailyPolls };
