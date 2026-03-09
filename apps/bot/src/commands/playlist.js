const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Gérer les playlists')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Créer une playlist')
      .addStringOption(o => o.setName('name').setDescription('Nom de la playlist').setRequired(true))
      .addBooleanOption(o => o.setName('public').setDescription('Playlist publique')))
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Ajouter un titre à une playlist')
      .addStringOption(o => o.setName('playlist').setDescription('Nom de la playlist').setRequired(true))
      .addStringOption(o => o.setName('url').setDescription('URL du titre').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Titre').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Retirer un titre d\'une playlist')
      .addStringOption(o => o.setName('playlist').setDescription('Nom de la playlist').setRequired(true))
      .addIntegerOption(o => o.setName('position').setDescription('Position du titre').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Lister les playlists'))
    .addSubcommand(sub => sub
      .setName('view')
      .setDescription('Voir une playlist')
      .addStringOption(o => o.setName('playlist').setDescription('Nom de la playlist').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('play')
      .setDescription('Jouer une playlist')
      .addStringOption(o => o.setName('playlist').setDescription('Nom de la playlist').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('collab')
      .setDescription('Ajouter un collaborateur')
      .addStringOption(o => o.setName('playlist').setDescription('Nom de la playlist').setRequired(true))
      .addUserOption(o => o.setName('user').setDescription('Utilisateur').setRequired(true))),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const sub = interaction.options.getSubcommand();
    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    switch (sub) {
      case 'create': {
        const name = interaction.options.getString('name');
        const isPublic = interaction.options.getBoolean('public') ?? true;

        try {
          await prisma.playlist.create({
            data: { guildId: guild.id, name, authorId: interaction.user.id, isPublic },
          });
          await interaction.reply(t(locale, 'bot.playlist.created', { name }));
        } catch {
          await interaction.reply({ content: t(locale, 'bot.playlist.alreadyExists'), ephemeral: true });
        }
        break;
      }

      case 'add': {
        const name = interaction.options.getString('playlist');
        const url = interaction.options.getString('url');
        const title = interaction.options.getString('title');

        const playlist = await prisma.playlist.findUnique({
          where: { guildId_name: { guildId: guild.id, name } },
          include: { tracks: true },
        });
        if (!playlist) return interaction.reply({ content: t(locale, 'bot.playlist.notFound'), ephemeral: true });

        if (playlist.authorId !== interaction.user.id && !playlist.collaborators.includes(interaction.user.id)) {
          return interaction.reply({ content: t(locale, 'bot.playlist.noAccess'), ephemeral: true });
        }

        await prisma.playlistTrack.create({
          data: {
            playlistId: playlist.id,
            title,
            url,
            addedBy: interaction.user.id,
            position: playlist.tracks.length + 1,
          },
        });

        await interaction.reply(t(locale, 'bot.playlist.trackAdded', { title, name }));
        break;
      }

      case 'remove': {
        const name = interaction.options.getString('playlist');
        const position = interaction.options.getInteger('position');

        const playlist = await prisma.playlist.findUnique({
          where: { guildId_name: { guildId: guild.id, name } },
          include: { tracks: { orderBy: { position: 'asc' } } },
        });
        if (!playlist) return interaction.reply({ content: t(locale, 'bot.playlist.notFound'), ephemeral: true });

        if (playlist.authorId !== interaction.user.id && !playlist.collaborators.includes(interaction.user.id)) {
          return interaction.reply({ content: t(locale, 'bot.playlist.noAccess'), ephemeral: true });
        }

        const track = playlist.tracks[position - 1];
        if (!track) return interaction.reply({ content: t(locale, 'bot.playlist.invalidPosition'), ephemeral: true });

        await prisma.playlistTrack.delete({ where: { id: track.id } });
        await interaction.reply(t(locale, 'bot.playlist.trackRemoved', { title: track.title }));
        break;
      }

      case 'list': {
        const playlists = await prisma.playlist.findMany({
          where: { guildId: guild.id },
          include: { _count: { select: { tracks: true } } },
          orderBy: { createdAt: 'desc' },
        });

        if (playlists.length === 0) {
          return interaction.reply({ content: t(locale, 'bot.playlist.noPlaylists'), ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle(t(locale, 'bot.playlist.listTitle'))
          .setColor(0x1db954)
          .setDescription(playlists.map(p =>
            `**${p.name}** — ${p._count.tracks} titre(s) ${p.isPublic ? '🔓' : '🔒'}`
          ).join('\n'));

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'view': {
        const name = interaction.options.getString('playlist');
        const playlist = await prisma.playlist.findUnique({
          where: { guildId_name: { guildId: guild.id, name } },
          include: { tracks: { orderBy: { position: 'asc' }, take: 20 } },
        });
        if (!playlist) return interaction.reply({ content: t(locale, 'bot.playlist.notFound'), ephemeral: true });

        const tracks = playlist.tracks.map((tr, i) => `${i + 1}. [${tr.title}](${tr.url}) ${tr.duration ? `(${tr.duration})` : ''}`);

        const embed = new EmbedBuilder()
          .setTitle(`🎵 ${playlist.name}`)
          .setColor(0x1db954)
          .setDescription(tracks.length > 0 ? tracks.join('\n') : t(locale, 'bot.playlist.noTracks'))
          .setFooter({ text: `${playlist.tracks.length} titre(s)` });

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'play': {
        const name = interaction.options.getString('playlist');
        const playlist = await prisma.playlist.findUnique({
          where: { guildId_name: { guildId: guild.id, name } },
          include: { tracks: { orderBy: { position: 'asc' } } },
        });
        if (!playlist) return interaction.reply({ content: t(locale, 'bot.playlist.notFound'), ephemeral: true });
        if (playlist.tracks.length === 0) return interaction.reply({ content: t(locale, 'bot.playlist.noTracks'), ephemeral: true });

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.reply({ content: t(locale, 'bot.playlist.joinVoice'), ephemeral: true });

        // Queue all tracks using the play command's queue system
        const { queues } = require('./play');
        const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
        const playdl = require('play-dl');

        let queue = queues.get(interaction.guild.id);
        if (!queue) {
          queue = { songs: [], connection: null, player: null, playing: false, volume: 50, textChannel: interaction.channel };
          queues.set(interaction.guild.id, queue);
        }

        for (const track of playlist.tracks) {
          queue.songs.push({ title: track.title, url: track.url, duration: track.duration || t(locale, 'bot.playlist.unknown') });
        }
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
              playNext(queue);
            } else {
              queue.playing = false;
              queue.connection?.destroy();
              queues.delete(interaction.guild.id);
            }
          });

          queue.player.on('error', () => {
            queue.songs.shift();
            if (queue.songs.length > 0) playNext(queue);
            else { queue.connection?.destroy(); queues.delete(interaction.guild.id); }
          });

          queue.connection.on(VoiceConnectionStatus.Disconnected, () => {
            queues.delete(interaction.guild.id);
          });

          await playNext(queue);
        }

        await interaction.reply(t(locale, 'bot.playlist.playing', { name, count: playlist.tracks.length }));
        break;
      }

      case 'collab': {
        const name = interaction.options.getString('playlist');
        const user = interaction.options.getUser('user');

        const playlist = await prisma.playlist.findUnique({
          where: { guildId_name: { guildId: guild.id, name } },
        });
        if (!playlist) return interaction.reply({ content: t(locale, 'bot.playlist.notFound'), ephemeral: true });

        if (playlist.authorId !== interaction.user.id) {
          return interaction.reply({ content: t(locale, 'bot.playlist.onlyCreator'), ephemeral: true });
        }

        await prisma.playlist.update({
          where: { id: playlist.id },
          data: { collaborators: { push: user.id } },
        });

        await interaction.reply(t(locale, 'bot.playlist.collabAdded', { user: user.username, name }));
        break;
      }
    }
  },
};

async function playNext(queue) {
  const song = queue.songs[0];
  if (!song) return;
  queue.playing = true;
  const playdl = require('play-dl');
  const { createAudioResource } = require('@discordjs/voice');
  try {
    const stream = await playdl.stream(song.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    queue.player.play(resource);
  } catch {
    queue.songs.shift();
    if (queue.songs.length > 0) playNext(queue);
  }
}
