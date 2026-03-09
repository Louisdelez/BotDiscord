const HOSHI = {
  9: [[2,2],[2,6],[6,2],[6,6],[4,4]],
  13: [[3,3],[3,9],[9,3],[9,9],[6,6],[3,6],[6,3],[6,9],[9,6]],
  19: [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]],
};

class GoEngine {
  constructor(size = 19) {
    this.reset(size);
  }

  reset(size = this.size) {
    this.size = size;
    this.board = Array.from({ length: size }, () => Array(size).fill(null));
    this.currentPlayer = 'black';
    this.captures = { black: 0, white: 0 };
    this.koPoint = null;
    this.passCount = 0;
    this._gameOver = false;
    this.winner = null;
    this.history = [];
    this.lastMove = null;
    this.moveCount = 0;
    this.komi = 6.5;
    this.phase = 'playing';
    this.territory = null;
  }

  get gameOver() {
    return this._gameOver;
  }

  set gameOver(value) {
    this._gameOver = value;
  }

  getPlayerNumber() {
    return this.currentPlayer === 'black' ? 1 : 2;
  }

  serialize() {
    return {
      board: this.board,
      size: this.size,
      currentPlayer: this.getPlayerNumber(),
      turn: this.currentPlayer,
      captures: this.captures,
      komi: this.komi,
      phase: this.phase,
      gameOver: this.gameOver,
      territory: this.territory,
      winner: this.winner,
      lastMove: this.lastMove,
      hoshi: this.getHoshi(),
    };
  }

  _opponent(color) {
    return color === 'black' ? 'white' : 'black';
  }

  _inBounds(r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  _neighbors(r, c) {
    return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([nr,nc]) => this._inBounds(nr, nc));
  }

  _getGroup(row, col) {
    const color = this.board[row][col];
    if (!color) return [];
    const visited = new Set();
    const stack = [[row, col]];
    const group = [];
    while (stack.length > 0) {
      const [r, c] = stack.pop();
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (this.board[r][c] !== color) continue;
      group.push([r, c]);
      for (const [nr, nc] of this._neighbors(r, c)) {
        if (!visited.has(`${nr},${nc}`)) stack.push([nr, nc]);
      }
    }
    return group;
  }

  _getLiberties(group) {
    const liberties = new Set();
    for (const [r, c] of group) {
      for (const [nr, nc] of this._neighbors(r, c)) {
        if (this.board[nr][nc] === null) {
          liberties.add(`${nr},${nc}`);
        }
      }
    }
    return liberties;
  }

  _captureGroup(group) {
    for (const [r, c] of group) {
      this.board[r][c] = null;
    }
    return group.length;
  }

  _checkCaptures(row, col) {
    const opponent = this._opponent(this.board[row][col]);
    let totalCaptured = 0;
    const capturedStones = [];
    for (const [nr, nc] of this._neighbors(row, col)) {
      if (this.board[nr][nc] === opponent) {
        const group = this._getGroup(nr, nc);
        const liberties = this._getLiberties(group);
        if (liberties.size === 0) {
          capturedStones.push(...group);
          totalCaptured += this._captureGroup(group);
        }
      }
    }
    return { totalCaptured, capturedStones };
  }

  _isSuicide(row, col, color) {
    // Temporarily place stone
    this.board[row][col] = color;
    // Check if placing captures opponent stones
    const opponent = this._opponent(color);
    for (const [nr, nc] of this._neighbors(row, col)) {
      if (this.board[nr][nc] === opponent) {
        const group = this._getGroup(nr, nc);
        if (this._getLiberties(group).size === 0) {
          this.board[row][col] = null;
          return false; // Captures, not suicide
        }
      }
    }
    // Check own group liberties
    const ownGroup = this._getGroup(row, col);
    const liberties = this._getLiberties(ownGroup);
    this.board[row][col] = null;
    return liberties.size === 0;
  }

  _isKo(row, col) {
    return this.koPoint && this.koPoint[0] === row && this.koPoint[1] === col;
  }

  placeStone(row, col) {
    if (this.phase !== 'playing') return { success: false, reason: 'notPlaying' };
    if (!this._inBounds(row, col)) return { success: false, reason: 'outOfBounds' };
    if (this.board[row][col] !== null) return { success: false, reason: 'occupied' };
    if (this._isKo(row, col)) return { success: false, reason: 'ko' };
    if (this._isSuicide(row, col, this.currentPlayer)) return { success: false, reason: 'suicide' };

    // Save snapshot for undo
    this.history.push({
      board: this.board.map(r => [...r]),
      currentPlayer: this.currentPlayer,
      captures: { ...this.captures },
      koPoint: this.koPoint,
      passCount: this.passCount,
      lastMove: this.lastMove,
      moveCount: this.moveCount,
    });

    // Place stone
    this.board[row][col] = this.currentPlayer;
    this.passCount = 0;

    // Check captures
    const { totalCaptured, capturedStones } = this._checkCaptures(row, col);
    this.captures[this.currentPlayer] += totalCaptured;

    // Ko detection: if exactly 1 stone captured and placed stone has exactly 1 liberty
    if (totalCaptured === 1) {
      const ownGroup = this._getGroup(row, col);
      const ownLiberties = this._getLiberties(ownGroup);
      if (ownGroup.length === 1 && ownLiberties.size === 1) {
        this.koPoint = capturedStones[0];
      } else {
        this.koPoint = null;
      }
    } else {
      this.koPoint = null;
    }

    this.lastMove = [row, col];
    this.moveCount++;
    this.currentPlayer = this._opponent(this.currentPlayer);

    return { success: true };
  }

  pass() {
    if (this.phase !== 'playing') return false;

    this.history.push({
      board: this.board.map(r => [...r]),
      currentPlayer: this.currentPlayer,
      captures: { ...this.captures },
      koPoint: this.koPoint,
      passCount: this.passCount,
      lastMove: this.lastMove,
      moveCount: this.moveCount,
    });

    this.passCount++;
    this.koPoint = null;
    this.lastMove = null;
    this.moveCount++;
    this.currentPlayer = this._opponent(this.currentPlayer);

    if (this.passCount >= 2) {
      this.phase = 'scoring';
      this.calculateScore();
    }

    return true;
  }

  undo() {
    if (this.history.length === 0) return false;
    const snapshot = this.history.pop();
    this.board = snapshot.board;
    this.currentPlayer = snapshot.currentPlayer;
    this.captures = snapshot.captures;
    this.koPoint = snapshot.koPoint;
    this.passCount = snapshot.passCount;
    this.lastMove = snapshot.lastMove;
    this.moveCount = snapshot.moveCount;

    if (this.phase === 'gameOver') {
      this.phase = snapshot.phase || 'scoring';
      this.gameOver = false;
      this.winner = null;
      this.territory = null;
    } else if (this.phase === 'scoring') {
      this.phase = 'playing';
      this.territory = null;
    }

    return true;
  }

  getStatus() {
    return this.phase;
  }

  _floodFillTerritory() {
    const map = Array.from({ length: this.size }, () => Array(this.size).fill(null));
    const visited = Array.from({ length: this.size }, () => Array(this.size).fill(false));

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] !== null || visited[r][c]) continue;

        // Flood fill empty region
        const region = [];
        const stack = [[r, c]];
        const borders = new Set();
        while (stack.length > 0) {
          const [cr, cc] = stack.pop();
          if (!this._inBounds(cr, cc)) continue;
          if (visited[cr][cc]) continue;
          if (this.board[cr][cc] !== null) {
            borders.add(this.board[cr][cc]);
            continue;
          }
          visited[cr][cc] = true;
          region.push([cr, cc]);
          for (const [nr, nc] of this._neighbors(cr, cc)) {
            stack.push([nr, nc]);
          }
        }

        // If bordered by only one color, it's that color's territory
        let owner = null;
        if (borders.size === 1) {
          owner = [...borders][0];
        }
        // dame (neutral) if bordered by both or neither
        for (const [rr, rc] of region) {
          map[rr][rc] = owner;
        }
      }
    }

    return map;
  }

  calculateScore() {
    const territoryMap = this._floodFillTerritory();

    let blackTerritory = 0;
    let whiteTerritory = 0;
    let blackStones = 0;
    let whiteStones = 0;

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === 'black') blackStones++;
        else if (this.board[r][c] === 'white') whiteStones++;
        else if (territoryMap[r][c] === 'black') blackTerritory++;
        else if (territoryMap[r][c] === 'white') whiteTerritory++;
      }
    }

    // Chinese scoring: stones on board + territory
    const blackScore = blackStones + blackTerritory;
    const whiteScore = whiteStones + whiteTerritory + this.komi;

    this.territory = {
      black: blackTerritory,
      white: whiteTerritory,
      blackTotal: blackScore,
      whiteTotal: whiteScore,
      map: territoryMap,
    };

    return this.territory;
  }

  confirmScoring() {
    if (this.phase !== 'scoring') return false;

    if (!this.territory) this.calculateScore();

    this.history.push({
      board: this.board.map(r => [...r]),
      currentPlayer: this.currentPlayer,
      captures: { ...this.captures },
      koPoint: this.koPoint,
      passCount: this.passCount,
      lastMove: this.lastMove,
      moveCount: this.moveCount,
      phase: 'scoring',
    });

    this.phase = 'gameOver';
    this.gameOver = true;
    this.winner = this.territory.blackTotal > this.territory.whiteTotal ? 'black' : 'white';

    return true;
  }

  getHoshi() {
    return HOSHI[this.size] || [];
  }
}

module.exports = { GoEngine };
