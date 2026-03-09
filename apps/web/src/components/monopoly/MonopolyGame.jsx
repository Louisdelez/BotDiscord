import { useState } from 'react';
import { Building2, RefreshCw, LogOut } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MonopolyBoard } from './MonopolyBoard';
import { MonopolyTradeModal } from './MonopolyTradeModal';
import { PLAYER_COLORS, SPACES } from './MonopolyData';
import { GameLobby } from '../game/GameLobby';
import { useGameStore } from '../../stores/game';
import { useT } from '../../lib/i18n';

function MonopolyOnline({ sessionState, myPlayer, isSpectator, isMyTurn, onLeave, onRematch }) {
  const t = useT();
  const sendAction = useGameStore((s) => s.sendAction);

  const [showTradeModal, setShowTradeModal] = useState(false);
  const [auctionBidAmount, setAuctionBidAmount] = useState({});

  const engine = sessionState.engine;
  if (!engine) return null;

  const isFinished = sessionState.phase === 'finished';
  const myPlayerIndex = myPlayer?.playerNumber != null ? myPlayer.playerNumber - 1 : null;

  // --- Actions (all guarded by isMyTurn / isSpectator) ---

  const handleRollDice = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'rollDice' });
  };

  const handleBuy = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'buyProperty' });
  };

  const handleDeclineBuy = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'declineBuy' });
  };

  const handleAuctionBid = (playerIndex, amount) => {
    if (isSpectator) return;
    sendAction({ type: 'auctionBid', playerIndex, amount });
  };

  const handleAuctionPass = (playerIndex) => {
    if (isSpectator) return;
    sendAction({ type: 'auctionPass', playerIndex });
  };

  const handleBuild = (spaceIndex) => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'buildHouse', propertyIndex: spaceIndex });
  };

  const handleSellHouse = (spaceIndex) => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'sellHouse', propertyIndex: spaceIndex });
  };

  const handleMortgage = (spaceIndex) => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'mortgage', propertyIndex: spaceIndex });
  };

  const handleUnmortgage = (spaceIndex) => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'unmortgage', propertyIndex: spaceIndex });
  };

  const handleEndTurn = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'endTurn' });
  };

  const handleResolveCard = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'resolveCard' });
  };

  const handlePayJailFine = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'payBail' });
  };

  const handleUseJailFreeCard = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'useGetOutOfJailCard' });
  };

  const handleDeclareBankruptcy = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'declareBankruptcy' });
  };

  // --- Trade ---

  const handleOpenTrade = () => {
    if (isSpectator) return;
    setShowTradeModal(true);
  };

  const handleProposeTrade = (fromIndex, toIndex, offer) => {
    if (isSpectator) return;
    sendAction({ type: 'proposeTrade', fromIndex, toIndex, offer });
    setShowTradeModal(false);
  };

  const handleAcceptTrade = () => {
    if (isSpectator) return;
    sendAction({ type: 'acceptTrade' });
  };

  const handleRejectTrade = () => {
    if (isSpectator) return;
    sendAction({ type: 'rejectTrade' });
  };

  // --- Helper: get player info from session ---

  const getPlayerInfo = (playerIndex) => {
    return sessionState.players.find(p => p.playerNumber === playerIndex + 1);
  };

  // --- Status badge ---

  const statusBadge = () => {
    if (engine.gameOver && engine.winner !== null) {
      const winner = getPlayerInfo(engine.winner);
      return <Badge variant="danger">{winner?.username} {t('monopoly.playerWins', { player: '' })}</Badge>;
    }
    if (engine.gameOver) {
      return <Badge variant="warning">{t('monopoly.gameOver')}</Badge>;
    }
    if (isMyTurn) {
      return <Badge variant="success">{t('game.yourTurn')}</Badge>;
    }
    const currentPlayerInfo = getPlayerInfo(engine.currentPlayer);
    return <Badge variant="info">{t('game.playerTurn', { player: currentPlayerInfo?.username })}</Badge>;
  };

  // --- Trade proposal display ---

  const pendingTrade = engine.pendingTrade || null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 size={20} /> {t('monopoly.title')}
            </CardTitle>
            {isSpectator && (
              <p className="text-sm text-[var(--text-secondary)]">{t('game.spectating')}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div aria-live="polite">{statusBadge()}</div>
            <Button variant="ghost" size="sm" onClick={onLeave}>
              <LogOut size={14} /> {t('game.leave')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="p-4 pt-0">
        {/* Player info bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
          {sessionState.players.map((p) => {
            const idx = p.playerNumber - 1;
            const isCurrent = engine.currentPlayer === idx && !isFinished;
            const playerData = engine.players?.[idx];
            return (
              <div key={p.id} className={`flex items-center gap-2 ${isCurrent ? 'font-bold' : ''}`}>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PLAYER_COLORS[idx] }} />
                <span className="text-sm">{p.username}</span>
                {playerData && (
                  <span className="text-xs text-[var(--text-secondary)]">({playerData.money}€)</span>
                )}
                {playerData?.bankrupt && <Badge variant="error">{t('monopoly.bankrupt')}</Badge>}
              </div>
            );
          })}
        </div>

        {/* Active game board */}
        {!isFinished && (
          <MonopolyBoard
            engine={engine}
            onRollDice={handleRollDice}
            onBuy={handleBuy}
            onDeclineBuy={handleDeclineBuy}
            onAuctionBid={handleAuctionBid}
            onAuctionPass={handleAuctionPass}
            onBuild={handleBuild}
            onSellHouse={handleSellHouse}
            onMortgage={handleMortgage}
            onUnmortgage={handleUnmortgage}
            onEndTurn={handleEndTurn}
            onTrade={handleOpenTrade}
            onPayJailFine={handlePayJailFine}
            onUseJailFreeCard={handleUseJailFreeCard}
            onResolveCard={handleResolveCard}
            onDeclareBankruptcy={handleDeclareBankruptcy}
            auctionBidAmount={auctionBidAmount}
            setAuctionBidAmount={setAuctionBidAmount}
          />
        )}

        {/* Trade proposal overlay */}
        {pendingTrade && (
          <div className="flex flex-col items-center gap-6 py-8">
            <p className="text-lg font-bold">{t('monopoly.tradeProposal')}</p>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[pendingTrade.from] }} />
                  <span className="font-medium">{getPlayerInfo(pendingTrade.from)?.username || t('monopoly.playerLabel', { n: pendingTrade.from + 1 })} {t('monopoly.offers')}:</span>
                </div>
                {(pendingTrade.offer.propertiesFrom || []).map(si => (
                  <p key={si} className="text-xs ml-5">{SPACES[si].name}</p>
                ))}
                {pendingTrade.offer.moneyFrom > 0 && <p className="text-xs ml-5">{pendingTrade.offer.moneyFrom}€</p>}
                {pendingTrade.offer.jailCardsFrom > 0 && <p className="text-xs ml-5">x{pendingTrade.offer.jailCardsFrom}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[pendingTrade.to] }} />
                  <span className="font-medium">{getPlayerInfo(pendingTrade.to)?.username || t('monopoly.playerLabel', { n: pendingTrade.to + 1 })} {t('monopoly.offers')}:</span>
                </div>
                {(pendingTrade.offer.propertiesTo || []).map(si => (
                  <p key={si} className="text-xs ml-5">{SPACES[si].name}</p>
                ))}
                {pendingTrade.offer.moneyTo > 0 && <p className="text-xs ml-5">{pendingTrade.offer.moneyTo}€</p>}
                {pendingTrade.offer.jailCardsTo > 0 && <p className="text-xs ml-5">x{pendingTrade.offer.jailCardsTo}</p>}
              </div>
            </div>
            {!isSpectator && myPlayerIndex === pendingTrade.to && (
              <>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('monopoly.acceptQuestion')}
                </p>
                <div className="flex gap-3">
                  <Button onClick={handleAcceptTrade}>
                    {t('monopoly.accept')}
                  </Button>
                  <Button variant="ghost" onClick={handleRejectTrade}>
                    {t('monopoly.reject')}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Game Over */}
        {isFinished && engine.gameOver && (
          <div className="flex flex-col items-center gap-6 py-16">
            <p className="text-3xl font-bold">{t('monopoly.gameOver')}</p>
            {engine.winner !== null && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: PLAYER_COLORS[engine.winner] }} />
                <p className="text-xl">
                  {getPlayerInfo(engine.winner)?.username} {t('monopoly.playerWins', { player: '' })}
                </p>
              </div>
            )}
            {engine.getPlayersRanking && (
              <div className="flex flex-wrap justify-center gap-3">
                {engine.getPlayersRanking().map((p, rank) => (
                  <div
                    key={p.index}
                    className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl ${
                      p.index === engine.winner ? 'bg-green-500/10 ring-2 ring-green-500' : 'bg-[var(--bg-secondary)]'
                    } ${p.bankrupt ? 'opacity-50' : ''}`}
                  >
                    <span className="text-sm font-medium">#{rank + 1} — {getPlayerInfo(p.index)?.username || `P${p.index + 1}`}</span>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PLAYER_COLORS[p.index] }} />
                    <span className="text-lg font-bold">{p.netWorth}€</span>
                    <span className="text-xs text-[var(--text-secondary)]">{t('monopoly.netWorth')}</span>
                    {p.bankrupt && <Badge variant="error">{t('monopoly.bankrupt')}</Badge>}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={onRematch}>
                <RefreshCw size={16} /> {t('game.rematch')}
              </Button>
              <Button variant="ghost" onClick={onLeave}>
                <LogOut size={16} /> {t('game.leave')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Trade modal */}
      {!isSpectator && (
        <MonopolyTradeModal
          open={showTradeModal}
          onClose={() => setShowTradeModal(false)}
          engine={engine}
          currentPlayerIndex={myPlayerIndex}
          onPropose={handleProposeTrade}
        />
      )}
    </Card>
  );
}

export function MonopolyGame() {
  const t = useT();

  return (
    <GameLobby
      gameType="monopoly"
      gameTitle={t('monopoly.title')}
      icon={Building2}
      minPlayers={2}
      maxPlayers={6}
    >
      {(props) => <MonopolyOnline {...props} />}
    </GameLobby>
  );
}
