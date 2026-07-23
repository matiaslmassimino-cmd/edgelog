import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicData } from '../lib/sync'
import { calcMetrics, isQuality, calcStreaks, calcSharpe, calcEdgeRatio, calcAUM, buildEquityCurve } from '../lib/metrics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Public() {
  const { userId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) { setError('URL inválida.'); setLoading(false); return }
    fetchPublicData(userId)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [userId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0B0F17', fontFamily: "'DM Serif Display',serif", fontSize: 22, color: '#E2E8F0' }}>
      Edge<em style={{ color: '#60A5FA', fontStyle: 'italic' }}>Log</em>
    </div>
  )
  if (error || !data?.profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0B0F17', color: '#EF4444' }}>{error || 'Perfil no encontrado.'}</div>
  )

  const { profile, accounts, trades } = data
  const g = calcMetrics(trades)
  const qTrades = trades.filter(isQuality)
  const gQ = calcMetrics(qTrades)
  const sharpe = calcSharpe(trades)
  const edge = calcEdgeRatio(trades)
  const aum = calcAUM(accounts, trades, {})
  const equityData = buildEquityCurve(trades)
  const violated = trades.filter(e => !isQuality(e))
  const potentialPnl = parseFloat((g.pnl - violated.reduce((s, e) => s + (e.r_pnl || 0), 0)).toFixed(2))
  const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const planData = ['100% exacto','Parcialmente','No cumplía'].map(plan => {
    const arr = trades.filter(e => e.plan === plan)
    const g2 = calcMetrics(arr)
    return { name: plan, trades: arr.length, wr: g2.wr, pnl: g2.pnl }
  })
  const tip = { background: '#1A2235', border: '1px solid #2A3A52', borderRadius: 8, fontSize: 11, color: '#E2E8F0' }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F17', fontFamily: "'DM Sans',system-ui,sans-serif", color: '#E2E8F0' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #060D1F 0%, #0F1E38 60%, #0B1628 100%)', borderBottom: '1px solid #1E3A5F', padding: '36px 48px 40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(59,130,246,.05)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 12, color: 'rgba(96,165,250,.5)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8 }}>Track Record · {dateStr}</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 38, color: '#fff', lineHeight: 1, marginBottom: 4 }}>Edge<em style={{ color: 'rgba(96,165,250,.8)', fontStyle: 'italic' }}>Log</em></div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: 'rgba(96,165,250,.55)', marginBottom: 24 }}>{profile.name || 'Trader'} · Prop Firm Journal</div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {[
              { label: 'Retorno total', value: (g.pnl >= 0 ? '+' : '') + g.pnl.toFixed(2) + '%', color: g.pnl >= 0 ? '#22C55E' : '#EF4444' },
              { label: 'Win rate', value: g.wr !== null ? g.wr + '%' : '—', color: g.wr >= 50 ? '#22C55E' : '#EF4444' },
              { label: 'WR calidad ✦', value: gQ.wr !== null ? gQ.wr + '%' : '—', color: '#EAB308' },
              { label: 'Trades', value: String(g.tr), color: '#fff' },
              { label: 'Capital activo', value: '$' + aum.total.toLocaleString(), color: '#60A5FA' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: 'rgba(96,165,250,.45)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Core KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Profitability Factor', value: g.pf !== null ? g.pf.toFixed(2) : '—', pos: g.pf >= 1.5, neg: g.pf !== null && g.pf < 1 },
            { label: 'R:R real promedio', value: g.avgRR !== null ? '1:' + g.avgRR.toFixed(1) : '—', pos: g.avgRR >= 2 },
            { label: 'Sharpe ratio', value: sharpe !== null ? sharpe : '—', pos: sharpe >= 1 },
            { label: 'Edge ratio', value: edge !== null ? edge + '%' : '—', pos: edge >= 85 },
          ].map(({ label, value, pos, neg }) => (
            <div key={label} style={{ background: '#111827', border: '1px solid #1E2A3A', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 9.5, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8, fontWeight: 600 }}>{label}</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, lineHeight: 1, color: pos ? '#22C55E' : neg ? '#EF4444' : '#E2E8F0' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Equity curve */}
        <div style={{ background: '#111827', border: '1px solid #1E2A3A', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 14, fontWeight: 600 }}>Equity curve — P&L acumulado</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={equityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
              <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L acum.']} />
              <Line type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2.5}
                dot={(props) => {
                  if (!props.payload.resultado) return <circle key={props.key} cx={props.cx} cy={props.cy} r={2} fill="#3B82F6" />
                  const color = props.payload.resultado === 'Win' ? '#22C55E' : '#EF4444'
                  return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={color} stroke="#111827" strokeWidth={1.5} />
                }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Real vs Potential + Plan */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ background: '#111827', border: '1px solid #1E2A3A', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid #1E2A3A' }}>
              <div style={{ fontSize: 10, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8, fontWeight: 600 }}>Resultado real</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 36, color: g.pnl >= 0 ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{g.pnl >= 0 ? '+' : ''}{g.pnl.toFixed(2)}%</div>
              <div style={{ fontSize: 11, color: '#4A6080', marginTop: 6 }}>{g.tr} trades · {violated.length} fuera de plan</div>
            </div>
            <div style={{ padding: '20px 22px', background: '#1E3A5F' }}>
              <div style={{ fontSize: 10, color: 'rgba(96,165,250,.6)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8, fontWeight: 600 }}>Potencial del sistema ✦</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 36, color: '#E2E8F0', lineHeight: 1 }}>{potentialPnl >= 0 ? '+' : ''}{potentialPnl.toFixed(2)}%</div>
              <div style={{ fontSize: 11, color: 'rgba(96,165,250,.5)', marginTop: 6 }}>Solo trades disciplinados</div>
            </div>
          </div>

          <div style={{ background: '#111827', border: '1px solid #1E2A3A', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 10, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 14, fontWeight: 600 }}>WR por cumplimiento del plan</div>
            {planData.map(d => (
              <div key={d.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                  <span style={{ color: '#94A3B8' }}>{d.name} <span style={{ color: '#4A6080' }}>({d.trades})</span></span>
                  <span style={{ fontWeight: 600, color: d.wr >= 50 ? '#22C55E' : '#EF4444' }}>{d.wr !== null ? d.wr + '%' : '—'}</span>
                </div>
                <div style={{ height: 4, background: '#1A2235', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: 4, borderRadius: 10, width: `${d.wr || 0}%`, background: d.wr >= 50 ? '#22C55E' : '#EF4444' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account table */}
        <div style={{ background: '#111827', border: '1px solid #1E2A3A', borderRadius: 14, padding: '6px 20px', marginBottom: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>{['Cuenta','Firma','Estado','Capital','Trades','WR','P&L'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 10px', fontSize: 9.5, color: '#4A6080', textTransform: 'uppercase', fontWeight: 600, borderBottom: '1px solid #1E2A3A', background: '#1A2235' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {accounts.filter(a => trades.filter(e => String(e.cid) === String(a.id)).length > 0).map(a => {
                const te = trades.filter(e => String(e.cid) === String(a.id))
                const gA = calcMetrics(te)
                const stLabel = a.status === 'completed' ? 'Completada' : a.status === 'perdida' ? 'Perdida' : 'Activa'
                const stColor = a.status === 'completed' ? '#60A5FA' : a.status === 'perdida' ? '#EF4444' : '#22C55E'
                return (
                  <tr key={a.id}>
                    <td style={{ padding: '9px 10px', fontWeight: 600, color: '#E2E8F0', borderBottom: '1px solid #1E2A3A' }}>{a.nombre}</td>
                    <td style={{ padding: '9px 10px', color: '#94A3B8', borderBottom: '1px solid #1E2A3A' }}>{a.firma}</td>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid #1E2A3A' }}><span style={{ color: stColor, fontWeight: 600, fontSize: 11 }}>{stLabel}</span></td>
                    <td style={{ padding: '9px 10px', color: '#94A3B8', borderBottom: '1px solid #1E2A3A' }}>${(a.capital || 0).toLocaleString()}</td>
                    <td style={{ padding: '9px 10px', color: '#94A3B8', borderBottom: '1px solid #1E2A3A' }}>{te.length}</td>
                    <td style={{ padding: '9px 10px', color: gA.wr >= 50 ? '#22C55E' : '#EF4444', fontWeight: 600, borderBottom: '1px solid #1E2A3A' }}>{gA.wr !== null ? gA.wr + '%' : '—'}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 600, color: gA.pnl >= 0 ? '#22C55E' : '#EF4444', borderBottom: '1px solid #1E2A3A' }}>{gA.pnl >= 0 ? '+' : ''}{gA.pnl.toFixed(2)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 16px', background: '#111827', borderRadius: 10, fontSize: 11.5, color: '#4A6080', lineHeight: 1.7, border: '1px solid #1E2A3A' }}>
          Track record generado automáticamente desde EdgeLog. Cada operación incluye trazabilidad completa: fecha, cuenta, riesgo, resultado, estado emocional y cumplimiento del plan.
        </div>
      </div>
    </div>
  )
}
