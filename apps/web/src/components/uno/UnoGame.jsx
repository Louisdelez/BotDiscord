import { useState } from 'react';
import { Layers, RefreshCw, LogOut } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { UnoBoard } from './UnoBoard';
import { GameLobby } from '../game/GameLobby';
import { useGameStore } from '../../stores/game';
import { useAuthStore } from '../../stores/auth';
import { useT } from '../../lib/i18n';

function UnoOnline({ sessionState, myPlayer, isSpectator, isMyTurn, onLeave, onRematch }) {
  const t = useT();
  const sendAction = useGameStore((s) => s.sendAction);
  const user = useAuthStore((s) => s.user);

  const [pendingCardIndex, setPendingCardIndex] = useState(null);
  const [showColorChoice, setShowColorChoice] = useState(false);

  const engine = sessionState.engine;
  if (!engine) return null;

  const myIndex = myPlayer ? myPlayer.playerNumber - 1 : -1;
  const isFinished = sessionState.phase === 'finished';

  // Build hands array adapted for UnoBoard:
  // - Own hand: full card objects from the server
  // - Opponent hands: generate placeholder arrays based on count
  const adaptedHands = engine.hands.map((hand, i) => {
    if (i === myIndex) {
      // Own hand — server sends full card objects
      return hand;
    }
    // Opponent hand — server sends { count: N }
    const count = hand?.count ?? hand?.length ?? 0;
    return Array.from({ length: count }, (_, ci) => ({ id: `hidden-${i}-${ci}`, hidden: true }));
  });

  // Determine which cards in our hand are playable
  const getPlayableCards = () => {
    if (!isMyTurn || isSpectator || engine.gameOver) return [];
    const hand = engine.hands[myIndex];
    if (!hand || !Array.isArray(hand)) return [];

    const playable = [];
    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      if (card.type === 'wild' || card.type === 'wild4') {
        playable.push(i);
      } else if (card.color === engine.currentColor) {
        playable.push(i);
      } else if (engine.discardTop && card.value === engine.discardTop.value) {
        playable.push(i);
      }
    }
    return playable;
  };

  const playableCards = getPlayableCards();

  const handlePlayCard = (cardIndex) => {
    if (!isMyTurn || isSpectator) return;
    const hand = engine.hands[myIndex];
    if (!hand || !Array.isArray(hand)) return;
    const card = hand[cardIndex];

    // If wild card, show color chooser
    if (card.type === 'wild' || card.type === 'wild4') {
      setPendingCardIndex(cardIndex);
      setShowColorChoice(true);
      return;
    }

    sendAction({ type: 'playCard', cardIndex });
  };

  const handleColorChoice = (color) => {
    if (pendingCardIndex === null) return;
    sendAction({ type: 'playCard', cardIndex: pendingCardIndex, color });
    setPendingCardIndex(null);
    setShowColorChoice(false);
  };

  const handleDrawCard = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'drawCard' });
  };

  const handleEndTurn = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'endTurn' });
  };

  const handleCallUno = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'callUno' });
  };

  const getPlayerInfo = (playerNumber) => {
    return sessionState.players.find(p => p.playerNumber === playerNumber);
  };

  // Build player names array for display
  const playerNames = engine.hands.map((_, i) => {
    const info = getPlayerInfo(i + 1);
    return info?.username || `Player ${i + 1}`;
  });

  // Show UNO button when the current player has 2 cards and it's our turn
  const showUnoButton = isMyTurn && !isSpectator &&
    engine.hands[myIndex] &&
    Array.isArray(engine.hands[myIndex]) &&
    engine.hands[myIndex].length === 2 &&
    !engine.unoCalled?.[myIndex];

  const statusBadge = () => {
    if (engine.gameOver && engine.winner !== undefined && engine.winner !== null) {
      const winnerInfo = getPlayerInfo(engine.winner + 1);
      return <Badge variant="danger">{t('uno.playerWins', { player: winnerInfo?.username || (engine.winner + 1) })}</Badge>;
    }
    if (isSpectator) {
      const currentInfo = getPlayerInfo(engine.currentPlayer + 1);
      return <Badge variant="info">{t('game.playerTurn', { player: currentInfo?.username })}</Badge>;
    }
    if (isMyTurn) {
      return <Badge variant="success">{t('game.yourTurn')}</Badge>;
    }
    const currentInfo = getPlayerInfo(engine.currentPlayer + 1);
    return <Badge variant="info">{t('game.playerTurn', { player: currentInfo?.username })}</Badge>;
  };

  const COLOR_BUTTONS = [
    { color: 'red', class: 'bg-red-500 hover:bg-red-600', label: t('uno.red') },
    { color: 'blue', class: 'bg-blue-500 hover:bg-blue-600', label: t('uno.blue') },
    { color: 'green', class: 'bg-green-500 hover:bg-green-600', label: t('uno.green') },
    { color: 'yellow', class: 'bg-yellow-400 hover:bg-yellow-500 text-gray-900', label: t('uno.yellow') },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers size={20} /> {t('uno.title')}
            </CardTitle>
            {isSpectator && (
              <p className="text-sm text-[var(--text-secondary)]">{t('game.spectating')}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div aria-live="polite">{statusBadge()}</div>
            <Button variant="ghost" size="sm" onClick={onLeave}>
              <LogOut size={14} /> {t('game.leave')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="p-4 pt-0">
        {/* Player list */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {playerNames.map((name, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                ${i === engine.currentPlayer && !isFinished
                  ? 'bg-[var(--accent)] text-white font-bold'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}
                ${i === myIndex ? 'ring-2 ring-[var(--accent)]' : ''}`}
            >
              <span>{name}</span>
              {i !== myIndex && (
                <Badge>{engine.hands[i]?.count ?? (Array.isArray(engine.hands[i]) ? engine.hands[i].length : 0)}</Badge>
              )}
              {i === myIndex && (
                <Badge>{Array.isArray(engine.hands[i]) ? engine.hands[i].length : 0}</Badge>
              )}
            </div>
          ))}
        </div>

        {!engine.gameOver && (
          <>
            <UnoBoard
              hands={adaptedHands}
              currentPlayer={myIndex}
              discard={engine.discardTop ? [engine.discardTop] : []}
              deckCount={engine.deckCount}
              direction={engine.direction}
              currentColor={engine.currentColor}
              playableCards={playableCards}
              onPlayCard={handlePlayCard}
              onDrawCard={handleDrawCard}
              onCallUno={handleCallUno}
              showUnoButton={showUnoButton}
              playerCount={engine.hands.length}
              hasDrawn={engine.hasDrawn}
            />

            {/* Draw/Pass hint */}
            {isMyTurn && engine.hasDrawn && (
              <div className="text-center mt-3">
                <p className="text-sm text-[var(--text-secondary)] mb-2">
                  {playableCards.length > 0
                    ? t('uno.playOrPass')
                    : t('uno.mustPass')}
                </p>
                <Button variant="secondary" size="sm" onClick={handleEndTurn}>
                  {t('uno.skip')}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Game over */}
        {(engine.gameOver || isFinished) && (
          <div className="flex flex-col items-center gap-6 py-16">
            <p className="text-3xl font-bold">
              {t('uno.playerWins', {
                player: getPlayerInfo((engine.winner ?? 0) + 1)?.username || (engine.winner + 1),
              })}
            </p>
            <div className="flex gap-2">
              <Button onClick={onRematch}>
                <RefreshCw size={16} /> {t('game.rematch')}
              </Button>
              <Button variant="ghost" onClick={onLeave}>
                <LogOut size={16} /> {t('game.leave')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Color choice modal */}
      <Modal
        open={showColorChoice}
        onClose={() => { setPendingCardIndex(null); setShowColorChoice(false); }}
        title={t('uno.chooseColor')}
      >
        <div className="grid grid-cols-2 gap-3 p-2">
          {COLOR_BUTTONS.map(({ color, class: cls, label }) => (
            <button
              key={color}
              onClick={() => handleColorChoice(color)}
              className={`${cls} text-white font-bold py-6 rounded-xl text-lg transition-all hover:scale-105 cursor-pointer`}
            >
              {label}
            </button>
          ))}
        </div>
      </Modal>
    </Card>
  );
}

export function UnoGame() {
  const t = useT();

  return (
    <GameLobby
      gameType="uno"
      gameTitle={t('uno.title')}
      icon={Layers}
      minPlayers={2}
      maxPlayers={10}
    >
      {(props) => <UnoOnline {...props} />}
    </GameLobby>
  );
}
