// Netflix PWA Service Worker

const CACHE_NAME = 'netflix-pwa-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  // 필요한 리소스들
];

// 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('Service Worker 설치 중...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('캐시 열림');
        return cache.addAll(urlsToCache);
      })
  );
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('Service Worker 활성화');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 네트워크 요청 인터셉트
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Netflix 도메인 요청 처리
  if (url.hostname.includes('netflix.com')) {
    event.respondWith(
      handleNetflixRequest(event.request)
    );
  } else {
    // 일반 요청은 캐시 우선
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});

// Netflix 요청 특별 처리
async function handleNetflixRequest(request) {
  // 요청 헤더 수정
  const modifiedHeaders = new Headers(request.headers);
  
  // 데스크톱 User Agent 설정
  modifiedHeaders.set('User-Agent', 
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  
  // 모바일 관련 헤더 제거/수정
  modifiedHeaders.set('sec-ch-ua-platform', '"Windows"');
  modifiedHeaders.set('sec-ch-ua-mobile', '?0');
  modifiedHeaders.delete('sec-ch-ua-platform-version');
  
  // 화면 크기 관련 헤더 추가
  modifiedHeaders.set('viewport-width', '1920');
  modifiedHeaders.set('dpr', '1');
  
  // 수정된 요청 생성
  const modifiedRequest = new Request(request.url, {
    method: request.method,
    headers: modifiedHeaders,
    body: request.body,
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer
  });
  
  try {
    // 수정된 요청으로 fetch
    const response = await fetch(modifiedRequest);
    
    // 응답 헤더도 필요시 수정
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
    return modifiedResponse;
    
  } catch (error) {
    console.error('Netflix 요청 실패:', error);
    return fetch(request); // 원본 요청으로 폴백
  }
}

// 메시지 리스너 (메인 스레드와 통신)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({version: CACHE_NAME});
  }
});