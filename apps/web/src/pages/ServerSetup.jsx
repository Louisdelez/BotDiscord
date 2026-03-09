import { useEffect, useState, useCallback } from 'react';
import { LayoutTemplate, Wrench, BookMarked, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useGuildStore } from '../stores/guild';
import { useAuthStore } from '../stores/auth';
import { api } from '../lib/api';
import { ws } from '../lib/websocket';
import { ServerSetupTemplates } from '../components/ServerSetupTemplates';
import { ServerSetupCustom } from '../components/ServerSetupCustom';
import { useT } from '../lib/i18n';

export function ServerSetup() {
  const t = useT();
  const { currentGuild } = useGuildStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('templates');

  const tabs = [
    { id: 'templates', label: t('web.serverSetup.templates'), icon: LayoutTemplate },
    { id: 'custom', label: t('web.serverSetup.custom'), icon: Wrench },
    { id: 'my-templates', label: t('web.serverSetup.myTemplates'), icon: BookMarked },
  ];

  // Data
  const [templates, setTemplates] = useState([]);
  const [communityTemplates, setCommunityTemplates] = useState([]);
  const [myTemplates, setMyTemplates] = useState([]);
  const [presets, setPresets] = useState({ roles: [], channels: [] });

  // Apply status
  const [applyStatus, setApplyStatus] = useState(null);
  const [progressLog, setProgressLog] = useState([]);

  // Fetch data
  useEffect(() => {
    if (!currentGuild) return;
    api.get(`/guilds/${currentGuild.id}/setup/templates`).then(d => setTemplates(Array.isArray(d) ? d : [])).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/setup/community`).then(data => {
      const arr = Array.isArray(data) ? data : [];
      setCommunityTemplates(arr);
      if (user) {
        setMyTemplates(arr.filter(t => t.authorId === user.discordId));
      }
    }).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/setup/presets`).then(setPresets).catch(() => {});
  }, [currentGuild, user]);

  // Fetch full template details for preview
  const fetchFullTemplate = async (templateId) => {
    try {
      return await api.get(`/guilds/${currentGuild.id}/setup/templates/${templateId}`);
    } catch {
      return null;
    }
  };

  // Enrich templates with full data when they load
  useEffect(() => {
    if (templates.length === 0) return;
    Promise.all(templates.map(t => fetchFullTemplate(t.id))).then(full => {
      setTemplates(full.filter(Boolean));
    });
  }, [templates.length]);

  // WebSocket listener for progress
  useEffect(() => {
    ws.connect();
    if (currentGuild) ws.subscribeGuild(currentGuild.id);

    const handleProgress = (data) => {
      if (data.type !== 'setup:progress') return;
      if (applyStatus && data.requestId !== applyStatus.requestId) return;

      setApplyStatus(prev => ({
        ...prev,
        requestId: data.requestId,
        status: data.status,
        done: data.done,
        total: data.total,
      }));

      if (data.message) {
        setProgressLog(prev => [...prev, data.message]);
      }

      if (data.status === 'completed' || data.status === 'error') {
        setTimeout(() => {
          if (data.status === 'completed') {
            // Refresh community templates
            api.get(`/guilds/${currentGuild.id}/setup/community`).then(setCommunityTemplates).catch(() => {});
          }
        }, 2000);
      }
    };

    const unsub = ws.subscribe('setup:progress', handleProgress);
    return unsub;
  }, [currentGuild, applyStatus?.requestId]);

  // Apply handler
  const handleApply = async (config) => {
    setProgressLog([]);
    setApplyStatus({ status: 'pending' });

    try {
      const result = await api.post(`/guilds/${currentGuild.id}/setup/apply`, config);
      setApplyStatus({ requestId: result.requestId, status: 'pending', done: 0, total: 0 });
    } catch (err) {
      setApplyStatus({ status: 'error', message: err.message });
    }
  };

  // Like handler
  const handleLike = async (templateId) => {
    try {
      const updated = await api.post(`/guilds/${currentGuild.id}/setup/community/${templateId}/like`);
      setCommunityTemplates(prev => prev.map(t => t.id === templateId ? updated : t));
    } catch {}
  };

  // Share handler
  const handleShare = async (data) => {
    try {
      const template = await api.post(`/guilds/${currentGuild.id}/setup/community`, data);
      setCommunityTemplates(prev => [template, ...prev]);
      setMyTemplates(prev => [template, ...prev]);
    } catch {}
  };

  // Delete own template
  const handleDeleteTemplate = async (id) => {
    try {
      await api.delete(`/guilds/${currentGuild.id}/setup/community/${id}`);
      setCommunityTemplates(prev => prev.filter(t => t.id !== id));
      setMyTemplates(prev => prev.filter(t => t.id !== id));
    } catch {}
  };

  if (!currentGuild) return <p className="text-[var(--text-secondary)]">{t('common.selectServer')}</p>;

  const isApplying = applyStatus && ['pending', 'started', 'progress'].includes(applyStatus.status);
  const progressPct = applyStatus?.total > 0 ? Math.round((applyStatus.done / applyStatus.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <LayoutTemplate size={28} /> {t('web.serverSetup.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">{t('web.serverSetup.subtitle')}</p>
      </div>

      {/* Progress bar */}
      {applyStatus && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {applyStatus.status === 'completed' ? (
                <CheckCircle size={20} className="text-green-500" />
              ) : applyStatus.status === 'error' ? (
                <AlertCircle size={20} className="text-[var(--danger)]" />
              ) : (
                <Loader2 size={20} className="text-[var(--accent)] animate-spin" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    {applyStatus.status === 'completed' ? t('web.serverSetup.completed') :
                     applyStatus.status === 'error' ? t('web.serverSetup.error') :
                     t('web.serverSetup.inProgress')}
                  </span>
                  {applyStatus.total > 0 && (
                    <span className="text-xs text-[var(--text-secondary)]">{applyStatus.done}/{applyStatus.total}</span>
                  )}
                </div>
                {applyStatus.total > 0 && (
                  <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        applyStatus.status === 'error' ? 'bg-[var(--danger)]' :
                        applyStatus.status === 'completed' ? 'bg-green-500' :
                        'bg-[var(--accent)]'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Log */}
            {progressLog.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-xs font-mono space-y-0.5">
                {progressLog.map((msg, i) => (
                  <div key={i} className="text-[var(--text-secondary)]">{msg}</div>
                ))}
              </div>
            )}

            {(applyStatus.status === 'completed' || applyStatus.status === 'error') && (
              <button
                onClick={() => { setApplyStatus(null); setProgressLog([]); }}
                className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
              >
                {t('common.close')}
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Tabs */}
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
            disabled={isApplying}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates tab */}
      {activeTab === 'templates' && (
        <ServerSetupTemplates
          templates={templates}
          communityTemplates={communityTemplates}
          onApply={handleApply}
          onLike={handleLike}
          onShare={handleShare}
          userId={user?.discordId}
        />
      )}

      {/* Custom tab */}
      {activeTab === 'custom' && (
        <ServerSetupCustom
          presets={presets}
          onApply={handleApply}
        />
      )}

      {/* My templates tab */}
      {activeTab === 'my-templates' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('web.serverSetup.savedTemplates')}</h3>
          {myTemplates.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--text-secondary)] text-center py-8">
                {t('web.serverSetup.noSavedTemplates')}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {myTemplates.map(tmpl => {
                const roles = Array.isArray(tmpl.roles) ? tmpl.roles : [];
                const categories = Array.isArray(tmpl.categories) ? tmpl.categories : [];
                const channelCount = categories.reduce((sum, c) => sum + (c.channels?.length || 0), 0);

                return (
                  <Card key={tmpl.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tmpl.icon}</span>
                        <div>
                          <h4 className="font-semibold">{tmpl.name}</h4>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {roles.length} {t('web.serverSetup.roles')} · {channelCount} {t('web.serverSetup.channels')} · {tmpl.uses || 0} {t('web.serverSetup.uses')} · {tmpl.likes?.length || 0} likes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {tmpl.isPublic ? (
                          <span className="text-xs text-green-500">{t('common.public')}</span>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]">{t('common.private')}</span>
                        )}
                        <button
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer"
                        >
                          <span className="text-xs text-[var(--danger)]">{t('common.delete')}</span>
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
