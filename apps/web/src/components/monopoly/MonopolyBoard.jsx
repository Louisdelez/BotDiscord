import { useState, memo } from 'react';
import { Dices, Home, Hammer, HandCoins, Handshake, Ban, ChevronRight, RotateCw } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SPACES, PLAYER_COLORS, PLAYER_TOKENS, PLAYER_TOKEN_IMAGES, COLOR_GROUPS, RAILROAD_INDICES, UTILITY_INDICES } from './MonopolyData';
import { useT } from '../../lib/i18n';

// Map board position (0-39) to CSS grid coordinates (row, col) in an 11×11 grid
function getGridPosition(index) {
  if (index === 0) return { row: 10, col: 10 }; // GO — bottom-right
  if (index >= 1 && index <= 9) return { row: 10, col: 10 - index }; // bottom row, right to left
  if (index === 10) return { row: 10, col: 0 }; // Jail — bottom-left
  if (index >= 11 && index <= 19) return { row: 10 - (index - 10), col: 0 }; // left column, bottom to top
  if (index === 20) return { row: 0, col: 0 }; // Free Parking — top-left
  if (index >= 21 && index <= 29) return { row: 0, col: index - 20 }; // top row, left to right
  if (index === 30) return { row: 0, col: 10 }; // Go To Jail — top-right
  if (index >= 31 && index <= 39) return { row: index - 30, col: 10 }; // right column, top to bottom
  return { row: 0, col: 0 };
}

function getColorBandSide(index) {
  if (index >= 1 && index <= 9) return 'top';
  if (index >= 11 && index <= 19) return 'right';
  if (index >= 21 && index <= 29) return 'bottom';
  if (index >= 31 && index <= 39) return 'left';
  return null;
}

// Which side of the board is this space on? Corners are assigned to their row side.
function getBoardSide(index) {
  if (index === 0 || index === 10) return 'bottom'; // bottom corners
  if (index === 20 || index === 30) return 'top';    // top corners → 180°
  if (index >= 1 && index <= 9) return 'bottom';
  if (index >= 11 && index <= 19) return 'left';
  if (index >= 21 && index <= 29) return 'top';
  if (index >= 31 && index <= 39) return 'right';
  return 'bottom';
}

const SPACE_ICONS = {
  go: '/assets/monopoly/arrow_icon.png',
  chance: '/assets/monopoly/chance_icon.png',
  community: '/assets/monopoly/community_chest_icon.png',
  tax: '/assets/monopoly/tax_icon.png',
  railroad: '/assets/monopoly/train_icon.png',
  'jail-visit': '/assets/monopoly/jake_icon.png',
  'free-parking': '/assets/monopoly/free_parking_icon.png',
  'go-to-jail': '/assets/monopoly/jake_icon.png',
};

const SpaceIcon = memo(function SpaceIcon({ space, isCorner }) {
  const style = isCorner
    ? { width: '8cqi', height: '8cqi' }
    : { width: '6cqi', height: '6cqi' };
  if (space.type === 'utility') {
    const src = space.index === 12 ? '/assets/monopoly/electric_icon.png' : '/assets/monopoly/water_icon.png';
    return <img src={src} alt={space.name} className="object-contain" style={style} draggable={false} />;
  }
  const src = SPACE_ICONS[space.type];
  if (src) return <img src={src} alt={space.type} className="object-contain" style={style} draggable={false} />;
  return null;
});

const PlayerToken = memo(function PlayerToken({ player, size }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 border border-white/50 shadow-sm"
      style={{ width: size, height: size, backgroundColor: PLAYER_COLORS[player.index] }}
    >
      <img
        src={PLAYER_TOKEN_IMAGES[player.index]}
        alt={`P${player.index + 1}`}
        className="object-contain drop-shadow-sm"
        style={{ width: `calc(${size} * 0.65)`, height: `calc(${size} * 0.65)` }}
        draggable={false}
      />
    </div>
  );
});

// Inner content for a cell rendered in "portrait" orientation (like bottom row).
// Color band at top, name below, icon in center, price at bottom.
// This gets rotated by the parent for other sides.
function CellContent({ space, property, playersHere, isCorner }) {
  const hasColor = !!space.color;
  const isProperty = space.type === 'property';

  // Corner cells: big icon + name, no color band
  if (isCorner) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center overflow-hidden gap-[0.3cqi]" style={{ padding: '0.3cqi' }}>
        <SpaceIcon space={space} isCorner />
        <span className="leading-[1.2] text-center font-extrabold text-black uppercase break-words w-full" style={{ fontSize: '1.3cqi' }}>
          {space.name}
        </span>
        {playersHere.length > 0 && (
          <div className="flex flex-wrap gap-[0.3cqi] justify-center">
            {playersHere.map(p => (
              <PlayerToken key={p.index} player={p} size="3.2cqi" />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Regular cells: name, icon, price (color band is rendered by BoardSpace)
  return (
    <div className="w-full h-full flex flex-col items-center justify-between overflow-hidden" style={{ padding: '0.1cqi' }}>
        {/* Name at top */}
        <span className="leading-[1.15] text-center font-bold text-black uppercase break-words w-full overflow-hidden" style={{ fontSize: '1cqi', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {space.name}
        </span>

        {/* Icon — centered */}
        {!isProperty && (
          <div className="flex-1 flex items-center justify-center">
            <SpaceIcon space={space} />
          </div>
        )}

        {/* Houses / Hotel */}
        {property && property.houses > 0 && (
          <div className="flex gap-[0.1cqi] justify-center">
            {property.houses === 5 ? (
              <img src="/assets/monopoly/hotel.png" alt="hotel" className="object-contain" style={{ width: '1.5cqi', height: '1.5cqi' }} draggable={false} />
            ) : (
              Array.from({ length: property.houses }).map((_, i) => (
                <img key={i} src="/assets/monopoly/house.png" alt="house" className="object-contain" style={{ width: '1.2cqi', height: '1.2cqi' }} draggable={false} />
              ))
            )}
          </div>
        )}

        {/* Player tokens */}
        {playersHere.length > 0 && (
          <div className="flex flex-wrap gap-[0.2cqi] justify-center">
            {playersHere.map(p => (
              <PlayerToken key={p.index} player={p} size="2.8cqi" />
            ))}
          </div>
        )}

        {/* Price at bottom */}
        {space.price && (
          <span className="text-black font-bold flex-shrink-0" style={{ fontSize: '1cqi' }}>M{space.price}</span>
        )}
    </div>
  );
}

const BoardSpace = memo(function BoardSpace({ space, property, playersHere, isCorner, side }) {
  const bandSide = getColorBandSide(space.index);
  const hasColor = !!space.color;

  // Text rotation per side
  const rotation = side === 'top' ? 180 : side === 'left' ? 90 : side === 'right' ? -90 : 0;

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${property?.mortgaged ? 'opacity-50' : ''}`}
      style={{ backgroundColor: '#d5e8d0', outline: '0.5px solid rgba(0,0,0,0.5)' }}
    >
      {/* Color band — absolutely positioned, NOT rotated, always flush with edge */}
      {hasColor && bandSide && (
        <div
          className={`absolute z-0 ${
            bandSide === 'top' ? 'top-0 left-0 right-0' :
            bandSide === 'bottom' ? 'bottom-0 left-0 right-0' :
            bandSide === 'left' ? 'top-0 bottom-0 left-0' :
            'top-0 bottom-0 right-0'
          }`}
          style={{
            backgroundColor: space.color,
            ...(bandSide === 'top' || bandSide === 'bottom'
              ? { height: '25%', borderBottom: bandSide === 'top' ? '0.5px solid rgba(0,0,0,0.3)' : undefined, borderTop: bandSide === 'bottom' ? '0.5px solid rgba(0,0,0,0.3)' : undefined }
              : { width: '25%', borderLeft: bandSide === 'right' ? '0.5px solid rgba(0,0,0,0.3)' : undefined, borderRight: bandSide === 'left' ? '0.5px solid rgba(0,0,0,0.3)' : undefined }),
          }}
        />
      )}

      {/* Content — positioned in the area outside the color band, rotated to face outward */}
      <div
        className="absolute z-10 flex items-center justify-center overflow-hidden"
        style={{
          top: bandSide === 'top' && hasColor ? '25%' : 0,
          bottom: bandSide === 'bottom' && hasColor ? '25%' : 0,
          left: bandSide === 'left' && hasColor ? '25%' : 0,
          right: bandSide === 'right' && hasColor ? '25%' : 0,
        }}
      >
        <div
          className="flex flex-col items-center justify-center w-full h-full"
          style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
        >
          <CellContent
            space={space}
            property={property}
            playersHere={playersHere}
            isCorner={isCorner}
          />
        </div>
      </div>
    </div>
  );
});

function PlayerInfo({ player, engine, isCurrent, t }) {
  const propCount = player.properties.length;
  const netWorth = engine.getPlayerNetWorth(player.index);

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg ${isCurrent ? 'bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]' : 'bg-[var(--bg-secondary)]'} ${player.bankrupt ? 'opacity-40' : ''}`}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <img src={PLAYER_TOKEN_IMAGES[player.index]} alt={`Player ${player.index + 1} token`} className="w-5 h-5 object-contain flex-shrink-0" draggable={false} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {t('monopoly.playerLabel', { n: player.index + 1 })}
          {player.bankrupt && <span className="text-[var(--danger)] ml-1">✗</span>}
          {player.inJail && <span className="ml-1">🔒</span>}
        </p>
        <p className="text-[10px] text-[var(--text-secondary)]">
          {player.money}€ | {propCount} {t('monopoly.props')} | {netWorth}€
        </p>
      </div>
    </div>
  );
}

export function MonopolyBoard({ engine, onRollDice, onBuy, onDeclineBuy, onAuctionBid, onAuctionPass, onBuild, onSellHouse, onMortgage, onUnmortgage, onEndTurn, onTrade, onPayJailFine, onUseJailFreeCard, onResolveCard, onDeclareBankruptcy, auctionBidAmount, setAuctionBidAmount }) {
  const t = useT();
  const player = engine.players[engine.currentPlayer];
  const [boardRotation, setBoardRotation] = useState(0);

  const rotateBoard = () => setBoardRotation(r => (r + 90) % 360);

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      {/* Board */}
      <div className="flex-shrink-0 w-full xl:w-0 xl:flex-1 xl:max-w-[700px]">
        {/* Rotate button */}
        <div className="flex justify-end max-w-[700px] mx-auto mb-1">
          <button
            onClick={rotateBoard}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
            title={t('monopoly.rotateBoard')}
            aria-label={t('monopoly.rotateBoard')}
          >
            <RotateCw size={14} aria-hidden="true" />
          </button>
        </div>
        <div
          className="w-full max-w-[700px] mx-auto rounded-xl overflow-hidden border-2 border-black/70 shadow-xl transition-transform duration-500 ease-in-out"
          style={{ aspectRatio: '1/1', transform: `rotate(${boardRotation}deg)`, containerType: 'inline-size' }}
        >
          <div className="grid grid-cols-[1.4fr_repeat(9,1fr)_1.4fr] grid-rows-[1.4fr_repeat(9,1fr)_1.4fr] w-full h-full gap-0" style={{ backgroundColor: '#c8e6c0' }} role="grid" aria-label="Monopoly board">
            {SPACES.map(space => {
              const { row, col } = getGridPosition(space.index);
              const isCorner = [0, 10, 20, 30].includes(space.index);
              const prop = engine.properties[space.index];
              const playersHere = engine.players.filter(p => !p.bankrupt && p.position === space.index);

              return (
                <div
                  key={space.index}
                  style={{ gridRow: row + 1, gridColumn: col + 1 }}
                >
                  <BoardSpace
                    space={space}
                    property={prop}
                    playersHere={playersHere}
                    isCorner={isCorner}
                    side={getBoardSide(space.index)}
                  />
                </div>
              );
            })}

            {/* Center area — Monopoly branding */}
            <div
              className="flex flex-col items-center justify-center"
              style={{ gridRow: '2 / 11', gridColumn: '2 / 11', gap: '1cqi', padding: '2cqi' }}
            >
              <p className="font-extrabold text-red-700 drop-shadow-sm" style={{ fontFamily: 'serif', fontSize: '4cqi', letterSpacing: '0.2em' }}>
                MONOPOLY
              </p>
              <div className="bg-red-700/40 rounded-full" style={{ width: '12cqi', height: '0.3cqi' }} />

              {engine.diceRolled && (
                <div className="flex items-center" style={{ gap: '1.5cqi', marginTop: '1cqi' }}>
                  <img src={`/assets/monopoly/Die_${engine.dice[0]}.png`} alt={`dé ${engine.dice[0]}`} className="object-contain drop-shadow-md" style={{ width: '5cqi', height: '5cqi' }} draggable={false} />
                  <img src={`/assets/monopoly/Die_${engine.dice[1]}.png`} alt={`dé ${engine.dice[1]}`} className="object-contain drop-shadow-md" style={{ width: '5cqi', height: '5cqi' }} draggable={false} />
                  {engine.dice[0] === engine.dice[1] && <Badge variant="warning">{t('monopoly.doubles')}</Badge>}
                </div>
              )}
              {engine.pendingCard && (
                <div className="text-center bg-white/60 backdrop-blur-sm rounded-lg text-black/80 shadow-sm border border-black/10" style={{ fontSize: '1.2cqi', padding: '0.8cqi 1.5cqi', maxWidth: '30cqi' }}>
                  {engine.pendingCard.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="flex-1 min-w-0 xl:w-80 xl:flex-none space-y-3">
        {/* Current player */}
        <div className="text-sm font-medium flex items-center gap-2" aria-live="polite">
          <img src={PLAYER_TOKEN_IMAGES[engine.currentPlayer]} alt="" className="w-5 h-5 object-contain" draggable={false} />
          {t('monopoly.playerTurn', { player: engine.currentPlayer + 1 })}
        </div>

        {/* Action panel */}
        <div className="space-y-2 p-3 rounded-xl bg-[var(--bg-secondary)]">
          {/* Roll phase */}
          {engine.turnPhase === 'roll' && !player.bankrupt && (
            <div className="space-y-2">
              {player.inJail && (
                <div className="text-xs text-[var(--text-secondary)] mb-2">
                  🔒 {t('monopoly.inJail')} ({player.jailTurns}/{3})
                </div>
              )}
              <Button size="sm" className="w-full" onClick={onRollDice}>
                <Dices size={14} /> {player.inJail ? t('monopoly.rollForDoubles') : t('monopoly.rollDice')}
              </Button>
              {player.inJail && (
                <>
                  <Button size="sm" variant="ghost" className="w-full" onClick={onPayJailFine}>
                    <HandCoins size={14} /> {t('monopoly.payFine', { amount: 50 })}
                  </Button>
                  {player.jailFreeCards > 0 && (
                    <Button size="sm" variant="ghost" className="w-full" onClick={onUseJailFreeCard}>
                      🃏 {t('monopoly.useJailFreeCard')}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Buy phase */}
          {engine.turnPhase === 'buy' && engine.pendingBuy !== null && (
            <div className="space-y-2">
              <p className="text-xs">{t('monopoly.buyQuestion', { name: SPACES[engine.pendingBuy].name, price: SPACES[engine.pendingBuy].price })}</p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={onBuy}>
                  <Home size={14} /> {t('monopoly.buy')} ({SPACES[engine.pendingBuy].price}€)
                </Button>
                <Button size="sm" variant="ghost" className="flex-1" onClick={onDeclineBuy}>
                  <Ban size={14} /> {t('monopoly.auction')}
                </Button>
              </div>
            </div>
          )}

          {/* Auction phase */}
          {engine.turnPhase === 'auction' && engine.pendingAuction && (
            <div className="space-y-2">
              <p className="text-xs font-medium">{t('monopoly.auctionFor', { name: SPACES[engine.pendingAuction.spaceIndex].name })}</p>
              <p className="text-xs">{t('monopoly.currentBid')}: {engine.pendingAuction.currentBid}€
                {engine.pendingAuction.currentBidder !== null && ` (P${engine.pendingAuction.currentBidder + 1})`}
              </p>
              <div className="space-y-1">
                {engine.pendingAuction.participants
                  .filter(pi => !engine.pendingAuction.passed.includes(pi))
                  .map(pi => (
                    <div key={pi} className="flex items-center gap-1">
                      <img src={PLAYER_TOKEN_IMAGES[pi]} alt={`P${pi + 1}`} className="w-4 h-4 object-contain" draggable={false} />
                      <span className="text-xs flex-1">P{pi + 1} ({engine.players[pi].money}€)</span>
                      <input
                        type="number"
                        className="w-16 text-xs px-1 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)]"
                        min={engine.pendingAuction.currentBid + 1}
                        max={engine.players[pi].money}
                        value={auctionBidAmount?.[pi] || engine.pendingAuction.currentBid + 1}
                        onChange={e => setAuctionBidAmount?.({ ...auctionBidAmount, [pi]: Number(e.target.value) })}
                      />
                      <Button size="sm" onClick={() => onAuctionBid(pi, auctionBidAmount?.[pi] || engine.pendingAuction.currentBid + 1)}>
                        {t('monopoly.bid')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onAuctionPass(pi)}>
                        {t('monopoly.pass')}
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Card phase */}
          {engine.turnPhase === 'card' && engine.pendingCard && (
            <div className="space-y-2">
              <p className="text-xs font-medium">{engine.pendingCard.text}</p>
              <Button size="sm" className="w-full" onClick={onResolveCard}>
                {t('monopoly.ok')}
              </Button>
            </div>
          )}

          {/* Bankrupt phase */}
          {engine.turnPhase === 'bankrupt' && (
            <div className="space-y-2">
              <p className="text-xs text-[var(--danger)]">{t('monopoly.bankruptWarning')}</p>
              <p className="text-xs">{t('monopoly.bankruptAdvice')}</p>
              <div className="flex gap-2 flex-wrap">
                {player.properties.some(si => engine.canSellHouse(player.index, si)) && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    const si = player.properties.find(s => engine.canSellHouse(player.index, s));
                    if (si !== undefined) onSellHouse(si);
                  }}>
                    {t('monopoly.sellHouse')}
                  </Button>
                )}
                {player.properties.some(si => engine.canMortgage(player.index, si)) && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    const si = player.properties.find(s => engine.canMortgage(player.index, s));
                    if (si !== undefined) onMortgage(si);
                  }}>
                    {t('monopoly.mortgageAction')}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-[var(--danger)]" onClick={onDeclareBankruptcy}>
                  {t('monopoly.declareBankruptcy')}
                </Button>
              </div>
            </div>
          )}

          {/* End phase — management actions */}
          {engine.turnPhase === 'end' && !player.bankrupt && (
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                {player.properties.some(si => engine.canBuildHouse(player.index, si)) && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    const si = player.properties.find(s => engine.canBuildHouse(player.index, s));
                    if (si !== undefined) onBuild(si);
                  }}>
                    <Hammer size={14} /> {t('monopoly.build')}
                  </Button>
                )}
                {player.properties.some(si => engine.canSellHouse(player.index, si)) && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    const si = player.properties.find(s => engine.canSellHouse(player.index, s));
                    if (si !== undefined) onSellHouse(si);
                  }}>
                    {t('monopoly.sellHouse')}
                  </Button>
                )}
                {player.properties.some(si => engine.canMortgage(player.index, si)) && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    const si = player.properties.find(s => engine.canMortgage(player.index, s));
                    if (si !== undefined) onMortgage(si);
                  }}>
                    {t('monopoly.mortgageAction')}
                  </Button>
                )}
                {player.properties.some(si => engine.properties[si]?.mortgaged) && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    const si = player.properties.find(s => engine.properties[s]?.mortgaged);
                    if (si !== undefined) onUnmortgage(si);
                  }}>
                    {t('monopoly.unmortgageAction')}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={onTrade}>
                  <Handshake size={14} /> {t('monopoly.trade')}
                </Button>
              </div>
              <Button size="sm" className="w-full" onClick={onEndTurn}>
                <ChevronRight size={14} /> {engine.isDoubles() ? t('monopoly.rollAgain') : t('monopoly.endTurn')}
              </Button>
            </div>
          )}
        </div>

        {/* Player list */}
        <div className="space-y-1.5">
          {engine.players.map(p => (
            <PlayerInfo
              key={p.index}
              player={p}
              engine={engine}
              isCurrent={p.index === engine.currentPlayer}
              t={t}
            />
          ))}
        </div>

        {/* Recent log */}
        <div className="text-[10px] text-[var(--text-secondary)] space-y-0.5 max-h-24 overflow-y-auto" aria-live="polite" aria-label="Game log">
          {engine.log.slice(-5).reverse().map((entry, i) => (
            <p key={i}>
              {entry.type === 'land' && `P${entry.player + 1} → ${entry.name}`}
              {entry.type === 'buy' && `P${entry.player + 1} ${t('monopoly.bought')} ${SPACES[entry.space].name} (${entry.price}€)`}
              {entry.type === 'rent' && `P${entry.from + 1} ${t('monopoly.paidRent')} ${entry.amount}€ → P${entry.to + 1}`}
              {entry.type === 'tax' && `P${entry.player + 1} ${t('monopoly.paidTax')} ${entry.amount}€`}
              {entry.type === 'go' && `P${entry.player + 1} +${entry.amount}€ (${t('monopoly.passedGo')})`}
              {entry.type === 'jail' && `P${entry.player + 1} → ${t('monopoly.jail')}`}
              {entry.type === 'build' && `P${entry.player + 1} ${t('monopoly.built')} ${SPACES[entry.space].name}`}
              {entry.type === 'bankrupt' && `P${entry.player + 1} ${t('monopoly.wentBankrupt')}`}
              {entry.type === 'card' && `P${entry.player + 1}: ${entry.card}`}
              {entry.type === 'auction-win' && `P${entry.player + 1} ${t('monopoly.wonAuction')} ${SPACES[entry.space].name} (${entry.price}€)`}
              {entry.type === 'trade' && `${t('monopoly.tradeCompleted')} P${entry.from + 1} ↔ P${entry.to + 1}`}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
