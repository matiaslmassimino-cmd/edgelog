
import { useState } from 'react'

const STATUS_LABELS = {
  active: { label:'● Activa', bg:'#E6F5ED', color:'#1A7A4A', border:'#B8E0CB' },
  completed: { label:'✓ Completada', bg:'#EBF4F3', color:'#3A7068', border:'#B8D8D5' },
  perdida: { label:'✕ Perdida', bg:'#FDECEA', color:'#B83232', border:'#F5C3C3' },
  closed: { label:'Cerrada', bg:'#F6F1E9', color:'#8AA09E', border:'#E3DDD1' },
}

export default function AccountList({ accounts, trades, withdrawals, userId, onRefresh, onSave, onDelete, onStatus, onSaveWD, onDeleteWD }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type:'challenge', nombre:'', firma:'Alpha Capital Group', fase:'Fase 1', capital:10000, objetivo:8, dd:8, split:'80/20', nota:'', status:'active' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.nombre) return
    setSaving(true)
    await onSave({ ...form, id: Date.now() })
    setShowForm(false)
    setSaving(false)
  }

  return (
    <div>
      <div style={{marginBottom:24,paddingBottom:20,borderBottom:'1px solid #E3DDD1',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontFamily:'DM Serif Display,serif',fontSize:27,color:'#1C3D3A',lineHeight:1.1}}>Mis <em style={{color:'#3A7068',fontStyle:'italic'}}>cuentas</em></div>
          <div style={{fontSize:12,color:'#607472',marginTop:5}}>Gestión de challenges y cuentas fondeadas.</div>
        </div>
        <button onClick={()=>setShowForm(!showForm)} style={{padding:'9px 18px',background:'#1C3D3A',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'DM Sans,sans-serif'}}>
          {showForm ? 'Cancelar' : '+ Nueva cuenta'}
        </button>
      </div>

      {showForm && (
        <div style={{background:'#fff',border:'1px solid #E3DDD1',borderRadius:14,padding:'20px 22px',marginBottom:16,boxShadow:'0 1px 3px rgba(28,61,58,.07)'}}>
          <div style={{fontWeight:600,color:'#1C3D3A',marginBottom:14,fontSize:13}}>Nueva cuenta</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
            <FG label="Número de cuenta"><input style={inp} value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="2781375"/></FG>
            <FG label="Firma"><input style={inp} value={form.firma} onChange={e=>setForm(p=>({...p,firma:e.target.value}))} placeholder="Alpha Capital Group"/></FG>
            <FG label="Tipo">
              <select style={inp} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                <option value="challenge">Challenge</option>
                <option value="funded">Fondeada</option>
              </select>
            </FG>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:14}}>
            <FG label="Fase"><input style={inp} value={form.fase} onChange={e=>setForm(p=>({...p,fase:e.target.value}))} placeholder="Fase 1"/></FG>
            <FG label="Capital ($)"><input style={inp} type="number" value={form.capital} onChange={e=>setForm(p=>({...p,capital:parseInt(e.target.value)||10000}))}/></FG>
            <FG label="Objetivo (%)"><input style={inp} type="number" value={form.objetivo} onChange={e=>setForm(p=>({...p,objetivo:parseFloat(e.target.value)||8}))}/></FG>
            <FG label="DD máx (%)"><input style={inp} type="number" value={form.dd} onChange={e=>setForm(p=>({...p,dd:parseFloat(e.target.value)||8}))}/></FG>
          </div>
          <button onClick={handleSave} disabled={saving} style={{padding:'9px 20px',background:'#1C3D3A',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'DM Sans,sans-serif'}}>
            {saving ? 'Guardando...' : 'Guardar cuenta'}
          </button>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {accounts.map(a => {
          const at = trades.filter(e => e.cid == a.id)
          const pnl = parseFloat(at.reduce((s,e)=>s+(e.r_pnl||0),0).toFixed(2))
          const w = at.filter(e=>e.resultado==='Win').length
          const l = at.filter(e=>e.resultado==='Loss').length
          const wr = w+l>0?Math.round(w/(w+l)*100):null
          const st = STATUS_LABELS[a.status] || STATUS_LABELS.active
          const wds = withdrawals[a.id] || []
          const totalWD = wds.reduce((s,w)=>s+(w.usd||0),0)
          return (
            <div key={a.id} style={{background:'#fff',border:'1px solid #E3DDD1',borderRadius:14,padding:'20px 22px',boxShadow:'0 1px 3px rgba(28,61,58,.07)',opacity:a.status==='completed'||a.status==='perdida'?.7:1}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontFamily:'DM Serif Display,serif',fontSize:18,color:'#1C3D3A'}}>{a.nombre}</span>
                    <span style={{padding:'2px 8px',borderRadius:4,background:st.bg,color:st.color,border:`1px solid ${st.border}`,fontSize:10,fontWeight:600}}>{st.label}</span>
                    <span style={{padding:'2px 8px',borderRadius:4,background:a.type==='funded'?'#FEF8E7':'#FEF3E2',color:a.type==='funded'?'#C49A1A':'#A86010',border:`1px solid ${a.type==='funded'?'#EDD98A':'#F5D49A'}`,fontSize:10,fontWeight:600}}>{a.type==='funded'?'Fondeada':a.fase||'Challenge'}</span>
                  </div>
                  <div style={{fontSize:11,color:'#8AA09E',marginTop:4}}>{a.firma} · ${ (a.capital||0).toLocaleString()} · DD: {a.dd}%</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'DM Serif Display,serif',fontSize:22,color:pnl>=0?'#1A7A4A':'#B83232'}}>{pnl>=0?'+':''}{pnl.toFixed(2)}%</div>
                  <div style={{fontSize:10.5,color:'#8AA09E'}}>{w}W · {l}L · WR {wr!==null?wr+'%':'—'}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {a.status === 'active' && <>
                  <btn onClick={()=>onStatus(a.id,'completed')}>✓ Completada</btn>
                  <btn style={{background:'#FDECEA',border:'1px solid #F5C3C3',color:'#B83232'}} onClick={()=>{if(confirm('¿Marcar como perdida? El capital se descontará del activo.'))onStatus(a.id,'perdida')}}>✕ Perdida</btn>
                </>}
                {a.status !== 'active' && <btn onClick={()=>onStatus(a.id,'active')}>↩ Reactivar</btn>}
                <btn style={{background:'#FDECEA',border:'1px solid #F5C3C3',color:'#B83232'}} onClick={()=>{if(confirm('¿Eliminar cuenta?'))onDelete(a.id)}}>🗑 Eliminar</btn>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const FG = ({label,children}) => <div><label style={{fontSize:10,color:'#607472',textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:5,fontWeight:500}}>{label}</label>{children}</div>
const inp = {width:'100%',fontSize:13,color:'#1C3D3A',background:'#F6F1E9',border:'1.5px solid #E3DDD1',borderRadius:8,padding:'8px 12px',outline:'none',fontFamily:'DM Sans,sans-serif',boxSizing:'border-box'}
const btn = ({children,onClick,style={}}) => (
  <button onClick={onClick} style={{padding:'6px 12px',background:'#F6F1E9',border:'1px solid #E3DDD1',color:'#607472',borderRadius:7,cursor:'pointer',fontSize:11.5,fontFamily:'DM Sans,sans-serif',...style}}>{children}</button>
)
