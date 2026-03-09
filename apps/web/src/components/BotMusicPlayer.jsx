import { useEffect, useState } from 'react';
import { SkipForward, Pause, Play, Square, Plus } from 'lucide-react';
import { useBotMusicStore } from '../stores/botMusic';
import { useGuildStore } from '../stores/guild';
import { useT } from '../lib/i18n';
import { Button } from './ui/Button';
import { Slider } from './ui/Slider';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

export function BotMusicPlayer() {
  const t = useT();
  const { currentGuild } = useGuildStore();
  const guildId = currentGuild?.id;
  const {
    currentTrack, queue, playing, paused, volume, position,
    init, cleanup, skip, pause, resume, stop, setVolume, addTrack,
  } = useBotMusicStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!guildId) return;
    init(guildId);
    return () => cleanup();
  }, [guildId]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleAdd = () => {
    if (!query.trim() || !guildId) return;
    addTrack(guildId, query.trim());
    setQuery('');
  };

  if (!playing && !currentTrack) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 text-[var(--text-secondary)]">
          <p className="text-lg font-medium">{t('web.botPlayer.noMusic')}</p>
          <p className="text-sm mt-1">{t('web.botPlayer.usePlay')}</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('web.botPlayer.urlPlaceholder')}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} size="md">
            <Plus size={16} /> {t('common.add')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Now playing */}
      {currentTrack && (
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-[var(--text-secondary)]">{t('web.botPlayer.nowPlaying')}</span>
            <Badge variant="info">{currentTrack.source}</Badge>
          </div>
          <p className="font-semibold text-lg truncate">{currentTrack.title}</p>
          <div className="flex items-center gap-2 mt-2 text-sm text-[var(--text-secondary)]">
            <span>{formatTime(position)}</span>
            <div className="flex-1 h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div className="h-full bg-[var(--accent)] transition-all" style={{ width: '50%' }} />
            </div>
            <span>{currentTrack.duration || '?'}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {paused ? (
          <Button onClick={() => resume(guildId)} variant="primary" size="md">
            <Play size={18} /> {t('common.resume')}
          </Button>
        ) : (
          <Button onClick={() => pause(guildId)} variant="secondary" size="md">
            <Pause size={18} /> {t('common.pause')}
          </Button>
        )}
        <Button onClick={() => skip(guildId)} variant="secondary" size="md">
          <SkipForward size={18} /> {t('common.skip')}
        </Button>
        <Button onClick={() => stop(guildId)} variant="danger" size="md">
          <Square size={18} /> {t('common.stop')}
        </Button>
      </div>

      {/* Volume */}
      <Slider
        label={t('common.volume')}
        value={volume}
        onChange={v => setVolume(guildId, Math.round(v))}
        min={0}
        max={100}
        step={5}
      />

      {/* Add track */}
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('web.botPlayer.urlPlaceholder')}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} size="md">
          <Plus size={16} /> {t('common.add')}
        </Button>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">{t('web.botPlayer.queue', { count: queue.length })}</p>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {queue.map((track, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-secondary)]">
                <span className="text-sm text-[var(--text-secondary)] w-6 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{track.title}</p>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">{track.duration || '?'}</span>
                <Badge variant="info" className="text-xs">{track.source}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
