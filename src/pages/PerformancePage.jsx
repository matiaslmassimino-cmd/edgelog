import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { calcMetrics, isQuality, calcStreaks, calcSharpe, calcSortino, calcCalmar, calcExpectancy, calcConsistency, calcAUM, buildEquityCurve, pnlSinceLastWD, pnlTotal, calcDynamicGoals } from '../lib/metrics'

const tip = { background: '#1A2235', border: '1px solid #2A3A52', borderRadius: 8, fontSize: 11, color: '#E2E8F0' }

export default function PerformancePage({ ctx }) {
  const { trades, accounts, withdrawals } = ctx
  const g = calcMetrics(trades)
  const qTrades = trades.filter(isQuality)
  const gQ = calcMetrics(qTrades)
  const streaks = calcStreaks(trades)
  const sharpe = calcSharpe(trades)
  const sortino = calcSortino(trades)
  const calmar = calcCalmar(trades)
  const exp = calcExpectancy(trades)
  const cons = calcConsistency(trades)
  const aum = calcAUM(accounts, trades, withdrawals)
  const equityData = buildEquityCurve(trades)
  const violated = trades.filter(e => !isQuality(e))
  const potentialPnl = parseFloat((g.pnl - violated.reduce((s, e) => s + (e.r_pnl || 0), 0)).toFixed(2))

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Per<em>formance</em></div>
        <div className="page-sub">Vista de portfolio profesional — capital, riesgo y consistencia.</div>
      </div>

      {/* Hero AUM */}
      <div style={{ background: 'linear-gradient(135deg, #060D1F 0%, #0F1E38 60%, #0B1628 100%)', border: '1px solid #1E3A5F', borderRadius: 'var(--radius-lg)', padding: '24px 28px', color: '#fff', marginBottom: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(59,130,246,.06)' }} />
        <div style={{ fontSize: 10, color: 'rgba(96,165,250,.5)', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 6 }}>Capital operado activo</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', position: 'relative' }}>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 44, color: '#fff', lineHeight: 1 }}>${aum.total.toLocaleString()}</div>
            <div style={{ fontSize: 10.5, color: 'rgba(96,165,250,.45)', marginTop: 4 }}>{aum.activeCount} activas · {aum.completedCount} completadas{aum.lostCount ? ` · ⚠ ${aum.lostCount} perdidas` : ''}</div>
          </div>
          <div style={{ width: 1, height: 44, background: 'rgba(255,255,255,.1)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, color: 'rgba(96,165,250,.5)', marginBottom: 4 }}>Ganancia bruta</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: aum.grossPnlUSD >= 0 ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{aum.grossPnlUSD >= 0 ? '+' : ''}${Math.abs(aum.grossPnlUSD).toLocaleString()}</div>
            <div style={{ fontSize: 10, color: 'rgba(96,165,250,.45)', marginTop: 3 }}>{g.pnl >= 0 ? '+' : ''}{g.pnl.toFixed(2)}% sobre capital</div>
          </div>
          <div style={{ width: 1, height: 44, background: 'rgba(255,255,255,.1)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, color: 'rgba(96,165,250,.5)', marginBottom: 4 }}>Tu parte — fondeadas</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: '#EAB308', lineHeight: 1 }}>{aum.myPnlUSD >= 0 ? '+' : ''}${Math.abs(aum.myPnlUSD).toLocaleString()}</div>
            <div style={{ fontSize: 10, color: 'rgba(96,165,250,.45)', marginTop: 3 }}>ciclo actual</div>
          </div>
        </div>
      </div>

      {/* Core KPIs */}
      <div className="kpi-grid kpi-grid-5" style={{ marginBottom: 12 }}>
        <div className="kpi"><div className="kl">Win rate global</div><div className={`kv ${g.wr >= 50 ? 'pos' : 'neg'}`}>{g.wr !== null ? g.wr + '%' : '—'}</div><div className="ks">{g.w}W · {g.l}L</div></div>
        <div className="kpi gold"><div className="kl">WR calidad ✦</div><div className="kv">{gQ.wr !== null ? gQ.wr + '%' : '—'}</div><div className="ks">{qTrades.length} disciplinados</div></div>
        <div className="kpi"><div className="kl">Profitability Factor</div><div className={`kv ${g.pf >= 1.5 ? 'pos' : g.pf < 1 ? 'neg' : ''}`}>{g.pf !== null ? g.pf.toFixed(2) : '—'}</div><div className="ks">{g.pf !== null ? `+${g.gainSum.toFixed(1)} / -${g.lossSum.toFixed(1)}` : ''}</div></div>
        <div className="kpi"><div className="kl">R:R real promedio</div><div className={`kv ${g.avgRR >= 2 ? 'pos' : ''}`}>{g.avgRR !== null ? '1:' + g.avgRR.toFixed(1) : '—'}</div><div className="ks">sobre wins</div></div>
        <div className="kpi"><div className="kl">Consistencia mensual</div><div className={`kv ${cons.pct >= 70 ? 'pos' : cons.pct < 50 ? 'neg' : ''}`}>{cons.pct !== null ? cons.pct + '%' : '—'}</div><div className="ks">{cons.months.filter(m => m.positive).length}/{cons.months.length} meses positivos</div></div>
      </div>

      {/* Advanced ratios */}
      <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 12 }}>
        <div className="kpi"><div className="kl">Expectancy por trade</div><div className={`kv ${exp > 0 ? 'pos' : exp < 0 ? 'neg' : ''}`}>{exp !== null ? (exp > 0 ? '+' : '') + exp + '%' : '—'}</div><div className="ks">{exp !== null ? (exp > 0 ? `Ganás ${exp}% en promedio` : `Perdés ${Math.abs(exp)}% en promedio`) : '—'}</div></div>
        <div className="kpi"><div className="kl">Sharpe ratio</div><div className={`kv ${sharpe >= 1 ? 'pos' : sharpe < 0 ? 'neg' : ''}`}>{sharpe !== null ? sharpe : '—'}</div><div className="ks">{sharpe !== null ? sharpe >= 2 ? 'Excelente' : sharpe >= 1 ? 'Bueno' : sharpe >= 0 ? 'Regular' : 'Negativo' : 'media ÷ desvío'}</div></div>
        <div className="kpi"><div className="kl">Calmar ratio</div><div className={`kv ${calmar >= 1.5 ? 'pos' : calmar < 0.8 ? 'neg' : ''}`}>{calmar !== null ? calmar : '—'}</div><div className="ks">{calmar !== null ? calmar >= 2 ? 'Excelente' : calmar >= 1 ? 'Sólido' : 'Bajo' : 'P&L ÷ max DD'}</div></div>
      </div>

      {/* Real vs Potential */}
      <div className="rvp-grid" style={{ marginBottom: 12 }}>
        <div className="rvp-real">
          <div className="rvp-label" style={{ color: 'var(--text3)' }}>Resultado real</div>
          <div className="rvp-val" style={{ color: g.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{g.pnl >= 0 ? '+' : ''}{g.pnl.toFixed(2)}%</div>
          <div className="rvp-sub">{g.tr} trades · {violated.length} fuera de plan</div>
        </div>
        <div className="rvp-potential">
          <div className="rvp-label" style={{ color: 'var(--accent2)' }}>Potencial del sistema ✦</div>
          <div className="rvp-val" style={{ color: 'var(--text)' }}>{potentialPnl >= 0 ? '+' : ''}{potentialPnl.toFixed(2)}%</div>
          <div className="rvp-sub">Solo trades disciplinados</div>
        </div>
        <div className="rvp-gap">
          <span style={{ fontSize: 12.5, color: 'var(--amber)', fontWeight: 500 }}>Brecha por indisciplina ({violated.length} trades)</span>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--amber)' }}>{parseFloat((potentialPnl - g.pnl).toFixed(2)) >= 0 ? '+' : ''}{parseFloat((potentialPnl - g.pnl).toFixed(2))}%</span>
        </div>
      </div>

      {/* Streaks + Consistency */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="card">
          <div className="card-title">Rachas</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Racha actual', value: streaks.cur, type: streaks.type, sub: streaks.type === 'Win' ? 'wins' : 'losses' },
              { label: 'Mejor racha', value: streaks.maxW, type: 'Win', sub: 'wins récord' },
              { label: 'Peor racha', value: streaks.maxL, type: 'Loss', sub: 'losses récord' },
            ].map(s => (
              <div key={s.label} className="streak-card">
                <div className="streak-lbl">{s.label}</div>
                <div className="streak-num" style={{ color: s.type === 'Win' ? 'var(--green)' : s.type === 'Loss' ? 'var(--red)' : 'var(--text)' }}>{s.value}</div>
                <div className="streak-sub">{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 9.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>Últimas 10</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {streaks.last10.map((r, i) => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: 5, background: r === 'Win' ? 'var(--green)' : 'var(--red)', opacity: .85 }} />
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Consistencia mensual</div>
          {cons.months.slice(-6).map(m => {
            const maxAbs = Math.max(...cons.months.map(x => Math.abs(x.pnl)), 1)
            const barW = Math.min(Math.abs(m.pnl) / maxAbs * 100, 100)
            return (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, minWidth: 60 }}>{m.label.split(' ')[0]}</div>
                <div style={{ flex: 1, height: 4, background: 'var(--bg3)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: 4, borderRadius: 10, width: `${barW}%`, background: m.positive ? 'var(--green)' : 'var(--red)' }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, minWidth: 60, textAlign: 'right', color: m.positive ? 'var(--green)' : 'var(--red)' }}>{m.pnl >= 0 ? '+' : ''}{m.pnl.toFixed(2)}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Equity curve con área */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">Equity curve — P&L acumulado global</div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={equityData}>
            <defs>
              <linearGradient id="pnlGradPerf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
            <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L acum.']} />
            <Area type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2} fill="url(#pnlGradPerf)" dot={false} activeDot={{ r: 5, fill: '#60A5FA', stroke: '#111827', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per account */}
      <div className="card">
        <div className="card-title">Desglose por cuenta</div>
        {accounts.map(a => {
          const te = trades.filter(e => String(e.cid) === String(a.id))
          if (!te.length) return null
          const gA = calcMetrics(te)
          const cap = a.capital || 0
          const isF = a.type === 'funded'
          const pnlCur = isF ? pnlSinceLastWD(a.id, trades, withdrawals) : gA.pnl
          const pnlUSD = parseFloat((pnlCur / 100 * cap).toFixed(2))
          const split = parseInt((a.split || '80/20').split('/')[0]) || 80
          let peak = 0, run = 0, maxDD = 0
          ;[...te].sort((x, y) => new Date(x.fecha) - new Date(y.fecha)).forEach(e => { run += e.r_pnl || 0; if (run > peak) peak = run; const dd = peak - run; if (dd > maxDD) maxDD = dd })
          maxDD = parseFloat(maxDD.toFixed(2))
          const ddLim = a.dd || 5
          const ddPct = ddLim > 0 ? Math.min(Math.round(maxDD / ddLim * 100), 100) : 0
          const ddCol = ddPct > 80 ? 'var(--red)' : ddPct > 55 ? 'var(--amber)' : 'var(--green)'
          return (
            <div key={a.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--text)' }}>{a.nombre}</span>
                  <span style={{ padding: '2px 7px', borderRadius: 4, background: isF ? 'var(--gold-bg)' : 'var(--accent-bg)', color: isF ? 'var(--gold)' : 'var(--accent2)', border: `1px solid ${isF ? 'var(--gold-border)' : 'var(--border2)'}`, fontSize: 9.5, fontWeight: 600 }}>{isF ? 'Fondeada' : a.fase}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: pnlCur >= 0 ? 'var(--green)' : 'var(--red)' }}>{pnlCur >= 0 ? '+' : ''}{pnlCur.toFixed(2)}%</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{pnlUSD >= 0 ? '+' : ''}${Math.abs(pnlUSD).toFixed(0)}{isF ? ` · mi parte: $${Math.abs(pnlUSD * split / 100).toFixed(0)}` : ''}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                {[
                  { l: 'Trades', v: te.length, s: `${gA.w}W · ${gA.l}L` },
                  { l: 'WR', v: gA.wr !== null ? gA.wr + '%' : '—', c: gA.wr >= 50 ? 'var(--green)' : 'var(--red)' },
                  { l: 'R:R real', v: gA.avgRR !== null ? '1:' + gA.avgRR.toFixed(1) : '—', c: gA.avgRR >= 2 ? 'var(--green)' : 'var(--text2)' },
                  { l: 'PF', v: gA.pf !== null ? gA.pf.toFixed(2) : '—', c: gA.pf >= 1.5 ? 'var(--green)' : gA.pf < 1 ? 'var(--red)' : 'var(--text2)' },
                ].map(({ l, v, s, c }) => (
                  <div key={l} className="fa-stat">
                    <div className="kl">{l}</div>
                    <div className="kv" style={{ fontSize: 15, color: c || 'var(--text)' }}>{v}</div>
                    {s && <div className="ks" style={{ fontSize: 9.5 }}>{s}</div>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--text3)', marginBottom: 3 }}>
                <span>Drawdown: {maxDD.toFixed(2)}%</span><span style={{ color: ddCol, fontWeight: 600 }}>{ddPct}% del límite ({ddLim}%)</span>
              </div>
              <div className="dd-bar"><div className="dd-fill" style={{ width: `${ddPct}%`, background: ddCol }} /></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
