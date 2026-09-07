import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      let res
      if (mode === 'login') {
        res = await supabase.auth.signInWithPassword({ email, password })
      } else {
        res = await supabase.auth.signUp({ email, password, options: { data: { name: 'Matias' } } })
        if (!res.error) { setError('¡Cuenta creada! Revisá tu email para confirmar.'); setLoading(false); return }
      }
      if (res.error) setError(res.error.message)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0F17', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <div style={{ background: '#111827', border: '1px solid #1E2A3A', borderRadius: 16, padding: '44px 48px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, color: '#E2E8F0', marginBottom: 4 }}>
          Edge<em style={{ color: '#60A5FA', fontStyle: 'italic' }}>Log</em>
        </div>
        <div style={{ fontSize: 10, color: '#4A6080', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 36 }}>PROP FIRM JOURNAL</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 6 }}>Email</label>
            <input style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2A3A52', background: '#1A2235', color: '#E2E8F0', fontSize: 14, outline: 'none' }}
              type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 6 }}>Contraseña</label>
            <input style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2A3A52', background: '#1A2235', color: '#E2E8F0', fontSize: 14, outline: 'none' }}
              type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && (
            <div style={{ fontSize: 12.5, color: error.startsWith('¡') ? '#22C55E' : '#EF4444', background: error.startsWith('¡') ? '#052E16' : '#2D0A0A', border: `1px solid ${error.startsWith('¡') ? '#166534' : '#7F1D1D'}`, borderRadius: 8, padding: '10px 14px' }}>{error}</div>
          )}
          <button style={{ padding: '12px', borderRadius: 8, border: 'none', background: '#3B82F6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 6 }}
            type="submit" disabled={loading}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#4A6080' }}>
          {mode === 'login' ? (
            <span>¿Primera vez? <button style={{ background: 'none', border: 'none', color: '#60A5FA', fontWeight: 600, cursor: 'pointer', fontSize: 13 }} onClick={() => setMode('register')}>Crear cuenta</button></span>
          ) : (
            <span>¿Ya tenés cuenta? <button style={{ background: 'none', border: 'none', color: '#60A5FA', fontWeight: 600, cursor: 'pointer', fontSize: 13 }} onClick={() => setMode('login')}>Iniciar sesión</button></span>
          )}
        </div>
      </div>
    </div>
  )
}
