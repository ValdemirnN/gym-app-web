// Ajustes de layout para o navegador no computador:
//  - largura máxima do conteúdo por tela (centralizado)
//  - menu lateral próprio, com marca, usuário e botão "Sair"
import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { isDesktopWeb, SIDEBAR_WIDTH } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/theme';

const WIDE = 1240; // dashboards e listas
const MEDIUM = 860; // formulários e perfis
const NARROW = 460; // login / cadastro

const NARROW_SCREENS = ['Login', 'Signup', 'ForgotPassword'];
const MEDIUM_SCREENS = [
  'Profile', 'PersonalProfile', 'AdminProfile', 'CreateWorkout', 'CreateWorkoutForStudent', 'CreateWorkoutGroup',
  'UploadVideo', 'Parq', 'StudentRegistration', 'StudentHealth', 'StudentSubscription', 'Faturas', 'Faq',
  'TalkToPersonal', 'BlockDays', 'NotificationsScreen', 'StudentParqView', 'WorkoutDetail', 'ActiveWorkout',
  'WorkoutSummary', 'StudentWorkoutDetail', 'StudentWorkoutLogDetail', 'StudentEvaluations',
];

function maxWidthFor(name) {
  if (NARROW_SCREENS.includes(name)) return NARROW;
  if (MEDIUM_SCREENS.includes(name)) return MEDIUM;
  return WIDE;
}

/** screenOptions para qualquer Stack: sem cabeçalho. */
export const stackScreenOptions = { headerShown: false };

/**
 * No desktop, envolve cada tela num fundo de largura total (opaco, para cobrir a tela de trás)
 * e centraliza o conteúdo com largura máxima por tipo de tela.
 */
const wrapped = new WeakMap();
export function centerScreen(Component, name) {
  if (!isDesktopWeb) return Component;
  if (wrapped.has(Component)) return wrapped.get(Component);
  const maxWidth = maxWidthFor(name);
  const Wrapper = (props) => (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth }}>
        <Component {...props} />
      </View>
    </View>
  );
  Wrapper.displayName = `Centered(${name})`;
  wrapped.set(Component, Wrapper);
  return Wrapper;
}

const ROLE_LABEL = { admin: 'Administrador', personal: 'Personal', cliente: 'Aluno' };

export function DesktopSidebar({ state, descriptors, navigation }) {
  const { profile, signOut } = useAuth();

  const confirmSignOut = () => {
    Alert.alert('Sair da conta', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Feather name="activity" size={20} color={colors.accent} />
        </View>
        <Text style={styles.brandText}>Meu Treino</Text>
      </View>

      <View style={styles.nav}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? colors.accent : colors.textDim;
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.dispatch({ ...CommonActions.navigate(route), target: state.key });
            }
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              style={({ hovered }) => [styles.item, focused && styles.itemActive, hovered && !focused && styles.itemHover]}
            >
              {options.tabBarIcon ? options.tabBarIcon({ focused, color, size: 22 }) : null}
              <Text style={[styles.itemText, { color }]}>{typeof label === 'string' ? label : route.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.bottom}>
        {profile ? (
          <View style={styles.user}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>{(profile.name || '?').trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{profile.name || 'Usuário'}</Text>
              <Text style={styles.userRole}>{ROLE_LABEL[profile.role] || 'Aluno'}</Text>
            </View>
          </View>
        ) : null}
        <Pressable
          onPress={confirmSignOut}
          accessibilityRole="button"
          style={({ hovered }) => [styles.item, styles.logout, hovered && styles.logoutHover]}
        >
          <Feather name="log-out" size={20} color="#F87171" />
          <Text style={[styles.itemText, { color: '#F87171' }]}>Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border2,
    paddingHorizontal: 12,
    paddingTop: 22,
    paddingBottom: 16,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, marginBottom: 26 },
  logo: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: colors.accentGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  brandText: { color: colors.text, fontSize: 18, fontWeight: '800' },
  nav: { flex: 1, gap: 4 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
  },
  itemActive: { backgroundColor: 'rgba(0, 229, 160, 0.12)' },
  itemHover: { backgroundColor: 'rgba(255,255,255,0.05)' },
  itemText: { fontSize: 15, fontWeight: '600' },
  bottom: { borderTopWidth: 1, borderTopColor: colors.border2, paddingTop: 12, gap: 6 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingBottom: 6 },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface3,
    alignItems: 'center', justifyContent: 'center',
  },
  userInitial: { color: colors.text, fontWeight: '700', fontSize: 15 },
  userName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  userRole: { color: colors.textDim, fontSize: 12, marginTop: 1 },
  logout: {},
  logoutHover: { backgroundColor: 'rgba(248,113,113,0.10)' },
});
