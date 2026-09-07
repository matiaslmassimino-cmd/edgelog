import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { calcMetrics, isQuality, calcSortino, calcEdgeRatio, calcMonthlyStats, calcStreakDistribution, calcMaxDD } from '../lib/metrics'

const tip = { background: '#1A2235', border: '1px solid #2A3A52', borderRadius: 8, fontSize: 11, color: '#E2E8F0' }

export default function RiskPage({ ctx }) {
  const { trades, accounts } = ctx
  const sortino = calcSortino(trades)
  const monthly = calcMonthlyStats(trades)
  const edge = calcEdgeRatio(trades)
  const streakDist = calcStreakDistribution(trades)
  const activeAccs = accounts.filter(a => !['completed','closed','perdida'].includes(a.status))

  function StreakChart({ dist, color }) {
    const keys = Object.keys(dist).map(Number).sort((a,b) => a - b)
    if (!keys.length) return <div className="empty" style={{ height: 120 }}><p>Sin datos.</p></div>
    const data = keys.map(k => ({ name: k + (k === 1 ? ' trade' : ' trades'), n: dist[k] }))
    return (
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tip} />
          <Bar dataKey="n" name="Veces" fill={color} radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Risk <em>Analytics</em></div>
        <div className="page-sub">Métricas estadísticas avanzadas — el rigor que evalúa un fondo.</div>
      </div>

      <div className="quality-sep">Ratios ajustados por riesgo</div>
      <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <div className="kl">Sortino Ratio</div>
          <div className={`kv ${sortino >= 2 ? 'pos' : sortino < 0 ? 'neg' : ''}`}>{sortino !== null ? sortino : '—'}</div>
          <div className="ks">{sortino !== null ? sortino >= 2 ? 'Excelente' : sortino >= 1 ? 'Sólido' : sortino >= 0 ? 'Regular' : 'Negativo' : 'solo penaliza volatilidad negativa'}</div>
        </div>
        <div className="kpi">
          <div className="kl">Retorno mensual promedio</div>
          <div className={`kv ${monthly.avg >= 0 ? 'pos' : 'neg'}`}>{monthly.avg !== null ? (monthly.avg >= 0 ? '+' : '') + monthly.avg + '%' : '—'}</div>
          <div className="ks">{monthly.months.length} meses · σ ±{monthly.std !== null ? monthly.std : '—'}%</div>
        </div>
        <div className="kpi">
          <div className="kl">Desviación estándar mensual</div>
          <div className="kv">{monthly.std !== null ? '±' + monthly.std + '%' : '—'}</div>
          <div className="ks">menor es más predecible</div>
        </div>
      </div>

      <div className="quality-sep">Edge Ratio — eficiencia de ejecución</div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 48, color: 'var(--text)', lineHeight: 1 }}>{edge !== null ? edge + '%' : '—'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8 }}>
              {edge !== null ? `Capturás el ${edge}% de tu R:R objetivo. ${edge >= 90 ? 'Ejecución casi perfecta.' : edge >= 75 ? 'Buena ejecución, con margen de mejora.' : 'Estás cerrando por debajo de tu objetivo — revisá si tomás parciales por ansiedad.'}` : 'Sin datos suficientes.'}
            </div>
            <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: 5, borderRadius: 10, width: `${edge || 0}%`, background: edge >= 90 ? 'var(--green)' : edge >= 75 ? 'var(--amber)' : 'var(--red)', transition: 'width .5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>
              <span>0%</span><span>Objetivo: 85%+</span><span>100%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="quality-sep">Distribución de rachas</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <div className="card">
          <div className="card-title">Rachas de victorias</div>
          <StreakChart dist={streakDist.wins} color="#22C55E" />
        </div>
        <div className="card">
          <div className="card-title">Rachas de pérdidas</div>
          <StreakChart dist={streakDist.losses} color="#EF4444" />
        </div>
      </div>

      <div className="quality-sep">Drawdown operacional por cuenta</div>
      <div className="card">
        {!activeAccs.length ? <div className="empty"><p>Sin cuentas activas.</p></div> :
          activeAccs.map(a => {
            const at = trades.filter(e => String(e.cid) === String(a.id))
            const maxDD = calcMaxDD(at)
            const ddLim = a.dd || 5
            const ddPct = ddLim > 0 ? Math.min(Math.round(maxDD / ddLim * 100), 100) : 0
            const ddCol = ddPct > 80 ? 'var(--red)' : ddPct > 55 ? 'var(--amber)' : 'var(--green)'
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 140, flexShrink: 0, fontSize: 12.5, color: 'var(--text2)', fontWeight: 500 }}>
                  {a.nombre} <span style={{ fontSize: 10, color: 'var(--text3)' }}>({a.firma})</span>
                </div>
                <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: 6, borderRadius: 10, width: `${ddPct}%`, background: ddCol, transition: 'width .4s' }} />
                </div>
                <div style={{ width: 50, textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: ddCol }}>{ddPct}%</div>
                <div style={{ width: 80, textAlign: 'right', fontSize: 11, color: 'var(--text3)' }}>{maxDD.toFixed(2)}% / {ddLim}%</div>
              </div>
            )
          })
        }
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12 }}>% del drawdown máximo permitido consumido en el peor momento histórico de cada cuenta.</div>
      </div>
    </div>
  )
}
