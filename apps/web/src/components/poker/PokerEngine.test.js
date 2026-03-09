import { describe, it, expect } from 'vitest';
import { PokerEngine, evaluateBestHand, compareHands } from './PokerEngine';

function makeCard(value, suit) {
  const SUIT_SYMBOLS = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' };
  return { id: 0, suit, value, symbol: SUIT_SYMBOLS[suit] };
}

describe('PokerEngine', () => {
  describe('Blind posting', () => {
    it('should deduct correct blind amounts and fill the pot', () => {
      const engine = new PokerEngine(2, { startingChips: 1000, smallBlind: 10, bigBlind: 20 });
      engine.newHand();

      const sb = engine.players[engine.smallBlindIndex];
      const bb = engine.players[engine.bigBlindIndex];

      expect(sb.chips).toBe(990);
      expect(bb.chips).toBe(980);
      expect(engine.pot).toBe(30);
    });

    it('should handle insufficient chips for blinds', () => {
      const engine = new PokerEngine(2, { startingChips: 15, smallBlind: 10, bigBlind: 20 });
      engine.newHand();

      const sb = engine.players[engine.smallBlindIndex];
      const bb = engine.players[engine.bigBlindIndex];

      expect(sb.chips + sb.totalBet).toBe(15);
      expect(bb.chips + bb.totalBet).toBe(15);
    });
  });

  describe('Preflop action (heads-up)', () => {
    it('should let SB act first and BB check after SB limps', () => {
      const engine = new PokerEngine(2, { startingChips: 1000, smallBlind: 10, bigBlind: 20 });
      engine.newHand();

      const sbIdx = engine.smallBlindIndex;
      const bbIdx = engine.bigBlindIndex;

      expect(engine.currentPlayer).toBe(sbIdx);

      engine.call(sbIdx);

      expect(engine.currentPlayer).toBe(bbIdx);
      const actions = engine.getAvailableActions(bbIdx);
      expect(actions.canCheck).toBe(true);
      expect(actions.canRaise).toBe(true);
    });
  });

  describe('Fold', () => {
    it('should award the pot to the remaining player (heads-up)', () => {
      const engine = new PokerEngine(2, { startingChips: 1000, smallBlind: 10, bigBlind: 20 });
      engine.newHand();

      const sbIdx = engine.smallBlindIndex;
      const bbIdx = engine.bigBlindIndex;
      const bbChipsBefore = engine.players[bbIdx].chips;

      engine.fold(sbIdx);

      expect(engine.handOver).toBe(true);
      expect(engine.winners.length).toBe(1);
      expect(engine.winners[0].playerIndex).toBe(bbIdx);
      expect(engine.players[bbIdx].chips).toBe(bbChipsBefore + 30);
    });

    it('should not end the hand when one of three players folds', () => {
      const engine = new PokerEngine(3, { startingChips: 1000, smallBlind: 10, bigBlind: 20 });
      engine.newHand();

      const first = engine.currentPlayer;
      engine.fold(first);

      expect(engine.handOver).toBe(false);

      const second = engine.currentPlayer;
      engine.fold(second);

      expect(engine.handOver).toBe(true);
      expect(engine.winners.length).toBe(1);
    });
  });

  describe('All-in and side pots', () => {
    it('should create side pots with different stack sizes', () => {
      const engine = new PokerEngine(3, { startingChips: 1000, smallBlind: 10, bigBlind: 20 });

      // Set chips before newHand so blinds are posted from these amounts
      engine.players[0].chips = 100;
      engine.players[1].chips = 500;
      engine.players[2].chips = 1000;

      engine.newHand();

      // Everyone goes all-in
      let safety = 10;
      while (!engine.handOver && safety-- > 0) {
        const cp = engine.currentPlayer;
        engine.allIn(cp);
      }

      expect(engine.handOver).toBe(true);
      expect(engine.pots.length).toBeGreaterThanOrEqual(2);

      const mainPot = engine.pots[0];
      expect(mainPot.eligible.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Hand evaluation', () => {
    it('pair should beat high card', () => {
      const pairHand = [
        makeCard('A', 'spades'), makeCard('A', 'hearts'),
        makeCard('3', 'diamonds'), makeCard('5', 'clubs'), makeCard('7', 'spades'),
      ];
      const highCardHand = [
        makeCard('K', 'spades'), makeCard('Q', 'hearts'),
        makeCard('10', 'diamonds'), makeCard('8', 'clubs'), makeCard('2', 'spades'),
      ];

      const pairResult = evaluateBestHand(pairHand.slice(0, 2), pairHand.slice(2));
      const highResult = evaluateBestHand(highCardHand.slice(0, 2), highCardHand.slice(2));

      expect(compareHands(pairResult, highResult)).toBeGreaterThan(0);
    });

    it('flush should beat straight', () => {
      const flushHand = [
        makeCard('2', 'hearts'), makeCard('5', 'hearts'),
        makeCard('7', 'hearts'), makeCard('9', 'hearts'), makeCard('J', 'hearts'),
      ];
      const straightHand = [
        makeCard('5', 'spades'), makeCard('6', 'hearts'),
        makeCard('7', 'diamonds'), makeCard('8', 'clubs'), makeCard('9', 'spades'),
      ];

      const flushResult = evaluateBestHand(flushHand.slice(0, 2), flushHand.slice(2));
      const straightResult = evaluateBestHand(straightHand.slice(0, 2), straightHand.slice(2));

      expect(compareHands(flushResult, straightResult)).toBeGreaterThan(0);
    });

    it('full house should beat flush', () => {
      const fullHouse = [
        makeCard('K', 'spades'), makeCard('K', 'hearts'),
        makeCard('K', 'diamonds'), makeCard('3', 'clubs'), makeCard('3', 'spades'),
      ];
      const flush = [
        makeCard('A', 'clubs'), makeCard('10', 'clubs'),
        makeCard('8', 'clubs'), makeCard('6', 'clubs'), makeCard('2', 'clubs'),
      ];

      const fhResult = evaluateBestHand(fullHouse.slice(0, 2), fullHouse.slice(2));
      const flResult = evaluateBestHand(flush.slice(0, 2), flush.slice(2));

      expect(compareHands(fhResult, flResult)).toBeGreaterThan(0);
    });

    it('two pair should beat one pair', () => {
      const twoPair = [
        makeCard('K', 'spades'), makeCard('K', 'hearts'),
        makeCard('5', 'diamonds'), makeCard('5', 'clubs'), makeCard('2', 'spades'),
      ];
      const onePair = [
        makeCard('A', 'spades'), makeCard('A', 'hearts'),
        makeCard('10', 'diamonds'), makeCard('8', 'clubs'), makeCard('3', 'spades'),
      ];

      const tpResult = evaluateBestHand(twoPair.slice(0, 2), twoPair.slice(2));
      const opResult = evaluateBestHand(onePair.slice(0, 2), onePair.slice(2));

      expect(compareHands(tpResult, opResult)).toBeGreaterThan(0);
    });

    it('straight flush should beat four of a kind', () => {
      const straightFlush = [
        makeCard('5', 'hearts'), makeCard('6', 'hearts'),
        makeCard('7', 'hearts'), makeCard('8', 'hearts'), makeCard('9', 'hearts'),
      ];
      const fourKind = [
        makeCard('A', 'spades'), makeCard('A', 'hearts'),
        makeCard('A', 'diamonds'), makeCard('A', 'clubs'), makeCard('K', 'spades'),
      ];

      const sfResult = evaluateBestHand(straightFlush.slice(0, 2), straightFlush.slice(2));
      const fkResult = evaluateBestHand(fourKind.slice(0, 2), fourKind.slice(2));

      expect(compareHands(sfResult, fkResult)).toBeGreaterThan(0);
    });

    it('should recognize ace-low straight', () => {
      const wheel = [
        makeCard('A', 'spades'), makeCard('2', 'hearts'),
        makeCard('3', 'diamonds'), makeCard('4', 'clubs'), makeCard('5', 'spades'),
      ];

      const result = evaluateBestHand(wheel.slice(0, 2), wheel.slice(2));
      expect(result.rank).toBe(4);
    });
  });

  describe('Showdown', () => {
    it('should award the pot to the player with the best hand', () => {
      const engine = new PokerEngine(2, { startingChips: 1000, smallBlind: 10, bigBlind: 20 });
      engine.newHand();

      // Force specific hole cards
      engine.players[0].holeCards = [makeCard('A', 'spades'), makeCard('A', 'hearts')];
      engine.players[1].holeCards = [makeCard('2', 'spades'), makeCard('2', 'hearts')];

      // Pre-load the deck with 5 community cards that will be dealt during runOutBoard.
      // When both players go all-in preflop, _runOutBoard pops cards from the deck
      // until there are 5 community cards. deck.pop() takes from the end, so the
      // last 5 entries become the community cards (in reverse order).
      engine.deck = [
        makeCard('K', 'diamonds'),
        makeCard('J', 'clubs'),
        makeCard('9', 'diamonds'),
        makeCard('8', 'clubs'),
        makeCard('7', 'diamonds'),
      ];

      // Both go all-in preflop
      const cp1 = engine.currentPlayer;
      engine.allIn(cp1);
      if (!engine.handOver) {
        engine.allIn(engine.currentPlayer);
      }

      expect(engine.handOver).toBe(true);
      expect(engine.winners.length).toBeGreaterThan(0);
      // Player 0 has aces, player 1 has deuces; community doesn't help either
      expect(engine.winners[0].playerIndex).toBe(0);
    });
  });

  describe('getAvailableActions', () => {
    it('should not allow actions for a non-current player', () => {
      const engine = new PokerEngine(2, { startingChips: 1000, smallBlind: 10, bigBlind: 20 });
      engine.newHand();

      const nonCurrent = engine.currentPlayer === 0 ? 1 : 0;
      const actions = engine.getAvailableActions(nonCurrent);

      expect(actions.canFold).toBe(false);
      expect(actions.canCheck).toBe(false);
      expect(actions.canCall).toBe(false);
    });
  });

  describe('Actions after hand is over', () => {
    it('should reject fold when the hand is over', () => {
      const engine = new PokerEngine(2, { startingChips: 1000, smallBlind: 10, bigBlind: 20 });
      engine.newHand();
      engine.fold(engine.currentPlayer);

      expect(engine.handOver).toBe(true);
      expect(engine.fold(0)).toBe(false);
    });
  });

  describe('Undo', () => {
    it('should restore the previous state', () => {
      const engine = new PokerEngine(2, { startingChips: 1000, smallBlind: 10, bigBlind: 20 });
      engine.newHand();

      const cpBefore = engine.currentPlayer;
      const potBefore = engine.pot;
      const chipsBefore = engine.players[cpBefore].chips;

      engine.call(cpBefore);

      // State should have changed
      expect(engine.pot !== potBefore || engine.currentPlayer !== cpBefore).toBe(true);

      engine.undo();

      expect(engine.currentPlayer).toBe(cpBefore);
      expect(engine.pot).toBe(potBefore);
      expect(engine.players[cpBefore].chips).toBe(chipsBefore);
    });
  });

  describe('Game over detection', () => {
    it('should end the game when one player has all the chips', () => {
      const engine = new PokerEngine(2, { startingChips: 100, smallBlind: 10, bigBlind: 20 });
      engine.newHand();

      const cp = engine.currentPlayer;
      engine.allIn(cp);
      if (!engine.handOver) {
        engine.allIn(engine.currentPlayer);
      }

      expect(engine.handOver).toBe(true);
      expect(engine.gameOver).toBe(true);
      expect(engine.finalWinner).not.toBeNull();
    });
  });

  describe('Raise validation', () => {
    it('should accept a min raise to 40', () => {
      const engine = new PokerEngine(2, { startingChips: 1000, smallBlind: 10, bigBlind: 20 });
      engine.newHand();

      const cp = engine.currentPlayer;
      const result = engine.raise(cp, 40);
      expect(result).toBe(true);
    });
  });
});
