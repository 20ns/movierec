import React, { useEffect, useRef } from 'react';

const AdUnit = ({ className = "", style = {} }) => {
  const adRef = useRef(null);

  useEffect(() => {
    // Only attempt to load ads if we're in a browser environment and the AdSense script is loaded
    if (typeof window !== 'undefined' && adRef.current && window.adsbygoogle) {
      try {
        // Push the ad to AdSense for rendering
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('Error loading AdSense ad:', error);
      }
    }
  }, []);

  return (
    <div className={`ad-container my-8 mx-auto ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          overflow: 'hidden',
          borderRadius: '0.5rem',
        }}
        data-ad-client="ca-pub-5077058434275861"
        data-ad-slot="1623198112"
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={adRef}
      />
    </div>
  );
};

export default AdUnit;
