import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

// Touch gesture hook for swipe actions
export const useSwipeGestures = ({ 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  threshold = 50,
  velocity = 500 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragConstraints = { left: 0, right: 0, top: 0, bottom: 0 };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const { offset, velocity: dragVelocity } = info;
    
    // Check horizontal swipes
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
      if (offset.x > threshold || dragVelocity.x > velocity) {
        onSwipeRight && onSwipeRight();
      } else if (offset.x < -threshold || dragVelocity.x < -velocity) {
        onSwipeLeft && onSwipeLeft();
      }
    } 
    // Check vertical swipes
    else {
      if (offset.y > threshold || dragVelocity.y > velocity) {
        onSwipeDown && onSwipeDown();
      } else if (offset.y < -threshold || dragVelocity.y < -velocity) {
        onSwipeUp && onSwipeUp();
      }
    }
  };

  return {
    drag: true,
    dragConstraints,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    isDragging
  };
};

// Swipeable media card wrapper
export const SwipeableMediaCard = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  leftAction = 'Add to Watchlist',
  rightAction = 'Like',
  disabled = false 
}) => {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  const leftActionOpacity = useTransform(x, [0, 75, 150], [0, 0.8, 1]);
  const rightActionOpacity = useTransform(x, [-150, -75, 0], [1, 0.8, 0]);
  
  const [actionFeedback, setActionFeedback] = useState(null);

  const handleDragEnd = (event, info) => {
    const { offset, velocity } = info;
    
    if (disabled) {
      x.set(0);
      return;
    }

    // Determine action based on distance and velocity
    if (offset.x > 100 || velocity.x > 500) {
      // Swipe right - Like action
      setActionFeedback(rightAction);
      onSwipeRight && onSwipeRight();
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
    } else if (offset.x < -100 || velocity.x < -500) {
      // Swipe left - Watchlist action
      setActionFeedback(leftAction);
      onSwipeLeft && onSwipeLeft();
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
    }
    
    // Reset position
    x.set(0);
    
    // Clear feedback after animation
    setTimeout(() => setActionFeedback(null), 2000);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background action indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-4 z-0">
        {/* Left action (watchlist) */}
        <motion.div
          style={{ opacity: rightActionOpacity }}
          className="flex items-center space-x-2 text-blue-400"
        >
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">📚</span>
          </div>
          <span className="text-sm font-medium">{leftAction}</span>
        </motion.div>
        
        {/* Right action (like) */}
        <motion.div
          style={{ opacity: leftActionOpacity }}
          className="flex items-center space-x-2 text-red-400"
        >
          <span className="text-sm font-medium">{rightAction}</span>
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">❤️</span>
          </div>
        </motion.div>
      </div>
      
      {/* Draggable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        style={{ x, opacity }}
        onDragEnd={handleDragEnd}
        className="relative z-10 cursor-grab active:cursor-grabbing"
        whileDrag={{ scale: 0.95 }}
      >
        {children}
      </motion.div>
      
      {/* Action feedback */}
      {actionFeedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium z-20"
        >
          {actionFeedback}
        </motion.div>
      )}
    </div>
  );
};

// Pull to refresh component
export const PullToRefresh = ({ onRefresh, children, disabled = false }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, 100], [0, 1]);
  
  const handleDragStart = () => {
    if (disabled || isRefreshing) return;
    setIsPulling(true);
  };

  const handleDragEnd = async (event, info) => {
    if (disabled || isRefreshing) {
      y.set(0);
      setIsPulling(false);
      return;
    }

    setIsPulling(false);
    
    if (info.offset.y > 80) {
      setIsRefreshing(true);
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        y.set(0);
      }
    } else {
      y.set(0);
    }
  };

  return (
    <div className="relative">
      {/* Pull indicator */}
      <motion.div
        style={{ opacity: pullProgress }}
        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-10 flex flex-col items-center py-2"
      >
        <motion.div
          animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
          className="w-6 h-6 text-gray-400 mb-1"
        >
          🔄
        </motion.div>
        <span className="text-xs text-gray-400">
          {isRefreshing ? 'Refreshing...' : isPulling ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </motion.div>
      
      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        style={{ y }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`${isPulling || isRefreshing ? 'cursor-grabbing' : ''}`}
      >
        {children}
      </motion.div>
    </div>
  );
};

// Long press gesture hook
export const useLongPress = (
  onLongPress,
  onClick,
  { shouldPreventDefault = true, delay = 500 } = {}
) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef();
  const target = useRef();

  const start = useCallback(
    (event) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, {
          passive: false,
        });
        target.current = event.target;
      }
      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      shouldTriggerClick && !longPressTriggered && onClick?.(event);
      setLongPressTriggered(false);
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [shouldPreventDefault, onClick, longPressTriggered]
  );

  return {
    onMouseDown: (e) => start(e),
    onTouchStart: (e) => start(e),
    onMouseUp: (e) => clear(e),
    onMouseLeave: (e) => clear(e, false),
    onTouchEnd: (e) => clear(e),
  };
};

const preventDefault = (event) => {
  if (!isTouchEvent(event)) return;
  if (event.touches.length < 2 && event.preventDefault) {
    event.preventDefault();
  }
};

const isTouchEvent = (event) => {
  return 'touches' in event;
};

// Mobile-optimized infinite scroll
export const MobileInfiniteScroll = ({ 
  children, 
  loadMore, 
  hasMore, 
  loading,
  threshold = 200 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handleScroll = async () => {
      if (!scrollRef.current || isLoading || !hasMore || loading) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        setIsLoading(true);
        
        try {
          await loadMore();
        } finally {
          setIsLoading(false);
        }
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [loadMore, hasMore, loading, threshold, isLoading]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      {children}
      
      {(isLoading || loading) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-8"
        >
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 bg-purple-500 rounded-full"
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default {
  useSwipeGestures,
  SwipeableMediaCard,
  PullToRefresh,
  useLongPress,
  MobileInfiniteScroll
};