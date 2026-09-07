
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { parseFecha, isQuality } from '../lib/metrics'

export default function PublicKPIs({ g, gQ, trades, accounts, active, capActive, profile, streaks }) {
  // Build equity curve data
  const sortedTrades = [...trades]
    .filter(e => ['Win','Loss','Breakeven'].includes(e.resultado))
    .sort((a, b) => {
      const da = parseFecha(a.fecha), db = parseFecha(b.fecha)
      return da - db || a.id - b.id
    })

  let running = 0
  const equityData = [{ fecha: 'Inicio', pnl: 0 }]
  sortedTrades.forEach(t => {
    running = parseFloat((running + (t.r_pnl || 0)).toFixed(4))
    equityData.push({ fecha: t.fecha, pnl: parseFloat(running.toFixed(2)), resultado: t.resultado })
  })

  const pointColors = equityData.map(d => d.resultado === 'Win' ? '#1A7A4A' : d.resultado === 'Loss' ? '#B83232' : '#A86010')

  // Real vs Potential
  const violatedPnl = trades.filter(e => !isQuality(e)).reduce((s,e) => s + (e.r_pnl||0), 0)
  const potentialPnl = parseFloat((g.pnl - violatedPnl).toFixed(2))
  const gap = parseFloat((potentialPnl - g.pnl).toFixed(2))

  // Plan adherence breakdown
  const planData = [
    { name: '100% exacto', trades: trades.filter(e=>e.plan==='100% exacto') },
    { name: 'Parcialmente', trades: trades.filter(e=>e.plan==='Parcialmente') },
    { name: 'No cumplía', trades: trades.filter(e=>e.plan==='No cumplía') },
  ].map(d => {
    const w = d.trades.filter(e=>e.resultado==='Win').length
    const l = d.trades.filter(e=>e.resultado==='Loss').length
    const pnl = parseFloat(d.trades.reduce((s,e)=>s+(e.r_pnl||0),0).toFixed(2))
    return { name: d.name, wr: w+l>0?Math.round(w/(w+l)*100):0, pnl, trades: d.trades.length }
  })

  // Account breakdown
  const accBreakdown = accounts.map(a => {
    const at = trades.filter(e => e.cid == a.id)
    const pnl = parseFloat(at.reduce((s,e)=>s+(e.r_pnl||0),0).toFixed(2))
    const w = at.filter(e=>e.resultado==='Win').length
    const l = at.filter(e=>e.resultado==='Loss').length
    return { ...a, pnl, w, l, wr: w+l>0?Math.round(w/(w+l)*100):null, count: at.length }
  })

  return (
    <div>
      {/* 4 KPI grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Profitability Factor',value:g.pf!==null?g.pf.toFixed(2):'—',sub:g.pf>=1.5?'Sólido':g.pf>=1?'Positivo':'Bajo',pos:g.pf>=1.5,neg:g.pf<1},
          {label:'R:R real promedio',value:g.avgRR!==null?`1:${g.avgRR.toFixed(1)}`:'—',sub:'en operaciones ganadoras',pos:g.avgRR>=2},
          {label:'Sharpe ratio',value:calcSharpe(trades)!==null?calcSharpe(trades):'—',sub:'retorno / volatilidad',pos:calcSharpe(trades)>=1},
          {label:'Consistencia',value:calcConsistency(trades)!==null?calcConsistency(trades)+'%':'—',sub:'meses con P&L positivo',pos:calcConsistency(trades)>=70},
        ].map(({label,value,sub,pos,neg})=>(
          <div key={label} style={{background:'#fff',border:'1px solid #E3DDD1',borderRadius:14,padding:'18px 20px',boxShadow:'0 1px 3px rgba(28,61,58,.07)'}}>
            <div style={{fontSize:10,color:'#8AA09E',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:8,fontWeight:500}}>{label}</div>
            <div style={{fontSize:28,fontWeight:600,fontFamily:'DM Serif Display,serif',lineHeight:1,color:pos?'#1A7A4A':neg?'#B83232':'#1C3D3A'}}>{value}</div>
            <div style={{fontSize:11,color:'#8AA09E',marginTop:5}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Equity curve */}
      <div style={{background:'#fff',border:'1px solid #E3DDD1',borderRadius:14,padding:'20px 22px',marginBottom:16,boxShadow:'0 1px 3px rgba(28,61,58,.07)'}}>
        <div style={secLbl}>Equity curve — P&L acumulado</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={equityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.04)" />
            <XAxis dataKey="fecha" tick={{fontSize:10,fill:'rgba(96,116,114,.8)'}} tickLine={false} axisLine={false} />
            <YAxis tick={{fontSize:10,fill:'rgba(96,116,114,.8)'}} tickLine={false} axisLine={false}
              tickFormatter={v=>(v>=0?'+':'')+v+'%'} />
            <Tooltip contentStyle={{background:'#fff',border:'1px solid #E3DDD1',borderRadius:8,fontSize:11}}
              formatter={(v,n,p)=>[(v>=0?'+':'')+v+'%','P&L acum.']}
              labelStyle={{color:'#1C3D3A',fontWeight:600}} />
            <Line type="monotone" dataKey="pnl" stroke="rgba(58,112,104,.7)" strokeWidth={2.5}
              dot={(props) => {
                const color = props.payload.resultado==='Win'?'#1A7A4A':props.payload.resultado==='Loss'?'#B83232':'#A86010'
                return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
              }}
              activeDot={{r:7}} fill="rgba(58,112,104,.1)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Real vs Potential */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,borderRadius:14,overflow:'hidden',border:'1px solid #E3DDD1',marginBottom:16}}>
        <div style={{padding:'24px 28px',background:'#fff'}}>
          <div style={{fontSize:10.5,textTransform:'uppercase',letterSpacing:'.12em',color:'#8AA09E',marginBottom:8,fontWeight:600}}>Resultado real</div>
          <div style={{fontFamily:'DM Serif Display,serif',fontSize:40,lineHeight:1,color:g.pnl>=0?'#1A7A4A':'#B83232'}}>{g.pnl>=0?'+':''}{g.pnl.toFixed(2)}%</div>
          <div style={{fontSize:11.5,color:'#8AA09E',marginTop:6}}>{g.tr} trades · incluye {trades.filter(e=>!isQuality(e)).length} fuera de plan</div>
        </div>
        <div style={{padding:'24px 28px',background:'#EBF4F3'}}>
          <div style={{fontSize:10.5,textTransform:'uppercase',letterSpacing:'.12em',color:'#3A7068',marginBottom:8,fontWeight:600}}>Potencial del sistema ✦</div>
          <div style={{fontFamily:'DM Serif Display,serif',fontSize:40,lineHeight:1,color:'#1C3D3A'}}>{potentialPnl>=0?'+':''}{potentialPnl.toFixed(2)}%</div>
          <div style={{fontSize:11.5,color:'#607472',marginTop:6}}>Solo trades con plan disciplinado</div>
        </div>
        <div style={{gridColumn:'1/-1',background:'#FEF3E2',borderTop:'1.5px solid #F5D49A',padding:'14px 28px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:12.5,color:'#A86010',fontWeight:500}}>Brecha por indisciplina ({trades.filter(e=>!isQuality(e)).length} trades)</span>
          <span style={{fontFamily:'DM Serif Display,serif',fontSize:22,color:'#A86010'}}>{gap>=0?'+':''}{gap.toFixed(2)}%</span>
        </div>
      </div>

      {/* Plan adherence bars */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
        <div style={{background:'#fff',border:'1px solid #E3DDD1',borderRadius:14,padding:'20px 22px',boxShadow:'0 1px 3px rgba(28,61,58,.07)'}}>
          <div style={secLbl}>Win rate por cumplimiento del plan</div>
          {planData.map(d => (
            <div key={d.name} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11.5,marginBottom:4}}>
                <span style={{color:'#607472'}}>{d.name} <span style={{color:'#8AA09E'}}>({d.trades} trades)</span></span>
                <span style={{fontWeight:600,color:d.wr>=50?'#1A7A4A':d.wr>0?'#B83232':'#8AA09E'}}>{d.wr}%</span>
              </div>
              <div style={{height:5,background:'#E3DDD1',borderRadius:10,overflow:'hidden'}}>
                <div style={{height:5,borderRadius:10,width:`${d.wr}%`,background:d.wr>=50?'#1A7A4A':d.wr>0?'#B83232':'#8AA09E'}} />
              </div>
            </div>
          ))}
        </div>
        <div style={{background:'#fff',border:'1px solid #E3DDD1',borderRadius:14,padding:'20px 22px',boxShadow:'0 1px 3px rgba(28,61,58,.07)'}}>
          <div style={secLbl}>Desglose por cuenta</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr>{['Cuenta','Trades','WR','P&L'].map(h=><th key={h} style={{textAlign:'left',padding:'4px 6px',fontSize:10,color:'#8AA09E',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600,borderBottom:'1px solid #E3DDD1'}}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {accBreakdown.filter(a=>a.count>0).map(a=>(
                <tr key={a.id}>
                  <td style={{padding:'7px 6px',fontWeight:600,color:'#1C3D3A'}}>{a.nombre}</td>
                  <td style={{padding:'7px 6px',color:'#607472'}}>{a.count}</td>
                  <td style={{padding:'7px 6px',color:a.wr>=50?'#1A7A4A':'#B83232'}}>{a.wr!==null?a.wr+'%':'—'}</td>
                  <td style={{padding:'7px 6px',fontWeight:600,color:a.pnl>=0?'#1A7A4A':'#B83232'}}>{a.pnl>=0?'+':''}{a.pnl.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const secLbl = {fontSize:10,color:'#8AA09E',textTransform:'uppercase',letterSpacing:'.14em',marginBottom:14,fontWeight:500,display:'flex',alignItems:'center',gap:10}

function calcSharpe(trades) {
  const rs = trades.filter(e=>e.resultado==='Win'||e.resultado==='Loss').map(e=>e.r_pnl||0)
  if (rs.length < 3) return null
  const mean = rs.reduce((s,v)=>s+v,0)/rs.length
  const variance = rs.reduce((s,v)=>s+Math.pow(v-mean,2),0)/rs.length
  const std = Math.sqrt(variance)
  return std > 0 ? parseFloat((mean/std).toFixed(2)) : null
}

function calcConsistency(trades) {
  const byMonth = {}
  trades.forEach(e => {
    const p = e.fecha?.split('/')
    if (!p || p.length < 3) return
    const k = `${p[2]}-${p[1]}`
    if (!byMonth[k]) byMonth[k] = 0
    byMonth[k] += e.r_pnl || 0
  })
  const months = Object.values(byMonth)
  if (!months.length) return null
  return Math.round(months.filter(v=>v>0).length/months.length*100)
}
