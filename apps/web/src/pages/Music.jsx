import { useEffect, useState } from 'react';
import { Music as MusicIcon, Volume2, ListMusic, Headphones, Trash2, Settings, Radio, Globe } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Slider } from '../components/ui/Slider';
import { Badge } from '../components/ui/Badge';
import { useGuildStore } from '../stores/guild';
import { api } from '../lib/api';
import { ws } from '../lib/websocket';
import { BotMusicPlayer } from '../components/BotMusicPlayer';
import { WebPlayerView } from '../components/WebPlayerView';
import { useT } from '../lib/i18n';

export function Music() {
  const { currentGuild } = useGuildStore();
  const [activeTab, setActiveTab] = useState('config');
  const [config, setConfig] = useState({});
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const t = useT();

  const tabs = [
    { id: 'config', label: t('web.music.configuration'), icon: Settings },
    { id: 'bot', label: t('web.music.botPlayer'), icon: Radio },
    { id: 'web', label: t('web.music.webPlayer'), icon: Globe },
  ];

  useEffect(() => {
    if (!currentGuild) return;
    api.get(`/guilds/${currentGuild.id}/music/config`).then(setConfig).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/playlists`).then(d => setPlaylists(Array.isArray(d) ? d : [])).catch(() => {});
  }, [currentGuild]);

  useEffect(() => {
    ws.connect();
    if (currentGuild) {
      ws.subscribeGuild(currentGuild.id);
    }
  }, [currentGuild]);

  const update = async (updates) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    await api.patch(`/guilds/${currentGuild.id}/music/config`, updates).catch(() => {});
  };

  const viewPlaylist = async (id) => {
    const playlist = await api.get(`/guilds/${currentGuild.id}/playlists/${id}`);
    setSelectedPlaylist(playlist);
  };

  const deletePlaylist = async (id) => {
    await api.delete(`/guilds/${currentGuild.id}/playlists/${id}`);
    setPlaylists(playlists.filter(p => p.id !== id));
    if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
  };

  if (!currentGuild) return <p className="text-[var(--text-secondary)]">{t('common.selectServer')}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <MusicIcon size={28} /> {t('web.music.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">{t('web.music.subtitle')}</p>
      </div>

      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'config' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10"><Headphones size={20} className="text-green-500" /></div>
                <div>
                  <p className="text-sm font-medium">{t('web.music.status')}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{t('web.music.discordControl')}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10"><Volume2 size={20} className="text-blue-500" /></div>
                <div>
                  <p className="text-sm font-medium">{t('web.music.defaultVolume')}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{config.defaultVolume || 50}%</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10"><ListMusic size={20} className="text-purple-500" /></div>
                <div>
                  <p className="text-sm font-medium">{t('web.music.playlists')}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{playlists.length} playlist(s)</p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('web.music.configuration')}</CardTitle>
              <CardDescription>{t('web.music.musicConfig')}</CardDescription>
            </CardHeader>
            <div className="space-y-5">
              <Slider label={t('web.music.defaultVolume')} value={config.defaultVolume || 50} onChange={v => update({ defaultVolume: Math.round(v) })} min={0} max={100} step={5} />
              <Slider label={t('web.music.maxQueueSize')} value={config.maxQueueSize || 100} onChange={v => update({ maxQueueSize: Math.round(v) })} min={10} max={500} step={10} />
              <Input label={t('web.music.djRole')} value={config.djRoleId || ''} onChange={e => update({ djRoleId: e.target.value })} placeholder={t('web.music.djRolePlaceholder')} />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('web.music.playlists')}</CardTitle>
              <CardDescription>{t('web.music.createdVia')}</CardDescription>
            </CardHeader>
            <div className="space-y-2">
              {playlists.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]">
                  <button onClick={() => viewPlaylist(p.id)} className="flex items-center gap-3 flex-1 text-left cursor-pointer">
                    <span className="text-sm font-medium">{p.name}</span>
                    <Badge variant="info">{p._count?.tracks || 0} {t('web.music.tracks')}</Badge>
                    {!p.isPublic && <Badge variant="warning">{t('web.music.privatePlaylist')}</Badge>}
                  </button>
                  <button onClick={() => deletePlaylist(p.id)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
                    <Trash2 size={14} className="text-[var(--danger)]" />
                  </button>
                </div>
              ))}
              {playlists.length === 0 && <p className="text-sm text-[var(--text-secondary)]">{t('web.music.noPlaylists')}</p>}
            </div>
          </Card>

          {selectedPlaylist && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedPlaylist.name}</CardTitle>
                <CardDescription>{selectedPlaylist.tracks?.length || 0} {t('web.music.trackCount')}</CardDescription>
              </CardHeader>
              <div className="space-y-2">
                {selectedPlaylist.tracks?.map((tr, i) => (
                  <div key={tr.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-secondary)]">
                    <span className="text-sm text-[var(--text-secondary)] w-6 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tr.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{tr.duration || t('web.music.unknownDuration')}</p>
                    </div>
                  </div>
                ))}
                {(!selectedPlaylist.tracks || selectedPlaylist.tracks.length === 0) && (
                  <p className="text-sm text-[var(--text-secondary)]">{t('web.music.emptyPlaylist')}</p>
                )}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('common.availableCommands')}</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                <p className="font-medium">{t('web.music.playUrlSearch')}</p>
                <p className="text-[var(--text-secondary)]">{t('web.music.playUrlDesc')}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                <p className="font-medium">{t('web.music.playlistCommands')}</p>
                <p className="text-[var(--text-secondary)]">{t('web.music.playlistCommandsDesc')}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                <p className="font-medium">{t('web.music.musicControls')}</p>
                <p className="text-[var(--text-secondary)]">{t('web.music.musicControlsDesc')}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                <p className="font-medium">{t('web.music.musicQueue')}</p>
                <p className="text-[var(--text-secondary)]">{t('web.music.musicQueueDesc')}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                <p className="font-medium">{t('web.music.musicPause')}</p>
                <p className="text-[var(--text-secondary)]">{t('web.music.musicPauseDesc')}</p>
              </div>
            </div>
          </Card>
        </>
      )}

      {activeTab === 'bot' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('web.music.botPlayer')}</CardTitle>
            <CardDescription>{t('web.music.botPlayerDesc')}</CardDescription>
          </CardHeader>
          <BotMusicPlayer />
        </Card>
      )}

      {activeTab === 'web' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('web.music.webPlayer')}</CardTitle>
            <CardDescription>{t('web.music.webPlayerDesc')}</CardDescription>
          </CardHeader>
          <WebPlayerView />
        </Card>
      )}
    </div>
  );
}
