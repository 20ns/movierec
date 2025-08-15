// src/services/backgroundSyncService.js
// Background synchronization service with connectivity awareness

import { syncPreferences, savePreferences } from './preferenceServiceEnhanced';
import { createComponentLogger, performanceMonitor } from '../utils/centralizedLogger';

const logger = createComponentLogger('BackgroundSync');

// ===== CONSTANTS =====
const SYNC_INTERVAL = 30 * 1000; // 30 seconds
const CONNECTIVITY_CHECK_INTERVAL = 10 * 1000; // 10 seconds
const MAX_RETRY_QUEUE_SIZE = 50;
const OFFLINE_STORAGE_KEY = 'bg_sync_queue';
const CONNECTIVITY_HISTORY_KEY = 'connectivity_history';
const SYNC_STATISTICS_KEY = 'sync_statistics';

// ===== CONNECTIVITY DETECTION =====
class ConnectivityMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.connectivityHistory = this.loadConnectivityHistory();
    this.lastOnlineCheck = Date.now();
    this.consecutiveFailures = 0;
    
    this.setupEventListeners();
    this.startPeriodicChecks();
    
    logger.info('Connectivity monitor initialized', {
      initialStatus: this.isOnline ? 'online' : 'offline',
      hasServiceWorker: 'serviceWorker' in navigator
    });
  }

  setupEventListeners() {
    // Browser connectivity events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Page visibility for sync triggering
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Service Worker messages (if available)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
    }
  }

  handleOnline() {
    this.setOnlineStatus(true);
    logger.info('Browser detected online status');
  }

  handleOffline() {
    this.setOnlineStatus(false);
    logger.warn('Browser detected offline status');
  }

  handleVisibilityChange() {
    if (!document.hidden && this.isOnline) {
      logger.debug('Page became visible, triggering connectivity check');
      this.performConnectivityCheck();
    }
  }

  handleServiceWorkerMessage(event) {
    if (event.data && event.data.type === 'CONNECTIVITY_CHANGE') {
      logger.debug('Service worker reported connectivity change', event.data);
      this.setOnlineStatus(event.data.isOnline);
    }
  }

  async performConnectivityCheck() {
    const timer = performanceMonitor.startTiming('connectivity_check');
    
    try {
      // Multiple connectivity checks for robustness
      const checks = [
        this.checkNetworkAccess(),
        this.checkDNSResolution(),
        this.checkAPIEndpoint()
      ];

      const results = await Promise.allSettled(checks);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      // Consider online if at least 2 out of 3 checks pass
      const isConnected = successCount >= 2;
      
      timer.end();
      
      if (isConnected !== this.isOnline) {
        logger.info('Connectivity status changed via active check', {
          previous: this.isOnline,
          current: isConnected,
          checksSucceeded: successCount,
          checkTime: timer.getElapsed()
        });
        
        this.setOnlineStatus(isConnected);
      }
      
      this.consecutiveFailures = isConnected ? 0 : this.consecutiveFailures + 1;
      this.lastOnlineCheck = Date.now();
      
      return isConnected;
      
    } catch (error) {
      timer.end();
      logger.warn('Connectivity check failed', { error: error.message });
      this.consecutiveFailures++;
      return false;
    }
  }

  async checkNetworkAccess() {
    try {
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async checkDNSResolution() {
    try {
      const response = await fetch('https://1.1.1.1/dns-query?name=google.com&type=A', {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async checkAPIEndpoint() {
    try {
      // Use a lightweight endpoint if available
      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  setOnlineStatus(isOnline) {
    const previousStatus = this.isOnline;
    this.isOnline = isOnline;
    
    // Record connectivity change
    const changeEvent = {
      timestamp: new Date().toISOString(),
      status: isOnline ? 'online' : 'offline',
      duration: previousStatus !== isOnline ? Date.now() - this.lastStatusChange : 0
    };
    
    this.connectivityHistory.push(changeEvent);
    
    // Keep only last 100 events
    if (this.connectivityHistory.length > 100) {
      this.connectivityHistory = this.connectivityHistory.slice(-100);
    }
    
    this.saveConnectivityHistory();
    this.lastStatusChange = Date.now();
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener({ isOnline, previousStatus, changeEvent });
      } catch (error) {
        logger.warn('Connectivity listener error', { error: error.message });
      }
    });
  }

  startPeriodicChecks() {
    setInterval(() => {
      // Only check if we think we're online or haven't checked recently
      if (this.isOnline || Date.now() - this.lastOnlineCheck > CONNECTIVITY_CHECK_INTERVAL * 2) {
        this.performConnectivityCheck();
      }
    }, CONNECTIVITY_CHECK_INTERVAL);
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  loadConnectivityHistory() {
    try {
      const history = localStorage.getItem(CONNECTIVITY_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  saveConnectivityHistory() {
    try {
      localStorage.setItem(CONNECTIVITY_HISTORY_KEY, JSON.stringify(this.connectivityHistory));
    } catch (error) {
      logger.warn('Could not save connectivity history', { error: error.message });
    }
  }

  getConnectivityStats() {
    const now = Date.now();
    const last24Hours = this.connectivityHistory.filter(
      event => now - new Date(event.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    const onlineEvents = last24Hours.filter(e => e.status === 'online');
    const offlineEvents = last24Hours.filter(e => e.status === 'offline');

    return {
      currentStatus: this.isOnline ? 'online' : 'offline',
      lastCheck: new Date(this.lastOnlineCheck).toISOString(),
      consecutiveFailures: this.consecutiveFailures,
      last24Hours: {
        totalEvents: last24Hours.length,
        onlineEvents: onlineEvents.length,
        offlineEvents: offlineEvents.length,
        avgOnlineDuration: onlineEvents.length > 0 
          ? onlineEvents.reduce((sum, e) => sum + e.duration, 0) / onlineEvents.length 
          : 0
      }
    };
  }
}

// ===== SYNC QUEUE MANAGEMENT =====
class SyncQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.processing = false;
    this.statistics = this.loadStatistics();
    
    logger.debug('Sync queue initialized', {
      queueLength: this.queue.length,
      hasStoredStats: !!this.statistics
    });
  }

  addOperation(operation) {
    if (this.queue.length >= MAX_RETRY_QUEUE_SIZE) {
      logger.warn('Sync queue is full, removing oldest operation');
      this.queue.shift();
    }

    const queueItem = {
      id: Date.now() + Math.random(),
      operation,
      timestamp: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
      priority: operation.priority || 'normal' // high, normal, low
    };

    // Insert based on priority
    if (queueItem.priority === 'high') {
      this.queue.unshift(queueItem);
    } else {
      this.queue.push(queueItem);
    }

    this.saveQueue();
    
    logger.debug('Operation added to sync queue', {
      operationType: operation.type,
      priority: queueItem.priority,
      queueLength: this.queue.length
    });

    return queueItem.id;
  }

  async processQueue(currentUser) {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const timer = performanceMonitor.startTiming('sync_queue_processing');
    
    logger.info('Starting sync queue processing', {
      queueLength: this.queue.length
    });

    const processedItems = [];
    const failedItems = [];

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      item.attempts++;

      try {
        await this.executeOperation(item.operation, currentUser);
        
        processedItems.push(item);
        this.statistics.successfulOperations++;
        
        logger.debug('Queue operation successful', {
          operationType: item.operation.type,
          attempt: item.attempts,
          operationId: item.id
        });

      } catch (error) {
        logger.warn('Queue operation failed', {
          operationType: item.operation.type,
          attempt: item.attempts,
          maxAttempts: item.maxAttempts,
          error: error.message,
          operationId: item.id
        });

        if (item.attempts < item.maxAttempts) {
          // Re-queue for retry with exponential backoff
          setTimeout(() => {
            this.queue.push(item);
            this.saveQueue();
          }, Math.pow(2, item.attempts) * 1000);
          
          failedItems.push(item);
        } else {
          logger.error('Queue operation permanently failed', {
            operationType: item.operation.type,
            operationId: item.id,
            totalAttempts: item.attempts
          });
          
          this.statistics.failedOperations++;
          failedItems.push(item);
        }
      }
    }

    this.saveQueue();
    this.saveStatistics();
    
    timer.end();
    this.processing = false;

    logger.info('Sync queue processing completed', {
      processed: processedItems.length,
      failed: failedItems.length,
      processingTime: timer.getElapsed()
    });

    return {
      processed: processedItems.length,
      failed: failedItems.length,
      processingTime: timer.getElapsed()
    };
  }

  async executeOperation(operation, currentUser) {
    switch (operation.type) {
      case 'SAVE_PREFERENCES':
        return await savePreferences(operation.data, currentUser, operation.isPartial);
      
      case 'SYNC_PREFERENCES':
        return await syncPreferences(currentUser);
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  loadQueue() {
    try {
      const queue = localStorage.getItem(OFFLINE_STORAGE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch {
      return [];
    }
  }

  saveQueue() {
    try {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      logger.warn('Could not save sync queue', { error: error.message });
    }
  }

  loadStatistics() {
    try {
      const stats = localStorage.getItem(SYNC_STATISTICS_KEY);
      return stats ? JSON.parse(stats) : {
        successfulOperations: 0,
        failedOperations: 0,
        lastProcessed: null
      };
    } catch {
      return {
        successfulOperations: 0,
        failedOperations: 0,
        lastProcessed: null
      };
    }
  }

  saveStatistics() {
    try {
      this.statistics.lastProcessed = new Date().toISOString();
      localStorage.setItem(SYNC_STATISTICS_KEY, JSON.stringify(this.statistics));
    } catch (error) {
      logger.warn('Could not save sync statistics', { error: error.message });
    }
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      statistics: { ...this.statistics }
    };
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
    logger.info('Sync queue cleared');
  }
}

// ===== BACKGROUND SYNC SERVICE =====
class BackgroundSyncService {
  constructor() {
    this.connectivityMonitor = new ConnectivityMonitor();
    this.syncQueue = new SyncQueue();
    this.currentUser = null;
    this.syncInterval = null;
    this.isInitialized = false;
    
    this.setupConnectivityHandling();
    
    logger.info('Background sync service initialized');
  }

  initialize(currentUser) {
    this.currentUser = currentUser;
    this.isInitialized = true;
    
    this.startPeriodicSync();
    
    // Process any pending queue items
    if (this.connectivityMonitor.isOnline) {
      this.syncQueue.processQueue(currentUser);
    }
    
    logger.info('Background sync service started for user');
  }

  setupConnectivityHandling() {
    this.connectivityMonitor.addListener(({ isOnline, previousStatus }) => {
      if (isOnline && !previousStatus && this.isInitialized) {
        logger.info('Connection restored, processing sync queue');
        this.syncQueue.processQueue(this.currentUser);
      }
    });
  }

  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.connectivityMonitor.isOnline && this.isInitialized) {
        this.performBackgroundSync();
      }
    }, SYNC_INTERVAL);
  }

  async performBackgroundSync() {
    if (!this.currentUser || !this.connectivityMonitor.isOnline) {
      return;
    }

    const timer = performanceMonitor.startTiming('background_sync');
    
    try {
      // Process any queued operations first
      await this.syncQueue.processQueue(this.currentUser);
      
      // Perform regular sync if no operations are pending
      if (this.syncQueue.getQueueStatus().queueLength === 0) {
        const result = await syncPreferences(this.currentUser);
        
        if (result.success) {
          logger.debug('Background sync successful');
        } else {
          logger.warn('Background sync failed', { error: result.error });
        }
      }
      
    } catch (error) {
      logger.error('Background sync error', { error: error.message }, error);
    } finally {
      timer.end();
    }
  }

  // Public API methods
  
  /**
   * Queue a preference save operation
   */
  queuePreferenceSave(preferences, isPartial = false, priority = 'normal') {
    const operation = {
      type: 'SAVE_PREFERENCES',
      data: preferences,
      isPartial,
      priority
    };

    const operationId = this.syncQueue.addOperation(operation);
    
    // If online, try to process immediately
    if (this.connectivityMonitor.isOnline && this.isInitialized) {
      setTimeout(() => this.syncQueue.processQueue(this.currentUser), 100);
    }
    
    return operationId;
  }

  /**
   * Queue a sync operation
   */
  queueSync(priority = 'normal') {
    const operation = {
      type: 'SYNC_PREFERENCES',
      priority
    };

    const operationId = this.syncQueue.addOperation(operation);
    
    if (this.connectivityMonitor.isOnline && this.isInitialized) {
      setTimeout(() => this.syncQueue.processQueue(this.currentUser), 100);
    }
    
    return operationId;
  }

  /**
   * Get current connectivity status
   */
  getConnectivityStatus() {
    return {
      isOnline: this.connectivityMonitor.isOnline,
      stats: this.connectivityMonitor.getConnectivityStats(),
      queue: this.syncQueue.getQueueStatus()
    };
  }

  /**
   * Add connectivity change listener
   */
  addConnectivityListener(callback) {
    return this.connectivityMonitor.addListener(callback);
  }

  /**
   * Force sync operation (bypasses queue)
   */
  async forceSync() {
    if (!this.isInitialized || !this.currentUser) {
      throw new Error('Service not initialized');
    }
    
    if (!this.connectivityMonitor.isOnline) {
      throw new Error('No network connection available');
    }
    
    return await syncPreferences(this.currentUser);
  }

  /**
   * Shutdown the service
   */
  shutdown() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.isInitialized = false;
    this.currentUser = null;
    
    logger.info('Background sync service shutdown');
  }
}

// ===== SINGLETON INSTANCE =====
const backgroundSyncService = new BackgroundSyncService();

// ===== EXPORTS =====
export { backgroundSyncService };
export default backgroundSyncService;