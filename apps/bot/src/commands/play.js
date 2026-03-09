const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const playdl = require('play-dl');
const { t, resolveLocale } = require('i18n');

// In-memory queues per guild
const queues = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Jouer de la musique')
    .addStringOption(o => o.setName('query').setDescription('URL ou recherche (YouTube, Spotify, SoundCloud)').setRequired(true)),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply({ content: t(locale, 'bot.play.joinVoice'), ephemeral: true });

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      const info = await searchTrack(query);
      if (!info) return interaction.editReply(t(locale, 'bot.play.noResults'));

      let queue = queues.get(interaction.guild.id);
      if (!queue) {
        queue = { guildId: interaction.guild.id, songs: [], connection: null, player: null, playing: false, paused: false, volume: 50, startedAt: null, textChannel: interaction.channel };
        queues.set(interaction.guild.id, queue);
      }

      queue.songs.push(info);
      queue.textChannel = interaction.channel;

      if (!queue.playing) {
        queue.connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        queue.player = createAudioPlayer();
        queue.connection.subscribe(queue.player);

        queue.player.on(AudioPlayerStatus.Idle, () => {
          queue.songs.shift();
          if (queue.songs.length > 0) {
            playSong(queue);
          } else {
            queue.playing = false;
            queue.connection?.destroy();
            queues.delete(interaction.guild.id);
          }
          try { require('../modules/musicBridge').publishMusicState(interaction.guild.id); } catch {}
        });

        queue.player.on('error', (err) => {
          console.error('Player error:', err.message);
          queue.songs.shift();
          if (queue.songs.length > 0) playSong(queue);
          else { queue.connection?.destroy(); queues.delete(interaction.guild.id); }
        });

        queue.connection.on(VoiceConnectionStatus.Disconnected, () => {
          queues.delete(interaction.guild.id);
        });

        await playSong(queue);

        const embed = new EmbedBuilder()
          .setTitle(t(locale, 'bot.play.nowPlaying'))
          .setDescription(`[${info.title}](${info.url})`)
          .addFields(
            { name: t(locale, 'bot.play.fieldDuration'), value: info.duration || t(locale, 'bot.play.durationUnknown'), inline: true },
            { name: t(locale, 'bot.play.fieldSource'), value: info.source || 'YouTube', inline: true },
          )
          .setColor(0x1db954);

        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle(t(locale, 'bot.play.addedToQueue'))
          .setDescription(`[${info.title}](${info.url})`)
          .addFields(
            { name: t(locale, 'bot.play.fieldPosition'), value: `#${queue.songs.length}`, inline: true },
            { name: t(locale, 'bot.play.fieldDuration'), value: info.duration || t(locale, 'bot.play.durationUnknown'), inline: true },
          )
          .setColor(0x1db954);

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      console.error('Play error:', err.message);
      await interaction.editReply(t(locale, 'bot.play.error'));
    }
  },
};

async function searchTrack(query) {
  // YouTube video URL
  if (playdl.yt_validate(query) === 'video') {
    const details = await playdl.video_info(query);
    return {
      title: details.video_details.title,
      url: details.video_details.url,
      duration: details.video_details.durationRaw,
      source: 'YouTube',
    };
  }

  // Spotify URL detection
  if (query.includes('spotify.com')) {
    try {
      const spType = playdl.sp_validate(query);
      if (spType === 'track') {
        // Search YouTube for the Spotify track
        const spData = await playdl.spotify(query);
        const search = await playdl.search(`${spData.name} ${spData.artists?.map(a => a.name).join(' ') || ''}`, { limit: 1 });
        if (search.length > 0) {
          return {
            title: `${spData.name} — ${spData.artists?.map(a => a.name).join(', ') || ''}`,
            url: search[0].url,
            duration: search[0].durationRaw,
            source: 'Spotify',
          };
        }
      }
    } catch {}
  }

  // SoundCloud URL detection
  if (query.includes('soundcloud.com')) {
    try {
      const soType = await playdl.so_validate(query);
      if (soType === 'track') {
        const soData = await playdl.soundcloud(query);
        return {
          title: soData.name,
          url: soData.url,
          duration: formatDuration(soData.durationInMs),
          source: 'SoundCloud',
        };
      }
    } catch {}
  }

  // Default: YouTube search
  const results = await playdl.search(query, { limit: 1 });
  if (results.length === 0) return null;

  return {
    title: results[0].title,
    url: results[0].url,
    duration: results[0].durationRaw,
    source: 'YouTube',
  };
}

function formatDuration(ms) {
  if (!ms) return null;
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function playSong(queue) {
  const song = queue.songs[0];
  if (!song) return;

  queue.playing = true;
  queue.startedAt = Date.now();
  queue.paused = false;
  const stream = await playdl.stream(song.url);
  const resource = createAudioResource(stream.stream, { inputType: stream.type });
  queue.player.play(resource);
  try { require('../modules/musicBridge').publishMusicState(queue.guildId); } catch {}
}

module.exports.queues = queues;
module.exports.searchTrack = searchTrack;
module.exports.playSong = playSong;
