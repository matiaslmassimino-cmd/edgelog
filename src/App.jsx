import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import AppShell from './pages/AppShell'
import Public from './pages/Public'
import './theme.css'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0B0F17' }}>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#E2E8F0' }}>
        Edge<em style={{ color: '#60A5FA', fontStyle: 'italic' }}>Log</em>
      </div>
    </div>
  )

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/*" element={session ? <AppShell session={session} /> : <Navigate to="/login" />} />
        <Route path="/public/:userId" element={<Public />} />
      </Routes>
    </HashRouter>
  )
}
