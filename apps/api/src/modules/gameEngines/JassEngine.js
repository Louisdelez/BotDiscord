const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const VALUES = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const SUIT_SYMBOLS = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' };

// Points when card is trump
const TRUMP_POINTS = { '6': 0, '7': 0, '8': 0, '9': 14, '10': 10, 'J': 20, 'Q': 3, 'K': 4, 'A': 11 };
// Points when card is not trump
const NORMAL_POINTS = { '6': 0, '7': 0, '8': 0, '9': 0, '10': 10, 'J': 2, 'Q': 3, 'K': 4, 'A': 11 };

// Strength order for trump: J(8) > 9(7) > A(6) > K(5) > Q(4) > 10(3) > 8(2) > 7(1) > 6(0)
const TRUMP_STRENGTH = { '6': 0, '7': 1, '8': 2, '10': 3, 'Q': 4, 'K': 5, 'A': 6, '9': 7, 'J': 8 };
// Strength order for non-trump: A(8) > K(7) > Q(6) > J(5) > 10(4) > 9(3) > 8(2) > 7(1) > 6(0)
const NORMAL_STRENGTH = { '6': 0, '7': 1, '8': 2, '9': 3, '10': 4, 'J': 5, 'Q': 6, 'K': 7, 'A': 8 };

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

class JassEngine {
  constructor() {
    this.teams = [[0, 2], [1, 3]];
    this.scores = [0, 0]; // cumulative scores across rounds
    this.roundNumber = 0;
    this.dealer = -1; // will be incremented to 0 on first round
    this.gameOver = false;
    this.winner = null;
    this.newRound();
  }

  newRound() {
    this.roundNumber++;
    this.dealer = (this.dealer + 1) % 4;

    const deck = shuffle(createDeck());
    this.hands = [[], [], [], []];
    for (let i = 0; i < 36; i++) {
      this.hands[i % 4].push(deck[i]);
    }
    // Sort hands by suit then value
    for (const hand of this.hands) {
      hand.sort((a, b) => {
        const si = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
        if (si !== 0) return si;
        return VALUES.indexOf(a.value) - VALUES.indexOf(b.value);
      });
    }

    this.trump = null;
    this.trumpChosen = false;
    this.chibred = false;
    this.trumpChooser = (this.dealer + 1) % 4; // player after dealer chooses

    this.currentTrick = []; // { playerIndex, card }
    this.tricks = []; // completed tricks
    this.leadPlayer = this.trumpChooser;
    this.currentPlayer = this.trumpChooser;
    this.trickWinner = null;

    this.roundScores = [0, 0];
    this.roundOver = false;
    this.trickCount = 0;

    this.history = [];
  }

  reset() {
    this.scores = [0, 0];
    this.roundNumber = 0;
    this.dealer = -1;
    this.gameOver = false;
    this.winner = null;
    this.newRound();
  }

  getStatus() {
    if (this.gameOver) return 'gameOver';
    if (this.roundOver) return 'roundOver';
    if (!this.trumpChosen) return 'trumpSelection';
    return 'playing';
  }

  getTeamIndex(playerIndex) {
    return this.teams[0].includes(playerIndex) ? 0 : 1;
  }

  getCardPoints(card, isTrump) {
    return isTrump ? TRUMP_POINTS[card.value] : NORMAL_POINTS[card.value];
  }

  getCardStrength(card, isTrump) {
    return isTrump ? TRUMP_STRENGTH[card.value] : NORMAL_STRENGTH[card.value];
  }

  // --- Trump selection ---

  chooseTrump(suit) {
    if (this.trumpChosen) return false;
    if (!SUITS.includes(suit)) return false;

    this.saveSnapshot();
    this.trump = suit;
    this.trumpChosen = true;
    return true;
  }

  chibre() {
    if (this.trumpChosen || this.chibred) return false;

    this.saveSnapshot();
    this.chibred = true;
    // Pass to partner: partner is at index +2
    this.trumpChooser = (this.trumpChooser + 2) % 4;
    this.currentPlayer = this.trumpChooser;
    return true;
  }

  // --- Card play ---

  getPlayableCards(playerIndex) {
    if (playerIndex !== this.currentPlayer) return [];
    if (!this.trumpChosen || this.roundOver || this.gameOver) return [];

    const hand = this.hands[playerIndex];
    const indices = [];

    for (let i = 0; i < hand.length; i++) {
      if (this.isLegalPlay(playerIndex, hand[i])) {
        indices.push(i);
      }
    }
    return indices;
  }

  isLegalPlay(playerIndex, card) {
    // First card of the trick -- anything goes
    if (this.currentTrick.length === 0) return true;

    const hand = this.hands[playerIndex];
    const leadSuit = this.currentTrick[0].card.suit;
    const cardIsTrump = card.suit === this.trump;
    const leadIsTrump = leadSuit === this.trump;

    // Has cards of lead suit (excluding trump if lead is not trump)?
    const hasLeadSuit = hand.some(c => c.suit === leadSuit);

    if (leadIsTrump) {
      // Lead is trump: must follow with trump if possible
      const hasTrump = hand.some(c => c.suit === this.trump);
      if (hasTrump && !cardIsTrump) return false;
      return true;
    }

    if (hasLeadSuit) {
      // Must follow suit -- but can always play trump instead
      if (card.suit === leadSuit) return true;
      if (cardIsTrump) {
        // Can play trump, but no under-trumping:
        // If partner is currently winning, we don't force trump
        // Under-trump rule: can't play a trump lower than highest trump already played
        // unless that's all you have
        return this._canPlayTrump(playerIndex, card);
      }
      return false;
    }

    // Can't follow suit
    if (cardIsTrump) {
      return this._canPlayTrump(playerIndex, card);
    }

    // Can't follow, can't trump -> can defausse anything
    return true;
  }

  _canPlayTrump(playerIndex, card) {
    // Find highest trump in current trick
    const trumpsInTrick = this.currentTrick.filter(t => t.card.suit === this.trump);
    if (trumpsInTrick.length === 0) return true;

    const highestTrumpStrength = Math.max(
      ...trumpsInTrick.map(t => this.getCardStrength(t.card, true))
    );

    const cardStrength = this.getCardStrength(card, true);

    // Under-trump: playing a lower trump
    if (cardStrength < highestTrumpStrength) {
      // Allowed only if all trumps in hand are lower (forced under-trump)
      const hand = this.hands[playerIndex];
      const allTrumpsLower = hand
        .filter(c => c.suit === this.trump)
        .every(c => this.getCardStrength(c, true) < highestTrumpStrength);
      return allTrumpsLower;
    }

    return true;
  }

  playCard(playerIndex, cardIndex) {
    if (playerIndex !== this.currentPlayer) return false;
    if (!this.trumpChosen || this.roundOver || this.gameOver) return false;

    const hand = this.hands[playerIndex];
    if (cardIndex < 0 || cardIndex >= hand.length) return false;

    const card = hand[cardIndex];
    if (!this.isLegalPlay(playerIndex, card)) return false;

    this.saveSnapshot();

    // Remove from hand
    hand.splice(cardIndex, 1);

    // Add to current trick
    this.currentTrick.push({ playerIndex, card });

    // If trick is complete (4 cards played)
    if (this.currentTrick.length === 4) {
      this._resolveTrick();
    } else {
      // Next player clockwise
      this.currentPlayer = (this.currentPlayer + 1) % 4;
    }

    return true;
  }

  _resolveTrick() {
    const winnerIdx = this.getTrickWinner(this.currentTrick);
    this.trickWinner = winnerIdx;
    this.trickCount++;

    // Calculate trick points
    let trickPoints = 0;
    for (const { card } of this.currentTrick) {
      trickPoints += this.getCardPoints(card, card.suit === this.trump);
    }

    // Last trick bonus
    const isLastTrick = this.trickCount === 9;
    if (isLastTrick) {
      trickPoints += 5;
    }

    // Add to team score
    const teamIdx = this.getTeamIndex(winnerIdx);
    this.roundScores[teamIdx] += trickPoints;

    // Save completed trick
    this.tricks.push({
      cards: [...this.currentTrick],
      winner: winnerIdx,
      points: trickPoints,
    });

    this.currentTrick = [];

    if (isLastTrick) {
      this._endRound();
    } else {
      // Winner leads next trick
      this.leadPlayer = winnerIdx;
      this.currentPlayer = winnerIdx;
    }
  }

  getTrickWinner(trick) {
    if (trick.length === 0) return -1;

    const leadSuit = trick[0].card.suit;
    let bestIdx = 0;
    let bestStrength = -1;
    let bestIsTrump = false;

    for (let i = 0; i < trick.length; i++) {
      const { card } = trick[i];
      const isTrump = card.suit === this.trump;
      const isLeadSuit = card.suit === leadSuit;
      const strength = this.getCardStrength(card, isTrump);

      if (isTrump && !bestIsTrump) {
        // Trump beats non-trump
        bestIdx = i;
        bestStrength = strength;
        bestIsTrump = true;
      } else if (isTrump && bestIsTrump) {
        // Higher trump wins
        if (strength > bestStrength) {
          bestIdx = i;
          bestStrength = strength;
        }
      } else if (!isTrump && !bestIsTrump && isLeadSuit) {
        // Higher lead suit wins (only lead suit counts if no trump)
        if (card.suit === trick[bestIdx].card.suit) {
          if (strength > bestStrength) {
            bestIdx = i;
            bestStrength = strength;
          }
        } else {
          // First lead suit card after a non-lead card was best
          // Actually we need to compare only within lead suit
          const bestCard = trick[bestIdx].card;
          if (bestCard.suit !== leadSuit) {
            bestIdx = i;
            bestStrength = strength;
          } else if (strength > bestStrength) {
            bestIdx = i;
            bestStrength = strength;
          }
        }
      }
      // Non-lead, non-trump cards can't win
    }

    return trick[bestIdx].playerIndex;
  }

  _endRound() {
    this.roundOver = true;

    // Check for match (one team won all 9 tricks)
    const team0Tricks = this.tricks.filter(t => this.getTeamIndex(t.winner) === 0).length;
    const team1Tricks = this.tricks.filter(t => this.getTeamIndex(t.winner) === 1).length;

    if (team0Tricks === 9) {
      this.roundScores[0] = 257;
      this.roundScores[1] = 0;
    } else if (team1Tricks === 9) {
      this.roundScores[1] = 257;
      this.roundScores[0] = 0;
    }

    // Add round scores to total
    this.scores[0] += this.roundScores[0];
    this.scores[1] += this.roundScores[1];

    // Check for game over (1000 points)
    if (this.scores[0] >= 1000 || this.scores[1] >= 1000) {
      this.gameOver = true;
      this.winner = this.scores[0] >= 1000 ? 0 : 1;
    }
  }

  // --- Undo ---

  saveSnapshot() {
    this.history.push({
      hands: deepClone(this.hands),
      trump: this.trump,
      trumpChosen: this.trumpChosen,
      chibred: this.chibred,
      trumpChooser: this.trumpChooser,
      currentTrick: deepClone(this.currentTrick),
      tricks: deepClone(this.tricks),
      leadPlayer: this.leadPlayer,
      currentPlayer: this.currentPlayer,
      trickWinner: this.trickWinner,
      roundScores: [...this.roundScores],
      scores: [...this.scores],
      roundOver: this.roundOver,
      trickCount: this.trickCount,
      gameOver: this.gameOver,
      winner: this.winner,
    });
  }

  undo() {
    if (this.history.length === 0) return false;
    const snap = this.history.pop();
    Object.assign(this, snap);
    return true;
  }

  // --- Serialization for network play ---

  serialize(forPlayerIndex = null) {
    return {
      // Public info
      phase: this.getStatus(),
      trump: this.trump,
      trumpChosen: this.trumpChosen,
      chibred: this.chibred,
      trumpChooser: this.trumpChooser,
      currentPlayer: this.currentPlayer,
      leadPlayer: this.leadPlayer,
      trick: this.currentTrick,
      tricks: this.tricks,
      trickWinner: this.trickWinner,
      trickCount: this.trickCount,
      scores: this.scores,
      roundScores: this.roundScores,
      roundNumber: this.roundNumber,
      dealer: this.dealer,
      teams: this.teams,
      gameOver: this.gameOver,
      roundOver: this.roundOver,
      winner: this.winner,
      playerCount: 4,
      // Private info -- hide other players' hands
      hands: this.hands.map((hand, i) =>
        i === forPlayerIndex ? hand : { count: hand.length }
      ),
    };
  }
}

module.exports = { JassEngine, SUITS, SUIT_SYMBOLS, TRUMP_POINTS, NORMAL_POINTS };
