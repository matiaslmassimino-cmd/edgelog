import { useState } from 'react'
import { isQuality, calcMetrics, fmtR, isRealFecha, isFutureFecha } from '../lib/metrics'

const DIRS = ['—', 'Compra', 'Venta']

function nextDir(cur) {
  const idx = DIRS.indexOf(cur || '—')
  return DIRS[(idx + 1) % DIRS.length]
}

function Badge({ children, color = 'slate' }) {
  return <span className={`bdg ${color}`}>{children}</span>
}

export default function HistorialPage({ ctx }) {
  const { trades, accounts, removeTrade, editTrade, toast } = ctx
  const [filters, setFilters] = useState({ cuenta: '', resultado: '', plan: '', quality: '', tipo: '' })
  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(40)
  const [edit, setEdit] = useState(null)   // { id, ...campos }
  const [saving, setSaving] = useState(false)

  const fundedIds = new Set(accounts.filter(a => a.type === 'funded').map(a => String(a.id)))
  const cuentas = [...new Set(trades.map(t => t.c_nombre).filter(Boolean))].sort()

  const sorted = [...trades].sort((a, b) => {
    const da = a.fecha?.split('/').reverse().join('-') || ''
    const db = b.fecha?.split('/').reverse().join('-') || ''
    return db > da ? 1 : db < da ? -1 : 0
  })

  const filtered = sorted.filter(t => {
    if (filters.tipo === 'funded' && !fundedIds.has(String(t.cid))) return false
    if (filters.tipo === 'challenge' && fundedIds.has(String(t.cid))) return false
    if (filters.cuenta && t.c_nombre !== filters.cuenta) return false
    if (filters.resultado && t.resultado !== filters.resultado) return false
    if (filters.plan && t.plan !== filters.plan) return false
    if (filters.quality === 'yes' && !isQuality(t)) return false
    if (filters.quality === 'no' && isQuality(t)) return false
    if (search && !`${t.fecha} ${t.c_nombre} ${t.resultado} ${t.plan} ${t.nota}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredMetrics = calcMetrics(filtered.filter(t => ['Win','Loss','Breakeven'].includes(t.resultado)))
  const hasFilters = Object.values(filters).some(Boolean) || search

  async function handleToggleDir(id, cur) {
    const dir = nextDir(cur)
    try { await editTrade(id, { direccion: dir }); toast(`Dirección: ${dir}`, 'info') }
    catch (e) { toast('Error: ' + e.message, 'err') }
  }

  function openEdit(t) {
    setEdit({
      id: t.id, fecha: t.fecha || '', cid: String(t.cid || ''), resultado: t.resultado || 'Loss',
      risk: t.risk || '', rr_real: t.rr_real ?? '', plan: t.plan || '—', direccion: t.direccion || '—',
      emo: t.emo || '—', sob: t.sob || '—', nota: t.nota || '',
      _orig: { resultado: t.resultado, risk: t.risk, rr_real: t.rr_real }
    })
  }

  async function saveEdit() {
    const e = edit
    if (!isRealFecha(e.fecha)) { toast('Fecha inválida (DD/MM/AAAA)', 'err'); return }
    if (isFutureFecha(e.fecha)) { toast('La fecha es futura', 'err'); return }
    if (e.resultado === 'Win' && !(parseFloat(e.rr_real) > 0)) { toast('Un ganador necesita R:R real mayor a 0', 'err'); return }
    const rp = parseFloat(e.risk)
    if (!rp) { toast('Riesgo inválido (ej: 1% o 2%)', 'err'); return }
    const rr = parseFloat(e.rr_real) || 0
    const acc = accounts.find(a => String(a.id) === e.cid)
    const o = e._orig
    const changedR = e.resultado !== o.resultado || e.risk !== o.risk || String(e.rr_real) !== String(o.rr_real ?? '')
    const updates = {
      fecha: e.fecha, resultado: e.resultado, risk: e.risk, rp, rr_real: rr,
      plan: e.plan, direccion: e.direccion, emo: e.emo, sob: e.sob, nota: e.nota
    }
    if (acc) Object.assign(updates, { cid: String(acc.id), c_nombre: acc.nombre, c_tipo: acc.type, firma: acc.firma || '' })
    // El P&L en % solo se recalcula si cambió resultado, riesgo o R:R (si no, se respeta el valor cargado).
    if (changedR) updates.r_pnl = e.resultado === 'Win' ? parseFloat((rp * rr).toFixed(4)) : e.resultado === 'Loss' ? -rp : 0
    setSaving(true)
    try { await editTrade(e.id, updates); toast('✓ Entrada actualizada', 'ok'); setEdit(null) }
    catch (err) { toast('Error: ' + err.message, 'err') }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta entrada?')) return
    try { await removeTrade(id); toast('Entrada eliminada', 'info') }
    catch (e) { toast('Error: ' + e.message, 'err') }
  }

  const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)' }
  const sel = {
    padding: '7px 11px', borderRadius: 8, border: '1px solid var(--border2)',
    background: 'var(--bg3)', color: 'var(--text)', fontSize: 12.5, outline: 'none'
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Historial de <em>entradas</em></div>
          <div className="page-sub">{filtered.length} de {trades.length} entradas · más recientes primero</div>
        </div>
      </div>

      {/* Filtro rápido por tipo */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[
          { v: '', label: 'Todas' },
          { v: 'funded', label: '◆ Solo fondeadas' },
          { v: 'challenge', label: '⚡ Solo challenges' },
        ].map(opt => (
          <button key={opt.v}
            className={`btn btn-sm ${filters.tipo === opt.v ? 'btn-main' : ''}`}
            onClick={() => setFilters(p => ({ ...p, tipo: opt.v, cuenta: '' }))}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filtros detallados */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <input style={{ ...sel, minWidth: 180 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={sel} value={filters.cuenta} onChange={e => setFilters(p => ({ ...p, cuenta: e.target.value, tipo: '' }))}>
          <option value="">Todas las cuentas</option>
          {cuentas.map(c => <option key={c}>{c}</option>)}
        </select>
        <select style={sel} value={filters.resultado} onChange={e => setFilters(p => ({ ...p, resultado: e.target.value }))}>
          <option value="">Todos los resultados</option>
          {['Win', 'Loss', 'Breakeven'].map(r => <option key={r}>{r}</option>)}
        </select>
        <select style={sel} value={filters.plan} onChange={e => setFilters(p => ({ ...p, plan: e.target.value }))}>
          <option value="">Todos los planes</option>
          {['100% exacto', 'Parcialmente', 'No cumplía'].map(r => <option key={r}>{r}</option>)}
        </select>
        <select style={sel} value={filters.quality} onChange={e => setFilters(p => ({ ...p, quality: e.target.value }))}>
          <option value="">Calidad: todos</option>
          <option value="yes">✦ Disciplinados</option>
          <option value="no">⚠ Fuera de plan</option>
        </select>
        {hasFilters && (
          <button className="btn btn-sm" onClick={() => { setFilters({ cuenta: '', resultado: '', plan: '', quality: '', tipo: '' }); setSearch('') }}>✕ Limpiar</button>
        )}
      </div>

      {/* Resumen filtrado */}
      {hasFilters && filtered.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{filtered.length} trades</span>
          <span style={{ fontSize: 12, color: filteredMetrics.wr >= 50 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>WR: {filteredMetrics.wr !== null ? filteredMetrics.wr + '%' : '—'}</span>
          <span style={{ fontSize: 12, color: filteredMetrics.rSum >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>R: {fmtR(filteredMetrics.rSum, 1)}</span>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{filteredMetrics.w}W · {filteredMetrics.l}L</span>
          {filteredMetrics.avgRR && <span style={{ fontSize: 12, color: 'var(--text2)' }}>R:R: 1:{filteredMetrics.avgRR.toFixed(1)}</span>}
        </div>
      )}

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && <div className="empty"><div className="empty-icon">▸</div><p>Sin entradas que coincidan.</p></div>}
        {filtered.slice(0, shown).map(t => {
          const q = isQuality(t)
          const isFunded = fundedIds.has(String(t.cid))
          const dotColor = t.resultado === 'Win' ? 'var(--green)' : t.resultado === 'Loss' ? 'var(--red)' : 'var(--amber)'
          const resBadge = t.resultado === 'Win' ? 'green' : t.resultado === 'Loss' ? 'red' : 'amber'
          const planBadge = t.plan === '100% exacto' ? 'green' : t.plan === 'Parcialmente' ? 'amber' : 'red'
          return (
            <div key={t.id} className="entry" style={{ borderLeft: isFunded ? '2px solid var(--gold)' : undefined }}>
              <div className="entry-dot" style={{ background: dotColor }} />
              <div className="entry-body">
                <div className="entry-top">
                  <span className="entry-date">{t.fecha}</span>
                  <Badge color="forest">{t.c_nombre}</Badge>
                  {isFunded && <Badge color="gold">◆</Badge>}
                  <Badge color={resBadge}>{t.resultado}</Badge>
                  <Badge color={planBadge}>{t.plan}</Badge>
                  {t.r_pnl !== 0 && <Badge color={t.r_pnl > 0 ? 'green' : 'red'}>{t.r_pnl > 0 ? '+' : ''}{t.r_pnl?.toFixed(2)}%</Badge>}
                  {t.direccion && t.direccion !== '—' && (
                    <Badge color={t.direccion === 'Compra' ? 'green' : 'red'}>{t.direccion === 'Compra' ? '▲' : '▼'} {t.direccion}</Badge>
                  )}
                  <span className={`entry-qual ${q ? 'ok' : 'bad'}`}>{q ? '✦' : '⚠'}</span>
                </div>
                <div className="entry-meta">{t.par} · {t.tmp} · Riesgo: {t.risk} · R:{t.rr_real || t.rr || '—'} · {t.emo} · {t.sob}</div>
                <div style={{ marginTop: 6 }}>
                  <button className="btn btn-sm" style={{ fontSize: 10.5, padding: '3px 10px' }} onClick={() => handleToggleDir(t.id, t.direccion)}>
                    {t.direccion && t.direccion !== '—' ? '↻ Cambiar dir.' : '+ Marcar dirección'}
                  </button>
                </div>
                {t.nota && <div className="entry-note">{t.nota}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-sm" title="Editar" onClick={() => openEdit(t)}>✎</button>
                <button className="btn btn-sm btn-danger" title="Eliminar" onClick={() => handleDelete(t.id)}>✕</button>
              </div>
            </div>
          )
        })}
        {filtered.length > shown && (
          <button className="btn" style={{ alignSelf: 'center', marginTop: 8 }} onClick={() => setShown(n => n + 40)}>Mostrar más ({filtered.length - shown} restantes)</button>
        )}
      </div>
      {edit && (
        <div className="modal-bg" onClick={() => !saving && setEdit(null)}>
          <div className="modal" style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Editar entrada</div>
            <div className="modal-sub">Corregí lo que cargaste mal. El P&L se recalcula si cambiás resultado, riesgo o R:R real.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={lbl}>Fecha (DD/MM/AAAA)<input style={sel} value={edit.fecha} onChange={e => setEdit(p => ({ ...p, fecha: e.target.value }))} /></label>
              <label style={lbl}>Cuenta<select style={sel} value={edit.cid} onChange={e => setEdit(p => ({ ...p, cid: e.target.value }))}>
                {!accounts.some(a => String(a.id) === edit.cid) && <option value={edit.cid}>{edit.cid || '—'} (actual)</option>}
                {accounts.map(a => <option key={a.id} value={String(a.id)}>{a.nombre} — {a.firma}</option>)}
              </select></label>
              <label style={lbl}>Resultado<select style={sel} value={edit.resultado} onChange={e => setEdit(p => ({ ...p, resultado: e.target.value }))}>
                {['Win', 'Loss', 'Breakeven'].map(r => <option key={r}>{r}</option>)}</select></label>
              <label style={lbl}>Riesgo<select style={sel} value={edit.risk} onChange={e => setEdit(p => ({ ...p, risk: e.target.value }))}>
                {[...new Set(['0.5%', '1%', '1.5%', '2%', '2.5%', '3%', edit.risk].filter(Boolean))].map(r => <option key={r}>{r}</option>)}</select></label>
              <label style={lbl}>R:R real<input style={sel} type="number" step="0.1" value={edit.rr_real} onChange={e => setEdit(p => ({ ...p, rr_real: e.target.value }))} /></label>
              <label style={lbl}>Dirección<select style={sel} value={edit.direccion} onChange={e => setEdit(p => ({ ...p, direccion: e.target.value }))}>
                {['—', 'Compra', 'Venta'].map(r => <option key={r}>{r}</option>)}</select></label>
              <label style={lbl}>Plan<select style={sel} value={edit.plan} onChange={e => setEdit(p => ({ ...p, plan: e.target.value }))}>
                {[...new Set(['100% exacto', 'Parcialmente', 'No cumplía', edit.plan])].map(r => <option key={r}>{r}</option>)}</select></label>
              <label style={lbl}>Emoción<select style={sel} value={edit.emo} onChange={e => setEdit(p => ({ ...p, emo: e.target.value }))}>
                {[...new Set(['—', 'Calmo', 'Ansioso', 'FOMO', 'Revenge', edit.emo])].map(r => <option key={r}>{r}</option>)}</select></label>
            </div>
            <label style={{ ...lbl, marginTop: 10 }}>Nota<textarea style={{ ...sel, width: '100%', minHeight: 60 }} value={edit.nota} onChange={e => setEdit(p => ({ ...p, nota: e.target.value }))} /></label>
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
