import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { calcMetrics, isQuality, calcStreaks, calcDynamicGoals, calcDeteriorationAlerts, buildEquityCurve, calcFundedSummary, calcEvaluationStats, calcDayStatus, calcMaxDD, fmtR } from '../lib/metrics'

const CHECKLIST_ITEMS = [
  'Analicé 1D, 4H y 1H antes de abrir',
  'Definí el sesgo del día',
  'Marqué zonas clave en EURUSD y DXY',
  'Leí mis reglas y mi mantra',
  'Sé exactamente qué setup esperar',
  'Soy consciente del drawdown en cada cuenta',
]

const tip = { background: '#1A2235', border: '1px solid #2A3A52', borderRadius: 8, fontSize: 11, color: '#E2E8F0' }

function KPICard({ label, value, sub, pos, neg, dark, gold, goalBar }) {
  const cl = dark || gold ? 'kpi ' + (dark ? 'dark' : 'gold') : 'kpi'
  const valCls = !dark && !gold ? (pos ? 'kv pos' : neg ? 'kv neg' : 'kv') : 'kv'
  return (
    <div className={cl}>
      <div className="kl">{label}</div>
      <div className={valCls}>{value}</div>
      {sub && <div className="ks">{sub}</div>}
      {goalBar && (
        <div className="goal-bar-wrap">
          <div className="goal-bar-meta">
            <span style={{ color: 'var(--text3)', fontSize: 9 }}>Obj: {goalBar.target}</span>
            <span style={{ color: 'var(--accent2)', fontSize: 9, fontWeight: 600 }}>{goalBar.pct}%</span>
          </div>
          <div className="goal-bar-bg"><div className="goal-bar-fill" style={{ width: `${goalBar.pct}%` }} /></div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ ctx }) {
  const { trades, accounts, withdrawals } = ctx
  const [checklist, setChecklist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('el_cl') || '[]') } catch { return [] }
  })
  const [sessionOpen, setSessionOpen] = useState(false)
  const [dismissed, setDismissed] = useState([])

  const g = calcMetrics(trades)
  const qTrades = trades.filter(isQuality)
  const gQ = calcMetrics(qTrades)
  const streaks = calcStreaks(trades)
  const goals = calcDynamicGoals(trades)
  const alerts = calcDeteriorationAlerts(trades, accounts)
  const active = accounts.filter(a => !['completed', 'closed', 'perdida'].includes(a.status))
  const [eqAcc, setEqAcc] = useState('all')
  const [eqUnit, setEqUnit] = useState('R')
  const eqTrades = eqAcc === 'all' ? trades : trades.filter(t => String(t.cid) === String(eqAcc))
  const equityData = buildEquityCurve(eqTrades, eqUnit)
  const eqSuffix = eqUnit === 'R' ? 'R' : '%'
  const eqDD = calcMaxDD(eqTrades, eqUnit)
  const funded = calcFundedSummary(trades, accounts)
  const evals = calcEvaluationStats(accounts)
  const visibleAlerts = alerts.filter((_, i) => !dismissed.includes(i))

  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const todayTrades = trades.filter(t => t.fecha === today)
  const todayMetrics = calcMetrics(todayTrades)
  const todayPnl = todayMetrics.rSum
  const day = calcDayStatus(trades, today)

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())

  const toggleCL = (i) => {
    const next = checklist.includes(i) ? checklist.filter(x => x !== i) : [...checklist, i]
    setChecklist(next)
    localStorage.setItem('el_cl', JSON.stringify(next))
  }

  function accPnl(a) {
    const te = trades.filter(e => String(e.cid) === String(a.id))
    if (a.type === 'funded') {
      const wds = withdrawals?.[String(a.id)] || []
      const lastWD = [...wds].sort((x, y) => {
        const dx = x.fecha?.split('/').reverse().join('-') || ''
        const dy = y.fecha?.split('/').reverse().join('-') || ''
        return dx > dy ? 1 : dx < dy ? -1 : 0
      }).slice(-1)[0]
      if (!lastWD) return te.reduce((s, e) => s + (e.r_pnl || 0), 0)
      const wdDate = lastWD.fecha?.split('/').reverse().join('-') || ''
      return te.filter(e => {
        const d = e.fecha?.split('/').reverse().join('-') || ''
        return d > wdDate
      }).reduce((s, e) => s + (e.r_pnl || 0), 0)
    }
    return te.reduce((s, e) => s + (e.r_pnl || 0), 0)
  }

  function goalBarData(cur, target) {
    if (cur === null || cur === undefined) return null
    return { target, pct: Math.min(Math.round(cur / target * 100), 100) }
  }

  const lastTrades = [...trades]
    .sort((a, b) => {
      const da = a.fecha?.split('/').reverse().join('-') || ''
      const db = b.fecha?.split('/').reverse().join('-') || ''
      return db > da ? 1 : db < da ? -1 : 0
    })
    .slice(0, 5)

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'var(--text)', lineHeight: 1.1 }}>
            Buenos días, <em style={{ color: 'var(--accent2)', fontStyle: 'italic' }}>{ctx.profile?.name || 'trader'}.</em>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{dateStr}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {todayTrades.length > 0 && (
            <div style={{ textAlign: 'right', padding: '8px 14px', background: 'var(--bg2)', border: `1px solid ${todayPnl >= 0 ? 'var(--green-border)' : 'var(--red-border)'}`, borderRadius: 10 }}>
              <div style={{ fontSize: 9.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 2 }}>Hoy</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: todayPnl >= 0 ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
                {fmtR(todayPnl, 1)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{todayMetrics.w}W · {todayMetrics.l}L</div>
            </div>
          )}
          <button className={`btn btn-sm ${sessionOpen ? 'btn-main' : ''}`} onClick={() => setSessionOpen(!sessionOpen)}>
            {sessionOpen ? '● Sesión abierta' : '○ Sesión cerrada'}
          </button>
        </div>
      </div>

      {/* Alertas con botón de cerrar */}
      {visibleAlerts.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {alerts.map((a, i) => dismissed.includes(i) ? null : (
            <div key={i} className={`alert ${a.level}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{a.msg}</span>
              <button onClick={() => setDismissed(p => [...p, i])}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14, opacity: .7, marginLeft: 12, flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* KPIs principales */}
      <div className="kpi-grid kpi-grid-4">
        <KPICard dark label="Trades" value={g.n} sub={`${g.w}W · ${g.l}L · ${g.be} breakeven`} />
        <KPICard label="Win rate" value={g.wr !== null ? `${g.wr}%` : '—'} sub="sin contar breakeven" pos={g.wr >= 50} neg={g.wr !== null && g.wr < 50} />
        <KPICard label="R acumulado" value={fmtR(g.rSum)} sub={`1R = lo que arriesgás por trade · suma de cuentas ${g.pnl >= 0 ? '+' : ''}${g.pnl.toFixed(2)}%`} pos={g.rSum >= 0} neg={g.rSum < 0} />
        <KPICard label="Expectativa por trade" value={fmtR(g.avgR, 2)} sub={`Profit factor ${g.pf !== null ? g.pf.toFixed(2) : '—'} (en R)`} pos={g.avgR > 0} neg={g.avgR !== null && g.avgR < 0} goalBar={goalBarData(g.pf, goals.pfGoal)} />
      </div>

      <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 14 }}>
        <KPICard gold label="Win rate calidad ✦" value={gQ.wr !== null ? `${gQ.wr}%` : '—'} sub={`${gQ.w}W · ${gQ.l}L · ${qTrades.length} disciplinados`} goalBar={goalBarData(gQ.wr, goals.wrGoal)} />
        <KPICard label="R:R real promedio" value={g.avgRR !== null ? `1:${g.avgRR.toFixed(1)}` : '—'} sub="promedio wins" pos={g.avgRR >= 2} goalBar={goalBarData(g.avgRR, goals.rrGoal)} />
        <KPICard label="Racha actual" value={streaks.cur > 0 ? `${streaks.cur} ${streaks.type === 'Win' ? 'wins' : 'losses'}` : '—'} sub={`Máx wins: ${streaks.maxW} · Máx losses: ${streaks.maxL}`} pos={streaks.type === 'Win' && streaks.cur > 0} neg={streaks.type === 'Loss' && streaks.cur > 0} />
      </div>

      {/* Semáforo de hoy + Cuentas fondeadas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 12, marginBottom: 12 }}>
        <div className="card" style={{ borderColor: day.level === 'stop' ? 'var(--red-border)' : day.level === 'warn' ? 'var(--amber-border)' : 'var(--green-border)' }}>
          <div className="card-title">Semáforo de hoy</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: day.level === 'stop' ? 'var(--red)' : day.level === 'warn' ? 'var(--amber)' : 'var(--green)', boxShadow: '0 0 18px rgba(255,255,255,.08)' }} />
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--text)' }}>
                {day.level === 'stop' ? 'Cortá por hoy' : day.level === 'warn' ? 'Atención' : 'Podés operar'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3, lineHeight: 1.5 }}>{day.msg}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 11, color: 'var(--text3)' }}>
            <span>Trades hoy: <b style={{ color: 'var(--text)' }}>{day.n}</b></span>
            <span>Pérdidas: <b style={{ color: 'var(--text)' }}>{day.losses}</b></span>
            <span>Resultado: <b style={{ color: day.rToday >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtR(day.rToday, 1)}</b></span>
          </div>
        </div>

        <div className="card" style={{ borderColor: 'var(--gold)' }}>
          <div className="card-title">Cuentas fondeadas</div>
          {funded.n === 0
            ? <div className="empty"><p>Todavía sin trades en cuentas fondeadas.</p></div>
            : (<>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: 'var(--gold)', lineHeight: 1 }}>${funded.capital.toLocaleString('es-AR')}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>fondeados · {funded.accounts} cuentas · P&L bruto <b style={{ color: funded.usd >= 0 ? 'var(--green)' : 'var(--red)' }}>{funded.usd >= 0 ? '+' : ''}${funded.usd.toLocaleString('es-AR')}</b></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginTop: 14 }}>
                {[
                  ['Rentabilidad', (funded.pct >= 0 ? '+' : '') + funded.pct + '%', funded.pct >= 0],
                  ['R acumulado', fmtR(funded.m.rSum), funded.m.rSum >= 0],
                  ['Expectativa', fmtR(funded.m.avgR, 2), funded.m.avgR >= 0],
                  ['Win rate', funded.m.wr !== null ? funded.m.wr + '%' : '—', funded.m.wr >= 50],
                  ['Profit factor', funded.m.pf !== null ? funded.m.pf.toFixed(2) : '—', funded.m.pf >= 1],
                ].map(([l, v, ok]) => (
                  <div key={l}>
                    <div style={{ fontSize: 9.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{l}</div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: ok ? 'var(--green)' : 'var(--red)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {funded.perAccount.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)' }}>
                    <span>{a.nombre} · ${a.capital.toLocaleString('es-AR')} · {a.n} trades</span>
                    <span style={{ color: a.pct >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{a.pct >= 0 ? '+' : ''}{a.pct}% · {a.usd >= 0 ? '+' : ''}${a.usd.toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 10 }}>
                Rentabilidad sobre capital inicial, sin interés compuesto · {funded.n} trades en fondeadas · Evaluaciones: {evals.passed} aprobadas · {evals.lost} perdidas · {evals.running} en curso{evals.rate !== null ? ` (${evals.rate}% de aprobación)` : ''}
              </div>
            </>)}
        </div>
      </div>

      {/* Cuentas + Checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="card">
          <div className="card-title">Cuentas activas</div>
          {active.length === 0
            ? <div className="empty"><div className="empty-icon">⚡</div><p>Sin cuentas activas.</p></div>
            : active.slice(0, 6).map(a => {
              const pnl = accPnl(a)
              const obj = a.type === 'funded' ? (a.dd || 5) : (a.objetivo || 8)
              const pct = Math.min(Math.max(pnl / obj * 100, 0), 100)
              const tradesLeft = a.type !== 'funded' && obj > 0
                ? Math.max(0, Math.ceil((obj - pnl) / (parseFloat(a.riesgo || '2') * 2)))
                : null
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 3, height: 30, background: a.type === 'funded' ? 'var(--gold)' : 'var(--accent)', borderRadius: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.nombre}</div>
                      {tradesLeft !== null && pnl < obj && (
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>~{tradesLeft} trades</div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {a.type === 'funded' ? 'Fondeada · ciclo actual' : `${a.fase} · obj ${a.objetivo}%`}
                    </div>
                    <div className="pb" style={{ marginTop: 4 }}>
                      <div className="pf" style={{ width: `${Math.abs(pct)}%`, background: pnl >= 0 ? 'var(--green)' : 'var(--red)' }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, fontWeight: 600, color: pnl >= 0 ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%
                  </div>
                </div>
              )
            })}
        </div>

        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Checklist pre-sesión</span>
            <button className="btn btn-sm" onClick={() => { setChecklist([]); localStorage.removeItem('el_cl') }} style={{ fontSize: 10 }}>Reiniciar</button>
          </div>
          {CHECKLIST_ITEMS.map((item, i) => (
            <div key={i} className="cl-item" onClick={() => toggleCL(i)}>
              <div className={`cl-box ${checklist.includes(i) ? 'checked' : ''}`}>{checklist.includes(i) && '✓'}</div>
              <span className={`cl-text ${checklist.includes(i) ? 'done' : ''}`}>{item}</span>
            </div>
          ))}
          <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 8, textAlign: 'center' }}>
            {checklist.length}/{CHECKLIST_ITEMS.length} completados
          </div>
        </div>
      </div>

      {/* Equity curve */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">Equity curve — {eqAcc === 'all' ? 'suma de todas las cuentas' : 'cuenta seleccionada'} ({eqUnit === 'R' ? 'en R' : 'en % de cuenta'})</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <select value={eqAcc} onChange={e => setEqAcc(e.target.value)} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
            <option value="all">Todas las cuentas (suma)</option>
            {accounts.filter(a => trades.some(t => String(t.cid) === String(a.id))).map(a => <option key={a.id} value={String(a.id)}>{a.nombre} · {a.type === 'funded' ? 'fondeada' : 'challenge'} · {a.status}</option>)}
          </select>
          <button className="btn btn-sm" onClick={() => setEqUnit(eqUnit === 'R' ? 'pct' : 'R')}>Ver en {eqUnit === 'R' ? '%' : 'R'}</button>
          <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>Drawdown máx. {eqAcc === 'all' ? '(peor cuenta)' : ''}: {eqDD}{eqSuffix}</span>
        </div>
        {equityData.length <= 1
          ? <div className="empty"><div className="empty-icon">∿</div><p>Sin datos aún.</p></div>
          : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="pnlGradDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + eqSuffix} />
                <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + eqSuffix, 'Acumulado']} labelStyle={{ color: '#60A5FA', fontWeight: 600 }} />
                <Area type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2} fill="url(#pnlGradDash)" dot={false} activeDot={{ r: 5, fill: '#60A5FA', stroke: '#111827', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
      </div>

      {/* Últimas entradas */}
      <div className="card">
        <div className="card-title">Últimas entradas</div>
        {lastTrades.length === 0
          ? <div className="empty"><p>Sin entradas.</p></div>
          : lastTrades.map(t => {
            const q = isQuality(t)
            const dotColor = t.resultado === 'Win' ? 'var(--green)' : t.resultado === 'Loss' ? 'var(--red)' : 'var(--amber)'
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{t.fecha} · {t.c_nombre}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{t.par} · {t.risk} · R:{t.rr_real || t.rr || '—'} · {t.plan}</div>
                </div>
                <span style={{ fontSize: 11, color: q ? 'var(--green)' : 'var(--red)' }}>{q ? '✦' : '⚠'}</span>
                {t.r_pnl !== 0 && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.r_pnl > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {t.r_pnl > 0 ? '+' : ''}{t.r_pnl?.toFixed(2)}%
                  </span>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
