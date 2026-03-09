const { Chess } = require('chess.js');

class ChessEngine {
  constructor() {
    this.game = new Chess();
    this.lastMove = null;
  }

  reset() {
    this.game.reset();
    this.lastMove = null;
  }

  move(from, to, promotion) {
    try {
      const moveObj = { from, to };
      if (promotion) {
        moveObj.promotion = promotion;
      }
      const result = this.game.move(moveObj);
      if (result) {
        this.lastMove = { from, to };
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getMoves(square) {
    const moves = this.game.moves({ square, verbose: true });
    return moves.map((m) => m.to);
  }

  getStatus() {
    if (this.game.isCheckmate()) return 'checkmate';
    if (this.game.isStalemate()) return 'stalemate';
    if (this.game.isDraw()) return 'draw';
    if (this.game.isCheck()) return 'check';
    return 'playing';
  }

  get currentPlayer() {
    return this.game.turn() === 'w' ? 1 : 2;
  }

  get gameOver() {
    return this.game.isGameOver();
  }

  serialize() {
    return {
      board: this.game.board(),
      turn: this.game.turn(),
      fen: this.game.fen(),
      isCheck: this.game.isCheck(),
      status: this.getStatus(),
      history: this.game.history(),
      lastMove: this.lastMove,
    };
  }
}

module.exports = { ChessEngine };
