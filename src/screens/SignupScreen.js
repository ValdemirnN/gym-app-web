import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { s, vs, ms, fs, isSmallDevice, screenPaddingH, screenPaddingTop } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { isPasswordValid } from '../utils/passwordValidation';

const GENDER_OPTIONS = ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'];
const GOAL_OPTIONS = ['Emagrecimento', 'Hipertrofia', 'Condicionamento geral', 'TAF', 'Qualidade de vida'];
const ACTIVITY_LEVEL_OPTIONS = ['Sedentário', 'Levemente ativo', 'Moderado', 'Muito ativo'];
const CHRONIC_CONDITION_OPTIONS = ['Hipertensão', 'Diabetes', 'Asma', 'Cardiopatia', 'Outra'];
const STRESS_LEVEL_OPTIONS = [1, 2, 3, 4, 5];
const SPECIALTY_OPTIONS = [
  'Hipertrofia',
  'Emagrecimento',
  'Reabilitação',
  'Terceira idade',
  'Condicionamento físico',
  'Treinamento funcional',
];

function maskDateInput(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}
function brToIso(br) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((br || '').trim());
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}
function normalizeHeightToCm(value) {
  const parsed = parseFloat(String(value).replace(',', '.'));
  if (!parsed) return null;
  return parsed < 3 ? Math.round(parsed * 100) : Math.round(parsed);
}

function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SignupScreen({ navigation }) {
  const { signUp } = useAuth();

  // dados básicos (obrigatórios)
  const [role, setRole] = useState(null); // 'cliente' | 'personal'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  // ---- comuns (opcionais) ----
  const [birthDateBr, setBirthDateBr] = useState('');
  const [gender, setGender] = useState(null);

  // ---- cliente ----
  const [personals, setPersonals] = useState([]);
  const [loadingPersonals, setLoadingPersonals] = useState(false);
  const [selectedPersonalId, setSelectedPersonalId] = useState(null);
  const [phone, setPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [goal, setGoal] = useState(null);
  const [activityLevel, setActivityLevel] = useState(null);
  const [healthConditions, setHealthConditions] = useState('');
  const [healthRestrictions, setHealthRestrictions] = useState('');
  const [chronicConditions, setChronicConditions] = useState([]);
  const [otherChronicCondition, setOtherChronicCondition] = useState('');
  const [frequentPain, setFrequentPain] = useState('');
  const [medications, setMedications] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [stressLevel, setStressLevel] = useState(null);
  const [isSmoker, setIsSmoker] = useState(false);
  const [drinksAlcohol, setDrinksAlcohol] = useState(false);

  // ---- personal ----
  const [pixKey, setPixKey] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [crefNumber, setCrefNumber] = useState('');
  const [crefState, setCrefState] = useState('');
  const [specialties, setSpecialties] = useState([]);
  const [bio, setBio] = useState('');
  const [consultationPrice, setConsultationPrice] = useState('');
  const [availablePlans, setAvailablePlans] = useState('');
  const [attendsOnline, setAttendsOnline] = useState(false);
  const [attendsInPerson, setAttendsInPerson] = useState(false);
  const [inPersonLocation, setInPersonLocation] = useState('');
  const [availabilityHours, setAvailabilityHours] = useState('');

  useEffect(() => {
    if (role === 'cliente') {
      loadPersonals();
    }
  }, [role]);

  const loadPersonals = async () => {
    setLoadingPersonals(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'personal')
      .eq('status', 'aprovado')
      .order('name');
    if (!error) setPersonals(data || []);
    setLoadingPersonals(false);
  };

  const toggleChronicCondition = (option) => {
    setChronicConditions((prev) =>
      prev.includes(option) ? prev.filter((c) => c !== option) : [...prev, option]
    );
  };

  const toggleSpecialty = (option) => {
    setSpecialties((prev) =>
      prev.includes(option) ? prev.filter((c) => c !== option) : [...prev, option]
    );
  };

  const validate = () => {
    if (!name || !email || !password) {
      Alert.alert('Atenção', 'Preencha nome, e-mail e senha.');
      return false;
    }
    if (!isPasswordValid(password)) {
      Alert.alert(
        'Senha fraca',
        'A senha precisa ter no mínimo 7 caracteres, 1 letra maiúscula, 1 número e 1 caractere especial.'
      );
      return false;
    }
    if (role === 'cliente' && !selectedPersonalId) {
      Alert.alert('Atenção', 'Escolha o seu Personal.');
      return false;
    }
    if (birthDateBr && !brToIso(birthDateBr)) {
      Alert.alert('Atenção', 'Data de nascimento inválida. Use o formato DD/MM/AAAA.');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);

    const commonExtra = {
      name,
      role,
      birth_date: birthDateBr ? brToIso(birthDateBr) : null,
      gender: gender || null,
    };

    const clienteExtra =
      role === 'cliente'
        ? {
            personal_id: selectedPersonalId,
            phone: phone || null,
            emergency_contact_name: emergencyContactName || null,
            emergency_contact_phone: emergencyContactPhone || null,
            height_cm: height ? normalizeHeightToCm(height) : null,
            weight_kg: weight ? parseFloat(weight.replace(',', '.')) : null,
            body_fat_pct: bodyFatPct ? parseFloat(bodyFatPct.replace(',', '.')) : null,
            goal: goal || null,
            activity_level: activityLevel || null,
            health_conditions: healthConditions || null,
            health_restrictions: healthRestrictions || null,
            chronic_conditions: chronicConditions.length ? chronicConditions : null,
            other_chronic_condition: chronicConditions.includes('Outra') ? otherChronicCondition || null : null,
            frequent_pain: frequentPain || null,
            medications: medications || null,
            sleep_hours: sleepHours ? parseFloat(sleepHours.replace(',', '.')) : null,
            stress_level: stressLevel || null,
            is_smoker: isSmoker,
            drinks_alcohol: drinksAlcohol,
          }
        : {};

    const personalExtra =
      role === 'personal'
        ? {
            pix_key: pixKey || null,
            whatsapp: whatsapp || null,
            instagram_url: instagram || null,
            linkedin_url: linkedin || null,
            cref_number: crefNumber || null,
            cref_state: crefState ? crefState.toUpperCase() : null,
            specialties: specialties.length ? specialties : null,
            bio: bio || null,
            consultation_price: consultationPrice ? parseFloat(consultationPrice.replace(',', '.')) : null,
            available_plans: availablePlans || null,
            attends_online: attendsOnline,
            attends_in_person: attendsInPerson,
            in_person_location: attendsInPerson ? inPersonLocation || null : null,
            availability_hours: availabilityHours || null,
          }
        : {};

    const { error } = await signUp(email, password, { ...commonExtra, ...clienteExtra, ...personalExtra });
    setLoading(false);
    if (error) {
      Alert.alert('Erro ao cadastrar', error.message);
      return;
    }
    if (role === 'cliente') {
      Alert.alert(
        'Conta criada!',
        'Seu cadastro foi enviado. Você poderá treinar assim que seu Personal confirmar o pagamento.'
      );
    } else {
      Alert.alert(
        'Conta criada!',
        'Seu cadastro de Personal está pendente. Você poderá usar o app assim que o Admin aprovar.'
      );
    }
    navigation.navigate('Login');
  };

  // ---------- Etapa 1: escolher o papel ----------
  if (!role) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Você é...</Text>

        <TouchableOpacity style={styles.roleCard} onPress={() => setRole('cliente')}>
          <Text style={styles.roleEmoji}>🏋️</Text>
          <Text style={styles.roleTitle}>Aluno</Text>
          <Text style={styles.roleDesc}>Quero treinar com acompanhamento de um Personal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.roleCard} onPress={() => setRole('personal')}>
          <Text style={styles.roleEmoji}>💪</Text>
          <Text style={styles.roleTitle}>Personal Trainer</Text>
          <Text style={styles.roleDesc}>Quero gerenciar meus próprios alunos no app</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Já tem conta? Entrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------- Etapa 2: formulário ----------
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => setRole(null)}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{role === 'cliente' ? 'Cadastro de Aluno' : 'Cadastro de Personal'}</Text>

        <Text style={styles.sectionTitle}>Dados de acesso</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Senha (mín. 7 caracteres, 1 maiúscula, 1 número, 1 especial)"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.showPasswordText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
          </TouchableOpacity>
        </View>

        {role === 'cliente' && (
          <>
            <Text style={styles.sectionTitle}>Escolha seu Personal</Text>
            {loadingPersonals ? (
              <ActivityIndicator color="#22C55E" style={{ marginVertical: 12 }} />
            ) : personals.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhum Personal disponível ainda. Peça pro seu Personal se cadastrar primeiro.
              </Text>
            ) : (
              personals.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.personalOption, selectedPersonalId === p.id && styles.personalOptionSelected]}
                  onPress={() => setSelectedPersonalId(p.id)}
                >
                  <Text
                    style={[
                      styles.personalOptionText,
                      selectedPersonalId === p.id && styles.personalOptionTextSelected,
                    ]}
                  >
                    {p.name || 'Personal sem nome'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {role === 'personal' && (
          <>
            <Text style={styles.sectionTitle}>Dados para recebimento</Text>
            <Text style={styles.label}>Chave Pix (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              placeholderTextColor="#9CA3AF"
              value={pixKey}
              onChangeText={setPixKey}
            />
            <Text style={styles.label}>WhatsApp (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="(99) 99999-9999"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={whatsapp}
              onChangeText={setWhatsapp}
            />
          </>
        )}

        <TouchableOpacity style={styles.extraToggle} onPress={() => setShowExtra((v) => !v)}>
          <Text style={styles.extraToggleText}>
            {showExtra ? '‹ Ocultar dados adicionais (opcionais)' : 'Completar mais dados agora (opcionais) ›'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.emptyText}>
          Tudo abaixo é opcional — você pode preencher agora ou completar depois em "Editar perfil".
        </Text>

        {showExtra && (
          <>
            <Text style={styles.sectionTitle}>Dados pessoais</Text>

            <Text style={styles.label}>Data de nascimento (opcional)</Text>
            <TextInput
              style={styles.input}
              value={birthDateBr}
              onChangeText={(t) => setBirthDateBr(maskDateInput(t))}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={10}
            />

            <Text style={styles.label}>Gênero (opcional)</Text>
            <View style={styles.chipsRow}>
              {GENDER_OPTIONS.map((option) => (
                <Chip key={option} label={option} selected={gender === option} onPress={() => setGender(option)} />
              ))}
            </View>

            {role === 'cliente' && (
              <>
                <Text style={styles.sectionTitle}>Contato</Text>

                <Text style={styles.label}>Telefone (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="(99) 99999-9999"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.label}>Contato de emergência - nome (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                  placeholder="Nome de um familiar"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.label}>Contato de emergência - telefone (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={emergencyContactPhone}
                  onChangeText={setEmergencyContactPhone}
                  keyboardType="phone-pad"
                  placeholder="(99) 99999-9999"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.sectionTitle}>Biometria e objetivo</Text>

                <Text style={styles.label}>Altura em cm (opcional)</Text>
                <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="Ex: 179 ou 1,79" placeholderTextColor="#9CA3AF" />

                <Text style={styles.label}>Peso em kg (opcional)</Text>
                <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Ex: 94,5" placeholderTextColor="#9CA3AF" />

                <Text style={styles.label}>Percentual de gordura (opcional)</Text>
                <TextInput style={styles.input} value={bodyFatPct} onChangeText={setBodyFatPct} keyboardType="decimal-pad" placeholderTextColor="#9CA3AF" />

                <Text style={styles.label}>Objetivo principal (opcional)</Text>
                <View style={styles.chipsRow}>
                  {GOAL_OPTIONS.map((option) => (
                    <Chip key={option} label={option} selected={goal === option} onPress={() => setGoal(option)} />
                  ))}
                </View>

                <Text style={styles.label}>Nível de atividade (opcional)</Text>
                <View style={styles.chipsRow}>
                  {ACTIVITY_LEVEL_OPTIONS.map((option) => (
                    <Chip key={option} label={option} selected={activityLevel === option} onPress={() => setActivityLevel(option)} />
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Saúde (anamnese)</Text>
                <Text style={styles.emptyText}>
                  Essas informações ajudam seu Personal a montar um treino seguro pra você.
                </Text>

                <Text style={styles.label}>Condições de saúde (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: hipertensão, diabetes, cirurgias recentes..."
                  placeholderTextColor="#9CA3AF"
                  value={healthConditions}
                  onChangeText={setHealthConditions}
                  multiline
                />
                <Text style={styles.label}>Restrições / lesões (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: dor no joelho direito, hérnia de disco..."
                  placeholderTextColor="#9CA3AF"
                  value={healthRestrictions}
                  onChangeText={setHealthRestrictions}
                  multiline
                />

                <Text style={styles.label}>Doenças crônicas / condições (opcional)</Text>
                <View style={styles.chipsRow}>
                  {CHRONIC_CONDITION_OPTIONS.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      selected={chronicConditions.includes(option)}
                      onPress={() => toggleChronicCondition(option)}
                    />
                  ))}
                </View>
                {chronicConditions.includes('Outra') && (
                  <>
                    <Text style={styles.label}>Qual outra condição?</Text>
                    <TextInput
                      style={styles.input}
                      value={otherChronicCondition}
                      onChangeText={setOtherChronicCondition}
                      placeholderTextColor="#9CA3AF"
                    />
                  </>
                )}

                <Text style={styles.label}>Dores frequentes durante o esforço (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: lombar, cervical, articulações..."
                  placeholderTextColor="#9CA3AF"
                  value={frequentPain}
                  onChangeText={setFrequentPain}
                  multiline
                />

                <Text style={styles.label}>Uso contínuo de medicamentos (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: betabloqueador, insulina, antidepressivo..."
                  placeholderTextColor="#9CA3AF"
                  value={medications}
                  onChangeText={setMedications}
                  multiline
                />

                <Text style={styles.label}>Horas de sono por noite - média (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={sleepHours}
                  onChangeText={setSleepHours}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.label}>Nível de estresse — 1 baixo, 5 alto (opcional)</Text>
                <View style={styles.chipsRow}>
                  {STRESS_LEVEL_OPTIONS.map((option) => (
                    <Chip key={option} label={String(option)} selected={stressLevel === option} onPress={() => setStressLevel(option)} />
                  ))}
                </View>

                <View style={styles.chipsRow}>
                  <Chip label="Fumante" selected={isSmoker} onPress={() => setIsSmoker((v) => !v)} />
                  <Chip label="Consome álcool" selected={drinksAlcohol} onPress={() => setDrinksAlcohol((v) => !v)} />
                </View>
              </>
            )}

            {role === 'personal' && (
              <>
                <Text style={styles.sectionTitle}>Redes e contato</Text>
                <Text style={styles.label}>Instagram (opcional)</Text>
                <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} placeholder="@seu_usuario" placeholderTextColor="#9CA3AF" autoCapitalize="none" />
                <Text style={styles.label}>LinkedIn (opcional)</Text>
                <TextInput style={styles.input} value={linkedin} onChangeText={setLinkedin} placeholder="linkedin.com/in/..." placeholderTextColor="#9CA3AF" autoCapitalize="none" />

                <Text style={styles.sectionTitle}>Credenciais profissionais</Text>
                <Text style={styles.label}>Número do CREF (opcional)</Text>
                <TextInput style={styles.input} value={crefNumber} onChangeText={setCrefNumber} placeholderTextColor="#9CA3AF" />
                <Text style={styles.label}>Estado do CREF (opcional)</Text>
                <TextInput style={styles.input} value={crefState} onChangeText={setCrefState} placeholder="Ex: SP" placeholderTextColor="#9CA3AF" autoCapitalize="characters" maxLength={2} />

                <Text style={styles.label}>Especialidades (opcional)</Text>
                <View style={styles.chipsRow}>
                  {SPECIALTY_OPTIONS.map((option) => (
                    <Chip key={option} label={option} selected={specialties.includes(option)} onPress={() => toggleSpecialty(option)} />
                  ))}
                </View>

                <Text style={styles.label}>Bio (opcional)</Text>
                <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} multiline placeholderTextColor="#9CA3AF" placeholder="Fale um pouco sobre sua experiência" />

                <Text style={styles.sectionTitle}>Atendimento</Text>
                <Text style={styles.label}>Valor da consultoria - R$ (opcional)</Text>
                <TextInput style={styles.input} value={consultationPrice} onChangeText={setConsultationPrice} keyboardType="decimal-pad" placeholderTextColor="#9CA3AF" />
                <Text style={styles.label}>Planos disponíveis (opcional)</Text>
                <TextInput style={[styles.input, styles.textArea]} value={availablePlans} onChangeText={setAvailablePlans} multiline placeholderTextColor="#9CA3AF" />

                <View style={styles.chipsRow}>
                  <Chip label="Atende online" selected={attendsOnline} onPress={() => setAttendsOnline((v) => !v)} />
                  <Chip label="Atende presencial" selected={attendsInPerson} onPress={() => setAttendsInPerson((v) => !v)} />
                </View>

                {attendsInPerson && (
                  <>
                    <Text style={styles.label}>Endereço presencial (opcional)</Text>
                    <TextInput style={styles.input} value={inPersonLocation} onChangeText={setInPersonLocation} placeholderTextColor="#9CA3AF" />
                  </>
                )}

                <Text style={styles.label}>Horários de disponibilidade (opcional)</Text>
                <TextInput style={[styles.input, styles.textArea]} value={availabilityHours} onChangeText={setAvailabilityHours} multiline placeholderTextColor="#9CA3AF" />

                <Text style={styles.emptyText}>
                  Sua conta de Personal precisa ser aprovada pelo Admin antes de aparecer para os alunos.
                </Text>
              </>
            )}
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Criando...' : 'Cadastrar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Já tem conta? Entrar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', padding: 24, paddingTop: screenPaddingTop },
  title: { fontSize: fs(24), fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: vs(8) },
  subtitle: { fontSize: fs(13), color: '#9CA3AF', textAlign: 'center', marginBottom: vs(24) },
  back: { color: '#22C55E', fontSize: fs(13), marginBottom: vs(12) },
  sectionTitle: { color: '#fff', fontWeight: '600', fontSize: fs(13), marginTop: vs(20), marginBottom: vs(10) },
  label: { color: '#9CA3AF', marginBottom: vs(6), fontSize: fs(11) },
  emptyText: { color: '#9CA3AF', fontSize: fs(11), marginTop: vs(4), marginBottom: vs(8), lineHeight: 18 },
  input: {
    backgroundColor: '#1F2937',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: vs(12),
    fontSize: fs(14),
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },

  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingRight: 14,
    marginBottom: vs(12),
  },
  passwordInput: { flex: 1, color: '#fff', padding: 14, fontSize: fs(14) },
  showPasswordText: { color: '#22C55E', fontSize: fs(11), fontWeight: '600' },

  extraToggle: { marginTop: vs(18), alignItems: 'center' },
  extraToggleText: { color: '#22C55E', fontSize: fs(12), fontWeight: '600' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: vs(12) },
  chip: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  chipSelected: { borderColor: '#22C55E', backgroundColor: '#14532D' },
  chipText: { color: '#fff', fontSize: fs(11.5) },
  chipTextSelected: { color: '#22C55E', fontWeight: '600' },

  button: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: vs(16),
  },
  buttonText: { color: '#111827', fontWeight: 'bold', fontSize: fs(14) },
  link: { color: '#22C55E', textAlign: 'center', marginTop: vs(20), fontSize: fs(12) },

  roleCard: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 20,
    marginBottom: vs(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  roleEmoji: { fontSize: fs(30), marginBottom: vs(8) },
  roleTitle: { color: '#fff', fontSize: fs(16), fontWeight: 'bold', marginBottom: vs(4) },
  roleDesc: { color: '#9CA3AF', fontSize: fs(11), textAlign: 'center' },

  personalOption: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 14,
    marginBottom: vs(8),
    borderWidth: 1,
    borderColor: '#374151',
  },
  personalOptionSelected: { borderColor: '#22C55E', backgroundColor: '#14532D' },
  personalOptionText: { color: '#fff', fontSize: fs(13) },
  personalOptionTextSelected: { color: '#22C55E', fontWeight: '600' },
});
