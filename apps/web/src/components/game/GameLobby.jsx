import { useEffect } from 'react';
import { Users, Play, LogOut, Crown, RefreshCw, Loader2, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/game';
import { useGuildStore } from '../../stores/guild';
import { useAuthStore } from '../../stores/auth';
import { useT } from '../../lib/i18n';

export function GameLobby({ gameType, gameTitle, icon: Icon, minPlayers, maxPlayers, children }) {
  const t = useT();
  const guild = useGuildStore((s) => s.currentGuild);
  const user = useAuthStore((s) => s.user);
  const {
    sessionId,
    sessionState,
    lobbySessions,
    error,
    init,
    fetchLobbySessions,
    createSession,
    joinSession,
    leaveSession,
    startGame,
    rematch,
  } = useGameStore();

  const guildId = guild?.id;
  const discordId = user?.discordId;

  useEffect(() => {
    init();
    return () => {
      // Clean up when leaving the game page
      const { sessionId: sid } = useGameStore.getState();
      if (sid) {
        leaveSession();
      }
    };
  }, []);

  useEffect(() => {
    if (guildId) {
      fetchLobbySessions(guildId);
    }
  }, [guildId]);

  // If we have a session and it's playing/finished, render the game
  if (sessionState && (sessionState.phase === 'playing' || sessionState.phase === 'finished')) {
    const myPlayer = sessionState.players.find(p => p.id === discordId);
    const isSpectator = !myPlayer;
    const isMyTurn = myPlayer && sessionState.engine?.currentPlayer === myPlayer.playerNumber;

    return children({
      sessionState,
      myPlayer,
      isSpectator,
      isMyTurn,
      onLeave: leaveSession,
      onRematch: rematch,
    });
  }

  // If we're in a lobby session
  if (sessionState && sessionState.phase === 'lobby') {
    const isHost = sessionState.hostId === discordId;
    const canStart = sessionState.players.length >= minPlayers;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Icon size={20} /> {gameTitle}
            </CardTitle>
            <Badge variant="warning">{t('game.waitingForPlayers')}</Badge>
          </div>
        </CardHeader>

        <div className="p-4 pt-0 space-y-6">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-center">
              <p className="text-lg font-medium mb-1">{t('game.lobby')}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {t('game.sessionCode')}: <span className="font-mono font-bold text-[var(--text-primary)]">{sessionState.id}</span>
              </p>
            </div>

            {/* Player list */}
            <div className="w-full max-w-sm space-y-2">
              <p className="text-sm font-medium">{t('game.players')} ({sessionState.players.length}/{maxPlayers})</p>
              {sessionState.players.map((p) => (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <div className={`w-3 h-3 rounded-full ${p.connected ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="font-medium">{p.username}</span>
                  {p.id === sessionState.hostId && (
                    <Crown size={14} className="text-yellow-500" />
                  )}
                  <span className="ml-auto text-xs text-[var(--text-secondary)]">
                    {t('game.playerNum', { num: p.playerNumber })}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {isHost && (
                <Button onClick={startGame} disabled={!canStart}>
                  <Play size={16} /> {t('game.startGame')}
                </Button>
              )}
              {!isHost && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Loader2 size={16} className="animate-spin" />
                  {t('game.waitingForHost')}
                </div>
              )}
              <Button variant="ghost" onClick={leaveSession}>
                <LogOut size={16} /> {t('game.leave')}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // No active session — show create/join screen
  const gameLobby = lobbySessions.filter(s => s.gameType === gameType);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon size={20} /> {gameTitle}
            </CardTitle>
            <p className="text-sm text-[var(--text-secondary)]">{minPlayers}-{maxPlayers} {t('web.gameLibrary.players')}</p>
          </div>
        </div>
      </CardHeader>

      <div className="p-4 pt-0 space-y-6">
        {/* Create new game */}
        <div className="flex flex-col items-center gap-4 py-4">
          <Button onClick={() => guildId && createSession(guildId, gameType)}>
            <Play size={16} /> {t('game.createGame')}
          </Button>
        </div>

        {/* Active sessions to join */}
        {gameLobby.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">{t('game.activeSessions')}</p>
            <div className="space-y-2">
              {gameLobby.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-[var(--text-secondary)]" />
                    <div>
                      <p className="text-sm font-medium">
                        {s.players.map(p => p.username).join(', ')}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {s.playerCount}/{s.maxPlayers} {t('web.gameLibrary.players')} — {s.phase === 'lobby' ? t('game.waitingForPlayers') : t('game.inProgress')}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={s.phase === 'lobby' && s.playerCount < s.maxPlayers ? 'primary' : 'secondary'}
                    onClick={() => joinSession(s.id)}
                  >
                    {s.phase === 'lobby' && s.playerCount < s.maxPlayers ? (
                      <><Users size={14} /> {t('game.join')}</>
                    ) : (
                      <><Eye size={14} /> {t('game.spectate')}</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}
      </div>
    </Card>
  );
}
