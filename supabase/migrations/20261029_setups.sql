-- EdgeLog · setups: un mismo setup operado en varias cuentas comparte setup_id.
-- Aditivo y seguro: agrega una columna y actualiza la función pública para incluirla.
alter table public.trades add column if not exists setup_id text;

create or replace function public.get_public_track_record(p_slug text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_profile json;
  v_accounts json;
  v_trades json;
begin
  if p_slug is null or length(trim(p_slug)) = 0 then
    return null;
  end if;

  select id into v_uid from public.profiles where public_slug = p_slug limit 1;
  if v_uid is null then
    return null;
  end if;

  select json_build_object(
           'name', name, 'par', par, 'horario', horario, 'bio', bio,
           'filosofia', filosofia, 'instrumento', instrumento, 'sesion', sesion,
           'metodologia', metodologia, 'riesgo_texto', riesgo_texto,
           'risk_challenge', risk_challenge, 'risk_funded', risk_funded,
           'public_slug', public_slug)
    into v_profile
    from public.profiles where id = v_uid;

  -- Cuentas: sin notas ni vínculos; número de cuenta enmascarado (últimos 4).
  select coalesce(json_agg(json_build_object(
           'id', id, 'type', type, 'nombre', '···' || right(nombre, 4), 'firma', firma,
           'fase', fase, 'capital', capital, 'objetivo', objetivo, 'dd', dd,
           'status', status) order by id), '[]'::json)
    into v_accounts
    from public.accounts where user_id = v_uid;

  -- Trades: sin nota, emoción, sobreoperación, user_id ni checklist.
  select coalesce(json_agg(json_build_object(
           'id', id, 'fecha', fecha, 'cid', cid,
           'c_nombre', '···' || right(c_nombre, 4), 'c_tipo', c_tipo, 'firma', firma,
           'risk', risk, 'rp', rp, 'resultado', resultado, 'rr', rr, 'rr_real', rr_real,
           'direccion', direccion, 'r_pnl', r_pnl, 'plan', plan, 'par', par,
           'tmp', tmp, 'parciales', parciales, 'setup_id', setup_id) order by id), '[]'::json)
    into v_trades
    from public.trades where user_id = v_uid;

  return json_build_object('profile', v_profile, 'accounts', v_accounts, 'trades', v_trades);
end;
$$;

revoke all on function public.get_public_track_record(text) from public;
grant execute on function public.get_public_track_record(text) to anon, authenticated;
