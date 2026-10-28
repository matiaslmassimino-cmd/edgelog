export function parseFecha(f) {
  if (!f) return null
  const p = f.split('/')
  if (p.length !== 3) return null
  return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]))
}

export function weekKey(d) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
  const y = tmp.getUTCFullYear()
  const w = Math.ceil(((tmp - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7)
  return `${y}-W${w < 10 ? '0' : ''}${w}`
}

export function monthKey(d) {
  return `${d.getFullYear()}-${d.getMonth() < 9 ? '0' : ''}${d.getMonth() + 1}`
}

export function yearKey(d) { return `${d.getFullYear()}` }

export function keyLabel(k, tab) {
  if (tab === 'week') {
    const [y, wPart] = k.split('-W')
    const w = parseInt(wPart)
    const jan4 = new Date(parseInt(y), 0, 4)
    const mon = new Date(jan4)
    mon.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (w - 1) * 7)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    const fmt = d => d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
    return `${fmt(mon)} – ${fmt(sun)}`
  }
  if (tab === 'month') {
    const [y, m] = k.split('-')
    const d = new Date(parseInt(y), parseInt(m) - 1, 1)
    return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())
  }
  return k
}

// ─────────────────────────────────────────────────────────────
// DEFINICIONES DE MEDICIÓN (única fuente de verdad)
//
//  • Trade cerrado: resultado Win, Loss o Breakeven.
//  • R de un trade = r_pnl / riesgo, ambos en % de cuenta. Normaliza por el
//    riesgo usado: un trade al 3% no pesa más que uno al 1%.
//  • Win rate = Win / (Win + Loss). Los Breakeven NO entran en el
//    denominador; se informan aparte (campo `be`).
//  • Profit factor (pf) = suma de R ganados / suma de R perdidos.
//    `pfPct` es la versión sobre % de cuenta, solo por compatibilidad.
//  • Expectativa (avgR) = R medio por trade cerrado, con Breakeven incluidos.
//  • Disciplinado = plan exactamente '100% exacto'. "Parcialmente" NO lo es.
//    Emoción y sobreoperación se analizan como dimensiones aparte.
// ─────────────────────────────────────────────────────────────
const CLOSED = ['Win', 'Loss', 'Breakeven']

export function isClosed(e) { return CLOSED.includes(e.resultado) }

export function isQuality(e) {
  return (e.plan || '') === '100% exacto'
}
export const isDisciplined = isQuality

export function riskOf(e) {
  const rp = Number(e.rp)
  if (rp > 0) return rp
  const parsed = parseFloat(String(e.risk || '').replace('%', '').replace(',', '.'))
  return parsed > 0 ? parsed : 0
}

export function rOf(e) {
  const risk = riskOf(e)
  return risk > 0 ? (e.r_pnl || 0) / risk : 0
}

export function sortTrades(trades) {
  return [...trades].sort((a, b) => {
    const da = parseFecha(a.fecha), db = parseFecha(b.fecha)
    return ((da ? da.getTime() : 0) - (db ? db.getTime() : 0)) || ((a.id || 0) - (b.id || 0))
  })
}


// ── SETUPS ─────────────────────────────────────────────────────────────────
// Un mismo setup se opera en varias cuentas a la vez (p. ej. 1 fondeada + 1 challenge) y esas
// filas ganan o pierden juntas: no son decisiones independientes. Un "setup" agrupa esas filas.
// - Trades nuevos: comparten t.setup_id (lo asigna el Diario).
// - Trades históricos (sin setup_id): se agrupan por fecha + dirección + resultado, y dentro de
//   cada grupo una cuenta no puede repetirse (si se repite, empieza otro setup). Es una
//   estimación: el orden dentro del día no se conserva en los datos viejos.
export function assignSetups(trades) {
  const out = new Map()   // id -> setupKey
  const legacy = {}
  sortTrades(trades.filter(isClosed)).forEach(t => {
    if (t.setup_id) { out.set(t.id, 's:' + t.setup_id); return }
    const k = `${t.fecha}|${t.direccion || '—'}|${t.resultado}`
    const list = legacy[k] || (legacy[k] = [])
    let target = list.find(g => !g.cids.has(String(t.cid)))
    if (!target) { target = { n: list.length, cids: new Set() }; list.push(target) }
    target.cids.add(String(t.cid))
    out.set(t.id, `l:${k}#${target.n}`)
  })
  return out
}

export function calcSetups(trades) {
  const map = assignSetups(trades)
  const groups = new Map()
  sortTrades(trades.filter(isClosed)).forEach(t => {
    const k = map.get(t.id)
    if (!groups.has(k)) groups.set(k, { key: k, fecha: t.fecha, trades: [], legacy: k.startsWith('l:') })
    groups.get(k).trades.push(t)
  })
  return [...groups.values()].map(g => {
    const rs = g.trades.map(rOf)
    const rSum = rs.reduce((a, b) => a + b, 0)
    const res = new Set(g.trades.map(t => t.resultado))
    const resultado = res.size === 1 ? [...res][0] : (rSum > 0.05 ? 'Win' : rSum < -0.05 ? 'Loss' : 'Breakeven')
    return { ...g, n: g.trades.length, rSum: parseFloat(rSum.toFixed(3)), rAvg: rSum / g.trades.length, resultado }
  })   // ya viene en orden cronológico (se armó desde sortTrades)
}

// Orden del setup dentro del día (1º, 2º, 3º...)
export function calcNthSetupStats(trades) {
  const sets = calcSetups(trades), cnt = {}, buckets = {}
  sets.forEach(g => {
    cnt[g.fecha] = (cnt[g.fecha] || 0) + 1
    const k = Math.min(cnt[g.fecha], 3)
    ;(buckets[k] = buckets[k] || []).push(g)
  })
  const out = {}
  Object.entries(buckets).forEach(([k, arr]) => {
    const w = arr.filter(g => g.resultado === 'Win').length, l = arr.filter(g => g.resultado === 'Loss').length
    out[k] = { n: arr.length, avgR: parseFloat((arr.reduce((a, g) => a + g.rAvg, 0) / arr.length).toFixed(3)), w, l }
  })
  return out
}

export function calcMetrics(trades) {
  const wins = trades.filter(e => e.resultado === 'Win')
  const losses = trades.filter(e => e.resultado === 'Loss')
  const be = trades.filter(e => e.resultado === 'Breakeven').length
  const w = wins.length, l = losses.length, tr = w + l, n = w + l + be
  const wr = tr > 0 ? Math.round((w / tr) * 100) : null
  const pnl = parseFloat(trades.reduce((s, e) => s + (e.r_pnl || 0), 0).toFixed(2))
  const rrWins = wins.filter(e => (e.rr_real || e.rr || 0) > 0)
  const avgRR = rrWins.length
    ? parseFloat((rrWins.reduce((s, e) => s + (e.rr_real || e.rr || 0), 0) / rrWins.length).toFixed(2))
    : null
  const gainSum = wins.reduce((s, e) => s + (e.r_pnl || 0), 0)
  const lossSum = Math.abs(losses.reduce((s, e) => s + (e.r_pnl || 0), 0))
  const pfPct = lossSum > 0 ? parseFloat((gainSum / lossSum).toFixed(2)) : null
  const gainR = wins.reduce((s, e) => s + rOf(e), 0)
  const lossR = Math.abs(losses.reduce((s, e) => s + rOf(e), 0))
  const rSum = trades.filter(isClosed).reduce((s, e) => s + rOf(e), 0)
  const pf = lossR > 0 ? parseFloat((gainR / lossR).toFixed(2)) : null
  const avgR = n > 0 ? parseFloat((rSum / n).toFixed(3)) : null
  return {
    w, l, tr, be, n, wr, pnl, avgRR, pf, pfPct, avgR,
    rSum: parseFloat(rSum.toFixed(2)),
    gainR: parseFloat(gainR.toFixed(2)), lossR: parseFloat(lossR.toFixed(2)),
    gainSum: parseFloat(gainSum.toFixed(2)), lossSum: parseFloat(lossSum.toFixed(2))
  }
}

// Intervalo de confianza 95% (bootstrap, semilla fija → resultado reproducible)
// del R medio por trade. Sirve para no sobreinterpretar muestras chicas.
export function calcExpectancyCI(trades, iters = 2000) {
  // Bootstrap por SETUP (no por fila): filas del mismo setup no son independientes.
  const sets = calcSetups(trades)
  if (sets.length < 10) return null
  const cl = sets.map(g => ({ r: g.rSum, n: g.n }))
  let seed = 123456789
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const means = []
  for (let i = 0; i < iters; i++) {
    let sr = 0, sn = 0
    for (let j = 0; j < cl.length; j++) { const c = cl[Math.floor(rnd() * cl.length)]; sr += c.r; sn += c.n }
    means.push(sr / sn)
  }
  means.sort((a, b) => a - b)
  return { lo: parseFloat(means[Math.floor(iters * 0.025)].toFixed(3)), hi: parseFloat(means[Math.floor(iters * 0.975)].toFixed(3)), n: trades.filter(isClosed).length, setups: sets.length }
}

// Estadísticas por grupo (plan, riesgo, emoción, firma, nº de trade del día, etc.)
export function groupStats(trades, keyFn) {
  const map = new Map()
  trades.filter(isClosed).forEach(e => {
    const k = keyFn(e)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(e)
  })
  return [...map.entries()].map(([key, arr]) => ({ key, ...calcMetrics(arr) }))
}

// Plan exacto vs resto, en R. Reemplaza al viejo "real vs potencial" (que sumaba % de cuentas).
export function calcExecutionSplit(trades) {
  const closed = trades.filter(isClosed)
  return {
    all: calcMetrics(closed),
    exact: calcMetrics(closed.filter(isQuality)),
    rest: calcMetrics(closed.filter(e => !isQuality(e)))
  }
}
export const fmtR = (v, d = 1) => v === null || v === undefined ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(d) + 'R'

// ── Resumen de cuentas fondeadas (lo que más importa: capital real y su rendimiento) ──
export function calcFundedSummary(trades, accounts) {
  const fundedAccs = accounts.filter(a => a.type === 'funded')
  const ids = new Set(fundedAccs.map(a => String(a.id)))
  const ft = trades.filter(t => isClosed(t) && (ids.has(String(t.cid)) || t.c_tipo === 'funded'))
  const m = calcMetrics(ft)
  const live = fundedAccs.filter(a => !['completed', 'closed', 'perdida'].includes(a.status))
  // P&L en USD bruto por cuenta = % acumulado × capital de esa cuenta
  const usd = fundedAccs.reduce((s, a) => {
    const pct = ft.filter(t => String(t.cid) === String(a.id)).reduce((x, t) => x + (t.r_pnl || 0), 0)
    return s + pct / 100 * (a.capital || 0)
  }, 0)
  const exact = calcMetrics(ft.filter(isQuality))
  // Rentabilidad SIN interés compuesto: cada trade se mide sobre el capital inicial de su cuenta,
  // y el total se expresa sobre la suma del capital de las cuentas fondeadas con operaciones.
  const perAccount = fundedAccs.map(a => {
    const pct = ft.filter(t => String(t.cid) === String(a.id)).reduce((x, t) => x + (t.r_pnl || 0), 0)
    const n = ft.filter(t => String(t.cid) === String(a.id)).length
    return { id: a.id, nombre: a.nombre, capital: a.capital || 0, status: a.status, n, pct: parseFloat(pct.toFixed(2)), usd: parseFloat((pct / 100 * (a.capital || 0)).toFixed(0)) }
  }).filter(x => x.n > 0)
  const base = perAccount.reduce((s, x) => s + x.capital, 0)
  const pct = base > 0 ? parseFloat((usd / base * 100).toFixed(2)) : 0
  return { m, n: ft.length, accounts: live.length, capital: live.reduce((s, a) => s + (a.capital || 0), 0), usd: parseFloat(usd.toFixed(0)), pct, base, perAccount, exact, trades: ft }
}

// SIMULACIÓN: rentabilidad que habrías tenido si todo el capital fondeado fuera UNA sola cuenta y cada
// setup se hubiera operado una vez, con el % de riesgo que realmente usaste (sin interés compuesto).
// Es hipotética: no incluye límites de la firma ni el efecto de operar más tamaño. Si un setup se operó
// en varias fondeadas, cuenta una sola vez (promedio de sus filas).
export function calcUnifiedReturn(trades, accounts) {
  const fundedIds = new Set(accounts.filter(a => a.type === 'funded').map(a => String(a.id)))
  const ft = trades.filter(t => isClosed(t) && fundedIds.has(String(t.cid)))
  if (!ft.length) return null
  const sets = calcSetups(ft)
  const pct = sets.reduce((x, g) => x + g.trades.reduce((y, t) => y + (t.r_pnl || 0), 0) / g.trades.length, 0)
  const base = [...new Set(ft.map(t => String(t.cid)))].reduce((x, id) => x + (accounts.find(a => String(a.id) === id)?.capital || 0), 0)
  return { pct: parseFloat(pct.toFixed(2)), usd: Math.round(pct / 100 * base), base, setups: sets.length, trades: ft.length }
}

// Crecimiento del capital fondeado en el tiempo. Una cuenta "entra" el día de su primer trade
// (no hay fecha de alta en los datos) y deja de contar al cerrarse/perderse (su último trade).
// Devuelve la serie fecha -> capital operando y P&L acumulado en USD, y la rentabilidad sobre el
// CAPITAL PROMEDIO operado (capital × días), que es más justa que dividir por el capital final.
export function calcFundedGrowth(trades, accounts) {
  const fundedAccs = accounts.filter(a => a.type === 'funded')
  const ids = new Set(fundedAccs.map(a => String(a.id)))
  const ft = trades.filter(t => isClosed(t) && ids.has(String(t.cid)))
  if (!ft.length) return null
  const day = f => { const d = parseFecha(f); return d ? Math.floor(d.getTime() / 86400000) : null }
  const info = fundedAccs.map(a => {
    const ts = ft.filter(t => String(t.cid) === String(a.id)).map(t => day(t.fecha)).filter(x => x !== null)
    if (!ts.length) return null
    const ended = ['completed', 'closed', 'perdida'].includes(a.status)
    return { a, start: Math.min(...ts), end: ended ? Math.max(...ts) : null, cap: a.capital || 0 }
  }).filter(Boolean)
  const today = Math.floor(Date.now() / 86400000)
  const t0 = Math.min(...info.map(i => i.start))
  const events = [...new Set([...ft.map(t => day(t.fecha)), ...info.map(i => i.start), ...info.filter(i => i.end !== null).map(i => i.end), today])].filter(x => x !== null).sort((a, b) => a - b)
  const capAt = d => info.filter(i => i.start <= d && (i.end === null || d <= i.end)).reduce((x, i) => x + i.cap, 0)
  const usdByDay = {}
  ft.forEach(t => {
    const cap = fundedAccs.find(a => String(a.id) === String(t.cid))?.capital || 0
    const d = day(t.fecha); usdByDay[d] = (usdByDay[d] || 0) + (t.r_pnl || 0) / 100 * cap
  })
  let cum = 0, capDays = 0
  const fmt = d => { const x = new Date(d * 86400000); return `${String(x.getUTCDate()).padStart(2, '0')}/${String(x.getUTCMonth() + 1).padStart(2, '0')}/${x.getUTCFullYear()}` }
  const points = events.map((d, i) => {
    cum += usdByDay[d] || 0
    return { fecha: fmt(d), capital: capAt(d), usd: Math.round(cum) }
  })
  for (let d = t0; d <= today; d++) capDays += capAt(d)
  const avgCap = capDays / (today - t0 + 1)
  const usd = Math.round(cum)
  return {
    points, usd, avgCap: Math.round(avgCap), days: today - t0 + 1,
    retAvg: avgCap > 0 ? parseFloat((usd / avgCap * 100).toFixed(2)) : 0,
    steps: info.map(i => ({ nombre: i.a.nombre, cap: i.cap, fecha: fmt(i.start) })).sort((a, b) => 0)
  }
}

// Curva de capital de las fondeadas en % del capital total, sin interés compuesto.
export function calcFundedCurve(trades, accounts) {
  const cap = new Map(accounts.map(a => [String(a.id), a.capital || 0]))
  const ft = sortTrades(trades.filter(isClosed))
  const base = [...new Set(ft.map(t => String(t.cid)))].reduce((s, id) => s + (cap.get(id) || 0), 0)
  let usd = 0
  const data = [{ fecha: 'Inicio', pnl: 0, usd: 0 }]
  ft.forEach(t => {
    usd += (t.r_pnl || 0) / 100 * (cap.get(String(t.cid)) || 0)
    data.push({ fecha: t.fecha, pnl: base > 0 ? parseFloat((usd / base * 100).toFixed(2)) : 0, usd: Math.round(usd) })
  })
  return data
}

// Fases de evaluación: aprobadas / perdidas / en curso
export function calcEvaluationStats(accounts) {
  const ch = accounts.filter(a => a.type === 'challenge')
  const passed = ch.filter(a => a.status === 'completed').length
  const lost = ch.filter(a => a.status === 'perdida').length
  const running = ch.filter(a => !['completed', 'closed', 'perdida'].includes(a.status)).length
  return { passed, lost, running, rate: passed + lost > 0 ? Math.round(passed / (passed + lost) * 100) : null }
}

// Rendimiento histórico según el orden del trade dentro del día (1º, 2º, 3º, 4º o más)
export function calcNthTradeStats(trades) {
  const td = tradeOfDayMap(trades)
  const out = {}
  groupStats(trades, t => Math.min(td.get(t.id) || 1, 4)).forEach(g => { out[g.key] = g })
  return out
}

// Rendimiento histórico por riesgo usado en el trade
export function calcRiskBucket(trades, minRisk) {
  return calcMetrics(trades.filter(t => isClosed(t) && riskOf(t) >= minRisk))
}

// Estado de disciplina de un día (semáforo y Diario), contado en SETUPS (no en filas/cuentas).
// Regla de corte: 2 setups perdedores en el día, o 3 setups en total. Es una regla de gestión
// de riesgo, no una conclusión estadística. Dentro de un día histórico el orden es aproximado.
export function calcDayStatus(trades, fecha) {
  const dayTrades = trades.filter(t => isClosed(t) && t.fecha === fecha)
  const sets = calcSetups(trades).filter(g => g.fecha === fecha)
  const losses = sets.filter(g => g.resultado === 'Loss').length
  const last = sets.length ? sets[sets.length - 1] : null
  const rToday = parseFloat(dayTrades.reduce((s, t) => s + rOf(t), 0).toFixed(2))
  const nth = calcNthSetupStats(trades)
  const late = nth[3]
  const nT = dayTrades.length
  const lbl = `${sets.length} setup${sets.length === 1 ? '' : 's'} (${nT} entrada${nT === 1 ? '' : 's'} en cuentas)`
  let level = 'ok', msg = sets.length ? `${lbl} hoy · ${fmtR(rToday, 1)} sumando cuentas.` : 'Sin trades hoy. Operá solo el setup completo.'
  if (last && last.resultado === 'Loss') {
    level = 'warn'
    msg = 'Tu último setup de hoy fue pérdida. Antes de reintentar, confirmá que el nuevo sea 100% exacto.'
  }
  if (sets.length >= 2 && level === 'ok') {
    level = 'warn'
    msg = `${lbl} hoy. Un tercer setup en el día solo si es 100% exacto.`
  }
  if (losses >= 2 || sets.length >= 3) {
    level = 'stop'
    msg = losses >= 2
      ? `${losses} setups perdidos hoy (${fmtR(rToday, 1)} sumando cuentas). Regla de corte: cerrá la sesión, no hay nada que recuperar.`
      : `Ya llevás ${sets.length} setups hoy. ${late && late.n >= 8 ? `Tus terceros setups del día rinden ${fmtR(late.avgR, 2)} por setup (${late.n} casos).` : 'Cortá si no es 100% exacto.'}`
  }
  return { n: sets.length, nTrades: nT, losses, rToday, level, msg, nextN: sets.length + 1, late }
}

export function calcPlanBreakdown(trades) {
  const rows = [
    { key: '100% exacto', label: 'Plan exacto' },
    { key: 'Parcialmente', label: 'Parcialmente' },
    { key: 'No cumplía', label: 'No cumplía' },
  ]
  return rows.map(r => ({ ...r, ...calcMetrics(trades.filter(e => isClosed(e) && (e.plan || '') === r.key)) }))
}

// Nº de trade dentro del día (sobre todas las cuentas, por orden de id).
export function tradeOfDayMap(trades) {
  const counts = {}, out = new Map()
  sortTrades(trades.filter(isClosed)).forEach(e => {
    const k = e.fecha
    counts[k] = (counts[k] || 0) + 1
    out.set(e.id, counts[k])
  })
  return out
}

export function pnlSinceLastWD(accId, trades, withdrawals) {
  const wds = (withdrawals[accId] || []).slice().sort((a, b) => {
    const da = parseFecha(a.fecha), db = parseFecha(b.fecha)
    return da && db ? da - db : 0
  })
  const lastWD = wds.length ? wds[wds.length - 1] : null
  let filtered = trades.filter(e => String(e.cid) === String(accId) && ['Win', 'Loss', 'Breakeven'].includes(e.resultado))
  if (lastWD) {
    const wdDate = parseFecha(lastWD.fecha)
    filtered = filtered.filter(e => { const d = parseFecha(e.fecha); return d && d > wdDate })
  }
  return parseFloat(filtered.reduce((s, e) => s + (e.r_pnl || 0), 0).toFixed(2))
}

export function pnlTotal(accId, trades) {
  return parseFloat(trades.filter(e => String(e.cid) === String(accId))
    .reduce((s, e) => s + (e.r_pnl || 0), 0).toFixed(2))
}

export function groupByPeriod(trades, tab) {
  const kfn = tab === 'week' ? weekKey : tab === 'month' ? monthKey : yearKey
  const map = {}
  trades.forEach(e => {
    const d = parseFecha(e.fecha); if (!d) return
    const k = kfn(d)
    if (!map[k]) map[k] = []
    map[k].push(e)
  })
  return map
}

export function periodMetrics(trades) {
  const g = calcMetrics(trades)
  const qT = trades.filter(isQuality)
  const gQ = calcMetrics(qT)
  const days = new Set(trades.map(e => e.fecha)).size
  return { ...g, wrQ: gQ.wr, avgRRQ: gQ.avgRR, days, qCount: qT.length }
}

export function calcStreaks(trades) {
  // Rachas contadas en SETUPS (un setup operado en 2 cuentas es 1 decisión). Los BE no cortan.
  const sorted = calcSetups(trades).filter(g => g.resultado === 'Win' || g.resultado === 'Loss')
  if (!sorted.length) return { cur: 0, type: null, maxW: 0, maxL: 0, last10: [] }
  let cur = 1, curType = sorted[sorted.length - 1].resultado
  let maxW = 0, maxL = 0, tmpS = 1, tmpT = sorted[0].resultado
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (sorted[i].resultado === curType) cur++
    else break
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].resultado === tmpT) { tmpS++ }
    else {
      if (tmpT === 'Win' && tmpS > maxW) maxW = tmpS
      if (tmpT === 'Loss' && tmpS > maxL) maxL = tmpS
      tmpT = sorted[i].resultado; tmpS = 1
    }
  }
  if (tmpT === 'Win' && tmpS > maxW) maxW = tmpS
  if (tmpT === 'Loss' && tmpS > maxL) maxL = tmpS
  const last10 = sorted.slice(-10).map(e => e.resultado)
  return { cur, type: curType, maxW, maxL, last10 }
}

export function calcStreakDistribution(trades) {
  const sorted = [...trades]
    .filter(e => e.resultado === 'Win' || e.resultado === 'Loss')
    .sort((a, b) => {
      const da = parseFecha(a.fecha), db = parseFecha(b.fecha)
      return (da - db) || (a.id - b.id)
    })
  if (!sorted.length) return { wins: {}, losses: {} }
  const winDist = {}, lossDist = {}
  let curType = sorted[0].resultado, curLen = 1
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].resultado === curType) { curLen++ }
    else {
      const dist = curType === 'Win' ? winDist : lossDist
      dist[curLen] = (dist[curLen] || 0) + 1
      curType = sorted[i].resultado; curLen = 1
    }
  }
  const dist = curType === 'Win' ? winDist : lossDist
  dist[curLen] = (dist[curLen] || 0) + 1
  return { wins: winDist, losses: lossDist }
}

// Sharpe / Sortino por trade, en R (no anualizados).
export function calcSharpe(trades) {
  const rs = trades.filter(isClosed).map(rOf)
  if (rs.length < 3) return null
  const mean = rs.reduce((s, v) => s + v, 0) / rs.length
  const variance = rs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / rs.length
  const std = Math.sqrt(variance)
  return std > 0 ? parseFloat((mean / std).toFixed(2)) : null
}

export function calcSortino(trades) {
  const rs = trades.filter(isClosed).map(rOf)
  if (rs.length < 3) return null
  const mean = rs.reduce((s, v) => s + v, 0) / rs.length
  const negatives = rs.filter(v => v < 0)
  if (!negatives.length) return null
  const downsideVar = negatives.reduce((s, v) => s + Math.pow(v, 2), 0) / rs.length
  const downsideDev = Math.sqrt(downsideVar)
  return downsideDev > 0 ? parseFloat((mean / downsideDev).toFixed(2)) : null
}

// Calmar en R: R total / peor drawdown (en R) de una cuenta individual.
export function calcCalmar(trades) {
  const closed = trades.filter(isClosed)
  if (closed.length < 2) return null
  const maxDD = calcMaxDD(closed, 'R')
  const totalR = closed.reduce((s, e) => s + rOf(e), 0)
  return maxDD > 0 ? parseFloat((totalR / maxDD).toFixed(2)) : null
}

// Expectativa = R medio por trade cerrado (Breakeven incluidos como 0R).
export function calcExpectancy(trades) {
  const closed = trades.filter(isClosed)
  if (!closed.length) return null
  return parseFloat((closed.reduce((s, e) => s + rOf(e), 0) / closed.length).toFixed(3))
}

export function calcEdgeRatio(trades) {
  const wins = trades.filter(e => e.resultado === 'Win' && (e.rr || 0) > 0)
  if (!wins.length) return null
  const sumObj = wins.reduce((s, e) => s + (e.rr || 0), 0)
  const sumReal = wins.reduce((s, e) => s + (e.rr_real || e.rr || 0), 0)
  return sumObj > 0 ? parseFloat((sumReal / sumObj * 100).toFixed(1)) : null
}

export function calcMonthlyStats(trades) {
  const map = groupByPeriod(trades, 'month')
  const months = Object.keys(map).sort()
  if (!months.length) return { avg: null, std: null, returns: [], months: [] }
  const returns = months.map(k => parseFloat(map[k].reduce((s, e) => s + (isClosed(e) ? rOf(e) : 0), 0).toFixed(2)))
  const avg = returns.reduce((s, v) => s + v, 0) / returns.length
  const variance = returns.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / returns.length
  const std = Math.sqrt(variance)
  return {
    avg: parseFloat(avg.toFixed(2)),
    std: parseFloat(std.toFixed(2)),
    returns,
    months: months.map((k, i) => ({ key: k, label: keyLabel(k, 'month'), pnl: returns[i], positive: returns[i] > 0 }))
  }
}

export function calcConsistency(trades) {
  const monthly = calcMonthlyStats(trades)
  if (!monthly.months.length) return { pct: null, months: monthly.months }
  const pos = monthly.months.filter(m => m.positive).length
  return { pct: Math.round(pos / monthly.months.length * 100), months: monthly.months }
}

export function calcDynamicGoals(trades) {
  const g = calcMetrics(trades)
  const qT = trades.filter(isQuality)
  const gQ = calcMetrics(qT)
  const monthly = calcMonthlyStats(trades)
  const edge = calcEdgeRatio(trades)
  const wrGoal = gQ.wr !== null ? Math.min(Math.round(gQ.wr * 0.85), 75) : 55
  const pfGoal = g.pf !== null ? parseFloat(Math.max(g.pf + 0.15, 1.5).toFixed(2)) : 1.5
  const topMonths = [...monthly.returns].sort((a, b) => b - a).slice(0, 3)
  const rrGoal = g.avgRR !== null ? parseFloat(Math.max(g.avgRR + 0.2, 2.0).toFixed(1)) : 2.0
  const edgeGoal = edge !== null ? Math.min(edge + 5, 95) : 85
  return { wrGoal, pfGoal, rrGoal, edgeGoal, wrCur: g.wr, pfCur: g.pf, rrCur: g.avgRR, edgeCur: edge }
}

export function calcDeteriorationAlerts(trades, accounts) {
  const alerts = []
  const now = new Date()
  accounts.filter(a => a.status === 'active').forEach(a => {
    const accTrades = trades.filter(e => String(e.cid) === String(a.id))
    const recent = accTrades.filter(e => {
      const d = parseFecha(e.fecha)
      if (!d) return false
      return Math.round((now - d) / 86400000) <= 10
    })
    if (!recent.length) return
    const outOfPlan = recent.filter(e => !isQuality(e) && (e.resultado === 'Win' || e.resultado === 'Loss')).length
    const winsR = recent.filter(e => e.resultado === 'Win').length
    const losses = recent.filter(e => e.resultado === 'Loss').length
    const wrRecent = winsR + losses > 0 ? Math.round(winsR / (winsR + losses) * 100) : null
    const pnlRecent = parseFloat(recent.reduce((s, e) => s + (e.r_pnl || 0), 0).toFixed(2))
    let level = null, msg = ''
    if (outOfPlan >= 5) { level = 'danger'; msg = `⚠ ${a.nombre}: ${outOfPlan} trades fuera de plan en los últimos 10 días.` }
    else if (outOfPlan >= 3) { level = 'warn'; msg = `△ ${a.nombre}: ${outOfPlan} trades fuera de plan en los últimos 10 días.` }
    if (level) alerts.push({ level, msg, cuenta: a.nombre, outOfPlan, wrRecent, pnlRecent })
    const sortedR = [...recent].sort((x, y) => { const dx = parseFecha(x.fecha), dy = parseFecha(y.fecha); return dx - dy })
    let lastN = 0
    for (let i = sortedR.length - 1; i >= 0; i--) {
      if (sortedR[i].resultado === 'Loss') lastN++
      else break
    }
    if (lastN >= 3 && !alerts.find(al => al.cuenta === a.nombre && al.level === 'danger')) {
      alerts.push({ level: lastN >= 4 ? 'danger' : 'warn', msg: `${lastN >= 4 ? '⚠' : '△'} ${a.nombre}: ${lastN} losses consecutivos.`, cuenta: a.nombre, streak: lastN })
    }
  })
  return alerts
}

export function calcAUM(accounts, trades, withdrawals = {}) {
  const active = accounts.filter(a => !['completed', 'closed', 'perdida'].includes(a.status))
  const challengeCapital = active.filter(a => a.type === 'challenge').reduce((s, a) => s + (a.capital || 0), 0)
  const fundedCapital = active.filter(a => a.type === 'funded').reduce((s, a) => s + (a.capital || 0), 0)
  const grossPnlUSD = accounts.reduce((s, a) => {
    const pnlPct = trades.filter(e => String(e.cid) === String(a.id)).reduce((s2, e) => s2 + (e.r_pnl || 0), 0)
    return s + (pnlPct / 100 * (a.capital || 0))
  }, 0)
  const myPnlUSD = accounts.filter(a => a.type === 'funded').reduce((s, a) => {
    const pnlPctCurrent = pnlSinceLastWD(a.id, trades, withdrawals)
    const split = parseInt((a.split || '80/20').split('/')[0]) || 80
    return s + (pnlPctCurrent / 100 * (a.capital || 0)) * (split / 100)
  }, 0)
  const lost = accounts.filter(a => a.status === 'perdida')
  return {
    challenge: challengeCapital, funded: fundedCapital,
    total: challengeCapital + fundedCapital,
    grossPnlUSD: parseFloat(grossPnlUSD.toFixed(2)),
    myPnlUSD: parseFloat(myPnlUSD.toFixed(2)),
    activeCount: active.length,
    completedCount: accounts.filter(a => a.status === 'completed').length,
    lostCount: lost.length,
    lostCapital: lost.reduce((s, a) => s + (a.capital || 0), 0)
  }
}

// Curva acumulada. unit 'pct' (default, suma de % de cuenta, como antes) o 'R'.
// Ojo: sobre varias cuentas es una suma, no el retorno de un capital real.
export function buildEquityCurve(trades, unit = 'pct') {
  const val = unit === 'R' ? rOf : (e => e.r_pnl || 0)
  let running = 0
  const data = [{ fecha: 'Inicio', pnl: 0, resultado: null }]
  sortTrades(trades.filter(isClosed)).forEach(t => {
    running = parseFloat((running + val(t)).toFixed(4))
    data.push({ fecha: t.fecha, pnl: parseFloat(running.toFixed(2)), resultado: t.resultado })
  })
  return data
}

export function calcDirectionStats(trades) {
  const long = trades.filter(e => e.direccion === 'Compra')
  const short = trades.filter(e => e.direccion === 'Venta')
  const longW = long.filter(e => e.resultado === 'Win').length
  const longL = long.filter(e => e.resultado === 'Loss').length
  const shortW = short.filter(e => e.resultado === 'Win').length
  const shortL = short.filter(e => e.resultado === 'Loss').length
  return {
    long: { count: long.length, w: longW, l: longL, wr: longW + longL > 0 ? Math.round(longW / (longW + longL) * 100) : null, pnl: parseFloat(long.reduce((s, e) => s + (e.r_pnl || 0), 0).toFixed(2)) },
    short: { count: short.length, w: shortW, l: shortL, wr: shortW + shortL > 0 ? Math.round(shortW / (shortW + shortL) * 100) : null, pnl: parseFloat(short.reduce((s, e) => s + (e.r_pnl || 0), 0).toFixed(2)) }
  }
}

// Drawdown máximo: se calcula POR CUENTA sobre el resultado de cierre de cada
// día (el orden dentro del mismo día no se puede recuperar en datos viejos) y
// se devuelve el peor. unit 'pct' (% de cuenta, default) o 'R'.
export function calcMaxDD(trades, unit = 'pct') {
  const val = unit === 'R' ? rOf : (e => e.r_pnl || 0)
  const byAcc = new Map()
  trades.filter(isClosed).forEach(e => {
    const k = String(e.cid || e.c_nombre || '')
    if (!byAcc.has(k)) byAcc.set(k, [])
    byAcc.get(k).push(e)
  })
  let worst = 0
  byAcc.forEach(arr => {
    const byDay = new Map()
    arr.forEach(e => {
      const d = parseFecha(e.fecha); if (!d) return
      byDay.set(d.getTime(), (byDay.get(d.getTime()) || 0) + val(e))
    })
    let cum = 0, peak = 0
    ;[...byDay.keys()].sort((a, b) => a - b).forEach(t => {
      cum += byDay.get(t)
      if (cum > peak) peak = cum
      if (peak - cum > worst) worst = peak - cum
    })
  })
  return parseFloat(worst.toFixed(2))
}


// ── FECHAS ─────────────────────────────────────────────────────────────────
// Formato de almacenamiento: DD/MM/AAAA. Se valida que sea una fecha REAL (no 31/02) y no futura.
export function isRealFecha(f) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(f || '')) return false
  const [d, m, y] = f.split('/').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}
export function isFutureFecha(f) {
  const d = parseFecha(f); if (!d) return false
  const t = new Date(); t.setHours(23, 59, 59, 999)
  return d.getTime() > t.getTime()
}
export const fechaToInput = f => { const p = (f || '').split('/'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : '' }
export const inputToFecha = v => { const p = (v || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '' }

// ── LIBRO DE RETIROS ───────────────────────────────────────────────────────
// Convención: el monto de cada retiro es lo COBRADO (tu parte, después del split de la firma).
// La firma deja la cuenta en su capital inicial después de cada payout: cada retiro abre un CICLO nuevo.
// Pendiente = resultado del ciclo actual (trades posteriores al último retiro) × split, si es positivo. Una pérdida
// posterior al payout no devuelve nada de lo ya cobrado, y no se arrastra al ciclo anterior.
export const splitOf = a => parseInt(String(a?.split || '80/20').split('/')[0]) || 80
export function calcFundedLedger(trades, accounts, withdrawals) {
  const rows = accounts.filter(a => a.type === 'funded').map(a => {
    const cap = a.capital || 0
    const ts = trades.filter(t => isClosed(t) && String(t.cid) === String(a.id))
    const pct = ts.reduce((x, t) => x + (t.r_pnl || 0), 0)
    const gross = pct / 100 * cap
    const split = splitOf(a)
    const wds = withdrawals[String(a.id)] || []
    const cobrado = wds.reduce((x, w) => x + (w.usd || 0), 0)
    const cicloPct = pnlSinceLastWD(a.id, trades, withdrawals)
    const ciclo = cicloPct / 100 * cap
    return { a, cap, n: ts.length, pct: parseFloat(pct.toFixed(2)), gross: Math.round(gross), split, cobrado: Math.round(cobrado), cicloPct, ciclo: Math.round(ciclo), pendiente: Math.round(Math.max(0, ciclo) * split / 100), nWd: wds.length }
  })
  const sum = k => rows.reduce((x, r) => x + r[k], 0)
  return { rows, gross: sum('gross'), cobrado: sum('cobrado'), pendiente: sum('pendiente'), ciclo: sum('ciclo'), capital: sum('cap'), nWd: sum('nWd') }
}

// Valida un retiro antes de guardarlo. Devuelve { errors:[], warnings:[] }.
export function validateWithdrawal(wd, accounts, withdrawals, ledger, ignoreId = null) {
  const errors = [], warnings = []
  const acc = accounts.find(a => String(a.id) === String(wd.cid))
  if (!acc) errors.push('Elegí una cuenta fondeada.')
  if (!isRealFecha(wd.fecha)) errors.push('La fecha no es válida (DD/MM/AAAA).')
  else if (isFutureFecha(wd.fecha)) errors.push('La fecha es futura.')
  const usd = parseFloat(wd.usd)
  if (!(usd > 0)) errors.push('El monto cobrado tiene que ser mayor a 0.')
  if (acc && usd > 0) {
    const dup = (withdrawals[String(acc.id)] || []).find(w => w.id !== ignoreId && w.fecha === wd.fecha && Math.abs((w.usd || 0) - usd) < 0.01)
    if (dup) errors.push('Ya existe un retiro igual (misma cuenta, fecha y monto).')
    const r = ledger?.rows.find(x => String(x.a.id) === String(acc.id))
    if (r && !ignoreId) {
      const disponible = r.pendiente
      if (usd > disponible * 1.1 + 1) warnings.push(`El monto ($${usd.toFixed(0)}) supera lo pendiente del ciclo actual según tus trades ($${disponible}). Revisá el monto o la cuenta.`)
      else if (usd < disponible * 0.5 && disponible > 50) warnings.push(`Cobrás bastante menos de lo pendiente ($${disponible}). Si fue un retiro parcial, queda saldo por cobrar.`)
    }
  }
  return { errors, warnings }
}

// ── AUDITORÍA DE DATOS ─────────────────────────────────────────────────────
// Detecta cargas que hacen que las métricas salgan mal. sev: 'error' (distorsiona números) | 'warn' | 'info'.
export function auditData(trades, accounts, withdrawals) {
  const issues = []
  const accIds = new Set(accounts.map(a => String(a.id)))
  const add = (sev, area, msg, extra = {}) => issues.push({ sev, area, msg, ...extra })
  const cl = trades.filter(isClosed)
  const badDate = cl.filter(t => !isRealFecha(t.fecha) || isFutureFecha(t.fecha))
  if (badDate.length) add('error', 'trades', `${badDate.length} trade(s) con fecha inválida o futura.`, { ids: badDate.map(t => t.id) })
  const noRisk = cl.filter(t => riskOf(t) <= 0)
  if (noRisk.length) add('error', 'trades', `${noRisk.length} trade(s) sin riesgo: no entran en las métricas en R.`, { ids: noRisk.map(t => t.id) })
  const lossBad = cl.filter(t => t.resultado === 'Loss' && riskOf(t) > 0 && Math.abs((t.r_pnl || 0) + riskOf(t)) > 0.01)
  if (lossBad.length) add('error', 'trades', `${lossBad.length} pérdida(s) cuyo P&L no coincide con el riesgo.`, { ids: lossBad.map(t => t.id) })
  const winBad = cl.filter(t => t.resultado === 'Win' && riskOf(t) > 0 && Math.abs((t.r_pnl || 0) - riskOf(t) * (t.rr_real || t.rr || 0)) > 0.02)
  if (winBad.length) add('error', 'trades', `${winBad.length} ganancia(s) cuyo P&L no coincide con riesgo × R:R real.`, { ids: winBad.map(t => t.id) })
  const beBad = cl.filter(t => t.resultado === 'Breakeven' && Math.abs(t.r_pnl || 0) > 0.001)
  if (beBad.length) add('warn', 'trades', `${beBad.length} breakeven con P&L distinto de 0.`, { ids: beBad.map(t => t.id) })
  const orphan = cl.filter(t => !accIds.has(String(t.cid)))
  if (orphan.length) add('error', 'trades', `${orphan.length} trade(s) de una cuenta que ya no existe.`, { ids: orphan.map(t => t.id) })
  // (Sin control de duplicados: reintentar el mismo setup en la misma cuenta tras un SL produce trades idénticos legítimos; la importación ya evita duplicados.)
  const noPlan = cl.filter(t => !t.plan || t.plan === '—').length
  if (noPlan) add('info', 'trades', `${noPlan} trade(s) sin plan asignado.`)
  const noDir = cl.filter(t => !t.direccion || t.direccion === '—').length
  if (noDir) add('info', 'trades', `${noDir} trade(s) sin dirección (compra/venta). Son los primeros trades; completarla mejora el agrupado por setup, pero no cambia tus métricas.`)
  accounts.forEach(a => {
    if (!(a.capital > 0)) add('error', 'cuentas', `La cuenta ${a.nombre} no tiene capital cargado.`)
  })
  Object.entries(withdrawals).forEach(([accId, list]) => {
    const a = accounts.find(x => String(x.id) === accId)
    list.forEach(w => {
      if (!a) { add('error', 'retiros', `Retiro del ${w.fecha} en una cuenta que ya no existe.`, { wid: w.id }); return }
      if (!isRealFecha(w.fecha) || isFutureFecha(w.fecha)) add('error', 'retiros', `Retiro de ${a.nombre}: fecha inválida o futura (${w.fecha}).`, { wid: w.id })
      if (!(w.usd > 0)) add('error', 'retiros', `Retiro de ${a.nombre} del ${w.fecha}: monto vacío o 0.`, { wid: w.id })
      const expected = a.capital > 0 ? (w.usd || 0) / a.capital * 100 : 0
      if (a.capital > 0 && Math.abs((w.pct || 0) - expected) > 0.1)
        add('warn', 'retiros', `Retiro de ${a.nombre} del ${w.fecha}: el % guardado (${(w.pct || 0).toFixed(2)}%) no coincide con monto/capital (${expected.toFixed(2)}%).`, { wid: w.id, fixPct: parseFloat(expected.toFixed(3)) })
    })
  })
  return issues
}


// ── CAPITAL PROPIO (cuenta personal real) ──
// Cuenta con dinero propio: no es de ninguna firma, así que NO entra en las métricas de fondeo/challenge.
export const isPersonalAcc = a => a?.type === 'personal'
export function splitPersonal(trades, accounts) {
  const ids = new Set(accounts.filter(isPersonalAcc).map(a => String(a.id)))
  const isP = t => ids.has(String(t.cid)) || t.c_tipo === 'personal'
  return {
    firmTrades: trades.filter(t => !isP(t)),
    personalTrades: trades.filter(isP),
    firmAccounts: accounts.filter(a => !isPersonalAcc(a)),
    personalAccounts: accounts.filter(isPersonalAcc)
  }
}

// Una cuenta real SÍ compone: arriesgás un % del saldo actual, así que el saldo se calcula encadenando
// cada trade (saldo × (1 + P&L%)). Es lo que debería coincidir con Myfxbook (salvo comisiones/swaps).
export function calcPersonalSummary(trades, accounts) {
  const accs = accounts.filter(isPersonalAcc)
  if (!accs.length) return null
  const ids = new Set(accs.map(a => String(a.id)))
  const pt = sortTrades(trades.filter(t => isClosed(t) && ids.has(String(t.cid))))
  const start = accs.reduce((s, a) => s + (a.capital || 0), 0)
  const bal = {}
  accs.forEach(a => { bal[String(a.id)] = a.capital || 0 })
  const total = () => Object.values(bal).reduce((s, v) => s + v, 0)
  const points = [{ fecha: 'Inicio', balance: parseFloat(start.toFixed(2)), pct: 0 }]
  let peak = start, maxDD = 0
  pt.forEach(t => {
    bal[String(t.cid)] *= 1 + (t.r_pnl || 0) / 100
    const tot = total()
    if (tot > peak) peak = tot
    if (peak > 0 && (peak - tot) / peak * 100 > maxDD) maxDD = (peak - tot) / peak * 100
    points.push({ fecha: t.fecha, balance: parseFloat(tot.toFixed(2)), pct: parseFloat(((tot / start - 1) * 100).toFixed(2)) })
  })
  const balance = total()
  const risks = pt.map(riskOf).filter(r => r > 0)
  return {
    n: pt.length, start, accounts: accs.length,
    balance: parseFloat(balance.toFixed(2)),
    usd: parseFloat((balance - start).toFixed(2)),
    retPct: start > 0 ? parseFloat(((balance / start - 1) * 100).toFixed(2)) : 0,
    simplePct: parseFloat(pt.reduce((s, t) => s + (t.r_pnl || 0), 0).toFixed(2)),
    maxDD: parseFloat(maxDD.toFixed(2)),
    avgRisk: risks.length ? parseFloat((risks.reduce((s, v) => s + v, 0) / risks.length).toFixed(1)) : null,
    maxRisk: risks.length ? Math.max(...risks) : null,
    m: calcMetrics(pt), points, trades: pt
  }
}
