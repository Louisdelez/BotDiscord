import { memo } from 'react';
import { useT } from '../../lib/i18n';

const WIND_SYMBOLS = { east: '東', south: '南', west: '西', north: '北' };

const WIND_FILE = { east: 'Ton', south: 'Nan', west: 'Shaa', north: 'Pei' };
const DRAGON_FILE = { white: 'Haku', green: 'Hatsu', red: 'Chun' };
const SUIT_FILE = { man: 'Man', pin: 'Pin', sou: 'Sou' };

function tileImage(tile) {
  if (tile.suit === 'wind') return `/assets/mahjong/${WIND_FILE[tile.value]}.svg`;
  if (tile.suit === 'dragon') return `/assets/mahjong/${DRAGON_FILE[tile.value]}.svg`;
  return `/assets/mahjong/${SUIT_FILE[tile.suit]}${tile.value}.svg`;
}

const Tile = memo(function Tile({ tile, onClick, disabled, highlight, small }) {
  const size = small
    ? 'w-8 h-10 sm:w-9 sm:h-11'
    : 'w-10 h-13 sm:w-12 sm:h-15';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`${tile.suit} ${tile.value}${highlight ? ' (highlighted)' : ''}`}
      className={`
        ${size} rounded-md overflow-hidden select-none transition-all
        ${highlight ? 'ring-2 ring-[var(--accent)] -translate-y-1' : ''}
        ${!disabled ? 'hover:-translate-y-0.5 cursor-pointer' : 'opacity-80'}
      `}
    >
      <img
        src={tileImage(tile)}
        alt={`${tile.suit} ${tile.value}`}
        className="w-full h-full object-contain drop-shadow-sm"
        draggable={false}
      />
    </button>
  );
});

const TileBack = memo(function TileBack({ small }) {
  const size = small
    ? 'w-8 h-10 sm:w-9 sm:h-11'
    : 'w-10 h-13 sm:w-12 sm:h-15';

  return (
    <div className={`${size} rounded-md overflow-hidden`}>
      <img
        src="/assets/mahjong/Back.svg"
        alt="back"
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
});

const ExposedSet = memo(function ExposedSet({ set }) {
  return (
    <div className="flex gap-0.5 mr-2">
      {set.tiles.map(tile => (
        <Tile key={tile.id} tile={tile} disabled small />
      ))}
    </div>
  );
});

const PLAYER_WINDS = ['east', 'south', 'west', 'north'];

export function MahjongBoard({ game, activePlayer, onDiscard, onPung, onChi, onKong, onMahjong, onPass, chiOptions }) {
  const t = useT();

  const player = game.players[activePlayer];
  const isCurrentPlayer = game.currentPlayer === activePlayer;
  const canDiscard = isCurrentPlayer && game.turnPhase === 'discard';

  // Check claims for active player
  const myClaim = game.pendingClaims.find(c => c.player === activePlayer);
  const canClaimPung = myClaim?.claims.includes('pung');
  const canClaimChi = myClaim?.claims.includes('chi');
  const canClaimKong = myClaim?.claims.includes('kong');
  const canClaimMahjong = myClaim?.claims.includes('mahjong');

  // Self-drawn win
  const canSelfWin = isCurrentPlayer && game.turnPhase === 'discard' && game.checkWin(activePlayer);

  const showClaimButtons = game.turnPhase === 'claim' && myClaim;

  return (
    <div className="space-y-4">
      {/* Other players (top area) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map(offset => {
          const idx = (activePlayer + offset) % 4;
          const p = game.players[idx];
          const isCurrent = game.currentPlayer === idx;
          return (
            <div key={idx} className={`rounded-xl p-3 ${isCurrent ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' : 'bg-[var(--bg-secondary)]'}`} aria-current={isCurrent ? 'true' : undefined}>
              <p className="text-xs font-medium mb-1.5 flex items-center gap-1">
                <span aria-hidden="true">{WIND_SYMBOLS[PLAYER_WINDS[idx]]}</span>
                {t(`mahjong.player${idx + 1}`)}
                {isCurrent && <span className="text-[var(--accent)]" aria-label="Current turn"> ●</span>}
              </p>
              <div className="flex gap-0.5 flex-wrap mb-1.5">
                {p.hand.map((_, i) => <TileBack key={i} small />)}
              </div>
              {p.exposed.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.exposed.map((set, i) => <ExposedSet key={i} set={set} />)}
                </div>
              )}
              {p.discards.length > 0 && (
                <div className="flex gap-0.5 flex-wrap mt-1.5">
                  {p.discards.map(tile => (
                    <Tile key={tile.id} tile={tile} disabled small />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Center info */}
      <div className="flex items-center justify-center gap-4 text-sm flex-wrap" aria-live="polite">
        <span className="text-[var(--text-secondary)]">
          {t('mahjong.tilesRemaining')}: <span className="font-bold text-[var(--text-primary)]">{game.getTilesRemaining()}</span>
        </span>
        {game.lastDiscard && game.turnPhase === 'claim' && (
          <span className="flex items-center gap-1.5">
            {t('mahjong.lastDiscard')}:
            <Tile tile={game.lastDiscard} disabled highlight small />
          </span>
        )}
      </div>

      {/* Active player hand */}
      <div className={`rounded-xl p-4 ${isCurrentPlayer ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' : 'bg-[var(--bg-secondary)]'}`} aria-current={isCurrentPlayer ? 'true' : undefined}>
        <p className="text-sm font-medium mb-2 flex items-center gap-1" aria-live="polite">
          <span aria-hidden="true">{WIND_SYMBOLS[PLAYER_WINDS[activePlayer]]}</span>
          {t(`mahjong.player${activePlayer + 1}`)}
          {isCurrentPlayer && <span className="text-[var(--accent)]"> — {t('mahjong.yourTurn')}</span>}
        </p>

        {/* Exposed sets */}
        {player.exposed.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {player.exposed.map((set, i) => <ExposedSet key={i} set={set} />)}
          </div>
        )}

        {/* Hand tiles */}
        <div className="flex gap-1 flex-wrap">
          {player.hand.map((tile, idx) => (
            <Tile
              key={tile.id}
              tile={tile}
              onClick={() => canDiscard && onDiscard(idx)}
              disabled={!canDiscard}
            />
          ))}
        </div>

        {/* Discards */}
        {player.discards.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-[var(--text-secondary)] mb-1">{t('mahjong.discard')}</p>
            <div className="flex gap-0.5 flex-wrap">
              {player.discards.map(tile => (
                <Tile key={tile.id} tile={tile} disabled small />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {showClaimButtons && (
          <>
            {canClaimMahjong && (
              <button onClick={onMahjong} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer">
                {t('mahjong.mahjong')} 🀄
              </button>
            )}
            {canClaimKong && (
              <button onClick={onKong} className="px-4 py-2 rounded-xl text-sm font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors cursor-pointer">
                {t('mahjong.kong')}
              </button>
            )}
            {canClaimPung && (
              <button onClick={onPung} className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors cursor-pointer">
                {t('mahjong.pung')}
              </button>
            )}
            {canClaimChi && chiOptions.map((opt, i) => (
              <button key={i} onClick={() => onChi(opt)} className="px-4 py-2 rounded-xl text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors cursor-pointer">
                {t('mahjong.chi')} ({opt.join('-')})
              </button>
            ))}
            <button onClick={onPass} className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer">
              {t('mahjong.pass')}
            </button>
          </>
        )}
        {canSelfWin && (
          <button onClick={onMahjong} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer">
            {t('mahjong.mahjong')} 🀄
          </button>
        )}
      </div>
    </div>
  );
}
