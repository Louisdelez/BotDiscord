import { JassCard } from './JassCard';
import { Badge } from '../ui/Badge';
import { useT } from '../../lib/i18n';

const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const SUIT_COLORS = {
  spades: 'text-gray-800 dark:text-gray-200',
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-800 dark:text-gray-200',
};

const POSITIONS = ['bottom', 'left', 'top', 'right'];

function getRelativePositions(currentPlayer) {
  // Map absolute player indices to relative positions (bottom=current, then clockwise)
  const positions = {};
  for (let i = 0; i < 4; i++) {
    const absIdx = (currentPlayer + i) % 4;
    positions[absIdx] = POSITIONS[i];
  }
  return positions;
}

export function JassBoard({
  hands,
  currentPlayer,
  currentTrick,
  tricks,
  trump,
  roundScores,
  scores,
  playableCards,
  onPlayCard,
  leadPlayer,
  trickWinner,
  teams,
}) {
  const t = useT();
  const positions = getRelativePositions(currentPlayer);

  const trumpKey = trump ? `jass.${trump}` : null;

  // Render opponent hand (face down)
  const renderOpponentHand = (playerIndex, position) => {
    const hand = hands[playerIndex] || [];
    const teamIdx = teams[0].includes(playerIndex) ? 'A' : 'B';
    const isVertical = position === 'left' || position === 'right';

    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] ${isVertical ? 'flex-col' : ''}`}>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">P{playerIndex + 1}</span>
          <Badge variant={teamIdx === 'A' ? 'info' : 'warning'}>{t(teamIdx === 'A' ? 'jass.teamA' : 'jass.teamB')}</Badge>
        </div>
        <div className={`flex ${isVertical ? 'flex-col -space-y-2' : '-space-x-2'}`}>
          {hand.slice(0, 9).map((_, ci) => (
            <div key={ci} className={`${isVertical ? 'w-6 h-3' : 'w-4 h-6'} rounded-sm bg-blue-900 border border-blue-700`} />
          ))}
        </div>
      </div>
    );
  };

  // Trick center display
  const renderTrickCenter = () => {
    // Position cards in a cross pattern
    const trickPositions = {
      bottom: 'top-[60%] left-1/2 -translate-x-1/2',
      left: 'top-1/2 left-[15%] -translate-y-1/2',
      top: 'top-[10%] left-1/2 -translate-x-1/2',
      right: 'top-1/2 right-[15%] -translate-y-1/2',
    };

    return (
      <div className="relative w-full h-48 sm:h-56">
        {currentTrick.map(({ playerIndex, card }) => {
          const pos = positions[playerIndex];
          return (
            <div key={card.id} className={`absolute ${trickPositions[pos]} transition-all`}>
              <JassCard card={card} size="sm" />
            </div>
          );
        })}
        {/* Trump indicator */}
        {trump && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5" aria-label={`Trump: ${trump}`}>
            <span className={`text-2xl ${SUIT_COLORS[trump]}`} aria-hidden="true">{SUIT_SYMBOLS[trump]}</span>
            <span className="text-[0.6rem] text-[var(--text-secondary)]">{t('jass.trump')}</span>
          </div>
        )}
      </div>
    );
  };

  // Scores panel
  const renderScores = () => (
    <div className="flex gap-4 justify-center text-sm flex-wrap" aria-live="polite">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)]">
        <Badge variant="info">{t('jass.teamA')}</Badge>
        <span className="font-bold">{scores[0]}</span>
        <span className="text-[var(--text-secondary)]">(+{roundScores[0]})</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)]">
        <Badge variant="warning">{t('jass.teamB')}</Badge>
        <span className="font-bold">{scores[1]}</span>
        <span className="text-[var(--text-secondary)]">(+{roundScores[1]})</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)]">
        <span className="text-[var(--text-secondary)]">{t('jass.trick')}</span>
        <span className="font-bold">{tricks.length + (currentTrick.length > 0 ? 1 : 0)}/9</span>
      </div>
    </div>
  );

  // Trick history
  const renderHistory = () => {
    if (tricks.length === 0) return null;
    return (
      <div className="mt-4">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{t('jass.history')}</p>
        <div className="flex flex-wrap gap-1.5">
          {tricks.map((trick, i) => {
            const winnerTeam = teams[0].includes(trick.winner) ? 'A' : 'B';
            return (
              <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-secondary)] text-xs">
                <span className="text-[var(--text-secondary)]">#{i + 1}</span>
                <span className="font-medium">P{trick.winner + 1}</span>
                <Badge variant={winnerTeam === 'A' ? 'info' : 'warning'} className="text-[0.6rem] px-1">{trick.points}</Badge>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Get other players by position
  const topPlayer = Object.entries(positions).find(([, pos]) => pos === 'top');
  const leftPlayer = Object.entries(positions).find(([, pos]) => pos === 'left');
  const rightPlayer = Object.entries(positions).find(([, pos]) => pos === 'right');

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Scores */}
      {renderScores()}

      {/* Top opponent */}
      <div className="flex justify-center">
        {topPlayer && renderOpponentHand(Number(topPlayer[0]), 'top')}
      </div>

      {/* Middle row: left opponent, trick center, right opponent */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex-shrink-0 hidden sm:block">
          {leftPlayer && renderOpponentHand(Number(leftPlayer[0]), 'left')}
        </div>
        <div className="flex-1 w-full sm:w-auto">
          {renderTrickCenter()}
        </div>
        <div className="flex-shrink-0 hidden sm:block">
          {rightPlayer && renderOpponentHand(Number(rightPlayer[0]), 'right')}
        </div>
        {/* On mobile, show left/right players inline below the trick */}
        <div className="flex sm:hidden gap-3 justify-center w-full">
          {leftPlayer && renderOpponentHand(Number(leftPlayer[0]), 'top')}
          {rightPlayer && renderOpponentHand(Number(rightPlayer[0]), 'top')}
        </div>
      </div>

      {/* Current player's hand */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2" aria-live="polite">
          <span className="text-sm font-medium">{t('jass.playerTurn', { player: currentPlayer + 1 })}</span>
          <Badge variant={teams[0].includes(currentPlayer) ? 'info' : 'warning'}>
            {t(teams[0].includes(currentPlayer) ? 'jass.teamA' : 'jass.teamB')}
          </Badge>
        </div>

        <div className="flex flex-wrap justify-center items-end gap-0.5 sm:gap-0">
          {(hands[currentPlayer] || []).map((card, i) => (
            <div key={card.id} className="sm:-ml-2 first:ml-0 hover:z-10 transition-all">
              <JassCard
                card={card}
                isPlayable={playableCards.includes(i)}
                onClick={playableCards.includes(i) ? () => onPlayCard(i) : undefined}
                size="md"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Trick history */}
      {renderHistory()}
    </div>
  );
}
