-- ============================================================
-- SCHEMA V33b (OPCIONAL, mas recomendado) - Blindar o bloqueio no banco
--
-- Sem isto, o bloqueio é só visual: quem conhece a API do Supabase poderia
-- editar o PRÓPRIO vencimento (profiles.subscription_expires_at /
-- access_expires_at) e se liberar sozinho.
--
-- Regras:
--   * subscription_* (personal)  -> só ADMIN altera (a RPC de confirmação
--     já roda como admin).
--   * access_expires_at / access_blocked (aluno) -> ADMIN ou o PERSONAL do
--     aluno alteram; o próprio aluno NÃO.
--   * Chamadas sem usuário (SQL Editor / service role) passam.
--
-- Rode o v33 antes. Depois de rodar, teste: confirmar pagamento de aluno
-- (personal) e de personal (admin), aprovar aluno/personal, editar perfil.
-- ============================================================

create or replace function public.protect_payment_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;
  if public.current_user_role() = 'admin' then return new; end if;

  if (new.subscription_expires_at is distinct from old.subscription_expires_at)
     or (new.subscription_status  is distinct from old.subscription_status)
     or (new.subscription_price   is distinct from old.subscription_price) then
    raise exception 'Somente o administrador altera a assinatura do personal';
  end if;

  if auth.uid() = new.id
     and ((new.access_expires_at is distinct from old.access_expires_at)
       or (new.access_blocked    is distinct from old.access_blocked)) then
    raise exception 'Somente o personal ou o administrador alteram o acesso do aluno';
  end if;

  return new;
end;
$$;

-- prefixo "zz_" para rodar depois dos outros triggers BEFORE UPDATE
drop trigger if exists zz_protect_payment_columns on profiles;
create trigger zz_protect_payment_columns
  before update on profiles
  for each row execute function public.protect_payment_columns();
