-- ============================================================
-- SCHEMA V32
--   Cadastro (signup) agora pode enviar todos os campos opcionais
--   de perfil (aluno e personal) direto na criação da conta, sem
--   depender de o usuário completar o perfil depois.
--   Isso só ajusta a função que cria o profile a partir dos
--   metadados do signup — as colunas já existem desde schemas
--   anteriores (v6, v13, v15 etc.), então este script é seguro
--   de rodar mesmo que o projeto já tenha dados.
-- Rode este script INTEIRO no SQL Editor do Supabase.
-- ============================================================

create or replace function public.handle_new_auth_user()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, name, email, role, personal_id,
    -- aluno
    health_conditions, health_restrictions,
    birth_date, gender, phone,
    emergency_contact_name, emergency_contact_phone,
    height_cm, weight_kg, body_fat_pct,
    goal, activity_level,
    chronic_conditions, other_chronic_condition,
    frequent_pain, medications,
    sleep_hours, stress_level,
    is_smoker, drinks_alcohol,
    -- personal
    pix_key, whatsapp, instagram_url, linkedin_url,
    cref_number, cref_state, specialties, bio,
    consultation_price, available_plans,
    attends_online, attends_in_person,
    in_person_location, availability_hours
  )
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente'),
    nullif(new.raw_user_meta_data->>'personal_id', '')::uuid,

    new.raw_user_meta_data->>'health_conditions',
    new.raw_user_meta_data->>'health_restrictions',
    nullif(new.raw_user_meta_data->>'birth_date', '')::date,
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'emergency_contact_name',
    new.raw_user_meta_data->>'emergency_contact_phone',
    nullif(new.raw_user_meta_data->>'height_cm', '')::numeric,
    nullif(new.raw_user_meta_data->>'weight_kg', '')::numeric,
    nullif(new.raw_user_meta_data->>'body_fat_pct', '')::numeric,
    new.raw_user_meta_data->>'goal',
    new.raw_user_meta_data->>'activity_level',
    case when new.raw_user_meta_data ? 'chronic_conditions'
      then array(select jsonb_array_elements_text(new.raw_user_meta_data->'chronic_conditions'))
      else null end,
    new.raw_user_meta_data->>'other_chronic_condition',
    new.raw_user_meta_data->>'frequent_pain',
    new.raw_user_meta_data->>'medications',
    nullif(new.raw_user_meta_data->>'sleep_hours', '')::numeric,
    nullif(new.raw_user_meta_data->>'stress_level', '')::int,
    coalesce((new.raw_user_meta_data->>'is_smoker')::boolean, false),
    coalesce((new.raw_user_meta_data->>'drinks_alcohol')::boolean, false),

    new.raw_user_meta_data->>'pix_key',
    new.raw_user_meta_data->>'whatsapp',
    new.raw_user_meta_data->>'instagram_url',
    new.raw_user_meta_data->>'linkedin_url',
    new.raw_user_meta_data->>'cref_number',
    new.raw_user_meta_data->>'cref_state',
    case when new.raw_user_meta_data ? 'specialties'
      then array(select jsonb_array_elements_text(new.raw_user_meta_data->'specialties'))
      else null end,
    new.raw_user_meta_data->>'bio',
    nullif(new.raw_user_meta_data->>'consultation_price', '')::numeric,
    new.raw_user_meta_data->>'available_plans',
    coalesce((new.raw_user_meta_data->>'attends_online')::boolean, false),
    coalesce((new.raw_user_meta_data->>'attends_in_person')::boolean, false),
    new.raw_user_meta_data->>'in_person_location',
    new.raw_user_meta_data->>'availability_hours'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- FIM DO SCHEMA V32
-- ============================================================
