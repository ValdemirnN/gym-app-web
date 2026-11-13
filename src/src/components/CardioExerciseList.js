/**
 * CardioExerciseList.js
 * src/components/CardioExerciseList.js
 *
 * Exibe os exercícios de cardio do treino (is_cardio = true em workout_exercises).
 * Mesma estrutura do WarmupExerciseList (vídeo, observação, dica, descanso entre
 * séries, séries detalhadas com drop set e substituto), pensada para aparecer
 * por ÚLTIMO no treino demonstrativo (do aluno e do personal).
 *
 * Props:
 *   items          — array de workout_exercise rows com is_cardio = true
 *   isPersonal     — boolean: mostra botão de remover se true
 *   workoutId      — string (usado pelo personal para navegar ao editar)
 *   onReload       — () => void (personal: chamado após remover)
 *   onManageVideo  — (item) => void (personal: abre trocar/remover vídeo — só
 *                     quando o cardio tem um único exercício cadastrado)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../theme/theme';
import { s, vs, fs } from '../utils/responsive';
import InlineDemoVideo from './InlineDemoVideo';

// Monta a lista de reps por série (respeita reps personalizadas por série)
function getRepsList(item) {
  if (item.target_reps_detail) {
    return item.target_reps_detail.split(',').map((r) => r.trim());
  }
  const total = Math.max(1, item.target_sets ?? 1);
  return Array.from({ length: total }, () => String(item.target_reps ?? '-'));
}

function formatRest(seconds) {
  if (!seconds) return null;
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${min}min${rest > 0 ? ` ${rest}s` : ''}`;
  }
  return `${seconds}s`;
}

// ─── Conteúdo completo de um exercício (principal ou substituto) ──────────────
function ExerciseFullContent({ exercise, isTimeMode, durationMinutes, repsList, dropLast, dropNote, restSeconds, progressionNote, progressionLabel, isSubstitute, isPersonal, onEditField }) {
  return (
    <View>
      {/* Vídeo demonstrativo */}
      {exercise?.video_id ? (
        <View style={{ marginBottom: vs(10) }}>
          <InlineDemoVideo videoId={exercise.video_id} />
        </View>
      ) : (
        <View style={styles.videoEmpty}>
          <Feather name="video-off" size={s(16)} color={colors.textDim2} />
          <Text style={styles.videoEmptyText}>Sem vídeo demonstrativo</Text>
        </View>
      )}

      {/* Descanso entre séries */}
      {!isSubstitute && !isTimeMode && restSeconds ? (
        <View style={styles.restRow}>
          <Feather name="clock" size={s(12)} color={colors.textDim} />
          <Text style={styles.restText}>
            Descanso entre séries: <Text style={styles.restValue}>{formatRest(restSeconds)}</Text>
          </Text>
        </View>
      ) : null}

      {/* Séries / tempo */}
      {isTimeMode ? (
        <View style={styles.timePill}>
          <Feather name="clock" size={s(14)} color={colors.red} />
          <Text style={styles.timePillText}>{durationMinutes ?? '?'} min</Text>
        </View>
      ) : (
        <View style={styles.setsRow}>
          {repsList.map((reps, i) => {
            const isLast = i === repsList.length - 1;
            const isDrop = isLast && dropLast;
            return (
              <View key={i} style={[styles.setPill, isDrop && styles.setPillDrop]}>
                <Text style={styles.setPillN}>{isDrop ? 'DROP' : `SÉRIE ${i + 1}`}</Text>
                {!isDrop && (
                  <>
                    <Text style={styles.setPillReps}>{reps}</Text>
                    <Text style={styles.setPillUnit}>reps</Text>
                  </>
                )}
                {isDrop && <Feather name="zap" size={s(12)} color={colors.amber} />}
              </View>
            );
          })}
        </View>
      )}
      {dropLast && dropNote ? (
        <View style={styles.dropNoteBox}>
          <Feather name="zap" size={s(11)} color={colors.amber} />
          <Text style={styles.dropNoteText}>{dropNote}</Text>
        </View>
      ) : null}

      {/* Observação do personal */}
      {progressionNote ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{progressionLabel}</Text>
          <Text style={styles.sectionText}>{progressionNote}</Text>
        </View>
      ) : null}

      {/* Como executar */}
      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionTitle}>COMO EXECUTAR</Text>
          {isPersonal && !isSubstitute && (
            <TouchableOpacity
              onPress={() => onEditField?.(exercise?.id, 'instructions', exercise?.instructions)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Feather name="edit-3" size={s(13)} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
        {exercise?.instructions ? (
          <Text style={styles.sectionText}>{exercise.instructions}</Text>
        ) : (
          <Text style={styles.emptyFieldText}>
            {isPersonal && !isSubstitute
              ? 'Nenhuma instrução cadastrada ainda. Toca no lápis pra escrever.'
              : 'Nenhuma instrução cadastrada ainda.'}
          </Text>
        )}
      </View>

      {/* Dica do professor */}
      <View style={[styles.tipBox, !exercise?.tip && styles.tipBoxEmpty]}>
        <Feather
          name="zap"
          size={s(13)}
          color={exercise?.tip ? colors.accent : colors.textFaint}
          style={{ flexShrink: 0 }}
        />
        <View style={{ flex: 1 }}>
          {exercise?.tip ? (
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Dica do professor: </Text>
              {exercise.tip}
            </Text>
          ) : (
            <Text style={styles.emptyFieldText}>
              {isPersonal && !isSubstitute
                ? 'Nenhuma dica cadastrada ainda. Toca no lápis pra escrever.'
                : 'Nenhuma dica cadastrada ainda.'}
            </Text>
          )}
        </View>
        {isPersonal && !isSubstitute && (
          <TouchableOpacity
            onPress={() => onEditField?.(exercise?.id, 'tip', exercise?.tip)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="edit-3" size={s(13)} color={colors.textDim} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function CardioExerciseList({
  items = [],
  isPersonal = false,
  workoutId,
  onReload,
  onManageVideo,
  onEditField,
}) {
  const [expanded, setExpanded] = useState(false);
  const [subOpen, setSubOpen] = useState({}); // { [item.id]: boolean }

  if (!items || items.length === 0) return null;

  const handleRemoveItem = (item) => {
    const name = item.exercises?.name || 'este exercício';
    Alert.alert(
      'Remover do cardio',
      `Remover "${name}" do cardio?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('workout_exercises')
              .delete()
              .eq('id', item.id);
            if (error) {
              Alert.alert('Erro', error.message);
              return;
            }
            onReload?.();
          },
        },
      ]
    );
  };

  const totalMinutes = items.reduce((acc, it) => {
    if (it.target_duration_minutes) return acc + it.target_duration_minutes;
    return acc + ((it.target_sets || 1) * 1.5); // estimativa: 1.5 min por série
  }, 0);

  // 3 pontos no cabeçalho só faz sentido quando há um único exercício de
  // cardio cadastrado (o caso comum) — funciona pra anexar, trocar ou
  // remover vídeo, com ou sem vídeo já cadastrado.
  const headerExercise = items.length === 1 ? items[0] : null;
  const showHeaderVideoMenu = isPersonal && !!headerExercise;

  return (
    <View style={styles.card}>
      {/* Cabeçalho sempre visível */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Feather name="heart" size={s(15)} color={colors.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>CARDIO</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {items.length} exercício{items.length !== 1 ? 's' : ''} · ~{Math.round(totalMinutes)} min
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={s(16)}
            color={colors.textDim}
          />

          {showHeaderVideoMenu && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onManageVideo?.(headerExercise); }}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Feather name="more-vertical" size={s(16)} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Conteúdo expandido */}
      {expanded && (
        <View style={styles.body}>
          {items.map((item, idx) => {
            const ex = item.exercises || {};
            const isTimeMode = item.target_duration_minutes != null;
            const repsList = getRepsList(item);
            const subs = (item.workout_exercise_substitutes || []).filter((sb) => sb.exercises);
            const hasSubs = subs.length > 0;
            const isSubOpen = !!subOpen[item.id];

            return (
              <View key={item.id} style={styles.exerciseRow}>
                {/* Número + nome + ações */}
                <View style={styles.exTopRow}>
                  <View style={styles.numWrap}>
                    <Text style={styles.num}>{String(idx + 1).padStart(2, '0')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>{ex.name || '—'}</Text>
                    {ex.muscle_group ? (
                      <Text style={styles.exGroup}>{ex.muscle_group}</Text>
                    ) : null}
                  </View>

                  {/* Ações do personal */}
                  {isPersonal && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemoveItem(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={s(14)} color={colors.red} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ marginTop: vs(8) }}>
                  <ExerciseFullContent
                    exercise={ex}
                    isTimeMode={isTimeMode}
                    durationMinutes={item.target_duration_minutes}
                    repsList={repsList}
                    dropLast={item.drop_last}
                    dropNote={item.drop_note}
                    restSeconds={item.rest_seconds}
                    progressionNote={item.progression_note}
                    progressionLabel="OBSERVAÇÃO / INSTRUÇÕES"
                    isPersonal={isPersonal}
                    onEditField={onEditField}
                  />
                </View>

                {/* Substituto cadastrado */}
                {hasSubs && (
                  <View style={styles.subWrap}>
                    <TouchableOpacity
                      style={styles.subToggle}
                      onPress={() => setSubOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                      activeOpacity={0.8}
                    >
                      <Feather name="refresh-cw" size={s(12)} color={colors.red} />
                      <Text style={styles.subToggleText} numberOfLines={1}>
                        {' '}Substituto{subs.length > 1 ? 's' : ''}: {subs.map((sb) => sb.exercises?.name).join(', ')}
                      </Text>
                      <Feather
                        name={isSubOpen ? 'chevron-up' : 'chevron-down'}
                        size={s(14)}
                        color={colors.textDim}
                        style={{ marginLeft: 'auto' }}
                      />
                    </TouchableOpacity>

                    {isSubOpen && subs.map((sb) => {
                      const subRepsList = sb.target_reps_detail
                        ? sb.target_reps_detail.split(',').map((r) => r.trim())
                        : Array.from({ length: Math.max(1, sb.target_sets ?? item.target_sets ?? 1) }, () => String(sb.target_reps ?? item.target_reps ?? '-'));
                      return (
                        <View key={sb.substitute_exercise_id} style={styles.subContent}>
                          <ExerciseFullContent
                            exercise={{
                              ...sb.exercises,
                              instructions: sb.instructions || sb.exercises?.instructions,
                            }}
                            isTimeMode={false}
                            repsList={subRepsList}
                            dropLast={sb.drop_last}
                            dropNote={sb.drop_note}
                            restSeconds={null}
                            progressionNote={null}
                            progressionLabel=""
                            isSubstitute
                            isPersonal={isPersonal}
                            onEditField={onEditField}
                          />
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          {/* Dica para o personal editar */}
          {isPersonal && (
            <View style={styles.personalHint}>
              <Feather name="info" size={s(12)} color={colors.textDim2} />
              <Text style={styles.personalHintText}>
                Para adicionar ou remover exercícios de cardio, use "Editar Treino".
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.redGlow,
    marginHorizontal: s(16),
    marginTop: vs(4),
    marginBottom: vs(12),
    overflow: 'hidden',
  },

  // Cabeçalho
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(14),
    paddingVertical: vs(12),
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: s(10) },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  iconWrap: {
    width: s(34),
    height: s(34),
    borderRadius: s(10),
    backgroundColor: colors.redGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.red,
    fontSize: fs(9),
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: vs(1),
  },
  subtitle: {
    color: colors.textDim,
    fontSize: fs(11),
    fontWeight: '500',
  },

  // Corpo expandido
  body: {
    paddingHorizontal: s(14),
    paddingBottom: vs(14),
    borderTopWidth: 1,
    borderTopColor: colors.redGlow,
  },

  // Linha de exercício
  exerciseRow: {
    paddingVertical: vs(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.redGlow,
  },
  numWrap: {
    width: s(24),
    paddingTop: vs(2),
  },
  num: { color: colors.red, fontSize: fs(10), fontWeight: '700' },

  exTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(4),
  },
  exName: {
    color: colors.text,
    fontSize: fs(13),
    fontWeight: '600',
  },
  exGroup: {
    color: colors.textDim2,
    fontSize: fs(10),
    marginTop: vs(1),
    textTransform: 'capitalize',
  },
  removeBtn: {
    padding: s(4),
  },

  // Vídeo
  videoEmpty: {
    height: vs(64),
    borderRadius: radius.sm,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: vs(4),
    marginBottom: vs(10),
  },
  videoEmptyText: { color: colors.textDim2, fontSize: fs(10) },

  // Descanso
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: vs(7),
    paddingHorizontal: s(10),
    marginBottom: vs(10),
  },
  restText: { color: colors.textDim, fontSize: fs(10.5) },
  restValue: { color: colors.text, fontWeight: '700' },

  // Pílula de tempo (modo duração)
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    alignSelf: 'flex-start',
    backgroundColor: colors.redGlow,
    borderRadius: radius.pill,
    paddingVertical: vs(6),
    paddingHorizontal: s(14),
  },
  timePillText: { color: colors.red, fontSize: fs(13), fontWeight: '700' },

  // Pílulas de série
  setsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6) },
  setPill: {
    minWidth: s(64),
    flexGrow: 1,
    aspectRatio: 1 / 0.72,
    borderRadius: s(9),
    backgroundColor: colors.surface2,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPillDrop: { backgroundColor: colors.amberGlow, borderColor: 'rgba(255,182,72,0.4)' },
  setPillN: { fontSize: fs(7), fontWeight: '700', color: colors.textFaint, letterSpacing: 0.3 },
  setPillReps: { fontSize: fs(12), fontWeight: '700', color: colors.text },
  setPillUnit: { fontSize: fs(7.5), color: colors.textFaint, fontWeight: '600' },

  dropNoteBox: {
    flexDirection: 'row',
    gap: s(6),
    alignItems: 'flex-start',
    marginTop: vs(8),
  },
  dropNoteText: { color: colors.amber, fontSize: fs(9.5), lineHeight: fs(9.5) * 1.5, flex: 1 },

  // Seções (observação / como executar)
  section: { marginTop: vs(10) },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: vs(3),
  },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: fs(8.5),
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  sectionText: {
    color: colors.textDim,
    fontSize: fs(12),
    lineHeight: fs(12) * 1.55,
  },
  emptyFieldText: {
    color: colors.textFaint,
    fontSize: fs(11),
    lineHeight: fs(11) * 1.5,
    fontStyle: 'italic',
  },

  // Dica do professor
  tipBox: {
    flexDirection: 'row',
    gap: s(8),
    alignItems: 'flex-start',
    backgroundColor: colors.accentGlow,
    borderRadius: radius.sm,
    padding: s(10),
    marginTop: vs(10),
  },
  tipBoxEmpty: {
    backgroundColor: colors.surface3,
    borderColor: colors.line,
    borderWidth: 1,
  },
  tipText: { color: colors.text, fontSize: fs(11.5), lineHeight: fs(11.5) * 1.5, flex: 1 },
  tipBold: { fontWeight: '700', color: colors.accent },

  instructions: {
    color: colors.textDim,
    fontSize: fs(12),
    lineHeight: fs(12) * 1.55,
    marginTop: vs(6),
  },

  // Substituto
  subWrap: {
    marginTop: vs(10),
    paddingTop: vs(10),
    borderTopWidth: 1,
    borderTopColor: colors.redGlow,
  },
  subToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    backgroundColor: colors.surface3,
    borderRadius: radius.pill,
    paddingVertical: vs(7),
    paddingHorizontal: s(10),
  },
  subToggleText: { color: colors.red, fontSize: fs(10.5), fontWeight: '600', flexShrink: 1 },
  subContent: {
    marginTop: vs(10),
    paddingLeft: s(10),
    borderLeftWidth: 2,
    borderLeftColor: colors.redGlow,
  },

  // Hint do personal
  personalHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    marginTop: vs(14),
    paddingTop: vs(10),
    borderTopWidth: 1,
    borderTopColor: colors.redGlow,
  },
  personalHintText: {
    color: colors.textDim2,
    fontSize: fs(11),
    flex: 1,
    lineHeight: 16,
  },
});
