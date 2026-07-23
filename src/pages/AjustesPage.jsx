import { useState, useRef } from 'react'

export default function AjustesPage({ ctx }) {
  const { trades, accounts, exportCSV, importCSV, toast, userId } = ctx
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef()

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

  const publicURL = `${window.location.origin}/edgelog/#/public/${userId}`

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Ajus<em>tes</em></div>
        <div className="page-sub">Importar, exportar y configurar tu link público.</div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">Tu link público</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <code style={{ flex: 1, fontSize: 12, color: 'var(--accent2)', background: 'var(--bg3)', padding: '10px 12px', borderRadius: 8, wordBreak: 'break-all', border: '1px solid var(--border)' }}>{publicURL}</code>
          <button className="btn btn-main btn-sm" onClick={() => { navigator.clipboard.writeText(publicURL); toast('Link copiado ✓', 'ok') }}>Copiar</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>Cualquiera con este link puede ver tu track record. <strong style={{ color: 'var(--text2)' }}>Solo lectura</strong> — nadie puede editar datos.</div>
        <div style={{ marginTop: 10 }}>
          <a href={publicURL} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ textDecoration: 'none' }}>↗ Abrir vista pública</a>
        </div>
      </div>

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
  )
}
