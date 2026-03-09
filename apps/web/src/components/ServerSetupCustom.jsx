import { useState } from 'react';
import { useT } from '../lib/i18n';
import {
  Plus, Trash2, Play, Hash, Volume2, Bell,
  Gamepad2, Users, GraduationCap, Rocket, Palette, Shield, Brush, Star,
  Cake, User, Rainbow, HeartHandshake, Heart, Globe, Monitor, Languages,
  Sparkles, Paintbrush, BellRing, MessageCircle, ClipboardList, Lock, HelpCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

const iconMap = {
  Gamepad2, Users, GraduationCap, Rocket, Palette, Shield, Brush, Star,
  Cake, User, Rainbow, HeartHandshake, Heart, Globe, Monitor, Languages,
  Sparkles, Paintbrush, BellRing, MessageCircle, Volume2, ClipboardList, Lock,
};

const PERMISSION_OPTIONS = [
  'Administrator',
  'ManageMessages',
  'KickMembers',
  'BanMembers',
  'ManageChannels',
  'ViewAuditLog',
];

const CHANNEL_TYPES = [
  { value: 'text', key: 'web.serverSetupCustom.channelText' },
  { value: 'voice', key: 'web.serverSetupCustom.channelVoice' },
  { value: 'announcement', key: 'web.serverSetupCustom.channelAnnouncement' },
];

function RoleEditor({ role, onChange, onDelete, t }) {
  const togglePerm = (perm) => {
    const perms = role.permissions || [];
    onChange({
      ...role,
      permissions: perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm],
    });
  };

  return (
    <div className="p-4 rounded-xl bg-[var(--bg-secondary)] space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={role.color || '#95A5A6'}
          onChange={e => onChange({ ...role, color: e.target.value })}
          className="w-8 h-8 rounded-lg border border-[var(--border)] cursor-pointer"
        />
        <input
          type="text"
          value={role.name}
          onChange={e => onChange({ ...role, name: e.target.value })}
          placeholder={t('web.serverSetupCustom.roleName')}
          className="flex-1 bg-transparent border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none"
        />
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
          <Trash2 size={14} className="text-[var(--danger)]" />
        </button>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={role.hoist || false} onChange={e => onChange({ ...role, hoist: e.target.checked })} />
          Hoist
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={role.mentionable || false} onChange={e => onChange({ ...role, mentionable: e.target.checked })} />
          {t('common.mentionable')}
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PERMISSION_OPTIONS.map(perm => (
          <button
            key={perm}
            onClick={() => togglePerm(perm)}
            className={`px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
              (role.permissions || []).includes(perm)
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {perm}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChannelEditor({ channel, onChange, onDelete, t }) {
  const channelIcons = { text: Hash, voice: Volume2, announcement: Bell };
  const Icon = channelIcons[channel.type] || Hash;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)]">
      <Icon size={14} className="text-[var(--text-secondary)] shrink-0" />
      <input
        type="text"
        value={channel.name}
        onChange={e => onChange({ ...channel, name: e.target.value })}
        placeholder={t('web.serverSetupCustom.channelName')}
        className="flex-1 bg-transparent text-sm outline-none"
      />
      <select
        value={channel.type}
        onChange={e => onChange({ ...channel, type: e.target.value })}
        className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs outline-none"
      >
        {CHANNEL_TYPES.map(ct => <option key={ct.value} value={ct.value}>{t(ct.key)}</option>)}
      </select>
      <input
        type="text"
        value={channel.topic || ''}
        onChange={e => onChange({ ...channel, topic: e.target.value })}
        placeholder={t('web.serverSetupCustom.topicPlaceholder')}
        className="w-32 bg-transparent border border-[var(--border)] rounded-lg px-2 py-1 text-xs outline-none"
      />
      <button onClick={onDelete} className="p-1 rounded hover:bg-[var(--bg-secondary)] cursor-pointer">
        <Trash2 size={12} className="text-[var(--danger)]" />
      </button>
    </div>
  );
}

function CategoryEditor({ category, onChange, onDelete, t }) {
  const updateChannel = (index, updated) => {
    const channels = [...category.channels];
    channels[index] = updated;
    onChange({ ...category, channels });
  };

  const addChannel = () => {
    onChange({ ...category, channels: [...category.channels, { name: '', type: 'text' }] });
  };

  const deleteChannel = (index) => {
    onChange({ ...category, channels: category.channels.filter((_, i) => i !== index) });
  };

  return (
    <div className="p-4 rounded-xl bg-[var(--bg-secondary)] space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={category.name}
          onChange={e => onChange({ ...category, name: e.target.value })}
          placeholder={t('web.serverSetupCustom.categoryName')}
          className="flex-1 bg-transparent border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-semibold focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none"
        />
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
          <Trash2 size={14} className="text-[var(--danger)]" />
        </button>
      </div>

      <div className="space-y-2">
        {category.channels.map((ch, i) => (
          <ChannelEditor
            key={i}
            channel={ch}
            onChange={updated => updateChannel(i, updated)}
            onDelete={() => deleteChannel(i)}
            t={t}
          />
        ))}
      </div>

      <button
        onClick={addChannel}
        className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline cursor-pointer"
      >
        <Plus size={12} /> {t('web.serverSetupCustom.addChannel')}
      </button>
    </div>
  );
}

export function ServerSetupCustom({ presets, onApply }) {
  const t = useT();
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [confirmApply, setConfirmApply] = useState(false);

  const addRole = () => {
    setRoles([...roles, { name: '', color: '#95A5A6', hoist: false, mentionable: false, permissions: [] }]);
  };

  const updateRole = (index, updated) => {
    const newRoles = [...roles];
    newRoles[index] = updated;
    setRoles(newRoles);
  };

  const deleteRole = (index) => {
    setRoles(roles.filter((_, i) => i !== index));
  };

  const addCategory = () => {
    setCategories([...categories, { name: '', channels: [] }]);
  };

  const updateCategory = (index, updated) => {
    const newCats = [...categories];
    newCats[index] = updated;
    setCategories(newCats);
  };

  const deleteCategory = (index) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const addPresetRoles = (preset) => {
    setRoles([...roles, ...preset.items.map(item => ({ ...item, key: item.name }))]);
  };

  const addPresetChannels = (preset) => {
    setCategories([...categories, { name: preset.name, channels: [...preset.items] }]);
  };

  const handleApply = () => {
    if (confirmApply) {
      onApply({ source: 'custom', roles, categories });
      setConfirmApply(false);
    } else {
      setConfirmApply(true);
      setTimeout(() => setConfirmApply(false), 3000);
    }
  };

  const totalChannels = categories.reduce((sum, c) => sum + c.channels.length, 0);

  return (
    <div className="space-y-6">
      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle>{t('web.serverSetupCustom.quickPresets')}</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">{t('web.serverSetupCustom.roles')}</h4>
            <div className="flex flex-wrap gap-2">
              {presets?.roles?.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => addPresetRoles(preset)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-sm transition-colors cursor-pointer"
                >
                  {(() => { const I = iconMap[preset.icon] || HelpCircle; return <I size={14} />; })()} {preset.name}
                  <Badge variant="default">{preset.items.length}</Badge>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">{t('web.serverSetupCustom.channels')}</h4>
            <div className="flex flex-wrap gap-2">
              {presets?.channels?.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => addPresetChannels(preset)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-sm transition-colors cursor-pointer"
                >
                  {(() => { const I = iconMap[preset.icon] || HelpCircle; return <I size={14} />; })()} {preset.name}
                  <Badge variant="default">{preset.items.length}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Roles Builder */}
      <Card>
        <CardHeader>
          <CardTitle>{t('web.serverSetupCustom.rolesCount', { count: roles.length })}</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {roles.map((role, i) => (
            <RoleEditor
              key={i}
              role={role}
              onChange={updated => updateRole(i, updated)}
              onDelete={() => deleteRole(i)}
              t={t}
            />
          ))}
          <button
            onClick={addRole}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors w-full justify-center cursor-pointer"
          >
            <Plus size={14} /> {t('web.serverSetupCustom.addRole')}
          </button>
        </div>
      </Card>

      {/* Channels Builder */}
      <Card>
        <CardHeader>
          <CardTitle>{t('web.serverSetupCustom.categoriesTitle', { catCount: categories.length, chCount: totalChannels })}</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {categories.map((cat, i) => (
            <CategoryEditor
              key={i}
              category={cat}
              onChange={updated => updateCategory(i, updated)}
              onDelete={() => deleteCategory(i)}
              t={t}
            />
          ))}
          <button
            onClick={addCategory}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors w-full justify-center cursor-pointer"
          >
            <Plus size={14} /> {t('web.serverSetupCustom.addCategory')}
          </button>
        </div>
      </Card>

      {/* Apply */}
      {(roles.length > 0 || categories.length > 0) && (
        <div className="flex justify-end">
          <Button
            variant={confirmApply ? 'danger' : 'primary'}
            onClick={handleApply}
          >
            <Play size={16} /> {confirmApply ? t('web.serverSetupCustom.confirmApply') : t('web.serverSetupCustom.applyCustom', { roleCount: roles.length, chCount: totalChannels })}
          </Button>
        </div>
      )}
    </div>
  );
}
