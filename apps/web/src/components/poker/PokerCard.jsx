import { memo } from 'react';

const SIZE_CLASSES = {
  sm: 'w-10 h-14 rounded-lg',
  md: 'w-14 h-20 rounded-xl',
  lg: 'w-18 h-26 rounded-xl',
};

const VALUE_TO_RANK = {
  'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack',
};

function getCardImage(card) {
  const rank = VALUE_TO_RANK[card.value] || card.value;
  return `/assets/cards/${rank}_of_${card.suit}.png`;
}

export const PokerCard = memo(function PokerCard({ card, faceDown = false, community = false, size = 'md' }) {
  if (faceDown) {
    return (
      <div className={`${SIZE_CLASSES[size]} overflow-hidden select-none`}>
        <img src="/assets/cards/back.png" alt="card back" className="w-full h-full object-contain" draggable={false} />
      </div>
    );
  }

  return (
    <div
      className={`
        ${SIZE_CLASSES[size]}
        bg-white border border-gray-300 overflow-hidden select-none p-0.5
        ${community ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/20' : ''}
      `}
    >
      <img src={getCardImage(card)} alt={`${card.value} of ${card.suit}`} className="w-full h-full object-contain" draggable={false} />
    </div>
  );
});
