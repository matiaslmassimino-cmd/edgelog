import { calcMetrics, pnlSinceLastWD, pnlTotal, calcMaxDD } from '../lib/metrics'

export default function FondeadasPage({ ctx }) {
  const { accounts, trades, withdrawals, addWithdrawal, removeWithdrawal, toast } = ctx
  const funded = accounts.filter(a => a.type === 'funded')

  if (!funded.length) return (
    <div>
      <div className="page-header"><div className="page-title">Fon<em>deadas</em></div></div>
      <div className="empty"><div className="empty-icon">$</div><p>Sin cuentas fondeadas aún.</p></div>
    </div>
  )

  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Fon<em>deadas</em></div>
        <div className="page-sub">Gestión de cuentas fondeadas, retiros y ciclos.</div>
      </div>

      {funded.map(a => {
        const te = trades.filter(e => String(e.cid) === String(a.id))
        const g = calcMetrics(te)
        const cap = a.capital || 10000
        const split = parseInt((a.split || '80/20').split('/')[0]) || 80
        const wds = withdrawals[String(a.id)] || []
        const totalWD = wds.reduce((s, w) => s + (w.usd || 0), 0)
        const pnlCur = pnlSinceLastWD(a.id, trades, withdrawals)
        const pnlHist = pnlTotal(a.id, trades)
        const pnlCurUSD = parseFloat((pnlCur / 100 * cap).toFixed(2))
        const myPartUSD = parseFloat((pnlCurUSD * split / 100).toFixed(2))
        const maxDD = calcMaxDD(te)
        const ddLim = a.dd || 5
        const ddPct = ddLim > 0 ? Math.min(Math.round(maxDD / ddLim * 100), 100) : 0
        const ddCol = ddPct > 80 ? 'var(--red)' : ddPct > 55 ? 'var(--amber)' : 'var(--green)'

        async function handleWD(e) {
          e.preventDefault()
          const fd = new FormData(e.target)
          const usd = parseFloat(fd.get('usd')) || 0
          const pct = parseFloat(fd.get('pct')) || (usd / cap * 100)
          const fecha = fd.get('fecha')
          const nota = fd.get('nota') || ''
          try {
            await addWithdrawal(String(a.id), { id: Date.now(), fecha, usd, pct, nota })
            toast('✓ Retiro registrado', 'ok')
            e.target.reset()
          } catch (err) { toast('Error: ' + err.message, 'err') }
        }

        return (
          <div key={a.id} className="fa-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--text)' }}>{a.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{a.firma} · ${cap.toLocaleString()} · Split {a.split}</div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 6, background: 'var(--gold-bg)', color: 'var(--gold)', border: '1px solid var(--gold-border)', fontSize: 11, fontWeight: 600 }}>◆ Fondeada</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { l: 'P&L desde retiro', v: (pnlCur >= 0 ? '+' : '') + pnlCur.toFixed(2) + '%', s: (pnlCurUSD >= 0 ? '+' : '') + '$' + Math.abs(pnlCurUSD).toFixed(0), c: pnlCur >= 0 ? 'var(--green)' : 'var(--red)' },
                { l: `Mi parte (${split}%)`, v: (myPartUSD >= 0 ? '+' : '') + '$' + Math.abs(myPartUSD).toFixed(0), s: 'ciclo actual', c: 'var(--gold)' },
                { l: 'P&L histórico', v: (pnlHist >= 0 ? '+' : '') + pnlHist.toFixed(2) + '%', s: 'desde apertura', c: pnlHist >= 0 ? 'var(--green)' : 'var(--red)' },
                { l: 'Retiros totales', v: '$' + totalWD.toLocaleString(), s: `${wds.length} pagos`, c: 'var(--text)' },
                { l: 'Trades', v: te.length, s: `${g.w}W · ${g.l}L · WR ${g.wr !== null ? g.wr + '%' : '—'}`, c: 'var(--text)' },
              ].map(({ l, v, s, c }) => (
                <div key={l} className="fa-stat">
                  <div className="kl">{l}</div>
                  <div className="kv" style={{ color: c, fontSize: 16 }}>{v}</div>
                  <div className="ks" style={{ fontSize: 10 }}>{s}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>
                <span>Drawdown: <strong style={{ color: ddCol }}>{maxDD.toFixed(2)}%</strong></span>
                <span style={{ color: ddCol }}>{ddPct}% del límite ({ddLim}%)</span>
              </div>
              <div className="dd-bar"><div className="dd-fill" style={{ width: `${ddPct}%`, background: ddCol }} /></div>
            </div>

            {wds.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8, fontWeight: 600 }}>Historial de retiros</div>
                {[...wds].reverse().map((w, i) => (
                  <div key={w.id || i} className="wd-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{w.fecha}</div>
                      {w.nota && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{w.nota}</div>}
                    </div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--gold)' }}>+${(w.usd || 0).toFixed(0)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{(w.pct || 0).toFixed(2)}%</div>
                    <button className="btn btn-sm btn-danger" onClick={async () => { try { await removeWithdrawal(w.id); toast('Eliminado', 'info') } catch (e) { toast(e.message, 'err') } }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleWD}>
              <div style={{ fontSize: 9.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10, fontWeight: 600 }}>Registrar retiro</div>
              <div className="g2">
                <div className="fg"><label className="fl">Fecha</label><input className="fi" name="fecha" defaultValue={today} /></div>
                <div className="fg"><label className="fl">Monto ($)</label><input className="fi" type="number" name="usd" placeholder="800" /></div>
              </div>
              <div className="g2">
                <div className="fg"><label className="fl">Equivalente (%)</label><input className="fi" type="number" name="pct" placeholder="8.0" /></div>
                <div className="fg"><label className="fl">Nota</label><input className="fi" name="nota" placeholder="Payout mensual..." /></div>
              </div>
              <button type="submit" className="btn btn-gold btn-sm">+ Registrar retiro</button>
            </form>
          </div>
        )
      })}
    </div>
  )
}
