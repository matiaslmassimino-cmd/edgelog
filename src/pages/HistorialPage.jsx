import { useState } from 'react'
import { isQuality } from '../lib/metrics'

const DIRS = ['—', 'Compra', 'Venta']

function nextDir(cur) {
  const idx = DIRS.indexOf(cur || '—')
  return DIRS[(idx + 1) % DIRS.length]
}

function Badge({ children, color = 'slate' }) {
  return <span className={`bdg ${color}`}>{children}</span>
}

export default function HistorialPage({ ctx }) {
  const { trades, removeTrade, editTrade, toast } = ctx
  const [filters, setFilters] = useState({ cuenta: '', resultado: '', plan: '', quality: '' })
  const [search, setSearch] = useState('')

  const cuentas = [...new Set(trades.map(t => t.c_nombre).filter(Boolean))].sort()

  const filtered = trades.filter(t => {
    if (filters.cuenta && t.c_nombre !== filters.cuenta) return false
    if (filters.resultado && t.resultado !== filters.resultado) return false
    if (filters.plan && t.plan !== filters.plan) return false
    if (filters.quality === 'yes' && !isQuality(t)) return false
    if (filters.quality === 'no' && isQuality(t)) return false
    if (search && !`${t.fecha} ${t.c_nombre} ${t.resultado} ${t.plan} ${t.nota}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function handleToggleDir(id, cur) {
    const dir = nextDir(cur)
    try { await editTrade(id, { direccion: dir }); toast(`Dirección: ${dir}`, 'info') }
    catch (e) { toast('Error: ' + e.message, 'err') }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta entrada?')) return
    try { await removeTrade(id); toast('Entrada eliminada', 'info') }
    catch (e) { toast('Error: ' + e.message, 'err') }
  }

  const sel = {
    padding: '7px 11px', borderRadius: 8, border: '1px solid var(--border2)',
    background: 'var(--bg3)', color: 'var(--text)', fontSize: 12.5, outline: 'none'
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Historial de <em>entradas</em></div>
          <div className="page-sub">{filtered.length} de {trades.length} entradas</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input style={{ ...sel, minWidth: 180 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={sel} value={filters.cuenta} onChange={e => setFilters(p => ({ ...p, cuenta: e.target.value }))}>
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
        {(Object.values(filters).some(Boolean) || search) && (
          <button className="btn btn-sm" onClick={() => { setFilters({ cuenta: '', resultado: '', plan: '', quality: '' }); setSearch('') }}>✕ Limpiar</button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && <div className="empty"><div className="empty-icon">▸</div><p>Sin entradas que coincidan.</p></div>}
        {filtered.map(t => {
          const q = isQuality(t)
          const dotColor = t.resultado === 'Win' ? 'var(--green)' : t.resultado === 'Loss' ? 'var(--red)' : 'var(--amber)'
          const resBadge = t.resultado === 'Win' ? 'green' : t.resultado === 'Loss' ? 'red' : 'amber'
          const planBadge = t.plan === '100% exacto' ? 'green' : t.plan === 'Parcialmente' ? 'amber' : 'red'
          return (
            <div key={t.id} className="entry">
              <div className="entry-dot" style={{ background: dotColor }} />
              <div className="entry-body">
                <div className="entry-top">
                  <span className="entry-date">{t.fecha}</span>
                  <Badge color="forest">{t.c_nombre}</Badge>
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
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
