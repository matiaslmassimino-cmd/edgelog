import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { calcMetrics, isQuality, calcSharpe, calcSortino, calcCalmar, calcEdgeRatio, calcDynamicGoals, calcAUM, buildEquityCurve, calcDirectionStats } from '../lib/metrics'

const tip = { background: '#1A2235', border: '1px solid #2A3A52', borderRadius: 8, fontSize: 11, color: '#E2E8F0' }

export default function TrackRecordPage({ ctx }) {
  const { trades, accounts, withdrawals, profile } = ctx
  const g = calcMetrics(trades)
  const qTrades = trades.filter(isQuality)
  const gQ = calcMetrics(qTrades)
  const sharpe = calcSharpe(trades)
  const sortino = calcSortino(trades)
  const calmar = calcCalmar(trades)
  const edge = calcEdgeRatio(trades)
  const goals = calcDynamicGoals(trades)
  const aum = calcAUM(accounts, trades, withdrawals)
  const equityData = buildEquityCurve(trades)
  const dir = calcDirectionStats(trades)
  const violated = trades.filter(e => !isQuality(e))
  const potentialPnl = parseFloat((g.pnl - violated.reduce((s, e) => s + (e.r_pnl || 0), 0)).toFixed(2))
  const gap = parseFloat((potentialPnl - g.pnl).toFixed(2))
  const dates = trades.map(e => e.fecha).filter(Boolean).sort()
  const firstDate = dates[0] ? new Date(dates[0].split('/').reverse().join('-')) : null
  const spanDays = firstDate ? Math.round((new Date() - firstDate) / 86400000) : 0
  const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const planData = ['100% exacto','Parcialmente','No cumplía'].map(plan => {
    const arr = trades.filter(e => e.plan === plan)
    const g2 = calcMetrics(arr)
    return { name: plan, trades: arr.length, wr: g2.wr, pnl: g2.pnl }
  })

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Track <em>Record</em></div>
          <div className="page-sub">Resumen ejecutivo — listo para mostrar o exportar.</div>
        </div>
        <button className="btn btn-main" onClick={() => window.print()}>⎙ Exportar PDF</button>
      </div>

      {/* Cover */}
      <div className="tr-cover">
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 13, color: 'rgba(96,165,250,.55)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 6 }}>Track Record · {dateStr}</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: '#fff', marginBottom: 4 }}>Edge<em style={{ color: 'rgba(96,165,250,.8)', fontStyle: 'italic' }}>Log</em></div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'rgba(96,165,250,.6)', marginBottom: 20 }}>{profile?.name || 'Matias Massimino'} · Prop Firm Journal</div>
        <div>
          <div className="tr-hero-val" style={{ color: g.pnl >= 0 ? '#22C55E' : '#EF4444' }}>{g.pnl >= 0 ? '+' : ''}{g.pnl.toFixed(2)}%</div>
          <div className="tr-hero-lbl">Retorno total acumulado</div>
        </div>
        <div className="tr-meta-row">
          {[
            { label: 'Trades', value: g.tr },
            { label: 'Win rate', value: g.wr !== null ? g.wr + '%' : '—' },
            { label: 'Prof. Factor', value: g.pf !== null ? g.pf.toFixed(2) : '—' },
            { label: 'Días operando', value: spanDays },
            { label: 'Capital activo', value: '$' + aum.total.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="tr-meta-val">{value}</div>
              <div className="tr-meta-lbl">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Real vs Potential */}
      <div className="quality-sep">Resultado real vs potencial del sistema</div>
      <div className="rvp-grid" style={{ marginBottom: 18 }}>
        <div className="rvp-real">
          <div className="rvp-label" style={{ color: 'var(--text3)' }}>Resultado real obtenido</div>
          <div className="rvp-val" style={{ color: g.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{g.pnl >= 0 ? '+' : ''}{g.pnl.toFixed(2)}%</div>
          <div className="rvp-sub">{g.tr} trades · {violated.length} fuera de plan</div>
        </div>
        <div className="rvp-potential">
          <div className="rvp-label" style={{ color: 'var(--accent2)' }}>Potencial del sistema ✦</div>
          <div className="rvp-val" style={{ color: 'var(--text)' }}>{potentialPnl >= 0 ? '+' : ''}{potentialPnl.toFixed(2)}%</div>
          <div className="rvp-sub">Solo trades disciplinados</div>
        </div>
        <div className="rvp-gap">
          <span style={{ fontSize: 12.5, color: 'var(--amber)', fontWeight: 500 }}>Brecha por indisciplina ({violated.length} trades fuera de plan)</span>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--amber)' }}>{gap >= 0 ? '+' : ''}{gap.toFixed(2)}%</span>
        </div>
      </div>

      {/* Executive summary */}
      <div className="quality-sep">Resumen ejecutivo</div>
      <div className="card" style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
          {profile?.name || 'Matias'} opera {profile?.par || 'EURUSD'} bajo un sistema discrecional basado en estructura de mercado, gestionando {accounts.filter(a => a.status === 'active').length} cuentas activas. El track record documenta {g.tr} operaciones con trazabilidad completa de cada decisión, incluyendo estado emocional, cumplimiento de plan y gestión de riesgo.
        </p>
        <div className="exec-grid">
          {[
            { v: g.avgRR !== null ? '1:' + g.avgRR.toFixed(1) : '—', l: 'R:R real promedio' },
            { v: sharpe !== null ? sharpe : '—', l: 'Sharpe ratio' },
            { v: sortino !== null ? sortino : '—', l: 'Sortino ratio' },
            { v: calmar !== null ? calmar : '—', l: 'Calmar ratio' },
            { v: gQ.wr !== null ? gQ.wr + '%' : '—', l: 'WR con disciplina' },
            { v: edge !== null ? edge + '%' : '—', l: 'Edge ratio' },
            { v: accounts.filter(a => a.status === 'completed').length, l: 'Fases completadas' },
            { v: accounts.filter(a => a.type === 'funded').length, l: 'Cuentas fondeadas' },
          ].map(({ v, l }) => (
            <div key={l} className="exec-stat"><div className="v">{v}</div><div className="l">{l}</div></div>
          ))}
        </div>

        <div className="quality-sep" style={{ marginTop: 16 }}>Objetivos dinámicos</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'WR objetivo', goal: goals.wrGoal + '%', cur: g.wr !== null ? g.wr + '%' : '—' },
            { label: 'R:R objetivo', goal: '1:' + goals.rrGoal, cur: g.avgRR !== null ? '1:' + g.avgRR.toFixed(1) : '—' },
            { label: 'PF objetivo', goal: goals.pfGoal, cur: g.pf !== null ? g.pf.toFixed(2) : '—' },
          ].map(({ label, goal, cur }) => (
            <div key={label} className="exec-stat">
              <div className="v" style={{ fontSize: 16 }}>{goal}</div>
              <div className="l">{label}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Actual: {cur}</div>
            </div>
          ))}
        </div>

        {(dir.long.count > 0 || dir.short.count > 0) && (
          <>
            <div className="quality-sep" style={{ marginTop: 16 }}>Dirección de trades</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="exec-stat" style={{ borderLeft: '3px solid var(--green)' }}>
                <div className="v" style={{ color: 'var(--green)' }}>▲ {dir.long.count}</div>
                <div className="l">Compras (Long)</div>
                {dir.long.wr !== null && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>WR: {dir.long.wr}% · {dir.long.w}W {dir.long.l}L</div>}
              </div>
              <div className="exec-stat" style={{ borderLeft: '3px solid var(--red)' }}>
                <div className="v" style={{ color: 'var(--red)' }}>▼ {dir.short.count}</div>
                <div className="l">Ventas (Short)</div>
                {dir.short.wr !== null && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>WR: {dir.short.wr}% · {dir.short.w}W {dir.short.l}L</div>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Equity curve */}
      <div className="card" style={{ marginBottom: 18 }}>
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
                const color = props.payload.resultado === 'Win' ? '#22C55E' : '#EF4444'
                return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={color} stroke="#111827" strokeWidth={1.5} />
              }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Account ledger */}
      <div className="quality-sep">Track record por cuenta</div>
      <div className="card" style={{ padding: '6px 20px', marginBottom: 18 }}>
        <table>
          <thead>
            <tr><th>Cuenta</th><th>Firma</th><th>Estado</th><th>Capital</th><th>Trades</th><th>WR</th><th>P&L</th></tr>
          </thead>
          <tbody>
            {accounts.map(a => {
              const te = trades.filter(e => String(e.cid) === String(a.id))
              const gA = calcMetrics(te)
              const stLabel = a.status === 'completed' ? 'Completada' : a.status === 'perdida' ? 'Perdida' : a.status === 'closed' ? 'Cerrada' : 'Activa'
              const stColor = a.status === 'completed' ? 'forest' : a.status === 'perdida' ? 'red' : a.status === 'closed' ? 'slate' : 'green'
              return (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{a.nombre}</td>
                  <td>{a.firma}</td>
                  <td><span className={`bdg ${stColor}`}>{stLabel}</span></td>
                  <td>${(a.capital || 0).toLocaleString()}</td>
                  <td>{te.length}</td>
                  <td style={{ color: gA.wr >= 50 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{gA.wr !== null ? gA.wr + '%' : '—'}</td>
                  <td style={{ fontWeight: 600, color: gA.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{gA.pnl >= 0 ? '+' : ''}{gA.pnl.toFixed(2)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Plan adherence */}
      <div className="quality-sep">Adherencia al plan</div>
      <div className="card" style={{ marginBottom: 18 }}>
        <table>
          <thead><tr><th>Plan</th><th>Trades</th><th>Win rate</th><th>P&L</th></tr></thead>
          <tbody>
            {planData.map(d => (
              <tr key={d.name}>
                <td style={{ fontWeight: 600, color: d.name === '100% exacto' ? 'var(--green)' : d.name === 'Parcialmente' ? 'var(--amber)' : 'var(--red)' }}>{d.name}</td>
                <td>{d.trades}</td>
                <td style={{ color: d.wr >= 50 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{d.wr !== null ? d.wr + '%' : '—'}</td>
                <td style={{ color: d.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{d.pnl >= 0 ? '+' : ''}{d.pnl.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg3)', borderRadius: 10, fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.7, border: '1px solid var(--border)' }}>
        Track record generado automáticamente desde EdgeLog. Cada operación incluye trazabilidad completa: fecha, cuenta, riesgo, resultado, estado emocional y cumplimiento del plan.
      </div>
    </div>
  )
}
