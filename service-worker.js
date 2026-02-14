// Service Worker para Zele Server PWA
// Este arquivo deve estar na raiz do projeto para funcionar corretamente

const CACHE_NAME = 'zele-server-v2.3.0';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
];

// Instalação - cachear recursos
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('📦 Service Worker: Cache aberto');
        
        // Cachear recursos individualmente para evitar falha total
        const cachePromises = urlsToCache.map(async (url) => {
          try {
            await cache.add(new Request(url, {cache: 'reload'}));
            console.log('✅ Cacheado:', url);
          } catch (error) {
            console.warn('⚠️ Falha ao cachear:', url, error.message);
          }
        });
        
        return Promise.all(cachePromises);
      })
  );
  self.skipWaiting();
});

// Ativação - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch - estratégia Network First (sempre tenta rede primeiro)
self.addEventListener('fetch', (event) => {
  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requisições para Firebase (sempre online)
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('emailjs.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta é válida, clonar e guardar no cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Se falhar, tentar buscar do cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              console.log('📦 Service Worker: Servindo do cache:', event.request.url);
              return response;
            }
            // Se não tiver no cache, retornar página offline
            return new Response('Offline - Sem conexão com internet', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

console.log('🚀 Service Worker carregado');
