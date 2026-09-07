import { useState, useRef, useEffect } from 'react'

export default function AjustesPage({ ctx }) {
  const { trades, accounts, exportCSV, importCSV, toast, userId, profile, updateProfile } = ctx
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [editingSlug, setEditingSlug] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [savingSlug, setSavingSlug] = useState(false)
  const [tab, setTab] = useState('perfil')
  const [f, setF] = useState({ name: '', par: 'EURUSD', horario: '9:00 - 12:30hs', risk_challenge: '2%', risk_funded: '1%', bio: '', filosofia: '', metodologia: 'Smart Money Concepts', sesion: 'Apertura de Londres / NY' })
  const [savingProfile, setSavingProfile] = useState(false)
  const fileRef = useRef()

  useEffect(() => { if (profile) setF(p => ({ ...p, ...profile })) }, [profile])

  const currentSlug = profile?.public_slug || ''
  const publicURL = currentSlug
    ? `${window.location.origin}/edgelog/#/p/${currentSlug}`
    : '(sin link configurado)'

  async function handleImportCSV(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setImportResult(null)
    try {
      const text = await file.text()
      const result = await importCSV(text)
      setImportResult(result)
      toast(`✓ ${result.tradesImported} trades importados`, 'ok')
    } catch (err) { toast('Error: ' + err.message, 'err') }
    setImporting(false); e.target.value = ''
  }

  async function handleSaveSlug() {
    if (!newSlug.trim()) { toast('Ingresá un nombre para el link', 'err'); return }
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!slug) { toast('Solo letras, números y guiones', 'err'); return }
    setSavingSlug(true)
    try {
      await updateProfile({ ...profile, public_slug: slug })
      toast('✓ Link público actualizado', 'ok')
      setEditingSlug(false); setNewSlug('')
    } catch (e) { toast('Error: ' + e.message, 'err') }
    setSavingSlug(false)
  }

  async function handleSaveProfile() {
    setSavingProfile(true)
    try { await updateProfile(f); toast('✓ Perfil guardado', 'ok') }
    catch (e) { toast('Error: ' + e.message, 'err') }
    setSavingProfile(false)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Ajus<em>tes</em></div>
        <div className="page-sub">Perfil, link público, importar y exportar datos.</div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        <button className={`tab-btn ${tab === 'perfil' ? 'active' : ''}`} onClick={() => setTab('perfil')}>Perfil</button>
        <button className={`tab-btn ${tab === 'link' ? 'active' : ''}`} onClick={() => setTab('link')}>Link público</button>
        <button className={`tab-btn ${tab === 'datos' ? 'active' : ''}`} onClick={() => setTab('datos')}>Datos</button>
      </div>

      {/* ── PERFIL ── */}
      {tab === 'perfil' && (
        <div>
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
            <button className="btn btn-main" onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile ? 'Guardando...' : 'Guardar perfil'}</button>
          </div>
        </div>
      )}

      {/* ── LINK PÚBLICO ── */}
      {tab === 'link' && (
        <div className="card">
          <div className="card-title">Tu link público</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <code style={{ flex: 1, fontSize: 12, color: 'var(--accent2)', background: 'var(--bg3)', padding: '10px 12px', borderRadius: 8, wordBreak: 'break-all', border: '1px solid var(--border)' }}>
              {publicURL}
            </code>
            {currentSlug && (
              <button className="btn btn-main btn-sm" onClick={() => { navigator.clipboard.writeText(publicURL); toast('Link copiado ✓', 'ok') }}>Copiar</button>
            )}
          </div>
          {currentSlug && (
            <div style={{ marginBottom: 14 }}>
              <a href={publicURL} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ textDecoration: 'none' }}>↗ Abrir vista pública</a>
            </div>
          )}
          {!editingSlug ? (
            <div>
              <button className="btn btn-sm" onClick={() => { setEditingSlug(true); setNewSlug(currentSlug) }}>
                ✏️ {currentSlug ? 'Cambiar link' : 'Configurar link'}
              </button>
              {currentSlug && (
                <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 10, lineHeight: 1.7 }}>
                  ⚠ Al cambiar el link, el anterior deja de funcionar inmediatamente.
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                Solo letras, números y guiones. Ejemplo: <code style={{ color: 'var(--accent2)', fontSize: 11 }}>mi-track-record</code>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>/edgelog/#/p/</span>
                <input className="fi" style={{ flex: 1 }} value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="MLM-TR" onKeyDown={e => e.key === 'Enter' && handleSaveSlug()} />
              </div>
              {newSlug && (
                <div style={{ fontSize: 11, color: 'var(--accent2)', marginBottom: 10 }}>
                  Preview: /edgelog/#/p/{newSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-main btn-sm" onClick={handleSaveSlug} disabled={savingSlug}>{savingSlug ? 'Guardando...' : 'Guardar nuevo link'}</button>
                <button className="btn btn-sm" onClick={() => { setEditingSlug(false); setNewSlug('') }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DATOS ── */}
      {tab === 'datos' && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Importar trades — CSV</div>
            <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.7 }}>
              Importá un CSV para actualizar o agregar trades. El sistema detecta cuentas nuevas automáticamente.
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
              Formato: <code style={{ fontSize: 10.5, color: 'var(--accent2)' }}>fecha, cuenta, firma, tipo, par, temporalidad, riesgo, resultado, rr_obj, rr_real, parciales, direccion, pnl, plan, emocion, sobreoperar, nota</code>
            </div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
            <button className="btn btn-main" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? 'Importando...' : '↑ Seleccionar archivo CSV'}
            </button>
            {importResult && (
              <div className="alert ok" style={{ marginTop: 12 }}>
                ✓ {importResult.tradesImported} trades importados.
                {importResult.newAccounts?.length > 0 && ` ${importResult.newAccounts.length} cuentas nuevas: ${importResult.newAccounts.map(a => a.nombre).join(', ')}.`}
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Exportar trades — CSV</div>
            <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 12 }}>Descargá todos tus {trades.length} trades en formato CSV.</div>
            <button className="btn" onClick={() => { exportCSV(); toast('CSV descargado ✓', 'ok') }}>↓ Descargar CSV</button>
          </div>

          <div className="card">
            <div className="card-title">Estadísticas</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { l: 'Trades registrados', v: trades.length },
                { l: 'Cuentas registradas', v: accounts.length },
                { l: 'Cuentas activas', v: accounts.filter(a => a.status === 'active').length },
              ].map(({ l, v }) => (
                <div key={l} className="fa-stat">
                  <div className="kl">{l}</div>
                  <div className="kv" style={{ fontSize: 24, color: 'var(--accent2)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
