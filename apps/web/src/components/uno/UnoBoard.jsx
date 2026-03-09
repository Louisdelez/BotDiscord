import { UnoCard } from './UnoCard';
import { Badge } from '../ui/Badge';
import { useT } from '../../lib/i18n';

export function UnoBoard({
  hands,
  currentPlayer,
  discard,
  deckCount,
  direction,
  currentColor,
  playableCards,
  onPlayCard,
  onDrawCard,
  onCallUno,
  showUnoButton,
  playerCount,
}) {
  const t = useT();
  const topCard = discard[discard.length - 1];

  // Get opponent indices (everyone except current player)
  const opponents = [];
  for (let i = 0; i < playerCount; i++) {
    if (i !== currentPlayer) opponents.push(i);
  }

  const COLOR_INDICATOR = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Opponents */}
      <div className="flex gap-4 justify-center flex-wrap">
        {opponents.map(i => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)]">
            <span className="text-sm font-medium">{t('uno.playerTurn', { player: i + 1 }).replace(t('uno.playerTurn', { player: '' }).replace('{player}', ''), '').trim() || `P${i + 1}`}</span>
            <Badge>{hands[i]?.length || 0}</Badge>
            <div className="flex -space-x-3">
              {(hands[i] || []).slice(0, 8).map((_, ci) => (
                <div key={ci} className="w-4 h-6 rounded-sm bg-[var(--bg-tertiary)] border border-[var(--border)]" />
              ))}
              {(hands[i]?.length || 0) > 8 && (
                <span className="text-xs text-[var(--text-secondary)] ml-1">+{hands[i].length - 8}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Center: Deck + Discard + Direction */}
      <div className="flex items-center justify-center gap-6">
        {/* Draw pile */}
        <div
          className="relative cursor-pointer group"
          aria-label={`Draw card (${deckCount} remaining)`}
        >
          <UnoCard faceDown size="lg" onClick={onDrawCard} />
          <span className="absolute bottom-1 right-1 text-[0.6rem] bg-black/50 text-white px-1 rounded">
            {deckCount}
          </span>
        </div>

        {/* Discard pile */}
        <div className="flex flex-col items-center gap-2">
          {topCard && <UnoCard card={topCard} size="lg" />}
          {/* Current color indicator */}
          <div className="flex items-center gap-1.5" aria-live="polite">
            <div className={`w-4 h-4 rounded-full ${COLOR_INDICATOR[currentColor] || 'bg-gray-500'}`} aria-hidden="true" />
            <span className="text-xs text-[var(--text-secondary)]">{t(`uno.${currentColor}`)}</span>
          </div>
        </div>

        {/* Direction indicator */}
        <div className="flex flex-col items-center gap-1" aria-label={`Direction: ${direction === 1 ? 'clockwise' : 'counter-clockwise'}`}>
          <span className="text-3xl text-[var(--text-secondary)]" aria-hidden="true">
            {direction === 1 ? '↻' : '↺'}
          </span>
          <span className="text-[0.6rem] text-[var(--text-secondary)]">
            {t('uno.reverse')}
          </span>
        </div>
      </div>

      {/* Current player's hand */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2" aria-live="polite">
          <span className="text-sm font-medium">{t('uno.playerTurn', { player: currentPlayer + 1 })}</span>
          {showUnoButton && (
            <button
              onClick={onCallUno}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-bold animate-pulse hover:bg-red-600 transition-colors cursor-pointer"
            >
              {t('uno.callUno')}
            </button>
          )}
        </div>

        <div className="flex flex-wrap justify-center items-end gap-0.5 sm:gap-0">
          {(hands[currentPlayer] || []).map((card, i) => (
            <div key={card.id} className="sm:-ml-3 first:ml-0 hover:z-10 transition-all">
              <UnoCard
                card={card}
                isPlayable={playableCards.includes(i)}
                onClick={playableCards.includes(i) ? () => onPlayCard(i) : undefined}
                size="md"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
