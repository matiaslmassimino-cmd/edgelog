// ── CORE METRIC CALCULATIONS ──

export function parseFecha(f) {
  if (!f) return null
  const p = f.split('/')
  if (p.length !== 3) return null
  return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]))
}

export function isQuality(e) {
  return (
    (e.plan === '100% exacto' || e.plan === 'Parcialmente') &&
    e.emo === 'Calmo' &&
    e.sob !== 'Sí, cedí' &&
    e.opero !== 'Sobreoperé'
  )
}

export function calcMetrics(trades) {
  const wins = trades.filter(e => e.resultado === 'Win')
  const losses = trades.filter(e => e.resultado === 'Loss')
  const w = wins.length, l = losses.length, tr = w + l
  const wr = tr > 0 ? Math.round((w / tr) * 100) : null
  const pnl = parseFloat(trades.reduce((s, e) => s + (e.r_pnl || 0), 0).toFixed(2))
  const rrWins = wins.filter(e => (e.rr_real || e.rr) > 0)
  const avgRR = rrWins.length
    ? parseFloat((rrWins.reduce((s, e) => s + (e.rr_real || e.rr), 0) / rrWins.length).toFixed(2))
    : null
  const gainSum = wins.reduce((s, e) => s + (e.r_pnl || 0), 0)
  const lossSum = Math.abs(losses.reduce((s, e) => s + (e.r_pnl || 0), 0))
  const pf = lossSum > 0 ? parseFloat((gainSum / lossSum).toFixed(2)) : null
  return { w, l, tr, wr, pnl, avgRR, pf, gainSum, lossSum }
}

export function calcStreaks(trades) {
  const sorted = [...trades]
    .filter(e => e.resultado === 'Win' || e.resultado === 'Loss')
    .sort((a, b) => {
      const da = parseFecha(a.fecha), db = parseFecha(b.fecha)
      return da - db || a.id - b.id
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

export function pnlSinceLastWD(accId, trades, withdrawals) {
  const wds = (withdrawals[accId] || []).slice().sort((a, b) => {
    const da = parseFecha(a.fecha), db = parseFecha(b.fecha)
    return da && db ? da - db : 0
  })
  const lastWD = wds.length ? wds[wds.length - 1] : null
  let filtered = trades.filter(e => e.cid == accId && ['Win','Loss','Breakeven'].includes(e.resultado))
  if (lastWD) {
    const wdDate = parseFecha(lastWD.fecha)
    filtered = filtered.filter(e => { const d = parseFecha(e.fecha); return d && d > wdDate })
  }
  return parseFloat(filtered.reduce((s, e) => s + (e.r_pnl || 0), 0).toFixed(2))
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

function weekKey(d) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
  const y = tmp.getUTCFullYear()
  const w = Math.ceil(((tmp - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7)
  return `${y}-W${w < 10 ? '0' : ''}${w}`
}
function monthKey(d) {
  return `${d.getFullYear()}-${d.getMonth() < 9 ? '0' : ''}${d.getMonth() + 1}`
}
function yearKey(d) { return `${d.getFullYear()}` }
