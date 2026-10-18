// ==============================================================================
// Vetgo Service Worker - Estratégia de Cache Offline Completa (PWA Offline First)
// Permite carregamento total do Dashboard, Pacientes, Tutores e Prontuários sem sinal de internet
// ==============================================================================

const VERSION = 'vetgo-v4';
const STATIC_CACHE = `vetgo-static-${VERSION}`;
const DYNAMIC_CACHE = `vetgo-dynamic-${VERSION}`;
const API_CACHE = `vetgo-api-${VERSION}`;

// Recursos estáticos fundamentais pré-cacheados na instalação
const CORE_STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/logo.svg',
  '/favicon.ico',
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      try {
        await cache.addAll(CORE_STATIC_ASSETS);
      } catch (err) {
        console.warn('[Vetgo SW] Erro ao pré-cachear ativos essenciais:', err);
      }
    })
  );
});

// Ativação e limpeza de versões anteriores de cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper de timeout para conexões instáveis / 2G / sem sinal
function fetchWithTimeout(request, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Estratégia de interceptação de requisições
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // -------------------------------------------------------------
  // 1. REQUISIÇÕES DE API (/api/v1/...)
  // -------------------------------------------------------------
  if (url.pathname.startsWith('/api/')) {
    // Para métodos de mutação (POST, PUT, DELETE, PATCH):
    // Deixa passar direto para a rede. Se falhar por estar offline, o cliente
    // (api.ts e offlineStorage) captura e enfileira para sincronização posterior.
    if (request.method !== 'GET') {
      return;
    }

    // Para requisições GET (Dashboard, Pacientes, Tutores, Prontuários):
    // Estratégia: Network-First com Timeout rápido e Fallback Total para Cache API
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE);

        try {
          // Tenta buscar da rede com timeout de 2.5s (não trava o veterinário em local com sinal fraco)
          const networkResponse = await fetchWithTimeout(request.clone(), 2500);

          // Se a rede respondeu com sucesso, clona e atualiza o cache local
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone()).catch(() => {});
            return networkResponse;
          }

          // Se o servidor respondeu erro (exceto 401), tenta retornar o cache existente
          if (networkResponse && networkResponse.status !== 401) {
            const cached = await cache.match(request);
            if (cached) {
              const headers = new Headers(cached.headers);
              headers.set('X-Vetgo-From-Cache', 'true');
              headers.set('X-Vetgo-Offline', 'true');
              return new Response(cached.body, {
                status: 200,
                statusText: 'OK (From Offline Cache)',
                headers,
              });
            }
          }

          return networkResponse;
        } catch (fetchErr) {
          // Em caso de falha de conexão ou timeout: recupera do Cache API
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            const headers = new Headers(cachedResponse.headers);
            headers.set('X-Vetgo-From-Cache', 'true');
            headers.set('X-Vetgo-Offline', 'true');
            return new Response(cachedResponse.body, {
              status: 200,
              statusText: 'OK (From Offline Cache)',
              headers,
            });
          }

          // Se não encontrou o endpoint exato no cache, verifica se é lista de pacientes ou tutores
          if (url.pathname.includes('/patients')) {
            const fallbackList = await cache.match('/api/v1/patients');
            if (fallbackList) return fallbackList;
          }
          if (url.pathname.includes('/tutors')) {
            const fallbackList = await cache.match('/api/v1/tutors');
            if (fallbackList) return fallbackList;
          }

          // Resposta JSON segura para que a interface não trave
          return new Response(
            JSON.stringify({
              detail: 'Modo Offline: Dados indisponíveis no momento.',
              is_offline: true,
              data: [],
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'X-Vetgo-Offline': 'true',
              },
            }
          );
        }
      })()
    );
    return;
  }

  // -------------------------------------------------------------
  // 2. NAVEGAÇÃO DE PÁGINAS (App Shell SPA)
  // -------------------------------------------------------------
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Tenta a rede primeiro para obter HTML mais recente
          const networkResponse = await fetchWithTimeout(request, 2000);
          if (networkResponse && networkResponse.ok) {
            const staticCache = await caches.open(STATIC_CACHE);
            staticCache.put('/index.html', networkResponse.clone()).catch(() => {});
            return networkResponse;
          }
        } catch (err) {
          // Se estiver sem sinal de internet, carrega o App Shell imediatamente
        }

        const cachedIndex =
          (await caches.match('/index.html')) ||
          (await caches.match('/'));
        if (cachedIndex) {
          return cachedIndex;
        }

        return new Response('Modo Offline Vetgo', {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      })()
    );
    return;
  }

  // -------------------------------------------------------------
  // 3. ATIVOS ESTÁTICOS (JS, CSS, Fontes, Imagens, Ícones)
  // Estratégia: Stale-While-Revalidate (resposta instantânea do cache + atualização em segundo plano)
  // -------------------------------------------------------------
  if (
    request.method === 'GET' &&
    (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|ico)$/i) ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.pathname.startsWith('/assets/'))
  ) {
    event.respondWith(
      (async () => {
        const dynamicCache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await caches.match(request);

        // Dispara busca na rede em background para atualizar o cache
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              dynamicCache.put(request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // Se já temos em cache, entrega imediatamente; senão aguarda a rede
        return cachedResponse || fetchPromise;
      })()
    );
    return;
  }

  // Requisições residuais padrão
  event.respondWith(
    fetch(request).catch(async () => {
      const match = await caches.match(request);
      return match || new Response('Offline', { status: 503, statusText: 'Offline' });
    })
  );
});

// Listener para mensagens vindas da aplicação React
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Mensagem para pré-aquecer o cache de endpoints críticos logo após login
  if (event.data && event.data.type === 'WARMUP_API_CACHE' && Array.isArray(event.data.urls)) {
    const token = event.data.token;
    caches.open(API_CACHE).then((cache) => {
      event.data.urls.forEach(async (endpoint) => {
        try {
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res = await fetch(endpoint, { headers });
          if (res && res.ok) {
            await cache.put(endpoint, res.clone());
          }
        } catch {}
      });
    });
  }
});

// =============================================================
// LISTENER DE NOTIFICAÇÕES PUSH (RECEBIMENTO MESMO COM APP FECHADO)
// =============================================================
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Vetgo', body: event.data.text() };
    }
  }

  const isAppointment =
    data.type === 'NEW_APPOINTMENT' ||
    (data.title && data.title.toLowerCase().includes('agendamento')) ||
    (data.body && data.body.toLowerCase().includes('agendamento'));

  const title = data.title || (isAppointment ? '🐾 Novo Agendamento Recebido' : 'Vetgo - Notificação');

  // Configurações ricas para garantir que o sistema operacional e a tela de bloqueio
  // exibam o alerta mesmo com o navegador ou app fechados
  const options = {
    body: data.body || 'Você recebeu uma nova notificação na plataforma Vetgo.',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    image: data.image || undefined,
    // Tag única para não sobrescrever outros agendamentos e alertar novamente
    tag: data.tag || (isAppointment ? `appt-${data.appointment_id || Date.now()}` : 'vetgo-notification'),
    renotify: true,
    requireInteraction: true, // Mantém a notificação visível na tela até que o veterinário interaja
    silent: false,
    // Padrão de vibração expressivo (vibra, pausa, vibra, pausa, vibra longa)
    vibrate: isAppointment ? [250, 100, 250, 100, 400] : [150, 80, 150],
    data: {
      url: data.url || (isAppointment ? '/atendimentos' : '/'),
      appointment_id: data.appointment_id,
      type: data.type || (isAppointment ? 'NEW_APPOINTMENT' : 'INFO'),
      appointment: data.appointment,
      dateOfArrival: Date.now(),
    },
    actions: isAppointment
      ? [
          { action: 'open_appt', title: '📅 Ver Agendamento' },
          { action: 'dismiss', title: 'Dispensar' },
        ]
      : [
          { action: 'open_app', title: 'Abrir Vetgo' },
        ],
  };

  // Atualização em background do cache de agendamentos no Service Worker
  // Se veio payload com o agendamento, pré-popula o cache offline mesmo antes de abrir o app!
  const backgroundWork = (async () => {
    try {
      if (data.appointment) {
        const cache = await caches.open(API_CACHE);
        const cachedApptsRes = await cache.match('/api/v1/appointments');
        if (cachedApptsRes) {
          try {
            const list = await cachedApptsRes.json();
            if (Array.isArray(list)) {
              const updatedList = [data.appointment, ...list.filter((a) => a.id !== data.appointment.id)];
              const newRes = new Response(JSON.stringify(updatedList), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              });
              await cache.put('/api/v1/appointments', newRes);
            }
          } catch {}
        }
      }
    } catch {}

    // Exibe a notificação no dispositivo mesmo se o app estiver totalmente fechado
    return self.registration.showNotification(title, options);
  })();

  event.waitUntil(backgroundWork);
});

// =============================================================
// CLIQUE NA NOTIFICAÇÃO (ABRE O APP OU FOCO NO AGENDAMENTO)
// =============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Se o veterinário clicou em "Dispensar", apenas fecha
  if (event.action === 'dismiss') {
    return;
  }

  const notifData = event.notification.data || {};
  let targetUrl = notifData.url || '/atendimentos';

  // Se clicou no botão "Ver Agendamento" ou na notificação
  if (event.action === 'open_appt' && notifData.appointment_id) {
    targetUrl = `/atendimentos?appointment_id=${notifData.appointment_id}`;
  }

  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Se o app já estiver aberto em alguma aba ou janela standalone
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_APPOINTMENT_OPENED',
            appointmentId: notifData.appointment_id,
            url: targetUrl,
          });
          await client.navigate(targetUrl);
          return client.focus();
        }
      }

      // Se o app estiver COMPLETAMENTE FECHADO, abre uma nova janela/PWA direto no agendamento
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })()
  );
});
