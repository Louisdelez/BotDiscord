import { describe, it, expect } from 'vitest';
import { UnoEngine } from './UnoEngine';

// --- Helper: set up a controlled game state ---

function createControlledGame(playerCount = 2) {
  const engine = new UnoEngine(playerCount);
  // Clear hands and set up a known discard card
  for (let i = 0; i < engine.playerCount; i++) {
    engine.hands[i] = [];
  }
  engine.discard = [{ id: 900, color: 'red', type: 'number', value: 5 }];
  engine.currentColor = 'red';
  engine.currentPlayer = 0;
  engine.direction = 1;
  engine.winner = null;
  engine.hasDrawn = false;
  engine.unoCalled = new Array(playerCount).fill(false);
  return engine;
}

// ===================== TESTS =====================

describe('UnoEngine', () => {
  describe('2-player skip: current player stays the same after skip', () => {
    it('should keep current player as 0 after playing skip in 2-player game', () => {
      const engine = createControlledGame(2);
      engine.hands[0] = [
        { id: 100, color: 'red', type: 'skip', value: 'skip' },
        { id: 101, color: 'red', type: 'number', value: 1 },
        { id: 102, color: 'red', type: 'number', value: 2 },
      ];
      engine.hands[1] = [
        { id: 200, color: 'blue', type: 'number', value: 3 },
        { id: 201, color: 'blue', type: 'number', value: 4 },
      ];

      expect(engine.currentPlayer).toBe(0);
      const result = engine.playCard(0, 0); // play skip
      expect(result).toBe(true);
      expect(engine.currentPlayer).toBe(0);
    });
  });

  describe('2-player reverse: acts like skip', () => {
    it('should advance to player 1 after reverse in 2-player game', () => {
      const engine = createControlledGame(2);
      engine.hands[0] = [
        { id: 100, color: 'red', type: 'reverse', value: 'reverse' },
        { id: 101, color: 'red', type: 'number', value: 1 },
        { id: 102, color: 'red', type: 'number', value: 2 },
      ];
      engine.hands[1] = [
        { id: 200, color: 'blue', type: 'number', value: 3 },
        { id: 201, color: 'blue', type: 'number', value: 4 },
      ];

      expect(engine.currentPlayer).toBe(0);
      engine.playCard(0, 0); // play reverse
      expect(engine.currentPlayer).toBe(1);
    });
  });

  describe('draw2: next player draws 2 cards and is skipped', () => {
    it('should make next player draw 2 cards and skip them', () => {
      const engine = createControlledGame(2);
      engine.hands[0] = [
        { id: 100, color: 'red', type: 'draw2', value: 'draw2' },
        { id: 101, color: 'red', type: 'number', value: 1 },
        { id: 102, color: 'red', type: 'number', value: 2 },
      ];
      engine.hands[1] = [
        { id: 200, color: 'blue', type: 'number', value: 3 },
        { id: 201, color: 'blue', type: 'number', value: 4 },
      ];

      engine.deck = [
        { id: 300, color: 'green', type: 'number', value: 7 },
        { id: 301, color: 'green', type: 'number', value: 8 },
        { id: 302, color: 'green', type: 'number', value: 9 },
        { id: 303, color: 'green', type: 'number', value: 6 },
      ];

      const player1HandBefore = engine.hands[1].length;
      engine.playCard(0, 0); // play draw2

      expect(engine.hands[1].length).toBe(player1HandBefore + 2);
      expect(engine.currentPlayer).toBe(0);
    });
  });

  describe('wild4: next player draws 4 cards and is skipped', () => {
    it('should make next player draw 4 cards, change color, and skip them', () => {
      const engine = createControlledGame(2);
      engine.hands[0] = [
        { id: 100, color: 'wild', type: 'wild4', value: 'wild4' },
        { id: 101, color: 'red', type: 'number', value: 1 },
        { id: 102, color: 'red', type: 'number', value: 2 },
      ];
      engine.hands[1] = [
        { id: 200, color: 'blue', type: 'number', value: 3 },
        { id: 201, color: 'blue', type: 'number', value: 4 },
      ];

      engine.deck = [
        { id: 300, color: 'green', type: 'number', value: 1 },
        { id: 301, color: 'green', type: 'number', value: 2 },
        { id: 302, color: 'green', type: 'number', value: 3 },
        { id: 303, color: 'green', type: 'number', value: 4 },
        { id: 304, color: 'green', type: 'number', value: 5 },
      ];

      const player1HandBefore = engine.hands[1].length;
      engine.playCard(0, 0, 'blue'); // play wild4, choose blue

      expect(engine.hands[1].length).toBe(player1HandBefore + 4);
      expect(engine.currentColor).toBe('blue');
      expect(engine.currentPlayer).toBe(0);
    });
  });

  describe('UNO call: player with 1 card who called UNO does not get penalty', () => {
    it('should not penalize a player who called UNO before going to 1 card', () => {
      const engine = createControlledGame(2);
      engine.hands[0] = [
        { id: 100, color: 'red', type: 'number', value: 3 },
        { id: 101, color: 'red', type: 'number', value: 4 },
      ];
      engine.hands[1] = [
        { id: 200, color: 'blue', type: 'number', value: 5 },
        { id: 201, color: 'blue', type: 'number', value: 6 },
      ];

      const callResult = engine.callUno(0);
      expect(callResult).toBe(true);
      expect(engine.unoCalled[0]).toBe(true);

      engine.playCard(0, 0); // play card, going from 2 to 1 card

      expect(engine.hands[0].length).toBe(1);
    });
  });

  describe('UNO penalty: player with 1 card who did not call UNO draws 2 penalty cards', () => {
    it('should penalize a player who did not call UNO with 2 extra cards', () => {
      const engine = createControlledGame(2);
      engine.hands[0] = [
        { id: 100, color: 'red', type: 'number', value: 3 },
        { id: 101, color: 'red', type: 'number', value: 4 },
      ];
      engine.hands[1] = [
        { id: 200, color: 'blue', type: 'number', value: 5 },
        { id: 201, color: 'blue', type: 'number', value: 6 },
      ];

      engine.deck = [
        { id: 300, color: 'green', type: 'number', value: 7 },
        { id: 301, color: 'green', type: 'number', value: 8 },
        { id: 302, color: 'green', type: 'number', value: 9 },
      ];

      // Player 0 does NOT call UNO
      engine.playCard(0, 0); // play card, going from 2 to 1 card

      // Should have drawn 2 penalty cards: 1 remaining + 2 penalty = 3
      expect(engine.hands[0].length).toBe(3);
    });
  });

  describe('Color matching: can play card of same color', () => {
    it('should allow red card on red discard and reject blue card with different number', () => {
      const engine = createControlledGame(2);
      const redCard = { id: 100, color: 'red', type: 'number', value: 9 };
      const blueCard = { id: 101, color: 'blue', type: 'number', value: 9 };

      expect(engine.isLegalPlay(redCard)).toBe(true);
      expect(engine.isLegalPlay(blueCard)).toBe(false);
    });
  });

  describe('Number matching: can play card of same number on different color', () => {
    it('should allow same number different color and reject different number different color', () => {
      const engine = createControlledGame(2);
      const blue5 = { id: 100, color: 'blue', type: 'number', value: 5 };
      const blue3 = { id: 101, color: 'blue', type: 'number', value: 3 };

      expect(engine.isLegalPlay(blue5)).toBe(true);
      expect(engine.isLegalPlay(blue3)).toBe(false);
    });
  });

  describe('Wild can always be played', () => {
    it('should allow wild and wild4 on any color', () => {
      const engine = createControlledGame(2);
      const wildCard = { id: 100, color: 'wild', type: 'wild', value: 'wild' };
      const wild4Card = { id: 101, color: 'wild', type: 'wild4', value: 'wild4' };

      expect(engine.isLegalPlay(wildCard)).toBe(true);
      expect(engine.isLegalPlay(wild4Card)).toBe(true);

      // Change color to something else and recheck
      engine.currentColor = 'green';
      expect(engine.isLegalPlay(wildCard)).toBe(true);
      expect(engine.isLegalPlay(wild4Card)).toBe(true);
    });
  });

  describe('Game over when hand is empty', () => {
    it('should declare winner when a player plays their last card', () => {
      const engine = createControlledGame(2);
      engine.hands[0] = [
        { id: 100, color: 'red', type: 'number', value: 3 },
      ];
      engine.hands[1] = [
        { id: 200, color: 'blue', type: 'number', value: 5 },
        { id: 201, color: 'blue', type: 'number', value: 6 },
      ];

      engine.playCard(0, 0);

      expect(engine.hands[0].length).toBe(0);
      expect(engine.winner).toBe(0);
      expect(engine.getStatus()).toBe('won');
    });
  });

  describe('Cannot play wrong player turn', () => {
    it('should reject a play from a player whose turn it is not', () => {
      const engine = createControlledGame(2);
      engine.hands[0] = [
        { id: 100, color: 'red', type: 'number', value: 1 },
      ];
      engine.hands[1] = [
        { id: 200, color: 'red', type: 'number', value: 2 },
      ];

      const result = engine.playCard(1, 0); // player 1 tries to play on player 0's turn
      expect(result).toBe(false);
    });
  });

  describe('Wild card requires chosen color', () => {
    it('should reject wild without color and accept wild with color', () => {
      const engine = createControlledGame(2);
      engine.hands[0] = [
        { id: 100, color: 'wild', type: 'wild', value: 'wild' },
        { id: 101, color: 'red', type: 'number', value: 1 },
        { id: 102, color: 'red', type: 'number', value: 2 },
      ];
      engine.hands[1] = [
        { id: 200, color: 'blue', type: 'number', value: 3 },
        { id: 201, color: 'blue', type: 'number', value: 4 },
      ];

      const resultNoColor = engine.playCard(0, 0); // no color chosen
      expect(resultNoColor).toBe(false);

      const resultWithColor = engine.playCard(0, 0, 'green');
      expect(resultWithColor).toBe(true);
      expect(engine.currentColor).toBe('green');
    });
  });

  describe('Draw card and pass turn', () => {
    it('should allow drawing a card, prevent drawing twice, and allow passing', () => {
      const engine = createControlledGame(2);
      engine.hands[0] = [
        { id: 100, color: 'blue', type: 'number', value: 9 },
      ];
      engine.hands[1] = [
        { id: 200, color: 'blue', type: 'number', value: 3 },
      ];

      engine.deck = [
        { id: 300, color: 'green', type: 'number', value: 7 },
      ];

      const drawResult = engine.drawCard(0);
      expect(drawResult).toBe(true);
      expect(engine.hands[0].length).toBe(2);
      expect(engine.hasDrawn).toBe(true);

      // Cannot draw again
      const drawAgain = engine.drawCard(0);
      expect(drawAgain).toBe(false);

      // Pass turn
      const passResult = engine.passTurn(0);
      expect(passResult).toBe(true);
      expect(engine.currentPlayer).toBe(1);
    });
  });

  describe('Undo restores previous state', () => {
    it('should restore hand and current player after undo', () => {
      const engine = createControlledGame(2);
      engine.hands[0] = [
        { id: 100, color: 'red', type: 'number', value: 3 },
        { id: 101, color: 'red', type: 'number', value: 4 },
        { id: 102, color: 'red', type: 'number', value: 6 },
      ];
      engine.hands[1] = [
        { id: 200, color: 'blue', type: 'number', value: 5 },
        { id: 201, color: 'blue', type: 'number', value: 6 },
      ];

      const handSizeBefore = engine.hands[0].length;
      engine.playCard(0, 0);

      expect(engine.hands[0].length).toBe(handSizeBefore - 1);
      const undoResult = engine.undo();
      expect(undoResult).toBe(true);
      expect(engine.hands[0].length).toBe(handSizeBefore);
      expect(engine.currentPlayer).toBe(0);
    });
  });
});
