import { Circle, SkipForward, Check, LogOut, RefreshCw, Play } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { GoBoard } from './GoBoard';
import { GameLobby } from '../game/GameLobby';
import { useGameStore } from '../../stores/game';
import { useT } from '../../lib/i18n';

function GoOnline({ sessionState, myPlayer, isSpectator, isMyTurn, onLeave, onRematch }) {
  const t = useT();
  const sendAction = useGameStore((s) => s.sendAction);

  const engine = sessionState.engine;
  if (!engine) return null;

  const isFinished = sessionState.phase === 'finished';
  const getPlayerInfo = (num) => sessionState.players.find(p => p.playerNumber === num);
  const player1 = getPlayerInfo(1); // black
  const player2 = getPlayerInfo(2); // white

  // Build engine-like object for GoBoard
  const boardEngine = {
    size: engine.size,
    board: engine.board,
    currentPlayer: engine.turn,
    lastMove: engine.lastMove,
    territory: engine.territory,
    getHoshi: () => engine.hoshi || [],
  };

  const handlePlaceStone = (row, col) => {
    if (isSpectator || !isMyTurn) return;
    sendAction({ type: 'place', row, col });
  };

  const handlePass = () => {
    if (isSpectator || !isMyTurn) return;
    sendAction({ type: 'pass' });
  };

  const handleConfirmScore = () => {
    if (isSpectator) return;
    sendAction({ type: 'confirmScore' });
  };

  const statusBadge = () => {
    if (engine.winner) {
      const winner = engine.winner === 'black' ? player1 : player2;
      return <Badge variant="danger">{winner?.username} {t('connect4.playerWins', { player: '' })}</Badge>;
    }
    if (engine.phase === 'scoring') return <Badge variant="warning">{t('go.scoring')}</Badge>;
    if (isMyTurn) return <Badge variant="success">{t('game.yourTurn')}</Badge>;
    const currentInfo = engine.turn === 'black' ? player1 : player2;
    return <Badge variant="info">{t('game.playerTurn', { player: currentInfo?.username })}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Circle size={20} /> {t('go.title')}
            </CardTitle>
            {isSpectator && <p className="text-sm text-[var(--text-secondary)]">{t('game.spectating')}</p>}
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
        <div className="flex flex-col xl:flex-row gap-6 items-center xl:items-start">
          <GoBoard
            engine={boardEngine}
            onPlaceStone={handlePlaceStone}
            disabled={isSpectator || !isMyTurn || engine.phase === 'scoring' || isFinished}
          />

          <div className="flex-1 space-y-4 min-w-0">
            {/* Players */}
            <div className="space-y-2">
              <div className={`flex items-center gap-2 p-2 rounded-lg ${engine.turn === 'black' && !isFinished ? 'bg-[var(--bg-secondary)]' : ''}`}>
                <div className="w-4 h-4 rounded-full bg-gray-900" />
                <span className="font-medium">{player1?.username || '?'}</span>
                <span className="text-sm text-[var(--text-secondary)]">— {t('go.captures')}: {engine.captures?.black || 0}</span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-lg ${engine.turn === 'white' && !isFinished ? 'bg-[var(--bg-secondary)]' : ''}`}>
                <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-300" />
                <span className="font-medium">{player2?.username || '?'}</span>
                <span className="text-sm text-[var(--text-secondary)]">— {t('go.captures')}: {engine.captures?.white || 0}</span>
              </div>
            </div>

            <div className="text-sm text-[var(--text-secondary)]">
              {t('go.komi')}: {engine.komi}
            </div>

            {/* Scoring info */}
            {engine.territory && engine.phase === 'scoring' && (
              <div className="space-y-2 text-sm">
                <p>{t('go.black')} — {t('go.territory')}: {engine.territory.black} | {t('go.score')}: {engine.territory.blackTotal}</p>
                <p>{t('go.white')} — {t('go.territory')}: {engine.territory.white} | {t('go.komi')}: {engine.komi} | {t('go.score')}: {engine.territory.whiteTotal}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {!isFinished && !isSpectator && isMyTurn && engine.phase === 'playing' && (
                <Button size="sm" variant="secondary" onClick={handlePass}>
                  <SkipForward size={14} /> {t('go.pass')}
                </Button>
              )}
              {engine.phase === 'scoring' && !isSpectator && (
                <Button size="sm" onClick={handleConfirmScore}>
                  <Check size={14} /> {t('go.confirmScore')}
                </Button>
              )}
              {isFinished && (
                <Button size="sm" onClick={onRematch}>
                  <RefreshCw size={14} /> {t('game.rematch')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function GoGame() {
  const t = useT();

  return (
    <GameLobby
      gameType="go"
      gameTitle={t('go.title')}
      icon={Circle}
      minPlayers={2}
      maxPlayers={2}
    >
      {(props) => <GoOnline {...props} />}
    </GameLobby>
  );
}
