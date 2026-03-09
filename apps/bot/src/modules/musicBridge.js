const Redis = require('ioredis');
const { queues, searchTrack, playSong } = require('../commands/play');
const { t } = require('i18n');

let redisSub;
let redisPub;

function publishMusicState(guildId) {
  const queue = queues.get(guildId);
  const data = {
    type: 'music:state',
    guildId,
    data: queue && queue.playing ? {
      currentTrack: queue.songs[0] ? {
        title: queue.songs[0].title,
        url: queue.songs[0].url,
        duration: queue.songs[0].duration,
        source: queue.songs[0].source,
      } : null,
      queue: queue.songs.slice(1).map(s => ({
        title: s.title,
        url: s.url,
        duration: s.duration,
        source: s.source,
      })),
      playing: true,
      paused: queue.paused || false,
      volume: queue.volume || 50,
      startedAt: queue.startedAt || null,
    } : {
      currentTrack: null,
      queue: [],
      playing: false,
      paused: false,
      volume: 50,
      startedAt: null,
    },
  };
  redisPub.publish('bot-events', JSON.stringify(data));
}

function initMusicBridge(client) {
  redisSub = new Redis(process.env.REDIS_URL);
  redisPub = client.redis;

  redisSub.subscribe('api-commands');
  redisSub.on('message', async (channel, message) => {
    if (channel !== 'api-commands') return;
    try {
      const cmd = JSON.parse(message);
      const { type, guildId } = cmd;
      const queue = queues.get(guildId);

      switch (type) {
        case 'music:getState':
          publishMusicState(guildId);
          break;

        case 'music:skip':
          if (queue?.playing) queue.player.stop();
          break;

        case 'music:pause':
          if (queue?.playing) {
            queue.player.pause();
            queue.paused = true;
            publishMusicState(guildId);
          }
          break;

        case 'music:resume':
          if (queue?.playing) {
            queue.player.unpause();
            queue.paused = false;
            publishMusicState(guildId);
          }
          break;

        case 'music:stop':
          if (queue) {
            queue.songs = [];
            queue.player.stop();
            queue.connection?.destroy();
            queues.delete(guildId);
            publishMusicState(guildId);
          }
          break;

        case 'music:volume':
          if (queue && cmd.volume != null) {
            queue.volume = Math.max(0, Math.min(100, cmd.volume));
            publishMusicState(guildId);
          }
          break;

        case 'music:add':
          if (cmd.query) {
            const info = await searchTrack(cmd.query);
            if (!info) return;

            if (!queue) {
              // No active queue — need a voice connection, can't start from API alone
              // Just publish that nothing happened
              return;
            }
            queue.songs.push(info);
            if (queue.songs.length === 1 && !queue.playing) {
              await playSong(queue);
            }
            publishMusicState(guildId);
          }
          break;
      }
    } catch (err) {
      console.error('MusicBridge error:', err.message);
    }
  });

  console.log('Music bridge initialized');
}

module.exports = { initMusicBridge, publishMusicState };
