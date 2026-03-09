import { memo } from 'react';

const PIECE_TO_CODE = {
  K: 'OU', R: 'HI', B: 'KA', G: 'KI', S: 'GI', N: 'KE', L: 'KY', P: 'FU',
};

const PROMOTED_TO_CODE = {
  R: 'RY', B: 'UM', S: 'NG', N: 'NK', L: 'NY', P: 'TO',
};

function getPieceImage(piece) {
  const prefix = piece.owner === 'sente' ? '0' : '1';
  const code = piece.promoted && PROMOTED_TO_CODE[piece.type]
    ? PROMOTED_TO_CODE[piece.type]
    : PIECE_TO_CODE[piece.type];
  return `/assets/shogi/${prefix}${code}.svg`;
}

export const ShogiSquare = memo(function ShogiSquare({ piece, isSelected, isLegalMove, isLastMove, onClick }) {
  const label = piece
    ? `${piece.promoted ? 'Promoted ' : ''}${piece.type} (${piece.owner})${isLegalMove ? ' - legal move' : ''}`
    : `Empty${isLegalMove ? ' - legal move' : ''}`;
  return (
    <button
      onClick={onClick}
      aria-label={label}
      role="gridcell"
      className={`
        w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14
        flex items-center justify-center relative
        cursor-pointer select-none transition-colors
        bg-[var(--bg-secondary)] border border-[var(--border)]/30
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
          src={getPieceImage(piece)}
          alt={`${piece.promoted ? 'Promoted ' : ''}${piece.type}`}
          className="w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 drop-shadow-sm"
          draggable={false}
        />
      )}
    </button>
  );
});

const HAND_PIECE_CODE = {
  P: 'FU', L: 'KY', N: 'KE', S: 'GI', G: 'KI', B: 'KA', R: 'HI',
};

export const HandPiece = memo(function HandPiece({ type, count, owner, isSelected, onClick }) {
  if (count <= 0) return null;
  const prefix = owner === 'sente' ? '0' : '1';
  const code = HAND_PIECE_CODE[type];

  return (
    <button
      onClick={onClick}
      aria-label={`${owner} ${type} in hand, ${count} available`}
      className={`
        flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer select-none transition-colors
        ${isSelected ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'}
      `}
    >
      <img
        src={`/assets/shogi/${prefix}${code}.svg`}
        alt={`${type} piece`}
        className="w-6 h-6"
        draggable={false}
      />
      <span className="text-xs font-bold">×{count}</span>
    </button>
  );
});
