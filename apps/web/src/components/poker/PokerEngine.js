const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };

const HAND_RANKS = {
  ROYAL_FLUSH: 9,
  STRAIGHT_FLUSH: 8,
  FOUR_OF_A_KIND: 7,
  FULL_HOUSE: 6,
  FLUSH: 5,
  STRAIGHT: 4,
  THREE_OF_A_KIND: 3,
  TWO_PAIR: 2,
  ONE_PAIR: 1,
  HIGH_CARD: 0,
};

const HAND_NAMES = {
  9: 'poker.royalFlush',
  8: 'poker.straightFlush',
  7: 'poker.fourOfAKind',
  6: 'poker.fullHouse',
  5: 'poker.flush',
  4: 'poker.straight',
  3: 'poker.threeOfAKind',
  2: 'poker.twoPair',
  1: 'poker.onePair',
  0: 'poker.highCard',
};

function createDeck() {
  const deck = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ id: id++, suit, value, symbol: SUIT_SYMBOLS[suit] });
    }
  }
  return deck;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function valueIndex(value) {
  return VALUES.indexOf(value);
}

// ─── Hand evaluation ───

function getCombinations(arr, k) {
  const results = [];
  function combine(start, combo) {
    if (combo.length === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  combine(0, []);
  return results;
}

function evaluateFiveCards(cards) {
  const values = cards.map(c => valueIndex(c.value)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = values[0];

  // Normal straight check
  if (values[0] - values[4] === 4 && new Set(values).size === 5) {
    isStraight = true;
  }
  // Ace-low straight: A-2-3-4-5
  if (values[0] === 12 && values[1] === 3 && values[2] === 2 && values[3] === 1 && values[4] === 0) {
    isStraight = true;
    straightHigh = 3; // 5 is the high card in wheel
  }

  // Count values
  const counts = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  const countEntries = Object.entries(counts)
    .map(([v, c]) => ({ value: Number(v), count: c }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  if (isFlush && isStraight) {
    if (straightHigh === 12) {
      return { rank: HAND_RANKS.ROYAL_FLUSH, values: [straightHigh], name: HAND_NAMES[9] };
    }
    return { rank: HAND_RANKS.STRAIGHT_FLUSH, values: [straightHigh], name: HAND_NAMES[8] };
  }

  if (countEntries[0].count === 4) {
    const kicker = countEntries[1].value;
    return { rank: HAND_RANKS.FOUR_OF_A_KIND, values: [countEntries[0].value, kicker], name: HAND_NAMES[7] };
  }

  if (countEntries[0].count === 3 && countEntries[1].count === 2) {
    return { rank: HAND_RANKS.FULL_HOUSE, values: [countEntries[0].value, countEntries[1].value], name: HAND_NAMES[6] };
  }

  if (isFlush) {
    return { rank: HAND_RANKS.FLUSH, values, name: HAND_NAMES[5] };
  }

  if (isStraight) {
    return { rank: HAND_RANKS.STRAIGHT, values: [straightHigh], name: HAND_NAMES[4] };
  }

  if (countEntries[0].count === 3) {
    const kickers = countEntries.filter(e => e.count === 1).map(e => e.value).sort((a, b) => b - a);
    return { rank: HAND_RANKS.THREE_OF_A_KIND, values: [countEntries[0].value, ...kickers], name: HAND_NAMES[3] };
  }

  if (countEntries[0].count === 2 && countEntries[1].count === 2) {
    const pairs = [countEntries[0].value, countEntries[1].value].sort((a, b) => b - a);
    const kicker = countEntries[2].value;
    return { rank: HAND_RANKS.TWO_PAIR, values: [...pairs, kicker], name: HAND_NAMES[2] };
  }

  if (countEntries[0].count === 2) {
    const kickers = countEntries.filter(e => e.count === 1).map(e => e.value).sort((a, b) => b - a);
    return { rank: HAND_RANKS.ONE_PAIR, values: [countEntries[0].value, ...kickers], name: HAND_NAMES[1] };
  }

  return { rank: HAND_RANKS.HIGH_CARD, values, name: HAND_NAMES[0] };
}

function evaluateBestHand(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  const combos = getCombinations(allCards, 5);
  let best = null;
  for (const combo of combos) {
    const result = evaluateFiveCards(combo);
    if (!best || compareHands(result, best) > 0) {
      best = result;
    }
  }
  return best;
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.values.length, b.values.length); i++) {
    if (a.values[i] !== b.values[i]) return a.values[i] - b.values[i];
  }
  return 0;
}

// ─── Engine ───

export class PokerEngine {
  constructor(playerCount = 2, options = {}) {
    this.playerCount = Math.min(8, Math.max(2, playerCount));
    this.startingChips = options.startingChips || 1000;
    this.smallBlindAmount = options.smallBlind || 10;
    this.bigBlindAmount = options.bigBlind || 20;

    this.players = [];
    for (let i = 0; i < this.playerCount; i++) {
      this.players.push({
        index: i,
        chips: this.startingChips,
        holeCards: [],
        bet: 0,
        totalBet: 0,
        folded: false,
        allIn: false,
        sittingOut: false,
      });
    }

    this.dealerIndex = -1;
    this.handNumber = 0;
    this.gameOver = false;
    this.finalWinner = null;
    this.history = [];

    this.communityCards = [];
    this.deck = [];
    this.currentBet = 0;
    this.minRaise = 0;
    this.lastRaiser = -1;
    this.bettingRound = 'preflop'; // preflop, flop, turn, river
    this.currentPlayer = -1;
    this.pot = 0;
    this.handOver = false;
    this.showdown = false;
    this.winners = [];
    this.pots = [];

    this.smallBlindIndex = -1;
    this.bigBlindIndex = -1;
  }

  reset() {
    for (const p of this.players) {
      p.chips = this.startingChips;
      p.sittingOut = false;
    }
    this.dealerIndex = -1;
    this.handNumber = 0;
    this.gameOver = false;
    this.finalWinner = null;
    this.history = [];
    this.communityCards = [];
    this.handOver = false;
    this.showdown = false;
    this.winners = [];
    this.pots = [];
  }

  // ─── Hand lifecycle ───

  newHand() {
    if (this.gameOver) return false;

    // Remove eliminated players
    for (const p of this.players) {
      if (p.chips <= 0) p.sittingOut = true;
    }

    const activePlayers = this.players.filter(p => !p.sittingOut);
    if (activePlayers.length <= 1) {
      this.gameOver = true;
      this.finalWinner = activePlayers[0]?.index ?? null;
      return false;
    }

    this.handNumber++;
    this.history = [];

    // Advance dealer
    this.dealerIndex = this._nextActivePlayer(this.dealerIndex);

    // Reset player state
    for (const p of this.players) {
      p.holeCards = [];
      p.bet = 0;
      p.totalBet = 0;
      p.folded = false;
      p.allIn = false;
    }

    // Shuffle and deal
    this.deck = shuffle(createDeck());
    this.communityCards = [];
    this.handOver = false;
    this.showdown = false;
    this.winners = [];
    this.pots = [];
    this.pot = 0;
    this.currentBet = 0;
    this.minRaise = this.bigBlindAmount;
    this.lastRaiser = -1;
    this.bettingRound = 'preflop';

    // Deal hole cards
    for (const p of this.players) {
      if (!p.sittingOut) {
        p.holeCards = [this.deck.pop(), this.deck.pop()];
      }
    }

    // Post blinds
    this._postBlinds();

    return true;
  }

  _postBlinds() {
    const activePlayers = this.getActivePlayers();
    const isHeadsUp = activePlayers.length === 2;

    if (isHeadsUp) {
      // Heads-up: dealer = SB, other = BB
      this.smallBlindIndex = this.dealerIndex;
      this.bigBlindIndex = this._nextActivePlayer(this.dealerIndex);
    } else {
      this.smallBlindIndex = this._nextActivePlayer(this.dealerIndex);
      this.bigBlindIndex = this._nextActivePlayer(this.smallBlindIndex);
    }

    this._placeBet(this.smallBlindIndex, Math.min(this.smallBlindAmount, this.players[this.smallBlindIndex].chips));
    this._placeBet(this.bigBlindIndex, Math.min(this.bigBlindAmount, this.players[this.bigBlindIndex].chips));

    this.currentBet = this.bigBlindAmount;
    this.minRaise = this.bigBlindAmount;

    // Pre-flop: action starts after BB
    if (isHeadsUp) {
      // Heads-up pre-flop: dealer/SB acts first
      this.currentPlayer = this.smallBlindIndex;
    } else {
      this.currentPlayer = this._nextActivePlayer(this.bigBlindIndex);
    }
    this.lastRaiser = this.currentPlayer;
  }

  _placeBet(playerIndex, amount) {
    const player = this.players[playerIndex];
    const actualAmount = Math.min(amount, player.chips);
    player.chips -= actualAmount;
    player.bet += actualAmount;
    player.totalBet += actualAmount;
    this.pot += actualAmount;
    if (player.chips === 0) {
      player.allIn = true;
    }
  }

  // ─── Actions ───

  fold(playerIndex) {
    if (playerIndex !== this.currentPlayer) return false;
    if (this.handOver) return false;

    this.saveSnapshot();
    this.players[playerIndex].folded = true;

    // Check if only one player remains
    const remaining = this.players.filter(p => !p.sittingOut && !p.folded);
    if (remaining.length === 1) {
      this._winByFold(remaining[0].index);
      return true;
    }

    this._advanceAction();
    return true;
  }

  check(playerIndex) {
    if (playerIndex !== this.currentPlayer) return false;
    if (this.handOver) return false;

    const player = this.players[playerIndex];
    if (player.bet < this.currentBet) return false; // can't check, must call

    this.saveSnapshot();
    this._advanceAction();
    return true;
  }

  call(playerIndex) {
    if (playerIndex !== this.currentPlayer) return false;
    if (this.handOver) return false;

    const player = this.players[playerIndex];
    const callAmount = Math.min(this.currentBet - player.bet, player.chips);
    if (callAmount <= 0) return false;

    this.saveSnapshot();
    this._placeBet(playerIndex, callAmount);
    this._advanceAction();
    return true;
  }

  raise(playerIndex, totalAmount) {
    if (playerIndex !== this.currentPlayer) return false;
    if (this.handOver) return false;

    const player = this.players[playerIndex];
    const raiseBy = totalAmount - this.currentBet;
    if (raiseBy < this.minRaise && totalAmount < player.bet + player.chips) return false;

    const toCall = totalAmount - player.bet;
    if (toCall <= 0 || toCall > player.chips) return false;

    this.saveSnapshot();
    this._placeBet(playerIndex, toCall);
    this.minRaise = Math.max(this.minRaise, raiseBy);
    this.currentBet = totalAmount;
    this.lastRaiser = playerIndex;
    this._advanceAction();
    return true;
  }

  allIn(playerIndex) {
    if (playerIndex !== this.currentPlayer) return false;
    if (this.handOver) return false;

    const player = this.players[playerIndex];
    if (player.chips <= 0) return false;

    this.saveSnapshot();
    const totalBetAfter = player.bet + player.chips;

    if (totalBetAfter > this.currentBet) {
      const raiseBy = totalBetAfter - this.currentBet;
      if (raiseBy >= this.minRaise) {
        this.minRaise = raiseBy;
      }
      this.currentBet = totalBetAfter;
      this.lastRaiser = playerIndex;
    }

    this._placeBet(playerIndex, player.chips);
    this._advanceAction();
    return true;
  }

  // ─── Action flow ───

  _advanceAction() {
    const next = this._nextActionPlayer(this.currentPlayer);

    if (next === -1 || this._isBettingRoundComplete()) {
      this._endBettingRound();
    } else {
      this.currentPlayer = next;
    }
  }

  _nextActionPlayer(fromIndex) {
    let idx = fromIndex;
    for (let i = 0; i < this.players.length; i++) {
      idx = this._nextActivePlayer(idx);
      const p = this.players[idx];
      if (p.folded || p.allIn || p.sittingOut) continue;
      return idx;
    }
    return -1;
  }

  _isBettingRoundComplete() {
    const actionPlayers = this.players.filter(p => !p.sittingOut && !p.folded && !p.allIn);

    // No one can act
    if (actionPlayers.length === 0) return true;

    // Everyone has matched current bet (or is all-in)
    const allMatched = actionPlayers.every(p => p.bet >= this.currentBet);
    if (!allMatched) return false;

    // If there's only one action player left, check if they need to act
    if (actionPlayers.length === 1) {
      const p = actionPlayers[0];
      if (p.bet >= this.currentBet) return true;
    }

    // Check if we've gone around - next would be lastRaiser
    const next = this._nextActionPlayer(this.currentPlayer);
    if (next === -1) return true;
    if (next === this.lastRaiser) return true;

    return false;
  }

  _endBettingRound() {
    // Collect bets into pot
    for (const p of this.players) {
      p.bet = 0;
    }

    const activePlayers = this.players.filter(p => !p.sittingOut && !p.folded);
    const canAct = activePlayers.filter(p => !p.allIn);

    // If only one non-folded player or all are all-in, run out the board
    if (activePlayers.length <= 1 || canAct.length <= 1) {
      this._runOutBoard();
      return;
    }

    // Advance to next round
    switch (this.bettingRound) {
      case 'preflop':
        this.bettingRound = 'flop';
        this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
        break;
      case 'flop':
        this.bettingRound = 'turn';
        this.communityCards.push(this.deck.pop());
        break;
      case 'turn':
        this.bettingRound = 'river';
        this.communityCards.push(this.deck.pop());
        break;
      case 'river':
        this._resolveShowdown();
        return;
    }

    this.currentBet = 0;
    this.minRaise = this.bigBlindAmount;
    this.lastRaiser = -1;

    // Post-flop: first active player after dealer
    const firstPlayer = this._nextActivePlayer(this.dealerIndex);
    this.currentPlayer = firstPlayer;
    // Skip folded/all-in
    const p = this.players[this.currentPlayer];
    if (p.folded || p.allIn) {
      const next = this._nextActionPlayer(this.currentPlayer);
      if (next === -1) {
        this._endBettingRound();
        return;
      }
      this.currentPlayer = next;
    }
    this.lastRaiser = this.currentPlayer;
  }

  _runOutBoard() {
    // Deal remaining community cards
    while (this.communityCards.length < 5) {
      this.communityCards.push(this.deck.pop());
    }
    this._resolveShowdown();
  }

  _resolveShowdown() {
    this.showdown = true;

    // Calculate pots (including side pots)
    this.pots = this._calculatePots();

    // Evaluate hands for non-folded players
    const activePlayers = this.players.filter(p => !p.sittingOut && !p.folded);
    const handResults = {};
    for (const p of activePlayers) {
      handResults[p.index] = evaluateBestHand(p.holeCards, this.communityCards);
    }

    this.winners = [];

    // Resolve each pot
    for (const pot of this.pots) {
      const eligible = pot.eligible.filter(idx => handResults[idx]);
      if (eligible.length === 0) continue;

      // Sort by hand strength
      eligible.sort((a, b) => compareHands(handResults[b], handResults[a]));

      // Find all tied winners
      const bestHand = handResults[eligible[0]];
      const potWinners = eligible.filter(idx => compareHands(handResults[idx], bestHand) === 0);

      const share = Math.floor(pot.amount / potWinners.length);
      const remainder = pot.amount - share * potWinners.length;

      for (let i = 0; i < potWinners.length; i++) {
        const winAmount = share + (i === 0 ? remainder : 0);
        this.players[potWinners[i]].chips += winAmount;

        this.winners.push({
          playerIndex: potWinners[i],
          amount: winAmount,
          hand: handResults[potWinners[i]],
          potIndex: this.pots.indexOf(pot),
        });
      }
    }

    this.handOver = true;
    this._checkGameOver();
  }

  _winByFold(winnerIndex) {
    this.players[winnerIndex].chips += this.pot;
    this.winners = [{ playerIndex: winnerIndex, amount: this.pot, hand: null, potIndex: 0 }];
    this.pots = [{ amount: this.pot, eligible: [winnerIndex] }];
    this.pot = 0;
    this.handOver = true;
    this._checkGameOver();
  }

  _calculatePots() {
    const activePlayers = this.players.filter(p => !p.sittingOut && !p.folded);
    const allInPlayers = this.players
      .filter(p => !p.sittingOut && p.allIn && !p.folded)
      .sort((a, b) => a.totalBet - b.totalBet);

    if (allInPlayers.length === 0) {
      // Simple pot
      return [{
        amount: this.pot,
        eligible: activePlayers.map(p => p.index),
      }];
    }

    // Calculate side pots
    const pots = [];
    let processedAmount = 0;
    const allPlayers = this.players.filter(p => !p.sittingOut && !p.folded);

    // Get unique totalBet levels from all-in players
    const levels = [...new Set(allInPlayers.map(p => p.totalBet))].sort((a, b) => a - b);

    let prevLevel = 0;
    for (const level of levels) {
      const potContributors = this.players.filter(p => !p.sittingOut && p.totalBet > prevLevel);
      const contribution = level - prevLevel;
      let potAmount = 0;
      for (const p of potContributors) {
        potAmount += Math.min(contribution, p.totalBet - prevLevel);
      }
      const eligible = allPlayers.filter(p => p.totalBet >= level).map(p => p.index);
      if (potAmount > 0) {
        pots.push({ amount: potAmount, eligible });
        processedAmount += potAmount;
      }
      prevLevel = level;
    }

    // Remaining pot (players who bet more than highest all-in)
    const remaining = this.pot - processedAmount;
    if (remaining > 0) {
      const eligible = allPlayers.filter(p => p.totalBet > prevLevel).map(p => p.index);
      if (eligible.length === 0) {
        // Return to the sole remaining player
        const maxBetPlayer = allPlayers.reduce((a, b) => a.totalBet > b.totalBet ? a : b);
        pots.push({ amount: remaining, eligible: [maxBetPlayer.index] });
      } else {
        pots.push({ amount: remaining, eligible });
      }
    }

    return pots;
  }

  _checkGameOver() {
    const alive = this.players.filter(p => p.chips > 0);
    if (alive.length <= 1) {
      this.gameOver = true;
      this.finalWinner = alive[0]?.index ?? null;
    }
  }

  // ─── Queries ───

  getStatus() {
    if (this.gameOver) return 'gameOver';
    if (this.showdown) return 'showdown';
    if (this.handOver) return 'handOver';
    return 'playing';
  }

  getAvailableActions(playerIndex) {
    const player = this.players[playerIndex];
    if (playerIndex !== this.currentPlayer || this.handOver || player.folded || player.allIn || player.sittingOut) {
      return { canFold: false, canCheck: false, canCall: false, callAmount: 0, canRaise: false, minRaise: 0, maxRaise: 0, canAllIn: false };
    }

    const canFold = true;
    const canCheck = player.bet >= this.currentBet;
    const callAmount = Math.min(this.currentBet - player.bet, player.chips);
    const canCall = callAmount > 0 && callAmount < player.chips;

    const minRaiseTotal = this.currentBet + this.minRaise;
    const maxRaiseTotal = player.bet + player.chips;
    const canRaise = maxRaiseTotal >= minRaiseTotal && player.chips > callAmount;
    const canAllIn = player.chips > 0;

    return {
      canFold,
      canCheck,
      canCall,
      callAmount,
      canRaise,
      minRaise: Math.min(minRaiseTotal, maxRaiseTotal),
      maxRaise: maxRaiseTotal,
      canAllIn,
    };
  }

  getTotalPot() {
    return this.pot;
  }

  getActivePlayers() {
    return this.players.filter(p => !p.sittingOut);
  }

  _nextActivePlayer(fromIndex) {
    let idx = fromIndex;
    for (let i = 0; i < this.players.length; i++) {
      idx = (idx + 1) % this.players.length;
      if (!this.players[idx].sittingOut) return idx;
    }
    return fromIndex;
  }

  // ─── Undo ───

  saveSnapshot() {
    this.history.push({
      players: deepClone(this.players),
      deck: deepClone(this.deck),
      communityCards: deepClone(this.communityCards),
      dealerIndex: this.dealerIndex,
      smallBlindIndex: this.smallBlindIndex,
      bigBlindIndex: this.bigBlindIndex,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      lastRaiser: this.lastRaiser,
      bettingRound: this.bettingRound,
      currentPlayer: this.currentPlayer,
      pot: this.pot,
      handOver: this.handOver,
      showdown: this.showdown,
      winners: deepClone(this.winners),
      pots: deepClone(this.pots),
      gameOver: this.gameOver,
      finalWinner: this.finalWinner,
    });
  }

  undo() {
    if (this.history.length === 0) return false;
    const snap = this.history.pop();
    Object.assign(this, snap);
    return true;
  }
}

export { SUITS, SUIT_SYMBOLS, VALUES, HAND_NAMES, evaluateBestHand, compareHands };
