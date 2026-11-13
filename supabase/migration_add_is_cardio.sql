-- ============================================================
--  MIGRAÇÃO: Adicionar suporte à aba de Cardio no workout_exercises
--  Execute este script no SQL Editor do Supabase Dashboard
--  (mesmo padrão usado em migration_add_is_warmup.sql)
-- ============================================================

-- 1. Adiciona a coluna is_cardio (default false, nunca nulo)
ALTER TABLE workout_exercises
  ADD COLUMN IF NOT EXISTS is_cardio BOOLEAN NOT NULL DEFAULT false;

-- 2. Índice para buscar rapidamente só os exercícios de cardio de um treino
CREATE INDEX IF NOT EXISTS idx_workout_exercises_cardio
  ON workout_exercises (workout_id, is_cardio)
  WHERE is_cardio = true;

-- ============================================================
--  PRONTO — nenhuma outra tabela precisa ser alterada.
--  O cardio usa a mesma tabela de exercises e herda:
--    • video_id  (vídeo de demonstração)
--    • name / instructions (descrição)
--    • target_sets / target_reps / target_duration_minutes
--  A flag is_cardio = true separa o cardio dos exercícios normais
--  e do aquecimento (is_warmup). Um item nunca deve ter as duas
--  flags true ao mesmo tempo — o app sempre grava só uma delas.
--  Ordem de exibição no treino: Aquecimento → Exercícios → Cardio
--  (order_index positivo e maior que o dos exercícios normais).
-- ============================================================
