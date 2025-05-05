import React, { useEffect, useState } from 'react';

/**
 * AdScript component that loads Google AdSense script after content is ready
 * This helps comply with AdSense policies by ensuring ads don't appear on pages without content
 */
const AdScript = () => {
  const [contentReady, setContentReady] = useState(false);
  const [visibleForDuration, setVisibleForDuration] = useState(false);

  useEffect(() => {
    // Check if the page has meaningful content before loading AdSense
    const checkContent = () => {
      // Enhanced content detection - look for meaningful content elements
      const paragraphs = document.querySelectorAll('p');
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5');
      const contentContainers = document.querySelectorAll('article, section, .content-container');
      const mediaItems = document.querySelectorAll('img[src]:not([src=""]), video');
      
      // Require more content elements than before
      const hasEnoughElements = 
        paragraphs.length >= 3 && 
        (headings.length + contentContainers.length) >= 2;
      
      // Look for app-specific content containers and meaningful text
      const mainContent = document.querySelector('#root') || document.body;
      const textContent = mainContent ? mainContent.innerText : '';
      const hasEnoughText = textContent.trim().length > 1500; // Keep this higher for global script
      
      // Check if scrollable content exists (indicates substantial content)
      const hasScrollableContent = document.body.scrollHeight > window.innerHeight * 1.5;
      
      // Check if at least some media is loaded
      const hasMedia = mediaItems.length > 0;
      
      // Combined check - need to meet multiple criteria
      return (hasEnoughElements && hasEnoughText) || 
             (hasScrollableContent && hasEnoughText) || 
             (hasEnoughElements && hasMedia && textContent.length > 1000);
    };

    // Initial wait for content
    const initialTimer = setTimeout(() => {
      if (checkContent()) {
        setContentReady(true);
        
        // After content is detected, wait additional time to ensure it's visible
        const visibilityTimer = setTimeout(() => {
          setVisibleForDuration(true);
        }, 2500);
        
        return () => clearTimeout(visibilityTimer);
      } else {
        // If content not ready, check again after a delay
        const recheckTimer = setTimeout(() => {
          if (checkContent()) {
            setContentReady(true);
            
            // Same additional wait for visibility
            const visibilityTimer = setTimeout(() => {
              setVisibleForDuration(true);
            }, 2500);
            
            return () => clearTimeout(visibilityTimer);
          }
        }, 3000);
        
        return () => clearTimeout(recheckTimer);
      }
    }, 1500); // Initial longer wait for page to fully render
    
    return () => clearTimeout(initialTimer);
  }, []);

  // Only inject the script when content is ready and has been visible long enough
  useEffect(() => {
    if (contentReady && visibleForDuration && typeof window !== 'undefined') {
      // Add a final delay to ensure content is properly rendered
      const scriptTimer = setTimeout(() => {
        const script = document.createElement('script');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.dataset.adClient = 'ca-pub-5077058434275861';
        
        // Only add the script if it doesn't exist yet
        if (!document.querySelector('script[src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
          document.head.appendChild(script);
          // console.log('AdSense: Script added to document head after content verified'); // Removed log
        } else {
          // console.log('AdSense: Script already exists in document'); // Removed log
        }
      }, 1000);
      
      return () => clearTimeout(scriptTimer);
    }
  }, [contentReady, visibleForDuration]);

  // This component doesn't render anything visible
  return null;
};

export default AdScript;
