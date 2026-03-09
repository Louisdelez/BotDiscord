import { memo } from 'react';

const SIZE_CLASSES = {
  sm: 'w-12 h-[4.5rem] rounded-lg',
  md: 'w-16 h-24 rounded-xl',
  lg: 'w-20 h-[7.5rem] rounded-xl',
};

function getCardImage(card) {
  const base = '/assets/uno';
  if (card.type === 'wild') return `${base}/wild.png`;
  if (card.type === 'wild4') return `${base}/wild_draw4.png`;
  if (card.type === 'number') return `${base}/${card.color}_${card.value}.png`;
  if (card.type === 'draw2') return `${base}/${card.color}_draw2.png`;
  return `${base}/${card.color}_${card.type}.png`;
}

export const UnoCard = memo(function UnoCard({ card, isPlayable = false, isSelected = false, faceDown = false, onClick, size = 'md' }) {
  if (faceDown) {
    return (
      <button
        onClick={onClick}
        aria-label="Draw card"
        className={`${SIZE_CLASSES[size]} bg-gray-900 border-2 border-gray-700 flex items-center justify-center font-bold select-none transition-all cursor-pointer hover:scale-105 overflow-hidden`}
      >
        <div className="w-[60%] h-[55%] rounded-[50%] bg-red-600 flex items-center justify-center rotate-[-20deg]">
          <span className="text-yellow-300 font-extrabold text-[0.6em] tracking-tight" style={{ textShadow: '1px 1px 0 #000' }}>UNO</span>
        </div>
      </button>
    );
  }

  const src = getCardImage(card);

  const cardLabel = card.type === 'wild' ? 'Wild' : card.type === 'wild4' ? 'Wild Draw 4' : `${card.color} ${card.type} ${card.value ?? ''}`.trim();
  return (
    <button
      onClick={onClick}
      disabled={onClick && !isPlayable && !faceDown}
      aria-label={`${cardLabel}${isPlayable ? ' (playable)' : ''}`}
      className={`
        ${SIZE_CLASSES[size]}
        overflow-hidden select-none transition-all
        ${isPlayable ? 'cursor-pointer hover:scale-110 hover:-translate-y-1' : 'cursor-default opacity-70'}
        ${isSelected ? 'ring-2 ring-[var(--accent)] scale-110 -translate-y-2' : ''}
        ${!onClick ? 'cursor-default' : ''}
      `}
    >
      <img src={src} alt={`${card.color} ${card.type} ${card.value ?? ''}`} className="w-full h-full object-contain" draggable={false} />
    </button>
  );
});
