import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getAccessBlock } from '../lib/accessControl';
import { colors, radius } from '../theme/theme';
import { s, vs, fs } from '../utils/responsive';
import StudentOwnSubscriptionScreen from './StudentOwnSubscriptionScreen';
import PersonalFinancialScreen from './PersonalFinancialScreen';

const BlockedStack = createNativeStackNavigator();

async function copyText(text) {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Clipboard saiu do núcleo do React Native; o try/catch evita crash no nativo.
    const RN = require('react-native');
    if (RN.Clipboard?.setString) {
      RN.Clipboard.setString(text);
      return true;
    }
  } catch (e) {}
  return false;
}

// ─── Tela de parede (wall) ────────────────────────────────────────────────────
function BlockedWallScreen({ navigation }) {
  const { session, profile, accessBlock, signOut } = useAuth();
  const isPersonal = profile?.role === 'personal';
  const [payee, setPayee] = useState(null); // { name, pix_key } de quem recebe
  const [checking, setChecking] = useState(false);

  // Aluno paga o personal; personal paga a plataforma (conta admin).
  const load = useCallback(async () => {
    if (isPersonal) {
      const { data } = await supabase.rpc('get_platform_pix');
      setPayee(Array.isArray(data) ? data[0] : data);
      return;
    }
    if (profile?.personal_id) {
      const { data } = await supabase
        .from('profiles')
        .select('pix_key, name')
        .eq('id', profile.personal_id)
        .single();
      setPayee(data);
    }
  }, [isPersonal, profile?.personal_id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const copiarPix = async () => {
    if (!payee?.pix_key) return;
    const ok = await copyText(payee.pix_key);
    Alert.alert(ok ? 'Copiado!' : 'Chave Pix', ok ? 'Chave Pix copiada para a área de transferência.' : payee.pix_key);
  };

  // Puxa o profile de novo: se o pagamento já foi confirmado, o app libera na hora.
  const verificarNovamente = async () => {
    setChecking(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    setChecking(false);
    // O AuthContext também refaz a leitura sozinho a cada 30s; aqui só damos feedback.
    if (data) {
      if (getAccessBlock(data)) {
        Alert.alert('Ainda bloqueado', 'O pagamento ainda não foi confirmado.');
      }
    }
  };

  const fee = isPersonal ? profile?.subscription_price : profile?.monthly_fee;
  const confirmador = isPersonal ? 'o administrador' : 'seu personal';

  const reason = accessBlock?.reason === 'manual'
    ? (isPersonal ? 'Seu acesso foi suspenso pelo administrador.' : 'Seu acesso foi suspenso pelo seu personal.')
    : `A data de pagamento passou e o pagamento ainda não foi confirmado por ${confirmador}.`;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Feather name="lock" size={48} color={colors.red} />
      </View>

      <Text style={styles.heading}>Acesso suspenso</Text>
      <Text style={styles.reason}>{reason}</Text>

      {accessBlock?.reason === 'expired' && accessBlock.expiresAt && (
        <View style={styles.infoBox}>
          <Feather name="calendar" size={14} color={colors.textDim} />
          <Text style={styles.infoText}>
            Venceu em {accessBlock.expiresAt.toLocaleDateString('pt-BR')}
          </Text>
        </View>
      )}

      {!!fee && (
        <View style={styles.infoBox}>
          <Feather name="tag" size={14} color={colors.textDim} />
          <Text style={styles.infoText}>
            Mensalidade: R$ {Number(fee).toFixed(2)} / mês
          </Text>
        </View>
      )}

      {payee?.pix_key && (
        <View style={styles.pixCard}>
          <Text style={styles.pixLabel}>
            {isPersonal ? 'Chave Pix da plataforma' : 'Chave Pix do personal'}
          </Text>
          <TouchableOpacity style={styles.pixRow} onPress={copiarPix} activeOpacity={0.7}>
            <Text style={styles.pixKey} numberOfLines={1} selectable>{payee.pix_key}</Text>
            <View style={styles.pixCopyBtn}>
              <Feather name="copy" size={14} color={colors.accent} />
              <Text style={styles.pixCopyText}>Copiar</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.pixNote}>Após pagar, avise {confirmador} para confirmar.</Text>
        </View>
      )}

      <Text style={styles.orientacao}>
        Para recuperar o acesso, realize o pagamento e peça a {confirmador} que confirme no app.
        O acesso volta assim que a confirmação for feita.
      </Text>

      <TouchableOpacity
        style={styles.btnFaturas}
        onPress={verificarNovamente}
        activeOpacity={0.85}
        disabled={checking}
      >
        {checking
          ? <ActivityIndicator color="#04170F" />
          : <Feather name="refresh-cw" size={18} color="#04170F" />}
        <Text style={styles.btnFaturasText}>Já paguei — verificar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnSair}
        onPress={() => navigation.navigate(isPersonal ? 'FinanceiroBlocked' : 'FaturasBlocked')}
        activeOpacity={0.7}
      >
        <Feather name="credit-card" size={15} color={colors.textDim} />
        <Text style={styles.btnSairText}>{isPersonal ? 'Ver financeiro' : 'Ver faturas'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSair} onPress={signOut} activeOpacity={0.7}>
        <Feather name="log-out" size={15} color={colors.textDim} />
        <Text style={styles.btnSairText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Stack restrito: apenas wall + tela de faturas/financeiro ────────────────
export default function AccessBlockedScreen() {
  return (
    <BlockedStack.Navigator screenOptions={{ headerShown: false }}>
      <BlockedStack.Screen name="BlockedWall" component={BlockedWallScreen} />
      <BlockedStack.Screen name="FaturasBlocked" component={StudentOwnSubscriptionScreen} />
      <BlockedStack.Screen name="FinanceiroBlocked" component={PersonalFinancialScreen} />
    </BlockedStack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },

  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,90,122,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,90,122,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(24),
  },

  heading: {
    fontSize: fs(24),
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: vs(10),
  },
  reason: {
    fontSize: fs(12),
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: vs(20),
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: vs(10),
    paddingHorizontal: s(14),
    marginBottom: vs(8),
    alignSelf: 'stretch',
  },
  infoText: { color: colors.textDim, fontSize: fs(11) },

  pixCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginTop: vs(4),
    marginBottom: vs(4),
    alignSelf: 'stretch',
  },
  pixLabel: { color: colors.textDim, fontSize: fs(10), marginBottom: vs(8) },
  pixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm - 4,
    padding: 10,
    gap: 8,
  },
  pixKey: { color: colors.textDim, fontSize: fs(11), flex: 1 },
  pixCopyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pixCopyText: { color: colors.accent, fontSize: fs(10), fontWeight: '600' },
  pixNote: { color: colors.textFaint, fontSize: fs(9), marginTop: vs(8) },

  orientacao: {
    fontSize: fs(10),
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: vs(16),
    marginBottom: vs(28),
    paddingHorizontal: s(8),
  },

  btnFaturas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: vs(14),
    paddingHorizontal: s(32),
    alignSelf: 'stretch',
    marginBottom: vs(12),
  },
  btnFaturasText: {
    color: '#04170F',
    fontSize: fs(14),
    fontWeight: '800',
  },

  btnSair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: vs(10),
  },
  btnSairText: { color: colors.textDim, fontSize: fs(12) },
});
