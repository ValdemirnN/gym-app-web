-- ─── Grupos de treino ──────────────────────────────────────────────────────
-- Um "grupo" representa um bloco de treinos com nome e validade próprios.
-- O personal cria o grupo primeiro (nome + validade opcional), depois
-- cadastra os treinos (dias) dentro dele. O grupo pode ser concluído a
-- qualquer momento (mesmo antes da validade) para o personal evoluir o
-- aluno pra um novo grupo, ou apagado por completo.

create table if not exists workout_groups (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references auth.users on delete cascade,
  personal_id  uuid not null references auth.users on delete cascade,
  name         text not null,
  goal         text,
  level        text,
  valid_until  date,
  status       text not null default 'ativo' check (status in ('ativo', 'concluido')),
  concluded_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_workout_groups_student on workout_groups(student_id);
create index if not exists idx_workout_groups_personal on workout_groups(personal_id);

alter table workouts
  add column if not exists group_id uuid references workout_groups(id) on delete set null;

create index if not exists idx_workouts_group on workouts(group_id);

-- RLS: mesmo padrão de acesso usado por `workouts` (aluno lê o seu, personal lê/escreve os dos seus alunos)
alter table workout_groups enable row level security;

drop policy if exists "workout_groups_student_read" on workout_groups;
create policy "workout_groups_student_read" on workout_groups
  for select using (auth.uid() = student_id);

drop policy if exists "workout_groups_personal_all" on workout_groups;
create policy "workout_groups_personal_all" on workout_groups
  for all using (auth.uid() = personal_id) with check (auth.uid() = personal_id);
