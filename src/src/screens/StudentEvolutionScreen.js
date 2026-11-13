import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme/theme';
import { s, vs, fs, screenPaddingTop } from '../utils/responsive';

const MEASURE_FIELDS = [
  { key: 'chest', label: 'Peito (cm)' },
  { key: 'waist', label: 'Cintura (cm)' },
  { key: 'hip', label: 'Quadril (cm)' },
  { key: 'arm', label: 'Braço (cm)' },
  { key: 'thigh', label: 'Coxa (cm)' },
  { key: 'calf', label: 'Panturrilha (cm)' },
];

function formatDate(d) {
  if (!d) return '-';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date();
  return new Date(str + 'T00:00:00');
}

// Campo de data: aceita digitação manual (AAAA-MM-DD) e também abrir um
// calendário nativo, com botão de confirmar, pra evitar erro de digitação.
function DateField({ label, value, onChange, placeholder }) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(parseISODate(value));

  const openPicker = () => {
    setTempDate(parseISODate(value));
    setShowPicker(true);
  };

  const handleChange = (event, selected) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selected) {
        onChange(toISODate(selected));
      }
      return;
    }
    if (selected) setTempDate(selected);
  };

  const confirmIOS = () => {
    onChange(toISODate(tempDate));
    setShowPicker(false);
  };

  return (
    <View>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.dateFieldRow}>
        <TextInput
          style={[styles.input, styles.dateFieldInput]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder || 'AAAA-MM-DD'}
          placeholderTextColor={colors.textDim2}
        />
        <TouchableOpacity style={styles.dateCalendarBtn} onPress={openPicker} activeOpacity={0.7}>
          <Feather name="calendar" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker value={tempDate} mode="date" display="calendar" onChange={handleChange} />
      )}

      {Platform.OS !== 'android' && (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerBox}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                onChange={handleChange}
                themeVariant="dark"
                accentColor={colors.accent}
              />
              <View style={styles.datePickerActions}>
                <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowPicker(false)} activeOpacity={0.7}>
                  <Text style={styles.datePickerCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.datePickerConfirm} onPress={confirmIOS} activeOpacity={0.7}>
                  <Text style={styles.datePickerConfirmText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthName(monthIndex) {
  const months = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ];
  return months[monthIndex];
}

// Retorna os 7 últimos dias como array de { label, dayOfWeek, date, trained }
function buildLastSevenDays(trainedDates) {
  const result = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const labels = ['D','S','T','Q','Q','S','S'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toDateString();
    result.push({
      label: labels[d.getDay()],
      isToday: i === 0,
      trained: trainedDates.has(dateStr),
      dayNum: d.getDate(),
    });
  }
  return result;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ icon, emoji, value, label, sublabel, accentColor }) {
  const accent = accentColor || colors.accent;
  return (
    <View style={[styles.metricCard, { borderColor: `${accent}30` }]}>
      <LinearGradient
        colors={[`${accent}18`, 'transparent']}
        style={styles.metricGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.metricIconWrap, { backgroundColor: `${accent}22` }]}>
        {emoji ? (
          <Text style={{ fontSize: fs(18) }}>{emoji}</Text>
        ) : (
          <Feather name={icon} size={18} color={accent} />
        )}
      </View>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sublabel ? <Text style={styles.metricSublabel}>{sublabel}</Text> : null}
    </View>
  );
}

function ConsistencyBar({ day }) {
  return (
    <View style={styles.consistencyItem}>
      <View
        style={[
          styles.consistencyBar,
          {
            backgroundColor: day.trained
              ? colors.accent
              : day.isToday
              ? `${colors.accent}40`
              : colors.surface3,
            height: day.trained ? vs(44) : day.isToday ? vs(28) : vs(20),
            borderWidth: day.isToday && !day.trained ? 1 : 0,
            borderColor: colors.accent,
          },
        ]}
      />
      <Text
        style={[
          styles.consistencyDayLabel,
          day.trained && { color: colors.accent },
          day.isToday && !day.trained && { color: colors.accent },
        ]}
      >
        {day.label}
      </Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function StudentEvolutionScreen({ navigation }) {
  const { session } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  // Stats
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [monthWorkouts, setMonthWorkouts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [avgPerWeek, setAvgPerWeek] = useState(0);
  const [lastSevenDays, setLastSevenDays] = useState([]);
  const [monthCheckins, setMonthCheckins] = useState(new Set());
  const [totalMinutes, setTotalMinutes] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Métricas corporais (avaliações registradas pelo personal e/ou pelo aluno)
  const [evaluations, setEvaluations] = useState([]);
  const [personalId, setPersonalId] = useState(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [detailEval, setDetailEval] = useState(null);
  const [editingEvalId, setEditingEvalId] = useState(null);
  const [evalDateInput, setEvalDateInput] = useState(() => toISODate(new Date()));
  const [weightInput, setWeightInput] = useState('');
  const [bodyFatInput, setBodyFatInput] = useState('');
  const [measurementsInput, setMeasurementsInput] = useState({});
  const [savingWeight, setSavingWeight] = useState(false);

  // Metas do aluno
  const [goals, setGoals] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [goalDesc, setGoalDesc] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const loadMetrics = useCallback(async () => {
    const userId = session.user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('personal_id')
      .eq('id', userId)
      .single();
    setPersonalId(profile?.personal_id ?? null);

    const { data: evals } = await supabase
      .from('evaluations')
      .select('*')
      .eq('student_id', userId)
      .order('evaluation_date', { ascending: false });
    setEvaluations(evals || []);

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false });
    setGoals(goalsData || []);
  }, [session]);

  const loadData = useCallback(async () => {
    const userId = session.user.id;

    // Busca todos os treinos concluídos
    const { data: allDone } = await supabase
      .from('workout_logs')
      .select('started_at, finished_at')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .eq('skipped', false)
      .order('started_at', { ascending: false });

    const logs = allDone || [];
    setTotalWorkouts(logs.length);

    // Datas treinadas como Set de dateString
    const trainedDates = new Set(logs.map((l) => new Date(l.started_at).toDateString()));

    // Treinos do mês selecionado
    const { year, month } = selectedMonth;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    const monthLogs = logs.filter((l) => {
      const d = new Date(l.started_at);
      return d >= monthStart && d <= monthEnd;
    });
    setMonthWorkouts(monthLogs.length);

    // Dias check-in do mês (para calendário externo se necessário)
    const checkinDays = new Set(
      monthLogs.map((l) => new Date(l.started_at).getDate())
    );
    setMonthCheckins(checkinDays);

    // Streak atual
    let streakCount = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!trainedDates.has(cursor.toDateString())) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (trainedDates.has(cursor.toDateString())) {
      streakCount++;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStreak(streakCount);

    // Maior streak histórico
    let maxStreak = 0;
    let tempStreak = 0;
    const sortedDates = [...trainedDates]
      .map((d) => new Date(d))
      .sort((a, b) => a - b);
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
        tempStreak = diff === 1 ? tempStreak + 1 : 1;
      }
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    }
    setLongestStreak(maxStreak);

    // Média por semana (últimas 4 semanas)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentLogs = logs.filter((l) => new Date(l.started_at) >= fourWeeksAgo);
    setAvgPerWeek(Math.round((recentLogs.length / 4) * 10) / 10);

    // Últimos 7 dias
    setLastSevenDays(buildLastSevenDays(trainedDates));

    // Total de minutos treinados
    let minutes = 0;
    logs.forEach((l) => {
      if (l.finished_at && l.started_at) {
        const diff = (new Date(l.finished_at) - new Date(l.started_at)) / 60000;
        if (diff > 0 && diff < 300) minutes += diff; // ignora outliers
      }
    });
    setTotalMinutes(Math.round(minutes));
  }, [session, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadMetrics();
    }, [loadData, loadMetrics])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadMetrics()]);
    setRefreshing(false);
  };

  const resetWeightForm = () => {
    setEditingEvalId(null);
    setEvalDateInput(toISODate(new Date()));
    setWeightInput('');
    setBodyFatInput('');
    setMeasurementsInput({});
  };

  const openAddEval = () => {
    resetWeightForm();
    setShowWeightModal(true);
  };

  const openEditEval = (ev) => {
    setEditingEvalId(ev.id);
    setEvalDateInput(ev.evaluation_date || toISODate(new Date()));
    setWeightInput(ev.weight_kg != null ? String(ev.weight_kg) : '');
    setBodyFatInput(ev.body_fat_pct != null ? String(ev.body_fat_pct) : '');
    const measurementsAsStrings = {};
    Object.entries(ev.measurements || {}).forEach(([k, v]) => {
      measurementsAsStrings[k] = v != null ? String(v) : '';
    });
    setMeasurementsInput(measurementsAsStrings);
    setShowWeightModal(true);
  };

  const handleSaveWeight = async () => {
    if (!weightInput.trim() && !bodyFatInput.trim() && Object.keys(measurementsInput).length === 0) {
      Alert.alert('Preencha algo', 'Informe pelo menos o peso ou outra métrica.');
      return;
    }
    if (!personalId) {
      Alert.alert('Sem personal vinculado', 'Você precisa estar vinculado a um personal para registrar métricas.');
      return;
    }
    setSavingWeight(true);
    const payload = {
      evaluation_date: evalDateInput || toISODate(new Date()),
      weight_kg: weightInput ? parseFloat(weightInput.replace(',', '.')) : null,
      body_fat_pct: bodyFatInput ? parseFloat(bodyFatInput.replace(',', '.')) : null,
      measurements: measurementsInput,
    };

    const { error } = editingEvalId
      ? await supabase.from('evaluations').update(payload).eq('id', editingEvalId)
      : await supabase.from('evaluations').insert({
          ...payload,
          student_id: session.user.id,
          personal_id: personalId,
          source: 'aluno',
        });

    setSavingWeight(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    setShowWeightModal(false);
    resetWeightForm();
    loadMetrics();
  };

  const deleteEval = (ev) => {
    Alert.alert('Apagar registro', `Tem certeza que quer apagar a medição de ${formatDate(ev.evaluation_date)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('evaluations').delete().eq('id', ev.id);
          if (error) {
            Alert.alert('Erro', error.message);
            return;
          }
          loadMetrics();
        },
      },
    ]);
  };

  const resetGoalForm = () => {
    setEditingGoalId(null);
    setGoalDesc('');
    setGoalDate('');
  };

  const openAddGoal = () => {
    resetGoalForm();
    setShowGoalModal(true);
  };

  const openEditGoal = (g) => {
    setEditingGoalId(g.id);
    setGoalDesc(g.description || '');
    setGoalDate(g.target_date || '');
    setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    if (!goalDesc.trim()) return;
    if (!personalId) {
      Alert.alert('Sem personal vinculado', 'Você precisa estar vinculado a um personal para criar metas.');
      return;
    }
    setSavingGoal(true);
    const payload = {
      description: goalDesc.trim(),
      target_date: goalDate.trim() || null,
    };

    const { error } = editingGoalId
      ? await supabase.from('goals').update(payload).eq('id', editingGoalId)
      : await supabase.from('goals').insert({
          ...payload,
          student_id: session.user.id,
          personal_id: personalId,
          source: 'aluno',
        });

    setSavingGoal(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    setShowGoalModal(false);
    resetGoalForm();
    loadMetrics();
  };

  const deleteGoal = (g) => {
    Alert.alert('Apagar meta', `Tem certeza que quer apagar a meta "${g.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('goals').delete().eq('id', g.id);
          if (error) {
            Alert.alert('Erro', error.message);
            return;
          }
          loadMetrics();
        },
      },
    ]);
  };

  const toggleGoalAchieved = async (goal) => {
    const { error } = await supabase
      .from('goals')
      .update({ achieved: !goal.achieved, achieved_at: !goal.achieved ? new Date().toISOString() : null })
      .eq('id', goal.id);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    loadMetrics();
  };

  const latestEval = evaluations[0];
  const previousEval = evaluations[1];
  const weightDelta =
    latestEval?.weight_kg != null && previousEval?.weight_kg != null
      ? Math.round((latestEval.weight_kg - previousEval.weight_kg) * 10) / 10
      : null;

  const changeMonth = (delta) => {
    setSelectedMonth((prev) => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth < 0) { newMonth = 11; newYear--; }
      if (newMonth > 11) { newMonth = 0; newYear++; }
      return { year: newYear, month: newMonth };
    });
  };

  const today = new Date();
  const isCurrentMonth =
    selectedMonth.year === today.getFullYear() &&
    selectedMonth.month === today.getMonth();

  const daysInMonth = getDaysInMonth(selectedMonth.year, selectedMonth.month);
  const firstDayOfWeek = new Date(selectedMonth.year, selectedMonth.month, 1).getDay();
  const consistencyPct = daysInMonth > 0 ? Math.round((monthWorkouts / daysInMonth) * 100) : 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;

  // ─── Mini Calendar ─────────────────────────────────────────────────────────
  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Evolução</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* ── Streak Hero ── */}
        <LinearGradient
          colors={['rgba(47,230,160,0.22)', 'rgba(47,230,160,0.06)']}
          style={styles.streakHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.streakContent}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>
              {streak === 1 ? 'dia seguido' : 'dias seguidos'}
            </Text>
            <Text style={styles.streakSub}>
              Recorde: {longestStreak} {longestStreak === 1 ? 'dia' : 'dias'}
            </Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakRight}>
            <View style={styles.streakStat}>
              <Text style={styles.streakStatVal}>{totalWorkouts}</Text>
              <Text style={styles.streakStatLabel}>Treinos{'\n'}totais</Text>
            </View>
            <View style={styles.streakStat}>
              <Text style={styles.streakStatVal}>{avgPerWeek}</Text>
              <Text style={styles.streakStatLabel}>Média{'\n'}por semana</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Métricas rápidas ── */}
        <View style={styles.metricsRow}>
          <MetricCard
            emoji="📅"
            value={monthWorkouts}
            label="Treinos no mês"
            sublabel={`${consistencyPct}% de consistência`}
            accentColor={colors.blue}
          />
          <MetricCard
            emoji="⏱️"
            value={totalHours > 0 ? `${totalHours}h${totalMins > 0 ? ` ${totalMins}m` : ''}` : `${totalMinutes}m`}
            label="Tempo total"
            sublabel="de treino acumulado"
            accentColor={colors.amber}
          />
        </View>

        {/* ── Consistência 7 dias ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Últimos 7 dias</Text>
          <View style={styles.consistencyChart}>
            {lastSevenDays.map((day, i) => (
              <ConsistencyBar key={i} day={day} />
            ))}
          </View>
          <View style={styles.consistencyLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.legendText}>Treinou</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.surface3, borderWidth: 1, borderColor: colors.accent }]} />
              <Text style={styles.legendText}>Hoje</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.surface3 }]} />
              <Text style={styles.legendText}>Não treinou</Text>
            </View>
          </View>
        </View>

        {/* ── Calendário do mês (retrátil, começa fechado pra ganhar espaço) ── */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.calHeader}
            activeOpacity={0.7}
            onPress={() => setCalendarOpen((v) => !v)}
          >
            <Text style={styles.calMonthLabel}>
              {getMonthName(selectedMonth.month)} {selectedMonth.year}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(10) }}>
              <Text style={styles.calSummaryInline}>
                <Text style={{ color: colors.accent, fontWeight: '800' }}>{monthWorkouts}</Text> treinos · {consistencyPct}%
              </Text>
              <Feather name={calendarOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
            </View>
          </TouchableOpacity>

          {calendarOpen && (
            <>
              <View style={styles.calNav}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calArrowBtn} activeOpacity={0.7}>
                  <Feather name="chevron-left" size={16} color={colors.textDim} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => changeMonth(1)}
                  style={styles.calArrowBtn}
                  activeOpacity={0.7}
                  disabled={isCurrentMonth}
                >
                  <Feather name="chevron-right" size={16} color={isCurrentMonth ? colors.textFaint : colors.textDim} />
                </TouchableOpacity>
              </View>

              {/* Rótulos dos dias da semana */}
              <View style={styles.calWeekLabels}>
                {['D','S','T','Q','Q','S','S'].map((l, i) => (
                  <Text key={i} style={styles.calWeekLabel}>{l}</Text>
                ))}
              </View>

              {/* Grade de dias */}
              <View style={styles.calGrid}>
                {calendarDays.map((day, i) => {
                  if (day === null) return <View key={`empty-${i}`} style={styles.calCell} />;
                  const isToday =
                    isCurrentMonth && day === today.getDate();
                  const trained = monthCheckins.has(day);
                  return (
                    <View
                      key={day}
                      style={[
                        styles.calCell,
                        trained && styles.calCellTrained,
                        isToday && !trained && styles.calCellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDayText,
                          trained && styles.calDayTextTrained,
                          isToday && !trained && styles.calDayTextToday,
                        ]}
                      >
                        {day}
                      </Text>
                      {trained && <View style={styles.calDot} />}
                    </View>
                  );
                })}
              </View>

              {/* Resumo do mês */}
              <View style={styles.calSummary}>
                <View style={styles.calSummaryItem}>
                  <Text style={[styles.calSummaryVal, { color: colors.accent }]}>{monthWorkouts}</Text>
                  <Text style={styles.calSummaryLabel}>treinos</Text>
                </View>
                <View style={styles.calSummaryDivider} />
                <View style={styles.calSummaryItem}>
                  <Text style={[styles.calSummaryVal, { color: colors.blue }]}>{daysInMonth - monthWorkouts}</Text>
                  <Text style={styles.calSummaryLabel}>descanso</Text>
                </View>
                <View style={styles.calSummaryDivider} />
                <View style={styles.calSummaryItem}>
                  <Text style={[styles.calSummaryVal, { color: colors.amber }]}>{consistencyPct}%</Text>
                  <Text style={styles.calSummaryLabel}>consistência</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Métricas corporais ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Métricas corporais</Text>
            <TouchableOpacity onPress={openAddEval} activeOpacity={0.7}>
              <Feather name="plus-circle" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {latestEval ? (
            <View style={styles.latestMetricsRow}>
              <View style={styles.latestMetricBlock}>
                <Text style={styles.latestMetricValue}>
                  {latestEval.weight_kg != null ? `${latestEval.weight_kg} kg` : '-'}
                </Text>
                <Text style={styles.latestMetricLabel}>Peso atual</Text>
                {weightDelta != null && (
                  <Text
                    style={[
                      styles.latestMetricDelta,
                      { color: weightDelta <= 0 ? colors.accent : colors.amber },
                    ]}
                  >
                    {weightDelta > 0 ? '+' : ''}{weightDelta} kg
                  </Text>
                )}
              </View>
              <View style={styles.latestMetricDividerV} />
              <View style={styles.latestMetricBlock}>
                <Text style={styles.latestMetricValue}>
                  {latestEval.body_fat_pct != null ? `${latestEval.body_fat_pct}%` : '-'}
                </Text>
                <Text style={styles.latestMetricLabel}>% Gordura</Text>
              </View>
              <View style={styles.latestMetricDividerV} />
              <View style={styles.latestMetricBlock}>
                <Text style={styles.latestMetricValue}>{formatDate(latestEval.evaluation_date)}</Text>
                <Text style={styles.latestMetricLabel}>Última medição</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.empty}>Nenhuma métrica registrada ainda. Toque no + pra começar.</Text>
          )}

          {evaluations.length > 0 && (
            <View style={{ marginTop: vs(14), gap: vs(8) }}>
              {evaluations.slice(0, 5).map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.evalHistRow}
                  activeOpacity={0.75}
                  onPress={() => setDetailEval(ev)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.evalHistDate}>{formatDate(ev.evaluation_date)}</Text>
                    <Text style={styles.evalHistDetail}>
                      {[
                        ev.weight_kg != null ? `${ev.weight_kg} kg` : null,
                        ev.body_fat_pct != null ? `${ev.body_fat_pct}% gordura` : null,
                      ].filter(Boolean).join(' · ') || 'Medidas registradas'}
                    </Text>
                  </View>
                  <View style={[styles.sourceBadge, ev.source === 'aluno' ? styles.sourceBadgeSelf : styles.sourceBadgePersonal]}>
                    <Text style={styles.sourceBadgeText}>
                      {ev.source === 'aluno' ? 'Você' : 'Personal'}
                    </Text>
                  </View>
                  {ev.source === 'aluno' && (
                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        onPress={() => openEditEval(ev)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.rowActionBtn}
                      >
                        <Feather name="edit-2" size={14} color={colors.textDim} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteEval(ev)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.rowActionBtn}
                      >
                        <Feather name="trash-2" size={14} color={colors.textDim2} />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Metas ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Minhas metas</Text>
            <TouchableOpacity onPress={openAddGoal} activeOpacity={0.7}>
              <Feather name="plus-circle" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {goals.length === 0 && <Text style={styles.empty}>Nenhuma meta cadastrada ainda.</Text>}
          {goals.map((g) => (
            <View key={g.id} style={styles.goalRow}>
              <TouchableOpacity
                style={styles.goalMainTouch}
                activeOpacity={0.7}
                onPress={() => toggleGoalAchieved(g)}
              >
                <Feather
                  name={g.achieved ? 'check-circle' : 'circle'}
                  size={19}
                  color={g.achieved ? colors.accent : colors.textDim2}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalText, g.achieved && styles.goalTextDone]}>{g.description}</Text>
                  {g.target_date ? <Text style={styles.goalDate}>Até {formatDate(g.target_date)}</Text> : null}
                </View>
              </TouchableOpacity>
              <View style={[styles.sourceBadge, g.source === 'aluno' ? styles.sourceBadgeSelf : styles.sourceBadgePersonal]}>
                <Text style={styles.sourceBadgeText}>{g.source === 'aluno' ? 'Você' : 'Personal'}</Text>
              </View>
              {g.source === 'aluno' && (
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    onPress={() => openEditGoal(g)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.rowActionBtn}
                  >
                    <Feather name="edit-2" size={14} color={colors.textDim} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteGoal(g)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.rowActionBtn}
                  >
                    <Feather name="trash-2" size={14} color={colors.textDim2} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── Motivação ── */}
        <LinearGradient
          colors={['rgba(255,182,72,0.16)', 'rgba(255,182,72,0.06)']}
          style={styles.motivationCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.motivationEmoji}>
            {streak >= 7 ? '🏆' : streak >= 3 ? '⚡' : '💪'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.motivationTitle}>
              {streak >= 7
                ? 'Você está em chamas!'
                : streak >= 3
                ? 'Continue assim!'
                : 'Cada treino conta!'}
            </Text>
            <Text style={styles.motivationText}>
              {streak >= 7
                ? `${streak} dias seguidos. Consistência é a chave do sucesso.`
                : streak >= 3
                ? `${streak} dias seguidos. Você está construindo o hábito.`
                : 'Comece hoje e construa sua sequência de treinos.'}
            </Text>
          </View>
        </LinearGradient>

        <View style={{ height: vs(20) }} />
      </ScrollView>

      {/* Modal: registrar/editar peso e métricas */}
      <Modal visible={showWeightModal} transparent animationType="slide" onRequestClose={() => setShowWeightModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingEvalId ? 'Editar métricas' : 'Registrar métricas'}</Text>

            <DateField label="Data da medição" value={evalDateInput} onChange={setEvalDateInput} />

            <Text style={styles.fieldLabel}>Peso (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="Ex: 78,5"
              placeholderTextColor={colors.textDim2}
            />

            <Text style={styles.fieldLabel}>% Gordura corporal (opcional)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={bodyFatInput}
              onChangeText={setBodyFatInput}
              placeholder="Ex: 18,2"
              placeholderTextColor={colors.textDim2}
            />

            <Text style={[styles.fieldLabel, { marginTop: 6 }]}>Medidas em cm (opcional)</Text>
            {MEASURE_FIELDS.map((f) => (
              <View key={f.key} style={{ marginBottom: 8 }}>
                <Text style={styles.fieldLabelSmall}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={measurementsInput[f.key] || ''}
                  onChangeText={(v) => setMeasurementsInput((prev) => ({ ...prev, [f.key]: v }))}
                  placeholderTextColor={colors.textDim2}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveWeight} disabled={savingWeight}>
              <Text style={styles.saveButtonText}>{savingWeight ? 'Salvando...' : editingEvalId ? 'Salvar alterações' : 'Salvar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => { setShowWeightModal(false); resetWeightForm(); }}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: nova/editar meta */}
      <Modal visible={showGoalModal} transparent animationType="slide" onRequestClose={() => setShowGoalModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingGoalId ? 'Editar meta' : 'Nova meta'}</Text>
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              style={styles.input}
              value={goalDesc}
              onChangeText={setGoalDesc}
              placeholder="Ex: Perder 5kg, chegar a 15% de gordura..."
              placeholderTextColor={colors.textDim2}
              autoFocus
            />
            <DateField label="Data alvo (opcional)" value={goalDate} onChange={setGoalDate} />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveGoal} disabled={savingGoal}>
              <Text style={styles.saveButtonText}>{savingGoal ? 'Salvando...' : editingGoalId ? 'Salvar alterações' : 'Salvar meta'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => { setShowGoalModal(false); resetGoalForm(); }}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: detalhes da métrica */}
      <Modal visible={!!detailEval} transparent animationType="fade" onRequestClose={() => setDetailEval(null)}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailBox}>
            <View style={styles.detailHeaderRow}>
              <Text style={styles.modalTitle}>{formatDate(detailEval?.evaluation_date)}</Text>
              <TouchableOpacity onPress={() => setDetailEval(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={20} color={colors.textDim} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {detailEval?.weight_kg != null ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Peso</Text>
                  <Text style={styles.detailValue}>{detailEval.weight_kg} kg</Text>
                </View>
              ) : null}
              {detailEval?.body_fat_pct != null ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>% Gordura</Text>
                  <Text style={styles.detailValue}>{detailEval.body_fat_pct}%</Text>
                </View>
              ) : null}
              {MEASURE_FIELDS.map((f) =>
                detailEval?.measurements?.[f.key] ? (
                  <View key={f.key} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{f.label}</Text>
                    <Text style={styles.detailValue}>{detailEval.measurements[f.key]} cm</Text>
                  </View>
                ) : null
              )}
              {detailEval?.notes ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.detailLabel}>Observações</Text>
                  <Text style={styles.detailNotes}>{detailEval.notes}</Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Registrado por</Text>
                <Text style={styles.detailValue}>{detailEval?.source === 'aluno' ? 'Você' : 'Personal'}</Text>
              </View>
            </ScrollView>
            {detailEval?.source === 'aluno' && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  const ev = detailEval;
                  setDetailEval(null);
                  openEditEval(ev);
                }}
              >
                <Feather name="edit-2" size={14} color="#04170F" style={{ marginRight: 6 }} />
                <Text style={styles.saveButtonText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CAL_CELL = s(40);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: screenPaddingTop,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(18),
    paddingBottom: vs(14),
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: fs(16),
    fontWeight: '800',
  },

  scrollContent: {
    paddingHorizontal: s(18),
    paddingBottom: vs(40),
  },

  // Streak Hero
  streakHero: {
    borderRadius: 22,
    padding: s(20),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(47,230,160,0.25)',
    marginBottom: vs(14),
  },
  streakContent: {
    flex: 1,
    alignItems: 'center',
  },
  streakEmoji: { fontSize: fs(28), marginBottom: vs(4) },
  streakNumber: {
    color: colors.accent,
    fontSize: fs(40),
    fontWeight: '900',
    lineHeight: fs(44),
  },
  streakLabel: {
    color: colors.text,
    fontSize: fs(11),
    fontWeight: '700',
    marginTop: vs(2),
  },
  streakSub: {
    color: colors.textDim,
    fontSize: fs(9),
    marginTop: vs(4),
  },
  streakDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: s(16),
  },
  streakRight: { flex: 1, gap: vs(16) },
  streakStat: { alignItems: 'center' },
  streakStatVal: {
    color: colors.text,
    fontSize: fs(22),
    fontWeight: '800',
  },
  streakStatLabel: {
    color: colors.textDim,
    fontSize: fs(9),
    textAlign: 'center',
    marginTop: vs(2),
    lineHeight: fs(13),
  },

  // Métricas
  metricsRow: {
    flexDirection: 'row',
    gap: s(10),
    marginBottom: vs(14),
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    padding: s(16),
    overflow: 'hidden',
    gap: vs(6),
  },
  metricGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  metricIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: fs(22),
    fontWeight: '800',
  },
  metricLabel: {
    color: colors.text,
    fontSize: fs(11),
    fontWeight: '700',
  },
  metricSublabel: {
    color: colors.textDim,
    fontSize: fs(9),
  },

  // Section Card
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: s(18),
    marginBottom: vs(14),
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fs(13),
    fontWeight: '800',
    marginBottom: vs(16),
  },

  // Consistência 7 dias
  consistencyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: vs(60),
    marginBottom: vs(12),
  },
  consistencyItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: vs(6),
  },
  consistencyBar: {
    width: s(22),
    borderRadius: 8,
  },
  consistencyDayLabel: {
    color: colors.textDim2,
    fontSize: fs(9),
    fontWeight: '600',
  },
  consistencyLegend: {
    flexDirection: 'row',
    gap: s(16),
    marginTop: vs(4),
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textDim, fontSize: fs(9) },

  // Calendário
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: vs(14),
  },
  calArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonthLabel: {
    color: colors.text,
    fontSize: fs(13),
    fontWeight: '700',
  },
  calSummaryInline: {
    color: colors.textDim,
    fontSize: fs(10.5),
  },
  calNav: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: s(8),
    marginBottom: vs(10),
  },
  calWeekLabels: {
    flexDirection: 'row',
    marginBottom: vs(6),
  },
  calWeekLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: fs(9),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: vs(4),
  },
  calCellTrained: {
    backgroundColor: 'rgba(47,230,160,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(47,230,160,0.4)',
  },
  calCellToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  calDayText: {
    color: colors.textDim2,
    fontSize: fs(11),
    fontWeight: '600',
  },
  calDayTextTrained: {
    color: colors.accent,
    fontWeight: '800',
  },
  calDayTextToday: {
    color: colors.accent,
  },
  calDot: {
    position: 'absolute',
    bottom: vs(4),
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  calSummary: {
    flexDirection: 'row',
    marginTop: vs(16),
    paddingTop: vs(16),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  calSummaryItem: { flex: 1, alignItems: 'center' },
  calSummaryVal: { fontSize: fs(20), fontWeight: '800' },
  calSummaryLabel: { color: colors.textDim, fontSize: fs(9), marginTop: vs(2) },
  calSummaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },

  // Seções com header + ação (métricas / metas)
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(14),
  },
  empty: { color: colors.textDim, fontSize: fs(11) },

  // Métricas corporais
  latestMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  latestMetricBlock: { flex: 1, alignItems: 'center' },
  latestMetricValue: { color: colors.text, fontSize: fs(16), fontWeight: '800' },
  latestMetricLabel: { color: colors.textDim, fontSize: fs(9), marginTop: vs(3), textAlign: 'center' },
  latestMetricDelta: { fontSize: fs(9.5), fontWeight: '700', marginTop: vs(3) },
  latestMetricDividerV: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border, marginHorizontal: s(6) },

  evalHistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: vs(10),
    paddingHorizontal: s(12),
    gap: s(8),
  },
  evalHistDate: { color: colors.text, fontSize: fs(11), fontWeight: '700' },
  evalHistDetail: { color: colors.textDim, fontSize: fs(9.5), marginTop: vs(2) },

  sourceBadge: {
    borderRadius: 8,
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
  },
  sourceBadgeSelf: { backgroundColor: colors.accentGlow },
  sourceBadgePersonal: { backgroundColor: colors.blueGlow },
  sourceBadgeText: { color: colors.text, fontSize: fs(8.5), fontWeight: '700' },

  // Ações de editar/apagar (linhas de métricas e metas)
  rowActions: {
    flexDirection: 'row',
    gap: s(10),
    marginLeft: s(10),
  },
  rowActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface3,
  },

  // Metas
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: s(12),
    marginBottom: vs(8),
  },
  goalMainTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  goalText: { color: colors.text, fontSize: fs(12), fontWeight: '600' },
  goalTextDone: { textDecorationLine: 'line-through', color: colors.textDim },
  goalDate: { color: colors.textDim, fontSize: fs(9), marginTop: vs(2) },

  // Campo de data (manual + calendário)
  dateFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  dateFieldInput: { flex: 1, marginBottom: 0 },
  dateCalendarBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(4),
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(20),
  },
  datePickerBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: s(14),
    width: '100%',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: s(10),
    marginTop: vs(10),
  },
  datePickerCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: vs(12),
    borderRadius: 10,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePickerCancelText: { color: colors.textDim, fontSize: fs(12), fontWeight: '600' },
  datePickerConfirm: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: vs(12),
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  datePickerConfirmText: { color: '#04170F', fontSize: fs(12), fontWeight: '700' },

  // Modais (registrar métricas / meta)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { color: colors.text, fontSize: fs(14), fontWeight: '700', marginBottom: vs(14) },
  fieldLabel: { color: colors.textDim, fontSize: fs(10.5), marginBottom: vs(6), marginTop: vs(4), fontWeight: '600' },
  fieldLabelSmall: { color: colors.textDim2, fontSize: fs(9.5), marginBottom: vs(4) },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: s(12),
    paddingVertical: vs(10),
    color: colors.text,
    fontSize: fs(12),
    marginBottom: vs(4),
  },
  saveButton: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: vs(13), alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: vs(16) },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  detailBox: { backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 20 },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(14) },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: vs(8),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { color: colors.textDim, fontSize: fs(11) },
  detailValue: { color: colors.text, fontSize: fs(11), fontWeight: '700' },
  detailNotes: { color: colors.text, fontSize: fs(11), marginTop: vs(4), fontStyle: 'italic' },
  saveButtonText: { color: '#04170F', fontWeight: '700', fontSize: fs(12) },
  modalClose: { alignItems: 'center', paddingVertical: vs(12), marginTop: vs(4) },
  modalCloseText: { color: colors.textDim, fontSize: fs(11) },

  // Motivação
  motivationCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,182,72,0.25)',
    padding: s(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
  },
  motivationEmoji: { fontSize: fs(28) },
  motivationTitle: {
    color: colors.text,
    fontSize: fs(13),
    fontWeight: '800',
    marginBottom: vs(3),
  },
  motivationText: {
    color: colors.textDim,
    fontSize: fs(10),
    lineHeight: fs(15),
  },
});
