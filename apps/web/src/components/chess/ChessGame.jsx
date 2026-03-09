import { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Crown, LogOut, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ChessBoard } from './ChessBoard';
import { GameLobby } from '../game/GameLobby';
import { useGameStore } from '../../stores/game';
import { useAuthStore } from '../../stores/auth';
import { useT } from '../../lib/i18n';

const PIECE_UNICODE = {
  K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
  k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F',
};

const PROMOTION_PIECES = [
  { piece: 'q', white: '\u2655', black: '\u265B' },
  { piece: 'r', white: '\u2656', black: '\u265C' },
  { piece: 'b', white: '\u2657', black: '\u265D' },
  { piece: 'n', white: '\u2658', black: '\u265E' },
];

function getCapturedPieces(history) {
  const captured = { w: [], b: [] };
  if (!history) return captured;
  // Parse SAN moves from server to find captures (moves containing 'x')
  // This is simplified - the server sends history as SAN strings
  return captured;
}

function ChessOnline({ sessionState, myPlayer, isSpectator, isMyTurn, onLeave, onRematch }) {
  const t = useT();
  const sendAction = useGameStore((s) => s.sendAction);

  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [promotionPending, setPromotionPending] = useState(null);

  const engine = sessionState.engine;
  if (!engine) return null;

  // Create local Chess instance from FEN for move validation display
  const localChess = useMemo(() => {
    try {
      return new Chess(engine.fen);
    } catch {
      return new Chess();
    }
  }, [engine.fen]);

  const board = engine.board;
  const turn = engine.turn;
  const myColor = myPlayer?.playerNumber === 1 ? 'w' : 'b';
  const lastMove = engine.lastMove;
  const isFinished = sessionState.phase === 'finished';

  const getPlayerInfo = (num) => sessionState.players.find(p => p.playerNumber === num);
  const player1 = getPlayerInfo(1);
  const player2 = getPlayerInfo(2);

  const handleSquareClick = (square) => {
    if (isSpectator || !isMyTurn || isFinished || promotionPending) return;

    const piece = localChess.get(square);

    // If clicking a legal move target
    if (selectedSquare && legalMoves.includes(square)) {
      const movingPiece = localChess.get(selectedSquare);
      if (
        movingPiece?.type === 'p' &&
        ((movingPiece.color === 'w' && square[1] === '8') ||
         (movingPiece.color === 'b' && square[1] === '1'))
      ) {
        setPromotionPending({ from: selectedSquare, to: square });
        return;
      }

      sendAction({ type: 'move', from: selectedSquare, to: square });
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // If clicking own piece, select it
    if (piece && piece.color === myColor) {
      setSelectedSquare(square);
      const moves = localChess.moves({ square, verbose: true });
      setLegalMoves(moves.map(m => m.to));
      return;
    }

    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const handlePromotion = (promotionPiece) => {
    if (!promotionPending) return;
    sendAction({ type: 'move', from: promotionPending.from, to: promotionPending.to, promotion: promotionPiece });
    setPromotionPending(null);
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const statusBadge = () => {
    if (engine.status === 'checkmate') {
      const winner = turn === 'w' ? player2 : player1;
      return <Badge variant="danger">{t('chess.checkmate')} — {winner?.username}</Badge>;
    }
    if (engine.status === 'stalemate') return <Badge variant="warning">{t('chess.stalemate')}</Badge>;
    if (engine.status === 'draw') return <Badge variant="warning">{t('chess.draw')}</Badge>;
    if (engine.isCheck) return <Badge variant="danger">{t('chess.check')}</Badge>;
    if (isMyTurn) return <Badge variant="success">{t('game.yourTurn')}</Badge>;
    const currentPlayerInfo = turn === 'w' ? player1 : player2;
    return <Badge variant="info">{t('game.playerTurn', { player: currentPlayerInfo?.username })}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Crown size={20} /> {t('chess.title')}</CardTitle>
            {isSpectator && <p className="text-sm text-[var(--text-secondary)]">{t('game.spectating')}</p>}
          </div>
          <div className="flex items-center gap-2">
            <div aria-live="polite">{statusBadge()}</div>
            <Button variant="ghost" size="sm" onClick={onLeave}>
              <LogOut size={14} /> {t('game.leave')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="flex flex-col xl:flex-row gap-6 p-4 pt-0 items-center xl:items-start">
        <ChessBoard
          board={board}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          lastMove={lastMove}
          onSquareClick={handleSquareClick}
        />

        <div className="flex-1 space-y-4 min-w-0">
          {/* Players */}
          <div className="space-y-2">
            <div className={`flex items-center gap-2 p-2 rounded-lg ${turn === 'w' && !isFinished ? 'bg-[var(--bg-secondary)]' : ''}`}>
              <span className="text-xl">♔</span>
              <span className="font-medium">{player1?.username || '?'}</span>
              {turn === 'w' && !isFinished && <span className="ml-auto text-xs text-[var(--text-secondary)]">●</span>}
            </div>
            <div className={`flex items-center gap-2 p-2 rounded-lg ${turn === 'b' && !isFinished ? 'bg-[var(--bg-secondary)]' : ''}`}>
              <span className="text-xl">♚</span>
              <span className="font-medium">{player2?.username || '?'}</span>
              {turn === 'b' && !isFinished && <span className="ml-auto text-xs text-[var(--text-secondary)]">●</span>}
            </div>
          </div>

          {/* Move history */}
          {engine.history && engine.history.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">{t('chess.moveHistory')}</p>
              <div className="max-h-48 overflow-y-auto text-sm font-mono bg-[var(--bg-secondary)] rounded-lg p-2 space-y-0.5">
                {Array.from({ length: Math.ceil(engine.history.length / 2) }, (_, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-[var(--text-secondary)] w-6 text-right">{i + 1}.</span>
                    <span className="w-16">{engine.history[i * 2]}</span>
                    <span className="w-16 text-[var(--text-secondary)]">{engine.history[i * 2 + 1] || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isFinished && (
            <div className="flex gap-2">
              <Button size="sm" onClick={onRematch}>
                <RefreshCw size={14} /> {t('game.rematch')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal open={!!promotionPending} onClose={() => setPromotionPending(null)} title={t('chess.promote')}>
        <div className="grid grid-cols-4 gap-3">
          {PROMOTION_PIECES.map(({ piece, white, black }) => (
            <button
              key={piece}
              onClick={() => handlePromotion(piece)}
              className="flex items-center justify-center text-5xl p-4 rounded-xl hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
            >
              {myColor === 'w' ? white : black}
            </button>
          ))}
        </div>
      </Modal>
    </Card>
  );
}

export function ChessGame() {
  const t = useT();

  return (
    <GameLobby
      gameType="chess"
      gameTitle={t('chess.title')}
      icon={Crown}
      minPlayers={2}
      maxPlayers={2}
    >
      {(props) => <ChessOnline {...props} />}
    </GameLobby>
  );
}
