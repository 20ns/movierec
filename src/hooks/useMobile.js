// src/hooks/useMobile.js
// React hooks for mobile responsiveness and PWA functionality

import { useState, useEffect, useCallback, useRef } from 'react';
import pwaService, { PWA_EVENTS } from '../services/pwaService';

/**
 * Hook for detecting mobile devices and screen characteristics
 * @returns {Object} Mobile detection and screen information
 */
export const useMobileDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouch: false,
    screenSize: 'desktop',
    orientation: 'portrait',
    pixelRatio: 1
  }));

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent.toLowerCase();
      const isTouch = 'ontouchstart' in window;
      const pixelRatio = window.devicePixelRatio || 1;
      
      // Device type detection
      const isMobile = width <= 768 || /android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTablet = !isMobile && (width <= 1024 || /ipad|tablet/i.test(userAgent));
      const isDesktop = !isMobile && !isTablet;
      
      // Screen size categories
      let screenSize = 'desktop';
      if (width <= 480) screenSize = 'mobile-sm';
      else if (width <= 768) screenSize = 'mobile';
      else if (width <= 1024) screenSize = 'tablet';
      else if (width <= 1440) screenSize = 'desktop';
      else screenSize = 'desktop-lg';
      
      // Orientation
      const orientation = width > height ? 'landscape' : 'portrait';
      
      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouch,
        screenSize,
        orientation,
        pixelRatio,
        viewport: { width, height },
        userAgent
      });
    };

    updateDeviceInfo();
    
    const resizeObserver = new ResizeObserver(updateDeviceInfo);
    resizeObserver.observe(document.documentElement);
    
    window.addEventListener('orientationchange', updateDeviceInfo);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};

/**
 * Hook for PWA installation management
 * @returns {Object} PWA installation state and controls
 */
export const usePWAInstall = () => {
  const [installState, setInstallState] = useState(() => ({
    canInstall: false,
    isInstalled: false,
    isStandalone: false,
    showPrompt: false
  }));

  const [installPrompting, setInstallPrompting] = useState(false);

  useEffect(() => {
    const updateState = () => {
      const status = pwaService.getStatus();
      const promptInfo = pwaService.getInstallPromptInfo();
      
      setInstallState({
        canInstall: status.canInstall,
        isInstalled: status.isInstalled,
        isStandalone: status.isStandalone,
        showPrompt: promptInfo.shouldShow && !promptInfo.shown
      });
    };

    updateState();

    const unsubscribeInstall = pwaService.addListener(PWA_EVENTS.INSTALL_PROMPT, updateState);
    const unsubscribeInstalled = pwaService.addListener(PWA_EVENTS.APP_INSTALLED, updateState);

    return () => {
      unsubscribeInstall();
      unsubscribeInstalled();
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (installPrompting) return false;
    
    setInstallPrompting(true);
    
    try {
      const result = await pwaService.forceInstallPrompt();
      return result;
    } finally {
      setInstallPrompting(false);
    }
  }, [installPrompting]);

  const dismissPrompt = useCallback(() => {
    setInstallState(prev => ({ ...prev, showPrompt: false }));
  }, []);

  return {
    ...installState,
    installPrompting,
    promptInstall,
    dismissPrompt
  };
};

/**
 * Hook for PWA updates management
 * @returns {Object} Update state and controls
 */
export const usePWAUpdates = () => {
  const [updateState, setUpdateState] = useState(() => ({
    updateAvailable: false,
    updating: false,
    offlineReady: false
  }));

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setUpdateState(prev => ({ ...prev, updateAvailable: true }));
    };

    const handleOfflineReady = () => {
      setUpdateState(prev => ({ ...prev, offlineReady: true }));
    };

    const handleUpdateApplied = () => {
      setUpdateState(prev => ({ 
        ...prev, 
        updateAvailable: false, 
        updating: false 
      }));
    };

    const unsubscribeUpdate = pwaService.addListener(PWA_EVENTS.UPDATE_AVAILABLE, handleUpdateAvailable);
    const unsubscribeOffline = pwaService.addListener(PWA_EVENTS.OFFLINE_READY, handleOfflineReady);
    const unsubscribeApplied = pwaService.addListener(PWA_EVENTS.UPDATE_APPLIED, handleUpdateApplied);

    return () => {
      unsubscribeUpdate();
      unsubscribeOffline();
      unsubscribeApplied();
    };
  }, []);

  const applyUpdate = useCallback(async () => {
    if (updateState.updating) return false;
    
    setUpdateState(prev => ({ ...prev, updating: true }));
    
    try {
      return await pwaService.applyUpdate();
    } catch (error) {
      setUpdateState(prev => ({ ...prev, updating: false }));
      throw error;
    }
  }, [updateState.updating]);

  return {
    ...updateState,
    applyUpdate
  };
};

/**
 * Hook for responsive breakpoints
 * @param {Object} breakpoints - Custom breakpoints object
 * @returns {Object} Current breakpoint information
 */
export const useBreakpoints = (customBreakpoints = {}) => {
  const defaultBreakpoints = {
    sm: 480,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  };

  const breakpoints = { ...defaultBreakpoints, ...customBreakpoints };

  const [currentBreakpoint, setCurrentBreakpoint] = useState('');
  const [matches, setMatches] = useState({});

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth;
      const newMatches = {};
      let current = '';

      for (const [name, size] of Object.entries(breakpoints)) {
        const isMatch = width >= size;
        newMatches[name] = isMatch;
        
        if (isMatch) {
          current = name;
        }
      }

      setCurrentBreakpoint(current);
      setMatches(newMatches);
    };

    updateBreakpoints();
    
    window.addEventListener('resize', updateBreakpoints);
    return () => window.removeEventListener('resize', updateBreakpoints);
  }, [breakpoints]);

  return {
    current: currentBreakpoint,
    matches,
    breakpoints,
    isMobile: !matches.md,
    isTablet: matches.md && !matches.lg,
    isDesktop: matches.lg
  };
};

/**
 * Hook for touch gestures
 * @param {Object} options - Gesture configuration
 * @returns {Object} Touch gesture handlers
 */
export const useTouchGestures = (options = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onTap,
    onLongPress,
    threshold = 50,
    longPressDelay = 500
  } = options;

  const touchState = useRef({
    startTouch: null,
    startTime: null,
    longPressTimer: null,
    initialDistance: null
  });

  const handleTouchStart = useCallback((event) => {
    const touch = event.touches[0];
    const now = Date.now();
    
    touchState.current = {
      startTouch: { x: touch.clientX, y: touch.clientY },
      startTime: now,
      longPressTimer: null,
      initialDistance: event.touches.length === 2 ? getDistance(event.touches[0], event.touches[1]) : null
    };

    // Start long press timer
    if (onLongPress) {
      touchState.current.longPressTimer = setTimeout(() => {
        onLongPress(event);
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay]);

  const handleTouchMove = useCallback((event) => {
    if (!touchState.current.startTouch) return;

    // Clear long press timer on move
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
      touchState.current.longPressTimer = null;
    }

    // Handle pinch gesture
    if (event.touches.length === 2 && onPinch && touchState.current.initialDistance) {
      const currentDistance = getDistance(event.touches[0], event.touches[1]);
      const scale = currentDistance / touchState.current.initialDistance;
      onPinch({ scale, event });
    }
  }, [onPinch]);

  const handleTouchEnd = useCallback((event) => {
    if (!touchState.current.startTouch) return;

    const endTouch = event.changedTouches[0];
    const deltaX = endTouch.clientX - touchState.current.startTouch.x;
    const deltaY = endTouch.clientY - touchState.current.startTouch.y;
    const deltaTime = Date.now() - touchState.current.startTime;
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

    // Clear long press timer
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
      touchState.current.longPressTimer = null;
    }

    // Handle tap (short touch with minimal movement)
    if (distance < threshold && deltaTime < longPressDelay && onTap) {
      onTap(event);
    }
    // Handle swipe gestures
    else if (distance >= threshold) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight({ deltaX, deltaY, distance, event });
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft({ deltaX, deltaY, distance, event });
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown({ deltaX, deltaY, distance, event });
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp({ deltaX, deltaY, distance, event });
        }
      }
    }

    touchState.current = {
      startTouch: null,
      startTime: null,
      longPressTimer: null,
      initialDistance: null
    };
  }, [threshold, longPressDelay, onTap, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};

/**
 * Hook for safe area insets (iOS notch/home indicator)
 * @returns {Object} Safe area inset values
 */
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0', 10)
      });
    };

    updateSafeArea();
    
    window.addEventListener('orientationchange', updateSafeArea);
    window.addEventListener('resize', updateSafeArea);
    
    return () => {
      window.removeEventListener('orientationchange', updateSafeArea);
      window.removeEventListener('resize', updateSafeArea);
    };
  }, []);

  return safeArea;
};

/**
 * Hook for viewport units that work correctly on mobile
 * @returns {Object} Reliable viewport dimensions
 */
export const useViewport = () => {
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    vh: 0,
    vw: 0
  });

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setViewport({
        width,
        height,
        vh: height / 100,
        vw: width / 100
      });
      
      // Update CSS custom properties for consistent viewport units
      document.documentElement.style.setProperty('--vh', `${height / 100}px`);
      document.documentElement.style.setProperty('--vw', `${width / 100}px`);
    };

    updateViewport();
    
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', () => {
      // Delay to ensure orientation change is complete
      setTimeout(updateViewport, 100);
    });
    
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  return viewport;
};

/**
 * Hook for keyboard visibility detection on mobile
 * @returns {Object} Keyboard visibility state
 */
export const useKeyboardDetection = () => {
  const [keyboardState, setKeyboardState] = useState({
    isVisible: false,
    height: 0
  });

  const initialViewportHeight = useRef(window.innerHeight);

  useEffect(() => {
    const updateKeyboardState = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight.current - currentHeight;
      const threshold = 150; // Minimum height change to consider keyboard open
      
      const isVisible = heightDifference > threshold;
      
      setKeyboardState({
        isVisible,
        height: isVisible ? heightDifference : 0
      });
    };

    window.addEventListener('resize', updateKeyboardState);
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        initialViewportHeight.current = window.innerHeight;
        updateKeyboardState();
      }, 500);
    });
    
    return () => {
      window.removeEventListener('resize', updateKeyboardState);
      window.removeEventListener('orientationchange', updateKeyboardState);
    };
  }, []);

  return keyboardState;
};

// ===== UTILITY FUNCTIONS =====

const getDistance = (touch1, touch2) => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

// ===== EXPORTS =====
export default {
  useMobileDetection,
  usePWAInstall,
  usePWAUpdates,
  useBreakpoints,
  useTouchGestures,
  useSafeArea,
  useViewport,
  useKeyboardDetection
};