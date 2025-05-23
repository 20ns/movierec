// Performance optimization utilities for better web crawler support
import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// Memoized component wrapper to prevent unnecessary re-renders
export const withMemo = (Component) => {
  const MemoizedComponent = memo(Component);
  MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name})`;
  return MemoizedComponent;
};

// Debounce utility for search and other frequent operations
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Optimized image loading with intersection observer
export const useImagePreloader = (imageSources = []) => {
  const [loadedImages, setLoadedImages] = useState(new Set());

  useEffect(() => {
    const imagePromises = imageSources.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, src]));
          resolve(src);
        };
        img.onerror = () => resolve(src); // Still resolve to avoid hanging
        img.src = src;
      });
    });

    Promise.all(imagePromises).catch(console.warn);
  }, [imageSources]);

  return loadedImages;
};

// Lazy loading utility for components
export const LazyComponent = ({ children, threshold = 0.1, rootMargin = '50px' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={elementRef}>
      {isVisible ? children : <div style={{ height: '200px' }} />}
    </div>
  );
};

// Optimized scroll handler
export const useOptimizedScroll = (callback, dependencies = []) => {
  const isScrolling = useRef(false);

  const optimizedCallback = useCallback(() => {
    if (!isScrolling.current) {
      requestAnimationFrame(() => {
        callback();
        isScrolling.current = false;
      });
      isScrolling.current = true;
    }
  }, dependencies);

  useEffect(() => {
    window.addEventListener('scroll', optimizedCallback, { passive: true });
    return () => window.removeEventListener('scroll', optimizedCallback);
  }, [optimizedCallback]);
};

// Resource preloader for critical assets
export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontPreload = document.createElement('link');
  fontPreload.rel = 'preload';
  fontPreload.as = 'font';
  fontPreload.type = 'font/woff2';
  fontPreload.crossOrigin = 'anonymous';
  document.head.appendChild(fontPreload);

  // Preload critical API endpoints
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      fetch('/api/trending', { method: 'HEAD' }).catch(() => {});
      fetch('/api/recommendations', { method: 'HEAD' }).catch(() => {});
    });
  }
};

// SEO-friendly link component
export const SEOLink = memo(({ to, children, className, title, ...props }) => {
  return (
    <Link 
      to={to} 
      className={className}
      title={title}
      aria-label={title}
      {...props}
    >
      {children}
    </Link>
  );
});

// Critical CSS inliner (for above-the-fold content)
export const inlineCriticalCSS = () => {
  return `
    .hero-section { 
      display: flex; 
      align-items: center; 
      min-height: 50vh; 
    }
    .loading-skeleton { 
      background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
    }
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
};
