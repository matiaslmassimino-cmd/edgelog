import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useData from '../hooks/useData'
import useToast from '../hooks/useToast'
import Dashboard from './Dashboard'
import DiarioPage from './DiarioPage'
import CuentasPage from './CuentasPage'
import CalcPage from './CalcPage'
import HistorialPage from './HistorialPage'
import AnalyticsPage from './AnalyticsPage'
import PeriodosPage from './PeriodosPage'
import FondeadasPage from './FondeadasPage'
import PerformancePage from './PerformancePage'
import RiskPage from './RiskPage'
import TrackRecordPage from './TrackRecordPage'
import PerfilPage from './PerfilPage'
import ReglasPage from './ReglasPage'
import AjustesPage from './AjustesPage'

const NAV = [
  { group: null, items: [
    { id: 'dashboard', icon: '◈', label: 'Dashboard' },
    { id: 'diario', icon: '✦', label: 'Diario de hoy' },
  ]},
  { group: 'Gestión', items: [
    { id: 'cuentas', icon: '⚡', label: 'Mis cuentas' },
    { id: 'calc', icon: '◇', label: 'Calculadora' },
  ]},
  { group: 'Análisis', items: [
    { id: 'historial', icon: '▸', label: 'Historial' },
    { id: 'analytics', icon: '∿', label: 'Analytics' },
    { id: 'periodos', icon: '◫', label: 'Períodos' },
    { id: 'portfolio', icon: '◉', label: 'Performance' },
    { id: 'risk', icon: '△', label: 'Risk Analytics' },
  ]},
  { group: 'Gestión', items: [
    { id: 'fondeadas', icon: '$', label: 'Fondeadas' },
  ]},
  { group: 'Mostrar', items: [
    { id: 'track', icon: '▣', label: 'Track Record' },
    { id: 'perfil', icon: '◎', label: 'Perfil' },
  ]},
  { group: 'Personal', items: [
    { id: 'reglas', icon: '§', label: 'Mis reglas' },
    { id: 'ajustes', icon: '⊙', label: 'Ajustes' },
  ]},
]

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const hh = String(time.getHours()).padStart(2, '0')
  const mm = String(time.getMinutes()).padStart(2, '0')
  const ss = String(time.getSeconds()).padStart(2, '0')
  const dateStr = time.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()
  return (
    <div>
      <div className="sb-clock">{hh}:{mm}:{ss}</div>
      <div className="sb-date-mini">{dateStr}</div>
    </div>
  )
}

export default function AppShell({ session }) {
  const [active, setActive] = useState('dashboard')
  const data = useData(session.user.id)
  const { toast, ToastContainer } = useToast()

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const ctx = { ...data, toast, userId: session.user.id }

  function navTo(id) {
    setActive(id)
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo">Edge<em>Log</em></div>
        </div>
        <div className="sb-tagline">PROP FIRM JOURNAL</div>
        <nav className="sb-nav">
          {NAV.map((section, si) => (
            <div key={si}>
              {section.group && <span className="sb-group-label">{section.group}</span>}
              {section.items.map(item => (
                <button
                  key={item.id}
                  className={`sb-btn ${active === item.id ? 'active' : ''}`}
                  onClick={() => navTo(item.id)}
                >
                  <span className="sb-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
              {si < NAV.length - 1 && <div className="sb-div" />}
            </div>
          ))}
        </nav>
        <div className="sb-bottom">
          <div className="sb-user">{data.profile?.name || 'Trader'}</div>
          <Clock />
          <button className="sb-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      <main className="main-content">
        {!data.dataExists && !data.loading && (
          <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>Importar datos existentes</div>
              <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 3 }}>Tus 83 trades están listos para importar.</div>
            </div>
            <button className="btn btn-main btn-sm" onClick={async () => {
              try { await data.migrateFromPreload(); toast('¡83 trades importados!', 'ok') }
              catch (e) { toast('Error: ' + e.message, 'err') }
            }}>↑ Importar datos</button>
          </div>
        )}
        {active === 'dashboard' && <Dashboard ctx={ctx} />}
        {active === 'diario' && <DiarioPage ctx={ctx} />}
        {active === 'cuentas' && <CuentasPage ctx={ctx} />}
        {active === 'calc' && <CalcPage ctx={ctx} />}
        {active === 'historial' && <HistorialPage ctx={ctx} />}
        {active === 'analytics' && <AnalyticsPage ctx={ctx} />}
        {active === 'periodos' && <PeriodosPage ctx={ctx} />}
        {active === 'portfolio' && <PerformancePage ctx={ctx} />}
        {active === 'risk' && <RiskPage ctx={ctx} />}
        {active === 'fondeadas' && <FondeadasPage ctx={ctx} />}
        {active === 'track' && <TrackRecordPage ctx={ctx} />}
        {active === 'perfil' && <PerfilPage ctx={ctx} />}
        {active === 'reglas' && <ReglasPage ctx={ctx} />}
        {active === 'ajustes' && <AjustesPage ctx={ctx} />}
      </main>

      <ToastContainer />
    </div>
  )
}
