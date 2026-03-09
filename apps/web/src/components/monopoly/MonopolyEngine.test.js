import { describe, it, expect } from 'vitest';
import { MonopolyEngine } from './MonopolyEngine';
import {
  SPACES, GO_SALARY, STARTING_MONEY, COLOR_GROUPS,
} from './MonopolyData';

// ===================== TESTS =====================

describe('MonopolyEngine', () => {
  describe('GO salary: player collects $200 when passing GO', () => {
    it('should give player GO salary when passing GO', () => {
      const engine = new MonopolyEngine(2);
      const player = engine.players[0];
      player.position = 38; // near the end of the board

      const moneyBefore = player.money;
      engine._movePlayer(player, 5); // 38 + 5 = 43 % 40 = 3, passes GO

      expect(player.position).toBe(3);
      const goLog = engine.log.find(l => l.type === 'go');
      expect(goLog).toBeDefined();
      expect(goLog.amount).toBe(GO_SALARY);
      expect(player.money).toBeGreaterThanOrEqual(moneyBefore + GO_SALARY);
    });
  });

  describe('GO salary on exact landing: player collects when landing exactly on GO', () => {
    it('should give player GO salary when landing exactly on GO', () => {
      const engine = new MonopolyEngine(2);
      const player = engine.players[0];
      player.position = 37; // 3 spaces before GO

      const moneyBefore = player.money;
      engine._movePlayer(player, 3); // 37 + 3 = 40 % 40 = 0, lands on GO

      expect(player.position).toBe(0);
      const goLog = engine.log.find(l => l.type === 'go');
      expect(goLog).toBeDefined();
      expect(player.money).toBe(moneyBefore + GO_SALARY);
    });
  });

  describe('Jail: player goes to jail on space 30', () => {
    it('should send player to jail when landing on go-to-jail space', () => {
      const engine = new MonopolyEngine(2);
      const player = engine.players[0];
      player.position = 28;

      engine._movePlayer(player, 2); // lands on space 30 (go-to-jail)

      expect(player.position).toBe(10);
      expect(player.inJail).toBe(true);
      expect(engine.turnPhase).toBe('end');
    });
  });

  describe('Property purchase: player can buy unowned property', () => {
    it('should allow player to buy an unowned property', () => {
      const engine = new MonopolyEngine(2);
      const player = engine.players[0];

      player.position = 0;
      engine.currentPlayer = 0;
      engine._movePlayer(player, 1);

      expect(player.position).toBe(1);
      expect(engine.turnPhase).toBe('buy');
      expect(engine.pendingBuy).toBe(1);

      const moneyBefore = player.money;
      const space = SPACES[1];
      const buyResult = engine.buyProperty();

      expect(buyResult).toBe(true);
      expect(player.money).toBe(moneyBefore - space.price);
      expect(player.properties.includes(1)).toBe(true);
      expect(engine.properties[1].owner).toBe(0);
      expect(engine.turnPhase).toBe('end');
    });
  });

  describe('Rent payment: player pays rent to property owner', () => {
    it('should charge rent when landing on an owned property', () => {
      const engine = new MonopolyEngine(2);

      const owner = engine.players[0];
      const tenant = engine.players[1];

      owner.properties.push(1);
      engine.properties[1] = { owner: 0, houses: 0, mortgaged: false };

      tenant.position = 0;
      engine.currentPlayer = 1;
      engine.diceRolled = true;
      engine.dice = [1, 0];
      engine._movePlayer(tenant, 1);

      const space = SPACES[1];
      const expectedRent = space.rents[0];

      const rentLog = engine.log.find(l => l.type === 'rent');
      expect(rentLog).toBeDefined();
      expect(rentLog.from).toBe(1);
      expect(rentLog.to).toBe(0);
      expect(rentLog.amount).toBe(expectedRent);
    });
  });

  describe('Rent payment: monopoly doubles rent', () => {
    it('should double rent when owner has a monopoly', () => {
      const engine = new MonopolyEngine(2);
      const owner = engine.players[0];
      const tenant = engine.players[1];

      // Give player 0 both brown properties (1 and 3) for monopoly
      owner.properties.push(1, 3);
      engine.properties[1] = { owner: 0, houses: 0, mortgaged: false };
      engine.properties[3] = { owner: 0, houses: 0, mortgaged: false };

      tenant.position = 0;
      engine.currentPlayer = 1;
      engine.diceRolled = true;
      engine.dice = [1, 0];

      const ownerMoneyBefore = owner.money;
      const tenantMoneyBefore = tenant.money;

      engine._movePlayer(tenant, 1); // land on position 1

      const space = SPACES[1];
      const expectedRent = space.rents[0] * 2; // doubled for monopoly

      const rentLog = engine.log.find(l => l.type === 'rent');
      expect(rentLog).toBeDefined();
      expect(rentLog.amount).toBe(expectedRent);
      expect(owner.money).toBe(ownerMoneyBefore + expectedRent);
      expect(tenant.money).toBe(tenantMoneyBefore - expectedRent);
    });
  });

  describe('Bankruptcy: player goes bankrupt when money < 0', () => {
    it('should mark player as bankrupt and clear their properties', () => {
      const engine = new MonopolyEngine(2);
      const player = engine.players[0];
      const creditor = engine.players[1];

      player.money = 1;
      engine.currentPlayer = 0;

      engine.pendingBankruptcy = { creditor: 1, amount: 100 };
      engine.turnPhase = 'bankrupt';
      player.money = -99;

      const result = engine.declareBankruptcy();
      expect(result).toBe(true);
      expect(player.bankrupt).toBe(true);
      expect(player.money).toBe(0);
      expect(player.properties.length).toBe(0);

      const bankruptLog = engine.log.find(l => l.type === 'bankrupt');
      expect(bankruptLog).toBeDefined();
    });
  });

  describe('Bankruptcy: game over when only one player remains', () => {
    it('should end the game when only one player is left', () => {
      const engine = new MonopolyEngine(2);
      engine.players[0].money = -100;
      engine.currentPlayer = 0;
      engine.pendingBankruptcy = { creditor: null, amount: 100 };
      engine.turnPhase = 'bankrupt';

      engine.declareBankruptcy();

      expect(engine.gameOver).toBe(true);
      expect(engine.winner).toBe(1);
      expect(engine.getStatus()).toBe('gameOver');
    });
  });

  describe('Trade: basic trade between players works', () => {
    it('should transfer properties and money between players', () => {
      const engine = new MonopolyEngine(2);
      const player0 = engine.players[0];
      const player1 = engine.players[1];

      player0.properties.push(1);
      engine.properties[1] = { owner: 0, houses: 0, mortgaged: false };
      player1.properties.push(3);
      engine.properties[3] = { owner: 1, houses: 0, mortgaged: false };

      const offer = {
        propertiesFrom: [1],
        propertiesTo: [3],
        moneyFrom: 50,
        moneyTo: 0,
        jailCardsFrom: 0,
        jailCardsTo: 0,
      };

      const proposeResult = engine.proposeTrade(0, 1, offer);
      expect(proposeResult).toBe(true);
      expect(engine.pendingTrade).not.toBeNull();

      const money0Before = player0.money;
      const money1Before = player1.money;

      const acceptResult = engine.acceptTrade();
      expect(acceptResult).toBe(true);

      // Check property transfer
      expect(engine.properties[1].owner).toBe(1);
      expect(engine.properties[3].owner).toBe(0);
      expect(player0.properties.includes(3)).toBe(true);
      expect(player1.properties.includes(1)).toBe(true);
      expect(player0.properties.includes(1)).toBe(false);
      expect(player1.properties.includes(3)).toBe(false);

      // Check money transfer
      expect(player0.money).toBe(money0Before - 50);
      expect(player1.money).toBe(money1Before + 50);

      expect(engine.pendingTrade).toBeNull();
    });
  });

  describe('Trade: reject trade clears pending trade', () => {
    it('should clear pending trade and keep original ownership on rejection', () => {
      const engine = new MonopolyEngine(2);
      engine.players[0].properties.push(1);
      engine.properties[1] = { owner: 0, houses: 0, mortgaged: false };

      const offer = {
        propertiesFrom: [1],
        propertiesTo: [],
        moneyFrom: 0,
        moneyTo: 100,
        jailCardsFrom: 0,
        jailCardsTo: 0,
      };

      engine.proposeTrade(0, 1, offer);
      expect(engine.pendingTrade).not.toBeNull();

      engine.rejectTrade();
      expect(engine.pendingTrade).toBeNull();
      expect(engine.properties[1].owner).toBe(0);
    });
  });

  describe('Property purchase: cannot buy if not enough money', () => {
    it('should go to auction when player cannot afford the property', () => {
      const engine = new MonopolyEngine(2);
      const player = engine.players[0];
      player.money = 10;
      player.position = 0;
      engine.currentPlayer = 0;

      engine._movePlayer(player, 1);

      expect(engine.turnPhase).toBe('auction');
    });
  });

  describe('End turn advances to next player', () => {
    it('should advance to the next player on end turn', () => {
      const engine = new MonopolyEngine(2);
      engine.turnPhase = 'end';
      engine.diceRolled = true;
      engine.dice = [3, 4]; // not doubles

      expect(engine.currentPlayer).toBe(0);
      engine.endTurn();
      expect(engine.currentPlayer).toBe(1);
      expect(engine.turnPhase).toBe('roll');
    });
  });

  describe('Doubles: same player rolls again', () => {
    it('should let the same player roll again on doubles', () => {
      const engine = new MonopolyEngine(2);
      engine.turnPhase = 'end';
      engine.diceRolled = true;
      engine.dice = [3, 3]; // doubles
      engine.doublesCount = 1;

      engine.endTurn();
      expect(engine.currentPlayer).toBe(0);
      expect(engine.turnPhase).toBe('roll');
    });
  });

  describe('Mortgage and unmortgage property', () => {
    it('should mortgage and unmortgage a property with correct money changes', () => {
      const engine = new MonopolyEngine(2);
      const player = engine.players[0];
      player.properties.push(1);
      engine.properties[1] = { owner: 0, houses: 0, mortgaged: false };

      const space = SPACES[1];
      const moneyBefore = player.money;

      // Mortgage
      const mortgageResult = engine.mortgageProperty(0, 1);
      expect(mortgageResult).toBe(true);
      expect(engine.properties[1].mortgaged).toBe(true);
      expect(player.money).toBe(moneyBefore + space.mortgage);

      // Unmortgage (costs 110% of mortgage)
      const moneyBeforeUnmortgage = player.money;
      const unmortgageCost = Math.ceil(space.mortgage * 1.1);
      const unmortgageResult = engine.unmortgageProperty(0, 1);
      expect(unmortgageResult).toBe(true);
      expect(engine.properties[1].mortgaged).toBe(false);
      expect(player.money).toBe(moneyBeforeUnmortgage - unmortgageCost);
    });
  });
});
