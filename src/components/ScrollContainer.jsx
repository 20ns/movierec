import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * ScrollContainer - A component that provides custom scrolling behavior with visual feedback
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render within the scroll container
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.style - Inline styles to apply
 * @param {string} props.maxHeight - Maximum height of the container (e.g., "500px", "50vh")
 * @param {boolean} props.showShadows - Whether to show scroll shadow indicators
 * @param {function} props.onScroll - Scroll event handler
 */
const ScrollContainer = ({ 
  children, 
  className = "", 
  style = {}, 
  maxHeight = "auto",
  showShadows = true,
  onScroll = null
}) => {
  const containerRef = useRef(null);
  const [showTopShadow, setShowTopShadow] = React.useState(false);
  const [showBottomShadow, setShowBottomShadow] = React.useState(false);
  
  const handleScroll = () => {
    if (!containerRef.current || !showShadows) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowTopShadow(scrollTop > 10);
    setShowBottomShadow(scrollTop + clientHeight < scrollHeight - 10);
    
    if (onScroll) onScroll(containerRef.current);
  };
  
  useEffect(() => {
    if (!containerRef.current || !showShadows) return;
    const { scrollHeight, clientHeight } = containerRef.current;
    
    if (scrollHeight > clientHeight) {
      setShowBottomShadow(true);
    }
  }, [children, showShadows]);
  
  const shadowClasses = showShadows ? [
    showTopShadow ? 'shadow-inner-top' : '',
    showBottomShadow ? 'shadow-inner-bottom' : ''
  ].filter(Boolean).join(' ') : '';
  
  return (
    <motion.div
      ref={containerRef}
      className={`custom-scrollbar ${shadowClasses} ${className}`}
      style={{ 
        maxHeight,
        overflowY: 'auto',
        position: 'relative',
        ...style
      }}
      onScroll={handleScroll}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

export default ScrollContainer;
