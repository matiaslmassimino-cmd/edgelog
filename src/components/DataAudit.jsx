import { useState } from 'react'
import { auditData } from '../lib/metrics'

const COL = { error: 'var(--red)', warn: 'var(--amber)', info: 'var(--text3)' }
const LBL = { error: 'Corregir', warn: 'Revisar', info: 'Info' }

// Panel de calidad de datos: muestra cargas que distorsionan las métricas y permite corregir los % de retiros.
export default function DataAudit({ ctx, areas = null, title = 'Calidad de los datos' }) {
  const { trades, accounts, withdrawals, editWithdrawal, toast } = ctx
  const [busy, setBusy] = useState(false)
  const all = auditData(trades, accounts, withdrawals)
  const issues = areas ? all.filter(i => areas.includes(i.area)) : all
  const fixable = issues.filter(i => i.fixPct !== undefined)
  const errs = issues.filter(i => i.sev === 'error').length

  async function fixAll() {
    setBusy(true)
    try {
      for (const i of fixable) await editWithdrawal(i.wid, { pct: i.fixPct })
      toast(`✓ ${fixable.length} porcentaje(s) corregido(s)`, 'ok')
    } catch (e) { toast('Error: ' + e.message, 'err') }
    setBusy(false)
  }

  return (
    <div className="card" style={{ marginBottom: 16, borderColor: errs ? 'var(--red)' : undefined }}>
      <div className="card-title">{title}</div>
      {issues.length === 0
        ? <div style={{ fontSize: 12.5, color: 'var(--green)' }}>✓ Sin problemas: las cargas son consistentes con las métricas.</div>
        : (<>
          {issues.map((i, k) => (
            <div key={k} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: k < issues.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12.5, color: 'var(--text2)' }}>
              <span style={{ color: COL[i.sev], fontWeight: 600, minWidth: 62 }}>{LBL[i.sev]}</span>
              <span>{i.msg}</span>
            </div>
          ))}
          {fixable.length > 0 && <button className="btn btn-gold btn-sm" style={{ marginTop: 10 }} disabled={busy} onClick={fixAll}>{busy ? 'Corrigiendo…' : `Corregir ${fixable.length} % de retiros automáticamente (monto ÷ capital)`}</button>}
        </>)}
    </div>
  )
}
