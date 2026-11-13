import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme/theme';
import { s, vs, fs, screenPaddingTop } from '../utils/responsive';

const GOALS = ['Hipertrofia', 'Emagrecimento', 'Condicionamento', 'Força'];

function dateToIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function isoToDate(iso) {
  if (!iso) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function isoToDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Tela: criação do GRUPO de treinos ────────────────────────────────────────
// Vem antes do cadastro dos treinos em si (ver CreateWorkoutForStudentScreen).
// Aqui o personal define nome do grupo, objetivo/nível gerais e a validade —
// data até quando esse grupo vale. O grupo pode ser concluído a qualquer
// momento (mesmo antes da validade) ou apagado, na tela de listagem.
export default function CreateWorkoutGroupScreen({ route, navigation }) {
  const { studentId, studentName } = route.params;
  const { session } = useAuth();

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState(null);
  const [validUntil, setValidUntil] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Dê um nome ao grupo de treinos (ex: Hipertrofia - Bloco 1).');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('workout_groups')
      .insert({
        student_id: studentId,
        personal_id: session.user.id,
        name: name.trim(),
        goal: goal.trim() || null,
        level,
        valid_until: validUntil.trim() || null,
        status: 'ativo',
      })
      .select()
      .single();
    setSaving(false);

    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }

    navigation.replace('CreateWorkoutForStudent', {
      studentId,
      studentName,
      groupId: data.id,
      groupName: data.name,
      groupGoal: data.goal,
      groupLevel: data.level,
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Feather name="chevron-left" size={20} color={colors.text} />
        <Text style={styles.back}>Voltar</Text>
      </TouchableOpacity>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Novo grupo de treinos</Text>
        <Text style={styles.subtitle}>para {studentName}</Text>

        <View style={styles.blockCard}>
          <View style={styles.blockCardHeader}>
            <View style={styles.blockCardIcon}>
              <Feather name="layers" size={16} color="#fff" />
            </View>
            <Text style={styles.blockCardTitle}>Informações do grupo</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Nome do grupo (ex: Hipertrofia - Bloco 1)"
            placeholderTextColor={colors.textDim2}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.sectionLabel}>Objetivo (opcional):</Text>
          <View style={styles.dayRow}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.dayChip, goal === g && styles.dayChipSelected]}
                onPress={() => setGoal(goal === g ? '' : g)}
              >
                <Text style={[styles.dayChipText, goal === g && styles.dayChipTextSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Nível (opcional):</Text>
          <View style={styles.dayRow}>
            {[
              { key: 'iniciante', label: 'Iniciante', dots: '•' },
              { key: 'intermediario', label: 'Intermediário', dots: '••' },
              { key: 'avancado', label: 'Avançado', dots: '•••' },
            ].map((l) => (
              <TouchableOpacity
                key={l.key}
                style={[styles.dayChip, level === l.key && styles.dayChipSelected]}
                onPress={() => setLevel(level === l.key ? null : l.key)}
              >
                <Text style={[styles.dayChipText, level === l.key && styles.dayChipTextSelected]}>
                  {l.dots} {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Validade (opcional):</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => {
              setTempDate(isoToDate(validUntil));
              setShowDatePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.dateInputLabel}>Válido até</Text>
            <View style={styles.dateInputRow}>
              <Text style={[styles.dateInputValue, !validUntil && styles.dateInputPlaceholder]}>
                {isoToDisplay(validUntil) || 'dd/mm/aaaa'}
              </Text>
              <Feather name="calendar" size={15} color={colors.textDim2} />
            </View>
          </TouchableOpacity>
          {!!validUntil && (
            <TouchableOpacity onPress={() => setValidUntil('')} style={{ marginTop: 6 }}>
              <Text style={{ color: colors.textDim, fontSize: fs(11) }}>Remover data</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.hint}>
            Depois dessa data o grupo continua ativo até você concluí-lo — a validade é só uma referência
            pra saber quando é hora de evoluir o aluno pra um novo grupo. Você pode concluir a qualquer momento,
            mesmo antes da validade.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, saving && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={saving}
        >
          <Text style={styles.addButtonText}>{saving ? 'Criando...' : 'Criar grupo e continuar'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity style={styles.datePickerOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.datePickerCard}>
            <Text style={styles.datePickerCardTitle}>Validade do grupo</Text>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant="dark"
              locale="pt-BR"
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  if (event.type === 'dismissed') { setShowDatePicker(false); return; }
                  if (selectedDate) setValidUntil(dateToIso(selectedDate));
                  setShowDatePicker(false);
                  return;
                }
                if (selectedDate) setTempDate(selectedDate);
              }}
            />
            {Platform.OS === 'ios' && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  style={[styles.addButton, { flex: 1, backgroundColor: colors.surface2 }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={[styles.addButtonText, { color: colors.textDim }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButton, { flex: 1 }]}
                  onPress={() => { setValidUntil(dateToIso(tempDate)); setShowDatePicker(false); }}
                >
                  <Text style={styles.addButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: screenPaddingTop },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(10) },
  back: { color: colors.text, fontSize: fs(14), fontWeight: '600', marginLeft: 2 },
  title: { fontSize: fs(22), fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fs(13), color: colors.textDim, marginBottom: vs(18) },
  blockCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: s(16),
    marginBottom: vs(18),
  },
  blockCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: vs(14) },
  blockCardIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  blockCardTitle: { color: colors.text, fontSize: fs(14), fontWeight: '700' },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: s(12),
    color: colors.text,
    fontSize: fs(13),
    marginBottom: vs(14),
  },
  sectionLabel: { color: colors.textDim, fontSize: fs(11), fontWeight: '600', marginBottom: vs(8) },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8), marginBottom: vs(14) },
  dayChip: {
    paddingHorizontal: s(12), paddingVertical: vs(8),
    borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface2,
  },
  dayChipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayChipText: { color: colors.textDim, fontSize: fs(11), fontWeight: '600' },
  dayChipTextSelected: { color: '#08110A' },
  dateInput: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: s(12),
  },
  dateInputLabel: { color: colors.textDim2, fontSize: fs(9), fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateInputValue: { color: colors.text, fontSize: fs(13), fontWeight: '600' },
  dateInputPlaceholder: { color: colors.textDim2, fontWeight: '400' },
  hint: { color: colors.textDim2, fontSize: fs(11), lineHeight: 16, marginTop: vs(10) },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: vs(14),
    alignItems: 'center',
  },
  addButtonText: { color: '#08110A', fontSize: fs(14), fontWeight: '800' },
  datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  datePickerCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: s(16), width: '88%' },
  datePickerCardTitle: { color: colors.text, fontSize: fs(14), fontWeight: '700', marginBottom: vs(10) },
});
