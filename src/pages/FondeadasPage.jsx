import { useState } from 'react'
import { calcFundedLedger, validateWithdrawal, fechaToInput, inputToFecha } from '../lib/metrics'
import WithdrawalForm from '../components/WithdrawalForm'
import DataAudit from '../components/DataAudit'

const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-AR')
const todayFecha = () => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const sortKey = f => (f || '').split('/').reverse().join('-')

export default function FondeadasPage({ ctx }) {
  const { accounts, trades, withdrawals, removeWithdrawal, editWithdrawal, toast } = ctx
  const funded = accounts.filter(a => a.type === 'funded')
  const [edit, setEdit] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!funded.length) return (
    <div>
      <div className="page-header"><div className="page-title">Retiros y <em>fondeo</em></div></div>
      <div className="empty"><div className="empty-icon">$</div><p>Sin cuentas fondeadas aún.</p></div>
    </div>
  )

  const L = calcFundedLedger(trades, accounts, withdrawals)
  const all = funded.flatMap(a => (withdrawals[String(a.id)] || []).map(w => ({ ...w, acc: a })))
  const chrono = [...all].sort((a, b) => sortKey(a.fecha) < sortKey(b.fecha) ? -1 : sortKey(a.fecha) > sortKey(b.fecha) ? 1 : (a.id || 0) - (b.id || 0))
  let run = 0
  const withCum = chrono.map(w => ({ ...w, cum: (run += (w.usd || 0)) }))
  const list = [...withCum].reverse()

  async function saveEdit() {
    const w = edit
    const wd = { cid: w.cid, fecha: w.fecha, usd: w.usd }
    const { errors, warnings } = validateWithdrawal(wd, accounts, withdrawals, L, w.id)
    if (errors.length) { toast(errors[0], 'err'); return }
    if (warnings.length && !confirm(warnings.join('\n') + '\n\n¿Guardar igual?')) return
    const acc = accounts.find(a => String(a.id) === String(w.cid))
    setSaving(true)
    try {
      await editWithdrawal(w.id, { account_id: String(w.cid), fecha: w.fecha, usd: parseFloat(w.usd), pct: parseFloat((parseFloat(w.usd) / (acc?.capital || 1) * 100).toFixed(3)), nota: w.nota || '' })
      toast('✓ Retiro actualizado', 'ok'); setEdit(null)
    } catch (e) { toast('Error: ' + e.message, 'err') }
    setSaving(false)
  }

  const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)' }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Retiros y <em>fondeo</em></div>
        <div className="page-sub">Lo que generaste, lo que cobraste y lo que te falta cobrar en cada cuenta fondeada.</div>
      </div>

      <DataAudit ctx={ctx} areas={['retiros', 'cuentas']} title="Control de datos de retiros" />

      <div className="kpi-grid kpi-grid-4" style={{ marginBottom: 16 }}>
        <div className="kpi dark"><div className="kl">Cobrado en total</div><div className="kv" style={{ color: 'var(--gold)' }}>{money(L.cobrado)}</div><div className="ks">{L.nWd} retiro{L.nWd !== 1 ? 's' : ''} · {(L.capital ? L.cobrado / L.capital * 100 : 0).toFixed(2)}% del capital</div></div>
        <div className="kpi"><div className="kl">Pendiente por cobrar</div><div className="kv" style={{ color: L.pendiente > 0 ? 'var(--accent2)' : 'var(--text3)' }}>{money(L.pendiente)}</div><div className="ks">tu parte − lo ya cobrado</div></div>
        <div className="kpi"><div className="kl">Ganancia bruta generada</div><div className={`kv ${L.gross >= 0 ? 'pos' : 'neg'}`}>{money(L.gross)}</div><div className="ks">antes del split · {(L.capital ? L.gross / L.capital * 100 : 0).toFixed(2)}% sobre {money(L.capital)}</div></div>
        <div className="kpi"><div className="kl">Tu parte (según split)</div><div className="kv">{money(L.miParte)}</div><div className="ks">cobrado + pendiente ≈ {money(L.cobrado + L.pendiente)}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16, alignItems: 'start' }}>
        <WithdrawalForm ctx={ctx} />
        <div className="card">
          <div className="card-title">Estado por cuenta</div>
          <table style={{ width: '100%', fontSize: 12.5 }}>
            <thead><tr style={{ color: 'var(--text3)', textAlign: 'right' }}><th style={{ textAlign: 'left' }}>Cuenta</th><th>Bruta</th><th>Tu parte</th><th>Cobrado</th><th>Pendiente</th></tr></thead>
            <tbody>
              {L.rows.map(r => (
                <tr key={r.a.id} style={{ textAlign: 'right' }}>
                  <td style={{ textAlign: 'left', padding: '7px 0' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{r.a.nombre}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{money(r.cap)} · {r.a.firma} · split {r.a.split || '80/20'} · {r.n} trades</div>
                  </td>
                  <td style={{ color: r.gross >= 0 ? 'var(--green)' : 'var(--red)' }}>{money(r.gross)}</td>
                  <td>{money(r.miParte)}</td>
                  <td>{money(r.cobrado)}</td>
                  <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{money(r.pendiente)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 10, lineHeight: 1.6 }}>
            Pendiente = ganancia bruta × tu split − lo que ya cobraste. Si una firma te paga distinto (reglas de consistencia, comisiones), vas a ver la diferencia acá.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Historial de retiros</div>
        {list.length === 0
          ? <div className="empty"><p>Todavía no registraste retiros.</p></div>
          : (
            <table style={{ width: '100%', fontSize: 12.5 }}>
              <thead><tr style={{ color: 'var(--text3)', textAlign: 'right' }}><th style={{ textAlign: 'left' }}>Fecha</th><th style={{ textAlign: 'left' }}>Cuenta</th><th>Cobrado</th><th>% capital</th><th>Acumulado</th><th style={{ textAlign: 'left', paddingLeft: 12 }}>Nota</th><th /></tr></thead>
              <tbody>
                {list.map(w => (
                  <tr key={w.id} style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>
                    <td style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>{w.fecha}</td>
                    <td style={{ textAlign: 'left' }}>{w.acc.nombre}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{money(w.usd || 0)}</td>
                    <td>{((w.usd || 0) / (w.acc.capital || 1) * 100).toFixed(2)}%</td>
                    <td style={{ color: 'var(--text3)' }}>{money(w.cum)}</td>
                    <td style={{ textAlign: 'left', paddingLeft: 12, color: 'var(--text3)' }}>{w.nota || ''}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm" title="Editar" onClick={() => setEdit({ id: w.id, cid: String(w.acc.id), fecha: w.fecha, usd: w.usd, nota: w.nota || '' })}>✎</button>{' '}
                      <button className="btn btn-sm btn-danger" title="Eliminar" onClick={async () => { if (!confirm('¿Eliminar este retiro?')) return; try { await removeWithdrawal(w.id); toast('Retiro eliminado', 'info') } catch (e) { toast(e.message, 'err') } }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {edit && (
        <div className="modal-bg" onClick={() => !saving && setEdit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Editar retiro</div>
            <div className="modal-sub">El % del capital se recalcula solo.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={lbl}>Cuenta<select className="fi" value={edit.cid} onChange={e => setEdit(p => ({ ...p, cid: e.target.value }))}>{funded.map(a => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}</select></label>
              <label style={lbl}>Fecha<input className="fi" type="date" value={fechaToInput(edit.fecha)} max={fechaToInput(todayFecha())} onChange={e => setEdit(p => ({ ...p, fecha: inputToFecha(e.target.value) }))} /></label>
              <label style={lbl}>Monto cobrado ($)<input className="fi" type="number" min="0" value={edit.usd} onChange={e => setEdit(p => ({ ...p, usd: e.target.value }))} /></label>
              <label style={lbl}>Nota<input className="fi" value={edit.nota} onChange={e => setEdit(p => ({ ...p, nota: e.target.value }))} /></label>
            </div>
            <div className="modal-actions">
              <button className="btn" disabled={saving} onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn btn-main" disabled={saving} onClick={saveEdit}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
