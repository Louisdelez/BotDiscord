import { useState } from 'react';
import { Castle, LogOut, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ShogiBoard } from './ShogiBoard';
import { GameLobby } from '../game/GameLobby';
import { useGameStore } from '../../stores/game';
import { useT } from '../../lib/i18n';

function ShogiOnline({ sessionState, myPlayer, isSpectator, isMyTurn, onLeave, onRematch }) {
  const t = useT();
  const sendAction = useGameStore((s) => s.sendAction);

  const [selectedSquare, setSelectedSquare] = useState(null);
  const [selectedHandPiece, setSelectedHandPiece] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [promotionPending, setPromotionPending] = useState(null);

  const engine = sessionState.engine;
  if (!engine) return null;

  const isFinished = sessionState.phase === 'finished';
  const getPlayerInfo = (num) => sessionState.players.find(p => p.playerNumber === num);
  const player1 = getPlayerInfo(1); // sente
  const player2 = getPlayerInfo(2); // gote

  const mySide = myPlayer?.playerNumber === 1 ? 'sente' : 'gote';

  const clearSelection = () => {
    setSelectedSquare(null);
    setSelectedHandPiece(null);
    setLegalMoves([]);
  };

  const handleSquareClick = (row, col) => {
    if (isSpectator || !isMyTurn || isFinished || promotionPending) return;

    const piece = engine.board[row][col];

    // If we have a hand piece selected and clicking a legal drop square
    if (selectedHandPiece && legalMoves.some(m => m.toRow === row && m.toCol === col)) {
      sendAction({ type: 'drop', pieceType: selectedHandPiece.type, row, col });
      setLastMove({ to: { row, col } });
      clearSelection();
      return;
    }

    // If we have a board piece selected and clicking a legal move square
    if (selectedSquare && legalMoves.some(m => m.toRow === row && m.toCol === col)) {
      const matchingMoves = legalMoves.filter(m => m.toRow === row && m.toCol === col);
      const canProm = matchingMoves.some(m => m.promote);
      const mustProm = matchingMoves.some(m => m.mustPromote);

      if (mustProm) {
        sendAction({ type: 'move', fromRow: selectedSquare.row, fromCol: selectedSquare.col, toRow: row, toCol: col, promote: true });
        setLastMove({ from: { ...selectedSquare }, to: { row, col } });
        clearSelection();
        return;
      }

      if (canProm) {
        setPromotionPending({ from: selectedSquare, to: { row, col } });
        return;
      }

      sendAction({ type: 'move', fromRow: selectedSquare.row, fromCol: selectedSquare.col, toRow: row, toCol: col, promote: false });
      setLastMove({ from: { ...selectedSquare }, to: { row, col } });
      clearSelection();
      return;
    }

    // If clicking own piece on board, select it (use legalMoves from server engine)
    if (piece && piece.owner === engine.turn) {
      // Request legal moves for this piece from server
      sendAction({ type: 'getLegalMoves', row, col });
      setSelectedSquare({ row, col });
      setSelectedHandPiece(null);
      // Legal moves will come back via engine state with a legalMoves field
      if (engine.legalMoves) {
        setLegalMoves(engine.legalMoves);
      }
      return;
    }

    clearSelection();
  };

  const handleHandPieceClick = (type, owner) => {
    if (isSpectator || !isMyTurn || isFinished || promotionPending) return;
    if (owner !== mySide) return;

    sendAction({ type: 'getLegalDrops', pieceType: type });
    setSelectedHandPiece({ type, owner });
    setSelectedSquare(null);
    if (engine.legalDrops) {
      setLegalMoves(engine.legalDrops);
    }
  };

  const handlePromotion = (promote) => {
    if (!promotionPending) return;
    const { from, to } = promotionPending;
    sendAction({ type: 'move', fromRow: from.row, fromCol: from.col, toRow: to.row, toCol: to.col, promote });
    setLastMove({ from, to });
    setPromotionPending(null);
    clearSelection();
  };

  const statusBadge = () => {
    if (engine.status === 'checkmate') {
      const winner = engine.turn === 'sente' ? player2 : player1;
      return <Badge variant="danger">{t('shogi.checkmate')} — {winner?.username}</Badge>;
    }
    if (engine.status === 'stalemate') return <Badge variant="warning">{t('shogi.stalemate')}</Badge>;
    if (engine.status === 'check') return <Badge variant="danger">{t('shogi.check')}</Badge>;
    if (isMyTurn) return <Badge variant="success">{t('game.yourTurn')}</Badge>;
    const currentInfo = engine.turn === 'sente' ? player1 : player2;
    return <Badge variant="info">{t('game.playerTurn', { player: currentInfo?.username })}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Castle size={20} /> {t('shogi.title')}</CardTitle>
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
        <ShogiBoard
          board={engine.board}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          lastMove={lastMove}
          senteHand={engine.hands?.sente || {}}
          goteHand={engine.hands?.gote || {}}
          turn={engine.turn}
          onSquareClick={handleSquareClick}
          onHandPieceClick={handleHandPieceClick}
          selectedHandPiece={selectedHandPiece}
        />

        <div className="flex-1 space-y-4 min-w-0">
          {/* Players */}
          <div className="space-y-2">
            <div className={`flex items-center gap-2 p-2 rounded-lg ${engine.turn === 'sente' && !isFinished ? 'bg-[var(--bg-secondary)]' : ''}`}>
              <span>☗</span>
              <span className="font-medium">{player1?.username || '?'}</span>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded-lg ${engine.turn === 'gote' && !isFinished ? 'bg-[var(--bg-secondary)]' : ''}`}>
              <span className="rotate-180 inline-block">☖</span>
              <span className="font-medium">{player2?.username || '?'}</span>
            </div>
          </div>

          {isFinished && (
            <div className="flex gap-2">
              <Button size="sm" onClick={onRematch}>
                <RefreshCw size={14} /> {t('game.rematch')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal open={!!promotionPending} onClose={() => setPromotionPending(null)} title={t('shogi.promote')}>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => handlePromotion(true)}>
            {t('shogi.promoteYes')}
          </Button>
          <Button variant="secondary" onClick={() => handlePromotion(false)}>
            {t('shogi.promoteNo')}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

export function ShogiGame() {
  const t = useT();

  return (
    <GameLobby
      gameType="shogi"
      gameTitle={t('shogi.title')}
      icon={Castle}
      minPlayers={2}
      maxPlayers={2}
    >
      {(props) => <ShogiOnline {...props} />}
    </GameLobby>
  );
}
