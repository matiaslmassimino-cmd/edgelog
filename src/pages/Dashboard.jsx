import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchTrades, fetchAccounts, fetchWithdrawals, fetchRules, fetchProfile,
         saveTrade, saveAccount, deleteAccount, updateAccountStatus,
         saveWithdrawal, deleteWithdrawal, saveRule, deleteRule, saveProfile,
         bulkMigrate, updateTradeDir, deleteTrade } from '../lib/sync'
import { calcMetrics, isQuality, calcStreaks, pnlSinceLastWD } from '../lib/metrics'
import PublicKPIs from '../components/PublicKPIs'
import TradeForm from '../components/TradeForm'
import AccountList from '../components/AccountList'
import TradeHistory from '../components/TradeHistory'
import SettingsPanel from '../components/SettingsPanel'

const PRELOAD = {
  trades: [], // Will be loaded from Supabase
  accounts: [],
  rules: [],
  settings: {}
}

const NAV = [
  { id:'dashboard', icon:'◈', label:'Dashboard' },
  { id:'diario', icon:'✦', label:'Diario de hoy' },
  null, // divider
  { id:'cuentas', icon:'⚡', label:'Mis cuentas', group:'Gestión' },
  null,
  { id:'historial', icon:'▸', label:'Historial', group:'Análisis' },
  { id:'ajustes', icon:'⊙', label:'Ajustes' },
]

export default function Dashboard({ session }) {
  const [page, setPage] = useState('dashboard')
  const [trades, setTrades] = useState([])
  const [accounts, setAccounts] = useState([])
  const [withdrawals, setWithdrawals] = useState({})
  const [rules, setRules] = useState([])
  const [profile, setProfile] = useState({})
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [dataExists, setDataExists] = useState(false)

  const userId = session.user.id

  const reload = useCallback(async () => {
    const [T, A, W, R, P] = await Promise.all([
      fetchTrades(userId),
      fetchAccounts(userId),
      fetchWithdrawals(userId),
      fetchRules(userId),
      fetchProfile(userId)
    ])
    setTrades(T)
    setAccounts(A)
    setWithdrawals(W)
    setRules(R)
    setProfile(P || {})
    setDataExists(T.length > 0 || A.length > 0)
    setLoading(false)
  }, [userId])

  useEffect(() => { reload() }, [reload])

  async function handleMigrate() {
    setMigrating(true)
    try {
      // Import preload data from the existing HTML
      const res = await fetch('/edgelog/preload.json')
      const data = await res.json()
      await bulkMigrate(userId, data)
      await reload()
      alert('¡Migración completada! Todos tus datos están en Supabase.')
    } catch (e) {
      alert('Error en migración: ' + e.message)
    }
    setMigrating(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const g = calcMetrics(trades)
  const qTrades = trades.filter(isQuality)
  const gQ = calcMetrics(qTrades)
  const streaks = calcStreaks(trades)
  const active = accounts.filter(a => !['completed','closed','perdida'].includes(a.status))
  const capActive = active.reduce((s, a) => s + (a.capital || 0), 0)

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F6F1E9'}}>
      <span style={{fontFamily:'DM Serif Display,serif',fontSize:22,color:'#1C3D3A'}}>Cargando...</span>
    </div>
  )

  return (
    <div style={{display:'flex',minHeight:'100vh',fontFamily:'DM Sans,system-ui,sans-serif',background:'#F6F1E9'}}>
      {/* SIDEBAR */}
      <aside style={sty.sb}>
        <div style={sty.logo}>Edge<em style={{color:'#B8D8D5',fontStyle:'italic'}}>Log</em></div>
        <div style={sty.logoSub}>PROP FIRM JOURNAL</div>
        <nav style={{flex:1,padding:'16px 10px',overflowY:'auto'}}>
          {[
            {id:'dashboard',icon:'◈',label:'Dashboard'},
            {id:'diario',icon:'✦',label:'Diario de hoy'},
            'div',
            {id:'cuentas',icon:'⚡',label:'Mis cuentas',group:'Gestión'},
            'div',
            {id:'historial',icon:'▸',label:'Historial',group:'Análisis'},
            {id:'public',icon:'⊞',label:'Vista pública'},
            'div',
            {id:'ajustes',icon:'⊙',label:'Ajustes',group:'Personal'},
          ].map((item, i) => {
            if (item === 'div') return <div key={i} style={sty.navDiv} />
            if (item.group) return (
              <div key={i}>
                <div style={sty.navLbl}>{item.group}</div>
                <NavBtn item={item} active={page===item.id} onClick={() => setPage(item.id)} />
              </div>
            )
            return <NavBtn key={i} item={item} active={page===item.id} onClick={() => setPage(item.id)} />
          })}
        </nav>
        <div style={sty.sbBottom}>
          <div style={{fontSize:11,color:'rgba(184,216,213,.5)',marginBottom:6}}>{profile.name || 'Matias'}</div>
          <button onClick={handleLogout} style={sty.logoutBtn}>Cerrar sesión</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{flex:1,overflowY:'auto',padding:'32px 36px 72px'}}>

        {/* Migration banner */}
        {!dataExists && (
          <div style={{background:'#FEF3E2',border:'1.5px solid #F5D49A',borderRadius:12,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:'#A86010'}}>Importar datos existentes</div>
              <div style={{fontSize:12,color:'#A86010',marginTop:3}}>Tenés 55 trades en el HTML anterior. Importalos a Supabase con un clic.</div>
            </div>
            <button onClick={handleMigrate} disabled={migrating}
              style={{padding:'9px 18px',background:'#A86010',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>
              {migrating ? 'Importando...' : '↑ Importar datos'}
            </button>
          </div>
        )}

        {page === 'dashboard' && (
          <DashboardView g={g} gQ={gQ} qTrades={qTrades} streaks={streaks}
            trades={trades} accounts={accounts} active={active} capActive={capActive}
            withdrawals={withdrawals} profile={profile} userId={userId} />
        )}

        {page === 'diario' && (
          <TradeForm accounts={active} userId={userId}
            onSaved={async (trade) => { await saveTrade(userId, trade); reload() }} />
        )}

        {page === 'cuentas' && (
          <AccountList accounts={accounts} trades={trades} withdrawals={withdrawals}
            userId={userId} onRefresh={reload}
            onSave={async (acc) => { await saveAccount(userId, acc); reload() }}
            onDelete={async (id) => { await deleteAccount(id); reload() }}
            onStatus={async (id, status) => { await updateAccountStatus(id, status); reload() }}
            onSaveWD={async (accId, wd) => { await saveWithdrawal(userId, accId, wd); reload() }}
            onDeleteWD={async (id) => { await deleteWithdrawal(id); reload() }}
          />
        )}

        {page === 'historial' && (
          <TradeHistory trades={trades} accounts={accounts}
            onDelete={async (id) => { await deleteTrade(id); reload() }}
            onToggleDir={async (id, dir) => { await updateTradeDir(id, dir); reload() }}
          />
        )}

        {page === 'public' && (
          <div>
            <div style={{marginBottom:20}}>
              <div style={{fontFamily:'DM Serif Display,serif',fontSize:28,color:'#1C3D3A'}}>Vista <em style={{color:'#3A7068',fontStyle:'italic'}}>pública</em></div>
              <div style={{fontSize:12,color:'#607472',marginTop:4}}>Esta es la URL que podés compartir. Cualquiera con el link puede ver tus métricas, sin poder editar nada.</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #E3DDD1',borderRadius:12,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
              <code style={{flex:1,fontSize:13,color:'#1C3D3A',wordBreak:'break-all'}}>
                {window.location.origin}/public/{userId}
              </code>
              <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/public/${userId}`)}
                style={{padding:'8px 16px',background:'#1C3D3A',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:12,flexShrink:0}}>
                Copiar link
              </button>
            </div>
            <PublicKPIs g={g} gQ={gQ} trades={trades} accounts={accounts}
              active={active} capActive={capActive} profile={profile} />
          </div>
        )}

        {page === 'ajustes' && (
          <SettingsPanel profile={profile}
            onSave={async (p) => { await saveProfile(userId, p); reload() }}
            userId={userId} trades={trades} accounts={accounts} rules={rules}
            onSaveRule={async (r) => { await saveRule(userId, r); reload() }}
            onDeleteRule={async (id) => { await deleteRule(id); reload() }}
          />
        )}
      </main>
    </div>
  )
}

function NavBtn({ item, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...sty.navBtn,
      background: active ? 'rgba(255,255,255,.12)' : 'transparent',
      color: active ? '#fff' : 'rgba(184,216,213,.65)',
      fontWeight: active ? 600 : 400
    }}>
      <span style={{width:18,textAlign:'center',fontSize:14}}>{item.icon}</span>
      {item.label}
    </button>
  )
}

function DashboardView({ g, gQ, qTrades, streaks, trades, accounts, active, capActive, withdrawals, profile, userId }) {
  const n = new Date()
  const dateStr = n.toLocaleDateString('es-AR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
    .replace(/^\w/, c => c.toUpperCase())
  const sob = trades.filter(e => e.sob === 'Sí, cedí' || e.opero === 'Sobreoperé').length

  return (
    <div>
      <div style={{marginBottom:24,paddingBottom:20,borderBottom:'1px solid #E3DDD1'}}>
        <div style={{fontFamily:'DM Serif Display,serif',fontSize:28,color:'#1C3D3A'}}>
          Buenos días, <em style={{color:'#3A7068',fontStyle:'italic'}}>{profile.name || 'Matias'}.</em>
        </div>
        <div style={{fontSize:12,color:'#607472',marginTop:5}}>{dateStr}</div>
      </div>

      {/* KPI Row 1 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        <KPI dark label="Trades totales" value={g.tr} sub={`${trades.length} entradas`} />
        <KPI label="Win rate" value={g.wr !== null ? `${g.wr}%` : '—'} sub={`${g.w}W · ${g.l}L`} pos={g.wr >= 50} neg={g.wr !== null && g.wr < 50} />
        <KPI label="P&L total" value={g.pnl >= 0 ? `+${g.pnl.toFixed(2)}%` : `${g.pnl.toFixed(2)}%`} sub="todas las cuentas" pos={g.pnl >= 0} neg={g.pnl < 0} />
        <KPI label="Profitability factor" value={g.pf !== null ? g.pf.toFixed(2) : '—'} sub={g.pf >= 1.5 ? 'Sólido ✓' : g.pf >= 1 ? 'Positivo' : 'Por debajo de 1'} pos={g.pf >= 1.5} neg={g.pf !== null && g.pf < 1} />
      </div>

      {/* KPI Row 2 — Quality */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
        <KPI gold label="Win rate calidad ✦" value={gQ.wr !== null ? `${gQ.wr}%` : '—'} sub={`${gQ.w}W · ${gQ.l}L · ${qTrades.length} disciplinados`} />
        <KPI label="R:R real promedio" value={g.avgRR !== null ? `1:${g.avgRR.toFixed(1)}` : '—'} sub="promedio wins" pos={g.avgRR >= 2} />
        <KPI label="Racha actual" value={`${streaks.cur} ${streaks.type === 'Win' ? 'wins' : streaks.type === 'Loss' ? 'losses' : '—'}`} sub={`Máx wins: ${streaks.maxW} · Máx losses: ${streaks.maxL}`} pos={streaks.type === 'Win'} neg={streaks.type === 'Loss'} />
      </div>

      {/* Accounts + Recent */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <Card title="Cuentas activas">
          {active.length === 0 ? <Empty text="Sin cuentas activas." /> :
            active.slice(0, 5).map(a => {
              const pnl = trades.filter(e => e.cid == a.id).reduce((s,e) => s+(e.r_pnl||0), 0)
              const obj = a.type === 'funded' ? a.dd || 5 : a.objetivo
              const pct = Math.min(Math.max(pnl / obj * 100, 0), 100)
              return (
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #E3DDD1'}}>
                  <div style={{width:4,height:32,background:a.type==='funded'?'#C49A1A':'#A86010',borderRadius:3,flexShrink:0}} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#1C3D3A'}}>{a.nombre}</div>
                    <div style={{fontSize:10.5,color:'#8AA09E'}}>{a.firma} · {a.fase || 'Fondeada'}</div>
                    <div style={{height:3,background:'#E3DDD1',borderRadius:10,marginTop:5}}>
                      <div style={{height:3,borderRadius:10,width:`${pct}%`,background:pnl>=0?'#1A7A4A':'#B83232'}} />
                    </div>
                  </div>
                  <div style={{fontSize:17,fontWeight:600,fontFamily:'DM Serif Display,serif',color:pnl>=0?'#1A7A4A':'#B83232'}}>{pnl>=0?'+':''}{pnl.toFixed(1)}%</div>
                </div>
              )
            })
          }
        </Card>
        <Card title="Últimas entradas">
          {trades.length === 0 ? <Empty text="Sin entradas." /> :
            trades.slice(0, 5).map(t => (
              <div key={t.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid #E3DDD1'}}>
                <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:t.resultado==='Win'?'#1A7A4A':t.resultado==='Loss'?'#B83232':'#A86010'}} />
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:'#1C3D3A'}}>{t.fecha} · {t.c_nombre}</div>
                  <div style={{fontSize:10.5,color:'#8AA09E'}}>{t.par} · {t.risk} · R:{t.rr_real||t.rr||'—'}</div>
                </div>
                {t.r_pnl !== 0 && <span style={{fontSize:13,fontWeight:600,color:t.r_pnl>0?'#1A7A4A':'#B83232'}}>{t.r_pnl>0?'+':''}{t.r_pnl?.toFixed(2)}%</span>}
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  )
}

function KPI({ label, value, sub, pos, neg, dark, gold }) {
  const bg = dark ? 'linear-gradient(135deg,#1C3D3A,#2A5652)' : gold ? 'linear-gradient(135deg,#C49A1A,#e8b930)' : '#fff'
  const cl = dark || gold ? '#fff' : pos ? '#1A7A4A' : neg ? '#B83232' : '#1C3D3A'
  const lc = dark ? 'rgba(184,216,213,.65)' : gold ? 'rgba(255,255,255,.7)' : '#8AA09E'
  const sc = dark ? 'rgba(184,216,213,.55)' : gold ? 'rgba(255,255,255,.65)' : '#8AA09E'
  return (
    <div style={{background:bg,border:'1px solid #E3DDD1',borderRadius:14,padding:'18px 20px',boxShadow:'0 1px 3px rgba(28,61,58,.07)'}}>
      <div style={{fontSize:10,color:lc,textTransform:'uppercase',letterSpacing:'.12em',marginBottom:8,fontWeight:500}}>{label}</div>
      <div style={{fontSize:30,fontWeight:600,color:cl,letterSpacing:'-.02em',lineHeight:1,fontFamily:'DM Serif Display,serif'}}>{value}</div>
      <div style={{fontSize:11,color:sc,marginTop:5}}>{sub}</div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{background:'#fff',border:'1px solid #E3DDD1',borderRadius:14,padding:'20px 22px',boxShadow:'0 1px 3px rgba(28,61,58,.07)'}}>
      <div style={{fontSize:10,color:'#8AA09E',textTransform:'uppercase',letterSpacing:'.14em',marginBottom:14,fontWeight:500,display:'flex',alignItems:'center',gap:10}}>
        {title}<span style={{flex:1,height:1,background:'#E3DDD1',display:'block'}} />
      </div>
      {children}
    </div>
  )
}

function Empty({ text }) {
  return <div style={{textAlign:'center',padding:'24px 0',color:'#8AA09E',fontSize:12.5}}>{text}</div>
}

const sty = {
  sb: { width:224,background:'#1C3D3A',display:'flex',flexDirection:'column',flexShrink:0,position:'sticky',top:0,height:'100vh',boxShadow:'4px 0 20px rgba(28,61,58,.2)' },
  logo: { fontFamily:'DM Serif Display,serif',fontSize:22,color:'#fff',padding:'24px 20px 4px',letterSpacing:'-.01em' },
  logoSub: { fontSize:10,color:'rgba(184,216,213,.5)',letterSpacing:'.14em',textTransform:'uppercase',padding:'0 20px 20px',borderBottom:'1px solid rgba(255,255,255,.09)' },
  navDiv: { height:1,background:'rgba(255,255,255,.06)',margin:'6px 0' },
  navLbl: { fontSize:9.5,color:'rgba(184,216,213,.38)',textTransform:'uppercase',letterSpacing:'.14em',padding:'14px 22px 5px',display:'block' },
  navBtn: { display:'flex',alignItems:'center',gap:9,padding:'9px 12px',borderRadius:8,border:'none',fontFamily:'DM Sans,sans-serif',fontSize:12.5,cursor:'pointer',width:'100%',textAlign:'left',transition:'all .16s' },
  sbBottom: { padding:'14px 20px',borderTop:'1px solid rgba(255,255,255,.07)' },
  logoutBtn: { width:'100%',padding:'8px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',color:'rgba(184,216,213,.7)',borderRadius:8,cursor:'pointer',fontSize:12,fontFamily:'DM Sans,sans-serif' }
}
