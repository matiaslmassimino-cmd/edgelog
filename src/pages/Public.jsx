import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicDataBySlug } from '../lib/sync'
import { rOf, calcMetrics, isQuality, calcExpectancyCI, calcExecutionSplit, fmtR, calcMaxDD, calcFundedSummary, calcFundedGrowth, calcEvaluationStats, calcConsistency, buildEquityCurve, calcStreaks, calcSetups, parseFecha } from '../lib/metrics'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

const C = { bg: '#0B0F17', card: '#111827', line: '#1E2A3A', mute: '#4A6080', text: '#E2E8F0', soft: '#94A3B8', blue: '#3B82F6', blueL: '#60A5FA', gold: '#FBBF24', green: '#22C55E', red: '#EF4444', amber: '#F59E0B' }
const serif = "'DM Serif Display',serif"
const tip = { background: '#0F1828', border: '1px solid #1E3A5F', borderRadius: 10, fontSize: 11, color: C.text, padding: '10px 14px' }
const sgn = (v, d = 1) => (v >= 0 ? '+' : '') + Number(v).toFixed(d)

function Section({ title, sub, children }) {
  return (
    <section style={{ marginTop: 40 }}>
      <div style={{ fontFamily: serif, fontSize: 22, color: C.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: C.mute, margin: '4px 0 16px', lineHeight: 1.6, maxWidth: 680 }}>{sub}</div>}
      {!sub && <div style={{ height: 14 }} />}
      {children}
    </section>
  )
}

function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '18px 20px', ...style }}>{children}</div>
}

function Stat({ label, value, sub, color }) {
  return (
    <Card style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: C.mute, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: serif, fontSize: 26, color: color || C.text, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.mute, lineHeight: 1.4 }}>{sub}</div>}
    </Card>
  )
}

export default function Public() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [page, setPage] = useState(1)
  const perPage = 20

  useEffect(() => {
    if (!slug) { setError('URL inválida.'); setLoading(false); return }
    fetchPublicDataBySlug(slug)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [slug])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, fontFamily: serif, fontSize: 22, color: C.text }}>
      Edge<em style={{ color: C.blueL, fontStyle: 'italic' }}>Log</em>
    </div>
  )
  if (error || !data?.profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, color: C.red, fontSize: 14, padding: 20, textAlign: 'center' }}>{error || 'Perfil no encontrado.'}</div>
  )

  const { profile, accounts, trades } = data
  const g = calcMetrics(trades)
  const ci = calcExpectancyCI(trades)
  const cons = calcConsistency(trades)
  const streaks = calcStreaks(trades)
  const nSetups = calcSetups(trades).length
  const equity = buildEquityCurve(trades, 'R')
  const funded = calcFundedSummary(trades, accounts)
  const growth = calcFundedGrowth(trades, accounts)
  const evals = calcEvaluationStats(accounts)
  const ddR = calcMaxDD(trades, 'R'), ddPct = calcMaxDD(trades)
  const split = calcExecutionSplit(trades)
  const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const dates = trades.map(e => e.fecha).filter(Boolean).sort((a, b) => (parseFecha(a) || 0) - (parseFecha(b) || 0))
  const first = dates[0] ? parseFecha(dates[0]) : null
  const months = first ? Math.max(1, Math.round((new Date() - first) / 2629800000)) : 0

  const mn = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const monthMap = {}
  trades.forEach(t => {
    const d = t.fecha?.split('/')
    if (!d || d.length < 3) return
    const k = `${d[2]}-${d[1]}`
    ;(monthMap[k] = monthMap[k] || []).push(t)
  })
  const monthly = Object.keys(monthMap).sort().map(k => ({ name: mn[parseInt(k.split('-')[1]) - 1], r: parseFloat(calcMetrics(monthMap[k]).rSum.toFixed(1)) }))

  const sorted = [...trades].filter(e => ['Win', 'Loss', 'Breakeven'].includes(e.resultado)).sort((a, b) => (parseFecha(b.fecha) || 0) - (parseFecha(a.fecha) || 0))
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const visible = sorted.slice((page - 1) * perPage, page * perPage)

  const exact = split.exact, rest = split.rest
  const bio = profile.bio
  const hasFunded = funded.n > 0
  const pos = ci && ci.lo >= 0

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans',system-ui,sans-serif", color: C.text }}>
      <style>{`
        .p-wrap{max-width:960px;margin:0 auto;padding:0 24px 72px}
        .p-hero{padding:56px 24px 44px;background:linear-gradient(135deg,#060D1F 0%,#0A1628 45%,#0F1E38 100%);border-bottom:1px solid #1E3A5F}
        .p-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .p-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .p-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media (max-width:700px){
          .p-hero{padding:36px 16px 32px}
          .p-wrap{padding:0 16px 56px}
          .p-grid4,.p-grid3{grid-template-columns:1fr 1fr}
          .p-grid2{grid-template-columns:1fr}
          .p-title{font-size:30px !important}
          .p-big{font-size:34px !important}
        }
      `}</style>

      {/* HERO */}
      <div className="p-hero">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.25)', marginBottom: 18 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
            <span style={{ fontSize: 10, color: C.blueL, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>Track record verificado · {dateStr}</span>
          </div>
          <div className="p-title" style={{ fontFamily: serif, fontSize: 42, color: '#fff', lineHeight: 1.05 }}>{profile.name || 'Trader'}</div>
          <div style={{ fontSize: 14, color: C.soft, marginTop: 8, lineHeight: 1.6 }}>
            Trader de {profile.par || 'EURUSD'} · {profile.metodologia || 'Smart Money Concepts'} · {profile.sesion || 'Londres / NY'}
          </div>
          <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>{months} meses de historial · {g.n} operaciones · {nSetups} setups · registrado en EdgeLog</div>

          <div className="p-grid4" style={{ marginTop: 32 }}>
            {[
              hasFunded && { l: 'Capital fondeado', v: '$' + funded.capital.toLocaleString('es-AR'), s: `${funded.accounts} cuentas activas`, c: C.gold },
              hasFunded && { l: 'Rentabilidad fondeadas', v: sgn(funded.pct, 2) + '%', s: `${funded.usd >= 0 ? '+' : '−'}$${Math.abs(funded.usd).toLocaleString('es-AR')} sobre capital, sin compuesto`, c: funded.pct >= 0 ? C.green : C.red },
              { l: 'Resultado total', v: sgn(g.rSum) + 'R', s: '1R = lo arriesgado por trade', c: g.rSum >= 0 ? C.green : C.red },
              { l: 'Expectativa', v: g.avgR !== null ? sgn(g.avgR, 2) + 'R' : '—', s: 'ganancia media por trade', c: g.avgR > 0 ? C.green : C.red },
            ].filter(Boolean).map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 10, color: 'rgba(96,165,250,.55)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{s.l}</div>
                <div className="p-big" style={{ fontFamily: serif, fontSize: 38, color: s.c, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 11, color: C.mute, marginTop: 6, lineHeight: 1.4 }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-wrap">
        {/* Resumen */}
        <Section title="En una frase">
          <Card>
            <div style={{ fontSize: 15, color: C.text, lineHeight: 1.75 }}>
              Operador discrecional de un solo par con riesgo fijo por operación. Acierta
              {' '}<b style={{ color: C.text }}>{g.wr}%</b> de las operaciones, pero cuando gana obtiene en promedio
              {' '}<b style={{ color: C.green }}>{g.avgRR?.toFixed(1)} veces</b> lo arriesgado, lo que deja un profit factor de
              {' '}<b style={{ color: C.green }}>{g.pf?.toFixed(2)}</b> y una expectativa positiva.
              {hasFunded && <> Hoy gestiona <b style={{ color: C.gold }}>${funded.capital.toLocaleString('es-AR')}</b> de capital de firmas de fondeo y su método ya pasó <b>{evals.passed}</b> fases de evaluación.</>}
            </div>
            {bio && <div style={{ marginTop: 14, paddingLeft: 14, borderLeft: `3px solid ${C.blue}`, fontSize: 13, color: C.soft, lineHeight: 1.7 }}>{bio}</div>}
          </Card>
        </Section>

        {/* Resultados */}
        <Section title="Resultados" sub="Resultado acumulado en R, sumando todas las cuentas desde el primer trade.">
          <Card style={{ padding: '16px 12px 8px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={equity}>
                <defs><linearGradient id="gEq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blue} stopOpacity={0.3} /><stop offset="95%" stopColor={C.blue} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: C.mute }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: C.mute }} tickLine={false} axisLine={false} tickFormatter={v => sgn(v, 0) + 'R'} />
                <Tooltip contentStyle={tip} formatter={v => [sgn(v) + 'R', 'Acumulado']} labelStyle={{ color: C.blueL, fontWeight: 600 }} />
                <Area type="monotone" dataKey="pnl" stroke={C.blue} strokeWidth={2.5} fill="url(#gEq)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {hasFunded && (
            <div className="p-grid2" style={{ marginTop: 12 }}>
              <Card style={{ borderColor: '#92400E', background: 'linear-gradient(135deg,#1A1400,#111827)' }}>
                <div style={{ fontSize: 10, color: C.gold, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 10 }}>Cuentas fondeadas · {funded.n} trades</div>
                {[
                  ['Rentabilidad', sgn(funded.pct, 2) + '%', funded.pct >= 0 ? C.green : C.red],
                  ['Resultado', sgn(funded.m.rSum) + 'R', funded.m.rSum >= 0 ? C.green : C.red],
                  ['Expectativa', funded.m.avgR !== null ? sgn(funded.m.avgR, 2) + 'R' : '—', C.green],
                  ['Win rate · Profit factor', `${funded.m.wr ?? '—'}% · ${funded.m.pf?.toFixed(2) ?? '—'}`, C.text],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.05)', fontSize: 13 }}>
                    <span style={{ color: C.soft }}>{k}</span><b style={{ color: c }}>{v}</b>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: C.mute, marginTop: 10, lineHeight: 1.5 }}>Riesgo de 1–1,5% por operación. Cada trade se mide sobre el tamaño original de la cuenta (sin interés compuesto).</div>
              </Card>
              <Card>
                <div style={{ fontSize: 10, color: C.mute, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 6 }}>Crecimiento del capital fondeado</div>
                {growth && growth.steps.length > 1 ? (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={growth.points}>
                        <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: C.mute }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: C.mute }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v / 1000 + 'k'} />
                        <Tooltip contentStyle={tip} formatter={v => ['$' + v.toLocaleString('es-AR'), 'Capital']} labelStyle={{ color: C.gold }} />
                        <Area type="stepAfter" dataKey="capital" stroke={C.gold} strokeWidth={2} fill={C.gold} fillOpacity={0.15} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: 11, color: C.mute, lineHeight: 1.5 }}>Cada escalón es una cuenta fondeada nueva. Sobre el capital promedio operado (${growth.avgCap.toLocaleString('es-AR')}) el retorno es <b style={{ color: C.green }}>{sgn(growth.retAvg, 2)}%</b>.</div>
                  </>
                ) : <div style={{ fontSize: 12, color: C.mute }}>Sin datos suficientes.</div>}
              </Card>
            </div>
          )}
        </Section>

        {/* Calidad */}
        <Section title="Calidad del método">
          <div className="p-grid3">
            <Stat label="Win rate" value={g.wr + '%'} sub={`${g.w} ganadas · ${g.l} perdidas · ${g.be} BE`} color={g.wr >= 50 ? C.green : C.amber} />
            <Stat label="Profit factor" value={g.pf?.toFixed(2) ?? '—'} sub="R ganado por cada R perdido" color={g.pf >= 1.5 ? C.green : C.amber} />
            <Stat label="Ganancia media" value={g.avgRR ? '1:' + g.avgRR.toFixed(1) : '—'} sub="del riesgo, en trades ganadores" color={C.green} />
            <Stat label="Caída máxima" value={ddR + 'R'} sub={`${ddPct}% en la peor cuenta`} color={ddPct >= 8 ? C.red : C.amber} />
            <Stat label="Peor racha" value={streaks.maxL + ' setups'} sub="perdedores consecutivos" color={C.amber} />
            <Stat label="Meses positivos" value={cons.pct !== null ? cons.pct + '%' : '—'} sub={`${cons.months.filter(m => m.positive).length} de ${cons.months.length} (en R)`} color={cons.pct >= 70 ? C.green : C.amber} />
          </div>
          <Card style={{ marginTop: 12, padding: '14px 16px 6px' }}>
            <div style={{ fontSize: 10, color: C.mute, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 8 }}>Resultado mensual en R</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.mute }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: C.mute }} tickLine={false} axisLine={false} tickFormatter={v => sgn(v, 0)} />
                <Tooltip contentStyle={tip} formatter={v => [sgn(v) + 'R', 'Mes']} cursor={{ fill: 'rgba(255,255,255,.03)' }} />
                <Bar dataKey="r" radius={[4, 4, 0, 0]}>{monthly.map((m, i) => <Cell key={i} fill={m.r >= 0 ? C.green : C.red} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        {/* Disciplina */}
        {exact.n > 0 && rest.n > 0 && (
          <Section title="Disciplina" sub="Cada operación se clasifica según cumpla o no el plan completo antes de entrar.">
            <div className="p-grid2">
              <Card>
                <div style={{ fontSize: 10, color: C.green, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>Plan 100% exacto · {exact.n} trades</div>
                <div style={{ fontFamily: serif, fontSize: 32, color: exact.rSum >= 0 ? C.green : C.red, margin: '8px 0 4px' }}>{sgn(exact.rSum)}R</div>
                <div style={{ fontSize: 12, color: C.soft }}>Win rate {exact.wr}% · expectativa {sgn(exact.avgR, 2)}R</div>
              </Card>
              <Card>
                <div style={{ fontSize: 10, color: C.amber, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>Parciales o fuera de plan · {rest.n} trades</div>
                <div style={{ fontFamily: serif, fontSize: 32, color: rest.rSum >= 0 ? C.green : C.red, margin: '8px 0 4px' }}>{sgn(rest.rSum)}R</div>
                <div style={{ fontSize: 12, color: C.soft }}>Win rate {rest.wr}% · expectativa {sgn(rest.avgR, 2)}R</div>
              </Card>
            </div>
            <div style={{ fontSize: 11.5, color: C.mute, marginTop: 10, lineHeight: 1.6 }}>
              La ventaja se concentra en los setups que cumplen el plan completo; el resto de operaciones resta. Nota: en los primeros meses la clasificación del plan se asignó manualmente, por lo que esta comparación sobrestima la diferencia.
            </div>
          </Section>
        )}

        {/* Evaluaciones */}
        {(evals.passed + evals.lost) > 0 && (
          <Section title="Evaluaciones de fondeo" sub="Las cuentas de evaluación se operan con más riesgo (hasta 2%) para superarlas rápido; las fondeadas, con menos.">
            <div className="p-grid3">
              <Stat label="Fases aprobadas" value={String(evals.passed)} color={C.green} />
              <Stat label="Fases perdidas" value={String(evals.lost)} color={C.red} />
              <Stat label="Tasa de aprobación" value={evals.rate !== null ? evals.rate + '%' : '—'} sub={evals.running ? `${evals.running} en curso` : undefined} color={C.blueL} />
            </div>
          </Section>
        )}

        {/* Transparencia */}
        <Section title="Qué dicen los datos, con honestidad">
          <Card style={{ fontSize: 13, color: C.soft, lineHeight: 1.8 }}>
            <div>• Muestra: <b style={{ color: C.text }}>{g.n} operaciones en {nSetups} setups</b> (un mismo setup puede operarse en varias cuentas y cuenta como una sola decisión).</div>
            {ci && <div>• Intervalo de confianza de la expectativa (95%): <b style={{ color: C.text }}>{sgn(ci.lo, 2)}R a {sgn(ci.hi, 2)}R</b>. {pos ? 'El rango es positivo.' : 'El rango incluye el cero: la muestra todavía es chica para afirmar una ventaja estadística firme; la tendencia es positiva.'}</div>}
            <div>• Todo se mide en R (riesgo por trade), no sobre un capital inventado. Las rentabilidades % de fondeadas son sobre el capital real de cada cuenta.</div>
            <div>• Los resultados pasados no garantizan resultados futuros.</div>
          </Card>
        </Section>

        {/* Registro */}
        <Section title="Registro de operaciones" sub="Cada operación, sin editar. Las cuentas se muestran enmascaradas.">
          <button onClick={() => setShowLog(s => !s)} style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, color: C.blueL, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {showLog ? 'Ocultar registro' : `Ver las ${sorted.length} operaciones`}
          </button>
          {showLog && (
            <Card style={{ marginTop: 12, padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 560 }}>
                <thead>
                  <tr style={{ background: '#0A1628' }}>
                    {['Fecha', 'Cuenta', 'Dir.', 'Resultado', 'R', 'Plan'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 9, color: C.mute, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600, borderBottom: `1px solid ${C.line}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((t, i) => {
                    const rc = rOf(t)
                    const col = t.resultado === 'Win' ? C.green : t.resultado === 'Loss' ? C.red : C.amber
                    return (
                      <tr key={t.id || i} style={{ background: i % 2 ? 'rgba(255,255,255,.015)' : 'transparent' }}>
                        <td style={{ padding: '8px 12px', color: C.soft, borderBottom: '1px solid #0F1828', whiteSpace: 'nowrap' }}>{t.fecha}</td>
                        <td style={{ padding: '8px 12px', color: C.blueL, borderBottom: '1px solid #0F1828', fontSize: 11 }}>{t.c_nombre}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #0F1828', color: t.direccion === 'Compra' ? C.green : t.direccion === 'Venta' ? C.red : C.mute }}>{t.direccion === 'Compra' ? '▲ Compra' : t.direccion === 'Venta' ? '▼ Venta' : '—'}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #0F1828', color: col, fontWeight: 700 }}>{t.resultado}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #0F1828', color: col, fontWeight: 700 }}>{isFinite(rc) ? sgn(rc, 2) + 'R' : '—'}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #0F1828', color: isQuality(t) ? C.green : C.mute }}>{t.plan === '100% exacto' ? '✓ exacto' : t.plan === 'Parcialmente' ? '~ parcial' : t.plan === 'No cumplía' ? '✕ fuera' : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: C.mute }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.line}`, background: 'transparent', color: page === 1 ? '#2A3A52' : C.soft, cursor: 'pointer' }}>‹ Anterior</button>
                <span>Página {page} de {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.line}`, background: 'transparent', color: page === totalPages ? '#2A3A52' : C.soft, cursor: 'pointer' }}>Siguiente ›</button>
              </div>
            </Card>
          )}
        </Section>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 11, color: C.mute }}>
          <span style={{ fontFamily: serif, fontSize: 16, color: C.text }}>Edge<em style={{ color: C.blueL, fontStyle: 'italic' }}>Log</em></span>
          <span>Track record generado automáticamente · {dateStr}</span>
        </div>
      </div>
    </div>
  )
}
