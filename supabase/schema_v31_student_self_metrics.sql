-- ============================================================
-- v31: Aluno pode registrar suas próprias métricas de evolução
--      (peso / % gordura / medidas) e suas próprias metas.
--      O personal continua podendo cadastrar tudo isso pelo
--      aluno normalmente (política já existente é mantida).
-- ============================================================

-- Marca quem originou o registro, pra diferenciar na UI
alter table evaluations add column if not exists source text not null default 'personal' check (source in ('personal','aluno'));
alter table goals add column if not exists source text not null default 'personal' check (source in ('personal','aluno'));

-- ─── Avaliações (peso, % gordura, medidas) ───────────────────

-- Aluno pode registrar sua própria avaliação (o personal_id é
-- preenchido automaticamente com o personal responsável por ele)
drop policy if exists "Aluno registra propria avaliacao" on evaluations;
create policy "Aluno registra propria avaliacao" on evaluations
  for insert
  with check (
    student_id = auth.uid()
    and personal_id = (select personal_id from profiles where id = auth.uid())
  );

-- Aluno só edita/apaga avaliações que ele mesmo criou
drop policy if exists "Aluno edita propria avaliacao" on evaluations;
create policy "Aluno edita propria avaliacao" on evaluations
  for update
  using (student_id = auth.uid() and source = 'aluno')
  with check (student_id = auth.uid() and source = 'aluno');

drop policy if exists "Aluno apaga propria avaliacao" on evaluations;
create policy "Aluno apaga propria avaliacao" on evaluations
  for delete
  using (student_id = auth.uid() and source = 'aluno');

-- ─── Metas ────────────────────────────────────────────────────

-- Aluno pode criar sua própria meta
drop policy if exists "Aluno cria propria meta" on goals;
create policy "Aluno cria propria meta" on goals
  for insert
  with check (
    student_id = auth.uid()
    and personal_id = (select personal_id from profiles where id = auth.uid())
  );

-- Aluno pode marcar como concluída / editar suas próprias metas
drop policy if exists "Aluno edita propria meta" on goals;
create policy "Aluno edita propria meta" on goals
  for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Aluno só apaga metas que ele mesmo criou
drop policy if exists "Aluno apaga propria meta" on goals;
create policy "Aluno apaga propria meta" on goals
  for delete
  using (student_id = auth.uid() and source = 'aluno');
