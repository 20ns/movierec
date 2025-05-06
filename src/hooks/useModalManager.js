// src/hooks/useModalManager.js
import { useState, useCallback, useEffect } from 'react';

// Helper for logging
const logHook = (message, data) => {
  console.log(`[useModalManager] ${message}`, data !== undefined ? data : '');
};

export default function useModalManager() {
  const [modalState, setModalState] = useState({
    search: false,
    questionnaire: false,
    favorites: false,
    watchlist: false,
    accountDetails: false,
  });

  const openModal = useCallback((modalName) => {
    logHook(`Opening modal: ${modalName}`);
    setModalState(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName) => {
    logHook(`Closing modal: ${modalName}`);
    setModalState(prev => ({ ...prev, [modalName]: false }));
  }, []);

  const toggleModal = useCallback((modalName) => {
    logHook(`Toggling modal: ${modalName}`);
    setModalState(prev => {
      const newState = { ...prev, [modalName]: !prev[modalName] };
      logHook(`New modal state after toggle for ${modalName}:`, newState); // Add log here
      return newState;
    });
  }, []);

  // Specific effect for search modal scroll lock
  useEffect(() => {
    if (modalState.search) {
      const scrollY = window.scrollY;
      const body = document.body;
      const html = document.documentElement;

      // Store original styles
      const originalBodyPosition = body.style.position;
      const originalBodyTop = body.style.top;
      const originalBodyWidth = body.style.width;
      const originalBodyOverscroll = body.style.overscrollBehavior;
      const originalHtmlOverflow = html.style.overflow;
      const originalHtmlOverscroll = html.style.overscrollBehavior;

      // Apply lock styles
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%'; // Prevent width changes
      body.style.overscrollBehavior = 'none';
      html.style.overflow = 'hidden';
      html.style.overscrollBehavior = 'none';

      logHook('Search modal opened, scroll locked at', scrollY);

      return () => {
        // Restore original styles
        body.style.position = originalBodyPosition;
        body.style.top = originalBodyTop;
        body.style.width = originalBodyWidth;
        body.style.overscrollBehavior = originalBodyOverscroll;
        body.style.left = ''; // Clear potentially added styles
        body.style.right = ''; // Clear potentially added styles
        html.style.overflow = originalHtmlOverflow;
        html.style.overscrollBehavior = originalHtmlOverscroll;

        // Restore scroll position
        window.scrollTo(0, scrollY);
        logHook('Search modal closed, scroll restored to', scrollY);
      };
    }
  }, [modalState.search]);

  return {
    modalState,
    openModal,
    closeModal,
    toggleModal,
  };
}