import { supabase } from './supabase'

export async function fetchTrades(userId) {
  const { data, error } = await supabase.from('trades').select('*').eq('user_id', userId).order('fecha', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveTrade(userId, trade) {
  const row = {
    id: trade.id, user_id: userId, fecha: trade.fecha,
    cid: String(trade.cid || trade.cNombre || ''),
    c_nombre: trade.cNombre || trade.c_nombre || '',
    c_tipo: trade.cTipo || trade.c_tipo || 'challenge',
    firma: trade.firma || '', opero: trade.opero || 'Tomé un trade',
    risk: trade.risk || '', rp: trade.rp || 0,
    resultado: trade.resultado, rr: trade.rr || 0,
    rr_real: trade.rrReal || trade.rr_real || trade.rr || 0,
    parciales: trade.parciales || 'No',
    direccion: trade.direccion || '—',
    r_pnl: trade.rPnl !== undefined ? trade.rPnl : (trade.r_pnl || 0),
    plan: trade.plan || '—', emo: trade.emo || '—', sob: trade.sob || '—',
    par: trade.par || 'EURUSD', tmp: trade.tmp || '—', nota: trade.nota || ''
  }
  // Checklist pre-trade (columnas de la migración 20261028). Solo se envían si existen en el trade.
  const chk = {}
  ;['chk_estructura', 'chk_confirmacion', 'chk_liquidez_fvg'].forEach(k => { if (typeof trade[k] === 'boolean') chk[k] = trade[k] })
  if (trade.setup_id) chk.setup_id = String(trade.setup_id)
  let { error } = await supabase.from('trades').upsert({ ...row, ...chk })
  // Si la migración todavía no se corrió, la columna no existe: se guarda igual sin el checklist.
  if (error && Object.keys(chk).length && (error.code === 'PGRST204' || /chk_|setup_id/.test(error.message || ''))) {
    ;({ error } = await supabase.from('trades').upsert(row))
  }
  if (error) throw error
}

export async function deleteTrade(id) {
  const { error } = await supabase.from('trades').delete().eq('id', id)
  if (error) throw error
}

export async function updateTrade(id, updates) {
  const { error } = await supabase.from('trades').update(updates).eq('id', id)
  if (error) throw error
}

export async function fetchAccounts(userId) {
  const { data, error } = await supabase.from('accounts').select('*').eq('user_id', userId).order('id')
  if (error) throw error
  return data || []
}

export async function saveAccount(userId, acc) {
  const row = {
    id: acc.id, user_id: userId, type: acc.type, nombre: acc.nombre,
    firma: acc.firma, fase: acc.fase || null, capital: acc.capital || 10000,
    objetivo: acc.objetivo || null, dd: acc.dd || null, split: acc.split || '80/20',
    riesgo: acc.riesgo || null, nota: acc.nota || '',
    status: acc.status || 'active', parent: acc.parent || null, child: acc.child || null
  }
  const { error } = await supabase.from('accounts').upsert(row)
  if (error) throw error
}

export async function updateAccountStatus(id, status) {
  const { error } = await supabase.from('accounts').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteAccount(id) {
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) throw error
}

export async function fetchWithdrawals(userId) {
  const { data, error } = await supabase.from('withdrawals').select('*').eq('user_id', userId).order('fecha')
  if (error) throw error
  const grouped = {}
  ;(data || []).forEach(w => {
    const key = String(w.account_id)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(w)
  })
  return grouped
}

export async function saveWithdrawal(userId, accId, wd) {
  const row = { id: wd.id || Date.now(), user_id: userId, account_id: String(accId), fecha: wd.fecha, usd: wd.usd, pct: wd.pct, nota: wd.nota || '' }
  const { error } = await supabase.from('withdrawals').upsert(row)
  if (error) throw error
}

export async function deleteWithdrawal(id) {
  const { error } = await supabase.from('withdrawals').delete().eq('id', id)
  if (error) throw error
}

export async function fetchRules(userId) {
  const { data, error } = await supabase.from('rules').select('*').eq('user_id', userId).order('id')
  if (error) throw error
  return data || []
}

export async function saveRule(userId, rule) {
  const { error } = await supabase.from('rules').upsert({ id: rule.id, user_id: userId, text: rule.text })
  if (error) throw error
}

export async function deleteRule(id) {
  const { error } = await supabase.from('rules').delete().eq('id', id)
  if (error) throw error
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function saveProfile(userId, profile) {
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...profile })
  if (error) throw error
}

// Parser CSV (RFC 4180): respeta comillas, comas y saltos de línea dentro de
// un campo, y comillas escapadas como "".
function splitCSV(text) {
  const records = []
  let field = '', rec = [], inQ = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else inQ = false
      } else field += c
    } else if (c === '"') inQ = true
    else if (c === ',') { rec.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      rec.push(field); field = ''
      if (rec.some(v => v !== '')) records.push(rec)
      rec = []
    } else field += c
  }
  rec.push(field)
  if (rec.some(v => v !== '')) records.push(rec)
  return records
}

export function parseCSV(csvText) {
  const records = splitCSV(csvText)
  if (records.length < 2) throw new Error('CSV vacío o inválido')
  const header = records[0].map(h => h.trim().toLowerCase())
  const rows = []
  for (let i = 1; i < records.length; i++) {
    let vals = records[i]
    // Compatibilidad con exports viejos: "Sí, cedí" salía sin comillas y partía la columna.
    const si = header.indexOf('sobreoperar')
    if (vals.length === header.length + 1 && si >= 0 && vals[si].trim() === 'Sí' && vals[si + 1].trim().startsWith('cedí')) {
      vals = [...vals.slice(0, si), 'Sí, cedí', ...vals.slice(si + 2)]
    }
    if (vals.length > header.length) {
      throw new Error(`Fila ${i + 1}: tiene ${vals.length} columnas y el encabezado ${header.length}. Revisá comas o comillas sin cerrar.`)
    }
    const row = {}
    header.forEach((h, j) => { row[h] = (vals[j] || '').trim() })
    if (row.fecha && row.cuenta) rows.push(row)
  }
  return rows
}

export function csvRowToTrade(row, accMap = {}) {
  const cname = row.cuenta?.trim() || ''
  const cid = accMap[cname] || cname
  const rp = parseFloat((row.riesgo || '').replace('%', '')) || 0
  const rrObj = parseFloat(row.rr_obj) || 0
  const rrReal = parseFloat(row.rr_real) || rrObj
  const pnl = parseFloat(row.pnl) || 0
  const sob = row.sobreoperar?.trim() === '—' ? 'No' : (row.sobreoperar?.trim() || 'No')
  return {
    id: Date.now() + Math.floor(Math.random() * 10000),
    fecha: row.fecha?.trim() || '',
    cid: String(cid), c_nombre: cname,
    c_tipo: row.tipo?.trim() || 'challenge',
    firma: row.firma?.trim() || 'Alpha Capital Group',
    opero: 'Tomé un trade', risk: row.riesgo?.trim() || '',
    rp, resultado: row.resultado?.trim() || 'Loss',
    rr: rrObj, rr_real: rrReal, parciales: row.parciales?.trim() || 'No',
    direccion: row.direccion?.trim() || '—',
    r_pnl: pnl, plan: row.plan?.trim() || '—',
    emo: row.emocion?.trim() || '—', sob,
    par: row.par?.trim() || 'EURUSD',
    tmp: row.temporalidad?.trim() || '—',
    nota: (row.nota || '').replace(/^"|"$/g, '').trim()
  }
}

export async function bulkMigrate(userId, { trades, accounts, rules, settings }) {
  await saveProfile(userId, {
    name: settings.name || 'Matias', par: settings.par || 'EURUSD',
    horario: settings.hor || '9:00 - 12:30hs',
    risk_challenge: settings.riskC || '2%', risk_funded: settings.riskF || '1%'
  })
  for (const acc of accounts) await saveAccount(userId, acc)
  const batchSize = 50
  for (let i = 0; i < trades.length; i += batchSize) {
    await Promise.all(trades.slice(i, i + batchSize).map(t => saveTrade(userId, t)))
  }
  for (const rule of rules) await saveRule(userId, rule)
}

export async function bulkImportCSV(userId, csvText, existingAccounts) {
  const rows = parseCSV(csvText)
  const accMap = {}
  existingAccounts.forEach(a => { accMap[a.nombre] = a.id })
  const csvAccounts = [...new Set(rows.map(r => r.cuenta?.trim()).filter(Boolean))]
  const newAccounts = []
  csvAccounts.forEach(nombre => {
    if (!accMap[nombre]) {
      const newAcc = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        type: rows.find(r => r.cuenta?.trim() === nombre)?.tipo?.trim() || 'challenge',
        nombre, firma: rows.find(r => r.cuenta?.trim() === nombre)?.firma?.trim() || 'Alpha Capital Group',
        fase: 'Fase 1', capital: 10000, objetivo: 8, dd: 8, status: 'active',
        nota: 'Creada por import CSV: revisá capital, fase y estado.'
      }
      accMap[nombre] = newAcc.id
      newAccounts.push(newAcc)
    }
  })
  for (const acc of newAccounts) await saveAccount(userId, acc)
  // Control de duplicados: un trade del CSV se omite si ya existe uno igual en la base
  // (misma fecha, cuenta, riesgo, resultado, P&L, R:R, dirección y temporalidad). Se cuenta
  // por cantidad: si el CSV trae 2 trades idénticos y la base ya tiene 1, se importa 1.
  const keyOf = t => [t.fecha, String(t.c_nombre || '').trim(), Number(t.rp) || 0, t.resultado,
    Number(t.r_pnl) || 0, Number(t.rr_real) || 0, t.direccion || '—', t.tmp || '—'].join('|')
  const existingCount = {}
  ;(await fetchTrades(userId)).forEach(t => { const k = keyOf(t); existingCount[k] = (existingCount[k] || 0) + 1 })
  // ids consecutivos en el orden del archivo → el orden relativo queda estable
  const baseId = Date.now()
  let skipped = 0
  const trades = []
  rows.forEach((r, i) => {
    const t = { ...csvRowToTrade(r, accMap), id: baseId + i }
    const k = keyOf(t)
    if (existingCount[k] > 0) { existingCount[k]--; skipped++ } else trades.push(t)
  })
  const batchSize = 50
  for (let i = 0; i < trades.length; i += batchSize) {
    await Promise.all(trades.slice(i, i + batchSize).map(t => saveTrade(userId, t)))
  }
  return { tradesImported: trades.length, tradesSkipped: skipped, newAccounts }
}

// Página pública: los datos llegan por una función de Supabase (get_public_track_record)
// que devuelve SOLO campos seguros: sin notas, sin emociones, sin user_id y con los
// números de cuenta enmascarados. Las tablas ya no se pueden leer sin iniciar sesión.
export async function fetchPublicDataBySlug(slug) {
  const { data, error } = await supabase.rpc('get_public_track_record', { p_slug: slug })
  if (error || !data || !data.profile) throw new Error('Track record no encontrado.')
  return {
    profile: data.profile,
    accounts: data.accounts || [],
    trades: data.trades || []
  }
}

export function exportToCSV(trades) {
  const header = ['fecha', 'cuenta', 'firma', 'tipo', 'par', 'temporalidad', 'riesgo', 'resultado', 'rr_obj', 'rr_real', 'parciales', 'direccion', 'pnl', 'plan', 'emocion', 'sobreoperar', 'nota']
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = trades.map(t => [
    t.fecha, t.c_nombre, t.firma, t.c_tipo, t.par, t.tmp, t.risk,
    t.resultado, t.rr, t.rr_real || t.rr, t.parciales || 'No',
    t.direccion || '—', t.r_pnl, t.plan, t.emo, t.sob, t.nota || ''
  ])
  // Todos los campos van entrecomillados: comas, comillas y saltos de línea
  // en notas o en valores como "Sí, cedí" ya no rompen el archivo.
  const csv = [header, ...rows].map(r => r.map(q).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `edgelog_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
