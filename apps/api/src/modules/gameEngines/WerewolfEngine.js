class WerewolfEngine {
  constructor() {
    this.reset([]);
  }

  reset(playerNames) {
    const n = playerNames.length;
    const roles = this._distributeRoles(n);
    this.players = playerNames.map((name, i) => ({
      name,
      role: roles[i],
      alive: true,
      protected: false,
      lovers: false,
    }));
    this.phase = 'night';
    this.subPhase = n >= 8 ? 'cupid' : 'seer';
    this.round = 1;
    this.werewolfTarget = null;
    this.werewolfVotes = {};
    this.seerReveal = null;
    this.witchHealUsed = false;
    this.witchKillUsed = false;
    this.witchKillTarget = null;
    this.hunterPending = false;
    this.hunterShotUsed = false;
    this.votes = {};
    this.eliminatedTonight = [];
    this.log = [];
    this.winner = null;
    this.history = [];
    this.passScreenActive = true;
    this.passScreenRole = this._getSubPhaseRole();
  }

  _distributeRoles(n) {
    const roles = [];
    if (n <= 0) return roles;
    const wolfCount = n >= 9 ? 3 : 2;
    for (let i = 0; i < wolfCount; i++) roles.push('werewolf');
    roles.push('seer');
    roles.push('witch');
    if (n >= 7) roles.push('hunter');
    if (n >= 8) roles.push('cupid');
    while (roles.length < n) roles.push('villager');
    // Shuffle
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    return roles;
  }

  _saveHistory() {
    this.history.push(JSON.stringify({
      players: this.players,
      phase: this.phase,
      subPhase: this.subPhase,
      round: this.round,
      werewolfTarget: this.werewolfTarget,
      werewolfVotes: this.werewolfVotes,
      seerReveal: this.seerReveal,
      witchHealUsed: this.witchHealUsed,
      witchKillUsed: this.witchKillUsed,
      witchKillTarget: this.witchKillTarget,
      hunterPending: this.hunterPending,
      hunterShotUsed: this.hunterShotUsed,
      votes: this.votes,
      eliminatedTonight: this.eliminatedTonight,
      log: this.log,
      winner: this.winner,
      passScreenActive: this.passScreenActive,
      passScreenRole: this.passScreenRole,
    }));
  }

  undo() {
    if (this.history.length === 0) return;
    const state = JSON.parse(this.history.pop());
    Object.assign(this, state);
  }

  getStatus() {
    if (this.winner) return 'gameOver';
    if (this.players.length === 0) return 'setup';
    return 'playing';
  }

  getVisibleState(playerIdx) {
    const player = this.players[playerIdx];
    if (!player) return null;
    return {
      myRole: player.role,
      myIndex: playerIdx,
      alive: player.alive,
      lovers: player.lovers,
      phase: this.phase,
      subPhase: this.subPhase,
      round: this.round,
      players: this.players.map((p, i) => ({
        name: p.name,
        alive: p.alive,
        lovers: p.lovers,
        role: !p.alive ? p.role : (i === playerIdx ? p.role : null),
      })),
      seerReveal: this.seerReveal,
      werewolfTarget: this.werewolfTarget,
      log: this.log,
      winner: this.winner,
    };
  }

  serialize(forPlayerIndex = null) {
    return {
      phase: this.phase,
      subPhase: this.subPhase,
      day: this.round,
      gameOver: this.winner !== null,
      winner: this.winner,
      players: this.players.map((p, i) => ({
        name: p.name,
        alive: p.alive,
        role: i === forPlayerIndex ? p.role : (p.alive ? null : p.role),
      })),
      playerCount: this.players.length,
      events: this.log,
    };
  }

  _getSubPhaseRole() {
    switch (this.subPhase) {
      case 'cupid': return 'cupid';
      case 'seer': return 'seer';
      case 'werewolves': return 'werewolf';
      case 'witch': return 'witch';
      case 'hunter': return 'hunter';
      default: return null;
    }
  }

  _getActivePlayerForSubPhase() {
    const role = this._getSubPhaseRole();
    if (!role) return null;
    return this.players.findIndex(p => p.role === role && p.alive);
  }

  confirmPassScreen() {
    this.passScreenActive = false;
  }

  cupidChoose(p1, p2) {
    this._saveHistory();
    this.players[p1].lovers = true;
    this.players[p2].lovers = true;
    this.log.push(`playerLinked:${this.players[p1].name}:${this.players[p2].name}`);
    this._nextSubPhase();
  }

  seerInspect(targetIdx) {
    this._saveHistory();
    this.seerReveal = { playerIdx: targetIdx, role: this.players[targetIdx].role };
    this._nextSubPhase();
  }

  werewolfVote(wolfIdx, targetIdx) {
    this._saveHistory();
    this.werewolfVotes[wolfIdx] = targetIdx;
  }

  werewolfConfirm() {
    this._saveHistory();
    // Tally wolf votes
    const voteCounts = {};
    Object.values(this.werewolfVotes).forEach(t => {
      voteCounts[t] = (voteCounts[t] || 0) + 1;
    });
    let maxVotes = 0;
    let targets = [];
    Object.entries(voteCounts).forEach(([idx, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        targets = [Number(idx)];
      } else if (count === maxVotes) {
        targets.push(Number(idx));
      }
    });
    // Break tie randomly among top-voted targets
    this.werewolfTarget = targets.length > 0
      ? targets[Math.floor(Math.random() * targets.length)]
      : null;
    this._nextSubPhase();
  }

  witchAction(heal, killTarget) {
    this._saveHistory();
    if (heal && !this.witchHealUsed && this.werewolfTarget !== null) {
      this.players[this.werewolfTarget].protected = true;
      this.witchHealUsed = true;
      this.log.push(`playerSaved:${this.players[this.werewolfTarget].name}`);
    }
    if (killTarget !== null && !this.witchKillUsed) {
      this.witchKillTarget = killTarget;
      this.witchKillUsed = true;
    }
    this._resolveNight();
  }

  witchSkip() {
    this._saveHistory();
    this._resolveNight();
  }

  _resolveNight() {
    this.eliminatedTonight = [];
    // Werewolf kill
    if (this.werewolfTarget !== null && !this.players[this.werewolfTarget].protected) {
      this._killPlayer(this.werewolfTarget);
      this.eliminatedTonight.push(this.werewolfTarget);
    }
    // Reset protection
    this.players.forEach(p => p.protected = false);
    // Witch kill
    if (this.witchKillTarget !== null) {
      if (this.players[this.witchKillTarget].alive) {
        this._killPlayer(this.witchKillTarget);
        this.eliminatedTonight.push(this.witchKillTarget);
      }
      this.witchKillTarget = null;
    }
    // Check lovers cascade
    this._checkLoversCascade();
    if (this._checkWinCondition()) return;
    // Check if hunter died tonight
    if (this._checkHunterDeath()) return;
    // Move to day
    this.phase = 'day';
    this.subPhase = 'discussion';
    this.seerReveal = null;
    this.werewolfTarget = null;
    this.werewolfVotes = {};
    this.passScreenActive = false;
  }

  startVote() {
    this._saveHistory();
    this.subPhase = 'vote';
    this.votes = {};
  }

  castVote(voterIdx, targetIdx) {
    this._saveHistory();
    this.votes[voterIdx] = targetIdx;
  }

  resolveVotes() {
    this._saveHistory();
    const voteCounts = {};
    Object.values(this.votes).forEach(t => {
      if (t !== null && t !== undefined) {
        voteCounts[t] = (voteCounts[t] || 0) + 1;
      }
    });
    let maxVotes = 0;
    let targets = [];
    Object.entries(voteCounts).forEach(([idx, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        targets = [Number(idx)];
      } else if (count === maxVotes) {
        targets.push(Number(idx));
      }
    });

    if (targets.length === 1 && maxVotes > 0) {
      const eliminated = targets[0];
      this.log.push(`eliminated:${this.players[eliminated].name}:${this.players[eliminated].role}`);
      this._killPlayer(eliminated);
      this._checkLoversCascade();
      if (this._checkWinCondition()) return;
      if (this._checkHunterDeath()) return;
    } else {
      this.log.push('tied');
    }
    this._startNewNight();
  }

  _checkHunterDeath() {
    const hunterIdx = this.players.findIndex(p => p.role === 'hunter' && !p.alive);
    if (hunterIdx !== -1 && !this.hunterPending && !this.hunterShotUsed && this.eliminatedTonight.includes(hunterIdx)) {
      this.hunterPending = true;
      this.subPhase = 'hunter';
      this.passScreenActive = true;
      this.passScreenRole = 'hunter';
      return true;
    }
    // Check if killed player during day vote was hunter
    const lastLog = this.log[this.log.length - 1] || '';
    if (lastLog.startsWith('eliminated:')) {
      const name = lastLog.split(':')[1];
      const idx = this.players.findIndex(p => p.name === name && p.role === 'hunter' && !p.alive);
      if (idx !== -1 && !this.hunterPending && !this.hunterShotUsed) {
        this.hunterPending = true;
        this.subPhase = 'hunter';
        this.passScreenActive = true;
        this.passScreenRole = 'hunter';
        return true;
      }
    }
    return false;
  }

  hunterShoot(targetIdx) {
    this._saveHistory();
    this.log.push(`hunterShot:${this.players[targetIdx].name}`);
    this._killPlayer(targetIdx);
    this._checkLoversCascade();
    this.hunterPending = false;
    this.hunterShotUsed = true;
    if (this._checkWinCondition()) return;
    // If the shot target is also a hunter, they get a revenge shot too
    if (this._checkHunterDeath()) return;
    if (this.phase === 'night') {
      this.phase = 'day';
      this.subPhase = 'discussion';
      this.passScreenActive = false;
    } else {
      this._startNewNight();
    }
  }

  _startNewNight() {
    this.phase = 'night';
    this.round++;
    this.seerReveal = null;
    this.werewolfTarget = null;
    this.werewolfVotes = {};
    this.votes = {};
    this.eliminatedTonight = [];

    // Determine first applicable sub-phase
    const seerAlive = this.players.some(p => p.role === 'seer' && p.alive);
    this.subPhase = seerAlive ? 'seer' : 'werewolves';
    this.passScreenActive = true;
    this.passScreenRole = this._getSubPhaseRole();
  }

  _killPlayer(idx) {
    if (!this.players[idx].alive) return;
    this.players[idx].alive = false;
    this.log.push(`playerDied:${this.players[idx].name}:${this.players[idx].role}`);
    if (!this.eliminatedTonight.includes(idx)) {
      this.eliminatedTonight.push(idx);
    }
  }

  _checkLoversCascade() {
    const lovers = this.players.filter(p => p.lovers);
    if (lovers.length === 2) {
      const [a, b] = lovers;
      if (!a.alive && b.alive) {
        const bIdx = this.players.indexOf(b);
        this._killPlayer(bIdx);
      } else if (a.alive && !b.alive) {
        const aIdx = this.players.indexOf(a);
        this._killPlayer(aIdx);
      }
    }
  }

  _checkWinCondition() {
    const alive = this.players.filter(p => p.alive);
    const wolves = alive.filter(p => p.role === 'werewolf');
    const others = alive.filter(p => p.role !== 'werewolf');

    // Check lovers win: both lovers alive and everyone else dead... or lovers are wolf+villager team
    const loversAlive = alive.filter(p => p.lovers);
    if (loversAlive.length === 2 && alive.length === 2) {
      const hasWolf = loversAlive.some(p => p.role === 'werewolf');
      const hasVillager = loversAlive.some(p => p.role !== 'werewolf');
      if (hasWolf && hasVillager) {
        this.winner = 'lovers';
        return true;
      }
    }

    if (wolves.length === 0) {
      this.winner = 'villagers';
      return true;
    }
    if (wolves.length >= others.length) {
      this.winner = 'werewolves';
      return true;
    }
    return false;
  }

  _nextSubPhase() {
    const order = ['cupid', 'seer', 'werewolves', 'witch'];

    const currentIdx = order.indexOf(this.subPhase);
    for (let i = currentIdx + 1; i < order.length; i++) {
      const next = order[i];
      if (this._isSubPhaseApplicable(next)) {
        this.subPhase = next;
        this.passScreenActive = true;
        this.passScreenRole = this._getSubPhaseRole();
        return;
      }
    }
    // If we've gone through all night phases, shouldn't happen (witch always applies)
    // but fallback to resolve night
    this._resolveNight();
  }

  _isSubPhaseApplicable(sub) {
    switch (sub) {
      case 'cupid':
        return this.round === 1 && this.players.some(p => p.role === 'cupid' && p.alive);
      case 'seer':
        return this.players.some(p => p.role === 'seer' && p.alive);
      case 'werewolves':
        return true; // Wolves always act
      case 'witch':
        return this.players.some(p => p.role === 'witch' && p.alive);
      default:
        return false;
    }
  }

  skipSubPhase() {
    this._saveHistory();
    if (this.subPhase === 'witch') {
      this._resolveNight();
    } else {
      this._nextSubPhase();
    }
  }

  getAllWolves() {
    return this.players
      .map((p, i) => ({ ...p, index: i }))
      .filter(p => p.role === 'werewolf' && p.alive);
  }

  getAliveNonWolves() {
    return this.players
      .map((p, i) => ({ ...p, index: i }))
      .filter(p => p.role !== 'werewolf' && p.alive);
  }

  getAlivePlayers() {
    return this.players
      .map((p, i) => ({ ...p, index: i }))
      .filter(p => p.alive);
  }
}

module.exports = { WerewolfEngine };
