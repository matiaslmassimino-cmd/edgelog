import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicData } from '../lib/sync'
import { calcMetrics, isQuality, calcEdgeRatio, calcExpectancy, calcConsistency, calcAUM, buildEquityCurve, calcStreaks, parseFecha, groupByPeriod, periodMetrics, keyLabel } from '../lib/metrics'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

const tip = { background: '#0F1828', border: '1px solid #1E3A5F', borderRadius: 10, fontSize: 11, color: '#E2E8F0', padding: '10px 14px' }

function InfoDot({ desc }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 6, verticalAlign: 'middle' }}>
      <span onClick={() => setOpen(!open)}
        style={{ cursor: 'pointer', fontSize: 10, color: '#4A6080', background: '#1A2235', border: '1px solid #2A3A52', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, userSelect: 'none' }}>···</span>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'absolute', left: '50%', bottom: 22, transform: 'translateX(-50%)', background: '#0F1828', border: '1px solid #1E3A5F', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: '#94A3B8', lineHeight: 1.6, width: 240, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,.6)' }}>
          {desc}
        </div>
      )}
    </span>
  )
}

function StatCard({ label, value, desc, color, sub, badge }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #0D1B2E, #111827)', border: '1px solid #1E2A3A', borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'visible' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: color || '#3B82F6', borderRadius: '14px 0 0 14px' }} />
      <div style={{ fontSize: 9.5, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center' }}>
        {label}{desc && <InfoDot desc={desc} />}
      </div>
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: color || '#E2E8F0', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#4A6080' }}>{sub}</div>}
      {badge && <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,.15)', color: '#60A5FA', fontSize: 10, fontWeight: 600, border: '1px solid rgba(59,130,246,.2)' }}>{badge}</span>}
    </div>
  )
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 14, marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 3, height: 18, background: '#3B82F6', borderRadius: 3, flexShrink: 0 }} />
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17, color: '#E2E8F0' }}>{children}</div>
      </div>
      {sub && <div style={{ fontSize: 11.5, color: '#4A6080', marginTop: 3, paddingLeft: 13 }}>{sub}</div>}
    </div>
  )
}

// ── EXPLORADOR DE PERÍODOS ──
function PeriodExplorer({ trades }) {
  const [tab, setTab] = useState('month')
  const [selectedKey, setSelectedKey] = useState(null)

  const map = useMemo(() => groupByPeriod(trades, tab), [trades, tab])
  const keys = useMemo(() => Object.keys(map).sort(), [map])

  // Período actual
  const now = new Date()
  const kfn = tab === 'week'
    ? d => { const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = tmp.getUTCDay() || 7; tmp.setUTCDate(tmp.getUTCDate() + 4 - day); const y = tmp.getUTCFullYear(); const w = Math.ceil(((tmp - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7); return `${y}-W${w < 10 ? '0' : ''}${w}` }
    : tab === 'month' ? d => `${d.getFullYear()}-${d.getMonth() < 9 ? '0' : ''}${d.getMonth() + 1}`
    : d => `${d.getFullYear()}`
  const curKey = kfn(now)
  const curTrades = map[curKey] || []
  const curM = periodMetrics(curTrades)

  // Período seleccionado o todos
  const activeTrades = useMemo(() => {
    if (selectedKey && map[selectedKey]) return map[selectedKey]
    return trades
  }, [selectedKey, map, trades])

  // Gráfico
  const chartData = useMemo(() => {
    const sorted = [...activeTrades]
      .filter(e => ['Win','Loss','Breakeven'].includes(e.resultado))
      .sort((a, b) => { const da = parseFecha(a.fecha), db = parseFecha(b.fecha); return (da - db) || (a.id - b.id) })
    let running = 0
    return [{ name: 'Inicio', pnl: 0 }].concat(sorted.map(t => {
      running = parseFloat((running + (t.r_pnl || 0)).toFixed(4))
      return { name: t.fecha, pnl: parseFloat(running.toFixed(2)) }
    }))
  }, [activeTrades])

  const selM = selectedKey ? periodMetrics(map[selectedKey] || []) : null

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#111827', border: '1px solid #1E2A3A', borderRadius: 12, padding: 4, marginBottom: 16, width: 'fit-content' }}>
        {['week','month','year'].map(t => (
          <button key={t}
            onClick={() => { setTab(t); setSelectedKey(null) }}
            style={{ padding: '8px 20px', borderRadius: 9, border: 'none', background: tab === t ? '#1E3A5F' : 'transparent', color: tab === t ? '#60A5FA' : '#4A6080', fontSize: 12.5, fontWeight: tab === t ? 700 : 400, cursor: 'pointer', transition: 'all .15s' }}>
            {t === 'week' ? 'Semanas' : t === 'month' ? 'Meses' : 'Años'}
          </button>
        ))}
      </div>

      {/* KPIs período actual */}
      {curTrades.length > 0 && !selectedKey && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, marginBottom: 10 }}>
            Período actual — {keyLabel(curKey, tab)}
          </div>
          <div className="pub-grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {[
              { label: 'Trades', value: curM.tr, sub: `${curM.days}d`, color: '#60A5FA' },
              { label: 'Win rate', value: curM.wr !== null ? curM.wr + '%' : '—', sub: `${curM.w}W · ${curM.l}L`, color: curM.wr >= 50 ? '#22C55E' : '#EF4444' },
              { label: 'WR ✦', value: curM.wrQ !== null ? curM.wrQ + '%' : '—', sub: `${curM.qCount} disciplinados`, color: '#EAB308' },
              { label: 'P&L período', value: (curM.pnl >= 0 ? '+' : '') + curM.pnl.toFixed(2) + '%', sub: 'acumulado', color: curM.pnl >= 0 ? '#22C55E' : '#EF4444' },
              { label: 'R:R real', value: curM.avgRR !== null ? '1:' + curM.avgRR.toFixed(1) : '—', sub: 'promedio wins', color: curM.avgRR >= 2 ? '#22C55E' : '#94A3B8' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ background: '#111827', border: '1px solid #1E2A3A', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 9, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 600, marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color, lineHeight: 1, marginBottom: 3 }}>{value}</div>
                <div style={{ fontSize: 10, color: '#4A6080' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs período seleccionado */}
      {selectedKey && selM && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600 }}>
              {keyLabel(selectedKey, tab)}
            </div>
            <button onClick={() => setSelectedKey(null)}
              style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #2A3A52', background: 'transparent', color: '#4A6080', fontSize: 11, cursor: 'pointer' }}>
              ✕ Ver todos
            </button>
          </div>
          <div className="pub-grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {[
              { label: 'Trades', value: selM.tr, sub: `${selM.days}d`, color: '#60A5FA' },
              { label: 'Win rate', value: selM.wr !== null ? selM.wr + '%' : '—', sub: `${selM.w}W · ${selM.l}L`, color: selM.wr >= 50 ? '#22C55E' : '#EF4444' },
              { label: 'WR ✦', value: selM.wrQ !== null ? selM.wrQ + '%' : '—', sub: `${selM.qCount} disciplinados`, color: '#EAB308' },
              { label: 'P&L período', value: (selM.pnl >= 0 ? '+' : '') + selM.pnl.toFixed(2) + '%', sub: 'acumulado', color: selM.pnl >= 0 ? '#22C55E' : '#EF4444' },
              { label: 'R:R real', value: selM.avgRR !== null ? '1:' + selM.avgRR.toFixed(1) : '—', sub: 'promedio wins', color: selM.avgRR >= 2 ? '#22C55E' : '#94A3B8' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ background: '#111827', border: '1px solid #1E3A5F', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 9, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 600, marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color, lineHeight: 1, marginBottom: 3 }}>{value}</div>
                <div style={{ fontSize: 10, color: '#4A6080' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico interactivo */}
      <div style={{ background: 'linear-gradient(135deg, #0D1B2E, #111827)', border: '1px solid #1E2A3A', borderRadius: 16, padding: '16px 20px', marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 600, marginBottom: 12 }}>
          P&L acumulado — {selectedKey ? keyLabel(selectedKey, tab) : 'Todos los períodos'}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="pnlGradPer" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.03)" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
            <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L acum.']} labelStyle={{ color: '#60A5FA', fontWeight: 600 }} />
            <Area type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2.5} fill="url(#pnlGradPer)" dot={false} activeDot={{ r: 5, fill: '#60A5FA', stroke: '#0B0F17', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Lista de períodos clickeable */}
      <div style={{ fontSize: 10, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 600, marginBottom: 8 }}>
        Hacé clic en un período para ver su detalle
      </div>
      {/* Header tabla */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr', gap: 8, padding: '0 14px 6px', fontSize: 9, color: '#2A3A52', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>
        <span>Período</span>
        <span style={{ textAlign: 'right' }}>Trades</span>
        <span style={{ textAlign: 'right' }}>Win rate</span>
        <span style={{ textAlign: 'right' }}>WR ✦</span>
        <span style={{ textAlign: 'right' }}>P&L</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...keys].reverse().map(k => {
          const m = periodMetrics(map[k])
          const isSel = selectedKey === k
          const isCur = k === curKey
          return (
            <div key={k} onClick={() => setSelectedKey(isSel ? null : k)}
              style={{
                display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr', gap: 8,
                alignItems: 'center', padding: '12px 14px', borderRadius: 12,
                background: isSel ? 'linear-gradient(135deg, #0F2040, #1A3060)' : isCur ? 'rgba(59,130,246,.06)' : '#111827',
                border: `1px solid ${isSel ? '#3B82F6' : isCur ? 'rgba(59,130,246,.3)' : '#1E2A3A'}`,
                cursor: 'pointer', transition: 'all .18s',
                boxShadow: isSel ? '0 4px 20px rgba(59,130,246,.15)' : 'none'
              }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.borderColor = '#2A3A52' }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.borderColor = isCur ? 'rgba(59,130,246,.3)' : '#1E2A3A' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: isSel ? '#60A5FA' : '#E2E8F0' }}>{keyLabel(k, tab)}</div>
                  {isCur && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(59,130,246,.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,.3)', fontWeight: 600 }}>ACTUAL</span>}
                </div>
                {/* Mini heatmap */}
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {(map[k] || [])
                    .filter(e => ['Win','Loss','Breakeven'].includes(e.resultado))
                    .slice(0, 24)
                    .map((e, i) => (
                      <span key={i} style={{ width: 7, height: 7, borderRadius: 2, background: e.resultado === 'Win' ? '#22C55E' : e.resultado === 'Loss' ? '#EF4444' : '#F59E0B', display: 'inline-block', opacity: isQuality(e) ? .9 : .35 }} />
                    ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12.5, color: '#94A3B8' }}>{m.tr} <span style={{ fontSize: 10, color: '#4A6080' }}>{m.days}d</span></div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: m.wr !== null ? (m.wr >= 50 ? '#22C55E' : '#EF4444') : '#2A3A52' }}>{m.wr !== null ? m.wr + '%' : '—'}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: m.wrQ !== null ? (m.wrQ >= 50 ? '#22C55E' : '#EF4444') : '#2A3A52' }}>{m.wrQ !== null ? m.wrQ + '%' : '—'}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: m.pnl >= 0 ? '#22C55E' : '#EF4444' }}>{m.pnl >= 0 ? '+' : ''}{m.pnl.toFixed(2)}%</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MAIN PUBLIC PAGE ──
export default function Public() {
  const { userId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0B0F17', color: '#EF4444', fontSize: 14, padding: 20, textAlign: 'center' }}>{error || 'Perfil no encontrado.'}</div>
  )

  const { profile, accounts, trades } = data
  const g = calcMetrics(trades)
  const qTrades = trades.filter(isQuality)
  const gQ = calcMetrics(qTrades)
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

  const accMap = {}
  accounts.forEach(a => { accMap[String(a.id)] = a })

  const sortedTrades = [...trades]
    .filter(e => ['Win','Loss','Breakeven'].includes(e.resultado))
    .sort((a, b) => { const da = parseFecha(a.fecha), db = parseFecha(b.fecha); return db - da })
  const totalPages = Math.ceil(sortedTrades.length / perPage)
  const visibleTrades = sortedTrades.slice((page - 1) * perPage, page * perPage)

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

  const heatmapTrades = [...trades]
    .filter(e => ['Win','Loss','Breakeven'].includes(e.resultado))
    .sort((a, b) => { const da = parseFecha(a.fecha), db = parseFecha(b.fecha); return da - db })
    .slice(-48)

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F17', fontFamily: "'DM Sans',system-ui,sans-serif", color: '#E2E8F0' }}>
      <style>{`
        @media (max-width: 700px) {
          .pub-hero { padding: 28px 16px 32px !important; }
          .pub-hero-stats { flex-direction: column !important; gap: 12px !important; }
          .pub-hero-stat { padding-right: 0 !important; margin-right: 0 !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,.07); padding-bottom: 12px !important; }
          .pub-hero-stat:last-child { border-bottom: none !important; }
          .pub-content { padding: 16px 16px 60px !important; }
          .pub-grid-2 { grid-template-columns: 1fr !important; }
          .pub-grid-3 { grid-template-columns: 1fr 1fr !important; }
          .pub-grid-5 { grid-template-columns: 1fr 1fr !important; }
          .pub-table-wrap { overflow-x: auto !important; }
          .pub-hero-val-big { font-size: 34px !important; }
          .pub-hero-val { font-size: 22px !important; }
          .pub-hero-title { font-size: 32px !important; }
        }
        @media (max-width: 420px) {
          .pub-grid-3, .pub-grid-5 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* HERO */}
      <div className="pub-hero" style={{ background: 'linear-gradient(135deg, #060D1F 0%, #0A1628 40%, #0F1E38 100%)', borderBottom: '1px solid #1E3A5F', padding: '48px 60px 52px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.25)', marginBottom: 18 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
            <span style={{ fontSize: 10, color: '#60A5FA', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>Track Record Verificado · {dateStr}</span>
          </div>
          <div className="pub-hero-title" style={{ fontFamily: "'DM Serif Display',serif", fontSize: 40, color: '#fff', lineHeight: 1, marginBottom: 4 }}>Edge<em style={{ color: '#60A5FA', fontStyle: 'italic' }}>Log</em></div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: 'rgba(96,165,250,.65)', marginBottom: 4 }}>{profile.name || 'Trader'}</div>
          <div style={{ fontSize: 12, color: '#4A6080', marginBottom: 28, lineHeight: 1.6 }}>
            {profile.metodologia || 'Smart Money Concepts'} · {profile.par || 'EURUSD'} · {profile.sesion || 'Londres / NY'} · {spanDays} días operando
          </div>
          <div className="pub-hero-stats" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {[
              { label: 'Retorno total', value: (g.pnl >= 0 ? '+' : '') + g.pnl.toFixed(2) + '%', color: g.pnl >= 0 ? '#22C55E' : '#EF4444', big: true },
              { label: 'Win rate', value: g.wr !== null ? g.wr + '%' : '—', color: g.wr >= 50 ? '#22C55E' : '#EF4444' },
              { label: 'WR disciplinado ✦', value: gQ.wr !== null ? gQ.wr + '%' : '—', color: '#EAB308' },
              { label: 'Prof. Factor', value: g.pf !== null ? g.pf.toFixed(2) : '—', color: g.pf >= 1.5 ? '#22C55E' : '#F59E0B' },
              { label: 'Trades', value: String(g.tr), color: '#E2E8F0' },
              { label: 'Capital activo', value: '$' + aum.total.toLocaleString(), color: '#60A5FA' },
            ].map(({ label, value, color, big }, i) => (
              <div key={label} className="pub-hero-stat" style={{ paddingRight: 28, marginRight: 28, borderRight: i < 5 ? '1px solid rgba(255,255,255,.07)' : 'none', marginBottom: 8 }}>
                <div style={{ fontSize: 9.5, color: 'rgba(96,165,250,.4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{label}</div>
                <div className={big ? 'pub-hero-val-big' : 'pub-hero-val'} style={{ fontFamily: "'DM Serif Display',serif", fontSize: big ? 40 : 26, color, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>
          {profile.bio && (
            <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(255,255,255,.04)', borderRadius: 10, borderLeft: '3px solid #3B82F6', fontSize: 13, color: '#94A3B8', lineHeight: 1.7, maxWidth: 680 }}>{profile.bio}</div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="pub-content" style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 60px 80px' }}>

        {/* Equity curve */}
        <SectionTitle sub="Evolución del P&L acumulado desde el primer trade.">Equity Curve</SectionTitle>
        <div style={{ background: 'linear-gradient(135deg, #0D1B2E, #111827)', border: '1px solid #1E2A3A', borderRadius: 16, padding: '16px 20px', marginBottom: 8 }}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="pnlGradMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.03)" />
              <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
              <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L acum.']} labelStyle={{ color: '#60A5FA', fontWeight: 600 }} />
              <Area type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2.5} fill="url(#pnlGradMain)" dot={false} activeDot={{ r: 5, fill: '#60A5FA', stroke: '#0B0F17', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#4A6080', marginBottom: 4, flexWrap: 'wrap' }}>
          <span>🟢 {g.w} ganadores</span><span>🔴 {g.l} perdedores</span>
          <span>🟡 {trades.filter(t => t.resultado === 'Breakeven').length} breakeven</span>
          <span>📅 {spanDays} días</span>
        </div>

        {/* ── EXPLORADOR DE PERÍODOS ── */}
        <SectionTitle sub="Explorá el rendimiento por semana, mes o año. Hacé clic en cualquier período para ver su detalle e historia.">
          Explorador de rendimiento por período
        </SectionTitle>
        <PeriodExplorer trades={trades} />

        {/* Métricas */}
        <SectionTitle sub="Indicadores clave que miden la calidad y consistencia de la operativa.">Métricas de rendimiento</SectionTitle>
        <div className="pub-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 6 }}>
          <StatCard label="Profitability Factor" value={g.pf !== null ? g.pf.toFixed(2) : '—'} color={g.pf >= 1.5 ? '#22C55E' : g.pf >= 1 ? '#F59E0B' : '#EF4444'} sub={g.pf >= 1.5 ? 'Excelente' : 'Positivo'} desc="Relación entre ganancias brutas y pérdidas brutas. Un PF mayor a 1.5 indica que el sistema genera más de $1.50 por cada $1 perdido. Sólido desde 1.5, excelente sobre 2.0." />
          <StatCard label="Win Rate Global" value={g.wr !== null ? g.wr + '%' : '—'} color={g.wr >= 50 ? '#22C55E' : '#EF4444'} sub={`${g.w}W · ${g.l}L`} desc="Porcentaje de operaciones cerradas con ganancia. Un WR alto solo no garantiza rentabilidad — importa combinarlo con el R:R promedio obtenido." />
          <StatCard label="WR Disciplinado ✦" value={gQ.wr !== null ? gQ.wr + '%' : '—'} color="#EAB308" sub={`${qTrades.length} trades con plan`} desc="Win rate calculado solo sobre operaciones donde se respetó el plan y se operó con calma. Refleja el potencial real del sistema ejecutado correctamente." />
          <StatCard label="R:R Real Promedio" value={g.avgRR !== null ? '1:' + g.avgRR.toFixed(2) : '—'} color={g.avgRR >= 2 ? '#22C55E' : '#F59E0B'} sub="sobre trades ganadores" desc="Risk:Reward real promedio en operaciones exitosas. Un R:R de 1:2 significa que gana el doble de lo que arriesga." />
          <StatCard label="Expectancy por Trade" value={exp !== null ? (exp > 0 ? '+' : '') + exp + '%' : '—'} color={exp > 0 ? '#22C55E' : '#EF4444'} sub={exp > 0 ? 'Edge positivo' : 'Sin edge'} desc="Ganancia o pérdida promedio esperada por operación. Si es positiva, el sistema tiene ventaja estadística y es rentable a largo plazo." />
          <StatCard label="Consistencia mensual" value={cons.pct !== null ? cons.pct + '%' : '—'} color={cons.pct >= 70 ? '#22C55E' : '#F59E0B'} sub={`${cons.months.filter(m => m.positive).length}/${cons.months.length} meses positivos`} desc="Porcentaje de meses cerrados en positivo. Una consistencia alta (+70%) indica resultados estables mes a mes." />
        </div>

        {/* Heatmap */}
        <SectionTitle sub="Mapa visual de las últimas 48 operaciones. Verde = Win, Rojo = Loss, Amarillo = Breakeven. Opacidad baja = fuera de plan.">Historial visual</SectionTitle>
        <div style={{ background: 'linear-gradient(135deg, #0D1B2E, #111827)', border: '1px solid #1E2A3A', borderRadius: 16, padding: '16px 20px', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
            {heatmapTrades.map((t, i) => {
              const color = t.resultado === 'Win' ? '#22C55E' : t.resultado === 'Loss' ? '#EF4444' : '#F59E0B'
              const q = isQuality(t)
              return (
                <div key={i} title={`${t.fecha} · ${t.c_nombre} · ${t.resultado} · ${t.r_pnl >= 0 ? '+' : ''}${t.r_pnl?.toFixed(2)}%`}
                  style={{ width: 24, height: 24, borderRadius: 5, background: color, opacity: q ? 0.9 : 0.3, cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!q && <span style={{ fontSize: 7, color: 'rgba(255,255,255,.8)' }}>⚠</span>}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 10.5, color: '#4A6080', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#22C55E', display: 'inline-block' }} /> Win disciplinado</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#EF4444', display: 'inline-block' }} /> Loss</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#F59E0B', display: 'inline-block' }} /> Breakeven</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#22C55E', opacity: .3, display: 'inline-block' }} /> Fuera de plan</span>
          </div>
        </div>

        {/* Real vs Potencial */}
        <SectionTitle sub="Comparación entre el resultado real y el potencial operando con disciplina perfecta.">Sistema real vs potencial</SectionTitle>
        <div className="pub-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid #1E2A3A', marginBottom: 6 }}>
          <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #0D1B2E, #111827)' }}>
            <div style={{ fontSize: 9.5, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8, fontWeight: 600 }}>Resultado real</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 40, color: g.pnl >= 0 ? '#22C55E' : '#EF4444', lineHeight: 1, marginBottom: 6 }}>{g.pnl >= 0 ? '+' : ''}{g.pnl.toFixed(2)}%</div>
            <div style={{ fontSize: 11.5, color: '#4A6080' }}>{g.tr} operaciones · {violated.length} fuera de plan</div>
          </div>
          <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #0F2040, #1A3060)', borderLeft: '1px solid #1E3A5F' }}>
            <div style={{ fontSize: 9.5, color: 'rgba(96,165,250,.6)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8, fontWeight: 600 }}>Potencial del sistema ✦</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 40, color: '#E2E8F0', lineHeight: 1, marginBottom: 6 }}>{potentialPnl >= 0 ? '+' : ''}{potentialPnl.toFixed(2)}%</div>
            <div style={{ fontSize: 11.5, color: 'rgba(96,165,250,.5)' }}>Solo con plan 100% respetado</div>
          </div>
          <div style={{ gridColumn: '1/-1', background: '#1A1400', borderTop: '1px solid #92400E', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 500 }}>Brecha por indisciplina — {violated.length} trades fuera de plan</div>
              <div style={{ fontSize: 10.5, color: '#92400E', marginTop: 2 }}>Cada trade fuera de plan tiene un costo estadístico comprobable.</div>
            </div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: '#F59E0B' }}>{parseFloat((potentialPnl - g.pnl).toFixed(2)) >= 0 ? '+' : ''}{parseFloat((potentialPnl - g.pnl).toFixed(2))}%</div>
          </div>
        </div>

        {/* P&L mensual */}
        <SectionTitle sub="Resultado neto de cada mes.">Resultados mensuales</SectionTitle>
        <div style={{ background: 'linear-gradient(135deg, #0D1B2E, #111827)', border: '1px solid #1E2A3A', borderRadius: 16, padding: '16px 20px', marginBottom: 6 }}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#4A6080' }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? '+' : '') + v + '%'} />
              <Tooltip contentStyle={tip} formatter={v => [(v >= 0 ? '+' : '') + v + '%', 'P&L mensual']} />
              <Bar dataKey="pnl" radius={[5, 5, 0, 0]}>
                {monthlyData.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#22C55E' : '#EF4444'} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla de operaciones */}
        <SectionTitle sub="Registro completo de todas las operaciones con fecha, dirección, par, resultado y P&L en % y $.">Registro de operaciones</SectionTitle>
        <div className="pub-table-wrap" style={{ background: 'linear-gradient(135deg, #0D1B2E, #111827)', border: '1px solid #1E2A3A', borderRadius: 16, overflow: 'auto', marginBottom: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#0A1628' }}>
                {['Fecha','Cuenta','Dir.','Par','Resultado','Riesgo','R:R','P&L %','P&L $','Plan','Cal.'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 9, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600, borderBottom: '1px solid #1E2A3A', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleTrades.map((t, idx) => {
                const acc = accMap[String(t.cid)]
                const cap = acc?.capital || 10000
                const pnlUSD = parseFloat((t.r_pnl / 100 * cap).toFixed(2))
                const q = isQuality(t)
                const resColor = t.resultado === 'Win' ? '#22C55E' : t.resultado === 'Loss' ? '#EF4444' : '#F59E0B'
                const dirColor = t.direccion === 'Compra' ? '#22C55E' : t.direccion === 'Venta' ? '#EF4444' : '#4A6080'
                const planColor = t.plan === '100% exacto' ? '#22C55E' : t.plan === 'Parcialmente' ? '#F59E0B' : '#EF4444'
                return (
                  <tr key={t.id || idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                    <td style={{ padding: '8px 12px', color: '#94A3B8', borderBottom: '1px solid #0F1828', whiteSpace: 'nowrap', fontSize: 11 }}>{t.fecha}</td>
                    <td style={{ padding: '8px 12px', color: '#60A5FA', borderBottom: '1px solid #0F1828', fontSize: 10.5 }}>{t.c_nombre}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #0F1828', whiteSpace: 'nowrap' }}>
                      {t.direccion && t.direccion !== '—' ? <span style={{ color: dirColor, fontWeight: 700, fontSize: 11 }}>{t.direccion === 'Compra' ? '▲' : '▼'} {t.direccion}</span> : <span style={{ color: '#2A3A52' }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#94A3B8', borderBottom: '1px solid #0F1828', fontWeight: 500 }}>{t.par || 'EURUSD'}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #0F1828' }}><span style={{ color: resColor, fontWeight: 700, fontSize: 11 }}>{t.resultado}</span></td>
                    <td style={{ padding: '8px 12px', color: '#4A6080', borderBottom: '1px solid #0F1828', fontSize: 11 }}>{t.risk || (t.rp ? t.rp + '%' : '—')}</td>
                    <td style={{ padding: '8px 12px', color: '#94A3B8', borderBottom: '1px solid #0F1828', fontSize: 11 }}>
                      {t.rr_real && t.rr_real > 0 ? '1:' + parseFloat(t.rr_real).toFixed(1) : t.rr && t.rr > 0 ? '1:' + parseFloat(t.rr).toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #0F1828', fontWeight: 700, color: t.r_pnl >= 0 ? '#22C55E' : '#EF4444', fontSize: 12, whiteSpace: 'nowrap' }}>{t.r_pnl >= 0 ? '+' : ''}{t.r_pnl?.toFixed(2)}%</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #0F1828', fontWeight: 700, color: pnlUSD >= 0 ? '#22C55E' : '#EF4444', fontSize: 12, whiteSpace: 'nowrap' }}>{pnlUSD >= 0 ? '+' : ''}${Math.abs(pnlUSD).toFixed(0)}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #0F1828' }}><span style={{ fontSize: 11, color: planColor, fontWeight: 700 }}>{t.plan === '100% exacto' ? '✓' : t.plan === 'Parcialmente' ? '~' : t.plan === 'No cumplía' ? '✕' : '—'}</span></td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #0F1828', fontSize: 13 }}>{q ? <span style={{ color: '#22C55E' }}>✦</span> : <span style={{ color: '#EF4444', opacity: .5 }}>⚠</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Paginación */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #1E2A3A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#4A6080' }}>Mostrar</span>
              {[10, 20, 30, 50, 100].map(n => (
                <button key={n} onClick={() => { setPerPage(n); setPage(1) }}
                  style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${perPage === n ? '#3B82F6' : '#2A3A52'}`, background: perPage === n ? 'rgba(59,130,246,.15)' : 'transparent', color: perPage === n ? '#60A5FA' : '#4A6080', fontSize: 11.5, fontWeight: perPage === n ? 700 : 400, cursor: 'pointer' }}>{n}</button>
              ))}
              <span style={{ fontSize: 11, color: '#4A6080' }}>· {sortedTrades.length} total</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #2A3A52', background: 'transparent', color: page === 1 ? '#2A3A52' : '#94A3B8', fontSize: 12, cursor: page === 1 ? 'default' : 'pointer' }}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #2A3A52', background: 'transparent', color: page === 1 ? '#2A3A52' : '#94A3B8', fontSize: 12, cursor: page === 1 ? 'default' : 'pointer' }}>‹ Ant</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc }, [])
                .map((p, i) => p === '...'
                  ? <span key={'e' + i} style={{ fontSize: 11, color: '#2A3A52', padding: '0 4px' }}>···</span>
                  : <button key={p} onClick={() => setPage(p)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${page === p ? '#3B82F6' : '#2A3A52'}`, background: page === p ? 'rgba(59,130,246,.15)' : 'transparent', color: page === p ? '#60A5FA' : '#94A3B8', fontSize: 12, fontWeight: page === p ? 700 : 400, cursor: 'pointer' }}>{p}</button>
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #2A3A52', background: 'transparent', color: page === totalPages ? '#2A3A52' : '#94A3B8', fontSize: 12, cursor: page === totalPages ? 'default' : 'pointer' }}>Sig ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #2A3A52', background: 'transparent', color: page === totalPages ? '#2A3A52' : '#94A3B8', fontSize: 12, cursor: page === totalPages ? 'default' : 'pointer' }}>»</button>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 10.5, color: '#4A6080', marginBottom: 24, lineHeight: 1.7 }}>
          ✓ Plan exacto · ~ Parcialmente · ✕ Fuera de plan · ✦ Trade disciplinado · ⚠ Fuera de plan<br />
          P&L $ calculado sobre el capital de la cuenta al momento del trade
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #0D1B2E, #111827)', borderRadius: 14, border: '1px solid #1E2A3A' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: '#E2E8F0', marginBottom: 4 }}>Edge<em style={{ color: '#60A5FA', fontStyle: 'italic' }}>Log</em></div>
              <div style={{ fontSize: 11, color: '#4A6080', lineHeight: 1.7 }}>Track record generado automáticamente. Trazabilidad completa por operación.</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#4A6080' }}>Generado el {dateStr}</div>
              <div style={{ fontSize: 11, color: '#4A6080', marginTop: 2 }}>{g.tr} operaciones · {spanDays} días</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
