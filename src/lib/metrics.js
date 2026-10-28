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
  const rs = trades.filter(isClosed).map(rOf)
  if (rs.length < 10) return null
  let seed = 123456789
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const means = []
  for (let i = 0; i < iters; i++) {
    let s = 0
    for (let j = 0; j < rs.length; j++) s += rs[Math.floor(rnd() * rs.length)]
    means.push(s / rs.length)
  }
  means.sort((a, b) => a - b)
  return { lo: parseFloat(means[Math.floor(iters * 0.025)].toFixed(3)), hi: parseFloat(means[Math.floor(iters * 0.975)].toFixed(3)), n: rs.length }
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
  return { m, n: ft.length, accounts: live.length, capital: live.reduce((s, a) => s + (a.capital || 0), 0), usd: parseFloat(usd.toFixed(0)), exact, trades: ft }
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

// Estado de disciplina de un día (semáforo y Diario).
// Solo afirma lo que los datos sostienen: el orden dentro de un día histórico NO se conserva
// con certeza, así que no se citan cifras del 2º/3º trade; sí del "4º trade o más", que es
// negativo en cualquier orden posible. Las reglas de corte (2 pérdidas) son una regla estándar
// de gestión de riesgo, no una conclusión estadística.
export function calcDayStatus(trades, fecha) {
  const day = sortTrades(trades.filter(t => isClosed(t) && t.fecha === fecha))
  const losses = day.filter(t => t.resultado === 'Loss').length
  const last = day.length ? day[day.length - 1] : null
  const rToday = parseFloat(day.reduce((s, t) => s + rOf(t), 0).toFixed(2))
  const nth = calcNthTradeStats(trades)
  const nextN = day.length + 1
  const late = nth[4]
  let level = 'ok', msg = day.length ? `${day.length} trade${day.length > 1 ? 's' : ''} hoy · ${fmtR(rToday, 1)}.` : 'Sin trades hoy. Operá solo el setup completo.'
  if (last && last.resultado === 'Loss') {
    level = 'warn'
    msg = 'Tu último trade de hoy fue pérdida. Antes del próximo, confirmá que el setup sea 100% exacto.'
  }
  if (day.length >= 3) {
    level = 'warn'
    msg = `Llevás ${day.length} trades hoy. El 4º trade del día o más rinde ${fmtR(late?.avgR, 2)} por trade en tus datos (${late?.n || 0} trades).`
  }
  if (losses >= 2 || day.length >= 4) {
    level = 'stop'
    msg = losses >= 2
      ? `${losses} pérdidas hoy (${fmtR(rToday, 1)}). Regla de corte: cerrá la sesión, no hay nada que recuperar.`
      : `Ya hiciste ${day.length} trades hoy. En tus datos, del 4º en adelante el resultado es ${fmtR(late?.avgR, 2)} por trade.`
  }
  return { n: day.length, losses, rToday, level, msg, nextN, late }
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
  const sorted = [...trades]
    .filter(e => e.resultado === 'Win' || e.resultado === 'Loss')
    .sort((a, b) => {
      const da = parseFecha(a.fecha), db = parseFecha(b.fecha)
      return (da - db) || (a.id - b.id)
    })
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
  const returns = months.map(k => parseFloat(map[k].reduce((s, e) => s + (e.r_pnl || 0), 0).toFixed(2)))
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
