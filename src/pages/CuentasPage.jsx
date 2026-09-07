import { useState } from 'react'
import { calcMetrics, calcMaxDD, pnlSinceLastWD, pnlTotal } from '../lib/metrics'

const STATUS = {
  active:    { label: '● Activa',     bg: 'var(--green-bg)',  color: 'var(--green)',  border: 'var(--green-border)' },
  completed: { label: '✓ Completada', bg: 'var(--accent-bg)', color: 'var(--accent2)',border: 'var(--border2)' },
  perdida:   { label: '✕ Perdida',    bg: 'var(--red-bg)',    color: 'var(--red)',    border: 'var(--red-border)' },
  closed:    { label: 'Cerrada',      bg: 'var(--bg3)',       color: 'var(--text3)',  border: 'var(--border)' },
}

const EMPTY = { type: 'challenge', nombre: '', firma: 'Alpha Capital Group', fase: 'Fase 1', capital: 10000, objetivo: 8, dd: 8, split: '80/20', nota: '', status: 'active' }

export default function CuentasPage({ ctx }) {
  const { accounts, trades, withdrawals, addAccount, removeAccount, setAccStatus, toast } = ctx
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [tab, setTab] = useState('activas')

  async function handleSave() {
    if (!form.nombre.trim()) { toast('Ingresá el número de cuenta', 'err'); return }
    setSaving(true)
    try { await addAccount({ ...form, id: Date.now() }); toast('✓ Cuenta agregada', 'ok'); setForm(EMPTY); setShowForm(false) }
    catch (e) { toast('Error: ' + e.message, 'err') }
    setSaving(false)
  }

  async function handleStatus(id, status) {
    try { await setAccStatus(id, status); toast(status === 'perdida' ? '✕ Perdida' : status === 'completed' ? '✓ Completada' : 'Reactivada', 'ok') }
    catch (e) { toast('Error: ' + e.message, 'err') }
    setConfirmId(null)
  }

  async function handleDelete(id) {
    try { await removeAccount(id); toast('Eliminada', 'info') }
    catch (e) { toast('Error: ' + e.message, 'err') }
    setConfirmId(null)
  }

  const activas = accounts.filter(a => a.status === 'active')
  const inactivas = accounts.filter(a => ['completed', 'perdida', 'closed'].includes(a.status))
  const showing = tab === 'activas' ? activas : inactivas

  const challenges = showing.filter(a => a.type === 'challenge')
  const funded = showing.filter(a => a.type === 'funded')

  function AccCard({ a }) {
    const te = trades.filter(e => String(e.cid) === String(a.id))
    const g = calcMetrics(te)
    const isF = a.type === 'funded'
    const pnlCur = isF ? pnlSinceLastWD(a.id, trades, withdrawals) : g.pnl
    const pnlHist = isF ? pnlTotal(a.id, trades) : g.pnl
    const cap = a.capital || 0
    const obj = isF ? (a.dd || 5) : (a.objetivo || 8)
    const barPct = Math.min(Math.max(pnlCur / obj * 100, 0), 100)
    const st = STATUS[a.status] || STATUS.active
    const isDone = ['completed', 'closed', 'perdida'].includes(a.status)
    const parent = a.parent ? accounts.find(x => x.id == a.parent) : null
    const child = a.child ? accounts.find(x => x.id == a.child) : null

    return (
      <div style={{ background: 'var(--bg2)', border: `1px solid ${a.status === 'perdida' ? 'var(--red-border)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 10, opacity: isDone ? .75 : 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 3, height: 34, borderRadius: 3, background: isF ? 'var(--gold)' : 'var(--accent)', flexShrink: 0, marginTop: 3 }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--text)' }}>{a.nombre}</span>
                <span style={{ padding: '2px 7px', borderRadius: 4, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 9.5, fontWeight: 600 }}>{st.label}</span>
                <span style={{ padding: '2px 7px', borderRadius: 4, background: isF ? 'var(--gold-bg)' : 'var(--amber-bg)', color: isF ? 'var(--gold)' : 'var(--amber)', border: `1px solid ${isF ? 'var(--gold-border)' : 'var(--amber-border)'}`, fontSize: 9.5, fontWeight: 600 }}>{isF ? 'Fondeada' : a.fase || 'Challenge'}</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{a.firma} · ${cap.toLocaleString()} · {isF ? `Split ${a.split}` : `Obj ${a.objetivo}%`} · DD máx {a.dd}%</div>
              {(parent || child) && (
                <div style={{ fontSize: 10, color: 'var(--accent2)', marginTop: 3, fontWeight: 500 }}>
                  {parent && <span>← {parent.nombre}</span>}{parent && child && ' → '}{!parent && child && '→ '}{child && <span>{child.nombre}</span>}
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: pnlCur >= 0 ? 'var(--green)' : 'var(--red)' }}>{pnlCur >= 0 ? '+' : ''}{pnlCur.toFixed(2)}%</div>
            <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{g.w}W · {g.l}L · {te.length} trades</div>
            {isF && withdrawals[String(a.id)]?.length > 0 && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Hist: {pnlHist >= 0 ? '+' : ''}{pnlHist.toFixed(2)}%</div>}
          </div>
        </div>

        {/* Barra de progreso */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--text3)', marginBottom: 3 }}>
            <span>Progreso al objetivo ({obj}%)</span>
            <span style={{ fontWeight: 600 }}>{barPct.toFixed(0)}%</span>
          </div>
          <div className="pb"><div className="pf" style={{ width: `${barPct}%`, background: pnlCur >= 0 ? 'var(--green)' : 'var(--red)' }} /></div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {a.status === 'active' && <>
            <button className="btn btn-sm" onClick={() => { setConfirmId(a.id); setConfirmAction('completed') }}>✓ Completada</button>
            <button className="btn btn-sm btn-danger" onClick={() => { setConfirmId(a.id); setConfirmAction('perdida') }}>✕ Perdida</button>
          </>}
          {isDone && <button className="btn btn-sm" onClick={() => handleStatus(a.id, 'active')}>↩ Reactivar</button>}
          <button className="btn btn-sm btn-danger" style={{ marginLeft: 'auto' }} onClick={() => { setConfirmId(a.id); setConfirmAction('delete') }}>🗑</button>
        </div>

        {/* Confirmación */}
        {confirmId === a.id && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 9 }}>
            <div style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 8, fontWeight: 500 }}>
              {confirmAction === 'delete' ? `¿Eliminar ${a.nombre}? Esta acción es irreversible.`
                : confirmAction === 'perdida' ? `¿Marcar ${a.nombre} como perdida? El capital ($${cap.toLocaleString()}) se descontará del activo.`
                : `¿Marcar ${a.nombre} como completada?`}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-danger" onClick={() => confirmAction === 'delete' ? handleDelete(a.id) : handleStatus(a.id, confirmAction)}>Confirmar</button>
              <button className="btn btn-sm" onClick={() => setConfirmId(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Mis <em>cuentas</em></div>
          <div className="page-sub">{activas.length} activas · {inactivas.length} inactivas</div>
        </div>
        <button className="btn btn-main btn-sm" onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Cancelar' : '+ Nueva cuenta'}</button>
      </div>

      {/* Tabs activas / inactivas */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        <button className={`tab-btn ${tab === 'activas' ? 'active' : ''}`} onClick={() => setTab('activas')}>
          ● Activas ({activas.length})
        </button>
        <button className={`tab-btn ${tab === 'inactivas' ? 'active' : ''}`} onClick={() => setTab('inactivas')}>
          ○ Historial ({inactivas.length})
        </button>
      </div>

      {/* Formulario nueva cuenta */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Nueva cuenta</div>
          <div className="g3">
            <div className="fg"><label className="fl">Número</label><input className="fi" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="2815389" /></div>
            <div className="fg"><label className="fl">Firma</label><input className="fi" value={form.firma} onChange={e => setForm(p => ({ ...p, firma: e.target.value }))} /></div>
            <div className="fg"><label className="fl">Tipo</label>
              <select className="fi" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value="challenge">Challenge</option>
                <option value="funded">Fondeada</option>
              </select>
            </div>
          </div>
          <div className="g3">
            <div className="fg"><label className="fl">Fase</label><input className="fi" value={form.fase} onChange={e => setForm(p => ({ ...p, fase: e.target.value }))} /></div>
            <div className="fg"><label className="fl">Capital ($)</label><input className="fi" type="number" value={form.capital} onChange={e => setForm(p => ({ ...p, capital: parseInt(e.target.value) || 10000 }))}/></div>
            <div className="fg"><label className="fl">DD máx (%)</label><input className="fi" type="number" value={form.dd} onChange={e => setForm(p => ({ ...p, dd: parseFloat(e.target.value) || 8 }))}/></div>
          </div>
          <div className="g3">
            <div className="fg"><label className="fl">Objetivo (%)</label><input className="fi" type="number" value={form.objetivo} onChange={e => setForm(p => ({ ...p, objetivo: parseFloat(e.target.value) || 8 }))}/></div>
            <div className="fg"><label className="fl">Split (fondeadas)</label><input className="fi" value={form.split} onChange={e => setForm(p => ({ ...p, split: e.target.value }))} placeholder="80/20" /></div>
            <div className="fg"><label className="fl">Nota</label><input className="fi" value={form.nota} onChange={e => setForm(p => ({ ...p, nota: e.target.value }))} placeholder="Opcional..." /></div>
          </div>
          <button className="btn btn-main" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cuenta'}</button>
        </div>
      )}

      {/* Lista de cuentas */}
      {showing.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">{tab === 'activas' ? '⚡' : '○'}</div>
          <p>{tab === 'activas' ? 'Sin cuentas activas.' : 'Sin cuentas en el historial.'}</p>
        </div>
      ) : (
        <>
          {funded.length > 0 && <><div className="quality-sep">◆ Fondeadas</div>{funded.map(a => <AccCard key={a.id} a={a} />)}</>}
          {challenges.length > 0 && <><div className="quality-sep">⚡ Challenges</div>{challenges.map(a => <AccCard key={a.id} a={a} />)}</>}
        </>
      )}
    </div>
  )
}
