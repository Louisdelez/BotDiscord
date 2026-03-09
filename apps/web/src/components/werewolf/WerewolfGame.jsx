import { useState } from 'react';
import { Moon, RefreshCw, LogOut } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { WerewolfBoard } from './WerewolfBoard';
import { GameLobby } from '../game/GameLobby';
import { useGameStore } from '../../stores/game';
import { useT } from '../../lib/i18n';

function WerewolfOnline({ sessionState, myPlayer, isSpectator, isMyTurn, onLeave, onRematch }) {
  const t = useT();
  const sendAction = useGameStore((s) => s.sendAction);
  const [, forceRender] = useState(0);

  const engine = sessionState.engine;
  if (!engine) return null;

  const isFinished = sessionState.phase === 'finished';
  const myPlayerIndex = myPlayer?.playerNumber != null ? myPlayer.playerNumber - 1 : null;

  // Determine which role the current player has (only their own role is visible)
  const myRole = myPlayerIndex != null && engine.players?.[myPlayerIndex]
    ? engine.players[myPlayerIndex].role
    : null;

  // Build a game-like object that the WerewolfBoard can consume.
  // The server engine already handles hidden roles: only your own role is visible,
  // and dead players' roles are revealed.
  const game = {
    ...engine,
    // Provide helper methods that WerewolfBoard sub-components expect
    getAlivePlayers: () =>
      (engine.players || [])
        .map((p, i) => ({ ...p, index: i }))
        .filter((p) => p.alive),
    getAllWolves: () =>
      (engine.players || [])
        .map((p, i) => ({ ...p, index: i }))
        .filter((p) => p.role === 'werewolf' && p.alive),
    getAliveNonWolves: () =>
      (engine.players || [])
        .map((p, i) => ({ ...p, index: i }))
        .filter((p) => p.role !== 'werewolf' && p.alive),
    getStatus: () => (engine.winner ? 'finished' : 'playing'),
  };

  // All game mutations go through sendAction instead of local engine calls.
  // The onAction callback translates WerewolfBoard's local method calls
  // into server actions.
  const handleAction = (actionName, ...args) => {
    switch (actionName) {
      // Night actions
      case 'cupidChoose':
        sendAction({ type: 'nightAction', action: 'cupidChoose', targets: [args[0], args[1]] });
        break;
      case 'seerInspect':
        sendAction({ type: 'nightAction', action: 'seerInspect', targetIndex: args[0] });
        break;
      case 'werewolfVote':
        sendAction({ type: 'nightAction', action: 'werewolfVote', voterIndex: args[0], targetIndex: args[1] });
        break;
      case 'werewolfConfirm':
        sendAction({ type: 'nightAction', action: 'werewolfConfirm' });
        break;
      case 'witchAction':
        sendAction({ type: 'nightAction', action: 'witchAction', heal: args[0], targetIndex: args[1] });
        break;
      case 'witchSkip':
        sendAction({ type: 'skip' });
        break;
      case 'hunterShoot':
        sendAction({ type: 'nightAction', action: 'hunterShoot', targetIndex: args[0] });
        break;
      case 'confirmPassScreen':
        sendAction({ type: 'nightAction', action: 'confirmPassScreen' });
        break;

      // Day actions
      case 'startVote':
        sendAction({ type: 'vote', action: 'startVote' });
        break;
      case 'castVote':
        sendAction({ type: 'vote', targetIndex: args[1], voterIndex: args[0] });
        break;
      case 'resolveVotes':
        sendAction({ type: 'vote', action: 'resolveVotes' });
        break;

      default:
        // Fallback: send as generic action
        sendAction({ type: actionName, args });
        break;
    }
  };

  // Wrap engine methods so WerewolfBoard sub-components can call them
  // as if they were local (game.cupidChoose(...), game.seerInspect(...), etc.)
  // Each call is intercepted and sent to the server instead.
  const gameProxy = new Proxy(game, {
    get(target, prop) {
      // Return existing data properties from the engine state
      if (prop in target) {
        return target[prop];
      }
      // For method calls, return a function that sends the action
      return (...args) => {
        handleAction(prop, ...args);
        forceRender((n) => n + 1);
      };
    },
  });

  const getPlayerUsername = (playerNumber) => {
    const p = sessionState.players.find((pl) => pl.playerNumber === playerNumber);
    return p?.username || '?';
  };

  // Determine current phase info for status badge
  const statusBadge = () => {
    if (engine.winner) {
      return <Badge variant="danger">{t(`werewolf.${engine.winner}Win`)}</Badge>;
    }
    if (engine.phase === 'night') {
      return (
        <Badge variant="info">
          {t('werewolf.night')} {engine.round}
        </Badge>
      );
    }
    return (
      <Badge variant="warning">
        {t('werewolf.day')} {engine.round}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Moon size={20} /> {t('werewolf.title')}
            </CardTitle>
            {isSpectator && (
              <p className="text-sm text-[var(--text-secondary)]">{t('game.spectating')}</p>
            )}
            {myRole && !isSpectator && (
              <p className="text-sm text-[var(--text-secondary)]">
                {t('werewolf.yourRole')}: {t(`werewolf.${myRole}Role`)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div aria-live="polite">{statusBadge()}</div>
            <Button variant="ghost" size="sm" onClick={onLeave}>
              <LogOut size={14} /> {t('game.leave')}
            </Button>
          </div>
        </div>

        {/* Player list */}
        <div className="flex flex-wrap gap-2 mt-2">
          {sessionState.players.map((p) => (
            <span
              key={p.playerNumber}
              className={`text-xs px-2 py-1 rounded-lg ${
                myPlayer?.playerNumber === p.playerNumber
                  ? 'bg-[var(--accent)]/20 font-semibold'
                  : 'bg-[var(--bg-secondary)]'
              }`}
            >
              {p.username}
            </span>
          ))}
        </div>
      </CardHeader>

      <div className="p-4 pt-0">
        <WerewolfBoard
          game={gameProxy}
          forceUpdate={() => forceRender((n) => n + 1)}
          onAction={(action, ...args) => {
            handleAction(action, ...args);
            forceRender((n) => n + 1);
          }}
        />

        {isFinished && (
          <div className="flex gap-2 justify-center mt-4">
            <Button onClick={onRematch}>
              <RefreshCw size={16} /> {t('game.rematch')}
            </Button>
            <Button variant="ghost" onClick={onLeave}>
              <LogOut size={16} /> {t('game.leave')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function WerewolfGame() {
  const t = useT();

  return (
    <GameLobby
      gameType="werewolf"
      gameTitle={t('werewolf.title')}
      icon={Moon}
      minPlayers={6}
      maxPlayers={12}
    >
      {(props) => <WerewolfOnline {...props} />}
    </GameLobby>
  );
}
