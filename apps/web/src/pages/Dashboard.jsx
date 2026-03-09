import { useEffect, useState } from 'react';
import { Users, MessageSquare, Shield, TrendingUp, Mic, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useGuildStore } from '../stores/guild';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useT } from '../lib/i18n';
import { useLocaleStore } from '../stores/locale';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        </div>
      </div>
    </Card>
  );
}

export function Dashboard() {
  const { currentGuild, hasRole } = useGuildStore();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const t = useT();
  const locale = useLocaleStore(s => s.locale);

  useEffect(() => {
    if (!currentGuild) return;
    api.get(`/guilds/${currentGuild.id}/stats`).then(setStats).catch(() => {});
    if (hasRole('MOD')) {
      api.get(`/guilds/${currentGuild.id}/moderation?limit=5`).then(d => setRecentLogs(d.logs || [])).catch(() => {});
    }
  }, [currentGuild]);

  if (!currentGuild) {
    return <p className="text-[var(--text-secondary)]">{t('common.selectServer')}</p>;
  }

  const localeMap = { fr: 'fr-FR', en: 'en-US', de: 'de-DE', it: 'it-IT', es: 'es-ES' };
  const chartData = stats?.stats?.map(s => ({
    date: new Date(s.date).toLocaleDateString(localeMap[locale] || 'fr-FR', { day: 'numeric', month: 'short' }),
    messages: s.messageCount,
    membres: s.memberCount,
    voiceMinutes: s.voiceMinutes || 0,
  })) || [];

  const totalVoiceMinutes = stats?.totals?._sum?.voiceMinutes || 0;
  const voiceHours = Math.floor(totalVoiceMinutes / 60);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('web.dashboard.title')}</h1>
        <p className="text-[var(--text-secondary)]">{currentGuild.name}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard icon={Users} label={t('web.dashboard.members')} value={stats?.totals?._count || 0} color="bg-[var(--accent)]" />
        <StatCard icon={MessageSquare} label={t('web.dashboard.messages')} value={stats?.totals?._sum?.messageCount || 0} color="bg-[var(--success)]" />
        <StatCard icon={Shield} label={t('web.dashboard.modActions')} value={stats?.modCount || 0} color="bg-[var(--warning)]" />
        <StatCard icon={TrendingUp} label={t('web.dashboard.totalXp')} value={stats?.totals?._sum?.xp || 0} color="bg-purple-500" />
        <StatCard icon={Mic} label={t('web.dashboard.voiceHours')} value={`${voiceHours}h`} color="bg-blue-500" />
        <StatCard icon={Award} label={t('web.dashboard.badges')} value={stats?.badgeCount || 0} color="bg-yellow-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('web.dashboard.activity30d')}</CardTitle>
        </CardHeader>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '13px',
                }}
              />
              <Line type="monotone" dataKey="messages" stroke="var(--accent)" strokeWidth={2} dot={false} name={t('web.dashboard.messages')} />
              <Line type="monotone" dataKey="voiceMinutes" stroke="#3498db" strokeWidth={2} dot={false} name={t('web.dashboard.voiceMinutes')} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {hasRole('MOD') && (
        <Card>
          <CardHeader>
            <CardTitle>{t('web.dashboard.recentActions')}</CardTitle>
          </CardHeader>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{t('web.dashboard.noRecentActions')}</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map(log => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)]">
                  <Badge variant={log.action === 'BAN' ? 'danger' : log.action === 'WARN' ? 'warning' : 'info'}>
                    {log.action}
                  </Badge>
                  <span className="text-sm flex-1">
                    <strong>{log.moderator?.user?.username}</strong> → {log.target?.user?.username}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">{formatDate(log.createdAt, locale)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
