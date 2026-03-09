import { describe, it, expect } from 'vitest';
import { WerewolfEngine } from './WerewolfEngine';

function setupGame(playerCount, roleOverrides) {
  const names = [];
  for (let i = 0; i < playerCount; i++) names.push(`Player${i}`);
  const engine = new WerewolfEngine();
  engine.reset(names);
  if (roleOverrides) {
    for (let i = 0; i < roleOverrides.length; i++) {
      engine.players[i].role = roleOverrides[i];
    }
  }
  return engine;
}

describe('WerewolfEngine', () => {
  // ─── Wolf vote: target is killed at dawn ───

  describe('wolf vote', () => {
    it('should kill the wolf target at dawn', () => {
      const engine = setupGame(6, ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager']);

      // First sub-phase is seer (no cupid with 6 players)
      expect(engine.subPhase).toBe('seer');
      engine.confirmPassScreen();
      engine.seerInspect(4);

      // Werewolves sub-phase
      expect(engine.subPhase).toBe('werewolves');
      engine.confirmPassScreen();
      engine.werewolfVote(0, 4);
      engine.werewolfVote(1, 4);
      engine.werewolfConfirm();

      // Witch sub-phase
      expect(engine.subPhase).toBe('witch');
      engine.confirmPassScreen();
      engine.witchSkip();

      expect(engine.players[4].alive).toBe(false);
      expect(engine.phase).toBe('day');
    });

    it('should randomly select among tied wolf vote targets', () => {
      const engine = setupGame(6, ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager']);

      engine.confirmPassScreen();
      engine.seerInspect(4);

      engine.confirmPassScreen();
      engine.werewolfVote(0, 4); // wolf 0 targets player 4
      engine.werewolfVote(1, 5); // wolf 1 targets player 5 — tie!
      engine.werewolfConfirm();

      // Target should be one of the tied players
      expect([4, 5]).toContain(engine.werewolfTarget);

      engine.confirmPassScreen();
      engine.witchSkip();

      // Exactly one of 4 or 5 should be dead
      const dead4 = !engine.players[4].alive;
      const dead5 = !engine.players[5].alive;
      expect((dead4 && !dead5) || (!dead4 && dead5)).toBe(true);
    });
  });

  // ─── Seer ───

  describe('seer', () => {
    it('should reveal a werewolf role', () => {
      const engine = setupGame(6, ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager']);

      engine.confirmPassScreen();
      engine.seerInspect(0);

      expect(engine.seerReveal).not.toBe(null);
      expect(engine.seerReveal.playerIdx).toBe(0);
      expect(engine.seerReveal.role).toBe('werewolf');
    });

    it('should reveal a villager role', () => {
      const engine = setupGame(6, ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager']);

      engine.confirmPassScreen();
      engine.seerInspect(4);

      expect(engine.seerReveal.role).toBe('villager');
    });
  });

  // ─── Witch ───

  describe('witch', () => {
    it('should heal the werewolf target', () => {
      const engine = setupGame(6, ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager']);

      engine.confirmPassScreen();
      engine.seerInspect(4);

      engine.confirmPassScreen();
      engine.werewolfVote(0, 4);
      engine.werewolfVote(1, 4);
      engine.werewolfConfirm();

      expect(engine.werewolfTarget).toBe(4);

      engine.confirmPassScreen();
      engine.witchAction(true, null);

      expect(engine.players[4].alive).toBe(true);
      expect(engine.witchHealUsed).toBe(true);
    });

    it('should kill an additional player', () => {
      const engine = setupGame(6, ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager']);

      engine.confirmPassScreen();
      engine.seerInspect(4);

      engine.confirmPassScreen();
      engine.werewolfVote(0, 4);
      engine.werewolfVote(1, 4);
      engine.werewolfConfirm();

      engine.confirmPassScreen();
      engine.witchAction(false, 5);

      expect(engine.players[4].alive).toBe(false);
      expect(engine.players[5].alive).toBe(false);
      expect(engine.witchKillUsed).toBe(true);
    });

    it('should heal and kill simultaneously', () => {
      const engine = setupGame(6, ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager']);

      engine.confirmPassScreen();
      engine.seerInspect(4);

      engine.confirmPassScreen();
      engine.werewolfVote(0, 4);
      engine.werewolfVote(1, 4);
      engine.werewolfConfirm();

      engine.confirmPassScreen();
      engine.witchAction(true, 5);

      expect(engine.players[4].alive).toBe(true);
      expect(engine.players[5].alive).toBe(false);
    });
  });

  // ─── Hunter ───

  describe('hunter', () => {
    it('should trigger revenge shot when hunter is killed', () => {
      const engine = setupGame(7, ['werewolf', 'werewolf', 'seer', 'witch', 'hunter', 'villager', 'villager']);

      engine.confirmPassScreen();
      engine.seerInspect(6);

      engine.confirmPassScreen();
      engine.werewolfVote(0, 4);
      engine.werewolfVote(1, 4);
      engine.werewolfConfirm();

      engine.confirmPassScreen();
      engine.witchSkip();

      expect(engine.players[4].alive).toBe(false);
      expect(engine.hunterPending).toBe(true);
      expect(engine.subPhase).toBe('hunter');

      engine.confirmPassScreen();
      engine.hunterShoot(0);

      expect(engine.players[0].alive).toBe(false);
      expect(engine.hunterPending).toBe(false);
      expect(engine.hunterShotUsed).toBe(true);
    });
  });

  // ─── Win conditions ───

  describe('win conditions', () => {
    it('should declare werewolves win when wolves >= others', () => {
      const engine = setupGame(5, ['werewolf', 'werewolf', 'seer', 'witch', 'villager']);

      // Night 1: wolves kill villager
      engine.confirmPassScreen();
      engine.seerInspect(0);

      engine.confirmPassScreen();
      engine.werewolfVote(0, 4);
      engine.werewolfVote(1, 4);
      engine.werewolfConfirm();

      engine.confirmPassScreen();
      engine.witchSkip();

      // After villager dies: 2 wolves vs 2 others => werewolves win
      expect(engine.winner).toBe('werewolves');
    });

    it('should declare villagers win when all wolves are dead', () => {
      const engine = setupGame(6, ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager']);

      // Night 1: wolves kill player 4, witch kills wolf 0
      engine.confirmPassScreen();
      engine.seerInspect(0);

      engine.confirmPassScreen();
      engine.werewolfVote(0, 4);
      engine.werewolfVote(1, 4);
      engine.werewolfConfirm();

      engine.confirmPassScreen();
      engine.witchAction(false, 0);

      // Now: wolf(1), seer, witch, villager(5) alive => 1 wolf vs 3 others
      expect(engine.winner).toBe(null);

      // Day vote: eliminate wolf 1
      engine.startVote();
      engine.castVote(2, 1);
      engine.castVote(3, 1);
      engine.castVote(5, 1);
      engine.resolveVotes();

      expect(engine.players[1].alive).toBe(false);
      expect(engine.winner).toBe('villagers');
    });

    it('should declare lovers win when only wolf+villager lovers remain', () => {
      const engine = setupGame(8, [
        'werewolf', 'werewolf', 'seer', 'witch', 'hunter', 'cupid', 'villager', 'villager'
      ]);

      // Cupid links wolf 0 and villager 6
      expect(engine.subPhase).toBe('cupid');
      engine.confirmPassScreen();
      engine.cupidChoose(0, 6);

      expect(engine.players[0].lovers).toBe(true);
      expect(engine.players[6].lovers).toBe(true);

      // Manually kill everyone except the lovers
      engine.players[1].alive = false;
      engine.players[2].alive = false;
      engine.players[3].alive = false;
      engine.players[4].alive = false;
      engine.players[5].alive = false;
      engine.players[7].alive = false;

      const result = engine._checkWinCondition();
      expect(result).toBe(true);
      expect(engine.winner).toBe('lovers');
    });
  });

  // ─── Day vote ───

  describe('day vote', () => {
    it('should not eliminate anyone on a tie vote', () => {
      const engine = setupGame(6, ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager']);

      // Run a full night first
      engine.confirmPassScreen();
      engine.seerInspect(4);

      engine.confirmPassScreen();
      engine.werewolfVote(0, 4);
      engine.werewolfVote(1, 4);
      engine.werewolfConfirm();

      engine.confirmPassScreen();
      engine.witchSkip();

      // Day phase
      expect(engine.phase).toBe('day');
      engine.startVote();

      // Tied vote: 2 votes for player 0, 2 votes for player 2
      engine.castVote(0, 2);
      engine.castVote(1, 2);
      engine.castVote(2, 0);
      engine.castVote(5, 0);

      const aliveBefore = engine.players.filter(p => p.alive).length;
      engine.resolveVotes();
      const aliveAfter = engine.players.filter(p => p.alive).length;

      expect(aliveAfter).toBe(aliveBefore);

      const hasTied = engine.log.some(l => l === 'tied');
      expect(hasTied).toBe(true);
    });
  });

  // ─── Lovers cascade ───

  describe('lovers cascade', () => {
    it('should kill the other lover when one dies', () => {
      const engine = setupGame(8, [
        'werewolf', 'werewolf', 'seer', 'witch', 'hunter', 'cupid', 'villager', 'villager'
      ]);

      // Cupid links players 6 and 7
      engine.confirmPassScreen();
      engine.cupidChoose(6, 7);

      // Seer
      engine.confirmPassScreen();
      engine.seerInspect(0);

      // Wolves kill player 6 (a lover)
      engine.confirmPassScreen();
      engine.werewolfVote(0, 6);
      engine.werewolfVote(1, 6);
      engine.werewolfConfirm();

      // Witch skips
      engine.confirmPassScreen();
      engine.witchSkip();

      expect(engine.players[6].alive).toBe(false);
      expect(engine.players[7].alive).toBe(false);
    });
  });

  // ─── Visible state ───

  describe('visible state', () => {
    it('should hide other alive players roles', () => {
      const engine = setupGame(6, ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager']);

      const state = engine.getVisibleState(2); // seer's view
      expect(state.myRole).toBe('seer');
      expect(state.players[2].role).toBe('seer');
      expect(state.players[0].role).toBe(null);
    });
  });

  // ─── Undo ───

  describe('undo', () => {
    it('should restore sub-phase after undoing seer inspect', () => {
      const engine = setupGame(6, ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager']);

      expect(engine.subPhase).toBe('seer');
      engine.confirmPassScreen();
      engine.seerInspect(0);

      expect(engine.subPhase).toBe('werewolves');
      engine.undo();

      expect(engine.subPhase).toBe('seer');
    });
  });
});
