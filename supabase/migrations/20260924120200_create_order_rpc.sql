-- =============================================================================
-- Phase 4: transactional create_order RPC (SECURITY DEFINER)
-- =============================================================================

create or replace function public.create_order(
  p_customer_name  text,
  p_customer_phone text,
  p_mode           public.order_mode,
  p_table_label    text,
  p_lines          jsonb
)
returns table (
  order_number  bigint,
  public_token  uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id     uuid;
  v_order_number bigint;
  v_public_token uuid;
  v_total_cents  integer;
  v_has_null_price boolean := false;
  v_sum_cents    bigint  := 0;
  v_max_safe_sum bigint  := 9223372036854775807;
  rec_raw        record;
  rec_con        record;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'invalid lines envelope' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_lines) = 0 then
    raise exception 'empty lines' using errcode = 'P0001';
  end if;
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'customer_name required' using errcode = 'P0001';
  end if;
  if char_length(btrim(p_customer_name)) > 80 then
    raise exception 'customer_name too long' using errcode = 'P0001';
  end if;
  if p_customer_phone is not null then
    if char_length(p_customer_phone) < 1 or char_length(p_customer_phone) > 30 then
      raise exception 'customer_phone invalid' using errcode = 'P0001';
    end if;
  end if;
  if p_mode = 'dine_in' then
    if p_table_label is null or btrim(p_table_label) = '' or char_length(btrim(p_table_label)) > 40 then
      raise exception 'table_label required for dine_in' using errcode = 'P0001';
    end if;
  elsif p_mode = 'takeaway' then
    if p_table_label is not null then
      raise exception 'table_label must be null for takeaway' using errcode = 'P0001';
    end if;
  else
    raise exception 'invalid mode' using errcode = 'P0001';
  end if;

  create temporary table tmp_consol (
    product_id            text not null,
    presentation          text,
    selected_option       text,
    quantity              integer not null,
    note                  text,
    product_name_snapshot text,
    unit_price_cents      integer,
    primary key (product_id, presentation, selected_option)
  ) on commit drop;

  for rec_raw in
    select
      e.item ->> 'productId'        as pid,
      e.item ->> 'presentation'     as pres,
      e.item ->> 'selectedOption'   as opt,
      e.item ->> 'quantity'         as qtxt,
      e.item ->> 'note'             as ntxt
    from jsonb_array_elements(p_lines) e(item)
  loop
    declare
      pidn text;
      prnn text := null;
      opnn text := null;
      qvn  integer;
      ntnn text := null;
    begin
      if rec_raw.pid is null or btrim(rec_raw.pid) = '' then
        raise exception 'productId required' using errcode = 'P0001';
      end if;
      pidn := btrim(rec_raw.pid);
      if rec_raw.pres is not null then
        prnn := btrim(rec_raw.pres);
        if prnn = '' then prnn := null; end if;
        if prnn is not null and char_length(prnn) > 60 then raise exception 'presentation too long' using errcode = 'P0001'; end if;
      end if;
      if rec_raw.opt is not null then
        opnn := btrim(rec_raw.opt);
        if opnn = '' then opnn := null; end if;
        if opnn is not null and char_length(opnn) > 60 then raise exception 'option too long' using errcode = 'P0001'; end if;
      end if;
      begin
        qvn := (rec_raw.qtxt)::integer;
      exception when others then
        raise exception 'quantity invalid' using errcode = 'P0001';
      end;
      if qvn < 1 or qvn > 20 then raise exception 'quantity out of range' using errcode = 'P0001'; end if;
      if rec_raw.ntxt is not null then
        ntnn := rec_raw.ntxt;
        if char_length(ntnn) > 280 then raise exception 'note too long' using errcode = 'P0001'; end if;
      end if;
      insert into tmp_consol (product_id, presentation, selected_option, quantity, note)
      values (pidn, prnn, opnn, qvn, ntnn)
      on conflict (product_id, presentation, selected_option) do update
        set quantity = tmp_consol.quantity + excluded.quantity,
            note     = case when excluded.note is not null and excluded.note <> '' then excluded.note else tmp_consol.note end;
    end;
  end loop;

  if exists (select 1 from tmp_consol where quantity > 20) then
    raise exception 'duplicate merge exceeds max quantity' using errcode = 'P0001';
  end if;

  for rec_con in
    select
      t.product_id, t.presentation, t.selected_option, t.quantity, t.note,
      p.id p_id, p.name p_name, p.is_available p_avail, p.presentations p_pres, p.price_cents p_price,
      c.options c_opts
    from tmp_consol t
    left join public.products p on p.id = t.product_id
    left join public.categories c on c.id = p.category_id
  loop
    if rec_con.p_id is null then raise exception 'product not found: %', rec_con.product_id using errcode = 'P0001'; end if;
    if not rec_con.p_avail then raise exception 'product unavailable: %', rec_con.product_id using errcode = 'P0001'; end if;
    if rec_con.presentation is not null then
      if rec_con.p_pres is null or array_position(rec_con.p_pres, rec_con.presentation) is null then
        raise exception 'invalid presentation for %: %', rec_con.product_id, rec_con.presentation using errcode = 'P0001';
      end if;
    else
      if rec_con.p_pres is not null and array_length(rec_con.p_pres,1) > 0 then
        raise exception 'presentation required for %', rec_con.product_id using errcode = 'P0001';
      end if;
    end if;
    declare
      has_primary boolean := false;
      primary_vals text[];
    begin
      if rec_con.c_opts is not null and jsonb_typeof(rec_con.c_opts)='array' and jsonb_array_length(rec_con.c_opts)>0 then
        select true, array_agg(v.v)
        into has_primary, primary_vals
        from (select jsonb_array_elements_text((rec_con.c_opts->0)->'values') v) v;
      end if;
      if has_primary then
        if rec_con.selected_option is null then raise exception 'option required for %', rec_con.product_id using errcode = 'P0001'; end if;
        if not (rec_con.selected_option = any(primary_vals)) then raise exception 'invalid option for %: %', rec_con.product_id, rec_con.selected_option using errcode = 'P0001'; end if;
      else
        if rec_con.selected_option is not null then raise exception 'product has no options: %', rec_con.product_id using errcode = 'P0001'; end if;
      end if;
    end;
    if rec_con.p_price is null then
      v_has_null_price := true;
    else
      v_sum_cents := v_sum_cents + (rec_con.p_price::bigint * rec_con.quantity::bigint);
      if v_sum_cents > v_max_safe_sum then raise exception 'total overflow' using errcode = 'P0001'; end if;
    end if;
    update tmp_consol tc
    set product_name_snapshot = rec_con.p_name, unit_price_cents = rec_con.p_price
    where tc.product_id = rec_con.product_id
      and ((tc.presentation is null and rec_con.presentation is null) or tc.presentation = rec_con.presentation)
      and ((tc.selected_option is null and rec_con.selected_option is null) or tc.selected_option = rec_con.selected_option);
  end loop;

  if v_has_null_price then v_total_cents := null; else v_total_cents := v_sum_cents::integer; end if;

  insert into public.orders (mode, table_label, customer_name, customer_phone, total_cents)
  values (
    p_mode,
    case when p_mode='dine_in' then btrim(p_table_label) else null end,
    btrim(p_customer_name),
    p_customer_phone,
    v_total_cents
  )
  returning id, order_number, public_token into v_order_id, v_order_number, v_public_token;

  insert into public.order_items (order_id, product_id, product_name_snapshot, presentation, selected_option, quantity, unit_price_cents, note)
  select v_order_id, tc.product_id, tc.product_name_snapshot, tc.presentation, tc.selected_option, tc.quantity, tc.unit_price_cents,
         case when tc.note is null or tc.note='' then null else tc.note end
  from tmp_consol tc;

  return query select v_order_number, v_public_token;
end;
$$;

revoke execute on function public.create_order(text,text,public.order_mode,text,jsonb) from PUBLIC;
grant execute on function public.create_order(text,text,public.order_mode,text,jsonb) to anon, authenticated;
revoke execute on function public.create_order(text,text,public.order_mode,text,jsonb) from service_role;
