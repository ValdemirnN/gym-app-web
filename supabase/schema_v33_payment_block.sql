-- ============================================================
-- SCHEMA V33 - Bloqueio por falta de pagamento (personal e aluno)
--
--   Regras:
--   * PERSONAL: paga a plataforma. Só o ADMIN confirma o pagamento.
--     Passou de profiles.subscription_expires_at sem confirmação
--     -> app bloqueado até o admin confirmar.
--   * ALUNO: paga o personal (fluxo que já existia: payments +
--     profiles.access_expires_at). O personal confirma.
--
-- Rode este script INTEIRO no SQL Editor do Supabase.
-- É seguro rodar em cima do banco atual (não apaga nada).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Colunas de assinatura do personal
--    (o PersonalFinancialScreen já lia essas colunas; "if not exists"
--     evita erro caso você já tenha criado à mão no Supabase)
-- ------------------------------------------------------------
alter table profiles
  add column if not exists subscription_plan           text,
  add column if not exists subscription_price          numeric(10,2),
  add column if not exists subscription_expires_at     timestamp with time zone,
  add column if not exists subscription_status         text,
  add column if not exists subscription_payment_method text;

-- ------------------------------------------------------------
-- 2. Pagamentos do personal à plataforma
-- ------------------------------------------------------------
create table if not exists personal_payments (
  id              uuid primary key default gen_random_uuid(),
  personal_id     uuid references profiles(id) on delete cascade not null,
  reference_month date not null,
  amount          numeric(10,2),
  payment_method  text,
  status          text not null default 'pendente',   -- 'pendente' | 'confirmado'
  confirmed_at    timestamp with time zone,
  confirmed_by    uuid references profiles(id) on delete set null,
  created_at      timestamp with time zone default now()
);

create index if not exists idx_personal_payments_personal
  on personal_payments (personal_id, reference_month desc);

alter table personal_payments enable row level security;

drop policy if exists "Personal ve os proprios pagamentos" on personal_payments;
create policy "Personal ve os proprios pagamentos" on personal_payments
  for select using (personal_id = auth.uid());

drop policy if exists "Admin ve todos os pagamentos de personals" on personal_payments;
create policy "Admin ve todos os pagamentos de personals" on personal_payments
  for select using (public.current_user_role() = 'admin');

-- Sem policy de insert/update/delete de propósito: só a RPC abaixo
-- (security definer, restrita a admin) escreve nessa tabela.

-- ------------------------------------------------------------
-- 3. RPC: admin confirma o pagamento do personal
--    Renova a partir do maior valor entre "vencimento atual" e "agora":
--      - pagou adiantado  -> soma 1 mês ao vencimento atual
--      - pagou atrasado   -> conta 1 mês a partir de hoje
--    e já libera o app do personal.
-- ------------------------------------------------------------
create or replace function public.admin_confirm_personal_payment(
  p_personal_id uuid,
  p_amount      numeric default null,
  p_method      text    default null
)
returns timestamp with time zone
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base    timestamp with time zone;
  v_new_exp timestamp with time zone;
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Sem permissão';
  end if;

  select greatest(coalesce(subscription_expires_at, now()), now())
    into v_base
    from profiles
   where id = p_personal_id and role = 'personal';

  if not found then
    raise exception 'Personal não encontrado';
  end if;

  v_new_exp := v_base + interval '1 month';

  insert into personal_payments
    (personal_id, reference_month, amount, payment_method, status, confirmed_at, confirmed_by)
  values
    (p_personal_id, date_trunc('month', v_base)::date,
     coalesce(p_amount, (select subscription_price from profiles where id = p_personal_id)),
     p_method, 'confirmado', now(), auth.uid());

  update profiles
     set subscription_expires_at     = v_new_exp,
         subscription_status         = 'ativo',
         subscription_payment_method = coalesce(p_method, subscription_payment_method)
   where id = p_personal_id;

  return v_new_exp;
end;
$$;

-- ------------------------------------------------------------
-- 4. RPC: chave Pix da plataforma (conta admin)
--    O personal bloqueado precisa ver pra quem pagar, mas não tem
--    permissão de ler o profile do admin por RLS.
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

-- ------------------------------------------------------------
-- 5. Aprovação de personal passa a dar 1 mês de acesso (teste inicial)
--    O trigger do v8 já fazia isso com access_expires_at (usado pelo aluno);
--    aqui acrescentamos a assinatura do personal.
-- ------------------------------------------------------------
create or replace function public.handle_profile_approval()
returns trigger as $$
begin
  if new.status = 'aprovado' and (old.status is distinct from new.status) then
    new.approved_at := now();
    new.access_expires_at := now() + interval '1 month';
    new.access_blocked := false;

    if new.role = 'personal' then
      new.subscription_expires_at := now() + interval '1 month';
      new.subscription_status := 'ativo';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- 6. Personals JÁ aprovados hoje não têm vencimento -> sem isto
--    todos seriam bloqueados assim que o app for publicado.
--    Damos 30 dias de carência a partir de agora. Ajuste se quiser.
-- ------------------------------------------------------------
update profiles
   set subscription_expires_at = now() + interval '30 days',
       subscription_status     = coalesce(subscription_status, 'ativo')
 where role = 'personal'
   and status = 'aprovado'
   and subscription_expires_at is null;

-- ============================================================
-- FIM DO SCHEMA V33
-- ============================================================
