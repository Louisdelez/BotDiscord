import { useState, useEffect, memo } from 'react';
import { useT } from '../../lib/i18n';

const ROLE_EMOJI = {
  werewolf: '\u{1F43A}',
  villager: '\u{1F464}',
  seer: '\u{1F52E}',
  witch: '\u{1F9EA}',
  hunter: '\u{1F3F9}',
  cupid: '\u{1F498}',
};

const ROLE_IMAGE = {
  werewolf: '/assets/werewolf/werewolf.svg',
  villager: '/assets/werewolf/villager.svg',
  seer: '/assets/werewolf/seer.svg',
  witch: '/assets/werewolf/witch.svg',
  hunter: '/assets/werewolf/hunter.svg',
  cupid: '/assets/werewolf/cupid.svg',
};

function RoleIcon({ role, size = 'w-8 h-8', className = '' }) {
  const src = ROLE_IMAGE[role];
  if (!src) return <span className={`text-lg ${className}`}>{ROLE_EMOJI[role] || '\u{1F464}'}</span>;
  return <img src={src} alt={role} className={`${size} object-contain drop-shadow-sm ${className}`} draggable={false} />;
}

const ROLE_KEY = {
  werewolf: 'werewolf.werewolfRole',
  villager: 'werewolf.villagerRole',
  seer: 'werewolf.seerRole',
  witch: 'werewolf.witchRole',
  hunter: 'werewolf.hunterRole',
  cupid: 'werewolf.cupidRole',
};

const PlayerCard = memo(function PlayerCard({ player, index, onClick, selectable, selected, showRole, t }) {
  return (
    <button
      onClick={() => selectable && onClick?.(index)}
      disabled={!selectable}
      className={`p-3 rounded-xl border text-left transition-all ${
        !player.alive
          ? 'opacity-50 bg-[var(--bg-tertiary)] border-[var(--border)] line-through'
          : selected
            ? 'bg-[var(--accent)]/20 border-[var(--accent)] ring-2 ring-[var(--accent)]'
            : selectable
              ? 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--accent)] cursor-pointer'
              : 'bg-[var(--bg-secondary)] border-[var(--border)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {!player.alive
          ? <img src="/assets/werewolf/dead.svg" alt="dead" className="w-6 h-6 object-contain opacity-60" draggable={false} />
          : (showRole && player.role ? <RoleIcon role={player.role} size="w-6 h-6" /> : <RoleIcon role="villager" size="w-6 h-6" />)
        }
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${!player.alive ? 'line-through' : ''}`}>{player.name}</p>
          {showRole && player.role && (
            <p className="text-xs text-[var(--text-secondary)]">{t(ROLE_KEY[player.role])}</p>
          )}
          {player.lovers && <span className="text-xs">{'\u2764\uFE0F'}</span>}
        </div>
      </div>
    </button>
  );
});

function PhaseScreen({ role, onReady, t }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <RoleIcon role={role} size="w-20 h-20" />
      <h2 className="text-xl font-bold text-center">
        {t('werewolf.passScreen', { role: t(ROLE_KEY[role] || 'werewolf.villagerRole') })}
      </h2>
      <button
        onClick={onReady}
        className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors"
      >
        {t('werewolf.imReady')}
      </button>
    </div>
  );
}

function VotePanel({ players, onVote, votes, currentVoterIdx, t }) {
  const alivePlayers = players.map((p, i) => ({ ...p, index: i })).filter(p => p.alive);
  const aliveVoters = alivePlayers.filter(p => p.index !== currentVoterIdx);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('werewolf.vote')}: {players[currentVoterIdx]?.name}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {aliveVoters.map(p => (
          <button
            key={p.index}
            onClick={() => onVote(currentVoterIdx, p.index)}
            className={`p-3 rounded-xl text-sm font-medium transition-colors ${
              votes[currentVoterIdx] === p.index
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => onVote(currentVoterIdx, null)}
          className={`p-3 rounded-xl text-sm font-medium transition-colors ${
            votes[currentVoterIdx] === null
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          {t('werewolf.skipVote')}
        </button>
      </div>
    </div>
  );
}

function GameLog({ log, t }) {
  if (log.length === 0) return null;
  return (
    <div className="mt-4 p-4 rounded-xl bg-[var(--bg-secondary)] max-h-48 overflow-y-auto">
      <h4 className="text-sm font-semibold mb-2">{t('werewolf.log')}</h4>
      <div className="space-y-1">
        {[...log].reverse().map((entry, i) => (
          <p key={i} className="text-xs text-[var(--text-secondary)]">
            {formatLogEntry(entry, t)}
          </p>
        ))}
      </div>
    </div>
  );
}

function formatLogEntry(entry, t) {
  if (entry.startsWith('playerDied:')) {
    const [, name, role] = entry.split(':');
    return `\u{1F480} ${t('werewolf.playerDied', { player: name })} (${t(ROLE_KEY[role] || 'werewolf.villagerRole')})`;
  }
  if (entry.startsWith('playerSaved:')) {
    const name = entry.split(':')[1];
    return `\u{2728} ${t('werewolf.playerSaved', { player: name })}`;
  }
  if (entry.startsWith('playerLinked:')) {
    const [, p1, p2] = entry.split(':');
    return `\u{1F498} ${t('werewolf.playerLinked', { player1: p1, player2: p2 })}`;
  }
  if (entry.startsWith('eliminated:')) {
    const [, name, role] = entry.split(':');
    return `\u{2694}\uFE0F ${t('werewolf.eliminated', { player: name })} (${t(ROLE_KEY[role] || 'werewolf.villagerRole')})`;
  }
  if (entry.startsWith('hunterShot:')) {
    const name = entry.split(':')[1];
    return `\u{1F3F9} ${t('werewolf.hunterShoot', { player: name })}`;
  }
  if (entry === 'tied') {
    return `\u{1F91D} ${t('werewolf.tied')}`;
  }
  return entry;
}

export function WerewolfBoard({ game, onAction, forceUpdate }) {
  const t = useT();
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedTarget2, setSelectedTarget2] = useState(null);
  const [currentVoterIdx, setCurrentVoterIdx] = useState(null);
  const [votesDone, setVotesDone] = useState({});

  if (!game || game.players.length === 0) return null;

  const { phase, subPhase, passScreenActive, passScreenRole, players, round, winner } = game;
  const isNight = phase === 'night';

  // Game Over
  if (winner) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8" aria-live="polite">
          <div className="mb-4">
            {winner === 'werewolves'
              ? <RoleIcon role="werewolf" size="w-20 h-20" />
              : winner === 'lovers'
                ? <RoleIcon role="cupid" size="w-20 h-20" />
                : <RoleIcon role="villager" size="w-20 h-20" />
            }
          </div>
          <h2 className="text-2xl font-bold">
            {t(`werewolf.${winner}Win`)}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {players.map((p, i) => (
            <PlayerCard key={i} player={p} index={i} showRole t={t} />
          ))}
        </div>
        <GameLog log={game.log} t={t} />
      </div>
    );
  }

  // Night pass screen
  if (isNight && passScreenActive) {
    return (
      <div className={`rounded-2xl p-6 ${isNight ? 'bg-indigo-950/50' : ''}`}>
        <PhaseScreen role={passScreenRole} onReady={() => { game.confirmPassScreen(); forceUpdate(); }} t={t} />
      </div>
    );
  }

  // Night actions
  if (isNight) {
    return (
      <div className="space-y-6 rounded-2xl p-4 sm:p-6 bg-indigo-950/50">
        <div className="flex items-center gap-3 mb-4" aria-live="polite">
          <img src="/assets/werewolf/night.svg" alt="" className="w-8 h-8 object-contain" draggable={false} />
          <div>
            <h3 className="font-semibold">{t('werewolf.night')} {round}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{t(`werewolf.${subPhase}Phase`)}</p>
          </div>
        </div>

        {subPhase === 'cupid' && (
          <CupidAction game={game} onAction={onAction} forceUpdate={forceUpdate} t={t}
            selectedTarget={selectedTarget} setSelectedTarget={setSelectedTarget}
            selectedTarget2={selectedTarget2} setSelectedTarget2={setSelectedTarget2}
          />
        )}

        {subPhase === 'seer' && (
          <SeerAction game={game} onAction={onAction} forceUpdate={forceUpdate} t={t}
            selectedTarget={selectedTarget} setSelectedTarget={setSelectedTarget}
          />
        )}

        {subPhase === 'werewolves' && (
          <WerewolvesAction game={game} onAction={onAction} forceUpdate={forceUpdate} t={t}
            selectedTarget={selectedTarget} setSelectedTarget={setSelectedTarget}
          />
        )}

        {subPhase === 'witch' && (
          <WitchAction game={game} onAction={onAction} forceUpdate={forceUpdate} t={t}
            selectedTarget={selectedTarget} setSelectedTarget={setSelectedTarget}
          />
        )}

        {subPhase === 'hunter' && (
          <HunterAction game={game} onAction={onAction} forceUpdate={forceUpdate} t={t}
            selectedTarget={selectedTarget} setSelectedTarget={setSelectedTarget}
          />
        )}

        <GameLog log={game.log} t={t} />
      </div>
    );
  }

  // Day phase
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3" aria-live="polite">
        <span className="text-2xl" aria-hidden="true">{'\u2600\uFE0F'}</span>
        <div>
          <h3 className="font-semibold">{t('werewolf.day')} {round}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{t(`werewolf.${subPhase}Phase`)}</p>
        </div>
      </div>

      {/* Show who died last night */}
      {subPhase === 'discussion' && game.eliminatedTonight.length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm font-medium">{t('werewolf.reveal')}:</p>
          {game.eliminatedTonight.map(idx => (
            <p key={idx} className="text-sm">
              {'\u{1F480}'} {players[idx].name} ({t(ROLE_KEY[players[idx].role])})
            </p>
          ))}
        </div>
      )}

      {subPhase === 'discussion' && game.eliminatedTonight.length === 0 && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-sm">{t('werewolf.noVote')}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {players.map((p, i) => (
          <PlayerCard key={i} player={p} index={i} showRole={!p.alive} t={t} />
        ))}
      </div>

      {subPhase === 'discussion' && (
        <div className="flex justify-center">
          <button
            onClick={() => { game.startVote(); forceUpdate(); }}
            className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            {t('werewolf.startVote')}
          </button>
        </div>
      )}

      {subPhase === 'vote' && (
        <DayVote game={game} onAction={onAction} forceUpdate={forceUpdate} t={t}
          currentVoterIdx={currentVoterIdx} setCurrentVoterIdx={setCurrentVoterIdx}
          votesDone={votesDone} setVotesDone={setVotesDone}
        />
      )}

      {subPhase === 'hunter' && (
        <HunterAction game={game} onAction={onAction} forceUpdate={forceUpdate} t={t}
          selectedTarget={selectedTarget} setSelectedTarget={setSelectedTarget}
        />
      )}

      <GameLog log={game.log} t={t} />
    </div>
  );
}

function CupidAction({ game, t, selectedTarget, setSelectedTarget, selectedTarget2, setSelectedTarget2, forceUpdate }) {
  const alivePlayers = game.getAlivePlayers();
  return (
    <div className="space-y-4">
      <p className="text-sm">{t('werewolf.cupidPhase')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {alivePlayers.map(p => (
          <button
            key={p.index}
            onClick={() => {
              if (selectedTarget === null) setSelectedTarget(p.index);
              else if (selectedTarget === p.index) setSelectedTarget(null);
              else if (selectedTarget2 === null) setSelectedTarget2(p.index);
              else if (selectedTarget2 === p.index) setSelectedTarget2(null);
            }}
            className={`p-3 rounded-xl text-sm font-medium transition-colors ${
              selectedTarget === p.index || selectedTarget2 === p.index
                ? 'bg-pink-500 text-white'
                : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      {selectedTarget !== null && selectedTarget2 !== null && (
        <button
          onClick={() => {
            game.cupidChoose(selectedTarget, selectedTarget2);
            setSelectedTarget(null);
            setSelectedTarget2(null);
            forceUpdate();
          }}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-medium"
        >
          {t('werewolf.confirm')}
        </button>
      )}
    </div>
  );
}

function SeerAction({ game, t, selectedTarget, setSelectedTarget, forceUpdate }) {
  const alivePlayers = game.getAlivePlayers();
  const seerIdx = game.players.findIndex(p => p.role === 'seer' && p.alive);
  const reveal = game.seerReveal;

  if (reveal) {
    return (
      <div className="space-y-4">
        <p className="text-sm">{t('werewolf.seerReveal')}:</p>
        <div className="p-4 rounded-xl bg-purple-500/20 text-center">
          <RoleIcon role={reveal.role} size="w-12 h-12" />
          <p className="font-semibold mt-2">{game.players[reveal.playerIdx].name}</p>
          <p className="text-sm text-[var(--text-secondary)]">{t(ROLE_KEY[reveal.role])}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">{t('werewolf.seerPhase')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {alivePlayers.filter(p => p.index !== seerIdx).map(p => (
          <button
            key={p.index}
            onClick={() => {
              game.seerInspect(p.index);
              setSelectedTarget(null);
              forceUpdate();
            }}
            className="p-3 rounded-xl text-sm font-medium bg-[var(--bg-secondary)] hover:bg-purple-500/20 transition-colors"
          >
            {'\u{1F52E}'} {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function WerewolvesAction({ game, t, selectedTarget, setSelectedTarget, forceUpdate }) {
  const wolves = game.getAllWolves();
  const targets = game.getAliveNonWolves();
  const allWolvesVoted = wolves.every(w => game.werewolfVotes[w.index] !== undefined);

  return (
    <div className="space-y-4">
      <p className="text-sm">{t('werewolf.werewolfChoose')}</p>
      <p className="text-xs text-[var(--text-secondary)]">
        {'\u{1F43A}'} {wolves.map(w => w.name).join(', ')}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {targets.map(p => (
          <button
            key={p.index}
            onClick={() => {
              setSelectedTarget(p.index);
              wolves.forEach(w => game.werewolfVote(w.index, p.index));
              forceUpdate();
            }}
            className={`p-3 rounded-xl text-sm font-medium transition-colors ${
              selectedTarget === p.index
                ? 'bg-red-600 text-white'
                : 'bg-[var(--bg-secondary)] hover:bg-red-500/20'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      {allWolvesVoted && (
        <button
          onClick={() => {
            game.werewolfConfirm();
            setSelectedTarget(null);
            forceUpdate();
          }}
          className="px-4 py-2 rounded-xl bg-red-600 text-white font-medium"
        >
          {t('werewolf.confirm')}
        </button>
      )}
    </div>
  );
}

function WitchAction({ game, t, selectedTarget, setSelectedTarget, forceUpdate }) {
  const target = game.werewolfTarget;
  const canHeal = !game.witchHealUsed && target !== null;
  const canKill = !game.witchKillUsed;
  const alivePlayers = game.getAlivePlayers();
  const witchIdx = game.players.findIndex(p => p.role === 'witch' && p.alive);

  return (
    <div className="space-y-4">
      <p className="text-sm">{t('werewolf.witchPhase')}</p>

      {target !== null && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm">
            {'\u{1F480}'} {game.players[target].name} {t('werewolf.willDie')}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canHeal && (
          <button
            onClick={() => {
              game.witchAction(true, null);
              setSelectedTarget(null);
              forceUpdate();
            }}
            className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium"
          >
            {'\u{2728}'} {t('werewolf.witchHeal')} ({t('werewolf.healPotion')})
          </button>
        )}
        {game.witchHealUsed && (
          <span className="px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)]">
            {t('werewolf.healPotion')}: {t('werewolf.potionUsed')}
          </span>
        )}
      </div>

      {canKill && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('werewolf.witchKill')} ({t('werewolf.deathPotion')})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {alivePlayers.filter(p => p.index !== witchIdx && p.index !== target).map(p => (
              <button
                key={p.index}
                onClick={() => setSelectedTarget(selectedTarget === p.index ? null : p.index)}
                className={`p-2 rounded-xl text-xs font-medium transition-colors ${
                  selectedTarget === p.index
                    ? 'bg-purple-600 text-white'
                    : 'bg-[var(--bg-secondary)] hover:bg-purple-500/20'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          {selectedTarget !== null && (
            <button
              onClick={() => {
                game.witchAction(false, selectedTarget);
                setSelectedTarget(null);
                forceUpdate();
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium"
            >
              {'\u{1F9EA}'} {t('werewolf.witchKill')} {game.players[selectedTarget].name}
            </button>
          )}
        </div>
      )}
      {game.witchKillUsed && (
        <span className="px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)]">
          {t('werewolf.deathPotion')}: {t('werewolf.potionUsed')}
        </span>
      )}

      <button
        onClick={() => {
          game.witchSkip();
          setSelectedTarget(null);
          forceUpdate();
        }}
        className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)]"
      >
        {t('werewolf.witchSkip')}
      </button>
    </div>
  );
}

function HunterAction({ game, t, selectedTarget, setSelectedTarget, forceUpdate }) {
  const alivePlayers = game.getAlivePlayers();

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{t('werewolf.hunterPhase')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {alivePlayers.map(p => (
          <button
            key={p.index}
            onClick={() => setSelectedTarget(selectedTarget === p.index ? null : p.index)}
            className={`p-3 rounded-xl text-sm font-medium transition-colors ${
              selectedTarget === p.index
                ? 'bg-orange-600 text-white'
                : 'bg-[var(--bg-secondary)] hover:bg-orange-500/20'
            }`}
          >
            {'\u{1F3F9}'} {p.name}
          </button>
        ))}
      </div>
      {selectedTarget !== null && (
        <button
          onClick={() => {
            game.hunterShoot(selectedTarget);
            setSelectedTarget(null);
            forceUpdate();
          }}
          className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-medium"
        >
          {t('werewolf.hunterShoot', { player: game.players[selectedTarget].name })}
        </button>
      )}
    </div>
  );
}

function DayVote({ game, t, currentVoterIdx, setCurrentVoterIdx, votesDone, setVotesDone, forceUpdate }) {
  const alivePlayers = game.getAlivePlayers();

  // Initialize first voter
  useEffect(() => {
    if (currentVoterIdx === null && alivePlayers.length > 0) {
      setCurrentVoterIdx(alivePlayers[0].index);
    }
  }, [currentVoterIdx, alivePlayers]);

  if (currentVoterIdx === null) {
    return null;
  }

  const allVoted = alivePlayers.every(p => votesDone[p.index]);

  if (allVoted) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('werewolf.voteResults')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {alivePlayers.map(p => (
            <div key={p.index} className="p-3 rounded-xl bg-[var(--bg-secondary)] text-sm">
              <span className="font-medium">{p.name}</span>
              <span className="text-[var(--text-secondary)]">
                {' \u2192 '}
                {game.votes[p.index] !== null && game.votes[p.index] !== undefined
                  ? game.players[game.votes[p.index]].name
                  : t('werewolf.skipVote')}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            game.resolveVotes();
            setCurrentVoterIdx(null);
            setVotesDone({});
            forceUpdate();
          }}
          className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-medium"
        >
          {t('werewolf.resolveVotes')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <VotePanel
        players={game.players}
        votes={game.votes}
        currentVoterIdx={currentVoterIdx}
        onVote={(voter, target) => {
          game.castVote(voter, target);
          forceUpdate();
        }}
        t={t}
      />
      {game.votes[currentVoterIdx] !== undefined && (
        <button
          onClick={() => {
            const done = { ...votesDone, [currentVoterIdx]: true };
            setVotesDone(done);
            const nextVoter = alivePlayers.find(p => !done[p.index]);
            if (nextVoter) setCurrentVoterIdx(nextVoter.index);
            forceUpdate();
          }}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium"
        >
          {t('werewolf.passToNext')}
        </button>
      )}
    </div>
  );
}
