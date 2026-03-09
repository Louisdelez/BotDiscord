import { useEffect, useState, useRef, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, SkipForward, LogIn, LogOut, Plus, Users } from 'lucide-react';
import { useT } from '../lib/i18n';
import { useWebPlayerStore } from '../stores/webPlayer';
import { useGuildStore } from '../stores/guild';
import { api } from '../lib/api';
import { Button } from './ui/Button';
import { Slider } from './ui/Slider';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';

export function WebPlayerView() {
  const t = useT();
  const { currentGuild } = useGuildStore();
  const guildId = currentGuild?.id;
  const store = useWebPlayerStore();
  const {
    channelId, joined, currentTrack, queue, currentIndex, playing,
    startedAt, pausedAt, volume, listeners,
    init, cleanup, joinChannel, leaveChannel, addTrack, skip, pause, resume, seek, setVolume, getTargetPosition,
  } = store;

  const [voiceChannels, setVoiceChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [position, setPosition] = useState(0);
  const playerRef = useRef(null);
  const lastSyncRef = useRef(0);

  useEffect(() => {
    init();
    return () => cleanup();
  }, []);

  // Fetch voice channels
  useEffect(() => {
    if (!guildId) return;
    api.get(`/guilds/${guildId}/voice-channels`).then(setVoiceChannels).catch(() => {});
  }, [guildId]);

  // Position ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const target = getTargetPosition();
      setPosition(target);
    }, 100);
    return () => clearInterval(interval);
  }, [getTargetPosition]);

  // Sync check
  useEffect(() => {
    if (!playing || !playerRef.current) return;
    const interval = setInterval(() => {
      const target = getTargetPosition();
      const current = playerRef.current?.getCurrentTime?.() || 0;
      if (Math.abs(current - target) > 2) {
        playerRef.current.seekTo(target, 'seconds');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [playing, getTargetPosition]);

  const handleJoin = () => {
    if (selectedChannel && guildId) {
      joinChannel(guildId, selectedChannel);
    }
  };

  const handleAdd = () => {
    if (!trackUrl.trim()) return;
    addTrack(trackUrl.trim());
    setTrackUrl('');
  };

  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const dur = playerRef.current?.getDuration?.() || 0;
    if (dur > 0) {
      seek(pct * dur);
    }
  }, [seek]);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const currentUrl = queue[currentIndex]?.url;

  if (!joined) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          {t('web.webPlayer.selectChannel')}
        </p>
        {voiceChannels.length === 0 ? (
          <p className="text-center py-8 text-[var(--text-secondary)]">
            {t('web.webPlayer.noVoiceChannel')}
          </p>
        ) : (
          <div className="space-y-3">
            {voiceChannels.map(ch => (
              <div
                key={ch.channelId}
                onClick={() => setSelectedChannel(ch.channelId)}
                className={`p-3 rounded-xl cursor-pointer border-2 transition-colors ${
                  selectedChannel === ch.channelId
                    ? 'border-[var(--accent)] bg-[var(--bg-secondary)]'
                    : 'border-transparent bg-[var(--bg-secondary)] hover:border-[var(--bg-tertiary)]'
                }`}
              >
                <p className="font-medium text-sm">{t('common.channel', { id: ch.channelId })}</p>
                <p className="text-xs text-[var(--text-secondary)]">{t('common.members', { count: ch.members.length })}</p>
              </div>
            ))}
            <Button onClick={handleJoin} disabled={!selectedChannel}>
              <LogIn size={16} /> {t('web.watchTogether.joinSession')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Player (hidden video, audio only) */}
      <div className="hidden">
        <ReactPlayer
          ref={playerRef}
          url={currentUrl}
          playing={playing}
          volume={volume / 100}
          onEnded={() => skip()}
          width="0"
          height="0"
        />
      </div>

      {/* Now playing */}
      {currentTrack ? (
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-2 h-2 rounded-full ${playing ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-sm text-[var(--text-secondary)]">{playing ? t('web.webPlayer.playing') : t('web.webPlayer.paused')}</span>
          </div>
          <p className="font-semibold text-lg truncate">{currentTrack.title || currentTrack.url}</p>
          {/* Progress bar (clickable for seek) */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-[var(--text-secondary)] w-10 text-right">{formatTime(position)}</span>
            <div
              className="flex-1 h-2 rounded-full bg-[var(--bg-tertiary)] cursor-pointer relative"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all"
                style={{ width: `${playerRef.current?.getDuration?.() ? (position / playerRef.current.getDuration()) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-[var(--text-secondary)] w-10">{formatTime(playerRef.current?.getDuration?.() || 0)}</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-[var(--text-secondary)]">
          <p>{t('web.webPlayer.noTrack')}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {playing ? (
          <Button onClick={() => pause()} variant="secondary" size="md">
            <Pause size={18} /> {t('common.pause')}
          </Button>
        ) : (
          <Button onClick={() => resume()} variant="primary" size="md">
            <Play size={18} /> {t('common.play')}
          </Button>
        )}
        <Button onClick={() => skip()} variant="secondary" size="md">
          <SkipForward size={18} /> {t('common.skip')}
        </Button>
        <Button onClick={() => leaveChannel()} variant="danger" size="md">
          <LogOut size={18} /> {t('web.webPlayer.leave')}
        </Button>
      </div>

      {/* Volume */}
      <Slider
        label={t('common.volume')}
        value={volume}
        onChange={v => setVolume(Math.round(v))}
        min={0}
        max={100}
        step={5}
      />

      {/* Add track */}
      <div className="flex gap-2">
        <Input
          value={trackUrl}
          onChange={e => setTrackUrl(e.target.value)}
          placeholder={t('web.webPlayer.urlPlaceholder')}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} size="md">
          <Plus size={16} /> {t('common.add')}
        </Button>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">{t('web.webPlayer.queue', { count: queue.length })}</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {queue.map((track, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  i === currentIndex ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' : 'bg-[var(--bg-secondary)]'
                }`}
              >
                <span className="text-sm text-[var(--text-secondary)] w-6 text-center">
                  {i === currentIndex ? '>' : i + 1}
                </span>
                <p className="text-sm truncate flex-1">{track.title || track.url}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listeners */}
      {listeners.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Users size={14} className="text-[var(--text-secondary)]" />
          {listeners.map(l => (
            <Badge key={l.id} variant="info">{l.username}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
