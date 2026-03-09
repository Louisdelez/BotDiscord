const SUITS = ['man', 'pin', 'sou'];
const WINDS = ['east', 'south', 'west', 'north'];
const DRAGONS = ['white', 'green', 'red'];

function createTiles() {
  const tiles = [];
  let id = 0;
  for (const suit of SUITS) {
    for (let value = 1; value <= 9; value++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ suit, value, id: id++ });
      }
    }
  }
  for (const wind of WINDS) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({ suit: 'wind', value: wind, id: id++ });
    }
  }
  for (const dragon of DRAGONS) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({ suit: 'dragon', value: dragon, id: id++ });
    }
  }
  return tiles;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tilesMatch(a, b) {
  return a.suit === b.suit && a.value === b.value;
}

function tileKey(t) {
  return `${t.suit}-${t.value}`;
}

function sortTiles(tiles) {
  const suitOrder = { man: 0, pin: 1, sou: 2, wind: 3, dragon: 4 };
  const windOrder = { east: 0, south: 1, west: 2, north: 3 };
  const dragonOrder = { white: 0, green: 1, red: 2 };
  return [...tiles].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
    if (a.suit === 'wind') return windOrder[a.value] - windOrder[b.value];
    if (a.suit === 'dragon') return dragonOrder[a.value] - dragonOrder[b.value];
    return a.value - b.value;
  });
}

function isNumeric(suit) {
  return suit === 'man' || suit === 'pin' || suit === 'sou';
}

// Check if tiles form a winning hand: 4 sets (pung/chi) + 1 pair
function isWinningHand(tiles) {
  if (tiles.length !== 14) return false;
  const sorted = sortTiles(tiles);
  return _checkWin(sorted, [], 0);
}

function _checkWin(tiles, sets, pairCount) {
  if (tiles.length === 0) return pairCount === 1 && sets.length === 4;

  // Try pair
  if (pairCount === 0 && tiles.length >= 2 && tilesMatch(tiles[0], tiles[1])) {
    const remaining = tiles.slice(2);
    if (_checkWin(remaining, sets, 1)) return true;
  }

  // Try pung (3 identical)
  if (tiles.length >= 3 && tilesMatch(tiles[0], tiles[1]) && tilesMatch(tiles[1], tiles[2])) {
    const remaining = tiles.slice(3);
    if (_checkWin(remaining, [...sets, 'pung'], pairCount)) return true;
  }

  // Try chi (sequence) - only numeric suits
  if (tiles.length >= 3 && isNumeric(tiles[0].suit)) {
    const first = tiles[0];
    const secondIdx = tiles.findIndex((t, i) => i > 0 && t.suit === first.suit && t.value === first.value + 1);
    if (secondIdx !== -1) {
      const thirdIdx = tiles.findIndex((t, i) => i > secondIdx && t.suit === first.suit && t.value === first.value + 2);
      if (thirdIdx !== -1) {
        const remaining = tiles.filter((_, i) => i !== 0 && i !== secondIdx && i !== thirdIdx);
        if (_checkWin(remaining, [...sets, 'chi'], pairCount)) return true;
      }
    }
  }

  return false;
}

export class MahjongEngine {
  constructor() {
    this.reset();
  }

  reset() {
    const allTiles = shuffle(createTiles());
    this.wall = allTiles.slice(52);
    this.players = Array.from({ length: 4 }, (_, i) => ({
      hand: sortTiles(allTiles.slice(i * 13, i * 13 + 13)),
      exposed: [],
      discards: [],
    }));
    // East (player 0) draws 14th tile
    this.players[0].hand.push(this.wall.pop());
    this.players[0].hand = sortTiles(this.players[0].hand);

    this.currentPlayer = 0;
    this.phase = 'playing';
    this.turnPhase = 'discard'; // East starts with 14 tiles, must discard
    this.lastDiscard = null;
    this.lastDiscardPlayer = null;
    this.winner = null;
    this.roundWind = 'east';
    this.pendingClaims = [];
    this.history = [];
  }

  _snapshot() {
    return JSON.parse(JSON.stringify({
      wall: this.wall,
      players: this.players,
      currentPlayer: this.currentPlayer,
      phase: this.phase,
      turnPhase: this.turnPhase,
      lastDiscard: this.lastDiscard,
      lastDiscardPlayer: this.lastDiscardPlayer,
      winner: this.winner,
      pendingClaims: this.pendingClaims,
    }));
  }

  _restore(snap) {
    Object.assign(this, snap);
  }

  drawTile(playerIdx) {
    if (this.phase !== 'playing') return false;
    if (playerIdx !== this.currentPlayer) return false;
    if (this.turnPhase !== 'draw') return false;

    if (this.wall.length === 0) {
      this.phase = 'gameOver';
      this.winner = null;
      return false;
    }

    this.history.push(this._snapshot());
    const tile = this.wall.pop();
    this.players[playerIdx].hand.push(tile);
    this.players[playerIdx].hand = sortTiles(this.players[playerIdx].hand);
    this.turnPhase = 'discard';
    return true;
  }

  discardTile(playerIdx, tileIdx) {
    if (this.phase !== 'playing') return false;
    if (playerIdx !== this.currentPlayer) return false;
    if (this.turnPhase !== 'discard') return false;

    const hand = this.players[playerIdx].hand;
    if (tileIdx < 0 || tileIdx >= hand.length) return false;

    this.history.push(this._snapshot());
    const [tile] = hand.splice(tileIdx, 1);
    this.players[playerIdx].discards.push(tile);
    this.lastDiscard = tile;
    this.lastDiscardPlayer = playerIdx;

    // Check if any player can claim
    this.pendingClaims = [];
    for (let i = 0; i < 4; i++) {
      if (i === playerIdx) continue;
      const claims = [];
      if (this.canPung(i)) claims.push('pung');
      if (this.canKong(i)) claims.push('kong');
      if (this.canChi(i)) claims.push('chi');
      if (this._canWinOnDiscard(i)) claims.push('mahjong');
      if (claims.length > 0) this.pendingClaims.push({ player: i, claims });
    }

    if (this.pendingClaims.length > 0) {
      this.turnPhase = 'claim';
    } else {
      this._nextTurn();
    }

    return true;
  }

  canPung(playerIdx) {
    if (!this.lastDiscard) return false;
    if (playerIdx === this.lastDiscardPlayer) return false;
    const hand = this.players[playerIdx].hand;
    const count = hand.filter(t => tilesMatch(t, this.lastDiscard)).length;
    return count >= 2;
  }

  canChi(playerIdx) {
    if (!this.lastDiscard) return false;
    if (playerIdx === this.lastDiscardPlayer) return false;
    // Chi only for next player
    if (playerIdx !== (this.lastDiscardPlayer + 1) % 4) return false;
    if (!isNumeric(this.lastDiscard.suit)) return false;

    const hand = this.players[playerIdx].hand;
    const suit = this.lastDiscard.suit;
    const val = this.lastDiscard.value;
    const vals = hand.filter(t => t.suit === suit).map(t => t.value);

    // Check all possible sequences containing val
    if (vals.includes(val - 2) && vals.includes(val - 1)) return true;
    if (vals.includes(val - 1) && vals.includes(val + 1)) return true;
    if (vals.includes(val + 1) && vals.includes(val + 2)) return true;

    return false;
  }

  getChiOptions(playerIdx) {
    if (!this.canChi(playerIdx)) return [];
    const hand = this.players[playerIdx].hand;
    const suit = this.lastDiscard.suit;
    const val = this.lastDiscard.value;
    const vals = hand.filter(t => t.suit === suit).map(t => t.value);
    const options = [];

    if (vals.includes(val - 2) && vals.includes(val - 1)) options.push([val - 2, val - 1]);
    if (vals.includes(val - 1) && vals.includes(val + 1)) options.push([val - 1, val + 1]);
    if (vals.includes(val + 1) && vals.includes(val + 2)) options.push([val + 1, val + 2]);

    return options;
  }

  canKong(playerIdx) {
    if (!this.lastDiscard) return false;
    if (playerIdx === this.lastDiscardPlayer) return false;
    const hand = this.players[playerIdx].hand;
    const count = hand.filter(t => tilesMatch(t, this.lastDiscard)).length;
    return count >= 3;
  }

  doPung(playerIdx) {
    if (!this.canPung(playerIdx)) return false;
    this.history.push(this._snapshot());

    const hand = this.players[playerIdx].hand;
    const matching = [];
    const rest = [];
    for (const t of hand) {
      if (tilesMatch(t, this.lastDiscard) && matching.length < 2) matching.push(t);
      else rest.push(t);
    }

    // Remove discard from previous player's discards
    const discards = this.players[this.lastDiscardPlayer].discards;
    discards.pop();

    this.players[playerIdx].hand = sortTiles(rest);
    this.players[playerIdx].exposed.push({ type: 'pung', tiles: [...matching, this.lastDiscard] });

    this.currentPlayer = playerIdx;
    this.turnPhase = 'discard';
    this.lastDiscard = null;
    this.lastDiscardPlayer = null;
    this.pendingClaims = [];

    return true;
  }

  doChi(playerIdx, chiValues) {
    if (!this.canChi(playerIdx)) return false;
    if (!chiValues || chiValues.length !== 2) return false;

    this.history.push(this._snapshot());

    const hand = this.players[playerIdx].hand;
    const suit = this.lastDiscard.suit;
    const toRemove = [...chiValues];
    const used = [];
    const rest = [];

    for (const t of hand) {
      const idx = toRemove.findIndex(v => t.suit === suit && t.value === v);
      if (idx !== -1) {
        used.push(t);
        toRemove.splice(idx, 1);
      } else {
        rest.push(t);
      }
    }

    if (used.length !== 2) return false;

    const discards = this.players[this.lastDiscardPlayer].discards;
    discards.pop();

    const chiTiles = sortTiles([...used, this.lastDiscard]);
    this.players[playerIdx].hand = sortTiles(rest);
    this.players[playerIdx].exposed.push({ type: 'chi', tiles: chiTiles });

    this.currentPlayer = playerIdx;
    this.turnPhase = 'discard';
    this.lastDiscard = null;
    this.lastDiscardPlayer = null;
    this.pendingClaims = [];

    return true;
  }

  doKong(playerIdx) {
    if (!this.canKong(playerIdx)) return false;
    this.history.push(this._snapshot());

    const hand = this.players[playerIdx].hand;
    const matching = [];
    const rest = [];
    for (const t of hand) {
      if (tilesMatch(t, this.lastDiscard) && matching.length < 3) matching.push(t);
      else rest.push(t);
    }

    const discards = this.players[this.lastDiscardPlayer].discards;
    discards.pop();

    this.players[playerIdx].hand = sortTiles(rest);
    this.players[playerIdx].exposed.push({ type: 'kong', tiles: [...matching, this.lastDiscard] });

    this.currentPlayer = playerIdx;
    this.lastDiscard = null;
    this.lastDiscardPlayer = null;
    this.pendingClaims = [];

    // Kong grants an extra draw
    if (this.wall.length > 0) {
      const tile = this.wall.pop();
      this.players[playerIdx].hand.push(tile);
      this.players[playerIdx].hand = sortTiles(this.players[playerIdx].hand);
    }
    this.turnPhase = 'discard';

    return true;
  }

  skipClaim(playerIdx) {
    if (this.turnPhase !== 'claim') return false;

    this.pendingClaims = this.pendingClaims.filter(c => c.player !== playerIdx);

    if (this.pendingClaims.length === 0) {
      this._nextTurn();
    }

    return true;
  }

  _canWinOnDiscard(playerIdx) {
    if (!this.lastDiscard) return false;
    const hand = [...this.players[playerIdx].hand, this.lastDiscard];
    const exposedCount = this.players[playerIdx].exposed.length;
    // Need 4 sets + 1 pair total. Each exposed set is already formed.
    // Remaining hand tiles need to form (4 - exposedCount) sets + 1 pair
    return this._isWinningCombo(hand, exposedCount);
  }

  checkWin(playerIdx) {
    const hand = this.players[playerIdx].hand;
    const exposedCount = this.players[playerIdx].exposed.length;
    return this._isWinningCombo(hand, exposedCount);
  }

  _isWinningCombo(tiles, exposedSets) {
    const needed = 4 - exposedSets;
    if (tiles.length !== needed * 3 + 2) return false;
    const sorted = sortTiles(tiles);
    return _checkWinN(sorted, [], 0, needed);
  }

  declareWin(playerIdx) {
    if (this.phase !== 'playing') return false;

    // Check if winning on discard (claim phase)
    if (this.turnPhase === 'claim' && this.lastDiscard) {
      const hand = [...this.players[playerIdx].hand, this.lastDiscard];
      const exposedCount = this.players[playerIdx].exposed.length;
      if (this._isWinningCombo(hand, exposedCount)) {
        this.history.push(this._snapshot());
        // Remove from discarder's discards
        this.players[this.lastDiscardPlayer].discards.pop();
        this.players[playerIdx].hand = sortTiles(hand);
        this.winner = playerIdx;
        this.phase = 'gameOver';
        this.pendingClaims = [];
        return true;
      }
    }

    // Check self-drawn win (during discard phase, current player)
    if (playerIdx === this.currentPlayer && this.turnPhase === 'discard') {
      if (this.checkWin(playerIdx)) {
        this.history.push(this._snapshot());
        this.winner = playerIdx;
        this.phase = 'gameOver';
        return true;
      }
    }

    return false;
  }

  _nextTurn() {
    this.currentPlayer = (this.currentPlayer + 1) % 4;
    this.turnPhase = 'draw';
    this.lastDiscard = null;
    this.lastDiscardPlayer = null;
  }

  undo() {
    if (this.history.length === 0) return false;
    this._restore(this.history.pop());
    return true;
  }

  getStatus() {
    return this.phase;
  }

  getTilesRemaining() {
    return this.wall.length;
  }
}

// Generalized check: need exactly `needed` sets + 1 pair
function _checkWinN(tiles, sets, pairCount, needed) {
  if (tiles.length === 0) return pairCount === 1 && sets.length === needed;

  // Try pair
  if (pairCount === 0 && tiles.length >= 2 && tilesMatch(tiles[0], tiles[1])) {
    const remaining = tiles.slice(2);
    if (_checkWinN(remaining, sets, 1, needed)) return true;
  }

  // Try pung
  if (tiles.length >= 3 && tilesMatch(tiles[0], tiles[1]) && tilesMatch(tiles[1], tiles[2])) {
    const remaining = tiles.slice(3);
    if (_checkWinN(remaining, [...sets, 'pung'], pairCount, needed)) return true;
  }

  // Try chi
  if (tiles.length >= 3 && isNumeric(tiles[0].suit)) {
    const first = tiles[0];
    const secondIdx = tiles.findIndex((t, i) => i > 0 && t.suit === first.suit && t.value === first.value + 1);
    if (secondIdx !== -1) {
      const thirdIdx = tiles.findIndex((t, i) => i > secondIdx && t.suit === first.suit && t.value === first.value + 2);
      if (thirdIdx !== -1) {
        const remaining = tiles.filter((_, i) => i !== 0 && i !== secondIdx && i !== thirdIdx);
        if (_checkWinN(remaining, [...sets, 'chi'], pairCount, needed)) return true;
      }
    }
  }

  return false;
}

export { tilesMatch, tileKey, sortTiles, isNumeric, isWinningHand, SUITS, WINDS, DRAGONS };
