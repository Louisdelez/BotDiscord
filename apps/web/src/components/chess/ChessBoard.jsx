import { ChessSquare } from './ChessSquare';

const COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function ChessBoard({ board, selectedSquare, legalMoves, lastMove, onSquareClick }) {
  return (
    <div className="overflow-x-auto max-w-full shrink-0">
      <div className="inline-block">
        <div className="flex">
          <div className="flex flex-col justify-around pr-1 text-xs text-[var(--text-secondary)]" aria-hidden="true">
            {[8, 7, 6, 5, 4, 3, 2, 1].map(r => (
              <span key={r} className="w-4 h-9 sm:h-14 md:h-16 flex items-center justify-center">{r}</span>
            ))}
          </div>
          <div className="grid grid-cols-8 rounded-xl overflow-hidden border border-[var(--border)]" role="grid" aria-label="Chess board">
            {board.map((row, ri) =>
              row.map((cell, ci) => {
                const square = COLS[ci] + (8 - ri);
                const isDark = (ri + ci) % 2 === 1;
                return (
                  <ChessSquare
                    key={square}
                    piece={cell ? (cell.color === 'w' ? cell.type.toUpperCase() : cell.type.toLowerCase()) : null}
                    isDark={isDark}
                    isSelected={selectedSquare === square}
                    isLegalMove={legalMoves.includes(square)}
                    isLastMove={lastMove && (lastMove.from === square || lastMove.to === square)}
                    onClick={() => onSquareClick(square)}
                    square={square}
                  />
                );
              })
            )}
          </div>
        </div>
        <div className="flex pl-5" aria-hidden="true">
          {COLS.map(c => (
            <span key={c} className="w-9 sm:w-14 md:w-16 text-center text-xs text-[var(--text-secondary)]">{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
