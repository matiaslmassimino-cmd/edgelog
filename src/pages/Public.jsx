import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicData } from '../lib/sync'
import { calcMetrics, isQuality, calcStreaks } from '../lib/metrics'
import PublicKPIs from '../components/PublicKPIs'

export default function Public() {
  const { userId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) { setError('URL inválida.'); setLoading(false); return }
    fetchPublicData(userId)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [userId])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F6F1E9'}}>
      <span style={{fontFamily:'DM Serif Display,serif',fontSize:22,color:'#1C3D3A'}}>Cargando track record...</span>
    </div>
  )
  if (error) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F6F1E9'}}>
      <span style={{color:'#B83232'}}>{error}</span>
    </div>
  )
  if (!data || !data.profile) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F6F1E9'}}>
      <span style={{color:'#8AA09E'}}>Perfil no encontrado.</span>
    </div>
  )

  const { profile, accounts, trades } = data
  const g = calcMetrics(trades)
  const qTrades = trades.filter(isQuality)
  const gQ = calcMetrics(qTrades)
  const streaks = calcStreaks(trades)
  const active = accounts.filter(a => !['completed','closed','perdida'].includes(a.status))
  const capActive = active.reduce((s, a) => s + (a.capital || 0), 0)
  const n = new Date()

  return (
    <div style={{minHeight:'100vh',background:'#F6F1E9',fontFamily:'DM Sans,system-ui,sans-serif'}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#1C3D3A 0%,#2A5652 60%,#3A7068 100%)',padding:'40px 48px 48px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:280,height:280,borderRadius:'50%',background:'rgba(255,255,255,.04)'}} />
        <div style={{position:'absolute',bottom:-80,left:-40,width:220,height:220,borderRadius:'50%',background:'rgba(255,255,255,.025)'}} />
        <div style={{position:'relative'}}>
          <div style={{fontFamily:'DM Serif Display,serif',fontSize:14,color:'rgba(184,216,213,.6)',letterSpacing:'.16em',textTransform:'uppercase',marginBottom:8}}>
            Track Record · Generado el {n.toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'})}
          </div>
          <div style={{fontFamily:'DM Serif Display,serif',fontSize:48,color:'#fff',lineHeight:1,marginBottom:6}}>
            Edge<em style={{color:'rgba(184,216,213,.8)',fontStyle:'italic'}}>Log</em>
          </div>
          <div style={{fontFamily:'DM Serif Display,serif',fontSize:22,color:'rgba(184,216,213,.7)',marginBottom:28}}>
            {profile.name || 'Trader'} · Prop Firm Journal
          </div>
          {/* Hero metrics */}
          <div style={{display:'flex',gap:32,flexWrap:'wrap'}}>
            {[
              {label:'Retorno total',value:(g.pnl>=0?'+':'')+g.pnl.toFixed(2)+'%',color:g.pnl>=0?'#6EE7B7':'#FCA5A5'},
              {label:'Win rate',value:g.wr!==null?g.wr+'%':'—',color:g.wr>=50?'#6EE7B7':'#FCA5A5'},
              {label:'WR calidad ✦',value:gQ.wr!==null?gQ.wr+'%':'—',color:'#FCD34D'},
              {label:'Trades',value:String(g.tr),color:'#fff'},
              {label:'Capital activo',value:'$'+capActive.toLocaleString(),color:'#fff'},
            ].map(({label,value,color}) => (
              <div key={label}>
                <div style={{fontSize:11,color:'rgba(184,216,213,.55)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>{label}</div>
                <div style={{fontFamily:'DM Serif Display,serif',fontSize:32,color,lineHeight:1}}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 24px'}}>
        <PublicKPIs g={g} gQ={gQ} trades={trades} accounts={accounts}
          active={active} capActive={capActive} profile={profile} streaks={streaks} />

        {/* Disclaimer */}
        <div style={{marginTop:32,padding:'16px 20px',background:'rgba(28,61,58,.06)',borderRadius:10,fontSize:11.5,color:'#8AA09E',lineHeight:1.7}}>
          Este track record es generado automáticamente desde EdgeLog. Los datos incluyen únicamente operaciones en cuentas de prop firms (Alpha Capital Group). Cada operación está documentada con fecha, cuenta, riesgo, resultado, estado emocional y cumplimiento del plan.
        </div>
      </div>
    </div>
  )
}
