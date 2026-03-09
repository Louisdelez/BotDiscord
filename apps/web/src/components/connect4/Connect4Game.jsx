import { Grid3X3, RefreshCw, LogOut } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Connect4Board } from './Connect4Board';
import { GameLobby } from '../game/GameLobby';
import { useGameStore } from '../../stores/game';
import { useAuthStore } from '../../stores/auth';
import { useT } from '../../lib/i18n';

function Connect4Online({ sessionState, myPlayer, isSpectator, isMyTurn, onLeave, onRematch }) {
  const t = useT();
  const sendAction = useGameStore((s) => s.sendAction);
  const user = useAuthStore((s) => s.user);

  const engine = sessionState.engine;
  if (!engine) return null;

  // Build a game-like object for the board component
  const game = {
    grid: engine.grid,
    currentPlayer: engine.currentPlayer,
    winner: engine.winner,
    winningCells: engine.winningCells,
    isDraw: engine.isDraw,
    gameOver: engine.gameOver,
    canDrop: (col) => !engine.gameOver && col >= 0 && col < 7 && engine.grid[0][col] === 0,
    getLowestRow: (col) => {
      for (let r = 5; r >= 0; r--) {
        if (engine.grid[r][col] === 0) return r;
      }
      return -1;
    },
  };

  const handleDrop = (col) => {
    if (!isMyTurn || isSpectator) return;
    sendAction({ type: 'drop', col });
  };

  const getPlayerInfo = (playerNumber) => {
    return sessionState.players.find(p => p.playerNumber === playerNumber);
  };

  const player1 = getPlayerInfo(1);
  const player2 = getPlayerInfo(2);
  const isFinished = sessionState.phase === 'finished';

  const playerColor = (p) => p === 1 ? 'text-red-500' : 'text-yellow-400';

  const statusBadge = () => {
    if (engine.winner) {
      const winner = getPlayerInfo(engine.winner);
      return <Badge variant="danger">{winner?.username} {t('connect4.playerWins', { player: '' })}</Badge>;
    }
    if (engine.isDraw) {
      return <Badge variant="warning">{t('connect4.draw')}</Badge>;
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
              <Grid3X3 size={20} /> {t('connect4.title')}
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
        <div className="flex flex-col items-center gap-4">
          {/* Player info */}
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 ${engine.currentPlayer === 1 && !isFinished ? 'font-bold' : ''}`}>
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span className={playerColor(1)}>{player1?.username || '?'}</span>
            </div>
            <span className="text-[var(--text-secondary)]">vs</span>
            <div className={`flex items-center gap-2 ${engine.currentPlayer === 2 && !isFinished ? 'font-bold' : ''}`}>
              <div className="w-4 h-4 rounded-full bg-yellow-400" />
              <span className={playerColor(2)}>{player2?.username || '?'}</span>
            </div>
          </div>

          <Connect4Board game={game} onDrop={handleDrop} />

          {isFinished && (
            <div className="flex gap-2">
              <Button onClick={onRematch}>
                <RefreshCw size={16} /> {t('game.rematch')}
              </Button>
              <Button variant="ghost" onClick={onLeave}>
                <LogOut size={16} /> {t('game.leave')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function Connect4Game() {
  const t = useT();

  return (
    <GameLobby
      gameType="connect4"
      gameTitle={t('connect4.title')}
      icon={Grid3X3}
      minPlayers={2}
      maxPlayers={2}
    >
      {(props) => <Connect4Online {...props} />}
    </GameLobby>
  );
}
