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

  // ── Totales globales de retiros ──
  const allWDs = funded.flatMap(a => (withdrawals[String(a.id)] || []).map(w => ({ ...w, accNombre: a.nombre })))
  const totalRetiros = allWDs.reduce((s, w) => s + (w.usd || 0), 0)
  const totalRetirosPct = funded.reduce((s, a) => {
    const wds = withdrawals[String(a.id)] || []
    return s + wds.reduce((s2, w) => s2 + (w.pct || 0), 0)
  }, 0)
  const allWDsSorted = [...allWDs].sort((a, b) => {
    const da = a.fecha?.split('/').reverse().join('-') || ''
    const db = b.fecha?.split('/').reverse().join('-') || ''
    return db > da ? 1 : db < da ? -1 : 0
  })
  const pendientePorCobrar = funded.reduce((s, a) => {
    const cap = a.capital || 10000
    const split = parseInt((a.split || '80/20').split('/')[0]) || 80
    const pnlCur = pnlSinceLastWD(a.id, trades, withdrawals)
    const pnlCurUSD = pnlCur / 100 * cap
    const miParte = pnlCurUSD * split / 100
    return s + (miParte > 0 ? miParte : 0)
  }, 0)

  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Fon<em>deadas</em></div>
        <div className="page-sub">Gestión de cuentas fondeadas, retiros y ciclos.</div>
      </div>

      {/* ── RESUMEN GLOBAL DE RETIROS ── */}
      <div style={{ background: 'linear-gradient(135deg, #0F1E38, #1A2D4F)', border: '1px solid #1E3A5F', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: 'rgba(96,165,250,.5)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, marginBottom: 14 }}>
          Resumen global de retiros — todas las cuentas fondeadas
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { l: 'Total retirado', v: '$' + totalRetiros.toLocaleString('es-AR', { minimumFractionDigits: 0 }), s: `${allWDs.length} pago${allWDs.length !== 1 ? 's' : ''}`, c: 'var(--gold)', big: true },
            { l: 'En % acumulado', v: '+' + totalRetirosPct.toFixed(2) + '%', s: 'sobre capital gestionado', c: 'var(--green)' },
            { l: 'Pendiente por cobrar', v: '$' + pendientePorCobrar.toFixed(0), s: 'ciclos activos (mi parte)', c: pendientePorCobrar > 0 ? 'var(--accent2)' : 'var(--text3)' },
            { l: 'Cuentas fondeadas', v: funded.length, s: `${funded.filter(a => a.status === 'active').length} activas`, c: 'var(--text)' },
          ].map(({ l, v, s, c, big }) => (
            <div key={l} style={{ background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(59,130,246,.15)' }}>
              <div style={{ fontSize: 9.5, color: 'rgba(96,165,250,.45)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 6 }}>{l}</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: big ? 26 : 22, color: c, lineHeight: 1, marginBottom: 3 }}>{v}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(96,165,250,.35)' }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Timeline de todos los retiros */}
        {allWDsSorted.length > 0 && (
          <>
            <div style={{ fontSize: 9.5, color: 'rgba(96,165,250,.4)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 600, marginBottom: 10 }}>
              Historial completo de retiros
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allWDsSorted.map((w, i) => {
                const running = allWDsSorted.slice(i).reduce((s, x) => s + (x.usd || 0), 0)
                const cumulative = allWDsSorted.slice(0, i + 1).reduce((s, x) => s + (x.usd || 0), 0)
                return (
                  <div key={w.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(0,0,0,.15)', borderRadius: 8, border: '1px solid rgba(59,130,246,.1)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(234,179,8,.15)', border: '1px solid rgba(234,179,8,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--gold)', fontWeight: 700, flexShrink: 0 }}>
                      {allWDsSorted.length - i}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{w.fecha}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{w.accNombre}{w.nota ? ` · ${w.nota}` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--gold)', fontWeight: 600 }}>+${(w.usd || 0).toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>Acum: ${cumulative.toFixed(0)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Barra de progreso acumulado */}
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(0,0,0,.2)', borderRadius: 10, border: '1px solid rgba(59,130,246,.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(96,165,250,.5)', marginBottom: 8 }}>
                <span>Progreso acumulado de retiros</span>
                <span style={{ color: 'var(--gold)', fontWeight: 700 }}>${totalRetiros.toLocaleString()}</span>
              </div>
              {allWDsSorted.map((w, i) => {
                const pct = totalRetiros > 0 ? (w.usd || 0) / totalRetiros * 100 : 0
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', minWidth: 70 }}>{w.fecha.slice(0,5)}</div>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: 4, borderRadius: 10, width: `${pct}%`, background: 'var(--gold)', opacity: .8 }} />
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--gold)', minWidth: 55, textAlign: 'right' }}>${(w.usd || 0).toFixed(0)}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── DETALLE POR CUENTA ── */}
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
                { l: 'Retirado en esta cuenta', v: '$' + totalWD.toLocaleString(), s: `${wds.length} pago${wds.length !== 1 ? 's' : ''}`, c: 'var(--text)' },
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
                <span>Caída desde pico: <strong style={{ color: ddCol }}>{maxDD.toFixed(2)}%</strong></span>
                <span style={{ color: ddCol }}>{ddPct}% del límite ({ddLim}%)</span>
              </div>
              <div className="dd-bar"><div className="dd-fill" style={{ width: `${ddPct}%`, background: ddCol }} /></div>
            </div>

            {wds.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8, fontWeight: 600 }}>Retiros de esta cuenta</div>
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
              <div style={{ fontSize: 9.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10, fontWeight: 600 }}>Registrar nuevo retiro</div>
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
