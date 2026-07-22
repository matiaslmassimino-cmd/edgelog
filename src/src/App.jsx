import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Public from './pages/Public'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F6F1E9'}}>
      <div style={{fontFamily:'DM Serif Display,serif',fontSize:28,color:'#1C3D3A'}}>Edge<em style={{color:'#3A7068',fontStyle:'italic'}}>Log</em></div>
    </div>
  )

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/dashboard/*" element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} />
        <Route path="/public/:userId?" element={<Public />} />
        <Route path="/" element={<Navigate to={session ? '/dashboard' : '/login'} />} />
      </Routes>
    </HashRouter>
  )
}
