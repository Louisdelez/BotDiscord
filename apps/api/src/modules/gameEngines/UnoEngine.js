const COLORS = ['red', 'blue', 'green', 'yellow'];
const SPECIALS = ['skip', 'reverse', 'draw2'];

function createDeck() {
  const deck = [];
  let id = 0;
  for (const color of COLORS) {
    // One 0 per color
    deck.push({ id: id++, color, type: 'number', value: 0 });
    // Two of each 1-9
    for (let n = 1; n <= 9; n++) {
      deck.push({ id: id++, color, type: 'number', value: n });
      deck.push({ id: id++, color, type: 'number', value: n });
    }
    // Two of each special
    for (const special of SPECIALS) {
      deck.push({ id: id++, color, type: special, value: special });
      deck.push({ id: id++, color, type: special, value: special });
    }
  }
  // 4 Wild + 4 Wild Draw Four
  for (let i = 0; i < 4; i++) {
    deck.push({ id: id++, color: 'wild', type: 'wild', value: 'wild' });
    deck.push({ id: id++, color: 'wild', type: 'wild4', value: 'wild4' });
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

class UnoEngine {
  constructor(playerCount = 2) {
    this.reset(playerCount);
  }

  reset(playerCount) {
    this.playerCount = Math.max(2, Math.min(4, playerCount));
    this.deck = shuffle(createDeck());
    this.discard = [];
    this.hands = [];
    this.currentPlayer = 0;
    this.direction = 1; // 1 = clockwise, -1 = counter
    this.currentColor = null;
    this.winner = null;
    this.history = [];
    this.unoCalled = new Array(this.playerCount).fill(false);
    this.mustDraw = 0; // stacked +2/+4 penalty
    this.hasDrawn = false;

    // Deal 7 cards to each player
    for (let i = 0; i < this.playerCount; i++) {
      this.hands.push(this.drawCards(7));
    }

    // Flip starting card — must be a number card
    let startCard = this.deck.pop();
    while (startCard.type !== 'number') {
      this.deck.unshift(startCard);
      this.deck = shuffle(this.deck);
      startCard = this.deck.pop();
    }
    this.discard.push(startCard);
    this.currentColor = startCard.color;
  }

  drawCards(count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      if (this.deck.length === 0) {
        this.recycleDeck();
      }
      if (this.deck.length === 0) break;
      cards.push(this.deck.pop());
    }
    return cards;
  }

  recycleDeck() {
    if (this.discard.length <= 1) return;
    const topCard = this.discard.pop();
    this.deck = shuffle(this.discard);
    this.discard = [topCard];
  }

  saveSnapshot() {
    this.history.push({
      deck: deepClone(this.deck),
      discard: deepClone(this.discard),
      hands: deepClone(this.hands),
      currentPlayer: this.currentPlayer,
      direction: this.direction,
      currentColor: this.currentColor,
      winner: this.winner,
      unoCalled: [...this.unoCalled],
      mustDraw: this.mustDraw,
      hasDrawn: this.hasDrawn,
    });
  }

  undo() {
    if (this.history.length === 0) return false;
    const snap = this.history.pop();
    Object.assign(this, snap);
    return true;
  }

  getTopCard() {
    return this.discard[this.discard.length - 1] || null;
  }

  getStatus() {
    if (this.winner !== null) return 'won';
    if (this.hands.length === 0) return 'setup';
    return 'playing';
  }

  isLegalPlay(card) {
    const top = this.getTopCard();
    if (!top) return true;

    // Wild cards are always playable
    if (card.type === 'wild' || card.type === 'wild4') return true;

    // Match current color
    if (card.color === this.currentColor) return true;

    // Match value/type
    if (card.type === 'number' && top.type === 'number' && card.value === top.value) return true;
    if (card.type !== 'number' && card.type === top.type) return true;

    return false;
  }

  getPlayableCards(playerIndex) {
    if (playerIndex !== this.currentPlayer || this.winner !== null) return [];
    return this.hands[playerIndex]
      .map((card, i) => (this.isLegalPlay(card) ? i : -1))
      .filter(i => i !== -1);
  }

  playCard(playerIndex, cardIndex, chosenColor = null) {
    if (playerIndex !== this.currentPlayer) return false;
    if (this.winner !== null) return false;

    const hand = this.hands[playerIndex];
    if (cardIndex < 0 || cardIndex >= hand.length) return false;

    const card = hand[cardIndex];
    if (!this.isLegalPlay(card)) return false;

    // Wild cards need a chosen color
    if ((card.type === 'wild' || card.type === 'wild4') && !chosenColor) return false;

    this.saveSnapshot();

    // Check UNO penalty: if player has 2 cards and hasn't called UNO before playing
    // (They should call UNO when they're about to go down to 1 card)

    // Remove card from hand
    hand.splice(cardIndex, 1);

    // Add to discard
    this.discard.push(card);

    // Set color
    if (card.type === 'wild' || card.type === 'wild4') {
      this.currentColor = chosenColor;
    } else {
      this.currentColor = card.color;
    }

    // Check for win
    if (hand.length === 0) {
      this.winner = playerIndex;
      return true;
    }

    // Apply UNO penalty check — if a player now has 1 card and didn't call UNO
    if (hand.length === 1 && !this.unoCalled[playerIndex]) {
      // Auto-penalty: draw 2 cards
      const penalty = this.drawCards(2);
      hand.push(...penalty);
    }

    // Reset UNO call for this player after playing
    if (hand.length !== 1) {
      this.unoCalled[playerIndex] = false;
    }

    // Apply card effects
    this.hasDrawn = false;
    this.applyCardEffect(card);

    return true;
  }

  applyCardEffect(card) {
    switch (card.type) {
      case 'skip':
        if (this.playerCount === 2) {
          // In 2-player, skip acts like another turn for current player — just don't advance
        } else {
          this.advanceTurn();
          this.advanceTurn();
        }
        break;

      case 'reverse':
        if (this.playerCount === 2) {
          // In 2-player, reverse = skip
          this.advanceTurn();
        } else {
          this.direction *= -1;
          this.advanceTurn();
        }
        break;

      case 'draw2': {
        this.advanceTurn();
        const nextPlayer = this.currentPlayer;
        const cards = this.drawCards(2);
        this.hands[nextPlayer].push(...cards);
        this.advanceTurn();
        break;
      }

      case 'wild':
        this.advanceTurn();
        break;

      case 'wild4': {
        this.advanceTurn();
        const nextPlayer = this.currentPlayer;
        const cards = this.drawCards(4);
        this.hands[nextPlayer].push(...cards);
        this.advanceTurn();
        break;
      }

      default:
        this.advanceTurn();
        break;
    }
  }

  advanceTurn() {
    this.currentPlayer = (this.currentPlayer + this.direction + this.playerCount) % this.playerCount;
  }

  drawCard(playerIndex) {
    if (playerIndex !== this.currentPlayer) return false;
    if (this.winner !== null) return false;
    if (this.hasDrawn) return false;

    this.saveSnapshot();

    const cards = this.drawCards(1);
    if (cards.length > 0) {
      this.hands[playerIndex].push(...cards);
    }

    this.hasDrawn = true;
    this.unoCalled[playerIndex] = false;

    // If the drawn card is playable, player can choose to play it or pass
    // We let the caller handle this — player can play or pass (advance turn)
    return true;
  }

  passTurn(playerIndex) {
    if (playerIndex !== this.currentPlayer) return false;
    if (!this.hasDrawn) return false;

    this.saveSnapshot();
    this.hasDrawn = false;
    this.advanceTurn();
    return true;
  }

  callUno(playerIndex) {
    // Player calls UNO when they have 2 cards (about to play down to 1)
    // or when they have 1 card (retroactive call not allowed in strict rules, but we allow it pre-play)
    if (this.hands[playerIndex].length <= 2) {
      this.unoCalled[playerIndex] = true;
      return true;
    }
    return false;
  }

  get gameOver() {
    return this.winner !== null;
  }

  serialize(forPlayerIndex = null) {
    return {
      currentPlayer: this.currentPlayer,
      direction: this.direction,
      discardTop: this.discard[this.discard.length - 1],
      deckCount: this.deck.length,
      hands: this.hands.map((hand, i) => i === forPlayerIndex ? hand : { count: hand.length }),
      playerCount: this.hands.length,
      gameOver: this.gameOver,
      winner: this.winner,
      currentColor: this.currentColor,
      mustDraw: this.mustDraw,
      hasDrawn: this.hasDrawn,
    };
  }
}

module.exports = { UnoEngine };
