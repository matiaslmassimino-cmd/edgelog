import { useState } from 'react'

export default function ReglasPage({ ctx }) {
  const { rules, addRule, removeRule, toast } = ctx
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!text.trim()) return
    setSaving(true)
    try { await addRule({ id: Date.now(), text: text.trim() }); setText(''); toast('✓ Regla agregada', 'ok') }
    catch (e) { toast('Error: ' + e.message, 'err') }
    setSaving(false)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Mis <em>reglas</em></div>
        <div className="page-sub">El contrato con tu yo disciplinado. Leelas antes de cada sesión.</div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="fi" style={{ flex: 1 }} value={text} onChange={e => setText(e.target.value)}
            placeholder="Nueva regla de trading..." onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <button className="btn btn-main" onClick={handleAdd} disabled={saving}>Agregar</button>
        </div>
      </div>
      <div className="card">
        {rules.length === 0 ? (
          <div className="empty"><div className="empty-icon">§</div><p>Sin reglas. Agregá las tuyas.</p></div>
        ) : rules.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 16, color: 'var(--accent2)', flexShrink: 0 }}>◈</span>
            <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>{r.text}</span>
            <button className="btn btn-sm btn-danger" onClick={async () => { try { await removeRule(r.id); toast('Eliminada', 'info') } catch (e) { toast(e.message, 'err') } }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
