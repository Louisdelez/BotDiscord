// Piece types: K=King, R=Rook, B=Bishop, G=Gold, S=Silver, N=Knight, L=Lance, P=Pawn

const INITIAL_BOARD = [
  // Row 0 = gote's back rank (top)
  [{ type: 'L', owner: 'gote' }, { type: 'N', owner: 'gote' }, { type: 'S', owner: 'gote' }, { type: 'G', owner: 'gote' }, { type: 'K', owner: 'gote' }, { type: 'G', owner: 'gote' }, { type: 'S', owner: 'gote' }, { type: 'N', owner: 'gote' }, { type: 'L', owner: 'gote' }],
  [null, { type: 'R', owner: 'gote' }, null, null, null, null, null, { type: 'B', owner: 'gote' }, null],
  [{ type: 'P', owner: 'gote' }, { type: 'P', owner: 'gote' }, { type: 'P', owner: 'gote' }, { type: 'P', owner: 'gote' }, { type: 'P', owner: 'gote' }, { type: 'P', owner: 'gote' }, { type: 'P', owner: 'gote' }, { type: 'P', owner: 'gote' }, { type: 'P', owner: 'gote' }],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  [{ type: 'P', owner: 'sente' }, { type: 'P', owner: 'sente' }, { type: 'P', owner: 'sente' }, { type: 'P', owner: 'sente' }, { type: 'P', owner: 'sente' }, { type: 'P', owner: 'sente' }, { type: 'P', owner: 'sente' }, { type: 'P', owner: 'sente' }, { type: 'P', owner: 'sente' }],
  [null, { type: 'B', owner: 'sente' }, null, null, null, null, null, { type: 'R', owner: 'sente' }, null],
  [{ type: 'L', owner: 'sente' }, { type: 'N', owner: 'sente' }, { type: 'S', owner: 'sente' }, { type: 'G', owner: 'sente' }, { type: 'K', owner: 'sente' }, { type: 'G', owner: 'sente' }, { type: 'S', owner: 'sente' }, { type: 'N', owner: 'sente' }, { type: 'L', owner: 'sente' }],
];

const PIECE_MOVES = {
  K: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
  G: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]], // relative to sente (moving up = -1)
  S: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1]],
  N: [[-2, -1], [-2, 1]],
};

// Sliding pieces: directions they can slide
const SLIDING_DIRS = {
  R: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  B: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
};

// Promoted pieces move like gold, except promoted R and B
const PROMOTES_TO_GOLD = ['S', 'N', 'L', 'P'];

function inBounds(r, c) {
  return r >= 0 && r < 9 && c >= 0 && c < 9;
}

function cloneBoard(board) {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

function cloneHands(hands) {
  return {
    sente: { ...hands.sente },
    gote: { ...hands.gote },
  };
}

function directionFor(owner) {
  // sente moves up (row decreasing), gote moves down (row increasing)
  return owner === 'sente' ? -1 : 1;
}

function flipMoves(moves, owner) {
  if (owner === 'sente') return moves;
  return moves.map(([dr, dc]) => [-dr, -dc]);
}

function findKing(board, player) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.type === 'K' && p.owner === player) return [r, c];
    }
  }
  return null;
}

function getRawMoves(piece, row, col) {
  const { type, owner, promoted } = piece;
  const moves = [];

  // Promoted R = R slides + king-adjacent
  if (type === 'R' && promoted) {
    for (const [dr, dc] of SLIDING_DIRS.R) {
      for (let i = 1; i < 9; i++) {
        const nr = row + dr * i, nc = col + dc * i;
        if (!inBounds(nr, nc)) break;
        moves.push([nr, nc, 'slide']);
      }
    }
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const nr = row + dr, nc = col + dc;
      if (inBounds(nr, nc)) moves.push([nr, nc, 'step']);
    }
    return moves;
  }

  // Promoted B = B slides + orthogonal adjacent
  if (type === 'B' && promoted) {
    for (const [dr, dc] of SLIDING_DIRS.B) {
      for (let i = 1; i < 9; i++) {
        const nr = row + dr * i, nc = col + dc * i;
        if (!inBounds(nr, nc)) break;
        moves.push([nr, nc, 'slide']);
      }
    }
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = row + dr, nc = col + dc;
      if (inBounds(nr, nc)) moves.push([nr, nc, 'step']);
    }
    return moves;
  }

  // Promoted S/N/L/P → gold moves
  if (promoted && PROMOTES_TO_GOLD.includes(type)) {
    const goldMoves = flipMoves(PIECE_MOVES.G, owner);
    for (const [dr, dc] of goldMoves) {
      const nr = row + dr, nc = col + dc;
      if (inBounds(nr, nc)) moves.push([nr, nc, 'step']);
    }
    return moves;
  }

  // Rook
  if (type === 'R') {
    for (const [dr, dc] of SLIDING_DIRS.R) {
      for (let i = 1; i < 9; i++) {
        const nr = row + dr * i, nc = col + dc * i;
        if (!inBounds(nr, nc)) break;
        moves.push([nr, nc, 'slide']);
      }
    }
    return moves;
  }

  // Bishop
  if (type === 'B') {
    for (const [dr, dc] of SLIDING_DIRS.B) {
      for (let i = 1; i < 9; i++) {
        const nr = row + dr * i, nc = col + dc * i;
        if (!inBounds(nr, nc)) break;
        moves.push([nr, nc, 'slide']);
      }
    }
    return moves;
  }

  // Lance: slides forward only
  if (type === 'L') {
    const dir = directionFor(owner);
    for (let i = 1; i < 9; i++) {
      const nr = row + dir * i;
      if (!inBounds(nr, col)) break;
      moves.push([nr, col, 'slide']);
    }
    return moves;
  }

  // Pawn: one step forward
  if (type === 'P') {
    const dir = directionFor(owner);
    const nr = row + dir;
    if (inBounds(nr, col)) moves.push([nr, col, 'step']);
    return moves;
  }

  // King, Gold, Silver, Knight (step-based pieces)
  const stepMoves = PIECE_MOVES[type];
  if (stepMoves) {
    const oriented = flipMoves(stepMoves, owner);
    for (const [dr, dc] of oriented) {
      const nr = row + dr, nc = col + dc;
      if (inBounds(nr, nc)) moves.push([nr, nc, 'step']);
    }
  }

  return moves;
}

// Generate moves with proper slide blocking
function getValidSquares(board, piece, row, col) {
  const { type, owner, promoted } = piece;
  const squares = [];

  const addStep = (dr, dc) => {
    const nr = row + dr, nc = col + dc;
    if (!inBounds(nr, nc)) return;
    const target = board[nr][nc];
    if (target && target.owner === owner) return;
    squares.push({ toRow: nr, toCol: nc });
  };

  const addSlide = (dr, dc) => {
    for (let i = 1; i < 9; i++) {
      const nr = row + dr * i, nc = col + dc * i;
      if (!inBounds(nr, nc)) break;
      const target = board[nr][nc];
      if (target && target.owner === owner) break;
      squares.push({ toRow: nr, toCol: nc });
      if (target) break; // captured, stop sliding
    }
  };

  // Promoted rook
  if (type === 'R' && promoted) {
    for (const [dr, dc] of SLIDING_DIRS.R) addSlide(dr, dc);
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) addStep(dr, dc);
    return squares;
  }

  // Promoted bishop
  if (type === 'B' && promoted) {
    for (const [dr, dc] of SLIDING_DIRS.B) addSlide(dr, dc);
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) addStep(dr, dc);
    return squares;
  }

  // Promoted S/N/L/P → gold
  if (promoted && PROMOTES_TO_GOLD.includes(type)) {
    for (const [dr, dc] of flipMoves(PIECE_MOVES.G, owner)) addStep(dr, dc);
    return squares;
  }

  if (type === 'R') { for (const [dr, dc] of SLIDING_DIRS.R) addSlide(dr, dc); return squares; }
  if (type === 'B') { for (const [dr, dc] of SLIDING_DIRS.B) addSlide(dr, dc); return squares; }

  if (type === 'L') {
    addSlide(directionFor(owner), 0);
    return squares;
  }

  if (type === 'P') {
    addStep(directionFor(owner), 0);
    return squares;
  }

  // King, Gold, Silver, Knight
  if (PIECE_MOVES[type]) {
    for (const [dr, dc] of flipMoves(PIECE_MOVES[type], owner)) addStep(dr, dc);
  }

  return squares;
}

function isAttackedBy(board, row, col, attacker) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p || p.owner !== attacker) continue;
      const targets = getValidSquares(board, p, r, c);
      if (targets.some(t => t.toRow === row && t.toCol === col)) return true;
    }
  }
  return false;
}

function isInCheck(board, player) {
  const kingPos = findKing(board, player);
  if (!kingPos) return false;
  const opponent = player === 'sente' ? 'gote' : 'sente';
  return isAttackedBy(board, kingPos[0], kingPos[1], opponent);
}

export class ShogiEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = INITIAL_BOARD.map(row => row.map(cell => cell ? { ...cell, promoted: false } : null));
    this.hands = {
      sente: { P: 0, L: 0, N: 0, S: 0, G: 0, B: 0, R: 0 },
      gote: { P: 0, L: 0, N: 0, S: 0, G: 0, B: 0, R: 0 },
    };
    this.turn = 'sente';
    this.history = [];
    this._status = null;
  }

  _opponent() {
    return this.turn === 'sente' ? 'gote' : 'sente';
  }

  canPromote(fromRow, toRow, piece) {
    if (!piece || piece.promoted || piece.type === 'K' || piece.type === 'G') return false;
    if (piece.owner === 'sente') return fromRow <= 2 || toRow <= 2;
    return fromRow >= 6 || toRow >= 6;
  }

  mustPromote(piece, toRow) {
    if (!piece || piece.promoted) return false;
    if (piece.owner === 'sente') {
      if (piece.type === 'P' || piece.type === 'L') return toRow === 0;
      if (piece.type === 'N') return toRow <= 1;
    } else {
      if (piece.type === 'P' || piece.type === 'L') return toRow === 8;
      if (piece.type === 'N') return toRow >= 7;
    }
    return false;
  }

  getLegalMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece || piece.owner !== this.turn) return [];

    const pseudoMoves = getValidSquares(this.board, piece, row, col);
    const legal = [];

    for (const move of pseudoMoves) {
      // Simulate the move and check if own king is in check
      const newBoard = cloneBoard(this.board);
      newBoard[move.toRow][move.toCol] = { ...piece };
      newBoard[row][col] = null;

      if (!isInCheck(newBoard, this.turn)) {
        const canProm = this.canPromote(row, move.toRow, piece);
        const mustProm = this.mustPromote(piece, move.toRow);

        if (mustProm) {
          legal.push({ ...move, promote: true, mustPromote: true });
        } else if (canProm) {
          legal.push({ ...move, promote: false });
          legal.push({ ...move, promote: true });
        } else {
          legal.push({ ...move, promote: false });
        }
      }
    }

    return legal;
  }

  getLegalDrops(pieceType) {
    if (this.hands[this.turn][pieceType] <= 0) return [];
    const drops = [];

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c]) continue;

        // Pawn/Lance can't be dropped on last rank
        if (this.turn === 'sente') {
          if ((pieceType === 'P' || pieceType === 'L') && r === 0) continue;
          if (pieceType === 'N' && r <= 1) continue;
        } else {
          if ((pieceType === 'P' || pieceType === 'L') && r === 8) continue;
          if (pieceType === 'N' && r >= 7) continue;
        }

        // Nifu: no two unpromoted pawns in same column
        if (pieceType === 'P') {
          let hasPawn = false;
          for (let rr = 0; rr < 9; rr++) {
            const p = this.board[rr][c];
            if (p && p.type === 'P' && !p.promoted && p.owner === this.turn) {
              hasPawn = true;
              break;
            }
          }
          if (hasPawn) continue;
        }

        // Simulate drop and check it doesn't leave own king in check
        const newBoard = cloneBoard(this.board);
        newBoard[r][c] = { type: pieceType, owner: this.turn, promoted: false };

        if (isInCheck(newBoard, this.turn)) continue;

        // Pawn drop cannot give immediate checkmate
        if (pieceType === 'P') {
          const opponent = this._opponent();
          if (isInCheck(newBoard, opponent)) {
            // Check if opponent has any legal response
            if (this._isCheckmateOnBoard(newBoard, opponent)) continue;
          }
        }

        drops.push({ toRow: r, toCol: c });
      }
    }

    return drops;
  }

  _isCheckmateOnBoard(board, player) {
    // Check if player is in checkmate on the given board
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (!p || p.owner !== player) continue;
        const moves = getValidSquares(board, p, r, c);
        for (const move of moves) {
          const testBoard = cloneBoard(board);
          testBoard[move.toRow][move.toCol] = { ...p };
          testBoard[r][c] = null;
          if (!isInCheck(testBoard, player)) return false;
        }
      }
    }
    return true;
  }

  move(fromRow, fromCol, toRow, toCol, promote = false) {
    const piece = this.board[fromRow][fromCol];
    if (!piece || piece.owner !== this.turn) return null;

    const captured = this.board[toRow][toCol];
    const historyEntry = {
      type: 'move',
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece: { ...piece },
      captured: captured ? { ...captured } : null,
      promoted: promote,
      prevPromoted: piece.promoted,
    };

    // Capture → add to hand (unpromoted base type)
    if (captured) {
      const baseType = captured.type;
      this.hands[this.turn][baseType]++;
    }

    // Move piece
    this.board[toRow][toCol] = { ...piece, promoted: promote ? true : piece.promoted };
    this.board[fromRow][fromCol] = null;

    this.history.push(historyEntry);
    this.turn = this._opponent();
    this._status = null;
    return historyEntry;
  }

  drop(pieceType, row, col) {
    if (this.hands[this.turn][pieceType] <= 0) return null;
    if (this.board[row][col]) return null;

    const historyEntry = {
      type: 'drop',
      pieceType,
      to: { row, col },
      owner: this.turn,
    };

    this.board[row][col] = { type: pieceType, owner: this.turn, promoted: false };
    this.hands[this.turn][pieceType]--;

    this.history.push(historyEntry);
    this.turn = this._opponent();
    this._status = null;
    return historyEntry;
  }

  undo() {
    if (this.history.length === 0) return;
    const last = this.history.pop();
    this.turn = this.turn === 'sente' ? 'gote' : 'sente';

    if (last.type === 'move') {
      // Restore piece to original position
      this.board[last.from.row][last.from.col] = {
        type: last.piece.type,
        owner: last.piece.owner,
        promoted: last.prevPromoted,
      };
      // Restore captured piece or empty
      this.board[last.to.row][last.to.col] = last.captured ? { ...last.captured } : null;
      // Remove captured piece from hand
      if (last.captured) {
        this.hands[this.turn][last.captured.type]--;
      }
    } else if (last.type === 'drop') {
      this.board[last.to.row][last.to.col] = null;
      this.hands[last.owner][last.pieceType]++;
    }

    this._status = null;
  }

  isCheck(player) {
    return isInCheck(this.board, player || this.turn);
  }

  isCheckmate(player) {
    const p = player || this.turn;
    if (!this.isCheck(p)) return false;
    return !this._hasAnyLegalMove(p);
  }

  isStalemate(player) {
    const p = player || this.turn;
    if (this.isCheck(p)) return false;
    return !this._hasAnyLegalMove(p);
  }

  _hasAnyLegalMove(player) {
    // Check board moves
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = this.board[r][c];
        if (!p || p.owner !== player) continue;
        const moves = getValidSquares(this.board, p, r, c);
        for (const move of moves) {
          const testBoard = cloneBoard(this.board);
          testBoard[move.toRow][move.toCol] = { ...p };
          testBoard[r][c] = null;
          if (!isInCheck(testBoard, player)) return true;
        }
      }
    }

    // Check drops
    const hand = this.hands[player];
    for (const type of Object.keys(hand)) {
      if (hand[type] <= 0) continue;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (this.board[r][c]) continue;

          if (player === 'sente') {
            if ((type === 'P' || type === 'L') && r === 0) continue;
            if (type === 'N' && r <= 1) continue;
          } else {
            if ((type === 'P' || type === 'L') && r === 8) continue;
            if (type === 'N' && r >= 7) continue;
          }

          if (type === 'P') {
            let hasPawn = false;
            for (let rr = 0; rr < 9; rr++) {
              const pp = this.board[rr][c];
              if (pp && pp.type === 'P' && !pp.promoted && pp.owner === player) { hasPawn = true; break; }
            }
            if (hasPawn) continue;
          }

          const testBoard = cloneBoard(this.board);
          testBoard[r][c] = { type, owner: player, promoted: false };
          if (!isInCheck(testBoard, player)) return true;
        }
      }
    }

    return false;
  }

  getStatus() {
    if (this._status) return this._status;
    if (this.isCheckmate(this.turn)) {
      this._status = 'checkmate';
    } else if (this.isStalemate(this.turn)) {
      this._status = 'stalemate';
    } else if (this.isCheck(this.turn)) {
      this._status = 'check';
    } else {
      this._status = 'playing';
    }
    return this._status;
  }
}
