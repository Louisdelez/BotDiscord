import { Spade, RefreshCw, LogOut, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { JassBoard } from './JassBoard';
import { JassCard } from './JassCard';
import { GameLobby } from '../game/GameLobby';
import { useGameStore } from '../../stores/game';
import { useT } from '../../lib/i18n';

const SUIT_SYMBOLS = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' };
const SUIT_COLORS = {
  spades: 'text-gray-800 dark:text-gray-200',
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-800 dark:text-gray-200',
};
const SUIT_BG = {
  spades: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600',
  hearts: 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50',
  diamonds: 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50',
  clubs: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600',
};
const SUIT_KEYS = { spades: 'jass.spades', hearts: 'jass.hearts', diamonds: 'jass.diamonds', clubs: 'jass.clubs' };

function JassOnline({ sessionState, myPlayer, isSpectator, isMyTurn, onLeave, onRematch }) {
  const t = useT();
  const sendAction = useGameStore((s) => s.sendAction);

  const engine = sessionState.engine;
  if (!engine) return null;

  const isFinished = sessionState.phase === 'finished';
  const myPlayerIndex = myPlayer ? myPlayer.playerNumber - 1 : 0;

  const getPlayerInfo = (playerIndex) => {
    return sessionState.players.find((p) => p.playerNumber === playerIndex + 1);
  };

  const getPlayerName = (playerIndex) => {
    const info = getPlayerInfo(playerIndex);
    return info?.username || `P${playerIndex + 1}`;
  };

  const handlePlayCard = (cardIndex) => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'playCard', cardIndex });
  };

  const handleChooseTrump = (trump) => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'chooseTrump', trump });
  };

  const handleChibre = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'chibre' });
  };

  const statusBadge = () => {
    if (engine.gameOver && engine.winner != null) {
      const winTeam = engine.winner === 0 ? 'A' : 'B';
      return <Badge variant="danger">{t('jass.teamWins', { team: winTeam })}</Badge>;
    }
    if (engine.status === 'roundOver') {
      return <Badge variant="warning">{t('jass.roundOver')}</Badge>;
    }
    if (isSpectator) {
      return <Badge variant="info">{t('game.spectating')}</Badge>;
    }
    if (isMyTurn) {
      return <Badge variant="success">{t('game.yourTurn')}</Badge>;
    }
    const currentName = getPlayerName(engine.currentPlayer);
    return <Badge variant="info">{t('game.playerTurn', { player: currentName })}</Badge>;
  };

  // Teams info: players 0,2 = Team A; players 1,3 = Team B
  const teams = engine.teams || [[0, 2], [1, 3]];

  // Trump selection phase
  if (engine.status === 'trumpSelection') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Spade size={20} /> {t('jass.title')}
              </CardTitle>
              {isSpectator && (
                <p className="text-sm text-[var(--text-secondary)]">{t('game.spectating')}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div aria-live="polite">{statusBadge()}</div>
              {engine.roundNumber && <Badge>{t('jass.round')} {engine.roundNumber}</Badge>}
              <Button variant="ghost" size="sm" onClick={onLeave}>
                <LogOut size={14} /> {t('game.leave')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="p-4 pt-0">
          <div className="flex flex-col items-center gap-6 py-8">
            <p className="text-lg font-bold">{t('jass.chooseTrump')}</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {isMyTurn
                ? t('game.yourTurn')
                : t('game.playerTurn', { player: getPlayerName(engine.currentPlayer) })}
            </p>

            {/* Show my hand */}
            {engine.hands && engine.hands[myPlayerIndex] && (
              <div className="flex flex-wrap justify-center gap-1">
                {engine.hands[myPlayerIndex].map((card) => (
                  <div key={card.id}>
                    <JassCard card={card} size="sm" />
                  </div>
                ))}
              </div>
            )}

            {/* Suit buttons - only for current player */}
            {isMyTurn && !isSpectator && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {['spades', 'hearts', 'diamonds', 'clubs'].map((suit) => (
                    <button
                      key={suit}
                      onClick={() => handleChooseTrump(suit)}
                      className={`${SUIT_BG[suit]} px-6 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2`}
                    >
                      <span className={SUIT_COLORS[suit]}>{SUIT_SYMBOLS[suit]}</span>
                      <span className="text-sm">{t(SUIT_KEYS[suit])}</span>
                    </button>
                  ))}
                </div>

                {/* Chibre button */}
                {!engine.chibred && (
                  <Button variant="secondary" onClick={handleChibre}>
                    <ChevronRight size={16} /> {t('jass.chibre')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Trick end phase
  if (engine.status === 'trickEnd' && engine.lastTrick) {
    const lastTrick = engine.lastTrick;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Spade size={20} /> {t('jass.title')}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {engine.roundNumber && <Badge>{t('jass.round')} {engine.roundNumber}</Badge>}
              <Button variant="ghost" size="sm" onClick={onLeave}>
                <LogOut size={14} /> {t('game.leave')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="p-4 pt-0">
          <div className="flex flex-col items-center gap-6 py-12">
            <p className="text-xl font-bold">
              {t('jass.trickWon', { player: getPlayerName(lastTrick.winner) })}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant={teams[0].includes(lastTrick.winner) ? 'info' : 'warning'}>
                {t(teams[0].includes(lastTrick.winner) ? 'jass.teamA' : 'jass.teamB')}
              </Badge>
              <span className="text-lg font-bold">+{lastTrick.points} {t('jass.points')}</span>
            </div>
            {/* Show the trick cards */}
            {lastTrick.cards && (
              <div className="flex gap-2">
                {lastTrick.cards.map(({ card, playerIndex }) => (
                  <div key={card.id} className="flex flex-col items-center gap-1">
                    <JassCard card={card} size="sm" />
                    <span className="text-[0.6rem] text-[var(--text-secondary)]">{getPlayerName(playerIndex)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Round over phase
  if (engine.status === 'roundOver') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Spade size={20} /> {t('jass.title')}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {engine.roundNumber && <Badge>{t('jass.round')} {engine.roundNumber}</Badge>}
              <Button variant="ghost" size="sm" onClick={onLeave}>
                <LogOut size={14} /> {t('game.leave')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="p-4 pt-0">
          <div className="flex flex-col items-center gap-6 py-12">
            <p className="text-2xl font-bold">{t('jass.roundOver')}</p>
            <div className="flex gap-6">
              <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl bg-[var(--bg-secondary)]">
                <Badge variant="info">{t('jass.teamA')}</Badge>
                <p className="text-sm text-[var(--text-secondary)]">{t('jass.round')}: +{engine.roundScores?.[0] ?? 0}</p>
                <p className="text-2xl font-bold">{engine.scores?.[0] ?? 0}</p>
              </div>
              <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl bg-[var(--bg-secondary)]">
                <Badge variant="warning">{t('jass.teamB')}</Badge>
                <p className="text-sm text-[var(--text-secondary)]">{t('jass.round')}: +{engine.roundScores?.[1] ?? 0}</p>
                <p className="text-2xl font-bold">{engine.scores?.[1] ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Game over phase
  if (engine.gameOver || isFinished) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Spade size={20} /> {t('jass.title')}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onLeave}>
                <LogOut size={14} /> {t('game.leave')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="p-4 pt-0">
          <div className="flex flex-col items-center gap-6 py-16">
            <p className="text-3xl font-bold">{t('jass.gameOver')}</p>
            {engine.winner != null && (
              <p className="text-xl">
                {t('jass.teamWins', { team: engine.winner === 0 ? 'A' : 'B' })}
              </p>
            )}
            <div className="flex gap-6">
              <div className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl ${engine.winner === 0 ? 'bg-green-500/10 ring-2 ring-green-500' : 'bg-[var(--bg-secondary)]'}`}>
                <Badge variant="info">{t('jass.teamA')}</Badge>
                <p className="text-2xl font-bold">{engine.scores?.[0] ?? 0}</p>
              </div>
              <div className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl ${engine.winner === 1 ? 'bg-green-500/10 ring-2 ring-green-500' : 'bg-[var(--bg-secondary)]'}`}>
                <Badge variant="warning">{t('jass.teamB')}</Badge>
                <p className="text-2xl font-bold">{engine.scores?.[1] ?? 0}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={onRematch}>
                <RefreshCw size={16} /> {t('game.rematch')}
              </Button>
              <Button variant="ghost" onClick={onLeave}>
                <LogOut size={16} /> {t('game.leave')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Active playing phase — reuse JassBoard
  // Build player name labels for the board
  const playerNames = [0, 1, 2, 3].map((i) => getPlayerName(i));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Spade size={20} /> {t('jass.title')}
            </CardTitle>
            {isSpectator && (
              <p className="text-sm text-[var(--text-secondary)]">{t('game.spectating')}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div aria-live="polite">{statusBadge()}</div>
            {engine.roundNumber && <Badge>{t('jass.round')} {engine.roundNumber}</Badge>}
            <Button variant="ghost" size="sm" onClick={onLeave}>
              <LogOut size={14} /> {t('game.leave')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="p-4 pt-0">
        {/* Player names */}
        <div className="flex gap-4 justify-center mb-4 text-sm flex-wrap">
          {[0, 1, 2, 3].map((i) => {
            const teamIdx = teams[0].includes(i) ? 'A' : 'B';
            const isCurrent = engine.currentPlayer === i;
            return (
              <div key={i} className={`flex items-center gap-1 ${isCurrent ? 'font-bold' : ''}`}>
                <Badge variant={teamIdx === 'A' ? 'info' : 'warning'}>{teamIdx}</Badge>
                <span>{playerNames[i]}</span>
                {i === myPlayerIndex && !isSpectator && (
                  <span className="text-[var(--text-secondary)]">({t('game.you') || 'you'})</span>
                )}
              </div>
            );
          })}
        </div>

        <JassBoard
          hands={engine.hands || [[], [], [], []]}
          currentPlayer={engine.currentPlayer}
          currentTrick={engine.currentTrick || []}
          tricks={engine.tricks || []}
          trump={engine.trump}
          roundScores={engine.roundScores || [0, 0]}
          scores={engine.scores || [0, 0]}
          playableCards={isMyTurn && !isSpectator ? (engine.playableCards || []) : []}
          onPlayCard={handlePlayCard}
          leadPlayer={engine.leadPlayer}
          trickWinner={engine.trickWinner}
          teams={teams}
        />
      </div>
    </Card>
  );
}

export function JassGame() {
  const t = useT();

  return (
    <GameLobby
      gameType="jass"
      gameTitle={t('jass.title')}
      icon={Spade}
      minPlayers={4}
      maxPlayers={4}
    >
      {(props) => <JassOnline {...props} />}
    </GameLobby>
  );
}
