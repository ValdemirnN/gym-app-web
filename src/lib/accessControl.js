// Regra única de bloqueio por pagamento.
//
// - personal: paga a plataforma; só o ADMIN confirma (profiles.subscription_expires_at)
// - aluno (cliente): paga o personal; o personal confirma (profiles.access_expires_at)
// - admin: nunca é bloqueado
//
// Retorna null quando o acesso está liberado, ou um objeto com o motivo:
//   { role, reason: 'expired' | 'manual', expiresAt: Date | null }
export function getAccessBlock(profile, now = new Date()) {
  if (!profile || profile.role === 'admin') return null;

  const isPersonal = profile.role === 'personal';
  const rawExpires = isPersonal ? profile.subscription_expires_at : profile.access_expires_at;
  const expiresAt = rawExpires ? new Date(rawExpires) : null;
  const manualBlock = isPersonal
    ? profile.subscription_status === 'bloqueado'
    : !!profile.access_blocked;

  if (manualBlock) return { role: profile.role, reason: 'manual', expiresAt };
  if (expiresAt && expiresAt < now) return { role: profile.role, reason: 'expired', expiresAt };
  return null;
}
