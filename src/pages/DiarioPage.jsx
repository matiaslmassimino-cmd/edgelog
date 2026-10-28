import { useState } from 'react'
import WithdrawalForm from '../components/WithdrawalForm'
import { isRealFecha, isFutureFecha, calcDayStatus, calcRiskBucket, calcPlanBreakdown, fmtR } from '../lib/metrics'

const RISK_OPTS = ['0.5%', '1%', '1.5%', '2%', '2.5%', '3%']
const EMO_OPTS = ['Calmo 😌', 'Ansioso 😰', 'FOMO 😬', 'Revenge 😤']
const SOB_OPTS = ['No', 'Sí, lo frené ✓', 'Sí, cedí']
// Checklist pre-trade. El plan se DERIVA de estos 3 chequeos (no se elige a mano):
// 3/3 → '100% exacto' · 1-2 → 'Parcialmente' · 0 → 'No cumplía'.
const CHECKS = [
  { key: 'chkEst', label: 'Cambio de estructura' },
  { key: 'chkConf', label: 'Vela de confirmación' },
  { key: 'chkLiq', label: 'Liquidó máximo/mínimo o reacción a FVG' },
]
export function planFromChecks(f) {
  const n = CHECKS.filter(c => f[c.key]).length
  return n === 3 ? '100% exacto' : n > 0 ? 'Parcialmente' : 'No cumplía'
}
const PAR_OPTS = ['No — full target', 'Sí — retiré parciales']
const RES_OPTS = ['Win', 'Loss', 'Breakeven']
const DIR_OPTS = ['Compra', 'Venta']

const CHIP_COLORS = {
  Win: 'active-green', Loss: 'active-red', Breakeven: 'active-amber',
  Compra: 'active-green', Venta: 'active-red',
  '100% exacto': 'active-green', 'Parcialmente': 'active-amber', 'No cumplía': 'active-red',
  'Calmo 😌': 'active-green',
  'No': 'active-blue', 'Sí, lo frené ✓': 'active-blue', 'Sí, cedí': 'active-red',
  'No — full target': 'active-blue', 'Sí — retiré parciales': 'active-amber',
}

function Chip({ label, active, onSelect }) {
  return (
    <button className={`chip ${active ? (CHIP_COLORS[label] || 'active-blue') : ''}`} onClick={() => onSelect(label)}>
      {label}
    </button>
  )
}

function ChipGroup({ opts, value, onChange }) {
  return (
    <div className="chip-group">
      {opts.map(o => <Chip key={o} label={o} active={value === o} onSelect={v => onChange(v === value ? '' : v)} />)}
    </div>
  )
}

const today = () => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const EMPTY = { fecha: today(), cids: [], risks: {}, par: 'EURUSD', tmp: '2m', rr: '', rrReal: '', nota: '', resultado: '', direccion: '', parciales: 'No — full target', plan: '', chkEst: false, chkConf: false, chkLiq: false, emo: '', sob: 'No' }
// Riesgo por defecto de una cuenta según tu regla (fondeada / challenge)
const defRisk = (acc, profile) => String(acc?.type === 'funded' ? (parseFloat(profile?.risk_funded) || 1) : (parseFloat(profile?.risk_challenge) || 2))


// Alertas de disciplina en vivo, calculadas con tus propios trades.
function DisciplinePanel({ f, trades, accounts, profile }) {
  const items = []
  const day = calcDayStatus(trades, f.fecha)
  if (day.level !== 'ok') items.push({ level: day.level, text: day.msg })
  else items.push({ level: 'ok', text: `Hoy: ${day.n} trades · ${fmtR(day.rToday, 1)}.` })
  const fundedMax = parseFloat(profile?.risk_funded) || 1
  const chMax = parseFloat(profile?.risk_challenge) || 2
  const nAcc = f.cids.length
  if (nAcc > 1) items.push({ level: 'ok', text: `Mismo setup en ${nAcc} cuentas: se guarda como un solo setup (las filas ganan o pierden juntas).` })
  f.cids.forEach(cid => {
    const acc = accounts.find(a => String(a.id) === String(cid))
    const rp = parseFloat(f.risks[cid]) || 0
    if (!acc || !rp) return
    if (rp >= 2.5) {
      const b = calcRiskBucket(trades, 2.5)
      items.push({ level: 'stop', text: `${acc.nombre}: riesgo ${rp}%. En tus datos, los trades a 2.5% o más suman ${b.w} ganados y ${b.l} perdidos (${fmtR(b.avgR, 2)} por trade).` })
    } else if (acc.type === 'funded' && rp > fundedMax) {
      items.push({ level: 'warn', text: `${acc.nombre} (fondeada): tu regla es ${fundedMax}% y estás poniendo ${rp}%.` })
    } else if (acc.type !== 'funded' && rp > chMax) {
      items.push({ level: 'warn', text: `${acc.nombre} (challenge): tu regla es ${chMax}% y estás poniendo ${rp}%.` })
    }
  })
  const chk = CHECKS.filter(c => f[c.key]).length
  if (chk < 3) {
    const pb = calcPlanBreakdown(trades).find(x => x.key === 'Parcialmente')
    items.push({ level: chk === 0 ? 'stop' : 'warn', text: `Setup incompleto (${chk}/3). Tus trades "Parcialmente" rinden ${fmtR(pb?.avgR, 2)} por trade (${pb?.n || 0} trades, etiquetados a mano).` })
  } else items.push({ level: 'ok', text: 'Setup completo 3/3.' })
  const col = { ok: 'var(--green)', warn: 'var(--amber)', stop: 'var(--red)' }
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card-title">Antes de entrar</div>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: col[it.level], marginTop: 5, flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5 }}>{it.text}</div>
        </div>
      ))}
    </div>
  )
}

export default function DiarioPage({ ctx }) {
  const { accounts, addTrade, toast } = ctx
  const [mode, setMode] = useState('trade')
  const [f, setF] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const active = accounts.filter(a => !['completed', 'closed', 'perdida'].includes(a.status))
  const funded = active.filter(a => a.type === 'funded')

  function calcPreview() {
    if (!f.cids.length || !f.resultado) return null
    const rrReal = parseFloat(f.rrReal) || parseFloat(f.rr) || 0
    const rows = f.cids.map(cid => {
      const acc = active.find(a => String(a.id) === String(cid))
      const rp = parseFloat(f.risks[cid]) || 0
      let rPnl = 0
      if (f.resultado === 'Win' && rrReal > 0) rPnl = parseFloat((rp * rrReal).toFixed(4))
      else if (f.resultado === 'Loss') rPnl = -rp
      return { acc: acc?.nombre || cid, rPnl, rp, rrReal }
    })
    return rows
  }

  async function handleSaveTrade() {
    if (!f.cids.length) { toast('Seleccioná al menos una cuenta', 'err'); return }
    if (!f.resultado) { toast('Seleccioná el resultado', 'err'); return }
    if (!isRealFecha(f.fecha)) { toast('La fecha no es válida (DD/MM/AAAA)', 'err'); return }
    if (isFutureFecha(f.fecha)) { toast('La fecha es futura', 'err'); return }
    if (f.resultado === 'Win' && !(parseFloat(f.rrReal) > 0 || parseFloat(f.rr) > 0)) { toast('Un trade ganador necesita R:R real (o al menos el objetivo)', 'err'); return }
    if (f.cids.some(c => !parseFloat(f.risks[c]))) { toast('Elegí el riesgo de cada cuenta', 'err'); return }
    setSaving(true)
    const rrObj = parseFloat(f.rr) || 0
    const rrReal = parseFloat(f.rrReal) || rrObj
    const base = Date.now()
    const setupId = String(base)   // mismo setup en todas las cuentas seleccionadas
    try {
      for (let i = 0; i < f.cids.length; i++) {
        const cid = f.cids[i]
        const acc = active.find(a => String(a.id) === String(cid))
        const rp = parseFloat(f.risks[cid]) || 0
        let rPnl = 0
        if (f.resultado === 'Win' && rrReal > 0) rPnl = parseFloat((rp * rrReal).toFixed(4))
        else if (f.resultado === 'Loss') rPnl = -rp
        await addTrade({
          id: base + i, setup_id: setupId, fecha: f.fecha, cid: String(cid),
          c_nombre: acc?.nombre || '', c_tipo: acc?.type || 'challenge', firma: acc?.firma || '',
          opero: 'Tomé un trade', risk: String(f.risks[cid]), rp,
          resultado: f.resultado, rr: rrObj, rr_real: rrReal,
          parciales: f.parciales?.includes('Sí') ? 'Sí' : 'No',
          direccion: f.direccion || '—', r_pnl: rPnl,
          plan: planFromChecks(f),
          chk_estructura: !!f.chkEst, chk_confirmacion: !!f.chkConf, chk_liquidez_fvg: !!f.chkLiq,
          emo: f.emo?.split(' ')[0] || '—', sob: f.sob || '—',
          par: f.par, tmp: f.tmp, nota: f.nota
        })
      }
      toast(f.cids.length > 1 ? `✓ Setup guardado en ${f.cids.length} cuentas` : '✓ Entrada guardada', 'ok')
      setF({ ...EMPTY, fecha: f.fecha, cids: f.cids, risks: f.risks })
    } catch (e) { toast('Error: ' + e.message, 'err') }
    setSaving(false)
  }

  const prev = calcPreview()

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Diario de <em>hoy</em></div>
          <div className="page-sub">Registrá tu sesión con disciplina y honestidad.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${mode === 'trade' ? 'btn-main' : ''}`} onClick={() => setMode('trade')}>✦ Trade</button>
          <button className={`btn btn-sm ${mode === 'wd' ? 'btn-gold' : ''}`} onClick={() => setMode('wd')}>$ Retiro</button>
        </div>
      </div>

      {mode === 'trade' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <DisciplinePanel f={f} trades={ctx.trades} accounts={accounts} profile={ctx.profile} />
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Datos del trade</div>
              <div className="g2">
                <div className="fg"><label className="fl">Fecha</label><input className="fi" value={f.fecha} onChange={e => setF(p => ({ ...p, fecha: e.target.value }))} /></div>
              </div>
              <div className="fg"><label className="fl">Cuentas donde tomaste este setup (podés elegir varias)</label>
                <div className="chip-group">
                  {active.map(a => {
                    const on = f.cids.includes(String(a.id))
                    return (
                      <button key={a.id} className={`chip ${on ? (a.type === 'funded' ? 'active-amber' : 'active-blue') : ''}`}
                        onClick={() => setF(p => {
                          const id = String(a.id)
                          if (p.cids.includes(id)) { const { [id]: _x, ...rest } = p.risks; return { ...p, cids: p.cids.filter(c => c !== id), risks: rest } }
                          return { ...p, cids: [...p.cids, id], risks: { ...p.risks, [id]: p.risks[id] || defRisk(a, ctx.profile) } }
                        })}>
                        {on ? '✓ ' : ''}{a.nombre} · {a.type === 'funded' ? 'fondeada' : 'challenge'}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="g2">
                <div className="fg"><label className="fl">Par</label><input className="fi" value={f.par} onChange={e => setF(p => ({ ...p, par: e.target.value }))} /></div>
                <div className="fg"><label className="fl">Temporalidad</label><input className="fi" value={f.tmp} onChange={e => setF(p => ({ ...p, tmp: e.target.value }))} /></div>
              </div>
              <div className="g2">
                <div className="fg"><label className="fl">R:R objetivo</label><input className="fi" type="number" step="0.1" value={f.rr} onChange={e => setF(p => ({ ...p, rr: e.target.value }))} placeholder="2.0" /></div>
                <div className="fg"><label className="fl">R:R real</label><input className="fi" type="number" step="0.1" value={f.rrReal} onChange={e => setF(p => ({ ...p, rrReal: e.target.value }))} placeholder="con parciales" /></div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Nota del trade</div>
              <textarea className="fi" style={{ minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} value={f.nota} onChange={e => setF(p => ({ ...p, nota: e.target.value }))} placeholder="¿Qué salió bien? ¿Qué mejorarías?" />
            </div>
          </div>
          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Validaciones</div>
              <div className="fg"><label className="fl">Resultado</label><ChipGroup opts={RES_OPTS} value={f.resultado} onChange={v => setF(p => ({ ...p, resultado: v }))} /></div>
              <div className="fg"><label className="fl">Dirección</label><ChipGroup opts={DIR_OPTS} value={f.direccion} onChange={v => setF(p => ({ ...p, direccion: v }))} /></div>
              <div className="fg"><label className="fl">Riesgo por cuenta</label>
                {f.cids.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>Elegí primero las cuentas.</div>}
                {f.cids.map(cid => {
                  const a = active.find(x => String(x.id) === String(cid))
                  return (
                    <div key={cid} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)', minWidth: 110 }}>{a?.nombre}</span>
                      <ChipGroup opts={RISK_OPTS} value={String(f.risks[cid] || '') + (f.risks[cid] ? '%' : '')} onChange={v => setF(p => ({ ...p, risks: { ...p.risks, [cid]: v.replace('%', '') } }))} />
                    </div>
                  )
                })}
              </div>
              <div className="fg"><label className="fl">¿Parciales?</label><ChipGroup opts={PAR_OPTS} value={f.parciales} onChange={v => setF(p => ({ ...p, parciales: v }))} /></div>
              <div className="fg"><label className="fl">Checklist del setup (marcalo antes de ver el resultado)</label>
                <div className="chip-group">
                  {CHECKS.map(c => (
                    <button key={c.key} className={`chip ${f[c.key] ? 'active-green' : ''}`} onClick={() => setF(p => ({ ...p, [c.key]: !p[c.key] }))}>
                      {f[c.key] ? '✓ ' : ''}{c.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#8AA09E', marginTop: 6 }}>Plan resultante: <b>{planFromChecks(f)}</b> ({CHECKS.filter(c => f[c.key]).length}/3)</div>
              </div>
              <div className="fg"><label className="fl">Estado emocional</label><ChipGroup opts={EMO_OPTS} value={f.emo} onChange={v => setF(p => ({ ...p, emo: v }))} /></div>
              <div className="fg"><label className="fl">¿Sobreoperé?</label><ChipGroup opts={SOB_OPTS} value={f.sob} onChange={v => setF(p => ({ ...p, sob: v }))} /></div>
            </div>
            {prev && prev.map(r => (
              <div key={r.acc} className={`alert ${r.rPnl >= 0 ? 'ok' : 'danger'}`} style={{ marginBottom: 10 }}>
                {r.acc} · {r.rPnl >= 0 ? '+' : ''}{r.rPnl.toFixed(2)}% · Riesgo: {r.rp}% · R:{r.rrReal}
              </div>
            ))}
            <button className="btn btn-main btn-full" onClick={handleSaveTrade} disabled={saving}>
              {saving ? 'Guardando...' : f.cids.length > 1 ? `Guardar setup en ${f.cids.length} cuentas` : 'Guardar entrada'}
            </button>
          </div>
        </div>
      )}

      {mode === 'wd' && (
        <div style={{ maxWidth: 640 }}>
          <WithdrawalForm ctx={ctx} />
        </div>
      )}
    </div>
  )
}
