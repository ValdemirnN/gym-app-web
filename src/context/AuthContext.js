import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { getAccessBlock } from '../lib/accessControl';

const AuthContext = createContext({});

// Precisa bater com o "scheme" configurado no app.json e com a URL de
// redirecionamento cadastrada em Supabase -> Authentication -> URL Configuration -> Redirect URLs.
export const PASSWORD_RESET_REDIRECT_URL = 'meutreino://reset-password';

const ERROR_MESSAGES = {
  'User already registered': 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.',
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'E-mail ainda não confirmado. Tente novamente em instantes.',
};

function translateAuthError(message) {
  return ERROR_MESSAGES[message] || message;
}

// Extrai os parâmetros de um deep link do tipo
// meutreino://reset-password#access_token=...&refresh_token=...&type=recovery
// ou meutreino://reset-password?code=...&type=recovery (fluxo PKCE)
function extractUrlParams(url) {
  if (!url) return {};
  const raw = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
  if (!raw) return {};
  const params = {};
  raw.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });
  return params;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  // true quando o usuário chegou no app através do link de "Esqueci minha senha"
  // e ainda precisa cadastrar uma nova senha antes de usar o resto do app.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const handlingRecoveryLink = useRef(false);

  // ── Bloqueio por pagamento ──────────────────────────────────────────────
  // nowTick força a reavaliação da data de vencimento enquanto o app está
  // aberto (o bloqueio entra no minuto em que o prazo vence, sem precisar
  // sair e entrar de novo).
  const sessionRef = useRef(null);
  sessionRef.current = session;
  const [nowTick, setNowTick] = useState(() => Date.now());
  // Diferença entre a hora do servidor e a do aparelho. Evita escapar do bloqueio
  // atrasando a data do celular (e bloquear cedo demais se o relógio estiver adiantado).
  const [clockSkew, setClockSkew] = useState(0);
  const accessBlock = useMemo(
    () => getAccessBlock(profile, new Date(nowTick + clockSkew)),
    [profile, nowTick, clockSkew]
  );
  const syncClock = async () => {
    const { data, error } = await supabase.rpc('get_my_access_status');
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row?.server_now) setClockSkew(new Date(row.server_now).getTime() - Date.now());
  };
  const blockedRef = useRef(false);
  blockedRef.current = !!accessBlock;

  const loadProfile = async (userId, authUser) => {
    if (!userId) {
      setProfile(null);
      setProfileMissing(false);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) {
      // JWT issued at future: relógio do dispositivo adiantado em relação ao servidor.
      // Tenta um refresh do token antes de desistir; se funcionar, recarrega o profile.
      if (
        error.message?.includes('JWT') ||
        error.message?.includes('invalid_jwt') ||
        error.message?.includes('issued at future') ||
        error.code === 'PGRST301'
      ) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshed?.session) {
          // Token renovado — tenta buscar o profile novamente com a nova sessão
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          if (!retryError && retryData) {
            setProfile(retryData);
            setProfileMissing(false);
            return;
          }
        }
        // Se o refresh também falhou, força logout para que o usuário faça login novamente
        console.warn('Sessão JWT inválida (relógio fora de sincronia?). Fazendo logout.');
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setProfileMissing(false);
        return;
      }
      console.error('Erro ao carregar profile:', error.message);
      setProfile(null);
      setProfileMissing(false);
      return;
    }

    if (data) {
      setProfile(data);
      setProfileMissing(false);
      return;
    }

    // Conta existe em auth.users mas não tem registro em profiles (conta órfã de
    // um cadastro anterior que falhou no meio do caminho). Tenta recriar agora
    // usando os metadados salvos no signUp, em vez de deixar o usuário travado.
    const meta = authUser?.user_metadata || {};
    const { data: created, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: meta.name || null,
        email: authUser?.email || null,
        role: meta.role || 'cliente',
        personal_id: meta.personal_id || null,
        health_conditions: meta.health_conditions || null,
        health_restrictions: meta.health_restrictions || null,
        pix_key: meta.pix_key || null,
        whatsapp: meta.whatsapp || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Erro ao recriar profile órfão:', createError.message);
      setProfile(null);
      setProfileMissing(true);
      return;
    }

    setProfile(created);
    setProfileMissing(false);
  };

  const refreshProfile = async () => {
    if (session?.user?.id) await loadProfile(session.user.id, session.user);
  };

  // Processa o link recebido por e-mail para redefinição de senha.
  const handleAuthDeepLink = async (url) => {
    const params = extractUrlParams(url);
    if (params.type !== 'recovery') return;

    handlingRecoveryLink.current = true;
    try {
      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) throw error;
      } else if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (error) throw error;
      } else {
        return;
      }
      setIsPasswordRecovery(true);
    } catch (e) {
      console.error('Erro ao processar link de redefinição de senha:', e.message);
    } finally {
      handlingRecoveryLink.current = false;
    }
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Se JWT está inválido (issued at future, etc), faz logout e limpa
        if (error) {
          console.warn('Erro ao restaurar sessão:', error.message);
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        await loadProfile(session?.user?.id, session?.user);
      } catch (err) {
        console.error('Erro crítico ao restaurar sessão:', err);
        setSession(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Enquanto estamos processando o deep link de recuperação, o próprio
      // setSession() já dispara esse evento — ignora pra não sobrescrever o estado.
      if (handlingRecoveryLink.current) return;
      setSession(session);
      await loadProfile(session?.user?.id, session?.user);
    });

    // App aberto a partir de um link (app fechado / em background)
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthDeepLink(url);
    });
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => handleAuthDeepLink(url));

    return () => {
      listener.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  // Reavaliação periódica + ao voltar pro app. Enquanto bloqueado, busca o
  // profile de novo a cada 30s para liberar sozinho quando o admin/personal
  // confirmar o pagamento. Atualização "silenciosa": se a rede falhar, mantém
  // o profile atual em vez de derrubar o usuário na tela de erro.
  useEffect(() => {
    const quietRefresh = async () => {
      const user = sessionRef.current?.user;
      if (!user?.id) return;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!error && data) setProfile(data);
      syncClock();
    };
    const interval = setInterval(() => {
      setNowTick(Date.now());
      if (blockedRef.current) quietRefresh();
    }, 30000);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNowTick(Date.now());
        quietRefresh();
      }
    });
    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []);

  // Sincroniza o relógio com o servidor ao entrar na conta.
  useEffect(() => {
    if (session?.user?.id) syncClock();
  }, [session?.user?.id]);

  // extra = { name, role, personal_id, health_conditions, health_restrictions, pix_key, whatsapp, ...demais campos opcionais de perfil }
  // O profile é criado automaticamente por um trigger no banco (ver supabase/schema_v3.sql
  // e supabase/schema_v32_signup_extra_fields.sql), por isso mandamos os dados extras em
  // options.data em vez de inserir manualmente aqui. Isso evita depender de sessão ativa
  // logo após o signUp (ex: quando "confirmar e-mail" está ligado).
  const signUp = async (email, password, extra) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: extra.name,
          role: extra.role,
          personal_id: extra.personal_id || null,
          health_conditions: extra.health_conditions || null,
          health_restrictions: extra.health_restrictions || null,

          // aluno
          birth_date: extra.birth_date || null,
          gender: extra.gender || null,
          phone: extra.phone || null,
          emergency_contact_name: extra.emergency_contact_name || null,
          emergency_contact_phone: extra.emergency_contact_phone || null,
          height_cm: extra.height_cm ?? null,
          weight_kg: extra.weight_kg ?? null,
          body_fat_pct: extra.body_fat_pct ?? null,
          goal: extra.goal || null,
          activity_level: extra.activity_level || null,
          chronic_conditions: extra.chronic_conditions || null,
          other_chronic_condition: extra.other_chronic_condition || null,
          frequent_pain: extra.frequent_pain || null,
          medications: extra.medications || null,
          sleep_hours: extra.sleep_hours ?? null,
          stress_level: extra.stress_level ?? null,
          is_smoker: !!extra.is_smoker,
          drinks_alcohol: !!extra.drinks_alcohol,

          // personal
          pix_key: extra.pix_key || null,
          whatsapp: extra.whatsapp || null,
          instagram_url: extra.instagram_url || null,
          linkedin_url: extra.linkedin_url || null,
          cref_number: extra.cref_number || null,
          cref_state: extra.cref_state || null,
          specialties: extra.specialties || null,
          bio: extra.bio || null,
          consultation_price: extra.consultation_price ?? null,
          available_plans: extra.available_plans || null,
          attends_online: !!extra.attends_online,
          attends_in_person: !!extra.attends_in_person,
          in_person_location: extra.in_person_location || null,
          availability_hours: extra.availability_hours || null,
        },
      },
    });
    if (error) return { error: { message: translateAuthError(error.message) } };

    // Supabase, por segurança, não avisa quando o e-mail já existe — ele retorna
    // "sucesso" mas sem criar nada de verdade (pra não revelar e-mails cadastrados).
    // Detectamos isso checando se voltou um usuário sem nenhuma "identity" nova.
    const identities = data?.user?.identities;
    if (data?.user && identities && identities.length === 0) {
      return { error: { message: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.' } };
    }

    return { data };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { data, error: { message: translateAuthError(error.message) } };
    return { data, error };
  };

  const signOut = async () => {
    setIsPasswordRecovery(false);
    await supabase.auth.signOut();
  };

  // Dispara o e-mail de "esqueci minha senha". Sempre retorna sucesso (mesma
  // mensagem seja o e-mail cadastrado ou não) pra não revelar quem tem conta.
  const resetPasswordForEmail = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: PASSWORD_RESET_REDIRECT_URL,
    });
    if (error) return { error: { message: translateAuthError(error.message) } };
    return { error: null };
  };

  // Usada na tela de redefinição de senha (depois que o usuário clicou no link do e-mail).
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: { message: translateAuthError(error.message) } };
    setIsPasswordRecovery(false);
    return { error: null };
  };

  // Confirma o código de 6 dígitos recebido por e-mail (fluxo de "esqueci minha senha" via OTP).
  // Se o código for válido, abre uma sessão de recuperação e libera a tela de nova senha.
  const verifyRecoveryOtp = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'recovery',
    });
    if (error) {
      const msg = error.message?.includes('expired')
        ? 'Este código expirou. Solicite um novo.'
        : error.message?.includes('invalid') || error.message?.includes('Token')
        ? 'Código inválido. Confira e tente novamente.'
        : translateAuthError(error.message);
      return { error: { message: msg } };
    }
    setIsPasswordRecovery(true);
    return { data, error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        profileMissing,
        loading,
        isPasswordRecovery,
        accessBlock,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        resetPasswordForEmail,
        updatePassword,
        verifyRecoveryOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
