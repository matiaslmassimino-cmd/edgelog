import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend } from 'recharts'
import { calcMetrics, isQuality, buildEquityCurve, groupByPeriod, calcDirectionStats } from '../lib/metrics'

const COLORS_RES = { Win: '#22C55E', Loss: '#EF4444', Breakeven: '#F59E0B' }
const COLORS_PLAN = { '100% exacto': '#22C55E', Parcialmente: '#F59E0B', 'No cumplía': '#EF4444' }
const COLORS_EMO = { Calmo: '#22C55E', Ansioso: '#EF4444', FOMO: '#EAB308', Revenge: '#8B5CF6' }
const tip = { background: '#1A2235', border: '1px solid #2A3A52', borderRadius: 8, fontSize: 11, color: '#E2E8F0' }

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#E2E8F0" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {value}
    </text>
  )
}

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
        <div className="kpi"><div className="kl">Profitability factor</div><div className={`kv ${g.pf >= 1.5 ? 'pos' : g.pf < 1 ? 'neg' : ''}`}>{g.pf !== null ? g.pf.toFixed(2) : '—'}</div><div className="ks">{g.pf !== null ? `+${g.gainSum.toFixed(1)} / -${g.lossSum.toFixed(1)}` : ''}</div></div>
        <div className="kpi"><div className="kl">R:R real promedio</div><div className={`kv ${g.avgRR >= 2 ? 'pos' : ''}`}>{g.avgRR !== null ? `1:${g.avgRR.toFixed(1)}` : '—'}</div><div className="ks">solo wins</div></div>
      </div>

      {/* Equity curve con área sombreada */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">Equity curve — P&L acumulado</div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={equityData}>
            <defs>
              <linearGradient id="pnlGradAN" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
            <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L acum.']} labelStyle={{ color: '#60A5FA', fontWeight: 600 }} />
            <Area type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2} fill="url(#pnlGradAN)" dot={false} activeDot={{ r: 5, fill: '#60A5FA', stroke: '#111827', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Distribución + Plan */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="card-title">Distribución de resultados</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={resData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={3} labelLine={false} label={renderCustomLabel}>
                {resData.map((entry, i) => <Cell key={i} fill={COLORS_RES[entry.name] || '#4A6080'} />)}
              </Pie>
              <Tooltip contentStyle={tip} formatter={(v, n) => [v + ' trades', n]} />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Win rate por cumplimiento del plan</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={planData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={95} />
              <Tooltip contentStyle={tip} formatter={v => [v + '%', 'Win rate']} />
              <Bar dataKey="wr" radius={[0, 6, 6, 0]}>
                {planData.map((entry, i) => <Cell key={i} fill={COLORS_PLAN[entry.name] || '#4A6080'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P&L mensual + Emoción */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="card-title">P&L mensual</div>
          <ResponsiveContainer width="100%" height={200}>
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
          <div className="card-title">Win rate por estado emocional</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={emoData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={65} />
              <Tooltip contentStyle={tip} formatter={v => [v + '%', 'Win rate']} />
              <Bar dataKey="wr" radius={[0, 6, 6, 0]}>
                {emoData.map((entry, i) => <Cell key={i} fill={COLORS_EMO[entry.name] || '#4A6080'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Compras vs Ventas */}
      {!dirData.every(d => d.trades === 0) && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">Compras vs Ventas</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dirData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={tip} formatter={(v, n) => [v, 'Trades']} />
              <Bar dataKey="trades" name="Trades" radius={[0, 6, 6, 0]}>
                <Cell fill="#22C55E" /><Cell fill="#EF4444" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla detalle */}
      <div className="card">
        <div className="card-title">Detalle por cumplimiento del plan</div>
        <table>
          <thead>
            <tr><th>Plan</th><th>Trades</th><th>Win rate</th><th>P&L</th><th>Análisis</th></tr>
          </thead>
          <tbody>
            {planData.map(d => (
              <tr key={d.name}>
                <td style={{ fontWeight: 600, color: COLORS_PLAN[d.name] }}>{d.name}</td>
                <td>{d.trades}</td>
                <td style={{ color: d.wr >= 50 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{d.wr}%</td>
                <td style={{ color: d.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{d.pnl >= 0 ? '+' : ''}{d.pnl.toFixed(2)}%</td>
                <td style={{ fontSize: 11.5, color: 'var(--text2)' }}>
                  {d.name === '100% exacto' && d.wr >= 60 ? '✓ Sistema con edge demostrado' :
                   d.name === 'No cumplía' && d.wr === 0 ? '⚠ Cero wins — costo puro de indisciplina' :
                   d.name === 'Parcialmente' && d.wr < 40 ? '△ Salidas tempranas costosas' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
