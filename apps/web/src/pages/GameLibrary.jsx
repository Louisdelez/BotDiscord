import { useState } from 'react';
import { Library, Crown, Castle, Layers, Spade, CircleDollarSign, Grid3X3, Building2, Circle, LayoutGrid, Moon, ArrowLeft, Users } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ChessGame } from '../components/chess/ChessGame';
import { ShogiGame } from '../components/shogi/ShogiGame';
import { UnoGame } from '../components/uno/UnoGame';
import { JassGame } from '../components/jass/JassGame';
import { PokerGame } from '../components/poker/PokerGame';
import { Connect4Game } from '../components/connect4/Connect4Game';
import { MonopolyGame } from '../components/monopoly/MonopolyGame';
import { GoGame } from '../components/go/GoGame';
import { MahjongGame } from '../components/mahjong/MahjongGame';
import { WerewolfGame } from '../components/werewolf/WerewolfGame';
import { useT } from '../lib/i18n';

const GAMES = [
  {
    key: 'chess',
    icon: Crown,
    color: 'amber',
    players: '2',
    category: 'strategy',
    Component: ChessGame,
  },
  {
    key: 'shogi',
    icon: Castle,
    color: 'red',
    players: '2',
    category: 'strategy',
    Component: ShogiGame,
  },
  {
    key: 'go',
    icon: Circle,
    color: 'emerald',
    players: '2',
    category: 'strategy',
    Component: GoGame,
  },
  {
    key: 'connect4',
    icon: Grid3X3,
    color: 'blue',
    players: '2',
    category: 'strategy',
    Component: Connect4Game,
  },
  {
    key: 'uno',
    icon: Layers,
    color: 'rose',
    players: '2-10',
    category: 'cards',
    Component: UnoGame,
  },
  {
    key: 'jass',
    icon: Spade,
    color: 'indigo',
    players: '4',
    category: 'cards',
    Component: JassGame,
  },
  {
    key: 'poker',
    icon: CircleDollarSign,
    color: 'green',
    players: '2-8',
    category: 'cards',
    Component: PokerGame,
  },
  {
    key: 'mahjong',
    icon: LayoutGrid,
    color: 'teal',
    players: '4',
    category: 'strategy',
    Component: MahjongGame,
  },
  {
    key: 'monopoly',
    icon: Building2,
    color: 'purple',
    players: '2-6',
    category: 'board',
    Component: MonopolyGame,
  },
  {
    key: 'werewolf',
    icon: Moon,
    color: 'orange',
    players: '6-12',
    category: 'social',
    Component: WerewolfGame,
  },
];

const COLOR_MAP = {
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', hover: 'hover:border-amber-500/50' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', hover: 'hover:border-red-500/50' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', hover: 'hover:border-emerald-500/50' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', hover: 'hover:border-blue-500/50' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', hover: 'hover:border-rose-500/50' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/20', hover: 'hover:border-indigo-500/50' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20', hover: 'hover:border-green-500/50' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-500', border: 'border-teal-500/20', hover: 'hover:border-teal-500/50' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20', hover: 'hover:border-purple-500/50' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20', hover: 'hover:border-orange-500/50' },
};

const CATEGORY_KEYS = {
  all: 'web.gameLibrary.filterAll',
  strategy: 'web.gameLibrary.filterStrategy',
  cards: 'web.gameLibrary.filterCards',
  board: 'web.gameLibrary.filterBoard',
  social: 'web.gameLibrary.filterSocial',
};

export function GameLibrary() {
  const t = useT();
  const [activeGame, setActiveGame] = useState(null);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? GAMES : GAMES.filter(g => g.category === filter);

  if (activeGame) {
    const game = GAMES.find(g => g.key === activeGame);
    if (!game) return null;
    const { Component } = game;
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>
          <ArrowLeft size={16} /> {t('web.gameLibrary.backToLibrary')}
        </Button>
        <Component />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Library size={28} /> {t('web.gameLibrary.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">{t('web.gameLibrary.subtitle')}</p>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(CATEGORY_KEYS).map(([key, labelKey]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(game => {
          const colors = COLOR_MAP[game.color];
          const Icon = game.icon;
          return (
            <Card
              key={game.key}
              className={`group cursor-pointer border ${colors.border} ${colors.hover} transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}
              onClick={() => setActiveGame(game.key)}
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${colors.bg}`}>
                    <Icon size={24} className={colors.text} />
                  </div>
                  <Badge variant="info" className="text-xs">{t(CATEGORY_KEYS[game.category])}</Badge>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">{t(`web.games.${game.key}`)}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {t(`web.gameLibrary.desc.${game.key}`)}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {game.players} {t('web.gameLibrary.players')}
                  </span>
                </div>

                <button className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${colors.bg} ${colors.text} group-hover:opacity-90`}>
                  {t('web.gameLibrary.play')}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
