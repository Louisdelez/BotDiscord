import { useState, useEffect } from 'react';
import { PokerCard } from './PokerCard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useT } from '../../lib/i18n';

const ROUND_LABELS = {
  preflop: 'poker.preflop',
  flop: 'poker.flop',
  turn: 'poker.turn',
  river: 'poker.river',
};

export function PokerBoard({
  game,
  currentPlayerView,
  actions,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onAllIn,
}) {
  const t = useT();
  const [raiseAmount, setRaiseAmount] = useState(actions.minRaise || 0);

  const players = game.players;
  const communityCards = game.communityCards;
  const pot = game.getTotalPot();
  const isCurrentPlayer = currentPlayerView === game.currentPlayer;

  // Get opponents (everyone except current view player)
  const opponents = players.filter(p => p.index !== currentPlayerView && !p.sittingOut);
  const viewPlayer = players[currentPlayerView];

  const handleRaise = () => {
    onRaise(raiseAmount);
  };

  // Update raiseAmount when actions change
  useEffect(() => {
    if (actions.minRaise > 0 && raiseAmount < actions.minRaise) {
      setRaiseAmount(actions.minRaise);
    }
  }, [actions.minRaise]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Pot and round info */}
      <div className="flex justify-center gap-4 text-sm flex-wrap" aria-live="polite">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)]">
          <span className="text-[var(--text-secondary)]">{t('poker.pot')}</span>
          <span className="font-bold text-amber-500">{pot}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)]">
          <span className="text-[var(--text-secondary)]">{t(ROUND_LABELS[game.bettingRound])}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)]">
          <span className="text-[var(--text-secondary)]">{t('poker.dealer')}</span>
          <span className="font-bold">P{game.dealerIndex + 1}</span>
        </div>
      </div>

      {/* Opponents row */}
      <div className="flex flex-wrap justify-center gap-3">
        {opponents.map(p => (
          <div
            key={p.index}
            className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] ${
              p.index === game.currentPlayer ? 'ring-2 ring-[var(--accent)]' : ''
            }`}
            aria-current={p.index === game.currentPlayer ? 'true' : undefined}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">P{p.index + 1}</span>
              {p.index === game.dealerIndex && <Badge variant="warning">D</Badge>}
              {p.index === game.smallBlindIndex && <Badge variant="info">SB</Badge>}
              {p.index === game.bigBlindIndex && <Badge variant="info">BB</Badge>}
            </div>
            <div className="flex gap-0.5">
              {p.folded ? (
                <span className="text-xs text-[var(--text-secondary)] italic">{t('poker.fold')}</span>
              ) : p.allIn ? (
                <span className="text-xs text-amber-500 font-bold">{t('poker.allIn')}</span>
              ) : (
                <>
                  <PokerCard faceDown size="sm" />
                  <PokerCard faceDown size="sm" />
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[var(--text-secondary)]">{t('poker.chips')}:</span>
              <span className="font-bold">{p.chips}</span>
            </div>
            {p.bet > 0 && (
              <Badge variant="warning">{t('poker.bet')}: {p.bet}</Badge>
            )}
          </div>
        ))}
      </div>

      {/* Community cards */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i}>
              {communityCards[i] ? (
                <PokerCard card={communityCards[i]} community size="md" />
              ) : (
                <div className="w-14 h-20 rounded-xl border-2 border-dashed border-[var(--border)] flex items-center justify-center">
                  <span className="text-[var(--text-secondary)] opacity-30 text-xs">?</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current view player's hole cards */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t('poker.playerTurn', { player: currentPlayerView + 1 })}</span>
          {currentPlayerView === game.dealerIndex && <Badge variant="warning">D</Badge>}
          {currentPlayerView === game.smallBlindIndex && <Badge variant="info">SB</Badge>}
          {currentPlayerView === game.bigBlindIndex && <Badge variant="info">BB</Badge>}
          <Badge>{t('poker.chips')}: {viewPlayer.chips}</Badge>
        </div>

        <div className="flex gap-1.5">
          {(viewPlayer.holeCards || []).map(card => (
            <PokerCard key={card.id} card={card} size="lg" />
          ))}
        </div>

        {viewPlayer.bet > 0 && (
          <Badge variant="warning">{t('poker.bet')}: {viewPlayer.bet}</Badge>
        )}
      </div>

      {/* Betting controls (only for current player) */}
      {isCurrentPlayer && !viewPlayer.folded && !viewPlayer.allIn && (
        <div className="flex flex-col items-center gap-3 px-4 py-4 rounded-xl bg-[var(--bg-secondary)]">
          <div className="flex flex-wrap justify-center gap-2">
            {actions.canFold && (
              <Button variant="danger" size="sm" onClick={onFold}>
                {t('poker.fold')}
              </Button>
            )}
            {actions.canCheck && (
              <Button variant="secondary" size="sm" onClick={onCheck}>
                {t('poker.check')}
              </Button>
            )}
            {actions.canCall && (
              <Button size="sm" onClick={onCall}>
                {t('poker.call')} ({actions.callAmount})
              </Button>
            )}
            {actions.canAllIn && (
              <Button variant="warning" size="sm" onClick={onAllIn}>
                {t('poker.allIn')} ({viewPlayer.chips})
              </Button>
            )}
          </div>

          {actions.canRaise && (
            <div className="w-full max-w-xs space-y-2">
              <Slider
                label={t('poker.raise')}
                value={raiseAmount}
                onChange={setRaiseAmount}
                min={actions.minRaise}
                max={actions.maxRaise}
                step={Math.max(1, Math.floor(game.bigBlindAmount / 2))}
              />
              <div className="flex justify-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setRaiseAmount(actions.minRaise)}>
                  {t('poker.min')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRaiseAmount(Math.min(pot + game.currentBet, actions.maxRaise))}>
                  {t('poker.potButton')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRaiseAmount(actions.maxRaise)}>
                  {t('poker.max')}
                </Button>
                <Button size="sm" onClick={handleRaise}>
                  {t('poker.raise')} ({raiseAmount})
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
