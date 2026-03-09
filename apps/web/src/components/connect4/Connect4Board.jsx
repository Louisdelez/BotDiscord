import { useState } from 'react';

const ROWS = 6;
const COLS = 7;

export function Connect4Board({ game, onDrop }) {
  const [hoverCol, setHoverCol] = useState(null);

  const isWinningCell = (r, c) =>
    game.winningCells.some(cell => cell.row === r && cell.col === c);

  const previewRow = hoverCol !== null ? game.getLowestRow(hoverCol) : -1;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Column hover buttons */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 w-full max-w-[420px]">
        {Array.from({ length: COLS }, (_, c) => (
          <button
            key={c}
            onClick={() => game.canDrop(c) && onDrop(c)}
            onMouseEnter={() => setHoverCol(c)}
            onMouseLeave={() => setHoverCol(null)}
            disabled={!game.canDrop(c)}
            className="h-6 sm:h-8 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 transition-opacity"
            aria-label={`Column ${c + 1}`}
          >
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full transition-colors ${
                hoverCol === c && game.canDrop(c)
                  ? game.currentPlayer === 1
                    ? 'bg-red-500/60'
                    : 'bg-yellow-400/60'
                  : 'bg-transparent'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="bg-blue-600 rounded-2xl p-2 sm:p-3 shadow-lg w-full max-w-[420px]">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" aria-label="Connect 4 board">
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const cell = game.grid[r][c];
              const isWin = isWinningCell(r, c);
              const isPreview = hoverCol === c && r === previewRow && cell === 0;

              let cellClass = 'bg-white/20';
              if (cell === 1) cellClass = 'bg-red-500';
              else if (cell === 2) cellClass = 'bg-yellow-400';
              else if (isPreview) {
                cellClass = game.currentPlayer === 1 ? 'bg-red-500/30' : 'bg-yellow-400/30';
              }

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => game.canDrop(c) && onDrop(c)}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                  role="gridcell"
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all cursor-pointer ${cellClass} ${
                    isWin ? 'ring-4 ring-white scale-105' : ''
                  }`}
                  aria-label={`Row ${r + 1}, Column ${c + 1}${cell === 1 ? ' - Red' : cell === 2 ? ' - Yellow' : ' - Empty'}${isWin ? ' - Winning' : ''}`}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
