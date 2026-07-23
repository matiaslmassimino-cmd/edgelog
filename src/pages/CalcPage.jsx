import { useState } from 'react'

export default function CalcPage({ ctx }) {
  const [f, setF] = useState({ capital: 10000, objetivo: 8, riesgo: 2, rr: 2 })

  const cap = parseFloat(f.capital) || 10000
  const obj = parseFloat(f.objetivo) || 8
  const riesgo = parseFloat(f.riesgo) || 2
  const rr = parseFloat(f.rr) || 2

  const objUSD = cap * obj / 100
  const riskUSD = cap * riesgo / 100
  const winsNeeded = Math.ceil(objUSD / (riskUSD * rr))
  const profitPerWin = riskUSD * rr

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Calcula<em>dora</em></div>
        <div className="page-sub">Planificá cuántos trades necesitás para completar un challenge.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="card-title">Parámetros del challenge</div>
          <div className="g2">
            <div className="fg"><label className="fl">Capital ($)</label><input className="fi" type="number" value={f.capital} onChange={e => setF(p => ({ ...p, capital: e.target.value }))} /></div>
            <div className="fg"><label className="fl">Objetivo (%)</label><input className="fi" type="number" step="0.5" value={f.objetivo} onChange={e => setF(p => ({ ...p, objetivo: e.target.value }))} /></div>
          </div>
          <div className="g2">
            <div className="fg"><label className="fl">Riesgo por trade (%)</label><input className="fi" type="number" step="0.5" value={f.riesgo} onChange={e => setF(p => ({ ...p, riesgo: e.target.value }))} /></div>
            <div className="fg"><label className="fl">R:R objetivo</label><input className="fi" type="number" step="0.1" value={f.rr} onChange={e => setF(p => ({ ...p, rr: e.target.value }))} /></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Resultados</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { l: 'Objetivo en $', v: `$${objUSD.toFixed(0)}`, c: 'var(--green)' },
              { l: 'Riesgo por trade', v: `$${riskUSD.toFixed(0)}`, c: 'var(--red)' },
              { l: 'Ganancia por win', v: `+$${profitPerWin.toFixed(0)}`, c: 'var(--green)' },
              { l: 'Wins necesarios', v: winsNeeded, c: 'var(--accent2)' },
            ].map(({ l, v, c }) => (
              <div key={l} className="fa-stat">
                <div className="kl">{l}</div>
                <div className="kv" style={{ color: c, fontSize: 20 }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="quality-sep">Trades totales estimados según WR</div>
          {[
            { wr: '50%', trades: Math.ceil(winsNeeded / 0.5) },
            { wr: '60%', trades: Math.ceil(winsNeeded / 0.6) },
            { wr: '70%', trades: Math.ceil(winsNeeded / 0.7) },
          ].map(({ wr, trades }) => (
            <div key={wr} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', minWidth: 70 }}>Con WR {wr}</span>
              <div style={{ flex: 1, height: 4, background: 'var(--bg3)', borderRadius: 10 }}>
                <div style={{ height: 4, borderRadius: 10, width: `${Math.min((winsNeeded / trades) * 100, 100)}%`, background: 'var(--accent)' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', minWidth: 80, textAlign: 'right' }}>{trades} trades</span>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--accent-bg)', borderRadius: 10, fontSize: 12, color: 'var(--accent2)', lineHeight: 1.7, border: '1px solid var(--border2)' }}>
            Con {winsNeeded} wins a {rr}:1 arriesgando {f.riesgo}% por trade alcanzás el objetivo de {f.objetivo}% (${objUSD.toFixed(0)}).
          </div>
        </div>
      </div>
    </div>
  )
}
