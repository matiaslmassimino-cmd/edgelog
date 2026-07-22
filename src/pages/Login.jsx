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
    setLoading(true)
    setError('')
    try {
      let res
      if (mode === 'login') {
        res = await supabase.auth.signInWithPassword({ email, password })
      } else {
        res = await supabase.auth.signUp({ email, password, options: { data: { name: 'Matias' } } })
        if (!res.error) setError('¡Cuenta creada! Revisá tu email para confirmar.')
      }
      if (res.error) setError(res.error.message)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logo}>Edge<em style={{color:'#3A7068',fontStyle:'italic'}}>Log</em></div>
        <div style={styles.tagline}>PROP FIRM JOURNAL</div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fg}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
          </div>
          <div style={styles.fg}>
            <label style={styles.label}>Contraseña</label>
            <input style={styles.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>
        <div style={styles.switch}>
          {mode === 'login' ? (
            <span>¿Primera vez? <button style={styles.link} onClick={() => setMode('register')}>Crear cuenta</button></span>
          ) : (
            <span>¿Ya tenés cuenta? <button style={styles.link} onClick={() => setMode('login')}>Iniciar sesión</button></span>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  bg: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        background:'linear-gradient(135deg,#1C3D3A 0%,#2A5652 100%)', fontFamily:'DM Sans,system-ui,sans-serif' },
  card: { background:'#fff', borderRadius:20, padding:'44px 48px', width:'100%', maxWidth:400,
          boxShadow:'0 20px 60px rgba(28,61,58,.3)' },
  logo: { fontFamily:'DM Serif Display,serif', fontSize:32, color:'#1C3D3A', marginBottom:4 },
  tagline: { fontSize:10, color:'#8AA09E', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:36 },
  form: { display:'flex', flexDirection:'column', gap:16 },
  fg: { display:'flex', flexDirection:'column', gap:6 },
  label: { fontSize:10.5, color:'#607472', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:500 },
  input: { padding:'10px 14px', borderRadius:8, border:'1.5px solid #E3DDD1', fontSize:14,
           color:'#1C3D3A', background:'#F6F1E9', outline:'none', fontFamily:'DM Sans,sans-serif' },
  error: { fontSize:12.5, color:'#B83232', background:'#FDECEA', border:'1px solid #F5C3C3',
           borderRadius:8, padding:'10px 14px' },
  btn: { padding:'12px', borderRadius:8, border:'none', background:'#1C3D3A', color:'#fff',
         fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif', marginTop:8 },
  switch: { textAlign:'center', marginTop:20, fontSize:13, color:'#8AA09E' },
  link: { background:'none', border:'none', color:'#3A7068', fontWeight:600, cursor:'pointer',
          fontSize:13, fontFamily:'DM Sans,sans-serif' }
}
