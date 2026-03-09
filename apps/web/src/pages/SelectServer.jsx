import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuildStore } from '../stores/guild';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { guildIcon } from '../lib/utils';
import { ExternalLink } from 'lucide-react';
import { useT } from '../lib/i18n';

export function SelectServer() {
  const { guilds, fetchGuilds, selectGuild, loading } = useGuildStore();
  const navigate = useNavigate();
  const t = useT();

  useEffect(() => { fetchGuilds(); }, []);

  const handleSelect = (guild) => {
    if (!guild.botPresent) return;
    selectGuild(guild.id);
    navigate('/dashboard');
  };

  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID || ''}&permissions=8&scope=bot%20applications.commands`;

  return (
    <div className="h-screen bg-[var(--bg-canvas)] overflow-y-auto">
      <div className="p-3 flex items-start justify-center pt-16 pb-16">
        <div className="w-full max-w-2xl bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] shadow-[var(--shadow)] p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">{t('web.selectServer.title')}</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-6">{t('web.selectServer.subtitle')}</p>

        {loading ? (
          <p className="text-[var(--text-secondary)]">{t('common.loading')}</p>
        ) : (
          <div className="grid gap-2">
            {guilds.map(guild => (
              <div
                key={guild.id}
                className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:bg-[var(--bg-secondary)] active:scale-[0.99] ${!guild.botPresent ? 'opacity-60' : ''}`}
                onClick={() => handleSelect(guild)}
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-[var(--bg-tertiary)] shrink-0 flex items-center justify-center">
                  {guildIcon(guild.id, guild.icon) ? (
                    <img src={guildIcon(guild.id, guild.icon)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-bold">{guild.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{guild.name}</p>
                </div>
                {guild.botPresent ? (
                  <Badge variant="success">{t('web.selectServer.botActive')}</Badge>
                ) : (
                  <a
                    href={inviteUrl}
                    target="_blank"
                    rel="noopener"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                  >
                    {t('web.selectServer.invite')} <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
