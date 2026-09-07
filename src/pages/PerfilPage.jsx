import { useState, useEffect } from 'react'

export default function PerfilPage({ ctx }) {
  const { profile, updateProfile, toast } = ctx
  const [f, setF] = useState({ name: '', par: 'EURUSD', horario: '9:00 - 12:30hs', risk_challenge: '2%', risk_funded: '1%', bio: '', filosofia: '', instrumento: 'EURUSD', sesion: 'Apertura de Londres / NY', metodologia: 'Smart Money Concepts' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (profile) setF(p => ({ ...p, ...profile })) }, [profile])

  async function handleSave() {
    setSaving(true)
    try { await updateProfile(f); toast('✓ Perfil guardado', 'ok') }
    catch (e) { toast('Error: ' + e.message, 'err') }
    setSaving(false)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Mi <em>perfil</em></div>
        <div className="page-sub">Tu identidad como trader — aparece en el Track Record público.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="card-title">Configuración general</div>
          <div className="fg"><label className="fl">Tu nombre</label><input className="fi" value={f.name || ''} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder="Matias Massimino" /></div>
          <div className="fg"><label className="fl">Par principal</label><input className="fi" value={f.par || ''} onChange={e => setF(p => ({ ...p, par: e.target.value }))} /></div>
          <div className="fg"><label className="fl">Horario de operativa</label><input className="fi" value={f.horario || ''} onChange={e => setF(p => ({ ...p, horario: e.target.value }))} /></div>
          <div className="g2">
            <div className="fg"><label className="fl">Riesgo challenges</label><input className="fi" value={f.risk_challenge || ''} onChange={e => setF(p => ({ ...p, risk_challenge: e.target.value }))} /></div>
            <div className="fg"><label className="fl">Riesgo fondeadas</label><input className="fi" value={f.risk_funded || ''} onChange={e => setF(p => ({ ...p, risk_funded: e.target.value }))} /></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Perfil público</div>
          <div className="fg"><label className="fl">Bio</label><textarea className="fi" style={{ minHeight: 70, resize: 'vertical' }} value={f.bio || ''} onChange={e => setF(p => ({ ...p, bio: e.target.value }))} placeholder="Trader retail, EURUSD, prop firms..." /></div>
          <div className="fg"><label className="fl">Filosofía de trading</label><textarea className="fi" style={{ minHeight: 60, resize: 'vertical' }} value={f.filosofia || ''} onChange={e => setF(p => ({ ...p, filosofia: e.target.value }))} placeholder="¿Cuál es tu edge?" /></div>
          <div className="fg"><label className="fl">Metodología</label><input className="fi" value={f.metodologia || ''} onChange={e => setF(p => ({ ...p, metodologia: e.target.value }))} /></div>
          <div className="fg"><label className="fl">Sesión operativa</label><input className="fi" value={f.sesion || ''} onChange={e => setF(p => ({ ...p, sesion: e.target.value }))} /></div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn btn-main" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar perfil'}</button>
      </div>
    </div>
  )
}
