// Time Synchronization Service
// Provides accurate server time for token validation regardless of client clock settings

class TimeSync {
  constructor() {
    this.offset = 0; // Server time - client time in seconds
    this.lastSync = null;
    this.syncInterval = 30 * 60 * 1000; // 30 minutes
    this.isSync = false;
    this.syncAttempts = 0;
    this.maxSyncAttempts = 3;
    this.fallbackToClientTime = false;
    
    // Load cached offset from localStorage
    this.loadCachedOffset();
  }

  /**
   * Load cached time offset from localStorage
   */
  loadCachedOffset() {
    try {
      const cached = localStorage.getItem('timeSync_offset');
      if (cached) {
        const { offset, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // Use cached offset if less than 1 hour old
        if (age < 60 * 60 * 1000) {
          this.offset = offset;
          this.lastSync = timestamp;
          if (process.env.NODE_ENV === 'development') {
            console.log(`[TimeSync] Loaded cached offset: ${offset}s (${Math.floor(offset/60)} minutes)`);
          }
        } else {
          localStorage.removeItem('timeSync_offset');
        }
      }
    } catch (error) {
      console.warn('[TimeSync] Error loading cached offset:', error);
    }
  }

  /**
   * Save time offset to localStorage
   */
  saveCachedOffset() {
    try {
      const cacheData = {
        offset: this.offset,
        timestamp: Date.now()
      };
      localStorage.setItem('timeSync_offset', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[TimeSync] Error saving offset to cache:', error);
    }
  }

  /**
   * Fetch server time from AWS API Gateway
   */
  async fetchAWSServerTime() {
    try {
      const startTime = Date.now();
      const apiUrl = process.env.REACT_APP_API_GATEWAY_INVOKE_URL || 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';
      
      // Use HEAD request to minimize data transfer
      const response = await fetch(`${apiUrl}/recommendations`, {
        method: 'HEAD',
        cache: 'no-cache'
      });

      const endTime = Date.now();
      const roundTripTime = endTime - startTime;
      
      if (response.ok && response.headers.has('date')) {
        const serverDate = response.headers.get('date');
        const serverTime = Math.floor(new Date(serverDate).getTime() / 1000);
        const clientTime = Math.floor((startTime + (roundTripTime / 2)) / 1000); // Account for network latency
        
        return {
          serverTime,
          clientTime,
          roundTripTime,
          source: 'aws'
        };
      }
      
      throw new Error('No date header in AWS response');
    } catch (error) {
      console.warn('[TimeSync] AWS time fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Fetch server time from fallback public API
   */
  async fetchFallbackTime() {
    try {
      const startTime = Date.now();
      
      // Try World Time API
      const response = await fetch('https://worldtimeapi.org/api/timezone/UTC', {
        method: 'GET',
        cache: 'no-cache'
      });

      const endTime = Date.now();
      const roundTripTime = endTime - startTime;

      if (response.ok) {
        const data = await response.json();
        const serverTime = data.unixtime;
        const clientTime = Math.floor((startTime + (roundTripTime / 2)) / 1000);
        
        return {
          serverTime,
          clientTime,
          roundTripTime,
          source: 'worldtime'
        };
      }
      
      throw new Error('Fallback time API failed');
    } catch (error) {
      console.warn('[TimeSync] Fallback time fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Synchronize time with server
   */
  async syncTime(force = false) {
    // Skip if recently synced and not forced
    if (!force && this.lastSync && (Date.now() - this.lastSync) < this.syncInterval) {
      return this.offset;
    }

    if (this.isSync) {
      console.log('[TimeSync] Sync already in progress');
      return this.offset;
    }

    this.isSync = true;
    this.syncAttempts++;

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TimeSync] Starting time synchronization (attempt ${this.syncAttempts})`);
      }
      
      let timeData = null;
      
      // Try AWS first (same infrastructure as our auth tokens)
      try {
        timeData = await this.fetchAWSServerTime();
        if (process.env.NODE_ENV === 'development') {
          console.log(`[TimeSync] AWS time sync successful (RTT: ${timeData.roundTripTime}ms)`);
        }
      } catch (awsError) {
        // Fall back to public time API
        timeData = await this.fetchFallbackTime();
        if (process.env.NODE_ENV === 'development') {
          console.log(`[TimeSync] Fallback time sync successful (RTT: ${timeData.roundTripTime}ms)`);
        }
      }

      if (timeData) {
        this.offset = timeData.serverTime - timeData.clientTime;
        this.lastSync = Date.now();
        this.fallbackToClientTime = false;
        this.syncAttempts = 0; // Reset on success
        
        // Save to cache
        this.saveCachedOffset();
        
        const offsetMinutes = Math.floor(this.offset / 60);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[TimeSync] Time synchronized successfully:`);
          console.log(`  - Source: ${timeData.source}`);
          console.log(`  - Offset: ${this.offset}s (${offsetMinutes} minutes)`);
          console.log(`  - Client time was ${this.offset > 0 ? 'behind' : 'ahead'} by ${Math.abs(offsetMinutes)} minutes`);
        }
        
        // Always warn about significant clock skew (important for users)
        if (Math.abs(offsetMinutes) > 30) {
          console.warn(`[TimeSync] Large clock offset detected: ${Math.abs(offsetMinutes)} minutes ${this.offset > 0 ? 'behind' : 'ahead'}. Consider syncing your system clock.`);
        }
        
        return this.offset;
      }

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[TimeSync] All time sync attempts failed:', error);
      }
      
      // After max attempts, fall back to client time with warning
      if (this.syncAttempts >= this.maxSyncAttempts) {
        console.warn('[TimeSync] Time sync failed, using client time');
        this.fallbackToClientTime = true;
        this.syncAttempts = 0; // Reset for next cycle
      }
      
    } finally {
      this.isSync = false;
    }

    return this.offset;
  }

  /**
   * Get current server time (Unix timestamp in seconds)
   */
  getServerTime() {
    if (this.fallbackToClientTime) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[TimeSync] Using client time due to sync failures');
      }
      return Math.floor(Date.now() / 1000);
    }
    
    return Math.floor(Date.now() / 1000) + this.offset;
  }

  /**
   * Get synchronization status
   */
  getSyncStatus() {
    return {
      isSync: this.isSync,
      lastSync: this.lastSync,
      offset: this.offset,
      offsetMinutes: Math.floor(this.offset / 60),
      fallbackMode: this.fallbackToClientTime,
      syncAttempts: this.syncAttempts
    };
  }

  /**
   * Start automatic periodic synchronization
   */
  startPeriodicSync() {
    // Initial sync
    this.syncTime();
    
    // Set up periodic sync
    setInterval(() => {
      this.syncTime();
    }, this.syncInterval);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[TimeSync] Periodic synchronization started (every 30 minutes)');
    }
  }

  /**
   * Check if resync is needed
   */
  needsSync() {
    if (!this.lastSync) return true;
    if (this.fallbackToClientTime) return true;
    return (Date.now() - this.lastSync) > this.syncInterval;
  }
}

// Create singleton instance
const timeSync = new TimeSync();

export default timeSync;