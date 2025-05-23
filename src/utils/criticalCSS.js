/**
 * Critical CSS Utilities
 * Provides functionality for extracting and inlining critical CSS
 * for improved performance and reduced time to first paint
 */

// Critical CSS styles that should be inlined
export const CRITICAL_CSS = `
/* Reset and base styles */
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #111827;
  color: #f9fafb;
  line-height: 1.6;
}

/* Loading spinner for initial page load */
.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Header critical styles */
.header-container {
  background-color: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(55, 65, 81, 0.5);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 64px;
}

/* Navigation critical styles */
.nav-link {
  color: #d1d5db;
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: #ffffff;
}

/* Button critical styles */
.btn-primary {
  background: linear-gradient(45deg, #8b5cf6, #06b6d4);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

/* Layout critical styles */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.main-content {
  padding-top: 64px; /* Account for fixed header */
  min-height: 100vh;
}

/* Typography critical styles */
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  line-height: 1.25;
  margin: 0 0 1rem 0;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 2rem; }
h3 { font-size: 1.5rem; }

/* Card critical styles */
.card {
  background-color: rgba(31, 41, 55, 0.8);
  border-radius: 0.75rem;
  border: 1px solid rgba(55, 65, 81, 0.5);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

/* Responsive utilities */
@media (max-width: 768px) {
  .container {
    padding: 0 0.5rem;
  }
  
  h1 { font-size: 2rem; }
  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.25rem; }
}

/* Focus styles for accessibility */
*:focus {
  outline: 2px solid #8b5cf6;
  outline-offset: 2px;
}

/* Reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

/**
 * Injects critical CSS into the document head
 * Should be called as early as possible in the app lifecycle
 */
export function injectCriticalCSS() {
  if (typeof document === 'undefined') {
    return; // Server-side rendering guard
  }

  // Check if critical CSS is already injected
  if (document.getElementById('critical-css')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'critical-css';
  style.type = 'text/css';
  style.textContent = CRITICAL_CSS;
  
  // Insert at the beginning of head for highest priority
  const head = document.head || document.getElementsByTagName('head')[0];
  const firstChild = head.firstChild;
  
  if (firstChild) {
    head.insertBefore(style, firstChild);
  } else {
    head.appendChild(style);
  }
  
  console.log('[CriticalCSS] Injected critical styles');
}

/**
 * Preloads non-critical CSS files
 * @param {string[]} cssFiles - Array of CSS file URLs to preload
 */
export function preloadCSS(cssFiles = []) {
  if (typeof document === 'undefined') {
    return;
  }

  cssFiles.forEach(href => {
    // Check if already preloaded
    if (document.querySelector(`link[href="${href}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    link.onload = () => {
      // Convert to actual stylesheet once loaded
      link.rel = 'stylesheet';
    };
    
    document.head.appendChild(link);
  });
}

/**
 * Loads CSS files asynchronously
 * @param {string} href - CSS file URL
 * @returns {Promise} Promise that resolves when CSS is loaded
 */
export function loadCSSAsync(href) {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    
    document.head.appendChild(link);
  });
}

/**
 * Extracts critical CSS for a specific component or page
 * This is a placeholder for a more sophisticated implementation
 * @param {string} componentName - Name of component to extract CSS for
 * @returns {string} Critical CSS for the component
 */
export function extractCriticalCSS(componentName) {
  // In a production app, this would use tools like:
  // - Critical (https://github.com/addyosmani/critical)
  // - Puppeteer for automated extraction
  // - PostCSS plugins for build-time extraction
  
  const componentStyles = {
    'Header': `
      .header-container { /* header styles */ }
    `,
    'MovieCard': `
      .movie-card { /* movie card styles */ }
    `,
    'BlogPost': `
      .blog-post { /* blog post styles */ }
    `
  };
  
  return componentStyles[componentName] || '';
}

/**
 * Optimizes CSS delivery for better performance
 */
export function optimizeCSSDelivery() {
  if (typeof document === 'undefined') {
    return;
  }

  // Defer non-critical CSS
  const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
  
  nonCriticalCSS.forEach(link => {
    // Convert to preload to avoid render blocking
    link.rel = 'preload';
    link.as = 'style';
    link.onload = () => {
      link.rel = 'stylesheet';
      link.onload = null;
    };
  });
}

/**
 * Generates CSS for above-the-fold content
 * @param {Element} element - DOM element to extract styles for
 * @returns {string} CSS for above-the-fold content
 */
export function generateAboveFoldCSS(element) {
  if (typeof document === 'undefined' || !element) {
    return '';
  }

  const computedStyles = window.getComputedStyle(element);
  const criticalProperties = [
    'display', 'position', 'top', 'left', 'right', 'bottom',
    'width', 'height', 'margin', 'padding', 'border',
    'background', 'color', 'font', 'text-align'
  ];

  let css = '';
  criticalProperties.forEach(prop => {
    const value = computedStyles.getPropertyValue(prop);
    if (value && value !== 'initial' && value !== 'normal') {
      css += `${prop}: ${value}; `;
    }
  });

  return css;
}

/**
 * Critical CSS React component for server-side rendering
 */
export const CriticalCSS = () => {
  if (typeof document !== 'undefined') {
    // Client-side: inject if not already present
    injectCriticalCSS();
    return null;
  }

  // Server-side: return style element
  return (
    <style
      id="critical-css"
      type="text/css"
      dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }}
    />
  );
};

export default {
  CRITICAL_CSS,
  injectCriticalCSS,
  preloadCSS,
  loadCSSAsync,
  extractCriticalCSS,
  optimizeCSSDelivery,
  generateAboveFoldCSS,
  CriticalCSS
};
