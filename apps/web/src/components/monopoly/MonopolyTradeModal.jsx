import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SPACES, PLAYER_COLORS } from './MonopolyData';
import { useT } from '../../lib/i18n';

export function MonopolyTradeModal({ open, onClose, engine, currentPlayerIndex, onPropose }) {
  const t = useT();
  const [targetPlayer, setTargetPlayer] = useState(null);
  const [selectedFrom, setSelectedFrom] = useState([]);
  const [selectedTo, setSelectedTo] = useState([]);
  const [moneyFrom, setMoneyFrom] = useState(0);
  const [moneyTo, setMoneyTo] = useState(0);
  const [jailCardsFrom, setJailCardsFrom] = useState(0);
  const [jailCardsTo, setJailCardsTo] = useState(0);

  if (!engine) return null;
  const from = engine.players[currentPlayerIndex];
  if (!from) return null;
  const otherPlayers = engine.players.filter(p => !p.bankrupt && p.index !== currentPlayerIndex);
  const to = targetPlayer !== null ? engine.players[targetPlayer] ?? null : null;

  const reset = () => {
    setSelectedFrom([]);
    setSelectedTo([]);
    setMoneyFrom(0);
    setMoneyTo(0);
    setJailCardsFrom(0);
    setJailCardsTo(0);
  };

  const handlePropose = () => {
    if (targetPlayer === null) return;
    onPropose(currentPlayerIndex, targetPlayer, {
      propertiesFrom: selectedFrom,
      propertiesTo: selectedTo,
      moneyFrom,
      moneyTo,
      jailCardsFrom,
      jailCardsTo,
    });
    reset();
  };

  const toggleProp = (list, setList, si) => {
    if (list.includes(si)) setList(list.filter(s => s !== si));
    else setList([...list, si]);
  };

  const canTradeProp = (playerIndex, si) => {
    const prop = engine.properties[si];
    return prop && prop.owner === playerIndex && prop.houses === 0;
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title={t('monopoly.tradeTitle')} className="max-w-3xl">
      {/* Target player selection */}
      {targetPlayer === null || to === null ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">{t('monopoly.selectTradePartner')}</p>
          <div className="flex flex-wrap gap-2">
            {otherPlayers.map(p => (
              <button
                key={p.index}
                onClick={() => setTargetPlayer(p.index)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[p.index] }} />
                <span className="text-sm font-medium">{t('monopoly.playerLabel', { n: p.index + 1 })}</span>
                <span className="text-xs text-[var(--text-secondary)]">({p.money}€)</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => { setTargetPlayer(null); reset(); }} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">
            ← {t('monopoly.changePartner')}
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* From column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[currentPlayerIndex] }} />
                <span className="text-sm font-medium">{t('monopoly.playerLabel', { n: currentPlayerIndex + 1 })} {t('monopoly.offers')}</span>
              </div>

              {/* Properties */}
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {from.properties.filter(si => canTradeProp(currentPlayerIndex, si)).map(si => (
                  <label key={si} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFrom.includes(si)}
                      onChange={() => toggleProp(selectedFrom, setSelectedFrom, si)}
                      className="rounded"
                    />
                    {SPACES[si].color && <div className="w-2 h-2 rounded" style={{ backgroundColor: SPACES[si].color }} />}
                    <span className="truncate">{SPACES[si].name}</span>
                  </label>
                ))}
                {from.properties.filter(si => canTradeProp(currentPlayerIndex, si)).length === 0 && (
                  <p className="text-xs text-[var(--text-secondary)]">{t('monopoly.noTradableProperties')}</p>
                )}
              </div>

              {/* Money */}
              <div className="flex items-center gap-2">
                <span className="text-xs">{t('monopoly.money')}:</span>
                <input
                  type="number"
                  min={0}
                  max={from.money}
                  value={moneyFrom}
                  onChange={e => setMoneyFrom(Math.min(from.money, Math.max(0, Number(e.target.value))))}
                  className="w-20 text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border)]"
                />
                <span className="text-xs text-[var(--text-secondary)]">/ {from.money}€</span>
              </div>

              {/* Jail free cards */}
              {from.jailFreeCards > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs">🃏</span>
                  <input
                    type="number"
                    min={0}
                    max={from.jailFreeCards}
                    value={jailCardsFrom}
                    onChange={e => setJailCardsFrom(Math.min(from.jailFreeCards, Math.max(0, Number(e.target.value))))}
                    className="w-12 text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border)]"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">/ {from.jailFreeCards}</span>
                </div>
              )}
            </div>

            {/* To column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[targetPlayer] }} />
                <span className="text-sm font-medium">{t('monopoly.playerLabel', { n: targetPlayer + 1 })} {t('monopoly.offers')}</span>
              </div>

              {/* Properties */}
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {to.properties.filter(si => canTradeProp(targetPlayer, si)).map(si => (
                  <label key={si} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTo.includes(si)}
                      onChange={() => toggleProp(selectedTo, setSelectedTo, si)}
                      className="rounded"
                    />
                    {SPACES[si].color && <div className="w-2 h-2 rounded" style={{ backgroundColor: SPACES[si].color }} />}
                    <span className="truncate">{SPACES[si].name}</span>
                  </label>
                ))}
                {to.properties.filter(si => canTradeProp(targetPlayer, si)).length === 0 && (
                  <p className="text-xs text-[var(--text-secondary)]">{t('monopoly.noTradableProperties')}</p>
                )}
              </div>

              {/* Money */}
              <div className="flex items-center gap-2">
                <span className="text-xs">{t('monopoly.money')}:</span>
                <input
                  type="number"
                  min={0}
                  max={to.money}
                  value={moneyTo}
                  onChange={e => setMoneyTo(Math.min(to.money, Math.max(0, Number(e.target.value))))}
                  className="w-20 text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border)]"
                />
                <span className="text-xs text-[var(--text-secondary)]">/ {to.money}€</span>
              </div>

              {/* Jail free cards */}
              {to.jailFreeCards > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs">🃏</span>
                  <input
                    type="number"
                    min={0}
                    max={to.jailFreeCards}
                    value={jailCardsTo}
                    onChange={e => setJailCardsTo(Math.min(to.jailFreeCards, Math.max(0, Number(e.target.value))))}
                    className="w-12 text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border)]"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">/ {to.jailFreeCards}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-end pt-2 border-t border-[var(--border)]">
            <Button variant="ghost" onClick={() => { reset(); onClose(); }}>
              {t('monopoly.cancel')}
            </Button>
            <Button
              onClick={handlePropose}
              disabled={selectedFrom.length === 0 && selectedTo.length === 0 && moneyFrom === 0 && moneyTo === 0 && jailCardsFrom === 0 && jailCardsTo === 0}
            >
              {t('monopoly.propose')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
