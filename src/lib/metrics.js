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

export function isQuality(e) {
  const plan = e.plan || ''
  const emo = e.emo || ''
  const sob = e.sob || ''
  const opero = e.opero || ''
  return (
    (plan === '100% exacto' || plan === 'Parcialmente') &&
    emo === 'Calmo' &&
    sob !== 'Sí, cedí' &&
    opero !== 'Sobreoperé'
  )
}

export function calcMetrics(trades) {
  const wins = trades.filter(e => e.resultado === 'Win')
  const losses = trades.filter(e => e.resultado === 'Loss')
  const w = wins.length, l = losses.length, tr = w + l
  const wr = tr > 0 ? Math.round((w / tr) * 100) : null
  const pnl = parseFloat(trades.reduce((s, e) => s + (e.r_pnl || 0), 0).toFixed(2))
  const rrWins = wins.filter(e => (e.rr_real || e.rr || 0) > 0)
  const avgRR = rrWins.length
    ? parseFloat((rrWins.reduce((s, e) => s + (e.rr_real || e.rr || 0), 0) / rrWins.length).toFixed(2))
    : null
  const gainSum = wins.reduce((s, e) => s + (e.r_pnl || 0), 0)
  const lossSum = Math.abs(losses.reduce((s, e) => s + (e.r_pnl || 0), 0))
  const pf = lossSum > 0 ? parseFloat((gainSum / lossSum).toFixed(2)) : null
  return { w, l, tr, wr, pnl, avgRR, pf, gainSum: parseFloat(gainSum.toFixed(2)), lossSum: parseFloat(lossSum.toFixed(2)) }
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

export function calcSharpe(trades) {
  const rs = trades.filter(e => e.resultado === 'Win' || e.resultado === 'Loss').map(e => e.r_pnl || 0)
  if (rs.length < 3) return null
  const mean = rs.reduce((s, v) => s + v, 0) / rs.length
  const variance = rs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / rs.length
  const std = Math.sqrt(variance)
  return std > 0 ? parseFloat((mean / std).toFixed(2)) : null
}

export function calcSortino(trades) {
  const rs = trades.filter(e => e.resultado === 'Win' || e.resultado === 'Loss').map(e => e.r_pnl || 0)
  if (rs.length < 3) return null
  const mean = rs.reduce((s, v) => s + v, 0) / rs.length
  const negatives = rs.filter(v => v < 0)
  if (!negatives.length) return null
  const downsideVar = negatives.reduce((s, v) => s + Math.pow(v, 2), 0) / rs.length
  const downsideDev = Math.sqrt(downsideVar)
  return downsideDev > 0 ? parseFloat((mean / downsideDev).toFixed(2)) : null
}

export function calcCalmar(trades) {
  const sorted = [...trades]
    .filter(e => e.resultado === 'Win' || e.resultado === 'Loss')
    .sort((a, b) => { const da = parseFecha(a.fecha), db = parseFecha(b.fecha); return da - db })
  if (sorted.length < 2) return null
  let peak = 0, running = 0, maxDD = 0
  sorted.forEach(e => {
    running += e.r_pnl || 0
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  })
  const totalReturn = sorted.reduce((s, e) => s + (e.r_pnl || 0), 0)
  return maxDD > 0 ? parseFloat((totalReturn / maxDD).toFixed(2)) : null
}

export function calcExpectancy(trades) {
  const wins = trades.filter(e => e.resultado === 'Win')
  const losses = trades.filter(e => e.resultado === 'Loss')
  const tr = wins.length + losses.length; if (!tr) return null
  const wr = wins.length / tr
  const avgW = wins.length ? wins.reduce((s, e) => s + (e.r_pnl || 0), 0) / wins.length : 0
  const avgL = losses.length ? Math.abs(losses.reduce((s, e) => s + (e.r_pnl || 0), 0) / losses.length) : 0
  return parseFloat(((wr * avgW) - ((1 - wr) * avgL)).toFixed(3))
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

export function buildEquityCurve(trades) {
  const sorted = [...trades]
    .filter(e => ['Win', 'Loss', 'Breakeven'].includes(e.resultado))
    .sort((a, b) => {
      const da = parseFecha(a.fecha), db = parseFecha(b.fecha)
      return (da - db) || (a.id - b.id)
    })
  let running = 0
  const data = [{ fecha: 'Inicio', pnl: 0, resultado: null }]
  sorted.forEach(t => {
    running = parseFloat((running + (t.r_pnl || 0)).toFixed(4))
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

export function calcMaxDD(trades) {
  const sorted = [...trades].sort((a, b) => {
    const da = parseFecha(a.fecha), db = parseFecha(b.fecha); return da - db
  })
  let peak = 0, running = 0, maxDD = 0
  sorted.forEach(e => {
    running += e.r_pnl || 0
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  })
  return parseFloat(maxDD.toFixed(2))
}
