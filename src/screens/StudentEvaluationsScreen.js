import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { readFileBytes } from '../utils/fileBytes';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme/theme';
import { s, vs, ms, fs, isSmallDevice, screenPaddingH, screenPaddingTop } from '../utils/responsive';
import { fileExt } from '../utils/fileExt';

const IMAGE_MIME_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
function getImageContentType(uri) {
  const ext = fileExt(uri, 'jpg').toLowerCase();
  return IMAGE_MIME_TYPES[ext] || 'image/jpeg';
}

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

export default function StudentEvaluationsScreen({ route, navigation }) {
  const { studentId, studentName } = route.params;
  const { session } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [goals, setGoals] = useState([]);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [measurements, setMeasurements] = useState({});
  const [notes, setNotes] = useState('');
  const [editingEvalId, setEditingEvalId] = useState(null);
  const [detailEval, setDetailEval] = useState(null);

  const [goalDesc, setGoalDesc] = useState('');
  const [goalDate, setGoalDate] = useState('');

  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePair, setComparePair] = useState([]); // até 2 ids selecionados

  const load = useCallback(async () => {
    const { data: evals } = await supabase
      .from('evaluations')
      .select('*')
      .eq('student_id', studentId)
      .order('evaluation_date', { ascending: false });
    setEvaluations(evals || []);

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    setGoals(goalsData || []);

    const { data: photosData } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('student_id', studentId)
      .order('photo_date', { ascending: false });
    setPhotos(photosData || []);
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addProgressPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera pra tirar a foto de progresso.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, aspect: [3, 4] });
    if (result.canceled || !result.assets?.length) return;

    setUploadingPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const bytes = await readFileBytes(uri);
      const contentType = getImageContentType(uri);
      const ext = fileExt(uri, 'jpg');
      const path = `${studentId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(path, bytes, { contentType, upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('progress_photos').insert({
        student_id: studentId,
        personal_id: session.user.id,
        storage_path: path,
      });
      if (insertError) throw insertError;

      load();
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const deletePhoto = async (photo) => {
    Alert.alert('Apagar foto', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await supabase.storage.from('progress-photos').remove([photo.storage_path]);
          await supabase.from('progress_photos').delete().eq('id', photo.id);
          setComparePair((prev) => prev.filter((id) => id !== photo.id));
          load();
        },
      },
    ]);
  };

  const toggleCompare = (photo) => {
    setComparePair((prev) => {
      if (prev.includes(photo.id)) return prev.filter((id) => id !== photo.id);
      if (prev.length >= 2) return [prev[1], photo.id]; // mantém as 2 últimas escolhidas
      return [...prev, photo.id];
    });
  };

  const photoUrl = (path) => supabase.storage.from('progress-photos').getPublicUrl(path).data.publicUrl;

  const resetEvalForm = () => {
    setEditingEvalId(null);
    setWeight('');
    setBodyFat('');
    setMeasurements({});
    setNotes('');
  };

  const openAddEval = () => {
    resetEvalForm();
    setShowEvalModal(true);
  };

  const openEditEval = (ev) => {
    setEditingEvalId(ev.id);
    setWeight(ev.weight_kg != null ? String(ev.weight_kg) : '');
    setBodyFat(ev.body_fat_pct != null ? String(ev.body_fat_pct) : '');
    const measurementsAsStrings = {};
    Object.entries(ev.measurements || {}).forEach(([k, v]) => {
      measurementsAsStrings[k] = v != null ? String(v) : '';
    });
    setMeasurements(measurementsAsStrings);
    setNotes(ev.notes || '');
    setShowEvalModal(true);
  };

  const handleSaveEvaluation = async () => {
    setSaving(true);
    const payload = {
      weight_kg: weight ? parseFloat(weight.replace(',', '.')) : null,
      body_fat_pct: bodyFat ? parseFloat(bodyFat.replace(',', '.')) : null,
      measurements,
      notes: notes.trim() || null,
    };
    const { error } = editingEvalId
      ? await supabase.from('evaluations').update(payload).eq('id', editingEvalId)
      : await supabase.from('evaluations').insert({
          ...payload,
          student_id: studentId,
          personal_id: session.user.id,
        });
    setSaving(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    setShowEvalModal(false);
    resetEvalForm();
    load();
  };

  const handleSaveGoal = async () => {
    if (!goalDesc.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('goals').insert({
      student_id: studentId,
      personal_id: session.user.id,
      description: goalDesc.trim(),
      target_date: goalDate.trim() || null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    setShowGoalModal(false);
    setGoalDesc('');
    setGoalDate('');
    load();
  };

  const toggleAchieved = async (goal) => {
    const { error } = await supabase
      .from('goals')
      .update({ achieved: !goal.achieved, achieved_at: !goal.achieved ? new Date().toISOString() : null })
      .eq('id', goal.id);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    load();
  };

  const deleteGoal = (goal) => {
    Alert.alert(
      'Apagar meta',
      `Tem certeza que quer apagar a meta "${goal.description}"? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('goals').delete().eq('id', goal.id);
            if (error) {
              Alert.alert('Erro', error.message);
              return;
            }
            load();
          },
        },
      ]
    );
  };

  const deleteEvaluation = (evaluation) => {
    Alert.alert(
      'Apagar avaliação',
      `Tem certeza que quer apagar a avaliação de ${formatDate(evaluation.evaluation_date)}? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('evaluations').delete().eq('id', evaluation.id);
            if (error) {
              Alert.alert('Erro', error.message);
              return;
            }
            load();
          },
        },
      ]
    );
  };

  const first = evaluations[evaluations.length - 1];
  const last = evaluations[0];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Feather name="chevron-left" size={20} color={colors.text} />
        <Text style={styles.back}>{studentName || 'Aluno'}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Avaliações físicas</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {evaluations.length >= 2 && (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Progresso (primeira → última avaliação)</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Peso</Text>
              <Text style={styles.progressValue}>
                {first?.weight_kg ?? '-'} kg → {last?.weight_kg ?? '-'} kg
              </Text>
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>% Gordura</Text>
              <Text style={styles.progressValue}>
                {first?.body_fat_pct ?? '-'}% → {last?.body_fat_pct ?? '-'}%
              </Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fotos de progresso</Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <TouchableOpacity onPress={() => { setCompareMode((v) => !v); setComparePair([]); }}>
              <Feather name="columns" size={19} color={compareMode ? colors.accent : colors.textDim2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={addProgressPhoto} disabled={uploadingPhoto}>
              <Feather name="camera" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {compareMode && (
          <Text style={styles.compareHint}>Toque em 2 fotos pra comparar lado a lado (antes/depois).</Text>
        )}

        {compareMode && comparePair.length === 2 && (
          <View style={styles.compareRow}>
            {comparePair
              .map((id) => photos.find((p) => p.id === id))
              .sort((a, b) => new Date(a.photo_date) - new Date(b.photo_date))
              .map((p, i) => (
                <View key={p.id} style={styles.compareItem}>
                  <Image source={{ uri: photoUrl(p.storage_path) }} style={styles.comparePhoto} />
                  <Text style={styles.comparePhotoLabel}>{i === 0 ? 'Antes' : 'Depois'} · {formatDate(p.photo_date)}</Text>
                </View>
              ))}
          </View>
        )}

        {photos.length === 0 && <Text style={styles.empty}>Nenhuma foto de progresso enviada ainda.</Text>}
        <View style={styles.photoGrid}>
          {photos.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.photoGridItem}
              onPress={() => (compareMode ? toggleCompare(p) : deletePhoto(p))}
              activeOpacity={0.8}
            >
              <Image source={{ uri: photoUrl(p.storage_path) }} style={styles.photoGridImage} />
              {compareMode && comparePair.includes(p.id) && (
                <View style={styles.photoSelectedOverlay}>
                  <Feather name="check-circle" size={20} color={colors.accent} />
                </View>
              )}
              <Text style={styles.photoGridDate}>{formatDate(p.photo_date)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {!compareMode && photos.length > 0 && (
          <Text style={styles.compareHint}>Toque numa foto pra apagar. Use o ícone de colunas acima pra comparar.</Text>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Metas</Text>
          <TouchableOpacity onPress={() => setShowGoalModal(true)}>
            <Feather name="plus-circle" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
        {goals.length === 0 && <Text style={styles.empty}>Nenhuma meta cadastrada ainda.</Text>}
        {goals.map((g) => (
          <View key={g.id} style={styles.goalRow}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
              onPress={() => toggleAchieved(g)}
            >
              <Feather
                name={g.achieved ? 'check-circle' : 'circle'}
                size={20}
                color={g.achieved ? colors.accent : colors.textDim2}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.goalText, g.achieved && styles.goalTextDone]}>{g.description}</Text>
                {g.target_date ? <Text style={styles.goalDate}>Até {formatDate(g.target_date)}</Text> : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteGoal(g)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.goalDeleteBtn}
            >
              <Feather name="trash-2" size={16} color={colors.textDim2} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Histórico de avaliações</Text>
          <TouchableOpacity onPress={openAddEval}>
            <Feather name="plus-circle" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
        {evaluations.length === 0 && <Text style={styles.empty}>Nenhuma avaliação registrada ainda.</Text>}
        {evaluations.map((ev) => (
          <TouchableOpacity
            key={ev.id}
            style={styles.evalCard}
            activeOpacity={0.75}
            onPress={() => setDetailEval(ev)}
          >
            <View style={styles.evalHeaderRow}>
              <Text style={styles.evalDate}>{formatDate(ev.evaluation_date)}</Text>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  onPress={() => openEditEval(ev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.rowActionBtn}
                >
                  <Feather name="edit-2" size={14} color={colors.textDim} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteEvaluation(ev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.rowActionBtn}
                >
                  <Feather name="trash-2" size={15} color={colors.textDim2} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.evalGrid}>
              {ev.weight_kg ? <Text style={styles.evalItem}>Peso: {ev.weight_kg} kg</Text> : null}
              {ev.body_fat_pct ? <Text style={styles.evalItem}>Gordura: {ev.body_fat_pct}%</Text> : null}
              {MEASURE_FIELDS.map((f) =>
                ev.measurements?.[f.key] ? (
                  <Text key={f.key} style={styles.evalItem}>
                    {f.label.replace(' (cm)', '')}: {ev.measurements[f.key]} cm
                  </Text>
                ) : null
              )}
            </View>
            {ev.notes ? <Text style={styles.evalNotes}>{ev.notes}</Text> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal: nova avaliação */}
      <Modal visible={showEvalModal} transparent animationType="slide" onRequestClose={() => setShowEvalModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingEvalId ? 'Editar avaliação física' : 'Nova avaliação física'}</Text>

            <Text style={styles.fieldLabel}>Peso (kg)</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="Ex: 78,5" placeholderTextColor={colors.textDim2} />

            <Text style={styles.fieldLabel}>% Gordura corporal</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={bodyFat} onChangeText={setBodyFat} placeholder="Ex: 18,2" placeholderTextColor={colors.textDim2} />

            <Text style={[styles.fieldLabel, { marginTop: 6 }]}>Medidas (cm)</Text>
            {MEASURE_FIELDS.map((f) => (
              <View key={f.key} style={{ marginBottom: 8 }}>
                <Text style={styles.fieldLabelSmall}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={measurements[f.key] || ''}
                  onChangeText={(v) => setMeasurements((prev) => ({ ...prev, [f.key]: v }))}
                  placeholderTextColor={colors.textDim2}
                />
              </View>
            ))}

            <Text style={styles.fieldLabel}>Observações</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor={colors.textDim2}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEvaluation} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : editingEvalId ? 'Salvar alterações' : 'Salvar avaliação'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => { setShowEvalModal(false); resetEvalForm(); }}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: detalhes da avaliação */}
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
              {detailEval &&
                detailEval.weight_kg == null &&
                detailEval.body_fat_pct == null &&
                !MEASURE_FIELDS.some((f) => detailEval.measurements?.[f.key]) &&
                !detailEval.notes && <Text style={styles.empty}>Nenhum dado adicional registrado.</Text>}
            </ScrollView>
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
          </View>
        </View>
      </Modal>

      {/* Modal: nova meta */}
      <Modal visible={showGoalModal} transparent animationType="slide" onRequestClose={() => setShowGoalModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nova meta</Text>
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              style={styles.input}
              value={goalDesc}
              onChangeText={setGoalDesc}
              placeholder="Ex: Perder 5kg, chegar a 15% de gordura..."
              placeholderTextColor={colors.textDim2}
              autoFocus
            />
            <Text style={styles.fieldLabel}>Data alvo (opcional, AAAA-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={goalDate}
              onChangeText={setGoalDate}
              placeholder="2026-12-31"
              placeholderTextColor={colors.textDim2}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveGoal} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : 'Salvar meta'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowGoalModal(false)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: screenPaddingTop },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(10), marginLeft: -4 },
  back: { color: colors.text, fontSize: fs(13), marginLeft: 2 },
  title: { fontSize: fs(18), fontWeight: '800', color: colors.text, marginBottom: vs(16) },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: vs(20), marginBottom: vs(10) },
  sectionTitle: { color: colors.text, fontSize: fs(13), fontWeight: '700' },
  empty: { color: colors.textDim, fontSize: fs(11), marginBottom: vs(8) },
  progressCard: { backgroundColor: colors.accentGlow, borderRadius: radius.md, padding: 14 },
  progressTitle: { color: colors.accent, fontSize: fs(10.5), fontWeight: '700', marginBottom: vs(8) },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: vs(4) },
  progressLabel: { color: colors.textDim, fontSize: fs(11) },
  progressValue: { color: colors.text, fontSize: fs(11), fontWeight: '600' },
  compareHint: { color: colors.textDim2, fontSize: fs(9), marginBottom: vs(10), fontStyle: 'italic' },
  compareRow: { flexDirection: 'row', gap: 10, marginBottom: vs(14) },
  compareItem: { flex: 1 },
  comparePhoto: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.surface },
  comparePhotoLabel: { color: colors.textDim, fontSize: fs(9), textAlign: 'center', marginTop: vs(6) },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: vs(4) },
  photoGridItem: { width: '31%', position: 'relative' },
  photoGridImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.sm, backgroundColor: colors.surface },
  photoGridDate: { color: colors.textDim2, fontSize: fs(9), textAlign: 'center', marginTop: vs(3) },
  photoSelectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: vs(8),
  },
  goalText: { color: colors.text, fontSize: fs(12), fontWeight: '600' },
  goalTextDone: { textDecorationLine: 'line-through', color: colors.textDim },
  goalDate: { color: colors.textDim, fontSize: fs(9), marginTop: vs(2) },
  goalDeleteBtn: { paddingLeft: s(10) },
  evalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: vs(10),
  },
  evalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(8) },
  evalDate: { color: colors.accent, fontSize: fs(11), fontWeight: '700' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowActionBtn: {},
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  detailBox: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 20 },
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
  evalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  evalItem: { color: colors.text, fontSize: fs(10.5) },
  evalNotes: { color: colors.textDim, fontSize: fs(10), marginTop: vs(8), fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { color: colors.text, fontSize: fs(14), fontWeight: '700', marginBottom: vs(14) },
  fieldLabel: { color: colors.textDim, fontSize: fs(10.5), marginBottom: vs(6), marginTop: vs(4), fontWeight: '600' },
  fieldLabelSmall: { color: colors.textDim2, fontSize: fs(9.5), marginBottom: vs(4) },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: s(12),
    paddingVertical: vs(10),
    color: colors.text,
    fontSize: fs(12),
    marginBottom: vs(4),
  },
  saveButton: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: vs(13), alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: vs(16) },
  saveButtonText: { color: '#04170F', fontWeight: '700', fontSize: fs(12) },
  modalClose: { alignItems: 'center', paddingVertical: vs(12), marginTop: vs(4) },
  modalCloseText: { color: colors.textDim, fontSize: fs(11) },
});
