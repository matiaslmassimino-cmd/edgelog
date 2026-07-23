import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { calcMetrics, isQuality, buildEquityCurve, groupByPeriod, calcDirectionStats } from '../lib/metrics'

const COLORS_RES = { Win: '#22C55E', Loss: '#EF4444', Breakeven: '#F59E0B' }
const COLORS_PLAN = { '100% exacto': '#22C55E', Parcialmente: '#F59E0B', 'No cumplía': '#EF4444' }
const COLORS_EMO = { Calmo: '#22C55E', Ansioso: '#EF4444', FOMO: '#EAB308', Revenge: '#8B5CF6' }
const tip = { background: '#1A2235', border: '1px solid #2A3A52', borderRadius: 8, fontSize: 11, color: '#E2E8F0' }

export default function AnalyticsPage({ ctx }) {
  const { trades } = ctx
  const g = calcMetrics(trades)
  const qTrades = trades.filter(isQuality)
  const gQ = calcMetrics(qTrades)
  const equityData = buildEquityCurve(trades)
  const dirStats = calcDirectionStats(trades)

  const resData = [
    { name: 'Win', value: trades.filter(t => t.resultado === 'Win').length },
    { name: 'Loss', value: trades.filter(t => t.resultado === 'Loss').length },
    { name: 'Breakeven', value: trades.filter(t => t.resultado === 'Breakeven').length },
  ].filter(d => d.value > 0)

  const planGroups = { '100% exacto': [], Parcialmente: [], 'No cumplía': [] }
  trades.forEach(t => { if (planGroups[t.plan]) planGroups[t.plan].push(t) })
  const planData = Object.entries(planGroups).map(([name, arr]) => {
    const g2 = calcMetrics(arr)
    return { name, trades: arr.length, wr: g2.wr || 0, pnl: parseFloat(g2.pnl.toFixed(2)) }
  })

  const emoGroups = {}
  trades.forEach(t => {
    const emo = (t.emo || '—').split(' ')[0]
    if (!emoGroups[emo]) emoGroups[emo] = []
    emoGroups[emo].push(t)
  })
  const emoData = Object.entries(emoGroups).map(([name, arr]) => {
    const g2 = calcMetrics(arr)
    return { name, trades: arr.length, wr: g2.wr || 0 }
  }).sort((a, b) => b.trades - a.trades)

  const monthMap = groupByPeriod(trades, 'month')
  const monthlyData = Object.keys(monthMap).sort().map(k => {
    const g2 = calcMetrics(monthMap[k])
    const mn = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return { name: mn[parseInt(k.split('-')[1]) - 1], pnl: parseFloat(g2.pnl.toFixed(2)) }
  })

  const dirData = [
    { name: '▲ Compra', trades: dirStats.long.count, wr: dirStats.long.wr || 0 },
    { name: '▼ Venta', trades: dirStats.short.count, wr: dirStats.short.wr || 0 },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Ana<em>lytics</em></div>
        <div className="page-sub">Análisis visual completo de tu operativa.</div>
      </div>

      <div className="kpi-grid kpi-grid-4" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="kl">Win rate global</div><div className={`kv ${g.wr >= 50 ? 'pos' : 'neg'}`}>{g.wr !== null ? g.wr + '%' : '—'}</div><div className="ks">{g.w}W · {g.l}L</div></div>
        <div className="kpi gold"><div className="kl">WR calidad ✦</div><div className="kv">{gQ.wr !== null ? gQ.wr + '%' : '—'}</div><div className="ks">{qTrades.length} disciplinados</div></div>
        <div className="kpi"><div className="kl">Profitability Factor</div><div className={`kv ${g.pf >= 1.5 ? 'pos' : g.pf < 1 ? 'neg' : ''}`}>{g.pf !== null ? g.pf.toFixed(2) : '—'}</div><div className="ks">{g.pf !== null ? `+${g.gainSum.toFixed(1)} / -${g.lossSum.toFixed(1)}` : ''}</div></div>
        <div className="kpi"><div className="kl">R:R real promedio</div><div className={`kv ${g.avgRR >= 2 ? 'pos' : ''}`}>{g.avgRR !== null ? `1:${g.avgRR.toFixed(1)}` : '—'}</div><div className="ks">solo wins</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="card-title">Equity curve — P&L acumulado</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={equityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
              <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L acum.']} />
              <Line type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2.5}
                dot={(props) => {
                  if (!props.payload.resultado) return <circle key={props.key} cx={props.cx} cy={props.cy} r={2} fill="#3B82F6" />
                  const color = COLORS_RES[props.payload.resultado] || '#8AA09E'
                  return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={color} stroke="#111827" strokeWidth={1.5} />
                }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-title">Distribución</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={resData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                {resData.map((entry, i) => <Cell key={i} fill={COLORS_RES[entry.name] || '#8AA09E'} />)}
              </Pie>
              <Tooltip contentStyle={tip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="card-title">WR por cumplimiento del plan</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={planData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={tip} formatter={v => [v + '%', 'Win rate']} />
              <Bar dataKey="wr" radius={[0, 5, 5, 0]}>
                {planData.map((entry, i) => <Cell key={i} fill={COLORS_PLAN[entry.name] || '#8AA09E'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-title">Compras vs Ventas</div>
          {dirData.every(d => d.trades === 0) ? (
            <div className="empty" style={{ height: 180 }}><div className="empty-icon">◇</div><p style={{ fontSize: 12 }}>Marcá la dirección en el Historial</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dirData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="trades" name="Trades" radius={[5, 5, 0, 0]}>
                  <Cell fill="#22C55E" /><Cell fill="#EF4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="card-title">P&L mensual</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
              <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L']} />
              <Bar dataKey="pnl" radius={[5, 5, 0, 0]}>
                {monthlyData.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#22C55E' : '#EF4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-title">WR por estado emocional</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={emoData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={65} />
              <Tooltip contentStyle={tip} formatter={v => [v + '%', 'Win rate']} />
              <Bar dataKey="wr" radius={[0, 5, 5, 0]}>
                {emoData.map((entry, i) => <Cell key={i} fill={COLORS_EMO[entry.name] || '#8AA09E'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
