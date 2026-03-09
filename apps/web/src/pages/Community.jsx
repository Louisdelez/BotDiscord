import { useEffect, useState } from 'react';
import { Users, MessageCircle, Lightbulb, Quote as QuoteIcon, Eye, EyeOff, BarChart3, ThumbsUp, ThumbsDown, Check, X as XIcon, CheckCheck, Bot } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useGuildStore } from '../stores/guild';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useT } from '../lib/i18n';
import { useLocaleStore } from '../stores/locale';

const statusVariant = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger', DONE: 'info' };

export function Community() {
  const { currentGuild, hasRole } = useGuildStore();
  const t = useT();
  const locale = useLocaleStore(s => s.locale);
  const [tab, setTab] = useState('suggestions');
  const [suggestions, setSuggestions] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [confessions, setConfessions] = useState([]);
  const [polls, setPolls] = useState([]);

  const statusLabel = { PENDING: t('web.community.statusPending'), APPROVED: t('web.community.statusApproved'), REJECTED: t('web.community.statusRejected'), DONE: t('web.community.statusDone') };

  useEffect(() => {
    if (!currentGuild) return;
    api.get(`/guilds/${currentGuild.id}/suggestions`).then(d => setSuggestions(Array.isArray(d) ? d : [])).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/quotes`).then(d => setQuotes(Array.isArray(d) ? d : [])).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/confessions`).then(d => setConfessions(Array.isArray(d) ? d : [])).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/polls`).then(d => setPolls(Array.isArray(d) ? d : [])).catch(() => {});
  }, [currentGuild]);

  const updateSuggestion = async (id, status) => {
    await api.patch(`/guilds/${currentGuild.id}/suggestions/${id}`, { status });
    setSuggestions(s => s.map(x => x.id === id ? { ...x, status } : x));
  };

  if (!currentGuild) return <p className="text-[var(--text-secondary)]">{t('common.selectServer')}</p>;

  const tabs = [
    { id: 'suggestions', label: t('web.community.suggestions'), icon: Lightbulb, count: suggestions.length },
    { id: 'quotes', label: t('web.community.quotes'), icon: MessageCircle, count: quotes.length },
    { id: 'confessions', label: t('web.community.confessions'), icon: EyeOff, count: confessions.length },
    { id: 'polls', label: t('web.community.polls'), icon: BarChart3, count: polls.length },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Users size={28} /> {t('web.community.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">{t('web.community.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {tabs.map(tb => (
          <Card key={tb.id} className="cursor-pointer hover:border-[var(--accent)]" onClick={() => setTab(tb.id)}>
            <div className="text-center">
              <p className="text-2xl font-bold">{tb.count}</p>
              <p className="text-xs text-[var(--text-secondary)]">{tb.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === tb.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
            <tb.icon size={14} /> {tb.label}
          </button>
        ))}
      </div>

      {/* Suggestions */}
      {tab === 'suggestions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb size={20} /> {t('web.community.suggestions')}</CardTitle>
            <CardDescription>{t('web.community.manageSuggestions')}</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('web.community.suggestion')}</TableHead>
                <TableHead>{t('web.community.author')}</TableHead>
                <TableHead>{t('web.community.votes')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                {hasRole('MOD') && <TableHead>{t('common.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <tbody>
              {suggestions.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="max-w-xs truncate">{s.content}</TableCell>
                  <TableCell>{s.authorName}</TableCell>
                  <TableCell>
                    <span className="text-green-500 inline-flex items-center gap-1"><ThumbsUp size={12} /> {s.upvotes?.length || 0}</span>
                    {' / '}
                    <span className="text-red-500 inline-flex items-center gap-1"><ThumbsDown size={12} /> {s.downvotes?.length || 0}</span>
                  </TableCell>
                  <TableCell><Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge></TableCell>
                  {hasRole('MOD') && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => updateSuggestion(s.id, 'APPROVED')}><Check size={14} className="text-green-500" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => updateSuggestion(s.id, 'REJECTED')}><XIcon size={14} className="text-red-500" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => updateSuggestion(s.id, 'DONE')}><CheckCheck size={14} className="text-blue-500" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {suggestions.length === 0 && (
                <TableRow><TableCell colSpan={hasRole('MOD') ? 5 : 4} className="text-center text-[var(--text-secondary)] py-8">{t('web.community.noSuggestions')}</TableCell></TableRow>
              )}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Quotes */}
      {tab === 'quotes' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><QuoteIcon size={20} /> {t('web.community.quotes')}</CardTitle>
            <CardDescription>{t('web.community.bestQuotes')}</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {quotes.length === 0 && <p className="text-[var(--text-secondary)] text-sm text-center py-8">{t('web.community.noQuotes')}</p>}
            {quotes.map(q => (
              <div key={q.id} className="p-4 rounded-xl bg-[var(--bg-secondary)] border-l-4 border-amber-500">
                <p className="italic">"{q.content}"</p>
                <p className="text-sm text-[var(--text-secondary)] mt-2">— {q.authorName} • {formatDate(q.createdAt, locale)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Confessions */}
      {tab === 'confessions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye size={20} /> {t('web.community.confessions')}</CardTitle>
            <CardDescription>{t('web.community.anonymousConfessions')}</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {confessions.length === 0 && <p className="text-[var(--text-secondary)] text-sm text-center py-8">{t('web.community.noConfessions')}</p>}
            {confessions.map(c => (
              <div key={c.id} className="p-4 rounded-xl bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">#{c.number}</Badge>
                  <span className="text-xs text-[var(--text-secondary)]">{formatDate(c.createdAt, locale)}</span>
                </div>
                <p>{c.content}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Polls */}
      {tab === 'polls' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle size={20} /> {t('web.community.polls')}</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {polls.length === 0 && <p className="text-[var(--text-secondary)] text-sm text-center py-8">{t('web.community.noPolls')}</p>}
            {polls.map(p => {
              const votes = typeof p.votes === 'string' ? JSON.parse(p.votes) : p.votes;
              const totalVotes = Object.values(votes).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);

              return (
                <div key={p.id} className="p-4 rounded-xl bg-[var(--bg-secondary)]">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="font-medium flex-1">{p.question}</p>
                    <Badge variant={p.closed ? 'danger' : 'success'}>{p.closed ? t('web.community.closed') : t('web.community.active')}</Badge>
                  </div>
                  <div className="space-y-2">
                    {p.options?.map((opt, i) => {
                      const count = Array.isArray(votes[i]) ? votes[i].length : 0;
                      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{opt}</span>
                            <span className="text-[var(--text-secondary)]">{pct}% ({count})</span>
                          </div>
                          <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">{totalVotes} {t('web.community.votes_count')} • {formatDate(p.createdAt, locale)}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
