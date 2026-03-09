import { memo } from 'react';

const PIECE_IMAGES = {
  K: '/assets/chess/wK.svg',
  Q: '/assets/chess/wQ.svg',
  R: '/assets/chess/wR.svg',
  B: '/assets/chess/wB.svg',
  N: '/assets/chess/wN.svg',
  P: '/assets/chess/wP.svg',
  k: '/assets/chess/bK.svg',
  q: '/assets/chess/bQ.svg',
  r: '/assets/chess/bR.svg',
  b: '/assets/chess/bB.svg',
  n: '/assets/chess/bN.svg',
  p: '/assets/chess/bP.svg',
};

const PIECE_NAMES = {
  K: 'White King', Q: 'White Queen', R: 'White Rook', B: 'White Bishop', N: 'White Knight', P: 'White Pawn',
  k: 'Black King', q: 'Black Queen', r: 'Black Rook', b: 'Black Bishop', n: 'Black Knight', p: 'Black Pawn',
};

export const ChessSquare = memo(function ChessSquare({ piece, isDark, isSelected, isLegalMove, isLastMove, onClick, square }) {
  const label = piece ? `${PIECE_NAMES[piece]} on ${square}` : `Empty square ${square}${isLegalMove ? ' (legal move)' : ''}`;
  return (
    <button
      onClick={onClick}
      aria-label={label}
      role="gridcell"
      className={`
        w-9 h-9 sm:w-14 sm:h-14 md:w-16 md:h-16
        flex items-center justify-center relative
        cursor-pointer select-none transition-colors
        ${isDark ? 'bg-[var(--bg-tertiary)]' : 'bg-[var(--bg-secondary)]'}
        ${isSelected ? 'ring-2 ring-inset ring-[var(--accent)]' : ''}
        ${isLastMove ? 'bg-[var(--accent)]/15' : ''}
      `}
    >
      {isLegalMove && !piece && (
        <span className="absolute w-3 h-3 rounded-full bg-[var(--accent)]/40" />
      )}
      {isLegalMove && piece && (
        <span className="absolute inset-0 ring-2 ring-inset ring-[var(--accent)]/40 rounded-sm" />
      )}
      {piece && (
        <img
          src={PIECE_IMAGES[piece]}
          alt={PIECE_NAMES[piece]}
          className="w-7 h-7 sm:w-11 sm:h-11 md:w-14 md:h-14 drop-shadow-sm"
          draggable={false}
        />
      )}
    </button>
  );
});
