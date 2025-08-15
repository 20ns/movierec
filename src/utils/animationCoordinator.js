// src/utils/animationCoordinator.js
// Coordinated animation system for smooth component transitions

import { createComponentLogger, performanceMonitor } from './centralizedLogger';
import loadingStateManager from '../services/loadingStateService';

const logger = createComponentLogger('AnimationCoordinator');

// ===== ANIMATION CONSTANTS =====
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 800
};

export const ANIMATION_EASINGS = {
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
  EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  ELASTIC: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)'
};

export const ANIMATION_TYPES = {
  // Component transitions
  COMPONENT_MOUNT: 'component_mount',
  COMPONENT_UNMOUNT: 'component_unmount',
  COMPONENT_UPDATE: 'component_update',
  
  // Content transitions
  CONTENT_FADE_IN: 'content_fade_in',
  CONTENT_FADE_OUT: 'content_fade_out',
  CONTENT_SLIDE_IN: 'content_slide_in',
  CONTENT_SLIDE_OUT: 'content_slide_out',
  
  // Loading transitions
  LOADING_START: 'loading_start',
  LOADING_COMPLETE: 'loading_complete',
  LOADING_ERROR: 'loading_error',
  
  // User interactions
  BUTTON_PRESS: 'button_press',
  FORM_SUBMIT: 'form_submit',
  MODAL_OPEN: 'modal_open',
  MODAL_CLOSE: 'modal_close'
};

// ===== ANIMATION PRESETS =====
export const ANIMATION_PRESETS = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: ANIMATION_DURATIONS.NORMAL / 1000, ease: ANIMATION_EASINGS.EASE_OUT }
  },

  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: ANIMATION_DURATIONS.NORMAL / 1000, ease: ANIMATION_EASINGS.EASE_OUT }
  },

  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: ANIMATION_DURATIONS.NORMAL / 1000, ease: ANIMATION_EASINGS.EASE_OUT }
  },

  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: ANIMATION_DURATIONS.NORMAL / 1000, ease: ANIMATION_EASINGS.EASE_OUT }
  },

  scaleInBounce: {
    initial: { opacity: 0, scale: 0.3 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.3 },
    transition: { duration: ANIMATION_DURATIONS.SLOW / 1000, ease: ANIMATION_EASINGS.BOUNCE }
  },

  // Slide animations
  slideInLeft: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 },
    transition: { duration: ANIMATION_DURATIONS.NORMAL / 1000, ease: ANIMATION_EASINGS.EASE_OUT }
  },

  slideInRight: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
    transition: { duration: ANIMATION_DURATIONS.NORMAL / 1000, ease: ANIMATION_EASINGS.EASE_OUT }
  },

  // Loading animations
  loadingSpinner: {
    animate: { rotate: 360 },
    transition: { duration: 1, repeat: Infinity, ease: 'linear' }
  },

  loadingPulse: {
    animate: { scale: [1, 1.1, 1] },
    transition: { duration: 2, repeat: Infinity, ease: ANIMATION_EASINGS.EASE_IN_OUT }
  },

  // Stagger animations for lists
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: ANIMATION_DURATIONS.NORMAL / 1000, ease: ANIMATION_EASINGS.EASE_OUT }
  }
};

// ===== ANIMATION COORDINATOR CLASS =====
class AnimationCoordinator {
  constructor() {
    this.activeAnimations = new Map();
    this.animationQueue = [];
    this.isProcessingQueue = false;
    this.globalAnimationState = 'idle';
    this.preferences = {
      respectsReducedMotion: true,
      enableCoordination: true,
      maxConcurrentAnimations: 5
    };
    
    this.setupReducedMotionListener();
    this.initializePerformanceMonitoring();
    
    logger.info('Animation coordinator initialized', {
      preferences: this.preferences
    });
  }

  setupReducedMotionListener() {
    // Respect user's motion preferences
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    this.preferences.respectsReducedMotion = mediaQuery.matches;
    
    mediaQuery.addEventListener('change', (e) => {
      this.preferences.respectsReducedMotion = e.matches;
      logger.info('Motion preference changed', { 
        reducedMotion: e.matches 
      });
    });
  }

  initializePerformanceMonitoring() {
    // Monitor frame rate during animations
    let frameCount = 0;
    let lastTime = performance.now();
    
    const monitorFrameRate = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (this.activeAnimations.size > 0) {
          logger.debug('Animation frame rate', { 
            fps, 
            activeAnimations: this.activeAnimations.size 
          });
          
          // Automatically reduce animation complexity if frame rate drops
          if (fps < 30 && this.activeAnimations.size > 2) {
            this.optimizeForPerformance();
          }
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(monitorFrameRate);
    };
    
    requestAnimationFrame(monitorFrameRate);
  }

  optimizeForPerformance() {
    logger.warn('Performance optimization triggered', {
      activeAnimations: this.activeAnimations.size
    });
    
    // Cancel non-critical animations
    const nonCriticalAnimations = Array.from(this.activeAnimations.values())
      .filter(anim => anim.priority < 3)
      .slice(2); // Keep only 2 low-priority animations
    
    nonCriticalAnimations.forEach(anim => {
      this.cancelAnimation(anim.id);
    });
  }

  // ===== ANIMATION MANAGEMENT =====

  /**
   * Start a coordinated animation
   * @param {string} animationId - Unique animation identifier
   * @param {Object} animationConfig - Animation configuration
   * @param {Object} options - Animation options
   * @returns {Promise} Animation completion promise
   */
  async startAnimation(animationId, animationConfig, options = {}) {
    const timer = performanceMonitor.startTiming(`animation_${animationId}`);
    
    try {
      // Check for reduced motion preference
      if (this.preferences.respectsReducedMotion && !options.forceAnimation) {
        logger.debug('Animation skipped due to reduced motion preference', { animationId });
        timer.end();
        return Promise.resolve();
      }

      // Check concurrent animation limit
      if (this.activeAnimations.size >= this.preferences.maxConcurrentAnimations) {
        logger.debug('Animation queued due to concurrent limit', { 
          animationId,
          activeCount: this.activeAnimations.size 
        });
        
        return this.queueAnimation(animationId, animationConfig, options);
      }

      const animation = {
        id: animationId,
        config: animationConfig,
        options,
        startTime: Date.now(),
        priority: options.priority || 2,
        component: options.component || 'unknown',
        timer,
        status: 'running'
      };

      this.activeAnimations.set(animationId, animation);
      
      // Coordinate with loading states
      if (options.coordinateWithLoading) {
        loadingStateManager.queueAnimation(
          animationId, 
          () => this.executeAnimation(animation),
          {
            priority: options.priority,
            component: options.component
          }
        );
      } else {
        return this.executeAnimation(animation);
      }
      
    } catch (error) {
      timer.end();
      logger.error('Animation start failed', { 
        animationId, 
        error: error.message 
      }, error);
      throw error;
    }
  }

  async executeAnimation(animation) {
    try {
      // Execute the animation (this would integrate with your animation library)
      if (typeof animation.config === 'function') {
        await animation.config();
      } else {
        // Handle object-based animation configs
        await this.handleObjectAnimation(animation);
      }
      
      animation.status = 'completed';
      animation.endTime = Date.now();
      animation.duration = animation.endTime - animation.startTime;
      animation.timer.end();
      
      logger.debug('Animation completed', {
        animationId: animation.id,
        duration: animation.duration,
        component: animation.component
      });
      
      // Clean up and process queue
      this.activeAnimations.delete(animation.id);
      this.processAnimationQueue();
      
      return true;
      
    } catch (error) {
      animation.status = 'failed';
      animation.error = error.message;
      animation.timer.end();
      
      logger.error('Animation execution failed', {
        animationId: animation.id,
        error: error.message
      }, error);
      
      this.activeAnimations.delete(animation.id);
      this.processAnimationQueue();
      
      throw error;
    }
  }

  async handleObjectAnimation(animation) {
    // This is a simplified version - in reality you'd integrate with framer-motion or similar
    return new Promise((resolve) => {
      const duration = animation.config.transition?.duration * 1000 || ANIMATION_DURATIONS.NORMAL;
      setTimeout(resolve, duration);
    });
  }

  queueAnimation(animationId, animationConfig, options) {
    const queueItem = {
      id: animationId,
      config: animationConfig,
      options,
      queuedAt: Date.now(),
      priority: options.priority || 2
    };

    // Insert based on priority
    const insertIndex = this.animationQueue.findIndex(
      item => item.priority < queueItem.priority
    );
    
    if (insertIndex === -1) {
      this.animationQueue.push(queueItem);
    } else {
      this.animationQueue.splice(insertIndex, 0, queueItem);
    }

    logger.debug('Animation queued', {
      animationId,
      queuePosition: insertIndex === -1 ? this.animationQueue.length : insertIndex,
      priority: queueItem.priority
    });

    return new Promise((resolve, reject) => {
      queueItem.resolve = resolve;
      queueItem.reject = reject;
    });
  }

  async processAnimationQueue() {
    if (this.isProcessingQueue || this.animationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (
      this.animationQueue.length > 0 && 
      this.activeAnimations.size < this.preferences.maxConcurrentAnimations
    ) {
      const queueItem = this.animationQueue.shift();
      
      try {
        const result = await this.startAnimation(
          queueItem.id, 
          queueItem.config, 
          queueItem.options
        );
        queueItem.resolve(result);
      } catch (error) {
        queueItem.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  cancelAnimation(animationId) {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.status = 'cancelled';
      animation.timer.end();
      this.activeAnimations.delete(animationId);
      
      logger.debug('Animation cancelled', { animationId });
      this.processAnimationQueue();
    }

    // Remove from queue if present
    const queueIndex = this.animationQueue.findIndex(item => item.id === animationId);
    if (queueIndex !== -1) {
      const queueItem = this.animationQueue.splice(queueIndex, 1)[0];
      queueItem.reject(new Error('Animation cancelled'));
      
      logger.debug('Queued animation cancelled', { animationId });
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Create staggered animations for lists
   * @param {Array} items - Items to animate
   * @param {Object} baseAnimation - Base animation config
   * @param {number} staggerDelay - Delay between animations
   */
  async createStaggeredAnimation(items, baseAnimation, staggerDelay = 100) {
    const animations = items.map((item, index) => {
      const animationId = `stagger_${Date.now()}_${index}`;
      
      return this.startAnimation(animationId, baseAnimation, {
        delay: index * staggerDelay,
        component: 'staggered-list'
      });
    });

    return Promise.all(animations);
  }

  /**
   * Coordinate animations with component lifecycle
   * @param {string} componentName - Component name
   * @param {string} lifecycle - Lifecycle event (mount, update, unmount)
   * @param {Object} customAnimation - Custom animation override
   */
  coordinateComponentAnimation(componentName, lifecycle, customAnimation = null) {
    const animationId = `${componentName}_${lifecycle}_${Date.now()}`;
    
    const defaultAnimations = {
      mount: ANIMATION_PRESETS.fadeInUp,
      update: ANIMATION_PRESETS.fadeIn,
      unmount: ANIMATION_PRESETS.fadeInDown
    };

    const animation = customAnimation || defaultAnimations[lifecycle] || ANIMATION_PRESETS.fadeIn;

    return this.startAnimation(animationId, animation, {
      component: componentName,
      coordinateWithLoading: true,
      priority: lifecycle === 'unmount' ? 1 : 2
    });
  }

  // ===== STATUS AND DEBUGGING =====

  getAnimationStatus() {
    return {
      active: this.activeAnimations.size,
      queued: this.animationQueue.length,
      state: this.globalAnimationState,
      activeAnimations: Array.from(this.activeAnimations.values()).map(anim => ({
        id: anim.id,
        component: anim.component,
        duration: Date.now() - anim.startTime,
        status: anim.status
      })),
      preferences: { ...this.preferences }
    };
  }

  setAnimationPreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    logger.info('Animation preferences updated', { preferences: this.preferences });
  }

  // Cleanup method
  cleanup() {
    this.activeAnimations.forEach(animation => {
      animation.timer.end();
    });
    
    this.activeAnimations.clear();
    this.animationQueue = [];
    
    logger.info('Animation coordinator cleaned up');
  }
}

// ===== SINGLETON INSTANCE =====
const animationCoordinator = new AnimationCoordinator();

// ===== UTILITY FUNCTIONS =====

/**
 * Get optimized animation config based on performance
 * @param {Object} baseConfig - Base animation configuration
 * @returns {Object} Optimized configuration
 */
export const getOptimizedAnimation = (baseConfig) => {
  // Reduce complexity for low-end devices or when many animations are active
  const activeCount = animationCoordinator.getAnimationStatus().active;
  
  if (activeCount > 3) {
    return {
      ...baseConfig,
      transition: {
        ...baseConfig.transition,
        duration: (baseConfig.transition?.duration || 0.3) * 0.7 // Reduce duration
      }
    };
  }
  
  return baseConfig;
};

/**
 * Create entrance animation variant
 * @param {string} direction - Animation direction (up, down, left, right)
 * @param {number} distance - Animation distance in pixels
 * @returns {Object} Animation variant
 */
export const createEntranceAnimation = (direction = 'up', distance = 20) => {
  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance }
  };

  return {
    initial: { opacity: 0, ...directionMap[direction] },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, ...directionMap[direction] },
    transition: { duration: ANIMATION_DURATIONS.NORMAL / 1000, ease: ANIMATION_EASINGS.EASE_OUT }
  };
};

// ===== EXPORTS =====
export { animationCoordinator };
export default animationCoordinator;