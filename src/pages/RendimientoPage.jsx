import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { groupByPeriod, periodMetrics, keyLabel, parseFecha, calcMetrics, isQuality } from '../lib/metrics'

const tip = { background: '#1A2235', border: '1px solid #2A3A52', borderRadius: 8, fontSize: 11, color: '#E2E8F0' }

export default function RendimientoPage({ ctx }) {
  const { trades, accounts, withdrawals } = ctx
  const [tab, setTab] = useState('month')
  const [selectedKey, setSelectedKey] = useState(null)
  const [selectedAcc, setSelectedAcc] = useState('all')

  const funded = accounts.filter(a => a.type === 'funded')

  // Trades de fondeadas filtrados por cuenta seleccionada
  const fundedIds = new Set(funded.map(a => String(a.id)))
  const baseTrades = useMemo(() => {
    return trades.filter(t => {
      if (!fundedIds.has(String(t.cid))) return false
      if (selectedAcc !== 'all' && String(t.cid) !== selectedAcc) return false
      return true
    })
  }, [trades, selectedAcc, funded])

  const map = useMemo(() => groupByPeriod(baseTrades, tab), [baseTrades, tab])
  const keys = useMemo(() => Object.keys(map).sort(), [map])

  // Período actual
  const now = new Date()
  const kfn = tab === 'week'
    ? d => { const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = tmp.getUTCDay() || 7; tmp.setUTCDate(tmp.getUTCDate() + 4 - day); const y = tmp.getUTCFullYear(); const w = Math.ceil(((tmp - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7); return `${y}-W${w < 10 ? '0' : ''}${w}` }
    : tab === 'month' ? d => `${d.getFullYear()}-${d.getMonth() < 9 ? '0' : ''}${d.getMonth() + 1}`
    : d => `${d.getFullYear()}`
  const curKey = kfn(now)
  const curTrades = map[curKey] || []
  const curM = curTrades.length ? periodMetrics(curTrades) : { tr: 0, w: 0, l: 0, wr: null, pnl: 0, avgRR: null, wrQ: null, days: 0, qCount: 0 }

  // Gráfico del período seleccionado
  const chartTrades = useMemo(() => {
    const arr = selectedKey && map[selectedKey] ? map[selectedKey] : baseTrades
    return [...arr]
      .filter(e => ['Win','Loss','Breakeven'].includes(e.resultado))
      .sort((a, b) => { const da = parseFecha(a.fecha), db = parseFecha(b.fecha); return (da - db) || (a.id - b.id) })
  }, [selectedKey, map, baseTrades])

  const chartData = useMemo(() => {
    let running = 0
    return [{ name: 'Inicio', pnl: 0 }].concat(chartTrades.map(t => {
      running = parseFloat((running + (t.r_pnl || 0)).toFixed(4))
      return { name: t.fecha, pnl: parseFloat(running.toFixed(2)) }
    }))
  }, [chartTrades])

  // P&L mensual para el gráfico de barras
  const monthlyData = useMemo(() => {
    const mmap = groupByPeriod(baseTrades, 'month')
    const mn = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return Object.keys(mmap).sort().map(k => {
      const g2 = calcMetrics(mmap[k])
      return { name: mn[parseInt(k.split('-')[1]) - 1], pnl: parseFloat(g2.pnl.toFixed(2)) }
    })
  }, [baseTrades])

  const gTotal = calcMetrics(baseTrades)
  const selM = selectedKey ? periodMetrics(map[selectedKey] || []) : null

  const accLabel = selectedAcc === 'all'
    ? 'Todas las fondeadas'
    : funded.find(a => String(a.id) === selectedAcc)?.nombre || ''

  if (!funded.length) return (
    <div>
      <div className="page-header"><div className="page-title">Rendi<em>miento</em></div></div>
      <div className="empty"><div className="empty-icon">◉</div><p>Sin cuentas fondeadas aún.</p></div>
    </div>
  )

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Rendi<em>miento</em></div>
          <div className="page-sub">Análisis por período de tus cuentas fondeadas.</div>
        </div>
        {/* Selector de cuenta */}
        <select
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12.5, outline: 'none' }}
          value={selectedAcc}
          onChange={e => { setSelectedAcc(e.target.value); setSelectedKey(null) }}>
          <option value="all">Todas las fondeadas</option>
          {funded.map(a => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
        </select>
      </div>

      {/* KPIs globales de fondeadas */}
      <div className="kpi-grid kpi-grid-4" style={{ marginBottom: 16 }}>
        <div className="kpi dark">
          <div className="kl">P&L total — {accLabel}</div>
          <div className={`kv ${gTotal.pnl >= 0 ? 'pos' : 'neg'}`}>{gTotal.pnl >= 0 ? '+' : ''}{gTotal.pnl.toFixed(2)}%</div>
          <div className="ks">{gTotal.tr} trades · {gTotal.w}W · {gTotal.l}L</div>
        </div>
        <div className="kpi">
          <div className="kl">Win rate</div>
          <div className={`kv ${gTotal.wr >= 50 ? 'pos' : 'neg'}`}>{gTotal.wr !== null ? gTotal.wr + '%' : '—'}</div>
          <div className="ks">{gTotal.w}W · {gTotal.l}L</div>
        </div>
        <div className="kpi">
          <div className="kl">R:R real promedio</div>
          <div className={`kv ${gTotal.avgRR >= 2 ? 'pos' : ''}`}>{gTotal.avgRR !== null ? '1:' + gTotal.avgRR.toFixed(1) : '—'}</div>
          <div className="ks">sobre wins</div>
        </div>
        <div className="kpi">
          <div className="kl">Profitability Factor</div>
          <div className={`kv ${gTotal.pf >= 1.5 ? 'pos' : gTotal.pf < 1 ? 'neg' : ''}`}>{gTotal.pf !== null ? gTotal.pf.toFixed(2) : '—'}</div>
          <div className="ks">{gTotal.pf >= 1.5 ? 'Sólido ✓' : 'Positivo'}</div>
        </div>
      </div>

      {/* Tabs período */}
      <div className="tab-bar">
        {['week','month','year'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => { setTab(t); setSelectedKey(null) }}>
            {t === 'week' ? 'Semanas' : t === 'month' ? 'Meses' : 'Años'}
          </button>
        ))}
      </div>

      {/* KPIs período actual */}
      {curTrades.length > 0 && !selectedKey && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, marginBottom: 10 }}>
            Período actual — {keyLabel(curKey, tab)}
          </div>
          <div className="kpi-grid kpi-grid-5">
            {[
              { label: 'Trades', value: curM.tr, sub: `${curM.days}d` },
              { label: 'Win rate', value: curM.wr !== null ? `${curM.wr}%` : '—', sub: `${curM.w}W · ${curM.l}L`, pos: curM.wr >= 50, neg: curM.wr !== null && curM.wr < 50 },
              { label: 'WR calidad ✦', value: curM.wrQ !== null ? `${curM.wrQ}%` : '—', sub: `${curM.qCount} disciplinados`, pos: curM.wrQ >= 50 },
              { label: 'P&L período', value: (curM.pnl >= 0 ? '+' : '') + curM.pnl.toFixed(2) + '%', sub: 'acumulado', pos: curM.pnl > 0, neg: curM.pnl < 0 },
              { label: 'R:R real', value: curM.avgRR !== null ? `1:${curM.avgRR.toFixed(1)}` : '—', sub: 'promedio wins', pos: curM.avgRR >= 2 },
            ].map(({ label, value, sub, pos, neg }) => (
              <div key={label} className="kpi">
                <div className="kl">{label}</div>
                <div className={`kv ${pos ? 'pos' : neg ? 'neg' : ''}`} style={{ fontSize: 22 }}>{value}</div>
                <div className="ks">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs período seleccionado */}
      {selectedKey && selM && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600 }}>
              {keyLabel(selectedKey, tab)}
            </div>
            <button onClick={() => setSelectedKey(null)} className="btn btn-sm" style={{ fontSize: 10 }}>✕ Ver todos</button>
          </div>
          <div className="kpi-grid kpi-grid-5">
            {[
              { label: 'Trades', value: selM.tr, sub: `${selM.days}d` },
              { label: 'Win rate', value: selM.wr !== null ? `${selM.wr}%` : '—', sub: `${selM.w}W · ${selM.l}L`, pos: selM.wr >= 50, neg: selM.wr !== null && selM.wr < 50 },
              { label: 'WR calidad ✦', value: selM.wrQ !== null ? `${selM.wrQ}%` : '—', sub: `${selM.qCount} disciplinados`, pos: selM.wrQ >= 50 },
              { label: 'P&L período', value: (selM.pnl >= 0 ? '+' : '') + selM.pnl.toFixed(2) + '%', sub: 'acumulado', pos: selM.pnl > 0, neg: selM.pnl < 0 },
              { label: 'R:R real', value: selM.avgRR !== null ? `1:${selM.avgRR.toFixed(1)}` : '—', sub: 'promedio wins', pos: selM.avgRR >= 2 },
            ].map(({ label, value, sub, pos, neg }) => (
              <div key={label} className="kpi" style={{ border: '1px solid var(--border2)' }}>
                <div className="kl">{label}</div>
                <div className={`kv ${pos ? 'pos' : neg ? 'neg' : ''}`} style={{ fontSize: 22 }}>{value}</div>
                <div className="ks">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600 }}>
            P&L acumulado — {selectedKey ? keyLabel(selectedKey, tab) : accLabel}
          </div>
          {selectedKey && (
            <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={() => setSelectedKey(null)}>✕ Ver todos</button>
          )}
        </div>
        {chartData.length <= 1
          ? <div className="empty"><div className="empty-icon">◉</div><p>Sin trades en este período.</p></div>
          : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pnlGradRend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EAB308" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
                <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L acum.']} labelStyle={{ color: '#EAB308', fontWeight: 600 }} />
                <Area type="monotone" dataKey="pnl" stroke="#EAB308" strokeWidth={2} fill="url(#pnlGradRend)" dot={false} activeDot={{ r: 5, fill: '#EAB308', stroke: '#111827', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
      </div>

      {/* P&L mensual */}
      {monthlyData.length > 1 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">P&L mensual — {accLabel}</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
              <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L']} />
              <Bar dataKey="pnl" radius={[5, 5, 0, 0]}>
                {monthlyData.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#22C55E' : '#EF4444'} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lista de períodos */}
      {keys.length === 0
        ? <div className="empty"><div className="empty-icon">◉</div><p>Sin datos para mostrar.</p></div>
        : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 10, padding: '0 14px 8px', fontSize: 9.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>
              <span>Período</span>
              <span style={{ textAlign: 'right' }}>Trades</span>
              <span style={{ textAlign: 'right' }}>WR</span>
              <span style={{ textAlign: 'right' }}>WR ✦</span>
              <span style={{ textAlign: 'right' }}>P&L</span>
              <span style={{ textAlign: 'right' }}>R:R</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...keys].reverse().map(k => {
                const m = periodMetrics(map[k])
                const isSel = selectedKey === k
                const isCur = k === curKey
                return (
                  <div key={k} onClick={() => setSelectedKey(isSel ? null : k)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: isSel ? 'linear-gradient(135deg, #1C1400, #2D2200)' : isCur ? 'rgba(234,179,8,.04)' : 'var(--bg2)', border: `1px solid ${isSel ? 'var(--gold-border)' : isCur ? 'rgba(234,179,8,.2)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all .16s' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: isSel ? 'var(--gold)' : 'var(--text)' }}>{keyLabel(k, tab)}</div>
                        {isCur && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(234,179,8,.15)', color: 'var(--gold)', border: '1px solid rgba(234,179,8,.3)', fontWeight: 600 }}>ACTUAL</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {(map[k] || []).filter(e => ['Win','Loss','Breakeven'].includes(e.resultado)).slice(0, 20).map((e, i) => (
                          <span key={i} style={{ width: 7, height: 7, borderRadius: 2, background: e.resultado === 'Win' ? '#22C55E' : e.resultado === 'Loss' ? '#EF4444' : '#F59E0B', display: 'inline-block', opacity: isQuality(e) ? .9 : .35 }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--text2)' }}>{m.tr}</div>
                    <div style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: m.wr !== null ? (m.wr >= 50 ? 'var(--green)' : 'var(--red)') : 'var(--text3)' }}>{m.wr !== null ? m.wr + '%' : '—'}</div>
                    <div style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: m.wrQ !== null ? (m.wrQ >= 50 ? 'var(--green)' : 'var(--red)') : 'var(--text3)' }}>{m.wrQ !== null ? m.wrQ + '%' : '—'}</div>
                    <div style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: m.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{m.pnl >= 0 ? '+' : ''}{m.pnl.toFixed(2)}%</div>
                    <div style={{ textAlign: 'right', fontSize: 12.5, color: m.avgRR !== null ? (m.avgRR >= 2 ? 'var(--green)' : 'var(--text2)') : 'var(--text3)' }}>{m.avgRR !== null ? '1:' + m.avgRR.toFixed(1) : '—'}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}
    </div>
  )
}
