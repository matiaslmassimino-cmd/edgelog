
import { useState, useEffect } from 'react'

export default function SettingsPanel({ profile, onSave, userId, trades, accounts, rules, onSaveRule, onDeleteRule }) {
  const [form, setForm] = useState({
    name: '', par: 'EURUSD', horario: '9:00 - 12:30hs',
    risk_challenge: '2%', risk_funded: '1%',
    bio: '', filosofia: '', instrumento: 'EURUSD',
    sesion: 'Apertura de Londres / NY', metodologia: 'Smart Money Concepts', riesgo_texto: ''
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [newRule, setNewRule] = useState('')

  useEffect(() => {
    if (profile) setForm(f => ({ ...f, ...profile }))
  }, [profile])

  async function handleSave() {
    setSaving(true)
    try { await onSave(form); setMsg('✓ Guardado') }
    catch (e) { setMsg('Error: ' + e.message) }
    setSaving(false)
    setTimeout(() => setMsg(''), 2500)
  }

  async function handleAddRule() {
    if (!newRule.trim()) return
    await onSaveRule({ id: Date.now(), text: newRule.trim() })
    setNewRule('')
  }

  // CSV export
  function exportCSV() {
    const header = ['fecha','cuenta','firma','tipo','par','temporalidad','riesgo','resultado','rr_obj','rr_real','parciales','direccion','pnl','plan','emocion','sobreoperar','nota']
    const rows = trades.map(t => [
      t.fecha, t.c_nombre, t.firma, t.c_tipo, t.par, t.tmp, t.risk,
      t.resultado, t.rr, t.rr_real || t.rr, t.parciales || 'No',
      t.direccion || '—', t.r_pnl, t.plan, t.emo, t.sob,
      '"' + (t.nota || '').replace(/"/g, "'") + '"'
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `edgelog_${new Date().toLocaleDateString('es-AR').replace(/\//g,'-')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #E3DDD1' }}>
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 27, color: '#1C3D3A' }}>
          Ajustes y <em style={{ color: '#3A7068', fontStyle: 'italic' }}>perfil</em>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* General settings */}
        <Card title="Configuración general">
          <FG label="Tu nombre"><input style={inp} value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Matias" /></FG>
          <FG label="Par principal"><input style={inp} value={form.par || ''} onChange={e => setForm(p => ({ ...p, par: e.target.value }))} placeholder="EURUSD" /></FG>
          <FG label="Horario de trading"><input style={inp} value={form.horario || ''} onChange={e => setForm(p => ({ ...p, horario: e.target.value }))} placeholder="9:00 - 12:30hs" /></FG>
          <FG label="Riesgo challenges"><input style={inp} value={form.risk_challenge || ''} onChange={e => setForm(p => ({ ...p, risk_challenge: e.target.value }))} placeholder="2%" /></FG>
          <FG label="Riesgo fondeadas"><input style={inp} value={form.risk_funded || ''} onChange={e => setForm(p => ({ ...p, risk_funded: e.target.value }))} placeholder="1%" /></FG>
        </Card>

        {/* Profile / Bio */}
        <Card title="Perfil público">
          <FG label="Bio"><textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={form.bio || ''} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Contá brevemente quién sos como trader..." /></FG>
          <FG label="Filosofía de trading"><textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.filosofia || ''} onChange={e => setForm(p => ({ ...p, filosofia: e.target.value }))} placeholder="¿Cuál es tu edge?" /></FG>
          <FG label="Metodología"><input style={inp} value={form.metodologia || ''} onChange={e => setForm(p => ({ ...p, metodologia: e.target.value }))} placeholder="Smart Money Concepts / ICT" /></FG>
          <FG label="Sesión operativa"><input style={inp} value={form.sesion || ''} onChange={e => setForm(p => ({ ...p, sesion: e.target.value }))} placeholder="Apertura Londres / NY" /></FG>
        </Card>
      </div>

      {/* Save button */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '10px 24px', background: '#1C3D3A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif' }}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {msg && <span style={{ fontSize: 12.5, color: msg.startsWith('✓') ? '#1A7A4A' : '#B83232' }}>{msg}</span>}
      </div>

      {/* Rules */}
      <div style={{ marginTop: 20 }}>
        <Card title="Reglas de trading">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input style={{ ...inp, flex: 1 }} value={newRule} onChange={e => setNewRule(e.target.value)}
              placeholder="Nueva regla..." onKeyDown={e => e.key === 'Enter' && handleAddRule()} />
            <button onClick={handleAddRule}
              style={{ padding: '8px 16px', background: '#1C3D3A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans,sans-serif' }}>
              Agregar
            </button>
          </div>
          {rules.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: '1px solid #E3DDD1' }}>
              <span style={{ fontSize: 14, color: '#3A7068' }}>◈</span>
              <span style={{ flex: 1, fontSize: 13, color: '#1C3D3A' }}>{r.text}</span>
              <button onClick={() => onDeleteRule(r.id)}
                style={{ padding: '3px 8px', background: '#FDECEA', border: '1px solid #F5C3C3', color: '#B83232', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>✕</button>
            </div>
          ))}
          {rules.length === 0 && <div style={{ color: '#8AA09E', fontSize: 12.5, textAlign: 'center', padding: '16px 0' }}>Sin reglas cargadas.</div>}
        </Card>
      </div>

      {/* Export */}
      <div style={{ marginTop: 20 }}>
        <Card title="Exportar datos">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={exportCSV}
              style={{ padding: '9px 18px', background: '#F6F1E9', border: '1.5px solid #E3DDD1', color: '#1C3D3A', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans,sans-serif', fontWeight: 500 }}>
              ↓ Exportar CSV de trades
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: '#8AA09E', marginTop: 10 }}>
            El CSV incluye todos los trades con fecha, cuenta, resultado, plan, emoción y dirección.
          </div>
        </Card>
      </div>

      {/* Public link */}
      <div style={{ marginTop: 20 }}>
        <Card title="Tu link público">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <code style={{ flex: 1, fontSize: 12.5, color: '#1C3D3A', background: '#F6F1E9', padding: '10px 12px', borderRadius: 8, wordBreak: 'break-all' }}>
              {window.location.origin}/public/{userId}
            </code>
            <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/public/${userId}`)}
              style={{ padding: '9px 14px', background: '#1C3D3A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, flexShrink: 0, fontFamily: 'DM Sans,sans-serif' }}>
              Copiar
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: '#8AA09E', marginTop: 8 }}>
            Cualquiera con este link puede ver tu track record público. Solo lectura, sin acceso a editar nada.
          </div>
        </Card>
      </div>
    </div>
  )
}

const Card = ({ title, children }) => (
  <div style={{ background: '#fff', border: '1px solid #E3DDD1', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 3px rgba(28,61,58,.07)' }}>
    <div style={{ fontSize: 10, color: '#8AA09E', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
      {title}<span style={{ flex: 1, height: 1, background: '#E3DDD1', display: 'block' }} />
    </div>
    {children}
  </div>
)
const FG = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 10, color: '#607472', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 5, fontWeight: 500 }}>{label}</label>
    {children}
  </div>
)
const inp = { width: '100%', fontSize: 13, color: '#1C3D3A', background: '#F6F1E9', border: '1.5px solid #E3DDD1', borderRadius: 8, padding: '9px 12px', outline: 'none', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }
