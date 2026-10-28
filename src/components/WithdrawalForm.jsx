import { useState } from 'react'
import { calcFundedLedger, validateWithdrawal, fechaToInput, inputToFecha } from '../lib/metrics'

const todayFecha = () => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const money = n => '$' + Math.round(n).toLocaleString('es-AR')

// Único formulario para registrar retiros. El monto es lo COBRADO (tu parte). El % del capital se calcula solo.
export default function WithdrawalForm({ ctx, defaultCid = '' }) {
  const { accounts, trades, withdrawals, addWithdrawal, toast } = ctx
  const funded = accounts.filter(a => a.type === 'funded')
  const [f, setF] = useState({ cid: defaultCid, fecha: todayFecha(), usd: '', nota: '' })
  const [saving, setSaving] = useState(false)

  const ledger = calcFundedLedger(trades, accounts, withdrawals)
  const row = ledger.rows.find(r => String(r.a.id) === String(f.cid))
  const { errors, warnings } = validateWithdrawal(f, accounts, withdrawals, ledger)
  const usd = parseFloat(f.usd) || 0
  const showErrors = f.usd !== '' || f.cid !== ''

  async function save() {
    if (errors.length) { toast(errors[0], 'err'); return }
    if (warnings.length && !confirm(warnings.join('\n') + '\n\n¿Guardar igual?')) return
    setSaving(true)
    try {
      await addWithdrawal(String(f.cid), { id: Date.now(), fecha: f.fecha, usd, pct: parseFloat((usd / (row?.cap || 1) * 100).toFixed(3)), nota: f.nota })
      toast('✓ Retiro registrado', 'ok')
      setF(p => ({ ...p, usd: '', nota: '' }))
    } catch (e) { toast('Error: ' + e.message, 'err') }
    setSaving(false)
  }

  return (
    <div className="card">
      <div className="card-title">Registrar retiro</div>
      <div className="g2">
        <div className="fg"><label className="fl">Cuenta fondeada</label>
          <select className="fi" value={f.cid} onChange={e => setF(p => ({ ...p, cid: e.target.value }))}>
            <option value="">Seleccioná cuenta</option>
            {funded.map(a => <option key={a.id} value={a.id}>{a.nombre} · {money(a.capital || 0)} · {a.firma}</option>)}
          </select>
        </div>
        <div className="fg"><label className="fl">Fecha del cobro</label>
          <input className="fi" type="date" value={fechaToInput(f.fecha)} max={fechaToInput(todayFecha())} onChange={e => setF(p => ({ ...p, fecha: inputToFecha(e.target.value) }))} />
        </div>
      </div>
      <div className="g2">
        <div className="fg"><label className="fl">Monto cobrado en $ (tu parte, ya con el split)</label>
          <input className="fi" type="number" min="0" step="1" value={f.usd} onChange={e => setF(p => ({ ...p, usd: e.target.value }))} placeholder="Ej: 480" />
        </div>
        <div className="fg"><label className="fl">Nota (opcional)</label>
          <input className="fi" value={f.nota} onChange={e => setF(p => ({ ...p, nota: e.target.value }))} placeholder="Payout mensual, ID de pago..." />
        </div>
      </div>

      {row && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, margin: '4px 0 12px' }}>
          {[
            ['Ciclo actual (bruto)', money(row.ciclo)],
            [`Tu parte (${row.split}%)`, money(Math.max(0, row.ciclo) * row.split / 100)],
            ['Ya cobrado (total)', money(row.cobrado)],
            ['Pendiente', money(row.pendiente)],
          ].map(([l, v]) => (
            <div key={l} style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{l}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: l === 'Pendiente' ? 'var(--gold)' : 'var(--text)' }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {row && usd > 0 && <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 8 }}>Equivale a {(usd / row.cap * 100).toFixed(2)}% del capital de la cuenta. Quedaría pendiente {money(Math.max(0, row.pendiente - usd))}.</div>}
      {showErrors && errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: 'var(--red)', marginBottom: 4 }}>✕ {e}</div>)}
      {warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 4 }}>⚠ {w}</div>)}
      <button className="btn btn-gold btn-full" onClick={save} disabled={saving || errors.length > 0}>{saving ? 'Guardando...' : 'Registrar retiro'}</button>
    </div>
  )
}
