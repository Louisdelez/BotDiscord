import { useEffect, useState } from 'react';
import { Bot, Plus, Pencil, Trash2, Save, CalendarClock, Brain, Mic, Sparkles, Server, Cloud } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { Slider } from '../components/ui/Slider';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useGuildStore } from '../stores/guild';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useT } from '../lib/i18n';
import { useLocaleStore } from '../stores/locale';

export function AI() {
  const { currentGuild } = useGuildStore();
  const t = useT();
  const locale = useLocaleStore(s => s.locale);
  const [config, setConfig] = useState({});
  const [faq, setFaq] = useState([]);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', tags: '' });
  const [trending, setTrending] = useState([]);
  const [memories, setMemories] = useState([]);

  useEffect(() => {
    if (!currentGuild) return;
    api.get(`/guilds/${currentGuild.id}/ai/config`).then(setConfig).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/ai/faq`).then(d => setFaq(Array.isArray(d) ? d : [])).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/trending`).then(d => setTrending(Array.isArray(d) ? d : [])).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/ai/memories`).then(d => setMemories(Array.isArray(d) ? d : [])).catch(() => {});
  }, [currentGuild]);

  const saveConfig = async (updates) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    await api.patch(`/guilds/${currentGuild.id}/ai/config`, updates).catch(() => {});
  };

  const saveFaq = async () => {
    const data = { question: faqForm.question, answer: faqForm.answer, tags: faqForm.tags.split(',').map(t => t.trim()).filter(Boolean) };
    if (editingFaq) {
      const updated = await api.patch(`/guilds/${currentGuild.id}/ai/faq/${editingFaq.id}`, data);
      setFaq(faq.map(f => f.id === editingFaq.id ? updated : f));
    } else {
      const created = await api.post(`/guilds/${currentGuild.id}/ai/faq`, data);
      setFaq([created, ...faq]);
    }
    closeFaqModal();
  };

  const deleteFaq = async (id) => {
    await api.delete(`/guilds/${currentGuild.id}/ai/faq/${id}`);
    setFaq(faq.filter(f => f.id !== id));
  };

  const deleteMemory = async (id) => {
    await api.delete(`/guilds/${currentGuild.id}/ai/memories/${id}`);
    setMemories(memories.filter(m => m.id !== id));
  };

  const openEditFaq = (entry) => {
    setEditingFaq(entry);
    setFaqForm({ question: entry.question, answer: entry.answer, tags: (entry.tags || []).join(', ') });
    setShowFaqModal(true);
  };

  const closeFaqModal = () => {
    setShowFaqModal(false);
    setEditingFaq(null);
    setFaqForm({ question: '', answer: '', tags: '' });
  };

  if (!currentGuild) return <p className="text-[var(--text-secondary)]">{t('common.selectServer')}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Bot size={28} /> {t('web.ai.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">{t('web.ai.subtitle')}</p>
      </div>

      {/* AI Config */}
      <Card>
        <CardHeader>
          <CardTitle>{t('web.ai.config')}</CardTitle>
          <CardDescription>{t('web.ai.configDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          {/* Provider Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('web.ai.provider')}</label>
            <p className="text-xs text-[var(--text-secondary)] mb-3">{t('web.ai.providerDesc')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => saveConfig({ provider: 'ollama' })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${(config.provider || 'ollama') === 'ollama' ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--text-secondary)]'}`}
              >
                <Server size={18} />
                <span className="font-medium text-sm">{t('web.ai.providerOllama')}</span>
              </button>
              <button
                onClick={() => saveConfig({ provider: 'openai' })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${config.provider === 'openai' ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--text-secondary)]'}`}
              >
                <Cloud size={18} />
                <span className="font-medium text-sm">{t('web.ai.providerOpenai')}</span>
              </button>
            </div>
          </div>

          {/* OpenAI-specific fields */}
          {config.provider === 'openai' && (
            <>
              <Input label={t('web.ai.openaiApiKey')} type="password" value={config.openaiApiKey || ''} onChange={e => saveConfig({ openaiApiKey: e.target.value })} placeholder={t('web.ai.openaiApiKeyPlaceholder')} />
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('web.ai.openaiModel')}</label>
                <select
                  value={config.model || 'gpt-4o-mini'}
                  onChange={e => saveConfig({ model: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('web.ai.embedModel')}</label>
                <select
                  value={config.embedModel || 'text-embedding-3-small'}
                  onChange={e => saveConfig({ embedModel: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="text-embedding-3-small">text-embedding-3-small</option>
                  <option value="text-embedding-3-large">text-embedding-3-large</option>
                </select>
              </div>
            </>
          )}

          {/* Ollama-specific fields */}
          {(config.provider || 'ollama') === 'ollama' && (
            <>
              <Input label={t('web.ai.model')} value={config.model || 'llama3.2'} onChange={e => saveConfig({ model: e.target.value })} placeholder="llama3.2" />
              <Input label={t('web.ai.embedModel')} value={config.embedModel || 'nomic-embed-text'} onChange={e => saveConfig({ embedModel: e.target.value })} placeholder="nomic-embed-text" />
            </>
          )}

          <Textarea label={t('web.ai.systemPrompt')} value={config.systemPrompt || ''} onChange={e => saveConfig({ systemPrompt: e.target.value })} placeholder="Tu es un assistant utile..." />
          <Slider label={t('web.ai.temperature')} value={config.temperature || 0.7} onChange={v => saveConfig({ temperature: v })} min={0} max={2} step={0.1} />
          <Slider label={t('web.ai.maxTokens')} value={config.maxTokens || 500} onChange={v => saveConfig({ maxTokens: v })} min={50} max={2000} step={50} />
          <Input label={t('web.ai.chatChannelId')} value={config.chatChannelId || ''} onChange={e => saveConfig({ chatChannelId: e.target.value })} placeholder="ID du channel" />
        </div>
      </Card>

      {/* Autonomous Agent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain size={20} /> {t('web.ai.autonomousAgent')}</CardTitle>
          <CardDescription>{t('web.ai.autonomousAgentDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.ai.autonomousAgentEnabled')} description={t('web.ai.autonomousAgentEnabledDesc')} checked={config.autonomousAgentEnabled || false} onChange={v => saveConfig({ autonomousAgentEnabled: v })} />
          {config.autonomousAgentEnabled && (
            <>
              <Input label={t('web.ai.agentChannelId')} value={config.agentChannelId || ''} onChange={e => saveConfig({ agentChannelId: e.target.value })} placeholder="ID du channel" />
              <Slider label={t('web.ai.analysisInterval')} value={config.agentAnalysisInterval || 60} onChange={v => saveConfig({ agentAnalysisInterval: v })} min={15} max={240} step={15} suffix=" min" />
            </>
          )}
        </div>

        {trending.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-sm font-medium">{t('web.ai.recentTrends')}</p>
            {trending.slice(0, 5).map(t => (
              <div key={t.id} className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                <p className="text-sm font-medium">{t.topic}</p>
                <p className="text-xs text-[var(--text-secondary)]">{t.summary}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{formatDate(t.detectedAt, locale)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tone Learning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles size={20} /> {t('web.ai.toneLearning')}</CardTitle>
          <CardDescription>{t('web.ai.toneLearningDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.ai.toneLearningEnabled')} description={t('web.ai.toneLearningEnabledDesc')} checked={config.toneLearningEnabled || false} onChange={v => saveConfig({ toneLearningEnabled: v })} />
        </div>

        {memories.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-sm font-medium">{t('web.ai.serverMemories')} ({memories.length})</p>
            {memories.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{m.type}</Badge>
                    <span className="text-sm">{m.content}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{t('common.frequency')}: {m.frequency}</p>
                </div>
                <button onClick={() => deleteMemory(m.id)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer shrink-0">
                  <Trash2 size={14} className="text-[var(--danger)]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Voice AI */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2"><Mic size={20} /> {t('web.ai.voiceAi')}</CardTitle>
            <Badge variant="warning">{t('common.experimental')}</Badge>
          </div>
          <CardDescription>{t('web.ai.voiceAiDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.ai.voiceAiEnabled')} description={t('web.ai.voiceAiEnabledDesc')} checked={config.voiceAiEnabled || false} onChange={v => saveConfig({ voiceAiEnabled: v })} />
          {config.voiceAiEnabled && (
            <>
              <Input label={t('web.ai.voiceAiChannelId')} value={config.voiceAiChannelId || ''} onChange={e => saveConfig({ voiceAiChannelId: e.target.value })} placeholder="ID du channel vocal" />
              <Input label={t('web.ai.ttsLanguage')} value={config.ttsLanguage || 'fr'} onChange={e => saveConfig({ ttsLanguage: e.target.value })} placeholder="fr" />
              <Toggle label={t('web.ai.stt')} description={t('web.ai.sttDesc')} checked={config.sttEnabled || false} onChange={v => saveConfig({ sttEnabled: v })} />
            </>
          )}
        </div>
      </Card>

      {/* Daily Recap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarClock size={20} /> {t('web.ai.dailyRecap')}</CardTitle>
          <CardDescription>{t('web.ai.dailyRecapDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.ai.dailyRecapEnabled')} description={t('web.ai.dailyRecapEnabledDesc')} checked={config.dailyRecapEnabled || false} onChange={v => saveConfig({ dailyRecapEnabled: v })} />
          {config.dailyRecapEnabled && (
            <Input label={t('web.ai.dailyRecapTime')} value={config.dailyRecapTime || '20:00'} onChange={e => saveConfig({ dailyRecapTime: e.target.value })} placeholder="20:00" />
          )}
        </div>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('web.ai.faq')}</CardTitle>
              <CardDescription>{t('web.ai.faqDesc')}</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowFaqModal(true)}><Plus size={16} /> {t('common.add')}</Button>
          </div>
        </CardHeader>
        <div className="space-y-3">
          {faq.map(entry => (
            <div key={entry.id} className="p-4 rounded-xl bg-[var(--bg-secondary)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{entry.question}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{entry.answer}</p>
                  {entry.tags?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {entry.tags.map(tag => <Badge key={tag} variant="info">{tag}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEditFaq(entry)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
                    <Pencil size={14} className="text-[var(--text-secondary)]" />
                  </button>
                  <button onClick={() => deleteFaq(entry.id)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
                    <Trash2 size={14} className="text-[var(--danger)]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {faq.length === 0 && <p className="text-sm text-[var(--text-secondary)]">{t('web.ai.noFaq')}</p>}
        </div>
      </Card>

      <Modal open={showFaqModal} onClose={closeFaqModal} title={editingFaq ? t('web.ai.editFaq') : t('web.ai.addFaq')}>
        <div className="space-y-4">
          <Input label={t('web.ai.question')} value={faqForm.question} onChange={e => setFaqForm({ ...faqForm, question: e.target.value })} />
          <Textarea label={t('web.ai.answer')} value={faqForm.answer} onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })} />
          <Input label={t('common.tags')} value={faqForm.tags} onChange={e => setFaqForm({ ...faqForm, tags: e.target.value })} />
          <Button onClick={saveFaq} className="w-full"><Save size={16} /> {t('common.save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
