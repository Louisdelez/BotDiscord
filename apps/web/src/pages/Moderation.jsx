import { useEffect, useState } from 'react';
import { Shield, Bot } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { Slider } from '../components/ui/Slider';
import { Table, TableHeader, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useGuildStore } from '../stores/guild';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useT } from '../lib/i18n';
import { useLocaleStore } from '../stores/locale';

const actionVariants = { WARN: 'warning', MUTE: 'info', BAN: 'danger', KICK: 'danger', UNMUTE: 'success', UNBAN: 'success' };

export function Moderation() {
  const { currentGuild } = useGuildStore();
  const t = useT();
  const locale = useLocaleStore(s => s.locale);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [config, setConfig] = useState({});

  useEffect(() => {
    if (!currentGuild) return;
    const params = new URLSearchParams({ page, limit: 15 });
    if (filter) params.set('action', filter);
    api.get(`/guilds/${currentGuild.id}/moderation?${params}`).then(d => {
      setLogs(d.logs || []);
      setTotal(d.total || 0);
    }).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/config`).then(setConfig).catch(() => {});
  }, [currentGuild, page, filter]);

  const updateConfig = async (updates) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    await api.patch(`/guilds/${currentGuild.id}/config`, updates).catch(() => {});
  };

  if (!currentGuild) return <p className="text-[var(--text-secondary)]">{t('common.selectServer')}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Shield size={28} /> {t('web.moderation.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">{t('web.moderation.subtitle')}</p>
      </div>

      {/* Automod Config */}
      <Card>
        <CardHeader>
          <CardTitle>{t('web.moderation.automodConfig')}</CardTitle>
          <CardDescription>{t('web.moderation.automodDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.moderation.automodEnabled')} checked={config.automodEnabled || false} onChange={v => updateConfig({ automodEnabled: v })} />
          <Toggle label={t('web.moderation.antiSpam')} checked={config.automodSpamEnabled || false} onChange={v => updateConfig({ automodSpamEnabled: v })} />
          <Toggle label={t('web.moderation.antiLinks')} checked={config.automodLinksEnabled || false} onChange={v => updateConfig({ automodLinksEnabled: v })} />
          <Toggle label={t('web.moderation.sarcasmDetection')} description={t('web.moderation.sarcasmDesc')} checked={config.automodSarcasmDetection || false} onChange={v => updateConfig({ automodSarcasmDetection: v })} />
          <Toggle label={t('web.moderation.subtleHarassment')} description={t('web.moderation.subtleHarassmentDesc')} checked={config.automodSubtleHarassment || false} onChange={v => updateConfig({ automodSubtleHarassment: v })} />
          <Slider
            label={t('web.moderation.toxicityThreshold')}
            value={config.automodToxicityThreshold || 0.7}
            onChange={v => updateConfig({ automodToxicityThreshold: v })}
            min={0.1} max={1} step={0.05}
          />
        </div>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('web.moderation.logs')}</CardTitle>
        </CardHeader>

        <div className="flex gap-2 mb-4 flex-wrap">
          {['', 'WARN', 'MUTE', 'BAN', 'KICK'].map(action => (
            <Button
              key={action}
              variant={filter === action ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => { setFilter(action); setPage(1); }}
            >
              {action || t('common.all')}
            </Button>
          ))}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('web.moderation.action')}</TableHead>
              <TableHead>{t('web.moderation.target')}</TableHead>
              <TableHead>{t('web.moderation.moderator')}</TableHead>
              <TableHead>{t('web.moderation.reason')}</TableHead>
              <TableHead>{t('common.date')}</TableHead>
            </TableRow>
          </TableHeader>
          <tbody>
            {logs.map(log => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant={actionVariants[log.action] || 'default'}>
                    {log.action}
                    {log.automated && <Bot size={12} className="inline ml-1" />}
                  </Badge>
                </TableCell>
                <TableCell>{log.target?.user?.username || '—'}</TableCell>
                <TableCell>{log.moderator?.user?.username || '—'}</TableCell>
                <TableCell className="max-w-48 truncate">{log.reason || '—'}</TableCell>
                <TableCell className="text-[var(--text-secondary)] text-xs">{formatDate(log.createdAt, locale)}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell className="text-center text-[var(--text-secondary)] py-8" colSpan={5}>
                  {t('web.moderation.noLogs')}
                </TableCell>
              </TableRow>
            )}
          </tbody>
        </Table>

        {total > 15 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('common.previous')}</Button>
            <span className="text-sm text-[var(--text-secondary)] self-center">{t('common.page')} {page}</span>
            <Button variant="secondary" size="sm" disabled={page * 15 >= total} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
