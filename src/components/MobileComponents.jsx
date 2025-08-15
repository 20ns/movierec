// src/components/MobileComponents.jsx
// Mobile-first responsive UI components with enhanced touch interactions

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  HomeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

import { useMobileDetection, useTouchGestures, useSafeArea, usePWAInstall } from '../hooks/useMobile';

// ===== MOBILE NAVIGATION DRAWER =====
export const MobileNavDrawer = ({ 
  isOpen, 
  onClose, 
  children,
  position = 'left',
  overlay = true,
  swipeToClose = true 
}) => {
  const safeArea = useSafeArea();
  const { isMobile } = useMobileDetection();

  const gestures = useTouchGestures({
    onSwipeLeft: position === 'left' ? onClose : undefined,
    onSwipeRight: position === 'right' ? onClose : undefined,
    threshold: 100
  });

  const drawerVariants = {
    open: {
      x: 0,
      transition: { type: 'spring', damping: 25, stiffness: 200 }
    },
    closed: {
      x: position === 'left' ? '-100%' : '100%',
      transition: { type: 'spring', damping: 25, stiffness: 200 }
    }
  };

  const overlayVariants = {
    open: { opacity: 1 },
    closed: { opacity: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          {overlay && (
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={overlayVariants}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={onClose}
            />
          )}

          {/* Drawer */}
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={drawerVariants}
            className={`
              fixed top-0 ${position === 'left' ? 'left-0' : 'right-0'} 
              h-full w-80 max-w-[85vw] bg-white dark:bg-gray-900 
              shadow-xl z-50 overflow-y-auto
            `}
            style={{
              paddingTop: safeArea.top,
              paddingBottom: safeArea.bottom
            }}
            {...(swipeToClose ? gestures : {})}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ===== MOBILE BOTTOM SHEET =====
export const MobileBottomSheet = ({ 
  isOpen, 
  onClose, 
  children,
  snapPoints = ['25%', '50%', '90%'],
  initialSnap = 1,
  showHandle = true 
}) => {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const safeArea = useSafeArea();

  const handleDragEnd = useCallback((event, info) => {
    setIsDragging(false);
    
    const { offset, velocity } = info;
    const windowHeight = window.innerHeight;
    
    // Determine new snap point based on drag distance and velocity
    if (offset.y > 100 || velocity.y > 500) {
      if (currentSnap < snapPoints.length - 1) {
        setCurrentSnap(currentSnap + 1);
      } else {
        onClose();
      }
    } else if (offset.y < -100 || velocity.y < -500) {
      if (currentSnap > 0) {
        setCurrentSnap(currentSnap - 1);
      }
    }
  }, [currentSnap, snapPoints.length, onClose]);

  const getSnapHeight = (snapIndex) => {
    const snap = snapPoints[snapIndex];
    if (typeof snap === 'string' && snap.endsWith('%')) {
      return (window.innerHeight * parseInt(snap, 10)) / 100;
    }
    return parseInt(snap, 10);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ 
              y: window.innerHeight - getSnapHeight(currentSnap),
              transition: isDragging ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }
            }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            className={`
              fixed bottom-0 left-0 right-0 
              bg-white dark:bg-gray-900 rounded-t-3xl shadow-xl z-50
              overflow-hidden
            `}
            style={{
              height: window.innerHeight,
              paddingBottom: safeArea.bottom
            }}
          >
            {/* Drag Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
            )}

            {/* Content */}
            <div className="h-full overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ===== SWIPEABLE CARDS =====
export const SwipeableCard = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  swipeThreshold = 100,
  className = '' 
}) => {
  const [exitDirection, setExitDirection] = useState(0);

  const handleDragEnd = useCallback((event, info) => {
    const { offset, velocity } = info;
    const swipe = Math.abs(offset.x) > swipeThreshold || Math.abs(velocity.x) > 500;

    if (swipe) {
      if (offset.x > 0) {
        setExitDirection(1);
        onSwipeRight?.();
      } else {
        setExitDirection(-1);
        onSwipeLeft?.();
      }
    }
  }, [swipeThreshold, onSwipeLeft, onSwipeRight]);

  const cardVariants = {
    enter: { x: 0, rotate: 0, opacity: 1 },
    exit: (direction) => ({
      x: direction * 300,
      rotate: direction * 30,
      opacity: 0,
      transition: { duration: 0.3 }
    })
  };

  return (
    <motion.div
      custom={exitDirection}
      variants={cardVariants}
      initial="enter"
      animate="enter"
      exit="exit"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      className={`cursor-grab active:cursor-grabbing ${className}`}
      whileDrag={{ scale: 1.05 }}
    >
      {children}
    </motion.div>
  );
};

// ===== PULL TO REFRESH =====
export const PullToRefresh = ({ 
  children, 
  onRefresh, 
  refreshThreshold = 80,
  isRefreshing = false 
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const handlePanStart = useCallback(() => {
    if (window.scrollY === 0) {
      setIsPulling(true);
    }
  }, []);

  const handlePan = useCallback((event, info) => {
    if (!isPulling || window.scrollY > 0) return;

    const distance = Math.max(0, info.offset.y);
    setPullDistance(Math.min(distance, refreshThreshold * 1.5));
  }, [isPulling, refreshThreshold]);

  const handlePanEnd = useCallback((event, info) => {
    if (!isPulling) return;

    setIsPulling(false);
    
    if (pullDistance >= refreshThreshold) {
      onRefresh?.();
    }
    
    setPullDistance(0);
  }, [isPulling, pullDistance, refreshThreshold, onRefresh]);

  const pullProgress = Math.min(pullDistance / refreshThreshold, 1);

  return (
    <motion.div
      onPanStart={handlePanStart}
      onPan={handlePan}
      onPanEnd={handlePanEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-0 right-0 flex justify-center items-center h-16 bg-gray-50 dark:bg-gray-800 z-10"
          >
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : pullProgress * 360 }}
              transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
              className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        animate={{ 
          y: isPulling ? pullDistance : (isRefreshing ? refreshThreshold : 0)
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// ===== MOBILE ACTION SHEET =====
export const MobileActionSheet = ({ 
  isOpen, 
  onClose, 
  actions = [],
  title,
  cancelText = 'Cancel' 
}) => {
  const safeArea = useSafeArea();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Action Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 z-50"
            style={{ paddingBottom: safeArea.bottom }}
          >
            <div className="px-4 pt-6 pb-4">
              {title && (
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h3>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 mb-4">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onPress?.();
                      onClose();
                    }}
                    disabled={action.disabled}
                    className={`
                      w-full py-3 px-4 rounded-xl text-left font-medium transition-colors
                      ${action.destructive 
                        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                        : 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                      ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex items-center">
                      {action.icon && (
                        <action.icon className="w-5 h-5 mr-3" />
                      )}
                      <span>{action.title}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Cancel Button */}
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium text-gray-900 dark:text-white transition-colors"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ===== PWA INSTALL PROMPT =====
export const PWAInstallPrompt = ({ 
  onInstall, 
  onDismiss,
  className = '' 
}) => {
  const { canInstall, isInstalled, showPrompt } = usePWAInstall();

  if (!showPrompt || isInstalled || !canInstall) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`
        bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-4 shadow-lg
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <HomeIcon className="w-5 h-5 mr-2" />
            <h3 className="font-semibold">Install App</h3>
          </div>
          <p className="text-sm opacity-90 mb-3">
            Add MovieRec to your home screen for quick access and a better experience.
          </p>
          
          <div className="flex space-x-2">
            <button
              onClick={onInstall}
              className="flex items-center px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
              Install
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-2 text-sm font-medium opacity-75 hover:opacity-100 transition-opacity"
            >
              Not now
            </button>
          </div>
        </div>
        
        <button
          onClick={onDismiss}
          className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};

// ===== MOBILE TAB BAR =====
export const MobileTabBar = ({ 
  tabs = [], 
  activeTab, 
  onTabChange,
  className = '' 
}) => {
  const safeArea = useSafeArea();

  return (
    <div 
      className={`
        fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 
        border-t border-gray-200 dark:border-gray-700 z-40
        ${className}
      `}
      style={{ paddingBottom: safeArea.bottom }}
    >
      <div className="flex">
        {tabs.map((tab, index) => (
          <button
            key={tab.id || index}
            onClick={() => onTabChange(tab.id || index)}
            className={`
              flex-1 flex flex-col items-center justify-center py-2 px-1
              transition-colors duration-200
              ${(activeTab === tab.id || activeTab === index)
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {tab.icon && (
              <tab.icon className="w-6 h-6 mb-1" />
            )}
            <span className="text-xs font-medium truncate">
              {tab.label}
            </span>
            {tab.badge && (
              <div className="absolute top-1 right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {tab.badge}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// ===== MOBILE FLOATING ACTION BUTTON =====
export const MobileFAB = ({ 
  icon: Icon, 
  onClick, 
  actions = [],
  extended = false,
  label,
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const safeArea = useSafeArea();

  const toggleExpanded = () => {
    if (actions.length > 0) {
      setIsExpanded(!isExpanded);
    } else {
      onClick?.();
    }
  };

  return (
    <>
      {/* Overlay for expanded FAB */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Action Menu */}
      <AnimatePresence>
        {isExpanded && actions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-20 right-4 z-50"
            style={{ bottom: 80 + safeArea.bottom }}
          >
            <div className="space-y-3">
              {actions.map((action, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    transition: { delay: index * 0.1 }
                  }}
                  onClick={() => {
                    action.onPress?.();
                    setIsExpanded(false);
                  }}
                  className="flex items-center bg-white dark:bg-gray-800 shadow-lg rounded-full px-4 py-3 hover:shadow-xl transition-shadow"
                >
                  {action.icon && (
                    <action.icon className="w-5 h-5 mr-2 text-gray-700 dark:text-gray-300" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={toggleExpanded}
        className={`
          fixed bottom-4 right-4 z-50
          ${extended ? 'px-6 py-4' : 'w-14 h-14'}
          bg-indigo-600 hover:bg-indigo-700 
          text-white rounded-full shadow-lg hover:shadow-xl
          transition-all duration-200
          flex items-center justify-center
          ${className}
        `}
        style={{ bottom: 16 + safeArea.bottom }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isExpanded ? 45 : 0 }}
      >
        {Icon && <Icon className={`${extended ? 'w-5 h-5 mr-2' : 'w-6 h-6'}`} />}
        {extended && label && (
          <span className="font-medium">{label}</span>
        )}
      </motion.button>
    </>
  );
};

// ===== EXPORTS =====
export default {
  MobileNavDrawer,
  MobileBottomSheet,
  SwipeableCard,
  PullToRefresh,
  MobileActionSheet,
  PWAInstallPrompt,
  MobileTabBar,
  MobileFAB
};