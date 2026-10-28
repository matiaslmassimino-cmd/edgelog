-- EdgeLog · medición precisa (aditivo: no borra ni modifica datos existentes)
-- Ejecutar en el SQL Editor del proyecto gxlurswsmcydcagxoxpr.
-- Las vistas usan security_invoker: respetan las políticas RLS de quien consulta.

-- 1) Columnas opcionales para el checklist pre-trade (la app aún no las completa).
--    Se guardan ANTES de conocer el resultado para evitar el sesgo de etiquetado.
alter table public.trades
  add column if not exists opened_at        timestamptz,
  add column if not exists chk_zona         boolean,
  add column if not exists chk_confirmacion boolean,
  add column if not exists chk_horario      boolean,
  add column if not exists chk_espero       boolean;

-- 2) Trades cerrados con R, fecha real y nº de trade del día.
--    R = r_pnl / rp (ambos en % de cuenta). trade_n_day se ordena por id.
create or replace view public.trades_enriched
with (security_invoker = true) as
select
  t.*,
  case when t.fecha ~ '^\d{2}/\d{2}/\d{4}$' then to_date(t.fecha, 'DD/MM/YYYY') end as fecha_date,
  case when t.rp > 0 then t.r_pnl / t.rp end as r_multiple,
  (t.plan = '100% exacto') as is_exact,
  row_number() over (
    partition by t.user_id, t.fecha
    order by t.id
  ) as trade_n_day
from public.trades t
where t.resultado in ('Win', 'Loss', 'Breakeven');

-- 3) Métricas globales, en R. Win rate sin contar breakeven.
create or replace view public.v_metrics_overall
with (security_invoker = true) as
select
  user_id,
  count(*)                                         as n,
  count(*) filter (where resultado = 'Win')        as w,
  count(*) filter (where resultado = 'Loss')       as l,
  count(*) filter (where resultado = 'Breakeven')  as be,
  round(100.0 * count(*) filter (where resultado = 'Win')
        / nullif(count(*) filter (where resultado in ('Win','Loss')), 0), 1) as wr_pct,
  round(coalesce(sum(r_multiple), 0)::numeric, 2)  as r_total,
  round((sum(r_multiple) / nullif(count(*), 0))::numeric, 3) as expectancy_r,
  round((sum(r_multiple) filter (where resultado = 'Win')
        / nullif(-sum(r_multiple) filter (where resultado = 'Loss'), 0))::numeric, 2) as pf_r
from public.trades_enriched
group by user_id;

-- 4) Mismas métricas por cumplimiento del plan.
create or replace view public.v_metrics_by_plan
with (security_invoker = true) as
select
  user_id,
  plan,
  count(*)                                         as n,
  count(*) filter (where resultado = 'Win')        as w,
  count(*) filter (where resultado = 'Loss')       as l,
  count(*) filter (where resultado = 'Breakeven')  as be,
  round(100.0 * count(*) filter (where resultado = 'Win')
        / nullif(count(*) filter (where resultado in ('Win','Loss')), 0), 1) as wr_pct,
  round(coalesce(sum(r_multiple), 0)::numeric, 2)  as r_total,
  round((sum(r_multiple) / nullif(count(*), 0))::numeric, 3) as expectancy_r,
  round((sum(r_multiple) filter (where resultado = 'Win')
        / nullif(-sum(r_multiple) filter (where resultado = 'Loss'), 0))::numeric, 2) as pf_r
from public.trades_enriched
group by user_id, plan;

-- 5) Drawdown máximo por cuenta, sobre el cierre de cada día.
create or replace view public.v_drawdown_by_account
with (security_invoker = true) as
with daily as (
  select user_id, cid, fecha_date,
         sum(r_pnl) as pnl_pct,
         sum(r_multiple) as r
  from public.trades_enriched
  where fecha_date is not null
  group by user_id, cid, fecha_date
), cum as (
  select *,
         sum(pnl_pct) over (partition by user_id, cid order by fecha_date) as cum_pct,
         sum(r)       over (partition by user_id, cid order by fecha_date) as cum_r
  from daily
), peak as (
  select *,
         greatest(0, max(cum_pct) over (partition by user_id, cid order by fecha_date)) as peak_pct,
         greatest(0, max(cum_r)   over (partition by user_id, cid order by fecha_date)) as peak_r
  from cum
)
select user_id, cid,
       round(max(peak_pct - cum_pct)::numeric, 2) as max_dd_pct,
       round(max(peak_r   - cum_r)::numeric, 2)   as max_dd_r
from peak
group by user_id, cid;
