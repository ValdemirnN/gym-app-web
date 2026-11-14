-- ============================================================
-- 20261115 - Controle do admin sobre o personal + regras únicas no banco
--
-- Este arquivo SUBSTITUI o schema_v33 / schema_v33b do repositório web e
-- completa a 20261114_bloqueio_por_pagamento do repositório Flutter.
-- As regras de negócio ficam AQUI (banco). Web (Expo) e mobile (Flutter)
-- só chamam estas funções — assim os dois apps nunca divergem.
--
-- Rode este script INTEIRO no SQL Editor do Supabase. É idempotente.
-- Pré-requisitos: 20261006 (colunas subscription_*), 20261005
-- (personal_payments) e 20261008 (guard_profile_update).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Limpeza do que o schema_v33 criou e que duplica a 20261114
-- ------------------------------------------------------------
drop function if exists public.admin_confirm_personal_payment(uuid, numeric, text);
drop trigger  if exists zz_protect_payment_columns on public.profiles;
drop function if exists public.protect_payment_columns();

-- Um único valor para "assinatura ativa" ('ativa', como na 20261114).
update public.profiles
   set subscription_status = 'ativa'
 where role = 'personal' and subscription_status = 'ativo';

-- Personal recém-aprovado ganha 1 mês de acesso (sem isso ele nasceria sem
-- vencimento). Mesmo trigger do schema_v8, agora gravando 'ativa'.
create or replace function public.handle_profile_approval()
returns trigger as $$
begin
  if new.status = 'aprovado' and (old.status is distinct from new.status) then
    new.approved_at := now();
    new.access_expires_at := now() + interval '1 month';
    new.access_blocked := false;

    if new.role = 'personal' then
      new.subscription_expires_at := now() + interval '1 month';
      new.subscription_status := 'ativa';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- 2. Confirmar pagamento do personal (idêntica à 20261114; repetida aqui
--    para o script funcionar mesmo se a 20261114 ainda não foi rodada)
-- ------------------------------------------------------------
create or replace function public.admin_confirmar_pagamento_personal(
  p_personal_id uuid,
  p_meses int default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base timestamptz;
begin
  if public.current_user_role() is distinct from 'admin'::user_role then
    raise exception 'Apenas o admin pode confirmar pagamentos.' using errcode = '42501';
  end if;

  if not exists (select 1 from profiles where id = p_personal_id and role = 'personal') then
    raise exception 'Personal não encontrado.';
  end if;

  select greatest(coalesce(subscription_expires_at, now()), now())
    into v_base
    from profiles where id = p_personal_id;

  update profiles
     set subscription_expires_at = v_base + make_interval(months => greatest(p_meses, 1)),
         subscription_status = 'ativa'
   where id = p_personal_id;

  insert into personal_payments (personal_id, reference_month, amount, status, confirmed_at, confirmed_by)
  select p_personal_id, date_trunc('month', now())::date, subscription_price, 'confirmado', now(), auth.uid()
    from profiles where id = p_personal_id;
end;
$$;

revoke all on function public.admin_confirmar_pagamento_personal(uuid, int) from public;
grant execute on function public.admin_confirmar_pagamento_personal(uuid, int) to authenticated;

-- ------------------------------------------------------------
-- 3. Admin controla o acesso do personal à plataforma
--    p_acao: 'bloquear' | 'liberar' | 'definir_vencimento'
--      bloquear           -> trava o app do personal na hora
--      liberar            -> destrava; se o vencimento estiver vazio ou
--                            vencido, usa p_vencimento (ou hoje + 1 mês)
--      definir_vencimento -> grava p_vencimento (obrigatório)
--    Toda ação fica registrada em personal_status_audit.
-- ------------------------------------------------------------
create or replace function public.admin_definir_acesso_personal(
  p_personal_id uuid,
  p_acao        text,
  p_vencimento  timestamptz default null,
  p_motivo      text        default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status text;
  v_old_exp    timestamptz;
  v_new_status text;
begin
  if public.current_user_role() is distinct from 'admin'::user_role then
    raise exception 'Apenas o admin controla o acesso do personal.' using errcode = '42501';
  end if;

  select subscription_status, subscription_expires_at
    into v_old_status, v_old_exp
    from profiles where id = p_personal_id and role = 'personal';
  if not found then
    raise exception 'Personal não encontrado.';
  end if;

  if p_acao = 'bloquear' then
    update profiles set subscription_status = 'bloqueado' where id = p_personal_id;
    v_new_status := 'bloqueado';

  elsif p_acao = 'liberar' then
    update profiles
       set subscription_status = 'ativa',
           subscription_expires_at =
             case when subscription_expires_at is null or subscription_expires_at < now()
                  then coalesce(p_vencimento, now() + interval '1 month')
                  else subscription_expires_at end
     where id = p_personal_id;
    v_new_status := 'ativa';

  elsif p_acao = 'definir_vencimento' then
    if p_vencimento is null then
      raise exception 'Informe a data de vencimento.';
    end if;
    update profiles set subscription_expires_at = p_vencimento where id = p_personal_id;
    v_new_status := coalesce(v_old_status, 'ativa');

  else
    raise exception 'Ação inválida: %', p_acao;
  end if;

  insert into personal_status_audit (personal_id, admin_id, old_status, new_status, reason)
  values (
    p_personal_id, auth.uid(), v_old_status, v_new_status,
    'Acesso/' || p_acao
      || case when p_vencimento is not null then ' (venc. ' || to_char(p_vencimento, 'DD/MM/YYYY') || ')' else '' end
      || case when p_motivo is not null then ': ' || p_motivo else '' end
  );
end;
$$;

revoke all on function public.admin_definir_acesso_personal(uuid, text, timestamptz, text) from public;
grant execute on function public.admin_definir_acesso_personal(uuid, text, timestamptz, text) to authenticated;

-- ------------------------------------------------------------
-- 4. Status de acesso calculado PELO SERVIDOR
--    Os apps comparavam o vencimento com o relógio do aparelho: quem
--    atrasasse a data do celular escapava do bloqueio. Agora os dois apps
--    podem perguntar ao banco (hora do servidor). Mesma regra do app:
--    admin nunca bloqueia; data nula não bloqueia.
-- ------------------------------------------------------------
create or replace function public.get_my_access_status()
returns table (blocked boolean, reason text, expires_at timestamptz, server_now timestamptz)
language sql
stable
set search_path = public
as $$
  select
    case
      when p.role::text = 'admin' then false
      when p.role::text = 'personal' then
        (p.subscription_status = 'bloqueado'
         or (p.subscription_expires_at is not null and p.subscription_expires_at < now()))
      else
        (coalesce(p.access_blocked, false)
         or (p.access_expires_at is not null and p.access_expires_at < now()))
    end,
    case
      when p.role::text = 'admin' then null
      when p.role::text = 'personal' then
        case when p.subscription_status = 'bloqueado' then 'manual'
             when p.subscription_expires_at < now() then 'expired' end
      else
        case when coalesce(p.access_blocked, false) then 'manual'
             when p.access_expires_at < now() then 'expired' end
    end,
    case when p.role::text = 'personal' then p.subscription_expires_at else p.access_expires_at end,
    now()
  from profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.get_my_access_status() to authenticated;

-- ------------------------------------------------------------
-- 5. Pix da plataforma para o personal bloqueado (conta admin)
-- ------------------------------------------------------------
create or replace function public.get_platform_pix()
returns table (name text, pix_key text, whatsapp text)
language sql
stable
security definer
set search_path = public
as $$
  select name, pix_key, whatsapp
    from profiles
   where role = 'admin'
   order by created_at asc
   limit 1;
$$;

grant execute on function public.get_platform_pix() to authenticated;

-- ------------------------------------------------------------
-- 6. Guard de profiles: agora também protege subscription_*
--    (a 20261008 protegia access_* e status, mas o personal ainda poderia
--    editar o PRÓPRIO subscription_expires_at). Admin e funções internas
--    continuam livres.
-- ------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
as $$
declare
  v_caller uuid := auth.uid();
begin
  -- Chamadas internas (definer, triggers, service_role, SQL Editor): livres.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Admin: livre.
  if public.current_user_role() = 'admin'::user_role then
    return new;
  end if;

  -- Ninguém além do admin muda identidade, papel, vínculo ou data de aprovação.
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.personal_id is distinct from old.personal_id
     or new.approved_at is distinct from old.approved_at then
    raise exception 'Alteração não permitida neste perfil.' using errcode = '42501';
  end if;

  -- NOVO: assinatura do personal é só do admin (vale até p/ o personal do aluno).
  if new.subscription_expires_at is distinct from old.subscription_expires_at
     or new.subscription_status is distinct from old.subscription_status
     or new.subscription_plan is distinct from old.subscription_plan
     or new.subscription_price is distinct from old.subscription_price
     or new.subscription_payment_method is distinct from old.subscription_payment_method then
    raise exception 'Somente o administrador altera a assinatura do personal.' using errcode = '42501';
  end if;

  -- Personal editando o próprio aluno: pode mexer em acesso/mensalidade/exclusão.
  if v_caller is not null and v_caller = old.personal_id and v_caller <> old.id then
    return new;
  end if;

  -- Demais casos (o próprio usuário): campos de acesso e aprovação são só leitura.
  if new.status is distinct from old.status
     or new.access_blocked is distinct from old.access_blocked
     or new.access_expires_at is distinct from old.access_expires_at
     or new.monthly_fee is distinct from old.monthly_fee
     or new.is_excluded is distinct from old.is_excluded
     or new.excluded_at is distinct from old.excluded_at then
    raise exception 'Alteração não permitida neste perfil.' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- (o trigger a_guard_profile_update da 20261008 continua apontando para esta função)
