import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
  TextInput, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../theme/theme';
import { s, vs, fs } from '../utils/responsive';

// ─── helpers ──────────────────────────────────────────────────
// Situação da mensalidade do personal (mesma regra do bloqueio do app).
export function paymentInfo(p) {
  if (!p.subscription_expires_at) {
    return { text: 'Sem vencimento definido', color: colors.textDim, late: false };
  }
  const d = new Date(p.subscription_expires_at);
  const label = d.toLocaleDateString('pt-BR');
  if (p.subscription_status === 'bloqueado') {
    return { text: 'Acesso bloqueado manualmente', color: colors.red, late: true };
  }
  if (d < new Date()) {
    return { text: `Vencido em ${label} — sem pagamento confirmado`, color: colors.red, late: true };
  }
  return { text: `Mensalidade em dia · vence em ${label}`, color: colors.accent, late: false };
}

const fmtBR = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

// 'DD/MM/AAAA' -> Date no fim do dia (o personal usa o app durante todo o dia do vencimento)
function parseBR(str) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((str || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 23, 59, 59);
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function SwitchRow({ label, value, onValueChange }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

// ─── modal ────────────────────────────────────────────────────
export default function AdminPersonalEditModal({ visible, personal, onClose, onChanged }) {
  const [f, setF] = useState({});
  const [venc, setVenc] = useState('');
  const [pending, setPending] = useState(null); // 'pagamento' | 'bloquear' | 'liberar'
  const [busy, setBusy] = useState(false);

  // Recarrega o formulário sempre que abrir ou quando o registro mudar no servidor.
  useEffect(() => {
    if (!personal) return;
    setF({
      name: personal.name || '',
      whatsapp: personal.whatsapp || '',
      pix_key: personal.pix_key || '',
      instagram_url: personal.instagram_url || '',
      linkedin_url: personal.linkedin_url || '',
      cref_number: personal.cref_number || '',
      cref_state: personal.cref_state || '',
      specialties: (personal.specialties || []).join(', '),
      bio: personal.bio || '',
      consultation_price: personal.consultation_price != null ? String(personal.consultation_price) : '',
      available_plans: personal.available_plans || '',
      availability_hours: personal.availability_hours || '',
      attends_online: !!personal.attends_online,
      attends_in_person: !!personal.attends_in_person,
      in_person_location: personal.in_person_location || '',
      subscription_plan: personal.subscription_plan || '',
      subscription_price: personal.subscription_price != null ? String(personal.subscription_price) : '',
    });
    setVenc(fmtBR(personal.subscription_expires_at));
    setPending(null);
  }, [personal?.id, personal?.subscription_expires_at, personal?.subscription_status, visible]);

  if (!personal) return null;

  const set = (key) => (value) => setF((prev) => ({ ...prev, [key]: value }));
  const info = paymentInfo(personal);
  const isBlocked = personal.subscription_status === 'bloqueado';

  const rpc = async (fn, params, okMsg) => {
    setBusy(true);
    const { error } = await supabase.rpc(fn, params);
    setBusy(false);
    setPending(null);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    Alert.alert('Pronto', okMsg);
    onChanged?.();
  };

  const confirmPending = () => {
    if (pending === 'pagamento') {
      rpc('admin_confirmar_pagamento_personal', { p_personal_id: personal.id, p_meses: 1 },
        'Pagamento confirmado. Acesso renovado por +1 mês.');
    } else if (pending === 'bloquear') {
      rpc('admin_definir_acesso_personal', { p_personal_id: personal.id, p_acao: 'bloquear' },
        'Acesso do personal bloqueado.');
    } else if (pending === 'liberar') {
      rpc('admin_definir_acesso_personal', { p_personal_id: personal.id, p_acao: 'liberar' },
        'Acesso do personal liberado.');
    }
  };

  const saveVencimento = () => {
    const d = parseBR(venc);
    if (!d) {
      Alert.alert('Data inválida', 'Use o formato DD/MM/AAAA.');
      return;
    }
    rpc('admin_definir_acesso_personal',
      { p_personal_id: personal.id, p_acao: 'definir_vencimento', p_vencimento: d.toISOString() },
      `Vencimento definido para ${d.toLocaleDateString('pt-BR')}.`);
  };

  const toNumber = (txt) => {
    const t = (txt || '').trim().replace(',', '.');
    if (!t) return null;
    const n = Number(t);
    return Number.isNaN(n) ? NaN : n;
  };

  const saveData = async () => {
    if (!f.name.trim()) {
      Alert.alert('Nome obrigatório', 'Informe o nome do personal.');
      return;
    }
    const price = toNumber(f.consultation_price);
    const subPrice = toNumber(f.subscription_price);
    if (Number.isNaN(price) || Number.isNaN(subPrice)) {
      Alert.alert('Valor inválido', 'Use apenas números nos campos de valor.');
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name: f.name.trim(),
        whatsapp: f.whatsapp.trim() || null,
        pix_key: f.pix_key.trim() || null,
        instagram_url: f.instagram_url.trim() || null,
        linkedin_url: f.linkedin_url.trim() || null,
        cref_number: f.cref_number.trim() || null,
        cref_state: f.cref_state.trim().toUpperCase() || null,
        specialties: f.specialties.split(',').map((x) => x.trim()).filter(Boolean),
        bio: f.bio.trim() || null,
        consultation_price: price,
        available_plans: f.available_plans.trim() || null,
        availability_hours: f.availability_hours.trim() || null,
        attends_online: f.attends_online,
        attends_in_person: f.attends_in_person,
        in_person_location: f.attends_in_person ? (f.in_person_location.trim() || null) : null,
        subscription_plan: f.subscription_plan.trim() || null,
        subscription_price: subPrice,
      })
      .eq('id', personal.id);
    setBusy(false);
    if (error) {
      Alert.alert('Erro ao salvar', error.message);
      return;
    }
    Alert.alert('Pronto', 'Dados do personal atualizados.');
    onChanged?.();
  };

  const pendingLabel = {
    pagamento: 'Confirmar pagamento e renovar por +1 mês?',
    bloquear: 'Bloquear o acesso deste personal agora?',
    liberar: 'Liberar o acesso deste personal?',
  }[pending];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{personal.name || 'Sem nome'}</Text>
              <Text style={styles.email}>{personal.email}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: vs(24) }}>
            {/* ── Acesso e assinatura ── */}
            <Text style={styles.section}>Acesso e assinatura</Text>
            <View style={[styles.statusBox, { borderColor: info.color + '66' }]}>
              <Feather name={info.late ? 'alert-circle' : 'check-circle'} size={14} color={info.color} />
              <Text style={[styles.statusText, { color: info.color }]}>{info.text}</Text>
            </View>

            <Text style={styles.label}>Vencimento da mensalidade</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={venc}
                onChangeText={setVenc}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.textFaint}
                keyboardType="numbers-and-punctuation"
              />
              <TouchableOpacity style={styles.btnGhost} onPress={saveVencimento} disabled={busy}>
                <Text style={styles.btnGhostText}>Salvar data</Text>
              </TouchableOpacity>
            </View>

            {pending ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>{pendingLabel}</Text>
                <View style={styles.row}>
                  <TouchableOpacity style={styles.btnGhost} onPress={() => setPending(null)} disabled={busy}>
                    <Text style={styles.btnGhostText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPrimary} onPress={confirmPending} disabled={busy}>
                    {busy ? <ActivityIndicator color="#04170F" /> : <Text style={styles.btnPrimaryText}>Confirmar</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.row}>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => setPending('pagamento')}>
                  <Feather name="dollar-sign" size={14} color="#04170F" />
                  <Text style={styles.btnPrimaryText}>Confirmar pagamento (+1 mês)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnGhost, { borderColor: (isBlocked ? colors.accent : colors.red) + '88' }]}
                  onPress={() => setPending(isBlocked ? 'liberar' : 'bloquear')}
                >
                  <Feather name={isBlocked ? 'unlock' : 'lock'} size={14} color={isBlocked ? colors.accent : colors.red} />
                  <Text style={[styles.btnGhostText, { color: isBlocked ? colors.accent : colors.red }]}>
                    {isBlocked ? 'Liberar acesso' : 'Bloquear acesso'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Plano" value={f.subscription_plan} onChangeText={set('subscription_plan')} placeholder="Ex: Plano mensal" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Valor do plano (R$)" value={f.subscription_price} onChangeText={set('subscription_price')} placeholder="0,00" keyboardType="decimal-pad" />
              </View>
            </View>

            {/* ── Dados cadastrais ── */}
            <Text style={styles.section}>Dados cadastrais</Text>
            <Text style={styles.hint}>
              O e-mail de login não é editado aqui (é a credencial da conta no Supabase Auth).
            </Text>
            <Field label="Nome" value={f.name} onChangeText={set('name')} />
            <Field label="WhatsApp" value={f.whatsapp} onChangeText={set('whatsapp')} keyboardType="phone-pad" />
            <Field label="Chave Pix" value={f.pix_key} onChangeText={set('pix_key')} autoCapitalize="none" />
            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Field label="CREF" value={f.cref_number} onChangeText={set('cref_number')} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="UF do CREF" value={f.cref_state} onChangeText={set('cref_state')} autoCapitalize="characters" />
              </View>
            </View>
            <Field label="Instagram" value={f.instagram_url} onChangeText={set('instagram_url')} autoCapitalize="none" />
            <Field label="LinkedIn" value={f.linkedin_url} onChangeText={set('linkedin_url')} autoCapitalize="none" />
            <Field label="Especialidades (separe por vírgula)" value={f.specialties} onChangeText={set('specialties')} />
            <Field label="Bio" value={f.bio} onChangeText={set('bio')} multiline />
            <Field label="Valor da consulta (R$)" value={f.consultation_price} onChangeText={set('consultation_price')} keyboardType="decimal-pad" />
            <Field label="Planos oferecidos" value={f.available_plans} onChangeText={set('available_plans')} multiline />
            <Field label="Horários de atendimento" value={f.availability_hours} onChangeText={set('availability_hours')} />
            <SwitchRow label="Atende online" value={f.attends_online} onValueChange={set('attends_online')} />
            <SwitchRow label="Atende presencialmente" value={f.attends_in_person} onValueChange={set('attends_in_person')} />
            {f.attends_in_person && (
              <Field label="Local do atendimento presencial" value={f.in_person_location} onChangeText={set('in_person_location')} />
            )}

            <TouchableOpacity style={[styles.btnPrimary, styles.saveBtn]} onPress={saveData} disabled={busy}>
              {busy ? <ActivityIndicator color="#04170F" /> : (
                <>
                  <Feather name="save" size={16} color="#04170F" />
                  <Text style={styles.btnPrimaryText}>Salvar dados do personal</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%', maxWidth: 760, maxHeight: '92%', backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 22,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(12) },
  name: { fontSize: fs(16), fontWeight: '800', color: colors.text },
  email: { fontSize: fs(11), color: colors.textDim, marginTop: 2 },
  closeBtn: { padding: 8 },

  section: {
    fontSize: fs(10), fontWeight: '700', color: colors.textDim, textTransform: 'uppercase',
    letterSpacing: 0.8, marginTop: vs(18), marginBottom: vs(10),
  },
  hint: { fontSize: fs(10), color: colors.textFaint, marginBottom: vs(8) },

  statusBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: s(12), paddingVertical: vs(9), marginBottom: vs(12), backgroundColor: colors.surface2,
  },
  statusText: { fontSize: fs(11), fontWeight: '700', flex: 1 },

  fieldWrap: { marginBottom: vs(10) },
  label: { fontSize: fs(10), color: colors.textDim, marginBottom: vs(5) },
  input: {
    backgroundColor: colors.bg, color: colors.text, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: fs(12),
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: vs(10) },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: vs(8), marginBottom: vs(4),
  },
  switchLabel: { color: colors.text, fontSize: fs(12) },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1,
    backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: vs(12), paddingHorizontal: 14,
  },
  btnPrimaryText: { color: '#04170F', fontWeight: '800', fontSize: fs(12) },
  btnGhost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingVertical: vs(12), paddingHorizontal: 14,
  },
  btnGhostText: { color: colors.textDim, fontWeight: '700', fontSize: fs(12) },
  confirmBox: {
    borderWidth: 1, borderColor: colors.amber, backgroundColor: colors.amberGlow,
    borderRadius: radius.sm, padding: 12, marginBottom: vs(10),
  },
  confirmText: { color: colors.amber, fontSize: fs(11), fontWeight: '700', marginBottom: vs(10) },
  saveBtn: { flex: 0, marginTop: vs(14) },
});
