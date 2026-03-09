import { CircleDollarSign, RefreshCw, LogOut } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PokerBoard } from './PokerBoard';
import { PokerCard } from './PokerCard';
import { GameLobby } from '../game/GameLobby';
import { useGameStore } from '../../stores/game';
import { useT } from '../../lib/i18n';

function PokerOnline({ sessionState, myPlayer, isSpectator, isMyTurn, onLeave, onRematch }) {
  const t = useT();
  const sendAction = useGameStore((s) => s.sendAction);

  const engine = sessionState.engine;
  if (!engine) return null;

  const isFinished = sessionState.phase === 'finished';
  const myPlayerIndex = myPlayer?.playerNumber != null ? myPlayer.playerNumber - 1 : null;

  // Determine the current player view: show own cards if playing, otherwise follow current turn
  const currentPlayerView = myPlayerIndex != null ? myPlayerIndex : engine.currentPlayer;

  // Build available actions for the current player from engine state
  const actions = engine.availableActions || {
    canFold: false,
    canCheck: false,
    canCall: false,
    canRaise: false,
    canAllIn: false,
    callAmount: 0,
    minRaise: 0,
    maxRaise: 0,
  };

  // Build a game-like object compatible with PokerBoard
  const game = {
    players: engine.players.map((p, i) => ({
      ...p,
      // Only show hole cards for the local player; others are hidden by the server
      holeCards: i === myPlayerIndex ? p.holeCards : (p.holeCards || []),
    })),
    communityCards: engine.communityCards || [],
    currentPlayer: engine.currentPlayer,
    dealerIndex: engine.dealerIndex,
    smallBlindIndex: engine.smallBlindIndex,
    bigBlindIndex: engine.bigBlindIndex,
    bettingRound: engine.bettingRound,
    currentBet: engine.currentBet,
    bigBlindAmount: engine.bigBlindAmount || 20,
    pots: engine.pots || [],
    winners: engine.winners || [],
    handNumber: engine.handNumber || 1,
    finalWinner: engine.finalWinner ?? null,
    getTotalPot: () => {
      const pots = engine.pots || [];
      return pots.reduce((sum, pot) => sum + pot.amount, 0);
    },
    getAvailableActions: () => actions,
  };

  const handleFold = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'fold' });
  };

  const handleCheck = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'check' });
  };

  const handleCall = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'call' });
  };

  const handleRaise = (amount) => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'raise', amount });
  };

  const handleAllIn = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'allIn' });
  };

  const getPlayerInfo = (playerIndex) => {
    return sessionState.players.find(p => p.playerNumber === playerIndex + 1);
  };

  const statusBadge = () => {
    if (engine.finalWinner != null) {
      const winner = getPlayerInfo(engine.finalWinner);
      return <Badge variant="danger">{winner?.username || `P${engine.finalWinner + 1}`} {t('poker.gameOver')}</Badge>;
    }
    if (engine.winners && engine.winners.length > 0 && (engine.status === 'showdown' || engine.status === 'handOver')) {
      const winnerNames = engine.winners.map(w => {
        const info = getPlayerInfo(w.playerIndex);
        return info?.username || `P${w.playerIndex + 1}`;
      }).join(', ');
      return <Badge variant="success">{winnerNames} {t('poker.showdown')}</Badge>;
    }
    if (isMyTurn) {
      return <Badge variant="success">{t('game.yourTurn')}</Badge>;
    }
    const currentInfo = getPlayerInfo(engine.currentPlayer);
    return <Badge variant="info">{t('game.playerTurn', { player: currentInfo?.username || `P${engine.currentPlayer + 1}` })}</Badge>;
  };

  const showShowdown = engine.status === 'showdown' || engine.status === 'handOver';
  const showGameOver = engine.status === 'gameOver' || isFinished;
  const showPlaying = !showShowdown && !showGameOver;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CircleDollarSign size={20} /> {t('poker.title')}
            </CardTitle>
            {isSpectator && (
              <p className="text-sm text-[var(--text-secondary)]">{t('game.spectating')}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge>{t('poker.hand')} #{game.handNumber}</Badge>
            <div aria-live="polite">{statusBadge()}</div>
            <Button variant="ghost" size="sm" onClick={onLeave}>
              <LogOut size={14} /> {t('game.leave')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="p-4 pt-0">
        {/* Player list with usernames */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {sessionState.players.map((p) => {
            const pIndex = p.playerNumber - 1;
            const enginePlayer = engine.players[pIndex];
            const isCurrent = pIndex === engine.currentPlayer && !showShowdown && !showGameOver;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                  isCurrent ? 'bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]' : 'bg-[var(--bg-secondary)]'
                }`}
              >
                <span className="font-medium">{p.username}</span>
                {pIndex === engine.dealerIndex && <Badge variant="warning">D</Badge>}
                {pIndex === engine.smallBlindIndex && <Badge variant="info">SB</Badge>}
                {pIndex === engine.bigBlindIndex && <Badge variant="info">BB</Badge>}
                {enginePlayer && (
                  <span className="text-xs text-[var(--text-secondary)]">({enginePlayer.chips})</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Active game board */}
        {showPlaying && (
          <PokerBoard
            game={game}
            currentPlayerView={currentPlayerView}
            actions={isMyTurn && !isSpectator ? actions : { canFold: false, canCheck: false, canCall: false, canRaise: false, canAllIn: false, minRaise: 0, maxRaise: 0 }}
            onFold={handleFold}
            onCheck={handleCheck}
            onCall={handleCall}
            onRaise={handleRaise}
            onAllIn={handleAllIn}
          />
        )}

        {/* Showdown / Hand over */}
        {showShowdown && (
          <div className="flex flex-col items-center gap-6 py-8">
            <p className="text-2xl font-bold">{t('poker.showdown')}</p>

            {/* Community cards */}
            <div className="flex gap-1.5">
              {game.communityCards.map(card => (
                <PokerCard key={card.id} card={card} community size="md" />
              ))}
            </div>

            {/* All players' hands */}
            <div className="flex flex-wrap justify-center gap-4">
              {game.players.filter(p => !p.sittingOut && !p.folded).map(p => {
                const isWinner = game.winners.some(w => w.playerIndex === p.index);
                const winnerInfo = game.winners.find(w => w.playerIndex === p.index);
                const playerInfo = getPlayerInfo(p.index);
                return (
                  <div
                    key={p.index}
                    className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl ${
                      isWinner ? 'bg-green-500/10 ring-2 ring-green-500' : 'bg-[var(--bg-secondary)]'
                    }`}
                  >
                    <span className="text-sm font-medium">{playerInfo?.username || `P${p.index + 1}`}</span>
                    <div className="flex gap-1">
                      {(p.holeCards || []).map(card =>
                        card.rank ? (
                          <PokerCard key={card.id} card={card} size="sm" />
                        ) : (
                          <PokerCard key={card.id} faceDown size="sm" />
                        )
                      )}
                    </div>
                    {winnerInfo?.hand && (
                      <Badge variant="success">{t(winnerInfo.hand.name)}</Badge>
                    )}
                    {isWinner && winnerInfo && (
                      <span className="text-sm font-bold text-green-500">+{winnerInfo.amount}</span>
                    )}
                    <span className="text-xs text-[var(--text-secondary)]">{t('poker.chips')}: {p.chips}</span>
                  </div>
                );
              })}
            </div>

            {/* Folded players */}
            {game.players.some(p => !p.sittingOut && p.folded) && (
              <div className="flex gap-2 text-sm text-[var(--text-secondary)]">
                {game.players.filter(p => !p.sittingOut && p.folded).map(p => {
                  const playerInfo = getPlayerInfo(p.index);
                  return (
                    <span key={p.index}>{playerInfo?.username || `P${p.index + 1}`} ({t('poker.folded')})</span>
                  );
                })}
              </div>
            )}

            {/* Pots info */}
            {game.pots.length > 1 && (
              <div className="flex gap-2">
                {game.pots.map((pot, i) => (
                  <Badge key={i} variant={i === 0 ? 'info' : 'warning'}>
                    {i === 0 ? t('poker.mainPot') : t('poker.sidePot')} {i > 0 ? i : ''}: {pot.amount}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Game over */}
        {showGameOver && (
          <div className="flex flex-col items-center gap-6 py-16">
            <p className="text-3xl font-bold">{t('poker.gameOver')}</p>
            {engine.finalWinner != null && (
              <p className="text-xl">
                {getPlayerInfo(engine.finalWinner)?.username || `P${engine.finalWinner + 1}`} {t('poker.playerWins', { player: '' })}
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              {game.players.map(p => {
                const playerInfo = getPlayerInfo(p.index);
                return (
                  <div
                    key={p.index}
                    className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl ${
                      p.index === engine.finalWinner ? 'bg-green-500/10 ring-2 ring-green-500' : 'bg-[var(--bg-secondary)]'
                    }`}
                  >
                    <span className="text-sm font-medium">{playerInfo?.username || `P${p.index + 1}`}</span>
                    <span className="text-lg font-bold">{p.chips}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{t('poker.chips')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* End-of-game actions */}
        {(showShowdown || showGameOver || isFinished) && (
          <div className="flex justify-center gap-2 mt-4">
            <Button onClick={onRematch}>
              <RefreshCw size={16} /> {t('game.rematch')}
            </Button>
            <Button variant="ghost" onClick={onLeave}>
              <LogOut size={16} /> {t('game.leave')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function PokerGame() {
  const t = useT();

  return (
    <GameLobby
      gameType="poker"
      gameTitle={t('poker.title')}
      icon={CircleDollarSign}
      minPlayers={2}
      maxPlayers={8}
    >
      {(props) => <PokerOnline {...props} />}
    </GameLobby>
  );
}
