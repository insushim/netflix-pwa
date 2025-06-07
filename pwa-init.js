// Netflix PWA 초기화 스크립트

class NetflixPWA {
  constructor() {
    this.init();
  }
  
  async init() {
    await this.registerServiceWorker();
    this.setupDesktopEnvironment();
    this.setupInstallPrompt();
    this.setupSpeedControls();
    this.monitorDRM();
  }
  
  // 서비스 워커 등록
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('Service Worker 등록 성공:', registration.scope);
        
        // 업데이트 체크
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('새 Service Worker 사용 가능');
                this.showUpdateAvailable();
              }
            }
          });
        });
        
      } catch (error) {
        console.error('Service Worker 등록 실패:', error);
      }
    }
  }
  
  // 데스크톱 환경 시뮬레이션
  setupDesktopEnvironment() {
    // 화면 크기 조작
    Object.defineProperty(screen, 'width', {
      get: () => 1920,
      configurable: true
    });
    
    Object.defineProperty(screen, 'height', {
      get: () => 1080,
      configurable: true
    });
    
    Object.defineProperty(screen, 'availWidth', {
      get: () => 1920,
      configurable: true
    });
    
    Object.defineProperty(screen, 'availHeight', {
      get: () => 1040,
      configurable: true
    });
    
    // 터치 기능 비활성화
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 0,
      configurable: true
    });
    
    // 플랫폼 정보 수정
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
      configurable: true
    });
    
    // 모바일 감지 차단
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type.includes('touch') || type.includes('orientation')) {
        return; // 터치/회전 이벤트 무시
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // CSS 미디어쿼리 조작
    this.injectDesktopCSS();
  }
  
  // 데스크톱 CSS 주입
  injectDesktopCSS() {
    const style = document.createElement('style');
    style.textContent = `
      /* 모바일 UI 숨기기 */
      [data-uia*="mobile"], 
      .mobile-only,
      .touch-only {
        display: none !important;
      }
      
      /* 데스크톱 UI 강제 표시 */
      [data-uia*="desktop"],
      .desktop-only {
        display: block !important;
      }
      
      /* 전체화면 최적화 */
      body {
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden;
      }
      
      /* 비디오 컨테이너 최적화 */
      .watch-video {
        width: 100% !important;
        height: 100% !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // PWA 설치 프롬프트
  setupInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // 커스텀 설치 버튼 표시
      this.showInstallButton(deferredPrompt);
    });
    
    // 설치 완료 이벤트
    window.addEventListener('appinstalled', () => {
      console.log('PWA 설치 완료');
      deferredPrompt = null;
    });
  }
  
  // 설치 버튼 표시
  showInstallButton(deferredPrompt) {
    const installBtn = document.createElement('button');
    installBtn.textContent = '앱으로 설치';
    installBtn.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 9999;
      background: #E50914;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
    `;
    
    installBtn.addEventListener('click', async () => {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('설치 선택:', outcome);
      
      if (outcome === 'accepted') {
        installBtn.remove();
      }
    });
    
    document.body.appendChild(installBtn);
  }
  
  // 배속 컨트롤 설정
  setupSpeedControls() {
    const observer = new MutationObserver(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (!video.hasAttribute('pwa-speed-control')) {
          video.setAttribute('pwa-speed-control', 'true');
          this.addSpeedControlToVideo(video);
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // 비디오별 배속 컨트롤 추가
  addSpeedControlToVideo(video) {
    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
      if (document.activeElement === video || e.target === video) {
        switch(e.key) {
          case '1': video.playbackRate = 1.0; break;
          case '2': video.playbackRate = 1.25; break;
          case '3': video.playbackRate = 1.5; break;
          case '4': video.playbackRate = 1.75; break;
          case '5': video.playbackRate = 2.0; break;
          case '6': video.playbackRate = 2.5; break;
          case '0': video.playbackRate = 0.75; break;
        }
      }
    });
    
    // 우클릭 메뉴에 배속 옵션 추가
    video.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showSpeedContextMenu(e, video);
    });
  }
  
  // 배속 컨텍스트 메뉴
  showSpeedContextMenu(event, video) {
    const menu = document.createElement('div');
    menu.style.cssText = `
      position: fixed;
      left: ${event.clientX}px;
      top: ${event.clientY}px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];
    speeds.forEach(speed => {
      const item = document.createElement('div');
      item.textContent = `${speed}x`;
      item.style.cssText = 'padding: 5px; cursor: pointer; hover:background: #333;';
      item.addEventListener('click', () => {
        video.playbackRate = speed;
        menu.remove();
      });
      menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    
    // 클릭 외부시 메뉴 닫기
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), {once: true});
    }, 100);
  }
  
  // DRM 상태 모니터링
  monitorDRM() {
    if (navigator.requestMediaKeySystemAccess) {
      navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{
        initDataTypes: ['cenc'],
        videoCapabilities: [{
          contentType: 'video/mp4; codecs="avc1.42E01E"',
          robustness: 'SW_SECURE_CRYPTO'
        }]
      }]).then(keySystemAccess => {
        console.log('Widevine 지원됨:', keySystemAccess);
        return keySystemAccess.createMediaKeys();
      }).then(mediaKeys => {
        console.log('MediaKeys 생성 성공');
      }).catch(error => {
        console.error('DRM 초기화 실패:', error);
      });
    }
  }
  
  // 업데이트 알림
  showUpdateAvailable() {
    const notification = document.createElement('div');
    notification.textContent = '새 버전이 있습니다. 새로고침하세요.';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #E50914;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 10000;
      cursor: pointer;
    `;
    
    notification.addEventListener('click', () => {
      window.location.reload();
    });
    
    document.body.appendChild(notification);
  }
}

// PWA 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new NetflixPWA();
  });
} else {
  new NetflixPWA();
}