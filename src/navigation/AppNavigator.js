import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { colors } from '../theme/theme';
import { s, vs, fs, isSmallDevice, isDesktopWeb, SIDEBAR_WIDTH } from '../utils/responsive';
import { stackScreenOptions, centerScreen, DesktopSidebar } from './desktop';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import CreateWorkoutScreen from '../screens/CreateWorkoutScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import BlockDaysScreen from '../screens/BlockDaysScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import UploadVideoScreen from '../screens/UploadVideoScreen';
import VideoPlayerScreen from '../screens/VideoPlayerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AccessBlockedScreen from '../screens/AccessBlockedScreen';
import ClientChatListScreen from '../screens/ClientChatListScreen';
import TalkToPersonalScreen from '../screens/TalkToPersonalScreen';
import ChatScreen from '../screens/ChatScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminPersonalsListScreen from '../screens/AdminPersonalsListScreen';
import AdminProfileScreen from '../screens/AdminProfileScreen';

// telas do Personal
import PersonalDashboardScreen from '../screens/PersonalDashboardScreen';
import PersonalStudentsListScreen from '../screens/PersonalStudentsListScreen';
import StudentDetailScreen from '../screens/StudentDetailScreen';
import StudentWorkoutsScreen from '../screens/StudentWorkoutsScreen';
import CreateWorkoutForStudentScreen from '../screens/CreateWorkoutForStudentScreen';
import CreateWorkoutGroupScreen from '../screens/CreateWorkoutGroupScreen';
import StudentWorkoutDetailScreen from '../screens/StudentWorkoutDetailScreen';
import StudentHistoryScreen from '../screens/StudentHistoryScreen';
import StudentWorkoutLogDetailScreen from '../screens/StudentWorkoutLogDetailScreen';
import StudentHealthScreen from '../screens/StudentHealthScreen';
import StudentRegistrationScreen from '../screens/StudentRegistrationScreen';
import StudentSubscriptionScreen from '../screens/StudentSubscriptionScreen';
import PersonalProfileScreen from '../screens/PersonalProfileScreen';
import PersonalChatListScreen from '../screens/PersonalChatListScreen';
import StudentEvaluationsScreen from '../screens/StudentEvaluationsScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import StudentChallengeScreen from '../screens/StudentChallengeScreen';
import FaqScreen from '../screens/FaqScreen';
import ParqScreen from '../screens/ParqScreen';
import StudentParqViewScreen from '../screens/StudentParqViewScreen';
import StudentOwnSubscriptionScreen from '../screens/StudentOwnSubscriptionScreen';

// <<<--- 1. IMPORTAÇÃO DA NOVA TELA ADICIONADA AQUI --->>>
import NotificationsScreen from '../screens/NotificationsScreen';

// <<<--- NOVA TELA: Dashboard de Evolução do Aluno --->>>
import StudentEvolutionScreen from '../screens/StudentEvolutionScreen';

// <<<--- NOVA TELA: Histórico de Feedbacks do aluno --->>>
import WorkoutFeedbackHistoryScreen from '../screens/WorkoutFeedbackHistoryScreen';

// <<<--- NOVA TELA: Resumo/Finalização do Treino --->>>
import WorkoutSummaryScreen from '../screens/WorkoutSummaryScreen';

const AuthStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const ClientChatStackNav = createNativeStackNavigator();
const PersonalStack = createNativeStackNavigator();
const PersonalChatStackNav = createNativeStackNavigator();
// <<<--- 2. NOVO STACK PARA O DASHBOARD DO PERSONAL --->>>
const PersonalHomeStackNav = createNativeStackNavigator(); 

const Tab = createBottomTabNavigator();
const PersonalTab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();

// No desktop, o navegador de abas usa o menu lateral próprio (com botão Sair)
const sidebarRenderer = isDesktopWeb ? (props) => <DesktopSidebar {...props} /> : undefined;

function useTabScreenOptions() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  // Altura base responsiva: menor em telas compactas, maior em telas grandes
  const tabBarBase = vs(isSmallDevice ? 52 : 58);

  // Desktop (navegador): barra de abas vira menu lateral à esquerda
  if (isDesktopWeb) {
    return { headerShown: false, tabBarPosition: 'left' };
  }

  return {
    headerShown: false,
    tabBarStyle: {
      backgroundColor: colors.surface3,
      borderTopColor: colors.border2,
      borderTopWidth: 1,
      height: tabBarBase + bottomInset + (Platform.OS === 'web' ? 14 : 0),
      paddingTop: Platform.OS === 'web' ? 4 : vs(isSmallDevice ? 6 : 8),
      paddingBottom: (bottomInset > 0 ? bottomInset : vs(isSmallDevice ? 5 : 7)) + (Platform.OS === 'web' ? 14 : 0),
    },
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.textDim,
    tabBarLabelStyle: { fontSize: fs(isSmallDevice ? 9.5 : 10.5), fontWeight: '600' },
    tabBarIconStyle: { marginBottom: vs(-2) },
  };
}

function resetToRootOnTabPress(rootScreenName) {
  return ({ navigation, route }) => ({
    tabPress: (e) => {
      // Impede o comportamento padrão de "lembrar" a última tela
      e.preventDefault();
      // Força a aba a abrir sempre na tela inicial (root) limpa
      navigation.navigate(route.name, { screen: rootScreenName });
    },
  });
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={stackScreenOptions}>
      <AuthStack.Screen name="Login" component={centerScreen(LoginScreen, "Login")} />
      <AuthStack.Screen name="Signup" component={centerScreen(SignupScreen, "Signup")} />
      <AuthStack.Screen name="ForgotPassword" component={centerScreen(ForgotPasswordScreen, "ForgotPassword")} />
    </AuthStack.Navigator>
  );
}

// ---------- Aluno (cliente) ----------

function HomeStack() {
  return (
    <RootStack.Navigator screenOptions={stackScreenOptions}>
      <RootStack.Screen name="HomeMain" component={centerScreen(HomeScreen, "HomeMain")} />
      <RootStack.Screen name="TalkToPersonal" component={centerScreen(TalkToPersonalScreen, "TalkToPersonal")} />
      <RootStack.Screen name="Chat" component={centerScreen(ChatScreen, "Chat")} />
      {/* <<<--- 3. TELA DE NOTIFICAÇÕES DO ALUNO --->>> */}
      <RootStack.Screen name="NotificationsScreen" component={centerScreen(NotificationsScreen, "NotificationsScreen")} />
      <RootStack.Screen name="StudentChallenge" component={centerScreen(StudentChallengeScreen, "StudentChallenge")} />
      <RootStack.Screen name="Faq" component={centerScreen(FaqScreen, "Faq")} />
      <RootStack.Screen name="Parq" component={centerScreen(ParqScreen, "Parq")} />
      <RootStack.Screen name="Faturas" component={centerScreen(StudentOwnSubscriptionScreen, "Faturas")} />
      {/* <<<--- NOVA TELA: Evolução/Dashboard do Aluno --->>> */}
      <RootStack.Screen name="StudentEvolution" component={centerScreen(StudentEvolutionScreen, "StudentEvolution")} />
      {/* <<<--- Histórico de Feedbacks acessível da Home --->>> */}
      <RootStack.Screen name="WorkoutFeedbackHistory" component={centerScreen(WorkoutFeedbackHistoryScreen, "WorkoutFeedbackHistory")} />
    </RootStack.Navigator>
  );
}

function WorkoutsStack() {
  return (
    <RootStack.Navigator screenOptions={stackScreenOptions}>
      <RootStack.Screen name="WorkoutsList" component={centerScreen(WorkoutsScreen, "WorkoutsList")} />
      <RootStack.Screen name="BlockDays" component={centerScreen(BlockDaysScreen, "BlockDays")} />
      <RootStack.Screen name="CreateWorkout" component={centerScreen(CreateWorkoutScreen, "CreateWorkout")} />
      <RootStack.Screen name="WorkoutDetail" component={centerScreen(WorkoutDetailScreen, "WorkoutDetail")} />
      <RootStack.Screen name="ActiveWorkout" component={centerScreen(ActiveWorkoutScreen, "ActiveWorkout")} />
      <RootStack.Screen name="WorkoutSummary" component={centerScreen(WorkoutSummaryScreen, "WorkoutSummary")} />
      <RootStack.Screen name="UploadVideo" component={centerScreen(UploadVideoScreen, "UploadVideo")} />
      <RootStack.Screen name="VideoPlayer" component={centerScreen(VideoPlayerScreen, "VideoPlayer")} />
      {/* <<<--- Histórico de Feedbacks do aluno --->>> */}
      <RootStack.Screen name="WorkoutFeedbackHistory" component={centerScreen(WorkoutFeedbackHistoryScreen, "WorkoutFeedbackHistory")} />
    </RootStack.Navigator>
  );
}

function ClientChatStack() {
  return (
    <ClientChatStackNav.Navigator screenOptions={stackScreenOptions}>
      <ClientChatStackNav.Screen name="ChatList" component={centerScreen(ClientChatListScreen, "ChatList")} />
      <ClientChatStackNav.Screen name="ChatConversation" component={centerScreen(ChatScreen, "ChatConversation")} />
    </ClientChatStackNav.Navigator>
  );
}

function MainTabs() {
  const tabOptions = useTabScreenOptions();
  return (
    <Tab.Navigator screenOptions={tabOptions} tabBar={sidebarRenderer}>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarLabel: 'Início', tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} /> }}
        listeners={resetToRootOnTabPress('HomeMain')}
      />
      <Tab.Screen
        name="Workouts"
        component={WorkoutsStack}
        options={{ tabBarLabel: 'Treinos', tabBarIcon: ({ color }) => <Feather name="award" size={22} color={color} /> }}
        listeners={resetToRootOnTabPress('WorkoutsList')}
      />
      <Tab.Screen
        name="ClientChat"
        component={ClientChatStack}
        options={{ tabBarLabel: 'Chat', tabBarIcon: ({ color }) => <Feather name="message-circle" size={22} color={color} /> }}
        listeners={resetToRootOnTabPress('ChatList')}
      />
      <Tab.Screen
        name="Profile"
        component={centerScreen(ProfileScreen, "Profile")}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

// ---------- Personal ----------

// <<<--- 4. STACK DO DASHBOARD DO PERSONAL --->>>
function PersonalHomeStack() {
  return (
    <PersonalHomeStackNav.Navigator screenOptions={stackScreenOptions}>
      <PersonalHomeStackNav.Screen name="PersonalDashboardMain" component={centerScreen(PersonalDashboardScreen, "PersonalDashboardMain")} />
      <PersonalHomeStackNav.Screen name="NotificationsScreen" component={centerScreen(NotificationsScreen, "NotificationsScreen")} />
      <PersonalHomeStackNav.Screen name="Challenges" component={centerScreen(ChallengesScreen, "Challenges")} />
      <PersonalHomeStackNav.Screen name="Faq" component={centerScreen(FaqScreen, "Faq")} />
    </PersonalHomeStackNav.Navigator>
  );
}

function PersonalStudentsStack() {
  return (
    <PersonalStack.Navigator screenOptions={stackScreenOptions}>
      <PersonalStack.Screen name="StudentsList" component={centerScreen(PersonalStudentsListScreen, "StudentsList")} />
      <PersonalStack.Screen name="StudentDetail" component={centerScreen(StudentDetailScreen, "StudentDetail")} />
      <PersonalStack.Screen name="StudentWorkouts" component={centerScreen(StudentWorkoutsScreen, "StudentWorkouts")} />
      <PersonalStack.Screen name="CreateWorkoutForStudent" component={centerScreen(CreateWorkoutForStudentScreen, "CreateWorkoutForStudent")} />
      <PersonalStack.Screen name="CreateWorkoutGroup" component={centerScreen(CreateWorkoutGroupScreen, "CreateWorkoutGroup")} />
      <PersonalStack.Screen name="StudentWorkoutDetail" component={centerScreen(StudentWorkoutDetailScreen, "StudentWorkoutDetail")} />
      <PersonalStack.Screen name="StudentHistory" component={centerScreen(StudentHistoryScreen, "StudentHistory")} />
      <PersonalStack.Screen name="StudentEvaluations" component={centerScreen(StudentEvaluationsScreen, "StudentEvaluations")} />
      <PersonalStack.Screen name="StudentParqView" component={centerScreen(StudentParqViewScreen, "StudentParqView")} />
      <PersonalStack.Screen name="StudentWorkoutLogDetail" component={centerScreen(StudentWorkoutLogDetailScreen, "StudentWorkoutLogDetail")} />
      <PersonalStack.Screen name="StudentChat" component={centerScreen(ChatScreen, "StudentChat")} />
      <PersonalStack.Screen name="StudentHealth" component={centerScreen(StudentHealthScreen, "StudentHealth")} />
      <PersonalStack.Screen name="StudentRegistration" component={centerScreen(StudentRegistrationScreen, "StudentRegistration")} />
      <PersonalStack.Screen name="StudentSubscription" component={centerScreen(StudentSubscriptionScreen, "StudentSubscription")} />
      <PersonalStack.Screen name="UploadVideo" component={centerScreen(UploadVideoScreen, "UploadVideo")} />
      <PersonalStack.Screen name="VideoPlayer" component={centerScreen(VideoPlayerScreen, "VideoPlayer")} />
    </PersonalStack.Navigator>
  );
}

function PersonalChatStack() {
  return (
    <PersonalChatStackNav.Navigator screenOptions={stackScreenOptions}>
      <PersonalChatStackNav.Screen name="ChatList" component={centerScreen(PersonalChatListScreen, "ChatList")} />
      <PersonalChatStackNav.Screen name="ChatConversation" component={centerScreen(ChatScreen, "ChatConversation")} />
    </PersonalChatStackNav.Navigator>
  );
}

function PersonalTabs() {
  const tabOptions = useTabScreenOptions();
  return (
    <PersonalTab.Navigator screenOptions={tabOptions} tabBar={sidebarRenderer}>
      <PersonalTab.Screen
        name="PersonalDashboard"
        component={PersonalHomeStack} // <<<--- 5. ALTERADO DE PersonalDashboardScreen PARA PersonalHomeStack --->>>
        options={{ tabBarLabel: 'Dashboard', tabBarIcon: ({ color }) => <Feather name="grid" size={22} color={color} /> }}
        listeners={resetToRootOnTabPress('PersonalDashboardMain')} // <<<--- 6. ADICIONADO LISTENER --->>>
      />
      <PersonalTab.Screen
        name="PersonalStudents"
        component={PersonalStudentsStack}
        options={{ tabBarLabel: 'Alunos', tabBarIcon: ({ color }) => <Feather name="users" size={22} color={color} /> }}
        listeners={resetToRootOnTabPress('StudentsList')}
      />
      <PersonalTab.Screen
        name="PersonalChat"
        component={PersonalChatStack}
        options={{ tabBarLabel: 'Chat', tabBarIcon: ({ color }) => <Feather name="message-circle" size={22} color={color} /> }}
        listeners={resetToRootOnTabPress('ChatList')}
      />
      <PersonalTab.Screen
        name="PersonalProfile"
        component={centerScreen(PersonalProfileScreen, "PersonalProfile")}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} /> }}
      />
    </PersonalTab.Navigator>
  );
}

// ---------- Admin ----------

function AdminTabs() {
  const tabOptions = useTabScreenOptions();
  return (
    <AdminTab.Navigator screenOptions={tabOptions} tabBar={sidebarRenderer}>
      <AdminTab.Screen
        name="AdminDashboard"
        component={centerScreen(AdminDashboardScreen, "AdminDashboard")}
        options={{ tabBarLabel: 'Dashboard', tabBarIcon: ({ color }) => <Feather name="grid" size={22} color={color} /> }}
      />
      <AdminTab.Screen
        name="AdminPersonals"
        component={centerScreen(AdminPersonalsListScreen, "AdminPersonals")}
        options={{ tabBarLabel: 'Personals', tabBarIcon: ({ color }) => <Feather name="briefcase" size={22} color={color} /> }}
      />
      <AdminTab.Screen
        name="AdminProfile"
        component={centerScreen(AdminProfileScreen, "AdminProfile")}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} /> }}
      />
    </AdminTab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={loadingStyles.container}>
      <ActivityIndicator color="#22C55E" size="large" />
    </View>
  );
}

function ProfileErrorScreen() {
  const { signOut, refreshProfile, profileMissing } = useAuth();
  return (
    <View style={loadingStyles.container}>
      <Text style={loadingStyles.text}>
        {profileMissing
          ? 'Sua conta foi criada, mas o cadastro não foi concluído corretamente. Saia e cadastre-se novamente, ou fale com o suporte.'
          : 'Não consegui carregar seu perfil. Verifique sua conexão e tente novamente.'}
      </Text>
      <TouchableOpacity style={loadingStyles.button} onPress={refreshProfile}>
        <Text style={loadingStyles.buttonText}>Tentar novamente</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={signOut} style={{ marginTop: 16 }}>
        <Text style={{ color: '#EF4444' }}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', padding: 32 },
  text: { color: '#9CA3AF', textAlign: 'center', marginBottom: 20, fontSize: 14, lineHeight: 20 },
  button: { backgroundColor: '#22C55E', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: '#111827', fontWeight: 'bold' },
});

// Fundo escuro por trás das telas (aparece nas laterais quando o conteúdo é centralizado)
const navTheme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.surface, border: colors.border2 } };

export default function AppNavigator() {
  const { session, profile, loading, isPasswordRecovery, accessBlock } = useAuth();

  let content;

  if (loading) {
    content = <LoadingScreen />;
  } else if (isPasswordRecovery) {
    content = <ResetPasswordScreen />;
  } else if (!session) {
    content = <AuthNavigator />;
  } else if (!profile) {
    content = <ProfileErrorScreen />;
  } else if (profile.status === 'pendente') {
    content = <PendingApprovalScreen />;
  } else if (accessBlock) {
    // Prazo de pagamento vencido (ou bloqueio manual) sem confirmação:
    // personal e aluno só enxergam a tela de bloqueio + faturas.
    content = <AccessBlockedScreen />;
  } else if (profile.role === 'admin') {
    content = <AdminTabs />;
  } else if (profile.role === 'personal') {
    content = <PersonalTabs />;
  } else {
    content = <MainTabs />;
  }

  return <NavigationContainer theme={navTheme}>{content}</NavigationContainer>;
}
