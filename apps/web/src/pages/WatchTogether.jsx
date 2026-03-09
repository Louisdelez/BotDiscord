import { useEffect } from 'react';
import { MonitorPlay } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useGuildStore } from '../stores/guild';
import { ws } from '../lib/websocket';
import { WatchTogetherPlayer } from '../components/WatchTogetherPlayer';
import { useT } from '../lib/i18n';

export function WatchTogether() {
  const { currentGuild } = useGuildStore();
  const t = useT();

  useEffect(() => {
    ws.connect();
    if (currentGuild) {
      ws.subscribeGuild(currentGuild.id);
    }
  }, [currentGuild]);

  if (!currentGuild) return <p className="text-[var(--text-secondary)]">{t('common.selectServer')}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <MonitorPlay size={28} /> {t('web.watchTogether.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">{t('web.watchTogether.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('web.watchTogether.syncVideo')}</CardTitle>
          <CardDescription>{t('web.watchTogether.syncVideoDesc')}</CardDescription>
        </CardHeader>
        <WatchTogetherPlayer />
      </Card>
    </div>
  );
}
