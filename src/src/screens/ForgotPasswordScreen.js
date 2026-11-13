import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/theme';
import { s, vs, ms, fs, isSmallDevice, screenPaddingH, screenPaddingTop } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';

const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { resetPasswordForEmail, verifyRecoveryOtp } = useAuth();
  const timerRef = useRef(null);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  useEffect(() => {
    if (cooldown <= 0) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [cooldown > 0]);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Informe seu e-mail.');
      return;
    }
    setLoading(true);
    const { error } = await resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    setStep('code');
    startCooldown();
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    const { error } = await resetPasswordForEmail(email.trim());
    setResending(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    startCooldown();
    Alert.alert('Código reenviado', 'Confira seu e-mail novamente.');
  };

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Atenção', 'Digite o código recebido por e-mail.');
      return;
    }
    setLoading(true);
    const { error } = await verifyRecoveryOtp(email, code);
    setLoading(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    // Sucesso: o app troca automaticamente para a tela de nova senha.
  };

  if (step === 'code') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.logoChip}>
          <Feather name="mail" size={26} color={colors.accent} />
        </View>
        <Text style={styles.title}>Digite o código</Text>
        <Text style={styles.subtitle}>
          Enviamos um código de 6 dígitos para {email.trim()}. Digite abaixo para continuar.
        </Text>

        <View style={styles.inputWrap}>
          <Feather name="key" size={16} color={colors.textDim2} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="000000"
            placeholderTextColor={colors.textDim2}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.buttonText}>{loading ? 'Verificando...' : 'Confirmar código'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resending || cooldown > 0}>
          <Text style={[styles.link, cooldown > 0 && styles.linkDisabled]}>
            {resending
              ? 'Reenviando...'
              : cooldown > 0
              ? `Reenviar código em ${cooldown}s`
              : 'Não recebi o código, reenviar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setStep('email')}>
          <Text style={styles.linkMuted}>‹ Usar outro e-mail</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.logoChip}>
        <Feather name="lock" size={26} color={colors.accent} />
      </View>
      <Text style={styles.title}>Esqueceu a senha?</Text>
      <Text style={styles.subtitle}>Informe o e-mail da sua conta. Enviaremos um código para redefinir sua senha.</Text>

      <View style={styles.inputWrap}>
        <Feather name="mail" size={16} color={colors.textDim2} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={colors.textDim2}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading} activeOpacity={0.85}>
        <Text style={styles.buttonText}>{loading ? 'Enviando...' : 'Enviar código'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.linkMuted}>‹ Voltar para o login</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl },

  logoChip: {
    alignSelf: 'center',
    width: s(60),
    height: s(60),
    borderRadius: radius.lg,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(18),
  },
  title: { fontSize: fs(22), fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: vs(8) },
  subtitle: { fontSize: fs(12.5), color: colors.textDim, textAlign: 'center', marginBottom: vs(28), lineHeight: 19 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: s(14),
    marginBottom: vs(16),
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.text, paddingVertical: vs(14), fontSize: fs(13.5) },
  codeInput: { letterSpacing: 6, fontSize: fs(18), fontWeight: '700' },

  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: vs(16),
    alignItems: 'center',
    marginTop: vs(4),
    shadowColor: colors.accentDark,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  buttonText: { color: '#04170F', fontWeight: '700', fontSize: fs(14) },

  link: { color: colors.accent, textAlign: 'center', marginTop: vs(22), fontSize: fs(12), fontWeight: '600' },
  linkDisabled: { color: colors.textDim2 },
  linkMuted: { color: colors.textDim, textAlign: 'center', marginTop: vs(14), fontSize: fs(12), fontWeight: '600' },
});
