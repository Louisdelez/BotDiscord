const ROWS = 6;
const COLS = 7;
const WIN_LENGTH = 4;

const DIRECTIONS = [
  [0, 1],   // horizontal →
  [1, 0],   // vertical ↓
  [1, 1],   // diagonal ↘
  [-1, 1],  // diagonal ↗
];

export class Connect4Engine {
  constructor() {
    this.reset();
  }

  reset() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.currentPlayer = 1;
    this.winner = null;
    this.winningCells = [];
    this.isDraw = false;
    this.gameOver = false;
    this.moveCount = 0;
    this.history = [];
  }

  canDrop(col) {
    return !this.gameOver && col >= 0 && col < COLS && this.grid[0][col] === 0;
  }

  getAvailableColumns() {
    const cols = [];
    for (let c = 0; c < COLS; c++) {
      if (this.canDrop(c)) cols.push(c);
    }
    return cols;
  }

  dropPiece(col) {
    if (!this.canDrop(col)) return false;

    // Find lowest empty row
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.grid[r][col] === 0) {
        row = r;
        break;
      }
    }

    this.history.push({ row, col, player: this.currentPlayer });
    this.grid[row][col] = this.currentPlayer;
    this.moveCount++;

    // Check win
    const winning = this._checkWin(row, col);
    if (winning) {
      this.winner = this.currentPlayer;
      this.winningCells = winning;
      this.gameOver = true;
    } else if (this.moveCount >= ROWS * COLS) {
      this.isDraw = true;
      this.gameOver = true;
    } else {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }

    return true;
  }

  undo() {
    if (this.history.length === 0) return false;

    const last = this.history.pop();
    this.grid[last.row][last.col] = 0;
    this.moveCount--;
    this.currentPlayer = last.player;
    this.winner = null;
    this.winningCells = [];
    this.isDraw = false;
    this.gameOver = false;

    return true;
  }

  getStatus() {
    if (this.winner) return 'won';
    if (this.isDraw) return 'draw';
    return 'playing';
  }

  getLowestRow(col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.grid[r][col] === 0) return r;
    }
    return -1;
  }

  _checkWin(row, col) {
    const player = this.grid[row][col];

    for (const [dr, dc] of DIRECTIONS) {
      const cells = [{ row, col }];

      // Count in positive direction
      for (let i = 1; i < WIN_LENGTH; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || this.grid[r][c] !== player) break;
        cells.push({ row: r, col: c });
      }

      // Count in negative direction
      for (let i = 1; i < WIN_LENGTH; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || this.grid[r][c] !== player) break;
        cells.push({ row: r, col: c });
      }

      if (cells.length >= WIN_LENGTH) return cells;
    }

    return null;
  }
}
