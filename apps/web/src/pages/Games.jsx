import { useEffect, useState } from 'react';
import { Gamepad2, Swords, PawPrint, HelpCircle, ScrollText, Award, Plus, Pencil, Trash2, Save, Bug, Cat, Dog, Egg, Bird, Rabbit, Wand2, Crosshair, Heart, Smile, Zap, Coins, Shield, Brain, Trophy, PenTool, CircleDot } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, TableHeader, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useGuildStore } from '../stores/guild';
import { api } from '../lib/api';
import { useT } from '../lib/i18n';

const SPECIES_ICON = { cat: Cat, dog: Dog, dragon: Egg, phoenix: Bird, wolf: CircleDot, rabbit: Rabbit };
const CLASS_ICON = { warrior: Swords, mage: Wand2, rogue: Crosshair, healer: Heart };
const CLASS_NAME_KEYS = { warrior: 'web.games.classWarrior', mage: 'web.games.classMage', rogue: 'web.games.classRogue', healer: 'web.games.classHealer' };
const RARITY_COLORS = { common: 'bg-gray-500/10 text-gray-500', uncommon: 'bg-green-500/10 text-green-500', rare: 'bg-blue-500/10 text-blue-500', epic: 'bg-purple-500/10 text-purple-500', legendary: 'bg-yellow-500/10 text-yellow-500' };

export function Games() {
  const { currentGuild } = useGuildStore();
  const t = useT();
  const [pets, setPets] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [badges, setBadges] = useState([]);
  const [creatures, setCreatures] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [tab, setTab] = useState('pets');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeForm, setBadgeForm] = useState({ name: '', description: '', icon: 'Award', condition: '', threshold: 1 });

  useEffect(() => {
    if (!currentGuild) return;
    api.get(`/guilds/${currentGuild.id}/games/pets`).then(d => setPets(Array.isArray(d) ? d : [])).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/games/rpg`).then(d => setCharacters(Array.isArray(d) ? d : [])).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/badges`).then(d => setBadges(Array.isArray(d) ? d : [])).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/creatures`).then(d => setCreatures(Array.isArray(d) ? d : [])).catch(() => {});
    api.get(`/guilds/${currentGuild.id}/creatures/collection`).then(d => setCollectors(Array.isArray(d) ? d : [])).catch(() => {});
  }, [currentGuild]);

  const createBadge = async () => {
    const badge = await api.post(`/guilds/${currentGuild.id}/badges`, {
      ...badgeForm,
      threshold: Number(badgeForm.threshold),
    });
    setBadges([...badges, badge]);
    setShowBadgeModal(false);
    setBadgeForm({ name: '', description: '', icon: 'Award', condition: '', threshold: 1 });
  };

  const deleteBadge = async (id) => {
    await api.delete(`/guilds/${currentGuild.id}/badges/${id}`);
    setBadges(badges.filter(b => b.id !== id));
  };

  if (!currentGuild) return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Gamepad2 size={28} /> {t('web.games.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">{t('web.games.subtitle')}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'pets', label: t('web.games.pets'), icon: PawPrint },
          { key: 'rpg', label: t('web.games.rpg'), icon: Swords },
          { key: 'badges', label: t('web.games.badges'), icon: Award },
          { key: 'creatures', label: t('web.games.creatures'), icon: Bug },
        ].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === tb.key ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
            <tb.icon size={14} /> {tb.label}
          </button>
        ))}
      </div>
      <p className="text-[var(--text-secondary)]">{t('common.selectServer')}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Gamepad2 size={28} /> {t('web.games.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">{t('web.games.subtitle')}</p>
      </div>

      {/* Stats cards */}
      {currentGuild && (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10"><PawPrint size={20} className="text-orange-500" /></div>
            <div>
              <p className="text-xl font-bold">{pets.length}</p>
              <p className="text-xs text-[var(--text-secondary)]">{t('web.games.pets')}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10"><Swords size={20} className="text-purple-500" /></div>
            <div>
              <p className="text-xl font-bold">{characters.length}</p>
              <p className="text-xs text-[var(--text-secondary)]">{t('web.games.rpgCharacters')}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/10"><Award size={20} className="text-yellow-500" /></div>
            <div>
              <p className="text-xl font-bold">{badges.length}</p>
              <p className="text-xs text-[var(--text-secondary)]">{t('web.games.badges')}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10"><Bug size={20} className="text-green-500" /></div>
            <div>
              <p className="text-xl font-bold">{creatures.length}</p>
              <p className="text-xs text-[var(--text-secondary)]">{t('web.games.creatures')}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10"><HelpCircle size={20} className="text-blue-500" /></div>
            <div>
              <p className="text-xl font-bold">6</p>
              <p className="text-xs text-[var(--text-secondary)]">{t('web.games.quizCategories')}</p>
            </div>
          </div>
        </Card>
      </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'pets', label: t('web.games.pets'), icon: PawPrint },
          { key: 'rpg', label: t('web.games.rpg'), icon: Swords },
          { key: 'badges', label: t('web.games.badges'), icon: Award },
          { key: 'creatures', label: t('web.games.creatures'), icon: Bug },
        ].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === tb.key ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
            <tb.icon size={14} /> {tb.label}
          </button>
        ))}
      </div>

      {tab === 'pets' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PawPrint size={20} /> {t('web.games.petRanking')}</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t('web.games.animal')}</TableHead>
                <TableHead>{t('web.games.owner')}</TableHead>
                <TableHead>{t('common.level')}</TableHead>
                <TableHead>{t('web.games.wd')}</TableHead>
                <TableHead>{t('web.games.statsCol')}</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {pets.map((pet, i) => (
                <TableRow key={pet.id}>
                  <TableCell className="font-bold">{i + 1}</TableCell>
                  <TableCell className="flex items-center gap-1.5">{(() => { const I = SPECIES_ICON[pet.species] || HelpCircle; return <I size={14} />; })()} {pet.name}</TableCell>
                  <TableCell>{pet.member?.user?.username || '—'}</TableCell>
                  <TableCell><Badge>{pet.level}</Badge></TableCell>
                  <TableCell className="text-sm">{pet.wins}W / {pet.losses}L</TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)] flex items-center gap-2"><Heart size={10} className="text-red-500" />{pet.hunger} <Smile size={10} className="text-yellow-500" />{pet.happiness} <Zap size={10} className="text-blue-500" />{pet.energy}</TableCell>
                </TableRow>
              ))}
              {pets.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-[var(--text-secondary)] py-8">{t('web.games.noPets')}</TableCell></TableRow>
              )}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'rpg' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Swords size={20} /> {t('web.games.rpgRanking')}</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t('web.games.character')}</TableHead>
                <TableHead>{t('web.games.player')}</TableHead>
                <TableHead>{t('web.games.class')}</TableHead>
                <TableHead>{t('common.level')}</TableHead>
                <TableHead>{t('web.games.gold')}</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {characters.map((char, i) => (
                <TableRow key={char.id}>
                  <TableCell className="font-bold">{i + 1}</TableCell>
                  <TableCell className="flex items-center gap-1.5">{(() => { const I = CLASS_ICON[char.className] || HelpCircle; return <I size={14} />; })()} {char.name}</TableCell>
                  <TableCell>{char.member?.user?.username || '—'}</TableCell>
                  <TableCell><Badge variant="info">{t(CLASS_NAME_KEYS[char.className])}</Badge></TableCell>
                  <TableCell><Badge>{char.level}</Badge></TableCell>
                  <TableCell className="text-yellow-500 font-medium flex items-center gap-1">{char.gold} <Coins size={14} /></TableCell>
                </TableRow>
              ))}
              {characters.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-[var(--text-secondary)] py-8">{t('web.games.noCharacters')}</TableCell></TableRow>
              )}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'badges' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Award size={20} /> {t('web.games.badgeManagement')}</CardTitle>
                <CardDescription>{t('web.games.badgeManagementDesc')}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowBadgeModal(true)}><Plus size={16} /> {t('common.create')}</Button>
            </div>
          </CardHeader>
          <div className="space-y-2">
            {badges.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-3">
                  <Award size={20} className="text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{b.description} — {b._count?.awards || 0} {t('web.games.awarded')}</p>
                  </div>
                </div>
                <button onClick={() => deleteBadge(b.id)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
                  <Trash2 size={16} className="text-[var(--danger)]" />
                </button>
              </div>
            ))}
            {badges.length === 0 && <p className="text-sm text-[var(--text-secondary)]">{t('web.games.noBadges')}</p>}
          </div>
        </Card>
      )}

      {tab === 'creatures' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bug size={20} /> {t('web.games.creaturesByRarity')}</CardTitle>
              <CardDescription>{t('web.games.creaturesAvailable')}</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {creatures.map(c => (
                <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl ${RARITY_COLORS[c.rarity] || 'bg-[var(--bg-secondary)]'}`}>
                  <Bug size={18} />
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs opacity-75 flex items-center gap-1">{c.rarity} | {c.element} | <Heart size={10} />{c.baseHp} <Swords size={10} />{c.baseAtk} <Shield size={10} />{c.baseDef}</p>
                  </div>
                </div>
              ))}
              {creatures.length === 0 && <p className="text-sm text-[var(--text-secondary)] col-span-3">{t('web.games.creaturesAutoCreate')}</p>}
            </div>
          </Card>

          {collectors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy size={20} /> {t('web.games.topCollectors')}</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {collectors.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-secondary)]">
                    <span className={`w-8 text-center font-bold ${i < 3 ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.user.username}</p>
                    </div>
                    <Badge>{c._count.collectedCreatures} {t('web.games.creaturesCount')}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Badge creation modal */}
      <Modal open={showBadgeModal} onClose={() => setShowBadgeModal(false)} title={t('web.games.createBadge')}>
        <div className="space-y-4">
          <Input label={t('common.name')} value={badgeForm.name} onChange={e => setBadgeForm({ ...badgeForm, name: e.target.value })} />
          <Input label={t('common.description')} value={badgeForm.description} onChange={e => setBadgeForm({ ...badgeForm, description: e.target.value })} />
          <Input label={t('web.games.icon')} value={badgeForm.icon} onChange={e => setBadgeForm({ ...badgeForm, icon: e.target.value })} />
          <Input label={t('web.games.condition')} value={badgeForm.condition} onChange={e => setBadgeForm({ ...badgeForm, condition: e.target.value })} />
          <Input label={t('web.games.threshold')} type="number" value={badgeForm.threshold} onChange={e => setBadgeForm({ ...badgeForm, threshold: e.target.value })} />
          <Button onClick={createBadge} className="w-full"><Save size={16} /> {t('common.create')}</Button>
        </div>
      </Modal>

      {/* Commands reference */}
      <Card>
        <CardHeader>
          <CardTitle>{t('common.availableCommands')}</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium flex items-center gap-1.5"><PawPrint size={14} /> {t('web.games.pets')}</p>
            <p className="text-[var(--text-secondary)]">/pet adopt, /pet stats, /pet feed, /pet play, /pet train, /pet battle</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium flex items-center gap-1.5"><Swords size={14} /> {t('web.games.rpg')}</p>
            <p className="text-[var(--text-secondary)]">/rpg create, /rpg stats, /rpg adventure, /rpg daily, /rpg duel</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium flex items-center gap-1.5"><Brain size={14} /> {t('web.games.quiz')}</p>
            <p className="text-[var(--text-secondary)]">/quiz — 6 {t('web.games.quizCategories').toLowerCase()}</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium flex items-center gap-1.5"><Award size={14} /> {t('web.games.badges')}</p>
            <p className="text-[var(--text-secondary)]">/badges</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium flex items-center gap-1.5"><Bug size={14} /> {t('web.games.creatures')}</p>
            <p className="text-[var(--text-secondary)]">/catch, /collection view, /collection detail, /collection release</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium flex items-center gap-1.5"><PenTool size={14} /> {t('web.games.generation')}</p>
            <p className="text-[var(--text-secondary)]">/generate text, /generate image</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
