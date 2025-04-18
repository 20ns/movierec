import React, { useEffect, useState } from 'react';

/**
 * AdScript component that loads Google AdSense script after content is ready
 * This helps comply with AdSense policies by ensuring ads don't appear on pages without content
 */
const AdScript = () => {
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    // Check if the page has meaningful content before loading AdSense
    const checkContent = () => {
      const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, article, section');
      const hasContent = contentElements.length > 5;
      
      // For safety, also check total text content
      const textContent = document.body.textContent || '';
      const hasEnoughText = textContent.length > 1500;
      
      return hasContent && hasEnoughText;
    };

    // Wait for content to be properly rendered
    const timer = setTimeout(() => {
      if (checkContent()) {
        setContentReady(true);
      } else {
        // Recheck after a short delay if content isn't ready yet
        const recheckTimer = setTimeout(() => {
          if (checkContent()) {
            setContentReady(true);
          }
        }, 2000);
        
        return () => clearTimeout(recheckTimer);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  // Only inject the script when content is ready
  useEffect(() => {
    if (contentReady && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.adClient = 'ca-pub-5077058434275861';
      
      // Only add the script if it doesn't exist yet
      if (!document.querySelector('script[src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
        document.head.appendChild(script);
        console.log('AdSense: Script added to document head');
      } else {
        console.log('AdSense: Script already exists in document');
      }
    }
  }, [contentReady]);

  // This component doesn't render anything visible
  return null;
};

export default AdScript;
