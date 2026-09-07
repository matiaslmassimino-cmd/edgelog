
import { useState } from 'react'

const DIRS = ['—', 'Compra', 'Venta']

export default function TradeHistory({ trades, accounts, onDelete, onToggleDir }) {
  const [filter, setFilter] = useState({ cuenta: '', resultado: '', plan: '' })

  const filtered = trades.filter(t => {
    if (filter.cuenta && t.cid != filter.cuenta) return false
    if (filter.resultado && t.resultado !== filter.resultado) return false
    if (filter.plan && t.plan !== filter.plan) return false
    return true
  })

  const cuentas = [...new Set(trades.map(t => t.c_nombre))].sort()

  function isQuality(t) {
    return (t.plan === '100% exacto' || t.plan === 'Parcialmente') &&
      t.emo === 'Calmo' && t.sob !== 'Sí, cedí' && t.opero !== 'Sobreoperé'
  }

  function nextDir(cur) {
    const idx = DIRS.indexOf(cur || '—')
    return DIRS[(idx + 1) % DIRS.length]
  }

  return (
    <div>
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #E3DDD1' }}>
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 27, color: '#1C3D3A' }}>
          Historial de <em style={{ color: '#3A7068', fontStyle: 'italic' }}>entradas</em>
        </div>
        <div style={{ fontSize: 12, color: '#607472', marginTop: 5 }}>{filtered.length} entradas</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <select style={sel} value={filter.cuenta} onChange={e => setFilter(p => ({ ...p, cuenta: e.target.value }))}>
          <option value="">Todas las cuentas</option>
          {cuentas.map(c => <option key={c} value={trades.find(t => t.c_nombre === c)?.cid}>{c}</option>)}
        </select>
        <select style={sel} value={filter.resultado} onChange={e => setFilter(p => ({ ...p, resultado: e.target.value }))}>
          <option value="">Todos los resultados</option>
          {['Win', 'Loss', 'Breakeven'].map(r => <option key={r}>{r}</option>)}
        </select>
        <select style={sel} value={filter.plan} onChange={e => setFilter(p => ({ ...p, plan: e.target.value }))}>
          <option value="">Todos los planes</option>
          {['100% exacto', 'Parcialmente', 'No cumplía'].map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(t => {
          const q = isQuality(t)
          const res = t.resultado
          const dotColor = res === 'Win' ? '#1A7A4A' : res === 'Loss' ? '#B83232' : '#A86010'
          const dirColor = t.direccion === 'Compra' ? '#1A7A4A' : t.direccion === 'Venta' ? '#B83232' : '#8AA09E'
          return (
            <div key={t.id} style={{ background: '#fff', border: '1px solid #E3DDD1', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(28,61,58,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Dot */}
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 5 }} />
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1C3D3A' }}>{t.fecha}</span>
                    <Badge bg="#FEF3E2" border="#F5D49A" color="#A86010">{t.c_nombre}</Badge>
                    <Badge bg={res === 'Win' ? '#E6F5ED' : res === 'Loss' ? '#FDECEA' : '#FEF3E2'}
                      border={res === 'Win' ? '#B8E0CB' : res === 'Loss' ? '#F5C3C3' : '#F5D49A'}
                      color={res === 'Win' ? '#1A7A4A' : res === 'Loss' ? '#B83232' : '#A86010'}>{res}</Badge>
                    <Badge bg={t.plan === '100% exacto' ? '#E6F5ED' : t.plan === 'Parcialmente' ? '#FEF3E2' : '#FDECEA'}
                      border={t.plan === '100% exacto' ? '#B8E0CB' : t.plan === 'Parcialmente' ? '#F5D49A' : '#F5C3C3'}
                      color={t.plan === '100% exacto' ? '#1A7A4A' : t.plan === 'Parcialmente' ? '#A86010' : '#B83232'}>{t.plan}</Badge>
                    {t.r_pnl !== 0 && <Badge bg={t.r_pnl > 0 ? '#E6F5ED' : '#FDECEA'}
                      border={t.r_pnl > 0 ? '#B8E0CB' : '#F5C3C3'}
                      color={t.r_pnl > 0 ? '#1A7A4A' : '#B83232'}>{t.r_pnl > 0 ? '+' : ''}{t.r_pnl?.toFixed(2)}%</Badge>}
                    <span style={{ fontSize: 12, color: q ? '#1A7A4A' : '#B83232' }}>{q ? '✦' : '⚠'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#8AA09E' }}>
                    {t.par} · {t.tmp} · Riesgo: {t.risk} · R: {t.rr_real || t.rr || '—'} · Emo: {t.emo}
                  </div>
                  {/* Direction + toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {t.direccion && t.direccion !== '—' && (
                      <Badge bg={t.direccion === 'Compra' ? '#E6F5ED' : '#FDECEA'}
                        border={t.direccion === 'Compra' ? '#B8E0CB' : '#F5C3C3'}
                        color={dirColor}>{t.direccion === 'Compra' ? '▲' : '▼'} {t.direccion}</Badge>
                    )}
                    <button onClick={() => onToggleDir(t.id, nextDir(t.direccion))}
                      style={{ padding: '3px 10px', background: '#F6F1E9', border: '1px solid #E3DDD1', color: '#607472', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans,sans-serif' }}>
                      {t.direccion && t.direccion !== '—' ? '↻ Cambiar' : '+ Dirección'}
                    </button>
                  </div>
                  {t.nota && <div style={{ marginTop: 8, fontSize: 12, color: '#607472', background: '#F6F1E9', borderRadius: 7, padding: '6px 10px' }}>{t.nota}</div>}
                </div>
                {/* Delete */}
                <button onClick={() => { if (confirm('¿Eliminar esta entrada?')) onDelete(t.id) }}
                  style={{ padding: '4px 8px', background: '#FDECEA', border: '1px solid #F5C3C3', color: '#B83232', borderRadius: 6, cursor: 'pointer', fontSize: 11, flexShrink: 0 }}>✕</button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: '#8AA09E', fontSize: 13 }}>Sin entradas que coincidan con los filtros.</div>}
      </div>
    </div>
  )
}

const sel = { padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E3DDD1', background: '#F6F1E9', color: '#1C3D3A', fontSize: 12.5, fontFamily: 'DM Sans,sans-serif', outline: 'none' }

function Badge({ bg, border, color, children }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, background: bg, border: `1px solid ${border}`, color, fontSize: 11, fontWeight: 500 }}>
      {children}
    </span>
  )
}
