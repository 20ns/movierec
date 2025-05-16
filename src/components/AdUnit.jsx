import React, { useEffect, useRef, useState } from 'react';

const AdUnit = ({ className = "", style = {}, contentBefore = "", contentAfter = "" }) => {
  const adRef = useRef(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [visibleForDuration, setVisibleForDuration] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Function to check if the page has sufficient content
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
      const hasEnoughText = textContent.trim().length > 1000; // Increased from 500
      
      // Check if scrollable content exists (indicates substantial content)
      const hasScrollableContent = document.body.scrollHeight > window.innerHeight * 1.5;
      
      // Check if at least some media is loaded
      const hasMedia = mediaItems.length > 0;
      
      // Combined check - need to meet multiple criteria
      if ((hasEnoughElements && hasEnoughText) || (hasScrollableContent && hasEnoughText) || (hasEnoughElements && hasMedia && textContent.length > 800)) {
        if (!contentReady) {
          setContentReady(true);
          
          // Start timer to ensure content has been visible for a few seconds
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setVisibleForDuration(true);
          }, 2000); // Wait 2 seconds after content is detected
        }
      } else {
        if (contentReady) {
          setContentReady(false);
          setVisibleForDuration(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        }
      }
    };

    // Check content immediately when the component mounts
    checkContent();

    // Check periodically in case content loads dynamically
    const intervalId = setInterval(checkContent, 2000);

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [contentReady]);

  useEffect(() => {
    // Load the ad only when content is ready AND it's been visible for the minimum duration
    if (
      contentReady &&
      visibleForDuration &&
      typeof window !== 'undefined' &&
      adRef.current &&
      window.adsbygoogle &&
      !adLoaded
    ) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdLoaded(true);
      } catch (error) {
        setHasError(true);
      }
    }
  }, [contentReady, visibleForDuration, adLoaded]);

  // Don't render anything until content is ready AND visible for minimum duration
  if (!contentReady || !visibleForDuration) {
    return null;
  }

  if (hasError) {
    return null;
  }

  // Only render the ad once content is verified and has been visible for the minimum time
  return (
    <div className={`ad-container mx-auto ${adLoaded ? '' : 'min-h-0'} ${className}`} style={style}>
      {contentBefore && <div className="ad-content-before mb-4">{contentBefore}</div>}
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          overflow: 'hidden',
          borderRadius: '0.5rem',
          margin: '0 auto',
          minHeight: '90px',
          backgroundColor: 'transparent',
          transition: 'opacity 0.3s ease',
          opacity: adLoaded ? 1 : 0.4
        }}
        data-ad-client="ca-pub-5077058434275861"
        data-ad-slot="1623198112"
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={adRef}
      />
      {contentAfter && <div className="ad-content-after mt-4">{contentAfter}</div>}
    </div>
  );
};

export default AdUnit;