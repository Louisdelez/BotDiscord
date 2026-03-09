const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { queues } = require('./play');
const { publishMusicState } = require('../modules/musicBridge');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Contrôles de musique')
    .addSubcommand(sub => sub.setName('skip').setDescription('Passer la musique'))
    .addSubcommand(sub => sub.setName('stop').setDescription('Arrêter la musique'))
    .addSubcommand(sub => sub.setName('queue').setDescription('Voir la file d\'attente'))
    .addSubcommand(sub => sub.setName('pause').setDescription('Mettre en pause'))
    .addSubcommand(sub => sub.setName('resume').setDescription('Reprendre la lecture'))
    .addSubcommand(sub => sub.setName('nowplaying').setDescription('Musique en cours')),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const queue = queues.get(interaction.guild.id);
    if (!queue || !queue.playing) return interaction.reply({ content: t(locale, 'bot.music.noMusic'), ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'skip') {
      queue.player.stop();
      await interaction.reply(t(locale, 'bot.music.skipped'));
      publishMusicState(interaction.guild.id);
    }

    if (sub === 'stop') {
      queue.songs = [];
      queue.player.stop();
      queue.connection?.destroy();
      queues.delete(interaction.guild.id);
      await interaction.reply(t(locale, 'bot.music.stopped'));
      publishMusicState(interaction.guild.id);
    }

    if (sub === 'queue') {
      if (queue.songs.length === 0) return interaction.reply({ content: t(locale, 'bot.music.emptyQueue'), ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.music.queueTitle'))
        .setColor(0x1db954)
        .setDescription(queue.songs.map((s, i) => `${i === 0 ? '▶️' : `${i}.`} **${s.title}** (${s.duration || '?'})`).join('\n'))
        .setFooter({ text: t(locale, 'bot.music.queueFooter', { count: queue.songs.length }) });

      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'pause') {
      queue.player.pause();
      queue.paused = true;
      await interaction.reply(t(locale, 'bot.music.paused'));
      publishMusicState(interaction.guild.id);
    }

    if (sub === 'resume') {
      queue.player.unpause();
      queue.paused = false;
      await interaction.reply(t(locale, 'bot.music.resumed'));
      publishMusicState(interaction.guild.id);
    }

    if (sub === 'nowplaying') {
      const song = queue.songs[0];
      if (!song) return interaction.reply({ content: t(locale, 'bot.music.nothingPlaying'), ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.music.nowPlayingTitle'))
        .setDescription(`[${song.title}](${song.url})`)
        .addFields({ name: t(locale, 'bot.music.fieldDuration'), value: song.duration || t(locale, 'bot.play.durationUnknown') })
        .setColor(0x1db954);

      await interaction.reply({ embeds: [embed] });
    }
  },
};
