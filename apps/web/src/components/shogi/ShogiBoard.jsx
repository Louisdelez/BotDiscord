import { ShogiSquare, HandPiece } from './ShogiSquare';

const COL_LABELS = ['9', '8', '7', '6', '5', '4', '3', '2', '1'];
const ROW_LABELS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const HAND_PIECE_TYPES = ['R', 'B', 'G', 'S', 'N', 'L', 'P'];

export function ShogiBoard({
  board,
  selectedSquare,
  legalMoves,
  lastMove,
  senteHand,
  goteHand,
  turn,
  onSquareClick,
  onHandPieceClick,
  selectedHandPiece,
}) {
  return (
    <div className="overflow-x-auto max-w-full shrink-0">
      <div className="inline-block">
      {/* Gote's hand (top) */}
      <div className="flex gap-1 mb-2 min-h-[32px] flex-wrap items-center" role="group" aria-label="Gote captured pieces">
        <span className="text-xs text-[var(--text-secondary)] mr-1 rotate-180" aria-hidden="true">☖</span>
        {HAND_PIECE_TYPES.map(type => (
          <HandPiece
            key={type}
            type={type}
            count={goteHand[type]}
            owner="gote"
            isSelected={selectedHandPiece?.type === type && selectedHandPiece?.owner === 'gote'}
            onClick={() => onHandPieceClick(type, 'gote')}
          />
        ))}
      </div>

      {/* Board */}
      <div className="flex">
        <div className="flex flex-col justify-around pr-1 text-xs text-[var(--text-secondary)]" aria-hidden="true">
          {ROW_LABELS.map(label => (
            <span key={label} className="w-4 h-8 sm:h-12 md:h-14 flex items-center justify-center">{label}</span>
          ))}
        </div>
        <div>
          {/* Column labels */}
          <div className="flex" aria-hidden="true">
            {COL_LABELS.map(label => (
              <span key={label} className="w-8 sm:w-12 md:w-14 text-center text-xs text-[var(--text-secondary)]">{label}</span>
            ))}
          </div>
          {/* Grid */}
          <div className="grid grid-cols-9 border border-[var(--border)] rounded-lg overflow-hidden" role="grid" aria-label="Shogi board">
            {board.map((row, ri) =>
              row.map((cell, ci) => {
                const isSelected = selectedSquare?.row === ri && selectedSquare?.col === ci;
                const isLegal = legalMoves.some(m => m.toRow === ri && m.toCol === ci);
                const isLast = lastMove && (
                  (lastMove.from?.row === ri && lastMove.from?.col === ci) ||
                  (lastMove.to?.row === ri && lastMove.to?.col === ci)
                );
                return (
                  <ShogiSquare
                    key={`${ri}-${ci}`}
                    piece={cell}
                    isSelected={isSelected}
                    isLegalMove={isLegal}
                    isLastMove={isLast}
                    onClick={() => onSquareClick(ri, ci)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Sente's hand (bottom) */}
      <div className="flex gap-1 mt-2 min-h-[32px] flex-wrap items-center" role="group" aria-label="Sente captured pieces">
        <span className="text-xs text-[var(--text-secondary)] mr-1" aria-hidden="true">☗</span>
        {HAND_PIECE_TYPES.map(type => (
          <HandPiece
            key={type}
            type={type}
            count={senteHand[type]}
            owner="sente"
            isSelected={selectedHandPiece?.type === type && selectedHandPiece?.owner === 'sente'}
            onClick={() => onHandPieceClick(type, 'sente')}
          />
        ))}
      </div>
    </div>
    </div>
  );
}
