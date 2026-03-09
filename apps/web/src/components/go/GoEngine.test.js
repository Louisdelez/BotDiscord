import { describe, it, expect } from 'vitest';
import { GoEngine } from './GoEngine';

describe('GoEngine', () => {
  // ─── Stone placement ───

  describe('stone placement', () => {
    it('should place a black stone on an empty intersection', () => {
      const engine = new GoEngine(9);
      const result = engine.placeStone(0, 0);
      expect(result.success).toBe(true);
      expect(engine.board[0][0]).toBe('black');
      expect(engine.currentPlayer).toBe('white');
    });

    it('should reject placement on an occupied intersection', () => {
      const engine = new GoEngine(9);
      engine.placeStone(0, 0);
      const result = engine.placeStone(0, 0);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('occupied');
    });

    it('should reject out-of-bounds placement', () => {
      const engine = new GoEngine(9);
      const result = engine.placeStone(-1, 0);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('outOfBounds');
    });

    it('should alternate turns between black and white', () => {
      const engine = new GoEngine(9);
      engine.placeStone(0, 0); // black
      engine.placeStone(4, 4); // white

      expect(engine.board[0][0]).toBe('black');
      expect(engine.board[4][4]).toBe('white');
      expect(engine.currentPlayer).toBe('black');
      expect(engine.moveCount).toBe(2);
    });
  });

  // ─── Capture ───

  describe('capture', () => {
    it('should capture a single surrounded stone', () => {
      const engine = new GoEngine(9);

      // Place black at 1,1
      engine.placeStone(1, 1); // black
      // Surround with white
      engine.placeStone(0, 1); // white
      engine.placeStone(3, 3); // black (elsewhere)
      engine.placeStone(2, 1); // white
      engine.placeStone(3, 4); // black
      engine.placeStone(1, 0); // white
      engine.placeStone(4, 4); // black
      engine.placeStone(1, 2); // white — captures black at 1,1

      expect(engine.board[1][1]).toBe(null);
      expect(engine.captures.white).toBe(1);
    });

    it('should capture a group of 2 stones', () => {
      const engine = new GoEngine(9);

      // Black stones at 1,1 and 1,2
      engine.placeStone(1, 1); // black
      engine.placeStone(0, 0); // white (elsewhere)
      engine.placeStone(1, 2); // black

      // Surround with white: 0,1  0,2  1,0  1,3  2,1  2,2
      engine.placeStone(0, 1); // white
      engine.placeStone(5, 5); // black
      engine.placeStone(0, 2); // white
      engine.placeStone(5, 6); // black
      engine.placeStone(1, 0); // white
      engine.placeStone(5, 7); // black
      engine.placeStone(1, 3); // white
      engine.placeStone(6, 5); // black
      engine.placeStone(2, 1); // white
      engine.placeStone(6, 6); // black
      engine.placeStone(2, 2); // white — captures group

      expect(engine.board[1][1]).toBe(null);
      expect(engine.board[1][2]).toBe(null);
      expect(engine.captures.white).toBe(2);
    });

    it('should capture a stone in the corner', () => {
      const engine = new GoEngine(9);

      engine.placeStone(0, 0); // black
      engine.placeStone(0, 1); // white
      engine.placeStone(5, 5); // black (elsewhere)
      engine.placeStone(1, 0); // white — captures black at 0,0

      expect(engine.board[0][0]).toBe(null);
      expect(engine.captures.white).toBe(1);
    });
  });

  // ─── Ko rule ───

  describe('ko rule', () => {
    it('should detect ko and prevent immediate recapture', () => {
      const engine = new GoEngine(9);

      // Set up a ko shape:
      //     col: 0 1 2 3
      // r0:      . B W .
      // r1:      B W . W
      // r2:      . B W .
      //
      // Black plays at (1,2) to capture white at (1,1).
      // After capture, black at (1,2) is a single stone with
      // neighbors (0,2)=white, (2,2)=white, (1,3)=white, (1,1)=empty.
      // Exactly 1 liberty, group size 1 => ko point set to (1,1).

      engine.board[0][1] = 'black';
      engine.board[0][2] = 'white';
      engine.board[1][0] = 'black';
      engine.board[1][1] = 'white';
      engine.board[1][3] = 'white';
      engine.board[2][1] = 'black';
      engine.board[2][2] = 'white';

      // Black captures white at (1,1) by playing at (1,2)
      engine.currentPlayer = 'black';
      const captureResult = engine.placeStone(1, 2);

      expect(captureResult.success).toBe(true);
      expect(engine.board[1][1]).toBe(null);
      expect(engine.board[1][2]).toBe('black');

      // Ko point should be set at (1,1) — the captured stone's position
      expect(engine.koPoint).not.toBe(null);
      expect(engine.koPoint[0]).toBe(1);
      expect(engine.koPoint[1]).toBe(1);

      // White cannot immediately recapture at (1,1)
      const koResult = engine.placeStone(1, 1);
      expect(koResult.success).toBe(false);
      expect(koResult.reason).toBe('ko');
    });
  });

  // ─── Suicide prevention ───

  describe('suicide prevention', () => {
    it('should reject suicide moves', () => {
      const engine = new GoEngine(9);

      engine.board[0][1] = 'white';
      engine.board[1][0] = 'white';
      engine.currentPlayer = 'black';

      const result = engine.placeStone(0, 0);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('suicide');
    });

    it('should allow placement that captures opponent stones (not suicide)', () => {
      const engine = new GoEngine(9);

      engine.board[0][0] = 'white';
      engine.board[0][1] = 'black';

      engine.currentPlayer = 'black';
      const result = engine.placeStone(1, 0);

      expect(result.success).toBe(true);
      expect(engine.board[0][0]).toBe(null);
    });
  });

  // ─── Pass and game ending ───

  describe('pass', () => {
    it('should enter scoring phase after double pass', () => {
      const engine = new GoEngine(9);

      engine.pass();
      expect(engine.passCount).toBe(1);
      expect(engine.phase).toBe('playing');

      engine.pass();
      expect(engine.passCount).toBe(2);
      expect(engine.phase).toBe('scoring');
    });

    it('should reset pass count after stone placement', () => {
      const engine = new GoEngine(9);

      engine.pass();
      expect(engine.passCount).toBe(1);

      engine.placeStone(0, 0);
      expect(engine.passCount).toBe(0);
    });
  });

  // ─── Score calculation ───

  describe('score calculation', () => {
    it('should calculate territory correctly with a dividing wall', () => {
      const engine = new GoEngine(9);

      for (let c = 0; c < 9; c++) {
        engine.board[4][c] = 'black';
        engine.board[5][c] = 'white';
      }

      const score = engine.calculateScore();

      expect(score.black).toBe(36);
      expect(score.white).toBe(27);
      expect(score.blackTotal).toBe(36 + 9);
      expect(score.whiteTotal).toBe(27 + 9 + 6.5);
    });

    it('should return zero territory on an empty board', () => {
      const engine = new GoEngine(9);
      const score = engine.calculateScore();

      expect(score.black).toBe(0);
      expect(score.white).toBe(0);
      expect(score.blackTotal).toBe(0);
      expect(score.whiteTotal).toBe(6.5);
    });
  });

  // ─── confirmScoring ───

  describe('confirmScoring', () => {
    it('should determine the winner after confirming score', () => {
      const engine = new GoEngine(9);

      for (let c = 0; c < 9; c++) {
        engine.board[4][c] = 'black';
        engine.board[5][c] = 'white';
      }

      engine.phase = 'scoring';
      engine.confirmScoring();

      expect(engine.phase).toBe('gameOver');
      expect(engine.gameOver).toBe(true);
      expect(engine.winner).toBe('black');
    });
  });

  // ─── Undo ───

  describe('undo', () => {
    it('should restore state after undoing a stone placement', () => {
      const engine = new GoEngine(9);
      engine.placeStone(3, 3);

      expect(engine.board[3][3]).toBe('black');
      expect(engine.currentPlayer).toBe('white');

      engine.undo();

      expect(engine.board[3][3]).toBe(null);
      expect(engine.currentPlayer).toBe('black');
      expect(engine.moveCount).toBe(0);
    });

    it('should restore playing phase after undoing second pass', () => {
      const engine = new GoEngine(9);
      engine.pass();
      engine.pass();

      expect(engine.phase).toBe('scoring');
      engine.undo();
      expect(engine.phase).toBe('playing');
      expect(engine.passCount).toBe(1);
    });
  });

  // ─── Phase enforcement ───

  describe('phase enforcement', () => {
    it('should reject stone placement when not in playing phase', () => {
      const engine = new GoEngine(9);
      engine.pass();
      engine.pass();

      expect(engine.phase).toBe('scoring');
      const result = engine.placeStone(0, 0);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('notPlaying');
    });
  });

  // ─── Ko point clears after pass ───

  describe('ko point clearing', () => {
    it('should clear ko point after a pass', () => {
      const engine = new GoEngine(9);
      engine.koPoint = [3, 3];
      engine.pass();

      expect(engine.koPoint).toBe(null);
    });
  });

  // ─── Hoshi points ───

  describe('hoshi points', () => {
    it('should return correct hoshi counts for different board sizes', () => {
      const engine9 = new GoEngine(9);
      expect(engine9.getHoshi().length).toBe(5);

      const engine19 = new GoEngine(19);
      expect(engine19.getHoshi().length).toBe(9);
    });
  });
});
