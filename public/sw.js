// Service worker mínimo: habilita "Instalar app" (PWA). Não faz cache de dados —
// tudo continua vindo do Supabase em tempo real.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
