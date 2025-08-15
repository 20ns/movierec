// src/services/pwaService.js
// Progressive Web App service for enhanced mobile experience

import { createComponentLogger, performanceMonitor } from '../utils/centralizedLogger';
import backgroundSyncService from './backgroundSyncService';

const logger = createComponentLogger('PWAService');

// ===== PWA CONSTANTS =====
const PWA_EVENTS = {
  INSTALL_PROMPT: 'installprompt',
  APP_INSTALLED: 'appinstalled',
  OFFLINE_READY: 'offlineready',
  UPDATE_AVAILABLE: 'updateavailable',
  UPDATE_APPLIED: 'updateapplied'
};

const INSTALL_PROMPT_DELAY = 3 * 60 * 1000; // 3 minutes
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

// ===== PWA SERVICE CLASS =====
class PWAService {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isStandalone = false;
    this.updateAvailable = false;
    this.listeners = [];
    this.installPromptShown = false;
    this.userEngagement = {
      sessionTime: 0,
      pageViews: 0,
      interactions: 0,
      startTime: Date.now()
    };
    
    this.initialize();
    
    logger.info('PWA service initialized');
  }

  initialize() {
    this.detectInstallation();
    this.setupEventListeners();
    this.trackUserEngagement();
    this.initializeServiceWorker();
    this.scheduleUpdateChecks();
  }

  // ===== INSTALLATION DETECTION =====
  
  detectInstallation() {
    // Check if app is running in standalone mode
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone ||
                       document.referrer.includes('android-app://');
    
    // Check if app is installed (heuristic)
    this.isInstalled = this.isStandalone ||
                       localStorage.getItem('pwa_installed') === 'true';
    
    logger.debug('Installation status', {
      isInstalled: this.isInstalled,
      isStandalone: this.isStandalone
    });
    
    this.notifyListeners(PWA_EVENTS.INSTALL_PROMPT, {
      isInstalled: this.isInstalled,
      isStandalone: this.isStandalone
    });
  }

  // ===== EVENT LISTENERS =====
  
  setupEventListeners() {
    // Installation prompt
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event;
      
      logger.info('Install prompt available');
      
      // Show install prompt after user engagement
      if (this.shouldShowInstallPrompt()) {
        setTimeout(() => {
          this.showInstallPrompt();
        }, INSTALL_PROMPT_DELAY);
      }
    });

    // App installed
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      localStorage.setItem('pwa_installed', 'true');
      this.deferredPrompt = null;
      
      logger.info('App installed successfully');
      this.notifyListeners(PWA_EVENTS.APP_INSTALLED);
    });

    // Orientation change (mobile responsiveness)
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });

    // Visibility change (app focus/blur)
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Network status
    window.addEventListener('online', () => {
      this.handleNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleNetworkChange(false);
    });
  }

  // ===== USER ENGAGEMENT TRACKING =====
  
  trackUserEngagement() {
    // Track page views
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    const trackNavigation = () => {
      this.userEngagement.pageViews++;
      logger.debug('Page view tracked', { pageViews: this.userEngagement.pageViews });
    };

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      trackNavigation();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      trackNavigation();
    };

    window.addEventListener('popstate', trackNavigation);

    // Track interactions
    ['click', 'touchstart', 'keydown'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.userEngagement.interactions++;
      }, { passive: true });
    });

    // Track session time
    setInterval(() => {
      if (!document.hidden) {
        this.userEngagement.sessionTime = Date.now() - this.userEngagement.startTime;
      }
    }, 10000); // Update every 10 seconds
  }

  shouldShowInstallPrompt() {
    if (this.isInstalled || this.installPromptShown) {
      return false;
    }

    // Check user engagement thresholds
    const { sessionTime, pageViews, interactions } = this.userEngagement;
    const sessionMinutes = sessionTime / (1000 * 60);
    
    return sessionMinutes >= 2 || pageViews >= 3 || interactions >= 10;
  }

  // ===== SERVICE WORKER MANAGEMENT =====
  
  async initializeServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      logger.warn('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      logger.info('Service Worker registered', {
        scope: registration.scope,
        state: registration.active?.state
      });

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.updateAvailable = true;
            this.notifyListeners(PWA_EVENTS.UPDATE_AVAILABLE, { registration });
          }
        });
      });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });

      return registration;
    } catch (error) {
      logger.error('Service Worker registration failed', { error: error.message }, error);
    }
  }

  handleServiceWorkerMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'OFFLINE_READY':
        this.notifyListeners(PWA_EVENTS.OFFLINE_READY, payload);
        break;
      
      case 'UPDATE_AVAILABLE':
        this.updateAvailable = true;
        this.notifyListeners(PWA_EVENTS.UPDATE_AVAILABLE, payload);
        break;
      
      case 'BACKGROUND_SYNC':
        // Trigger background sync through our service
        backgroundSyncService.queueSync('high');
        break;
      
      default:
        logger.debug('Unknown SW message', { type, payload });
    }
  }

  scheduleUpdateChecks() {
    setInterval(() => {
      this.checkForUpdates();
    }, UPDATE_CHECK_INTERVAL);
  }

  async checkForUpdates() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    } catch (error) {
      logger.error('Update check failed', { error: error.message });
    }
  }

  // ===== INSTALLATION MANAGEMENT =====
  
  async showInstallPrompt() {
    if (!this.deferredPrompt || this.installPromptShown) {
      return false;
    }

    this.installPromptShown = true;

    try {
      const result = await this.deferredPrompt.prompt();
      
      logger.info('Install prompt result', {
        outcome: result.outcome,
        userChoice: result.outcome === 'accepted'
      });

      this.deferredPrompt = null;
      
      return result.outcome === 'accepted';
    } catch (error) {
      logger.error('Install prompt failed', { error: error.message }, error);
      return false;
    }
  }

  canInstall() {
    return !!this.deferredPrompt && !this.isInstalled;
  }

  async forceInstallPrompt() {
    if (this.canInstall()) {
      return this.showInstallPrompt();
    }
    return false;
  }

  // ===== UPDATE MANAGEMENT =====
  
  async applyUpdate() {
    if (!this.updateAvailable) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        // Tell the waiting SW to skip waiting
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload to activate new SW
        window.location.reload();
        
        this.notifyListeners(PWA_EVENTS.UPDATE_APPLIED);
        return true;
      }
    } catch (error) {
      logger.error('Update application failed', { error: error.message }, error);
    }
    
    return false;
  }

  // ===== MOBILE RESPONSIVENESS HANDLERS =====
  
  handleOrientationChange() {
    const orientation = screen.orientation?.angle || window.orientation || 0;
    const isLandscape = Math.abs(orientation) === 90;
    
    logger.debug('Orientation changed', {
      angle: orientation,
      isLandscape
    });

    // Notify components about orientation change
    this.notifyListeners('orientationchange', {
      orientation,
      isLandscape,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });

    // Trigger viewport adjustments
    this.adjustViewportForOrientation(isLandscape);
  }

  adjustViewportForOrientation(isLandscape) {
    // Force viewport recalculation
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      const content = viewportMeta.getAttribute('content');
      viewportMeta.setAttribute('content', content);
    }

    // Dispatch custom event for components to handle
    window.dispatchEvent(new CustomEvent('viewportadjusted', {
      detail: { isLandscape }
    }));
  }

  handleVisibilityChange() {
    const isVisible = !document.hidden;
    
    logger.debug('Visibility changed', { isVisible });

    if (isVisible) {
      // App became visible - check for updates, sync data
      this.checkForUpdates();
      backgroundSyncService.queueSync('normal');
    } else {
      // App hidden - save state, cleanup
      this.saveAppState();
    }

    this.notifyListeners('visibilitychange', { isVisible });
  }

  handleNetworkChange(isOnline) {
    logger.info('Network status changed', { isOnline });
    
    if (isOnline) {
      // Connection restored
      backgroundSyncService.queueSync('high');
    }

    this.notifyListeners('networkchange', { isOnline });
  }

  // ===== STATE MANAGEMENT =====
  
  saveAppState() {
    try {
      const appState = {
        timestamp: Date.now(),
        url: window.location.href,
        userEngagement: { ...this.userEngagement },
        sessionId: this.getSessionId()
      };

      localStorage.setItem('pwa_app_state', JSON.stringify(appState));
    } catch (error) {
      logger.warn('Failed to save app state', { error: error.message });
    }
  }

  restoreAppState() {
    try {
      const savedState = localStorage.getItem('pwa_app_state');
      if (savedState) {
        const appState = JSON.parse(savedState);
        
        // Restore session if recent (less than 1 hour)
        const hourAgo = Date.now() - (60 * 60 * 1000);
        if (appState.timestamp > hourAgo) {
          return appState;
        }
      }
    } catch (error) {
      logger.warn('Failed to restore app state', { error: error.message });
    }
    
    return null;
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('pwa_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('pwa_session_id', sessionId);
    }
    return sessionId;
  }

  // ===== CAPABILITIES DETECTION =====
  
  getCapabilities() {
    return {
      // Installation
      canInstall: this.canInstall(),
      isInstalled: this.isInstalled,
      isStandalone: this.isStandalone,
      
      // Updates
      updateAvailable: this.updateAvailable,
      
      // Service Worker
      serviceWorkerSupported: 'serviceWorker' in navigator,
      
      // Storage
      persistentStorage: 'storage' in navigator && 'persist' in navigator.storage,
      
      // Notifications
      notificationSupported: 'Notification' in window,
      notificationPermission: 'Notification' in window ? Notification.permission : 'denied',
      
      // Device features
      touchSupported: 'ontouchstart' in window,
      geolocationSupported: 'geolocation' in navigator,
      
      // Network
      networkInformation: 'connection' in navigator,
      
      // Media
      mediaDevicesSupported: 'mediaDevices' in navigator,
      
      // Sensors
      deviceOrientationSupported: 'DeviceOrientationEvent' in window,
      deviceMotionSupported: 'DeviceMotionEvent' in window,
      
      // Performance
      performanceObserverSupported: 'PerformanceObserver' in window
    };
  }

  // ===== MOBILE-SPECIFIC FEATURES =====
  
  enableFullscreen() {
    const element = document.documentElement;
    
    if (element.requestFullscreen) {
      return element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      return element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      return element.msRequestFullscreen();
    }
    
    return Promise.reject(new Error('Fullscreen not supported'));
  }

  exitFullscreen() {
    if (document.exitFullscreen) {
      return document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      return document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      return document.msExitFullscreen();
    }
    
    return Promise.reject(new Error('Exit fullscreen not supported'));
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      logger.info('Notification permission requested', { permission });
      return permission;
    }

    return Notification.permission;
  }

  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const persistent = await navigator.storage.persist();
      logger.info('Persistent storage requested', { granted: persistent });
      return persistent;
    }
    
    return false;
  }

  // ===== LISTENER MANAGEMENT =====
  
  addListener(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    
    this.listeners[eventType].push(callback);
    
    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    };
  }

  notifyListeners(eventType, data = {}) {
    const eventListeners = this.listeners[eventType] || [];
    
    eventListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.warn('PWA event listener error', {
          eventType,
          error: error.message
        });
      }
    });
  }

  // ===== PUBLIC API =====
  
  getStatus() {
    return {
      isInstalled: this.isInstalled,
      isStandalone: this.isStandalone,
      canInstall: this.canInstall(),
      updateAvailable: this.updateAvailable,
      userEngagement: { ...this.userEngagement },
      capabilities: this.getCapabilities()
    };
  }

  getInstallPromptInfo() {
    return {
      available: this.canInstall(),
      shown: this.installPromptShown,
      shouldShow: this.shouldShowInstallPrompt(),
      engagement: this.userEngagement
    };
  }

  // Cleanup
  destroy() {
    // Remove event listeners and clear intervals
    logger.info('PWA service destroyed');
  }
}

// ===== SINGLETON INSTANCE =====
const pwaService = new PWAService();

// ===== EXPORTS =====
export { pwaService, PWA_EVENTS };
export default pwaService;