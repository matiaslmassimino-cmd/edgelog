import { useState } from 'react'

const RISK_OPTS = ['0.5%', '1%', '1.5%', '2%', '2.5%', '3%']
const EMO_OPTS = ['Calmo 😌', 'Ansioso 😰', 'FOMO 😬', 'Revenge 😤']
const SOB_OPTS = ['No', 'Sí, lo frené ✓', 'Sí, cedí']
const PLAN_OPTS = ['100% exacto', 'Parcialmente', 'No cumplía']
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
const EMPTY = { fecha: today(), cid: '', par: 'EURUSD', tmp: '2m', rr: '', rrReal: '', nota: '', risk: '', resultado: '', direccion: '', parciales: 'No — full target', plan: '', emo: '', sob: 'No' }
const EMPTY_WD = { fecha: today(), cid: '', usd: '', pct: '', nota: '' }

export default function DiarioPage({ ctx }) {
  const { accounts, addTrade, addWithdrawal, toast } = ctx
  const [mode, setMode] = useState('trade')
  const [f, setF] = useState(EMPTY)
  const [wd, setWd] = useState(EMPTY_WD)
  const [saving, setSaving] = useState(false)

  const active = accounts.filter(a => !['completed', 'closed', 'perdida'].includes(a.status))
  const funded = active.filter(a => a.type === 'funded')

  function calcPreview() {
    const acc = active.find(a => String(a.id) === f.cid)
    if (!acc || !f.resultado || !f.risk) return null
    const rp = parseFloat(f.risk) || 0
    const rrReal = parseFloat(f.rrReal) || parseFloat(f.rr) || 0
    let rPnl = 0
    if (f.resultado === 'Win' && rrReal > 0) rPnl = parseFloat((rp * rrReal).toFixed(4))
    else if (f.resultado === 'Loss') rPnl = -rp
    return { acc: acc.nombre, rPnl, rp, rrReal }
  }

  async function handleSaveTrade() {
    if (!f.cid) { toast('Seleccioná una cuenta', 'err'); return }
    if (!f.resultado) { toast('Seleccioná el resultado', 'err'); return }
    if (!f.risk) { toast('Seleccioná el riesgo', 'err'); return }
    setSaving(true)
    const acc = active.find(a => String(a.id) === f.cid)
    const rp = parseFloat(f.risk) || 0
    const rrObj = parseFloat(f.rr) || 0
    const rrReal = parseFloat(f.rrReal) || rrObj
    let rPnl = 0
    if (f.resultado === 'Win' && rrReal > 0) rPnl = parseFloat((rp * rrReal).toFixed(4))
    else if (f.resultado === 'Loss') rPnl = -rp
    try {
      await addTrade({
        id: Date.now(), fecha: f.fecha, cid: String(f.cid),
        c_nombre: acc?.nombre || '', c_tipo: acc?.type || 'challenge', firma: acc?.firma || '',
        opero: 'Tomé un trade', risk: f.risk, rp,
        resultado: f.resultado, rr: rrObj, rr_real: rrReal,
        parciales: f.parciales?.includes('Sí') ? 'Sí' : 'No',
        direccion: f.direccion || '—', r_pnl: rPnl,
        plan: f.plan || '—', emo: f.emo?.split(' ')[0] || '—', sob: f.sob || '—',
        par: f.par, tmp: f.tmp, nota: f.nota
      })
      toast('✓ Entrada guardada', 'ok')
      setF({ ...EMPTY, fecha: f.fecha, cid: f.cid })
    } catch (e) { toast('Error: ' + e.message, 'err') }
    setSaving(false)
  }

  async function handleSaveWD() {
    if (!wd.cid) { toast('Seleccioná una cuenta fondeada', 'err'); return }
    const acc = funded.find(a => String(a.id) === wd.cid)
    const cap = acc?.capital || 10000
    const usd = parseFloat(wd.usd) || (parseFloat(wd.pct) / 100 * cap)
    const pct = parseFloat(wd.pct) || (parseFloat(wd.usd) / cap * 100)
    setSaving(true)
    try {
      await addWithdrawal(wd.cid, { id: Date.now(), fecha: wd.fecha, usd, pct, nota: wd.nota })
      toast('✓ Retiro registrado', 'ok')
      setWd({ ...EMPTY_WD, fecha: wd.fecha })
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
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Datos del trade</div>
              <div className="g2">
                <div className="fg"><label className="fl">Fecha</label><input className="fi" value={f.fecha} onChange={e => setF(p => ({ ...p, fecha: e.target.value }))} /></div>
                <div className="fg"><label className="fl">Cuenta</label>
                  <select className="fi" value={f.cid} onChange={e => setF(p => ({ ...p, cid: e.target.value }))}>
                    <option value="">Seleccioná cuenta</option>
                    {active.map(a => <option key={a.id} value={a.id}>{a.nombre} — {a.firma}</option>)}
                  </select>
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
              <div className="fg"><label className="fl">Riesgo</label><ChipGroup opts={RISK_OPTS} value={f.risk} onChange={v => setF(p => ({ ...p, risk: v.replace('%', '') }))} /></div>
              <div className="fg"><label className="fl">¿Parciales?</label><ChipGroup opts={PAR_OPTS} value={f.parciales} onChange={v => setF(p => ({ ...p, parciales: v }))} /></div>
              <div className="fg"><label className="fl">¿Cumplí el plan?</label><ChipGroup opts={PLAN_OPTS} value={f.plan} onChange={v => setF(p => ({ ...p, plan: v }))} /></div>
              <div className="fg"><label className="fl">Estado emocional</label><ChipGroup opts={EMO_OPTS} value={f.emo} onChange={v => setF(p => ({ ...p, emo: v }))} /></div>
              <div className="fg"><label className="fl">¿Sobreoperé?</label><ChipGroup opts={SOB_OPTS} value={f.sob} onChange={v => setF(p => ({ ...p, sob: v }))} /></div>
            </div>
            {prev && (
              <div className={`alert ${prev.rPnl >= 0 ? 'ok' : 'danger'}`} style={{ marginBottom: 10 }}>
                {prev.acc} · {prev.rPnl >= 0 ? '+' : ''}{prev.rPnl.toFixed(2)}% · Riesgo: {prev.rp}% · R:{prev.rrReal}
              </div>
            )}
            <button className="btn btn-main btn-full" onClick={handleSaveTrade} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar entrada'}
            </button>
          </div>
        </div>
      )}

      {mode === 'wd' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="card-title">Datos del retiro</div>
            <div className="g2">
              <div className="fg"><label className="fl">Fecha</label><input className="fi" value={wd.fecha} onChange={e => setWd(p => ({ ...p, fecha: e.target.value }))} /></div>
              <div className="fg"><label className="fl">Cuenta fondeada</label>
                <select className="fi" value={wd.cid} onChange={e => setWd(p => ({ ...p, cid: e.target.value }))}>
                  <option value="">Seleccioná cuenta</option>
                  {funded.map(a => <option key={a.id} value={a.id}>{a.nombre} (${(a.capital || 0).toLocaleString()})</option>)}
                </select>
              </div>
            </div>
            <div className="g2">
              <div className="fg"><label className="fl">Monto ($)</label><input className="fi" type="number" value={wd.usd} onChange={e => setWd(p => ({ ...p, usd: e.target.value }))} placeholder="800" /></div>
              <div className="fg"><label className="fl">Equivalente (%)</label><input className="fi" type="number" value={wd.pct} onChange={e => setWd(p => ({ ...p, pct: e.target.value }))} placeholder="8.0" /></div>
            </div>
            <div className="fg"><label className="fl">Nota</label><input className="fi" value={wd.nota} onChange={e => setWd(p => ({ ...p, nota: e.target.value }))} placeholder="Payout mensual..." /></div>
            <button className="btn btn-gold btn-full" onClick={handleSaveWD} disabled={saving}>{saving ? 'Guardando...' : 'Guardar retiro'}</button>
          </div>
          <div className="card">
            <div className="card-title">¿Qué pasa al retirar?</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 2 }}>
              <div>◈ El P&L desde último retiro se resetea a 0%</div>
              <div>∿ El P&L histórico sigue acumulando</div>
              <div>$ El retiro queda en Fondeadas con fecha y monto</div>
              <div>⚡ Los KPIs se actualizan automáticamente</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
