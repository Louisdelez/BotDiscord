import { useState } from 'react';
import {
  Eye, Play, Heart, Share2, Hash, Volume2, Bell, ChevronRight, Users, X,
  Gamepad2, GraduationCap, Rocket, Palette, Shield, Brush, Star, Cake,
  User, Rainbow, HeartHandshake, Globe, Monitor, Languages, Sparkles,
  Paintbrush, BellRing, MessageCircle, ClipboardList, Lock, HelpCircle,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input, Textarea } from './ui/Input';
import { useT } from '../lib/i18n';

const channelIcons = {
  text: Hash,
  voice: Volume2,
  announcement: Bell,
};

const iconMap = {
  Gamepad2, Users, GraduationCap, Rocket, Palette, Shield, Brush, Star,
  Cake, User, Rainbow, HeartHandshake, Heart, Globe, Monitor, Languages,
  Sparkles, Paintbrush, BellRing, MessageCircle, Volume2, ClipboardList, Lock,
};

function LucideIcon({ name, size = 20, className = '' }) {
  const Icon = iconMap[name] || HelpCircle;
  return <Icon size={size} className={className} />;
}

function TemplatePreviewModal({ template, open, onClose, onApply, t }) {
  if (!template) return null;

  return (
    <Modal open={open} onClose={onClose} title={template.name} className="max-w-2xl">
      <p className="text-sm text-[var(--text-secondary)] mb-4">{template.description}</p>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Roles */}
        <div>
          <h4 className="text-sm font-semibold mb-2">{t('web.serverSetupTemplates.rolesCount', { count: template.roles?.length || 0 })}</h4>
          <div className="flex flex-wrap gap-2">
            {template.roles?.map((role, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)]">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color || '#95A5A6' }} />
                <span className="text-sm font-medium">{role.name}</span>
                {role.permissions?.length > 0 && (
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {role.permissions.join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Categories & Channels tree */}
        <div>
          <h4 className="text-sm font-semibold mb-2">{t('web.serverSetupCustom.channels')}</h4>
          <div className="space-y-3">
            {template.categories?.map((cat, ci) => (
              <div key={ci} className="rounded-xl bg-[var(--bg-secondary)] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ChevronRight size={14} className="text-[var(--text-secondary)]" />
                  <span className="text-sm font-semibold">{cat.name}</span>
                </div>
                <div className="ml-5 space-y-1">
                  {cat.channels?.map((ch, chi) => {
                    const Icon = channelIcons[ch.type] || Hash;
                    return (
                      <div key={chi} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Icon size={14} />
                        <span>{ch.name}</span>
                        {ch.readOnly && <Badge variant="info">{t('web.serverSetupTemplates.readOnly')}</Badge>}
                        {ch.private && <Badge variant="warning">{t('web.serverSetupTemplates.private')}</Badge>}
                        {ch.restrictedTo && <Badge variant="default">{t('web.serverSetupTemplates.restricted')}</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--border)]">
        <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
        <Button variant="primary" onClick={() => { onApply(); onClose(); }}>
          <Play size={14} /> {t('web.serverSetupTemplates.apply')}
        </Button>
      </div>
    </Modal>
  );
}

function ShareTemplateModal({ open, onClose, onShare, t }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const handleSubmit = () => {
    onShare({
      name,
      description,
      tags: tags.split(',').map(s => s.trim()).filter(Boolean),
      isPublic,
    });
    setName('');
    setDescription('');
    setTags('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('web.serverSetupTemplates.shareTitle')} className="max-w-lg">
      <div className="space-y-4">
        <Input label={t('web.serverSetupTemplates.templateName')} value={name} onChange={e => setName(e.target.value)} placeholder={t('web.serverSetupTemplates.templateNamePlaceholder')} />
        <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('web.serverSetupTemplates.descriptionPlaceholder')} rows={3} />
        <Input label={t('web.serverSetupTemplates.tagsLabel')} value={tags} onChange={e => setTags(e.target.value)} placeholder={t('web.serverSetupTemplates.tagsPlaceholder')} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded" />
          <span className="text-sm">{t('web.serverSetupTemplates.makePublic')}</span>
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--border)]">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!name.trim()}>{t('common.share')}</Button>
      </div>
    </Modal>
  );
}

export function ServerSetupTemplates({ templates, communityTemplates, onApply, onLike, onShare, userId }) {
  const t = useT();
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  const handleApply = (source, template) => {
    if (confirmId === template.id) {
      onApply({ source, templateId: source === 'template' ? template.id : undefined, communityTemplateId: source === 'community' ? template.id : undefined });
      setConfirmId(null);
    } else {
      setConfirmId(template.id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Predefined Templates */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('web.serverSetupTemplates.predefined')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(tmpl => (
            <Card key={tmpl.id} className="hover:border-[var(--accent)]/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                  <LucideIcon name={tmpl.icon} size={24} className="text-[var(--accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold">{tmpl.name}</h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">{tmpl.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tmpl.tags?.map(tag => <Badge key={tag} variant="info">{tag}</Badge>)}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">
                    <Users size={12} className="inline mr-1" />
                    {tmpl.roleCount} {t('web.serverSetupCustom.roles')} · {tmpl.channelCount} {t('web.serverSetupCustom.channels')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" size="sm" onClick={() => handlePreview(tmpl)}>
                  <Eye size={14} /> {t('web.serverSetupTemplates.preview')}
                </Button>
                <Button
                  variant={confirmId === tmpl.id ? 'danger' : 'primary'}
                  size="sm"
                  onClick={() => handleApply('template', tmpl)}
                >
                  <Play size={14} /> {confirmId === tmpl.id ? t('web.serverSetupTemplates.confirm') : t('web.serverSetupTemplates.apply')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Community Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('web.serverSetupTemplates.community')}</h3>
          <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 size={14} /> {t('web.serverSetupTemplates.shareConfig')}
          </Button>
        </div>

        {communityTemplates.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">{t('web.serverSetupTemplates.noCommunity')}</p>
        ) : (
          <div className="space-y-3">
            {communityTemplates.map(tmpl => {
              const roles = Array.isArray(tmpl.roles) ? tmpl.roles : [];
              const categories = Array.isArray(tmpl.categories) ? tmpl.categories : [];
              const channelCount = categories.reduce((sum, c) => sum + (c.channels?.length || 0), 0);
              const liked = tmpl.likes?.includes(userId);

              return (
                <Card key={tmpl.id}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                      <LucideIcon name={tmpl.icon} size={20} className="text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{tmpl.name}</h4>
                        <span className="text-xs text-[var(--text-secondary)]">{t('web.serverSetupTemplates.by', { author: tmpl.authorName })}</span>
                      </div>
                      {tmpl.description && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{tmpl.description}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tmpl.tags?.map(tag => <Badge key={tag} variant="info">{tag}</Badge>)}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                        <span>{roles.length} {t('web.serverSetupCustom.roles')} · {channelCount} {t('web.serverSetupCustom.channels')}</span>
                        <span>{t('web.serverSetupTemplates.uses', { count: tmpl.uses || 0 })}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => onLike(tmpl.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-colors cursor-pointer ${
                          liked ? 'text-red-500 bg-red-500/10' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
                        {tmpl.likes?.length || 0}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="secondary" size="sm" onClick={() => handlePreview({ ...tmpl, roles, categories })}>
                      <Eye size={14} /> {t('web.serverSetupTemplates.preview')}
                    </Button>
                    <Button
                      variant={confirmId === tmpl.id ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => handleApply('community', tmpl)}
                    >
                      <Play size={14} /> {confirmId === tmpl.id ? t('web.serverSetupTemplates.confirm') : t('web.serverSetupTemplates.apply')}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <TemplatePreviewModal
        template={previewTemplate}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onApply={() => onApply({
          source: previewTemplate?.id?.startsWith?.('cl') ? 'community' : 'template',
          templateId: previewTemplate?.id,
          communityTemplateId: previewTemplate?.id?.startsWith?.('cl') ? previewTemplate?.id : undefined,
        })}
        t={t}
      />

      <ShareTemplateModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onShare={onShare}
        t={t}
      />
    </div>
  );
}
