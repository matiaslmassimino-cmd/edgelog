import { calcPersonalSummary, fmtR } from '../lib/metrics'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const money = v => (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 2 })

function KPI({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: color || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  )
}

export default function CapitalPropioPage({ ctx }) {
  const { allTrades, allAccounts } = ctx
  const s = calcPersonalSummary(allTrades, allAccounts)
  const accs = allAccounts.filter(a => a.type === 'personal')
  const link = accs.map(a => a.nota).find(n => /^https?:\/\//i.test(n || ''))

  if (!s) return (
    <div>
      <div className="page-header"><div className="page-title">Capital <em>propio</em></div>
        <div className="page-sub">Tu cuenta real con dinero propio, separada de challenges y fondeadas.</div></div>
      <div className="card" style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
        Todavía no hay una cuenta de capital propio. Cuando la abras:
        <ol style={{ margin: '8px 0 0 18px' }}>
          <li>Andá a <b>Mis cuentas → Nueva cuenta</b> y elegí tipo <b>Capital propio (cuenta real)</b>.</li>
          <li>Cargá tu broker, el depósito inicial y el enlace público de Myfxbook.</li>
          <li>Registrá los trades en el <b>Diario</b> eligiendo esa cuenta (riesgo 5–20%).</li>
        </ol>
        <div style={{ marginTop: 10, color: 'var(--text3)' }}>Esta sección y la de tu página pública se completan solas; nada de esta cuenta se mezcla con las métricas de las firmas.</div>
      </div>
    </div>
  )

  const g = s.m, up = s.usd >= 0
  const recent = [...s.trades].reverse().slice(0, 15)
  return (
    <div>
      <div className="page-header"><div className="page-title">Capital <em>propio</em></div>
        <div className="page-sub">Cuenta real · {s.n} trades · el saldo compone (arriesgás % del saldo actual){link && <> · <a href={link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)' }}>Myfxbook ↗</a></>}</div></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 14 }}>
        <KPI label="Saldo estimado" value={money(s.balance)} sub={`depósito inicial ${money(s.start)}`} color={up ? 'var(--green)' : 'var(--red)'} />
        <KPI label="Retorno" value={(up ? '+' : '') + s.retPct + '%'} sub={`${up ? '+' : ''}${money(s.usd)} · compuesto`} color={up ? 'var(--green)' : 'var(--red)'} />
        <KPI label="Resultado en R" value={fmtR(g.rSum, 1)} sub={`expectativa ${fmtR(g.avgR, 2)} por trade`} color={g.rSum >= 0 ? 'var(--green)' : 'var(--red)'} />
        <KPI label="Win rate · PF" value={`${g.wr ?? '—'}% · ${g.pf ?? '—'}`} sub={`${g.w}W · ${g.l}L · ${g.be} BE`} />
        <KPI label="Caída máxima" value={s.maxDD + '%'} sub="desde el máximo de saldo" color={s.maxDD >= 30 ? 'var(--red)' : 'var(--amber)'} />
        <KPI label="Riesgo por trade" value={s.avgRisk ? s.avgRisk + '%' : '—'} sub={s.maxRisk ? `máximo usado ${s.maxRisk}%` : undefined} />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">Evolución del saldo</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={s.points}>
            <defs><linearGradient id="gPers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} /><stop offset="95%" stopColor="#22C55E" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} domain={['auto', 'auto']} />
            <Tooltip formatter={v => [money(v), 'Saldo']} contentStyle={{ background: '#0F1828', border: '1px solid #1E3A5F', borderRadius: 10, fontSize: 11 }} />
            <Area type="monotone" dataKey="balance" stroke="#22C55E" strokeWidth={2.2} fill="url(#gPers)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 6, lineHeight: 1.6 }}>
          El saldo es una estimación calculada con tus trades (no incluye comisiones, swaps ni depósitos/retiros). Compará con Myfxbook: si difieren, la diferencia son esos costos o un trade mal cargado.
        </div>
      </div>

      <div className="card">
        <div className="card-title">Últimos trades</div>
        {recent.map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
            <span style={{ color: 'var(--text2)' }}>{t.fecha} · {t.direccion && t.direccion !== '—' ? t.direccion + ' · ' : ''}riesgo {t.risk}%</span>
            <b style={{ color: t.resultado === 'Win' ? 'var(--green)' : t.resultado === 'Loss' ? 'var(--red)' : 'var(--amber)' }}>{t.resultado} · {t.r_pnl >= 0 ? '+' : ''}{(+t.r_pnl).toFixed(2)}%</b>
          </div>
        ))}
      </div>
    </div>
  )
}
