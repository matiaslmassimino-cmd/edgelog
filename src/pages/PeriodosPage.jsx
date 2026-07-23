import { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { groupByPeriod, periodMetrics, keyLabel, parseFecha } from '../lib/metrics'

const tip = { background: '#1A2235', border: '1px solid #2A3A52', borderRadius: 8, fontSize: 11, color: '#E2E8F0' }

export default function PeriodosPage({ ctx }) {
  const { trades } = ctx
  const [tab, setTab] = useState('month')
  const [selectedKey, setSelectedKey] = useState(null)
  const [chartMode, setChartMode] = useState('pnl')

  const map = useMemo(() => groupByPeriod(trades, tab), [trades, tab])
  const keys = useMemo(() => Object.keys(map).sort(), [map])

  const now = new Date()
  const kfn = tab === 'week'
    ? d => { const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = tmp.getUTCDay() || 7; tmp.setUTCDate(tmp.getUTCDate() + 4 - day); const y = tmp.getUTCFullYear(); const w = Math.ceil(((tmp - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7); return `${y}-W${w < 10 ? '0' : ''}${w}` }
    : tab === 'month' ? d => `${d.getFullYear()}-${d.getMonth() < 9 ? '0' : ''}${d.getMonth() + 1}`
    : d => `${d.getFullYear()}`
  const curKey = kfn(now)
  const curTrades = map[curKey] || []
  const curM = curTrades.length ? periodMetrics(curTrades) : { tr: 0, w: 0, l: 0, wr: null, pnl: 0, avgRR: null, wrQ: null, days: 0, qCount: 0 }

  const chartKeys = selectedKey && map[selectedKey] ? [selectedKey] : keys
  const chartTrades = useMemo(() => {
    let arr = []
    chartKeys.forEach(k => arr = arr.concat(map[k] || []))
    return arr.filter(e => ['Win','Loss','Breakeven'].includes(e.resultado))
      .sort((a, b) => { const da = parseFecha(a.fecha), db = parseFecha(b.fecha); return (da - db) || (a.id - b.id) })
  }, [chartKeys, map])

  const chartData = useMemo(() => {
    if (chartMode === 'pnl') {
      let running = 0
      return [{ name: 'Inicio', pnl: 0 }].concat(chartTrades.map(t => {
        running = parseFloat((running + (t.r_pnl || 0)).toFixed(4))
        return { name: t.fecha, pnl: parseFloat(running.toFixed(2)), resultado: t.resultado }
      }))
    }
    const mn = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return chartKeys.map(k => {
      const m = periodMetrics(map[k] || [])
      const p = k.split(tab === 'week' ? '-W' : '-')
      const name = tab === 'month' ? mn[parseInt(p[1]) - 1] : tab === 'week' ? `S${p[1]}` : k
      return { name, wr: m.wr || 0, trades: m.tr }
    })
  }, [chartMode, chartTrades, chartKeys, map, tab])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Métricas por <em>período</em></div>
        <div className="page-sub">Semana a semana, mes a mes, año a año.</div>
      </div>

      <div className="tab-bar">
        {['week','month','year'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setSelectedKey(null) }}>
            {t === 'week' ? 'Semanas' : t === 'month' ? 'Meses' : 'Años'}
          </button>
        ))}
      </div>

      {keys.length > 0 && (
        <>
          <div className="quality-sep">Período actual — {keyLabel(curKey, tab)}</div>
          <div className="kpi-grid kpi-grid-5" style={{ marginBottom: 16 }}>
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
        </>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600 }}>
            {selectedKey ? keyLabel(selectedKey, tab) : 'Todos los períodos'}
            {selectedKey && <button className="btn btn-sm" style={{ marginLeft: 8, fontSize: 10 }} onClick={() => setSelectedKey(null)}>✕ Ver todos</button>}
          </div>
          <select style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }}
            value={chartMode} onChange={e => setChartMode(e.target.value)}>
            <option value="pnl">P&L acumulado</option>
            <option value="wr">Win rate</option>
            <option value="trades">Trades</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          {chartMode === 'pnl' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
              <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L acum.']} />
              <Line type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2.5}
                dot={(props) => {
                  if (!props.payload.resultado) return <circle key={props.key} cx={props.cx} cy={props.cy} r={2} fill="#3B82F6" />
                  const color = props.payload.resultado === 'Win' ? '#22C55E' : '#EF4444'
                  return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={color} stroke="#111827" strokeWidth={1.5} />
                }} activeDot={{ r: 6 }} />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => chartMode === 'wr' ? v + '%' : v} />
              <Tooltip contentStyle={tip} formatter={(v, n) => [chartMode === 'wr' ? v + '%' : v, n === 'wr' ? 'Win rate' : 'Trades']} />
              <Bar dataKey={chartMode} radius={[5, 5, 0, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={chartMode === 'wr' ? (entry.wr >= 50 ? '#22C55E' : '#EF4444') : '#3B82F6'} />)}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {keys.length === 0 ? (
        <div className="empty"><div className="empty-icon">◫</div><p>Sin datos para mostrar.</p></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr', gap: 10, padding: '0 14px 8px', fontSize: 9.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>
            <span>Período</span><span style={{ textAlign: 'right' }}>Trades</span><span style={{ textAlign: 'right' }}>WR</span>
            <span style={{ textAlign: 'right' }}>WR ✦</span><span style={{ textAlign: 'right' }}>P&L</span>
            <span style={{ textAlign: 'right' }}>R:R</span><span style={{ textAlign: 'right' }}>PF</span>
          </div>
          {[...keys].reverse().map(k => {
            const m = periodMetrics(map[k])
            const isSel = selectedKey === k
            return (
              <div key={k} onClick={() => setSelectedKey(isSel ? null : k)}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 12, marginBottom: 6, background: isSel ? 'var(--accent-bg)' : 'var(--bg2)', border: `1px solid ${isSel ? 'var(--border2)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all .16s' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{keyLabel(k, tab)}</div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                    {(map[k] || []).slice(0, 20).map((e, i) => (
                      <span key={i} style={{ width: 7, height: 7, borderRadius: 2, background: e.resultado === 'Win' ? '#22C55E' : e.resultado === 'Loss' ? '#EF4444' : '#F59E0B', display: 'inline-block', opacity: .8 }} />
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--text2)' }}>{m.tr}</div>
                <div style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: m.wr !== null ? (m.wr >= 50 ? 'var(--green)' : 'var(--red)') : 'var(--text3)' }}>{m.wr !== null ? m.wr + '%' : '—'}</div>
                <div style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: m.wrQ !== null ? (m.wrQ >= 50 ? 'var(--green)' : 'var(--red)') : 'var(--text3)' }}>{m.wrQ !== null ? m.wrQ + '%' : '—'}</div>
                <div style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: m.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{m.pnl >= 0 ? '+' : ''}{m.pnl.toFixed(2)}%</div>
                <div style={{ textAlign: 'right', fontSize: 12.5, color: m.avgRR !== null ? (m.avgRR >= 2 ? 'var(--green)' : 'var(--text2)') : 'var(--text3)' }}>{m.avgRR !== null ? '1:' + m.avgRR.toFixed(1) : '—'}</div>
                <div style={{ textAlign: 'right', fontSize: 12.5, color: m.pf !== null ? (m.pf >= 1.5 ? 'var(--green)' : m.pf >= 1 ? 'var(--amber)' : 'var(--red)') : 'var(--text3)' }}>{m.pf !== null ? m.pf.toFixed(2) : '—'}</div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
