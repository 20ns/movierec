import React, { useEffect, useRef, useState } from 'react';

const AdUnit = ({ className = "", style = {}, contentBefore = "", contentAfter = "" }) => {
  const adRef = useRef(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    // Function to check if the page has sufficient content
    const checkContent = () => {
      // Use a more robust selector that looks for actual content sections
      // This matches the same approach used in AdScript.jsx for consistency
      const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, article, section');
      const hasContent = contentElements.length > 3;
      
      // Look for app-specific content containers
      const mainContent = document.querySelector('#root') || document.body;
      const hasEnoughText = mainContent && mainContent.innerText.trim().length > 500;
      
      if (hasContent && hasEnoughText) {
        if (!contentReady) { // Only update state if it changes
            console.log('AdSense: Sufficient content detected.');
            setContentReady(true);
        }
      } else {
        if (contentReady) { // Only update state if it changes
            console.warn('AdSense: Insufficient content detected. Ad loading paused.');
            setContentReady(false); // Set back to false if content becomes insufficient
        } else if (!contentReady && !hasError) { // Log initial warning only once
            console.warn('AdSense: Initial check - Insufficient content. Waiting for content.');
        }
      }
    };

    // Check content immediately when the component mounts.
    checkContent();

    // Optional: Check periodically in case content loads dynamically after initial mount.
    // Adjust interval as needed, be mindful of performance.
    const intervalId = setInterval(checkContent, 3000); // Check every 3 seconds

    // Cleanup function: clear interval when component unmounts
    return () => {
      clearInterval(intervalId);
    };
    // Dependency array includes contentReady to potentially re-evaluate if needed,
    // though the interval handles periodic checks.
  }, [contentReady, hasError]); // Rerun if contentReady state changes or error occurs

  useEffect(() => {
    // Load the ad only if content is ready, in browser, ad ref exists, and AdSense script is loaded
    if (
      contentReady &&
      typeof window !== 'undefined' &&
      adRef.current &&
      window.adsbygoogle &&
      !adLoaded // Attempt to load only if not already loaded/attempted
    ) {
      try {
        console.log("AdSense: Content ready, attempting to push ad.");
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdLoaded(true); // Mark as loaded/attempted
      } catch (error) {
        console.error('AdSense: Error pushing ad:', error);
        setHasError(true);
      }
    } else if (!contentReady && adLoaded) {
        // If content becomes insufficient after ad was loaded, reset adLoaded?
        // AdSense might handle this, but good to be aware. Resetting might cause layout shifts.
        // setAdLoaded(false);
        console.log("AdSense: Content became insufficient after ad load attempt.");
    } else if (!contentReady) {
        console.log("AdSense: Content not ready, ad push skipped.");
    }
  }, [contentReady, adLoaded]); // Rerun when contentReady changes or adLoaded changes

  // Don’t render the ad container if there’s an error or content isn’t ready
  if (hasError) {
      console.log("AdSense: Ad container not rendered due to error.");
      return null;
  }

  if (!contentReady) {
      console.log("AdSense: Ad container not rendered because content is not ready.");
      // Return null to prevent rendering the ad slot when content is insufficient
      return null;
  }

  // Render the ad unit only if content is ready and no error occurred
  console.log("AdSense: Rendering ad container.");
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
          minHeight: '90px', // Enable minHeight to prevent layout shifts
          backgroundColor: 'transparent', // Ensures ad blends with your site's theme
          transition: 'opacity 0.3s ease', // Smooth fade-in for better UX
          opacity: adLoaded ? 1 : 0.4 // Subtle visual cue for loading state
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