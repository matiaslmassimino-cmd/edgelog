import { supabase } from './supabase'

// ── TRADES ──
export async function fetchTrades(userId) {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveTrade(userId, trade) {
  const row = {
    id: trade.id,
    user_id: userId,
    fecha: trade.fecha,
    cid: String(trade.cid),
    c_nombre: trade.cNombre,
    c_tipo: trade.cTipo,
    firma: trade.firma,
    opero: trade.opero,
    risk: trade.risk,
    rp: trade.rp,
    resultado: trade.resultado,
    rr: trade.rr,
    rr_real: trade.rrReal || trade.rr,
    parciales: trade.parciales || 'No',
    direccion: trade.direccion || '—',
    r_pnl: trade.rPnl,
    plan: trade.plan,
    emo: trade.emo,
    sob: trade.sob,
    par: trade.par,
    tmp: trade.tmp,
    nota: trade.nota || ''
  }
  const { error } = await supabase.from('trades').upsert(row)
  if (error) throw error
}

export async function deleteTrade(id) {
  const { error } = await supabase.from('trades').delete().eq('id', id)
  if (error) throw error
}

export async function updateTradeDir(id, direccion) {
  const { error } = await supabase.from('trades').update({ direccion }).eq('id', id)
  if (error) throw error
}

// ── ACCOUNTS ──
export async function fetchAccounts(userId) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('id')
  if (error) throw error
  return data || []
}

export async function saveAccount(userId, acc) {
  const row = {
    id: acc.id,
    user_id: userId,
    type: acc.type,
    nombre: acc.nombre,
    firma: acc.firma,
    fase: acc.fase || null,
    capital: acc.capital || 10000,
    objetivo: acc.objetivo || null,
    dd: acc.dd || null,
    split: acc.split || '80/20',
    riesgo: acc.riesgo || null,
    nota: acc.nota || '',
    status: acc.status || 'active',
    parent: acc.parent || null,
    child: acc.child || null
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

// ── WITHDRAWALS ──
export async function fetchWithdrawals(userId) {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_id', userId)
    .order('fecha')
  if (error) throw error
  // Group by account_id
  const grouped = {}
  ;(data || []).forEach(w => {
    if (!grouped[w.account_id]) grouped[w.account_id] = []
    grouped[w.account_id].push(w)
  })
  return grouped
}

export async function saveWithdrawal(userId, accId, wd) {
  const row = {
    id: wd.id || Date.now(),
    user_id: userId,
    account_id: accId,
    fecha: wd.fecha,
    usd: wd.usd,
    pct: wd.pct,
    nota: wd.nota || ''
  }
  const { error } = await supabase.from('withdrawals').upsert(row)
  if (error) throw error
}

export async function deleteWithdrawal(id) {
  const { error } = await supabase.from('withdrawals').delete().eq('id', id)
  if (error) throw error
}

// ── RULES ──
export async function fetchRules(userId) {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('user_id', userId)
    .order('id')
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

// ── PROFILE ──
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function saveProfile(userId, profile) {
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...profile })
  if (error) throw error
}

// ── BULK MIGRATION — import all existing data at once ──
export async function bulkMigrate(userId, { trades, accounts, rules, settings }) {
  console.log('Starting bulk migration...')

  // Profile
  await saveProfile(userId, {
    name: settings.name || 'Matias',
    par: settings.par || 'EURUSD',
    horario: settings.hor || '9:00 - 12:30hs',
    risk_challenge: settings.riskC || '2%',
    risk_funded: settings.riskF || '1%'
  })
  console.log('Profile saved')

  // Accounts in batches
  for (const acc of accounts) {
    await saveAccount(userId, acc)
  }
  console.log(`${accounts.length} accounts saved`)

  // Trades in batches of 50
  const batchSize = 50
  for (let i = 0; i < trades.length; i += batchSize) {
    const batch = trades.slice(i, i + batchSize)
    await Promise.all(batch.map(t => saveTrade(userId, t)))
    console.log(`Trades ${i + 1}-${Math.min(i + batchSize, trades.length)} saved`)
  }

  // Rules
  for (const rule of rules) {
    await saveRule(userId, rule)
  }
  console.log(`${rules.length} rules saved`)

  console.log('Migration complete ✓')
}

// ── PUBLIC DATA — no auth required ──
export async function fetchPublicData(userId) {
  const [profileRes, accountsRes, tradesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('accounts').select('*').eq('user_id', userId).order('id'),
    supabase.from('trades').select('*').eq('user_id', userId).order('fecha')
  ])
  return {
    profile: profileRes.data,
    accounts: accountsRes.data || [],
    trades: tradesRes.data || []
  }
}
