import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { calcMetrics, isQuality, calcStreaks, calcDynamicGoals, calcDeteriorationAlerts, buildEquityCurve } from '../lib/metrics'

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
  const { trades, accounts } = ctx
  const [checklist, setChecklist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('el_cl') || '[]') } catch { return [] }
  })
  const [sessionOpen, setSessionOpen] = useState(false)

  const g = calcMetrics(trades)
  const qTrades = trades.filter(isQuality)
  const gQ = calcMetrics(qTrades)
  const streaks = calcStreaks(trades)
  const goals = calcDynamicGoals(trades)
  const alerts = calcDeteriorationAlerts(trades, accounts)
  const active = accounts.filter(a => !['completed', 'closed', 'perdida'].includes(a.status))
  const equityData = buildEquityCurve(trades)

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())

  const toggleCL = (i) => {
    const next = checklist.includes(i) ? checklist.filter(x => x !== i) : [...checklist, i]
    setChecklist(next)
    localStorage.setItem('el_cl', JSON.stringify(next))
  }

  function accPnl(a) {
    return trades.filter(e => String(e.cid) === String(a.id)).reduce((s, e) => s + (e.r_pnl || 0), 0)
  }

  function goalBarData(cur, target) {
    if (cur === null || cur === undefined) return null
    return { target, pct: Math.min(Math.round(cur / target * 100), 100) }
  }

  // Últimas 5 entradas ordenadas por fecha más reciente
  const lastTrades = [...trades]
    .sort((a, b) => {
      const da = a.fecha?.split('/').reverse().join('-') || ''
      const db = b.fecha?.split('/').reverse().join('-') || ''
      return db > da ? 1 : db < da ? -1 : 0
    })
    .slice(0, 5)

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'var(--text)', lineHeight: 1.1 }}>
            Buenos días, <em style={{ color: 'var(--accent2)', fontStyle: 'italic' }}>{ctx.profile?.name || 'trader'}.</em>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{dateStr}</div>
        </div>
        <button className={`btn btn-sm ${sessionOpen ? 'btn-main' : ''}`} onClick={() => setSessionOpen(!sessionOpen)}>
          {sessionOpen ? '● Sesión abierta' : '○ Sesión cerrada'}
        </button>
      </div>

      {alerts.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {alerts.map((a, i) => <div key={i} className={`alert ${a.level}`}>{a.msg}</div>)}
        </div>
      )}

      <div className="kpi-grid kpi-grid-4">
        <KPICard dark label="Trades totales" value={g.tr} sub={`${trades.length} entradas en diario`} />
        <KPICard label="Win rate" value={g.wr !== null ? `${g.wr}%` : '—'} sub={`${g.w}W · ${g.l}L`} pos={g.wr >= 50} neg={g.wr !== null && g.wr < 50} />
        <KPICard label="P&L total" value={g.pnl >= 0 ? `+${g.pnl.toFixed(2)}%` : `${g.pnl.toFixed(2)}%`} sub="todas las cuentas" pos={g.pnl >= 0} neg={g.pnl < 0} />
        <KPICard label="Profitability Factor" value={g.pf !== null ? g.pf.toFixed(2) : '—'} sub={g.pf >= 1.5 ? 'Sólido ✓' : g.pf >= 1 ? 'Positivo' : 'Por debajo de 1'} pos={g.pf >= 1.5} neg={g.pf !== null && g.pf < 1} goalBar={goalBarData(g.pf, goals.pfGoal)} />
      </div>

      <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 14 }}>
        <KPICard gold label="Win rate calidad ✦" value={gQ.wr !== null ? `${gQ.wr}%` : '—'} sub={`${gQ.w}W · ${gQ.l}L · ${qTrades.length} disciplinados`} goalBar={goalBarData(g.wr, goals.wrGoal)} />
        <KPICard label="R:R real promedio" value={g.avgRR !== null ? `1:${g.avgRR.toFixed(1)}` : '—'} sub="promedio wins" pos={g.avgRR >= 2} goalBar={goalBarData(g.avgRR, goals.rrGoal)} />
        <KPICard label="Racha actual" value={streaks.cur > 0 ? `${streaks.cur} ${streaks.type === 'Win' ? 'wins' : 'losses'}` : '—'} sub={`Máx wins: ${streaks.maxW} · Máx losses: ${streaks.maxL}`} pos={streaks.type === 'Win' && streaks.cur > 0} neg={streaks.type === 'Loss' && streaks.cur > 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="card">
          <div className="card-title">Cuentas activas</div>
          {active.length === 0 ? <div className="empty"><div className="empty-icon">⚡</div><p>Sin cuentas activas.</p></div>
            : active.slice(0, 5).map(a => {
              const pnl = accPnl(a)
              const obj = a.type === 'funded' ? (a.dd || 5) : (a.objetivo || 8)
              const pct = Math.min(Math.max(pnl / obj * 100, 0), 100)
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 3, height: 30, background: a.type === 'funded' ? 'var(--gold)' : 'var(--accent)', borderRadius: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.nombre}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{a.firma} · {a.fase || 'Fondeada'}</div>
                    <div className="pb" style={{ marginTop: 4 }}>
                      <div className="pf" style={{ width: `${pct}%`, background: pnl >= 0 ? 'var(--green)' : 'var(--red)' }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, fontWeight: 600, color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
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
          <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 8, textAlign: 'center' }}>{checklist.length}/{CHECKLIST_ITEMS.length} completados</div>
        </div>
      </div>

      {/* Equity curve */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">Equity curve — P&L acumulado</div>
        {equityData.length <= 1 ? <div className="empty"><div className="empty-icon">∿</div><p>Sin datos aún.</p></div> : (
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
              <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
              <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L acum.']} labelStyle={{ color: '#60A5FA', fontWeight: 600 }} />
              <Area type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2} fill="url(#pnlGradDash)" dot={false} activeDot={{ r: 5, fill: '#60A5FA', stroke: '#111827', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Últimas 5 entradas — ordenadas por fecha */}
      <div className="card">
        <div className="card-title">Últimas entradas</div>
        {lastTrades.length === 0 ? <div className="empty"><p>Sin entradas.</p></div> :
          lastTrades.map(t => {
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
                {t.r_pnl !== 0 && <span style={{ fontSize: 13, fontWeight: 600, color: t.r_pnl > 0 ? 'var(--green)' : 'var(--red)' }}>{t.r_pnl > 0 ? '+' : ''}{t.r_pnl?.toFixed(2)}%</span>}
              </div>
            )
          })}
      </div>
    </div>
  )
}
