import { useState } from 'react';

export function GoBoard({ engine, onPlaceStone, disabled }) {
  const [hover, setHover] = useState(null);
  const size = engine.size;
  const cellSize = size <= 9 ? 36 : size <= 13 ? 28 : 22;
  const stoneRadius = Math.floor(cellSize / 2) - 2;
  const padding = cellSize;
  const boardPx = cellSize * (size - 1) + padding * 2;
  const hoshi = engine.getHoshi();
  const territoryMap = engine.territory?.map;

  return (
    <div className="overflow-x-auto max-w-full shrink-0">
      <svg
        width={boardPx}
        height={boardPx}
        viewBox={`0 0 ${boardPx} ${boardPx}`}
        className="select-none max-w-full h-auto"
        style={{ background: '#DCB35C' }}
        role="grid"
        aria-label={`Go board ${size} by ${size}`}
      >
        {/* Grid lines */}
        {Array.from({ length: size }, (_, i) => {
          const pos = padding + i * cellSize;
          return (
            <g key={`lines-${i}`}>
              <line
                x1={padding} y1={pos}
                x2={padding + (size - 1) * cellSize} y2={pos}
                stroke="#5C4033" strokeWidth={i === 0 || i === size - 1 ? 1.5 : 0.8}
              />
              <line
                x1={pos} y1={padding}
                x2={pos} y2={padding + (size - 1) * cellSize}
                stroke="#5C4033" strokeWidth={i === 0 || i === size - 1 ? 1.5 : 0.8}
              />
            </g>
          );
        })}

        {/* Hoshi points */}
        {hoshi.map(([r, c]) => (
          <circle
            key={`hoshi-${r}-${c}`}
            cx={padding + c * cellSize}
            cy={padding + r * cellSize}
            r={3}
            fill="#5C4033"
          />
        ))}

        {/* Territory markers (scoring phase) */}
        {territoryMap && Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => {
            if (engine.board[r][c] !== null || !territoryMap[r][c]) return null;
            const color = territoryMap[r][c] === 'black' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)';
            return (
              <rect
                key={`terr-${r}-${c}`}
                x={padding + c * cellSize - cellSize / 4}
                y={padding + r * cellSize - cellSize / 4}
                width={cellSize / 2}
                height={cellSize / 2}
                fill={color}
                rx={2}
              />
            );
          })
        )}

        {/* Clickable intersections (invisible) */}
        {!disabled && Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => (
            <rect
              key={`click-${r}-${c}`}
              x={padding + c * cellSize - cellSize / 2}
              y={padding + r * cellSize - cellSize / 2}
              width={cellSize}
              height={cellSize}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => onPlaceStone(r, c)}
              onMouseEnter={() => setHover([r, c])}
              onMouseLeave={() => setHover(null)}
            />
          ))
        )}

        {/* Hover preview */}
        {hover && !disabled && engine.board[hover[0]][hover[1]] === null && (
          <circle
            cx={padding + hover[1] * cellSize}
            cy={padding + hover[0] * cellSize}
            r={stoneRadius}
            fill={engine.currentPlayer === 'black' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)'}
            pointerEvents="none"
          />
        )}

        {/* Stones */}
        {Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => {
            const stone = engine.board[r][c];
            if (!stone) return null;
            const cx = padding + c * cellSize;
            const cy = padding + r * cellSize;
            const isLast = engine.lastMove && engine.lastMove[0] === r && engine.lastMove[1] === c;
            return (
              <g key={`stone-${r}-${c}`}>
                {/* Shadow */}
                <circle cx={cx + 1.5} cy={cy + 1.5} r={stoneRadius} fill="rgba(0,0,0,0.2)" />
                {/* Stone */}
                <circle
                  cx={cx} cy={cy} r={stoneRadius}
                  fill={stone === 'black' ? '#1a1a1a' : '#f5f5f5'}
                  stroke={stone === 'black' ? '#000' : '#ccc'}
                  strokeWidth={0.5}
                />
                {/* Gradient highlight for white stones */}
                {stone === 'white' && (
                  <circle
                    cx={cx - stoneRadius * 0.25}
                    cy={cy - stoneRadius * 0.25}
                    r={stoneRadius * 0.35}
                    fill="rgba(255,255,255,0.6)"
                  />
                )}
                {/* Last move indicator */}
                {isLast && (
                  <circle
                    cx={cx} cy={cy} r={stoneRadius * 0.3}
                    fill={stone === 'black' ? '#fff' : '#333'}
                  />
                )}
              </g>
            );
          })
        )}

        {/* Coordinate labels */}
        {Array.from({ length: size }, (_, i) => {
          const letter = String.fromCharCode(65 + (i >= 8 ? i + 1 : i)); // Skip 'I'
          return (
            <g key={`label-${i}`}>
              <text
                x={padding + i * cellSize}
                y={padding - cellSize * 0.55}
                textAnchor="middle"
                fontSize={10}
                fill="#5C4033"
              >
                {letter}
              </text>
              <text
                x={padding + i * cellSize}
                y={padding + (size - 1) * cellSize + cellSize * 0.7}
                textAnchor="middle"
                fontSize={10}
                fill="#5C4033"
              >
                {letter}
              </text>
              <text
                x={padding - cellSize * 0.55}
                y={padding + (size - 1 - i) * cellSize + 4}
                textAnchor="middle"
                fontSize={10}
                fill="#5C4033"
              >
                {i + 1}
              </text>
              <text
                x={padding + (size - 1) * cellSize + cellSize * 0.55}
                y={padding + (size - 1 - i) * cellSize + 4}
                textAnchor="middle"
                fontSize={10}
                fill="#5C4033"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
