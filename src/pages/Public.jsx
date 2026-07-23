import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicData } from '../lib/sync'
import { calcMetrics, isQuality, calcSharpe, calcSortino, calcCalmar, calcEdgeRatio, calcExpectancy, calcConsistency, calcAUM, buildEquityCurve, calcStreaks } from '../lib/metrics'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

const tip = { background: '#0F1828', border: '1px solid #1E3A5F', borderRadius: 10, fontSize: 11, color: '#E2E8F0', padding: '10px 14px' }

function StatCard({ label, value, desc, color, sub, badge }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #0D1B2E, #111827)', border: '1px solid #1E2A3A', borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: color || '#3B82F6', borderRadius: '14px 0 0 14px' }} />
      <div style={{ fontSize: 9.5, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: color || '#E2E8F0', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#4A6080', marginBottom: 6 }}>{sub}</div>}
      {badge && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,.15)', color: '#60A5FA', fontSize: 10, fontWeight: 600, border: '1px solid rgba(59,130,246,.2)', marginBottom: 6 }}>{badge}</span>}
      <div style={{ fontSize: 10.5, color: '#4A6080', lineHeight: 1.6, borderTop: '1px solid #1A2235', paddingTop: 8, marginTop: 4 }}>{desc}</div>
    </div>
  )
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 16, marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 3, height: 20, background: '#3B82F6', borderRadius: 3 }} />
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: '#E2E8F0' }}>{children}</div>
      </div>
      {sub && <div style={{ fontSize: 12, color: '#4A6080', marginTop: 4, paddingLeft: 15 }}>{sub}</div>}
    </div>
  )
}

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0B0F17', color: '#EF4444', fontSize: 14 }}>{error || 'Perfil no encontrado.'}</div>
  )

  const { profile, accounts, trades } = data
  const g = calcMetrics(trades)
  const qTrades = trades.filter(isQuality)
  const gQ = calcMetrics(qTrades)
  const sharpe = calcSharpe(trades)
  const sortino = calcSortino(trades)
  const calmar = calcCalmar(trades)
  const edge = calcEdgeRatio(trades)
  const exp = calcExpectancy(trades)
  const cons = calcConsistency(trades)
  const streaks = calcStreaks(trades)
  const aum = calcAUM(accounts, trades, {})
  const equityData = buildEquityCurve(trades)
  const violated = trades.filter(e => !isQuality(e))
  const potentialPnl = parseFloat((g.pnl - violated.reduce((s, e) => s + (e.r_pnl || 0), 0)).toFixed(2))
  const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })

  const dates = trades.map(e => e.fecha).filter(Boolean).sort()
  const firstDate = dates[0] ? new Date(dates[0].split('/').reverse().join('-')) : null
  const spanDays = firstDate ? Math.round((new Date() - firstDate) / 86400000) : 0

  const planData = ['100% exacto','Parcialmente','No cumplía'].map(plan => {
    const arr = trades.filter(e => e.plan === plan)
    const g2 = calcMetrics(arr)
    return { name: plan, trades: arr.length, wr: g2.wr || 0, pnl: parseFloat(g2.pnl.toFixed(2)) }
  })

  const monthMap = {}
  trades.forEach(t => {
    const d = t.fecha?.split('/')
    if (!d || d.length < 3) return
    const k = `${d[2]}-${d[1]}`
    if (!monthMap[k]) monthMap[k] = []
    monthMap[k].push(t)
  })
  const monthlyData = Object.keys(monthMap).sort().map(k => {
    const g2 = calcMetrics(monthMap[k])
    const mn = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return { name: mn[parseInt(k.split('-')[1]) - 1], pnl: parseFloat(g2.pnl.toFixed(2)) }
  })

  const ratingColor = (v, good, great) => v >= great ? '#22C55E' : v >= good ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F17', fontFamily: "'DM Sans',system-ui,sans-serif", color: '#E2E8F0' }}>

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(135deg, #060D1F 0%, #0A1628 40%, #0F1E38 100%)', borderBottom: '1px solid #1E3A5F', padding: '48px 60px 52px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,.04) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.25)', marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
            <span style={{ fontSize: 11, color: '#60A5FA', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>Track Record Verificado · {dateStr}</span>
          </div>

          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 44, color: '#fff', lineHeight: 1, marginBottom: 6 }}>
            Edge<em style={{ color: '#60A5FA', fontStyle: 'italic' }}>Log</em>
          </div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: 'rgba(96,165,250,.65)', marginBottom: 6 }}>{profile.name || 'Trader'}</div>
          <div style={{ fontSize: 13, color: '#4A6080', marginBottom: 36 }}>
            {profile.metodologia || 'Smart Money Concepts'} · {profile.par || 'EURUSD'} · {profile.sesion || 'Londres / NY'} · {spanDays} días operando
          </div>

          {/* Hero stats */}
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
            {[
              { label: 'Retorno total', value: (g.pnl >= 0 ? '+' : '') + g.pnl.toFixed(2) + '%', color: g.pnl >= 0 ? '#22C55E' : '#EF4444', big: true },
              { label: 'Win rate', value: g.wr !== null ? g.wr + '%' : '—', color: g.wr >= 50 ? '#22C55E' : '#EF4444' },
              { label: 'WR disciplinado ✦', value: gQ.wr !== null ? gQ.wr + '%' : '—', color: '#EAB308' },
              { label: 'Prof. Factor', value: g.pf !== null ? g.pf.toFixed(2) : '—', color: g.pf >= 1.5 ? '#22C55E' : '#F59E0B' },
              { label: 'Trades', value: String(g.tr), color: '#E2E8F0' },
              { label: 'Capital activo', value: '$' + aum.total.toLocaleString(), color: '#60A5FA' },
            ].map(({ label, value, color, big }, i) => (
              <div key={label} style={{ paddingRight: 36, marginRight: 36, borderRight: i < 5 ? '1px solid rgba(255,255,255,.07)' : 'none', marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'rgba(96,165,250,.4)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 5 }}>{label}</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: big ? 44 : 28, color, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div style={{ marginTop: 24, padding: '14px 18px', background: 'rgba(255,255,255,.04)', borderRadius: 10, borderLeft: '3px solid #3B82F6', fontSize: 13, color: '#94A3B8', lineHeight: 1.7, maxWidth: 700 }}>
              {profile.bio}
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 60px 80px' }}>

        {/* Equity curve */}
        <SectionTitle sub="Evolución del P&L acumulado desde el primer trade. Cada punto representa el cierre de una operación.">
          Equity Curve
        </SectionTitle>
        <div style={{ background: 'linear-gradient(135deg, #0D1B2E, #111827)', border: '1px solid #1E2A3A', borderRadius: 16, padding: '20px 24px', marginBottom: 8 }}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="pnlGradPub2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.03)" />
              <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
              <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L acum.']} labelStyle={{ color: '#60A5FA', fontWeight: 600 }} />
              <Area type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2.5} fill="url(#pnlGradPub2)" dot={false} activeDot={{ r: 5, fill: '#60A5FA', stroke: '#0B0F17', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 11, color: '#4A6080', marginBottom: 8 }}>
          <span>🟢 {g.w} operaciones ganadoras</span>
          <span>🔴 {g.l} operaciones perdedoras</span>
          <span>🟡 {trades.filter(t => t.resultado === 'Breakeven').length} breakeven</span>
          <span>📅 {spanDays} días de historial</span>
        </div>

        {/* Métricas de rendimiento */}
        <SectionTitle sub="Indicadores clave que miden la calidad y consistencia de la operativa.">
          Métricas de rendimiento
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 6 }}>
          <StatCard
            label="Profitability Factor"
            value={g.pf !== null ? g.pf.toFixed(2) : '—'}
            color={g.pf >= 1.5 ? '#22C55E' : g.pf >= 1 ? '#F59E0B' : '#EF4444'}
            sub={g.pf >= 1.5 ? 'Excelente' : g.pf >= 1 ? 'Positivo' : 'Negativo'}
            desc="Relación entre ganancias brutas y pérdidas brutas. Un PF mayor a 1.5 indica que el sistema genera más de $1.50 por cada $1 perdido. Considerado sólido desde 1.5 y excelente sobre 2.0."
          />
          <StatCard
            label="Win Rate Global"
            value={g.wr !== null ? g.wr + '%' : '—'}
            color={g.wr >= 50 ? '#22C55E' : '#EF4444'}
            sub={`${g.w}W · ${g.l}L · ${g.tr} trades`}
            desc="Porcentaje de operaciones cerradas con ganancia sobre el total de operaciones. Un WR alto por sí solo no garantiza rentabilidad; importa combinarlo con el R:R."
          />
          <StatCard
            label="WR Disciplinado ✦"
            value={gQ.wr !== null ? gQ.wr + '%' : '—'}
            color="#EAB308"
            sub={`${qTrades.length} trades con plan completo`}
            desc="Win rate calculado solo sobre operaciones donde se respetó el plan de trading, se operó con calma y sin sobreoperar. Refleja el potencial real del sistema cuando se ejecuta correctamente."
          />
          <StatCard
            label="R:R Real Promedio"
            value={g.avgRR !== null ? '1:' + g.avgRR.toFixed(2) : '—'}
            color={g.avgRR >= 2 ? '#22C55E' : g.avgRR >= 1.5 ? '#F59E0B' : '#EF4444'}
            sub="sobre operaciones ganadoras"
            desc="Risk:Reward real obtenido promediando los wins. Indica cuántas veces el profit supera al riesgo asumido en operaciones exitosas. Un R:R de 1:2 significa que gana el doble de lo que arriesga."
          />
          <StatCard
            label="Expectancy por Trade"
            value={exp !== null ? (exp > 0 ? '+' : '') + exp + '%' : '—'}
            color={exp > 0 ? '#22C55E' : '#EF4444'}
            sub={exp > 0 ? 'Sistema con edge positivo' : 'Sistema sin edge'}
            desc="Ganancia o pérdida promedio esperada por cada operación, combinando WR y R:R. Si es positiva, el sistema tiene ventaja estadística y es rentable a largo plazo."
          />
          <StatCard
            label="Consistencia mensual"
            value={cons.pct !== null ? cons.pct + '%' : '—'}
            color={cons.pct >= 70 ? '#22C55E' : cons.pct >= 50 ? '#F59E0B' : '#EF4444'}
            sub={`${cons.months.filter(m => m.positive).length} de ${cons.months.length} meses positivos`}
            desc="Porcentaje de meses cerrados en positivo. Una consistencia alta (>70%) indica que el sistema genera resultados estables mes a mes, no solo esporádicamente."
          />
        </div>

        {/* Ratios avanzados */}
        <SectionTitle sub="Ratios estadísticos utilizados por fondos profesionales para evaluar estrategias.">
          Ratios estadísticos avanzados
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 6 }}>
          <StatCard
            label="Sharpe Ratio"
            value={sharpe !== null ? sharpe : '—'}
            color={ratingColor(sharpe, 0.5, 1.5)}
            badge={sharpe >= 2 ? 'Excelente' : sharpe >= 1 ? 'Bueno' : sharpe >= 0 ? 'Regular' : 'Negativo'}
            desc="Mide el retorno ajustado por riesgo total (volatilidad). Compara el retorno promedio con la desviación estándar de los retornos. Mayor a 1 es aceptable, mayor a 2 es excelente para trading discrecional."
          />
          <StatCard
            label="Sortino Ratio"
            value={sortino !== null ? sortino : '—'}
            color={ratingColor(sortino, 0.5, 1.5)}
            badge={sortino >= 2 ? 'Excelente' : sortino >= 1 ? 'Sólido' : sortino >= 0 ? 'Regular' : 'Negativo'}
            desc="Similar al Sharpe pero solo penaliza la volatilidad negativa (pérdidas), ignorando la volatilidad positiva. Es más relevante para traders porque subidas grandes no son un riesgo real. Mayor a 1 es sólido."
          />
          <StatCard
            label="Calmar Ratio"
            value={calmar !== null ? calmar : '—'}
            color={ratingColor(calmar, 0.5, 1.5)}
            badge={calmar >= 2 ? 'Excelente' : calmar >= 1 ? 'Sólido' : 'Bajo'}
            desc="Relación entre el retorno total acumulado y el peor drawdown histórico. Indica cuánto se gana en relación a la peor caída sufrida. Un Calmar mayor a 1 significa que el sistema recupera más de lo que cae."
          />
          <StatCard
            label="Edge Ratio"
            value={edge !== null ? edge + '%' : '—'}
            color={edge >= 90 ? '#22C55E' : edge >= 75 ? '#F59E0B' : '#EF4444'}
            badge={edge >= 90 ? 'Ejecución perfecta' : edge >= 75 ? 'Buena ejecución' : 'Mejorable'}
            desc="Mide la eficiencia de ejecución: qué porcentaje del R:R objetivo se captura en promedio en los trades ganadores. Un 80% significa que si el objetivo es 1:2, el promedio real obtenido es 1:1.6."
          />
          <StatCard
            label="Racha actual"
            value={streaks.cur > 0 ? `${streaks.cur} ${streaks.type === 'Win' ? 'wins' : 'losses'}` : '—'}
            color={streaks.type === 'Win' ? '#22C55E' : '#EF4444'}
            sub={`Máx wins: ${streaks.maxW} · Máx losses: ${streaks.maxL}`}
            desc="Rachas consecutivas de resultados. Las rachas positivas largas demuestran consistencia del sistema. Las rachas negativas máximas son relevantes para evaluar la resiliencia psicológica del trader."
          />
          <StatCard
            label="Capital gestionado"
            value={'$' + aum.total.toLocaleString()}
            color="#60A5FA"
            sub={`${aum.activeCount} cuentas activas · ${aum.completedCount} completadas`}
            desc="Total de capital operado activamente en cuentas de prop firms. Refleja la confianza de las firmas en el trader y su capacidad de gestionar múltiples cuentas simultáneamente."
          />
        </div>

        {/* Real vs Potencial */}
        <SectionTitle sub="Comparación entre el resultado real y el potencial del sistema operando con disciplina perfecta.">
          Sistema real vs potencial
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid #1E2A3A', marginBottom: 6 }}>
          <div style={{ padding: '28px 32px', background: 'linear-gradient(135deg, #0D1B2E, #111827)' }}>
            <div style={{ fontSize: 10, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10, fontWeight: 600 }}>Resultado real obtenido</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 48, color: g.pnl >= 0 ? '#22C55E' : '#EF4444', lineHeight: 1, marginBottom: 8 }}>{g.pnl >= 0 ? '+' : ''}{g.pnl.toFixed(2)}%</div>
            <div style={{ fontSize: 12, color: '#4A6080' }}>{g.tr} operaciones · {violated.length} fuera de plan incluidas</div>
          </div>
          <div style={{ padding: '28px 32px', background: 'linear-gradient(135deg, #0F2040, #1A3060)', borderLeft: '1px solid #1E3A5F' }}>
            <div style={{ fontSize: 10, color: 'rgba(96,165,250,.6)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10, fontWeight: 600 }}>Potencial del sistema ✦</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 48, color: '#E2E8F0', lineHeight: 1, marginBottom: 8 }}>{potentialPnl >= 0 ? '+' : ''}{potentialPnl.toFixed(2)}%</div>
            <div style={{ fontSize: 12, color: 'rgba(96,165,250,.5)' }}>Solo operaciones con plan 100% respetado</div>
          </div>
          <div style={{ gridColumn: '1/-1', background: '#1A1400', borderTop: '1px solid #92400E', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 500 }}>Brecha por indisciplina — {violated.length} trades fuera de plan</div>
              <div style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>Cada trade fuera de plan tiene un costo estadístico comprobable.</div>
            </div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: '#F59E0B' }}>{parseFloat((potentialPnl - g.pnl).toFixed(2)) >= 0 ? '+' : ''}{parseFloat((potentialPnl - g.pnl).toFixed(2))}%</div>
          </div>
        </div>

        {/* P&L mensual */}
        <SectionTitle sub="Resultado neto de cada mes. La consistencia de meses positivos es más valiosa que meses extraordinarios aislados.">
          Resultados mensuales
        </SectionTitle>
        <div style={{ background: 'linear-gradient(135deg, #0D1B2E, #111827)', border: '1px solid #1E2A3A', borderRadius: 16, padding: '20px 24px', marginBottom: 6 }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
              <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L mensual']} />
              <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                {monthlyData.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#22C55E' : '#EF4444'} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan adherence */}
        <SectionTitle sub="Análisis de win rate segmentado por el nivel de cumplimiento del plan de trading en cada operación.">
          Disciplina y adherencia al plan
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 6 }}>
          {planData.map(d => {
            const color = d.name === '100% exacto' ? '#22C55E' : d.name === 'Parcialmente' ? '#F59E0B' : '#EF4444'
            return (
              <div key={d.name} style={{ background: 'linear-gradient(135deg, #0D1B2E, #111827)', border: `1px solid ${color}33`, borderRadius: 14, padding: '20px' }}>
                <div style={{ fontSize: 10, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 10 }}>{d.name}</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 36, color, lineHeight: 1, marginBottom: 4 }}>{d.wr}%</div>
                <div style={{ fontSize: 11, color: '#4A6080', marginBottom: 12 }}>Win rate · {d.trades} trades · {d.pnl >= 0 ? '+' : ''}{d.pnl.toFixed(2)}%</div>
                <div style={{ height: 4, background: '#1A2235', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: 4, borderRadius: 10, width: `${d.wr}%`, background: color, opacity: .85 }} />
                </div>
                <div style={{ fontSize: 10.5, color: '#4A6080', marginTop: 10, lineHeight: 1.6 }}>
                  {d.name === '100% exacto' ? 'Trades donde el setup cumplía todos los criterios del sistema y se ejecutó sin desviaciones.' :
                   d.name === 'Parcialmente' ? 'Setup válido pero con alguna desviación en la ejecución (entrada anticipada, salida prematura, etc.).' :
                   'Trades tomados fuera del plan, por impulso o condiciones que no cumplían los criterios del sistema.'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Account ledger */}
        <SectionTitle sub="Historial completo por cuenta, incluyendo estado actual, capital gestionado y rendimiento individual.">
          Track record por cuenta
        </SectionTitle>
        <div style={{ background: 'linear-gradient(135deg, #0D1B2E, #111827)', border: '1px solid #1E2A3A', borderRadius: 16, overflow: 'hidden', marginBottom: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#0A1628' }}>
                {['Cuenta','Firma','Tipo','Estado','Capital','Trades','Win rate','P&L'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 9.5, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, borderBottom: '1px solid #1E2A3A' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.filter(a => trades.filter(e => String(e.cid) === String(a.id)).length > 0).map((a, idx) => {
                const te = trades.filter(e => String(e.cid) === String(a.id))
                const gA = calcMetrics(te)
                const stLabel = a.status === 'completed' ? '✓ Completada' : a.status === 'perdida' ? '✕ Perdida' : '● Activa'
                const stColor = a.status === 'completed' ? '#60A5FA' : a.status === 'perdida' ? '#EF4444' : '#22C55E'
                const isF = a.type === 'funded'
                return (
                  <tr key={a.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#E2E8F0', borderBottom: '1px solid #1A2235' }}>{a.nombre}</td>
                    <td style={{ padding: '12px 16px', color: '#94A3B8', borderBottom: '1px solid #1A2235' }}>{a.firma}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #1A2235' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: isF ? 'rgba(234,179,8,.1)' : 'rgba(59,130,246,.1)', color: isF ? '#EAB308' : '#60A5FA', fontSize: 10, fontWeight: 600 }}>
                        {isF ? 'Fondeada' : a.fase || 'Challenge'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #1A2235' }}>
                      <span style={{ color: stColor, fontWeight: 600, fontSize: 11 }}>{stLabel}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94A3B8', borderBottom: '1px solid #1A2235' }}>${(a.capital || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: '#94A3B8', borderBottom: '1px solid #1A2235' }}>{te.length}</td>
                    <td style={{ padding: '12px 16px', color: gA.wr >= 50 ? '#22C55E' : '#EF4444', fontWeight: 700, borderBottom: '1px solid #1A2235' }}>{gA.wr !== null ? gA.wr + '%' : '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: gA.pnl >= 0 ? '#22C55E' : '#EF4444', borderBottom: '1px solid #1A2235' }}>{gA.pnl >= 0 ? '+' : ''}{gA.pnl.toFixed(2)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, padding: '24px 28px', background: 'linear-gradient(135deg, #0D1B2E, #111827)', borderRadius: 14, border: '1px solid #1E2A3A' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: '#E2E8F0', marginBottom: 4 }}>
                Edge<em style={{ color: '#60A5FA', fontStyle: 'italic' }}>Log</em>
              </div>
              <div style={{ fontSize: 11.5, color: '#4A6080', lineHeight: 1.7 }}>
                Track record generado automáticamente. Cada operación incluye trazabilidad completa:<br />fecha, cuenta, riesgo arriesgado, resultado, estado emocional y cumplimiento del plan.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#4A6080' }}>Generado el {dateStr}</div>
              <div style={{ fontSize: 11, color: '#4A6080', marginTop: 2 }}>{g.tr} operaciones · {spanDays} días de historial</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
