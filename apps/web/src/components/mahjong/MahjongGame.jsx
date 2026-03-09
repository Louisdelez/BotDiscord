import { LayoutGrid, RefreshCw, LogOut } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MahjongBoard } from './MahjongBoard';
import { GameLobby } from '../game/GameLobby';
import { useGameStore } from '../../stores/game';
import { useT } from '../../lib/i18n';

const WIND_SYMBOLS = { east: '東', south: '南', west: '西', north: '北' };
const PLAYER_WINDS = ['east', 'south', 'west', 'north'];

function MahjongOnline({ sessionState, myPlayer, isSpectator, isMyTurn, onLeave, onRematch }) {
  const t = useT();
  const sendAction = useGameStore((s) => s.sendAction);

  const engine = sessionState.engine;
  if (!engine) return null;

  // myPlayer.playerNumber is 1-based, engine uses 0-based
  const myIndex = myPlayer ? myPlayer.playerNumber - 1 : 0;

  const isFinished = sessionState.phase === 'finished';

  const getPlayerInfo = (playerIndex) => {
    return sessionState.players.find(p => p.playerNumber === playerIndex + 1);
  };

  // Build a game-like object compatible with MahjongBoard
  const game = {
    players: engine.players,
    currentPlayer: engine.currentPlayer,
    turnPhase: engine.turnPhase,
    pendingClaims: engine.pendingClaims || [],
    lastDiscard: engine.lastDiscard,
    winner: engine.winner,
    phase: engine.phase,
    getTilesRemaining: () => engine.tilesRemaining ?? 0,
    checkWin: (playerIdx) => engine.canDeclareWin?.[playerIdx] ?? false,
    getChiOptions: (playerIdx) => engine.chiOptions?.[playerIdx] ?? [],
  };

  const handleDiscard = (tileIdx) => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'discard', tileIndex: tileIdx });
  };

  const handleDraw = () => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'draw' });
  };

  const handlePung = () => {
    if (isSpectator) return;
    sendAction({ type: 'claim', claimType: 'pung', tiles: [] });
  };

  const handleChi = (values) => {
    if (isSpectator) return;
    sendAction({ type: 'claim', claimType: 'chi', tiles: values });
  };

  const handleKong = () => {
    if (isSpectator) return;
    sendAction({ type: 'claim', claimType: 'kong', tiles: [] });
  };

  const handleMahjong = () => {
    if (isSpectator) return;
    sendAction({ type: 'declareWin' });
  };

  const handlePass = () => {
    if (isSpectator) return;
    sendAction({ type: 'claim', claimType: 'pass', tiles: [] });
  };

  const chiOptions = game.getChiOptions(myIndex);

  const statusBadge = () => {
    if (engine.winner !== null && engine.winner !== undefined) {
      const winnerInfo = getPlayerInfo(engine.winner);
      return <Badge variant="danger">{winnerInfo?.username} {t('mahjong.playerWins', { player: '' })}</Badge>;
    }
    if (engine.phase === 'gameOver' && engine.winner === null) {
      return <Badge variant="warning">{t('mahjong.drawGame')}</Badge>;
    }
    if (isMyTurn) {
      return <Badge variant="success">{t('game.yourTurn')}</Badge>;
    }
    const currentPlayerInfo = getPlayerInfo(engine.currentPlayer);
    return <Badge variant="info">{t('game.playerTurn', { player: currentPlayerInfo?.username })}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid size={20} /> {t('mahjong.title')}
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
        {!isFinished && (
          <div className="space-y-4">
            {/* Player info row */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {[0, 1, 2, 3].map(idx => {
                const info = getPlayerInfo(idx);
                const isCurrent = engine.currentPlayer === idx;
                const isMe = idx === myIndex;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 text-sm ${isCurrent ? 'font-bold' : ''} ${isMe ? 'text-[var(--accent)]' : ''}`}
                  >
                    <span aria-hidden="true">{WIND_SYMBOLS[PLAYER_WINDS[idx]]}</span>
                    <span>{info?.username || '?'}</span>
                    {isCurrent && <span className="text-[var(--accent)]">●</span>}
                  </div>
                );
              })}
            </div>

            {/* Draw button */}
            {isMyTurn && engine.turnPhase === 'draw' && (
              <div className="flex justify-center">
                <Button onClick={handleDraw}>
                  {t('mahjong.draw')}
                </Button>
              </div>
            )}

            <MahjongBoard
              game={game}
              activePlayer={myIndex}
              onDiscard={handleDiscard}
              onPung={handlePung}
              onChi={handleChi}
              onKong={handleKong}
              onMahjong={handleMahjong}
              onPass={handlePass}
              chiOptions={chiOptions}
            />
          </div>
        )}

        {isFinished && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-center">
              <p className="text-2xl font-bold mb-2">{t('mahjong.gameOver')}</p>
              {engine.winner !== null && engine.winner !== undefined ? (
                <p className="text-xl font-medium text-[var(--accent)]">
                  {t('mahjong.playerWins', { player: getPlayerInfo(engine.winner)?.username || t(`mahjong.player${engine.winner + 1}`) })}
                </p>
              ) : (
                <p className="text-xl font-medium text-[var(--text-secondary)]">
                  {t('mahjong.drawGame')}
                </p>
              )}
            </div>
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
    </Card>
  );
}

export function MahjongGame() {
  const t = useT();

  return (
    <GameLobby
      gameType="mahjong"
      gameTitle={t('mahjong.title')}
      icon={LayoutGrid}
      minPlayers={4}
      maxPlayers={4}
    >
      {(props) => <MahjongOnline {...props} />}
    </GameLobby>
  );
}
