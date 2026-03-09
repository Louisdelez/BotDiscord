import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, AlertTriangle, UserPlus, Github, Calendar, Plus, Trash2, Save, Star, MessageSquare, BarChart3, Trello } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Toggle } from '../components/ui/Toggle';
import { Input, Textarea } from '../components/ui/Input';
import { Slider } from '../components/ui/Slider';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useGuildStore } from '../stores/guild';
import { useLocaleStore, SUPPORTED_LOCALES } from '../stores/locale';
import { useT } from '../lib/i18n';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Globe } from 'lucide-react';

const LOCALE_FLAGS = { fr: 'fr', en: 'gb', de: 'de', it: 'it', es: 'es' };
const LOCALE_LABELS = { fr: 'Francais', en: 'English', de: 'Deutsch', it: 'Italiano', es: 'Espanol' };

export function Settings() {
  const { currentGuild } = useGuildStore();
  const t = useT();
  const { locale, setLocale } = useLocaleStore();
  const [config, setConfig] = useState({});
  const [onboarding, setOnboarding] = useState({});
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', description: '', duration: '' });

  useEffect(() => {
    if (!currentGuild) return;
    api.get(`/guilds/${currentGuild.id}/config`).then(setConfig).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/onboarding`).then(setOnboarding).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/events/templates`).then(d => setTemplates(Array.isArray(d) ? d : [])).catch(() => {});
  }, [currentGuild]);

  const update = async (updates) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    await api.patch(`/guilds/${currentGuild.id}/config`, updates).catch(() => {});
  };

  const updateOnboarding = async (updates) => {
    const updated = { ...onboarding, ...updates };
    setOnboarding(updated);
    await api.patch(`/guilds/${currentGuild.id}/onboarding`, updates).catch(() => {});
  };

  const createTemplate = async () => {
    const template = await api.post(`/guilds/${currentGuild.id}/events/templates`, {
      ...templateForm,
      duration: templateForm.duration ? Number(templateForm.duration) : null,
    });
    setTemplates([template, ...templates]);
    setShowTemplateModal(false);
    setTemplateForm({ name: '', description: '', duration: '' });
  };

  const deleteTemplate = async (id) => {
    await api.delete(`/guilds/${currentGuild.id}/events/templates/${id}`);
    setTemplates(templates.filter(tp => tp.id !== id));
  };

  if (!currentGuild) return <p className="text-[var(--text-secondary)]">{t('common.selectServer')}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <SettingsIcon size={28} /> {t('web.settings.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">{t('web.settings.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe size={20} /> {t('web.settings.language')}</CardTitle>
          <CardDescription>{t('web.settings.languageDesc')}</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_LOCALES.map(code => (
            <button
              key={code}
              onClick={() => setLocale(code)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                locale === code
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <span className={`fi fi-${LOCALE_FLAGS[code]} fis`} style={{ width: 20, height: 20, borderRadius: 4 }} />
              {LOCALE_LABELS[code]}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('web.settings.features')}</CardTitle>
          <CardDescription>{t('web.settings.featuresDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.settings.moderation')} description={t('web.settings.moderationDesc')} checked={config.modEnabled ?? true} onChange={v => update({ modEnabled: v })} />
          <Toggle label={t('web.settings.xpSystem')} description={t('web.settings.xpSystemDesc')} checked={config.xpEnabled ?? true} onChange={v => update({ xpEnabled: v })} />
          <Toggle label={t('web.settings.aiIntelligence')} description={t('web.settings.aiIntelligenceDesc')} checked={config.aiEnabled ?? true} onChange={v => update({ aiEnabled: v })} />
          <Toggle label={t('web.settings.welcomeMessages')} description={t('web.settings.welcomeMessagesDesc')} checked={config.welcomeEnabled ?? false} onChange={v => update({ welcomeEnabled: v })} />
          <Toggle label={t('web.settings.gamesFeature')} description={t('web.settings.gamesFeatureDesc')} checked={config.gamesEnabled ?? false} onChange={v => update({ gamesEnabled: v })} />
          <Toggle label={t('web.settings.musicFeature')} description={t('web.settings.musicFeatureDesc')} checked={config.musicEnabled ?? false} onChange={v => update({ musicEnabled: v })} />
          <Toggle label={t('web.settings.pollsFeature')} description={t('web.settings.pollsFeatureDesc')} checked={config.pollsEnabled ?? false} onChange={v => update({ pollsEnabled: v })} />
          <Toggle label={t('web.settings.confessionsFeature')} description={t('web.settings.confessionsFeatureDesc')} checked={config.confessionsEnabled ?? false} onChange={v => update({ confessionsEnabled: v })} />
          <Toggle label={t('web.settings.creaturesFeature')} description={t('web.settings.creaturesFeatureDesc')} checked={config.creaturesEnabled ?? false} onChange={v => update({ creaturesEnabled: v })} />
        </div>
      </Card>

      {config.creaturesEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>{t('web.settings.creaturesFeature')}</CardTitle>
            <CardDescription>{t('web.settings.creaturesSpawnRate')}</CardDescription>
          </CardHeader>
          <Slider label={t('web.settings.creaturesSpawnRateLabel')} value={config.creatureSpawnRate || 50} onChange={v => update({ creatureSpawnRate: Math.round(v) })} min={10} max={200} step={5} />
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('web.settings.channels')}</CardTitle>
          <CardDescription>{t('web.settings.channelsDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <Input label={t('web.settings.welcomeChannel')} value={config.welcomeChannelId || ''} onChange={e => update({ welcomeChannelId: e.target.value })} placeholder={t('common.channelId')} />
          <Input label={t('web.settings.logChannel')} value={config.logChannelId || ''} onChange={e => update({ logChannelId: e.target.value })} placeholder={t('common.channelId')} />
          <Input label={t('web.settings.modLogChannel')} value={config.modLogChannelId || ''} onChange={e => update({ modLogChannelId: e.target.value })} placeholder={t('common.channelId')} />
          <Input label={t('web.settings.confessionChannel')} value={config.confessionChannelId || ''} onChange={e => update({ confessionChannelId: e.target.value })} placeholder={t('common.channelId')} />
          <Input label={t('web.settings.quotesChannel')} value={config.quotesChannelId || ''} onChange={e => update({ quotesChannelId: e.target.value })} placeholder={t('common.channelId')} />
          <Input label={t('web.settings.suggestionsChannel')} value={config.suggestionsChannelId || ''} onChange={e => update({ suggestionsChannelId: e.target.value })} placeholder={t('common.channelId')} />
          <Input label={t('web.settings.recapChannel')} value={config.recapChannelId || ''} onChange={e => update({ recapChannelId: e.target.value })} placeholder={t('common.channelId')} />
        </div>
      </Card>

      {/* Welcome Message + Embed Customization */}
      {config.welcomeEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>{t('web.settings.welcomeMessage')}</CardTitle>
            <CardDescription>{t('web.settings.welcomeMessageDesc')}</CardDescription>
          </CardHeader>
          <div className="space-y-5">
            <Input
              value={config.welcomeMessage || ''}
              onChange={e => update({ welcomeMessage: e.target.value })}
              placeholder={t('web.settings.welcomeMessagePlaceholder')}
            />
            <Toggle label={t('web.settings.useRichEmbed')} description={t('web.settings.useRichEmbedDesc')} checked={config.welcomeUseEmbed ?? false} onChange={v => update({ welcomeUseEmbed: v })} />
            {config.welcomeUseEmbed && (
              <>
                <Input label={t('web.settings.embedColor')} value={config.welcomeEmbedColor || ''} onChange={e => update({ welcomeEmbedColor: e.target.value })} placeholder="#0071e3" />
                <Input label={t('web.settings.imageUrl')} value={config.welcomeImageUrl || ''} onChange={e => update({ welcomeImageUrl: e.target.value })} placeholder="https://..." />
                <Input label={t('web.settings.bannerUrl')} value={config.welcomeBannerUrl || ''} onChange={e => update({ welcomeBannerUrl: e.target.value })} placeholder="https://..." />
              </>
            )}
          </div>
        </Card>
      )}

      {/* Confession Moderation */}
      {config.confessionsEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare size={20} /> {t('web.settings.confessionModeration')}</CardTitle>
            <CardDescription>{t('web.settings.confessionModerationDesc')}</CardDescription>
          </CardHeader>
          <div className="space-y-5">
            <Toggle label={t('web.settings.confessionModerationEnabled')} description={t('web.settings.confessionModerationEnabledDesc')} checked={config.confessionModerationEnabled ?? false} onChange={v => update({ confessionModerationEnabled: v })} />
            {config.confessionModerationEnabled && (
              <Input label={t('web.settings.confessionModChannel')} value={config.confessionModChannelId || ''} onChange={e => update({ confessionModChannelId: e.target.value })} placeholder={t('common.channelId')} />
            )}
          </div>
        </Card>
      )}

      {/* Starboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Star size={20} /> {t('web.settings.starboard')}</CardTitle>
          <CardDescription>{t('web.settings.starboardDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.settings.starboardEnabled')} description={t('web.settings.starboardEnabledDesc')} checked={config.starboardEnabled ?? false} onChange={v => update({ starboardEnabled: v })} />
          {config.starboardEnabled && (
            <>
              <Input label={t('web.settings.starboardChannel')} value={config.starboardChannelId || ''} onChange={e => update({ starboardChannelId: e.target.value })} placeholder={t('common.channelId')} />
              <Slider label={t('web.settings.reactionThreshold')} value={config.starboardThreshold || 3} onChange={v => update({ starboardThreshold: Math.round(v) })} min={1} max={20} step={1} />
              <Input label={t('web.settings.emoji')} value={config.starboardEmoji || ''} onChange={e => update({ starboardEmoji: e.target.value })} placeholder={t('web.settings.emoji')} />
            </>
          )}
        </div>
      </Card>

      {/* Poll of the Day */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 size={20} /> {t('web.settings.pollOfTheDay')}</CardTitle>
          <CardDescription>{t('web.settings.pollOfTheDayDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.settings.pollOfTheDayEnabled')} description={t('web.settings.pollOfTheDayEnabledDesc')} checked={config.pollOfTheDayEnabled ?? false} onChange={v => update({ pollOfTheDayEnabled: v })} />
          {config.pollOfTheDayEnabled && (
            <>
              <Input label="Channel (ID)" value={config.pollOfTheDayChannelId || ''} onChange={e => update({ pollOfTheDayChannelId: e.target.value })} placeholder={t('common.channelId')} />
              <Input label={t('common.hour')} value={config.pollOfTheDayTime || '12:00'} onChange={e => update({ pollOfTheDayTime: e.target.value })} placeholder="12:00" />
            </>
          )}
        </div>
      </Card>

      {/* Auto-export Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 size={20} /> {t('web.settings.autoExportSuggestions')}</CardTitle>
          <CardDescription>{t('web.settings.autoExportSuggestionsDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.settings.autoExportEnabled')} description={t('web.settings.autoExportEnabledDesc')} checked={config.autoExportEnabled ?? false} onChange={v => update({ autoExportEnabled: v })} />
          {config.autoExportEnabled && (
            <>
              <Slider label={t('web.settings.voteThreshold')} value={config.autoExportThreshold || 5} onChange={v => update({ autoExportThreshold: v })} min={2} max={50} step={1} suffix=" votes" />
              <Input label={t('web.settings.platform')} value={config.autoExportPlatform || 'github'} onChange={e => update({ autoExportPlatform: e.target.value })} placeholder="github, trello, linear, jira" />
            </>
          )}
        </div>
      </Card>

      {/* GitHub Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Github size={20} /> {t('web.settings.githubIntegration')}</CardTitle>
          <CardDescription>{t('web.settings.githubDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.settings.githubEnabled')} checked={config.githubEnabled ?? false} onChange={v => update({ githubEnabled: v })} />
          {config.githubEnabled && (
            <>
              <Input label={t('web.settings.githubRepo')} value={config.githubRepo || ''} onChange={e => update({ githubRepo: e.target.value })} placeholder="username/repository" />
              <Input label={t('web.settings.githubToken')} type="password" value={config.githubToken || ''} onChange={e => update({ githubToken: e.target.value })} placeholder="ghp_..." />
            </>
          )}
        </div>
      </Card>

      {/* Trello Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trello size={20} /> {t('web.settings.trelloIntegration')}</CardTitle>
          <CardDescription>{t('web.settings.trelloDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.settings.trelloEnabled')} checked={config.trelloEnabled ?? false} onChange={v => update({ trelloEnabled: v })} />
          {config.trelloEnabled && (
            <>
              <Input label={t('web.settings.trelloToken')} type="password" value={config.trelloToken || ''} onChange={e => update({ trelloToken: e.target.value })} placeholder="apiKey:token" />
              <Input label={t('web.settings.trelloBoardId')} value={config.trelloBoardId || ''} onChange={e => update({ trelloBoardId: e.target.value })} placeholder="ID du board Trello" />
            </>
          )}
        </div>
      </Card>

      {/* Linear Integration */}
      <Card>
        <CardHeader>
          <CardTitle>{t('web.settings.linearIntegration')}</CardTitle>
          <CardDescription>{t('web.settings.linearDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.settings.linearEnabled')} checked={config.linearEnabled ?? false} onChange={v => update({ linearEnabled: v })} />
          {config.linearEnabled && (
            <>
              <Input label={t('web.settings.linearApiKey')} type="password" value={config.linearApiKey || ''} onChange={e => update({ linearApiKey: e.target.value })} placeholder="lin_api_..." />
              <Input label={t('web.settings.linearTeamId')} value={config.linearTeamId || ''} onChange={e => update({ linearTeamId: e.target.value })} placeholder="ID de l'équipe" />
            </>
          )}
        </div>
      </Card>

      {/* Jira Integration */}
      <Card>
        <CardHeader>
          <CardTitle>{t('web.settings.jiraIntegration')}</CardTitle>
          <CardDescription>{t('web.settings.jiraDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.settings.jiraEnabled')} checked={config.jiraEnabled ?? false} onChange={v => update({ jiraEnabled: v })} />
          {config.jiraEnabled && (
            <>
              <Input label={t('web.settings.jiraUrl')} value={config.jiraUrl || ''} onChange={e => update({ jiraUrl: e.target.value })} placeholder="https://votre-domaine.atlassian.net" />
              <Input label={t('web.settings.jiraEmail')} value={config.jiraEmail || ''} onChange={e => update({ jiraEmail: e.target.value })} placeholder="email@example.com" />
              <Input label={t('web.settings.jiraToken')} type="password" value={config.jiraToken || ''} onChange={e => update({ jiraToken: e.target.value })} placeholder="Token API" />
              <Input label={t('web.settings.jiraProject')} value={config.jiraProject || ''} onChange={e => update({ jiraProject: e.target.value })} placeholder="PROJ" />
            </>
          )}
        </div>
      </Card>

      {/* Event Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Calendar size={20} /> {t('web.settings.eventTemplates')}</CardTitle>
              <CardDescription>{t('web.settings.eventTemplatesDesc')}</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowTemplateModal(true)}><Plus size={16} /> {t('common.create')}</Button>
          </div>
        </CardHeader>
        <div className="space-y-2">
          {templates.map(tp => (
            <div key={tp.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]">
              <div>
                <p className="text-sm font-medium">{tp.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">{tp.description || t('common.noDescription')} {tp.duration ? `• ${tp.duration}min` : ''}</p>
              </div>
              <button onClick={() => deleteTemplate(tp.id)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
                <Trash2 size={14} className="text-[var(--danger)]" />
              </button>
            </div>
          ))}
          {templates.length === 0 && <p className="text-sm text-[var(--text-secondary)]">{t('web.settings.noTemplates')}</p>}
        </div>
      </Card>

      {/* Onboarding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus size={20} /> {t('web.settings.onboarding')}</CardTitle>
          <CardDescription>{t('web.settings.onboardingDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-5">
          <Toggle label={t('web.settings.onboardingEnabled')} checked={onboarding.enabled ?? false} onChange={v => updateOnboarding({ enabled: v })} />
          <Toggle label={t('web.settings.welcomeDm')} description={t('web.settings.welcomeDmDesc')} checked={onboarding.welcomeDmEnabled ?? false} onChange={v => updateOnboarding({ welcomeDmEnabled: v })} />
          {onboarding.welcomeDmEnabled && (
            <Textarea
              label={t('web.settings.welcomeDmMessage')}
              value={onboarding.welcomeDmMessage || ''}
              onChange={e => updateOnboarding({ welcomeDmMessage: e.target.value })}
              placeholder={t('web.settings.welcomeMessagePlaceholder')}
            />
          )}
          <Toggle label={t('web.settings.interestRoles')} description={t('web.settings.interestRolesDesc')} checked={onboarding.interestBasedRoles ?? false} onChange={v => updateOnboarding({ interestBasedRoles: v })} />
          <Toggle label={t('web.settings.autoFollowUp')} description={t('web.settings.autoFollowUpDesc')} checked={onboarding.followUpEnabled ?? false} onChange={v => updateOnboarding({ followUpEnabled: v })} />
          {onboarding.followUpEnabled && (
            <>
              <Slider label={t('web.settings.followUpDelay')} value={onboarding.followUpDelay || 24} onChange={v => updateOnboarding({ followUpDelay: Math.round(v) })} min={1} max={72} suffix="h" />
              <Textarea
                label={t('web.settings.followUpMessage')}
                value={onboarding.followUpMessage || ''}
                onChange={e => updateOnboarding({ followUpMessage: e.target.value })}
                placeholder={t('web.settings.welcomeMessagePlaceholder')}
              />
            </>
          )}
        </div>
      </Card>

      <Card className="border-[var(--danger)]/30">
        <CardHeader>
          <CardTitle className="text-[var(--danger)] flex items-center gap-2">
            <AlertTriangle size={20} /> {t('web.settings.dangerZone')}
          </CardTitle>
          <CardDescription>{t('web.settings.dangerZoneDesc')}</CardDescription>
        </CardHeader>
        <div className="space-y-3">
          <Button variant="danger" size="sm">{t('web.settings.resetConfig')}</Button>
          <p className="text-xs text-[var(--text-secondary)]">{t('web.settings.resetConfigDesc')}</p>
        </div>
      </Card>

      {/* Template creation modal */}
      <Modal open={showTemplateModal} onClose={() => setShowTemplateModal(false)} title={t('web.settings.createEventTemplate')}>
        <div className="space-y-4">
          <Input label={t('common.name')} value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} />
          <Textarea label={t('common.description')} value={templateForm.description} onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })} />
          <Input label={t('web.settings.duration')} type="number" value={templateForm.duration} onChange={e => setTemplateForm({ ...templateForm, duration: e.target.value })} placeholder="60" />
          <Button onClick={createTemplate} className="w-full"><Save size={16} /> {t('common.create')}</Button>
        </div>
      </Modal>
    </div>
  );
}
