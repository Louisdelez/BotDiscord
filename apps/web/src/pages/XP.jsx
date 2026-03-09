import { useEffect, useState } from 'react';
import { Trophy, Plus, Trash2, Mic, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Slider } from '../components/ui/Slider';
import { Toggle } from '../components/ui/Toggle';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useGuildStore } from '../stores/guild';
import { api } from '../lib/api';
import { discordAvatar } from '../lib/utils';
import { useT } from '../lib/i18n';

export function XP() {
  const t = useT();
  const { currentGuild, hasRole } = useGuildStore();
  const [leaderboard, setLeaderboard] = useState([]);
  const [config, setConfig] = useState({});
  const [rewards, setRewards] = useState([]);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newReward, setNewReward] = useState({ level: '', roleId: '', roleName: '' });
  const [tab, setTab] = useState('xp');
  const [voiceLeaderboard, setVoiceLeaderboard] = useState([]);

  useEffect(() => {
    if (!currentGuild) return;
    api.get(`/guilds/${currentGuild.id}/xp/leaderboard`).then(d => setLeaderboard(Array.isArray(d) ? d : [])).catch(() => {});
    if (hasRole('ADMIN')) {
      api.get(`/guilds/${currentGuild.id}/xp/config`).then(setConfig).catch(() => {});
      api.get(`/guilds/${currentGuild.id}/xp/rewards`).then(d => setRewards(Array.isArray(d) ? d : [])).catch(() => {});
    }
    api.get(`/guilds/${currentGuild.id}/stats/detailed`).then(d => {
      setVoiceLeaderboard(Array.isArray(d?.voiceLeaderboard) ? d.voiceLeaderboard : []);
    }).catch(() => {});
  }, [currentGuild]);

  const updateConfig = async (updates) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    await api.patch(`/guilds/${currentGuild.id}/xp/config`, updates).catch(() => {});
  };

  const addReward = async () => {
    const reward = await api.post(`/guilds/${currentGuild.id}/xp/rewards`, {
      level: Number(newReward.level),
      roleId: newReward.roleId,
      roleName: newReward.roleName,
    });
    setRewards([...rewards, reward]);
    setShowAddReward(false);
    setNewReward({ level: '', roleId: '', roleName: '' });
  };

  const deleteReward = async (id) => {
    await api.delete(`/guilds/${currentGuild.id}/xp/rewards/${id}`);
    setRewards(rewards.filter(r => r.id !== id));
  };

  if (!currentGuild) return <p className="text-[var(--text-secondary)]">{t('common.selectServer')}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Trophy size={28} /> {t('web.xp.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">{t('web.xp.subtitle')}</p>
      </div>

      {/* XP Config - Admin only */}
      {hasRole('ADMIN') && (
        <Card>
          <CardHeader>
            <CardTitle>{t('web.xp.config')}</CardTitle>
          </CardHeader>
          <div className="space-y-5">
            <Slider label={t('web.xp.perMessage')} value={config.xpPerMessage || 15} onChange={v => updateConfig({ xpPerMessage: v })} min={1} max={100} suffix=" XP" />
            <Slider label={t('web.xp.cooldown')} value={config.xpCooldown || 60} onChange={v => updateConfig({ xpCooldown: v })} min={0} max={300} step={5} suffix="s" />
            <Slider label={t('web.xp.multiplier')} value={config.multiplier || 1} onChange={v => updateConfig({ multiplier: v })} min={0.5} max={5} step={0.25} suffix="x" />
          </div>
        </Card>
      )}

      {/* Vocal XP - Admin only */}
      {hasRole('ADMIN') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mic size={20} /> {t('web.xp.vocal')}</CardTitle>
            <CardDescription>{t('web.xp.vocalDesc')}</CardDescription>
          </CardHeader>
          <div className="space-y-5">
            <Toggle label={t('web.xp.vocalEnabled')} description={t('web.xp.vocalEnabledDesc')} checked={config.voiceXpEnabled || false} onChange={v => updateConfig({ voiceXpEnabled: v })} />
            {config.voiceXpEnabled && (
              <Slider label={t('web.xp.perVoiceMinute')} value={config.xpPerVoiceMinute || 2} onChange={v => updateConfig({ xpPerVoiceMinute: v })} min={1} max={20} suffix=" XP" />
            )}
          </div>
        </Card>
      )}

      {/* Role Rewards - Admin only */}
      {hasRole('ADMIN') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('web.xp.roleRewards')}</CardTitle>
                <CardDescription>{t('web.xp.roleRewardsDesc')}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowAddReward(true)}><Plus size={16} /> {t('common.add')}</Button>
            </div>
          </CardHeader>
          <div className="space-y-2">
            {rewards.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-3">
                  <Badge variant="info">{t('web.xp.lvl')} {r.level}</Badge>
                  <span className="text-sm font-medium">{r.roleName}</span>
                </div>
                <button onClick={() => deleteReward(r.id)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
                  <Trash2 size={16} className="text-[var(--danger)]" />
                </button>
              </div>
            ))}
            {rewards.length === 0 && <p className="text-sm text-[var(--text-secondary)]">{t('web.xp.noRewards')}</p>}
          </div>
        </Card>
      )}

      {/* Tab selector for leaderboards */}
      <div className="flex gap-2">
        <button onClick={() => setTab('xp')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'xp' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
          <BarChart3 size={14} className="inline mr-1" /> {t('web.xp.xpLeaderboard')}
        </button>
        <button onClick={() => setTab('voice')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'voice' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
          <Mic size={14} className="inline mr-1" /> {t('web.xp.voiceLeaderboard')}
        </button>
      </div>

      {/* XP Leaderboard */}
      {tab === 'xp' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('web.xp.xpLeaderboard')}</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {leaderboard.map((m, i) => (
              <div key={m.id} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-secondary)]">
                <span className={`w-8 text-center font-bold ${i < 3 ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
                  #{i + 1}
                </span>
                <Avatar src={discordAvatar(m.user.discordId, m.user.avatar)} alt={m.user.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.user.username}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{t('web.xp.lvl')} {m.level}</p>
                </div>
                <span className="text-sm font-semibold">{m.xp.toLocaleString()} XP</span>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="text-sm text-[var(--text-secondary)]">{t('web.xp.noMembers')}</p>}
          </div>
        </Card>
      )}

      {/* Voice Leaderboard */}
      {tab === 'voice' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('web.xp.voiceLeaderboard')}</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {voiceLeaderboard.map((m, i) => (
              <div key={m.id} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-secondary)]">
                <span className={`w-8 text-center font-bold ${i < 3 ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
                  #{i + 1}
                </span>
                <Avatar src={discordAvatar(m.user.discordId, m.user.avatar)} alt={m.user.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.user.username}</p>
                </div>
                <span className="text-sm font-semibold">{Math.floor(m.voiceMinutes / 60)}h {m.voiceMinutes % 60}min</span>
              </div>
            ))}
            {voiceLeaderboard.length === 0 && <p className="text-sm text-[var(--text-secondary)]">{t('web.xp.noVoiceActivity')}</p>}
          </div>
        </Card>
      )}

      <Modal open={showAddReward} onClose={() => setShowAddReward(false)} title={t('web.xp.addReward')}>
        <div className="space-y-4">
          <Input label={t('web.xp.requiredLevel')} type="number" value={newReward.level} onChange={e => setNewReward({ ...newReward, level: e.target.value })} />
          <Input label={t('web.xp.roleId')} value={newReward.roleId} onChange={e => setNewReward({ ...newReward, roleId: e.target.value })} />
          <Input label={t('web.xp.roleName')} value={newReward.roleName} onChange={e => setNewReward({ ...newReward, roleName: e.target.value })} />
          <Button onClick={addReward} className="w-full">{t('common.add')}</Button>
        </div>
      </Modal>
    </div>
  );
}
