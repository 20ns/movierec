import React, { useEffect, useRef, useState } from 'react';

const AdUnit = ({ className = "", style = {}, contentBefore = "", contentAfter = "", minContentRatio = 0.3 }) => {
  const adRef = useRef(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Only load ads when we're in a browser and the component is mounted
    // Also ensure the AdSense script is properly loaded
    if (typeof window !== 'undefined' && adRef.current && window.adsbygoogle) {
      try {
        // Check if we have a good content-to-ad ratio to comply with policies
        const hasEnoughContent = 
          contentBefore.length > 0 || 
          contentAfter.length > 0 || 
          document.body.textContent.length * minContentRatio > 500;

        if (hasEnoughContent) {
          // Set a small timeout to ensure content renders first
          const timer = setTimeout(() => {
            try {
              // Push the ad to AdSense for rendering
              (window.adsbygoogle = window.adsbygoogle || []).push({});
              setAdLoaded(true);
            } catch (error) {
              console.error('Error loading AdSense ad:', error);
              setHasError(true);
            }
          }, 1000);
          
          return () => clearTimeout(timer);
        } else {
          // Skip loading the ad if there's not enough content
          console.info('Skipping ad load due to insufficient content ratio');
          setHasError(true);
        }
      } catch (error) {
        console.error('Error during AdSense initialization:', error);
        setHasError(true);
      }
    }
  }, [contentBefore, contentAfter, minContentRatio]);

  // Don't render the ad container if there was an error
  if (hasError) return null;

  return (
    <div className={`ad-container ${adLoaded ? '' : 'min-h-0'} ${className}`} style={style}>
      {contentBefore && <div className="ad-content-before mb-4">{contentBefore}</div>}
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          overflow: 'hidden',
          borderRadius: '0.5rem',
          margin: '0 auto',
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
