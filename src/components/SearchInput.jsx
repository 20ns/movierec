import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon, 
  ArrowPathIcon, 
  SparklesIcon,
  DocumentTextIcon
} from '@heroicons/react/24/solid';

// Memoized components to prevent unnecessary re-renders
export const SearchInput = React.memo(({
  query,
  setQuery,
  handleSearch,
  isLoading,
  isFocused,
  setIsFocused,
  suggestions,
  handleSuggestionClick,
  handleSuggestionHover,
  searchMode = 'smart' // Accept searchMode prop
}) => {
  const inputRef = useRef(null);
  const [localQuery, setLocalQuery] = useState(query);
  const containerRef = useRef(null);
  const [hasFocus, setHasFocus] = useState(false);

  // Debounced query update
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(localQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [localQuery, setQuery]);

  // Update local query when prop changes
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Keyboard navigation for suggestions
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsFocused(false);
    }
  }, [setIsFocused]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsFocused]);

  // Clear input handler
  const handleClearInput = () => {
    setLocalQuery('');
    inputRef.current?.focus();
  };

  // Handle focus events with animation timing
  const handleInputFocus = () => {
    setHasFocus(true);
    setIsFocused(true);
  };

  const handleInputBlur = () => {
    setHasFocus(false);
    // Delay hiding the dropdown to allow clicking on suggestions
    setTimeout(() => setIsFocused(false), 150);
  };

  // Generate dynamic ring color based on search mode
  const getRingColor = () => {
    if (!hasFocus) return 'focus-within:ring-gray-500/20';
    return searchMode === 'direct' 
      ? 'focus-within:ring-blue-600/30' 
      : 'focus-within:ring-indigo-500/30';
  };

  // Generate dynamic border color based on search mode
  const getBorderColor = () => {
    if (!hasFocus) return 'border-gray-700/50';
    return searchMode === 'direct' 
      ? 'border-blue-600/70' 
      : 'border-indigo-500/70';
  };

  return (
    <div className="relative w-full flex justify-center" style={{ zIndex: 50 }} ref={containerRef}>
      <motion.form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(e);
        }}
        className="relative w-full"
        style={{ zIndex: 50 }}
        animate={{
          scale: hasFocus ? 1.01 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className={`flex items-center bg-gray-800/80 backdrop-blur-md rounded-xl border transition-all duration-300 shadow-xl
          ${getBorderColor()} ${getRingColor()} focus-within:ring-4`}
        >
          <SearchIcon isLoading={isLoading} searchMode={searchMode} />
          
          <InputField
            inputRef={inputRef}
            localQuery={localQuery}
            setLocalQuery={setLocalQuery}
            handleFocus={handleInputFocus}
            handleBlur={handleInputBlur}
            handleKeyDown={handleKeyDown}
            searchMode={searchMode}
          />
          
          {/* Clear button */}
          {localQuery && (
            <motion.button
              type="button"
              onClick={handleClearInput}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex-shrink-0 px-1 text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Clear search"
            >
              <XMarkIcon className="w-5 h-5" />
            </motion.button>
          )}
          
          <SubmitButton isLoading={isLoading} searchMode={searchMode} />
        </div>
        
        <SuggestionsDropdown
          suggestions={suggestions}
          isFocused={isFocused}
          handleSuggestionClick={handleSuggestionClick}
          handleSuggestionHover={handleSuggestionHover}
          inputRef={inputRef}
          searchMode={searchMode}
        />
      </motion.form>
    </div>
  );
});

const SearchIcon = React.memo(({ isLoading, searchMode }) => {
  // Icon color based on search mode and loading state
  const iconColorClass = isLoading 
    ? 'text-white'
    : searchMode === 'direct'
      ? 'text-blue-400' 
      : 'text-indigo-400';
  
  return (
    <motion.div
      className={`pl-3 sm:pl-4 py-2.5 ${iconColorClass}`}
      animate={{
        rotate: isLoading ? [0, 360] : 0,
      }}
      transition={{ 
        repeat: isLoading ? Infinity : 0, 
        duration: isLoading ? 1.5 : 0 
      }}
      title={searchMode === 'direct' ? "Search for exact titles" : "Smart search for movies or shows"}
    >
      {isLoading ? (
        <ArrowPathIcon className="w-5 h-5 sm:w-5 sm:h-5 animate-spin" />
      ) : searchMode === 'direct' ? (
        <DocumentTextIcon className="w-5 h-5 sm:w-5 sm:h-5" />
      ) : (
        <SparklesIcon className="w-5 h-5 sm:w-5 sm:h-5" />
      )}
    </motion.div>
  );
});

const InputField = React.memo(({ 
  inputRef, 
  localQuery, 
  setLocalQuery, 
  handleFocus,
  handleBlur,
  handleKeyDown, 
  searchMode 
}) => {
  // Different placeholder sets based on search mode
  const smartPlaceholders = [
    "Search for movies or TV shows...",
    "Try 'comedy movies with dragons'",
    "Try 'something funny for date night'",
    "Try 'movies like Deadpool but family-friendly'",
    "Try 'documentaries about space from 2020s'",
    "Try 'movies to watch when feeling sad'"
  ];
  
  const directPlaceholders = [
    "Enter exact title to find...",
    "Type 'Solo Leveling' to find the show",
    "Type 'Oppenheimer' to find the movie",
    "Search for any movie or TV show by name"
  ];
  
  // Generate dynamic placeholder text that changes based on search mode
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = searchMode === 'direct' ? directPlaceholders : smartPlaceholders;

  // Rotate placeholders every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={localQuery}
      onChange={(e) => setLocalQuery(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-full px-3 py-3 sm:py-3.5 bg-transparent border-none outline-none text-sm sm:text-base text-gray-100 placeholder-gray-400"
      placeholder={placeholders[placeholderIndex]}
      aria-label={searchMode === 'direct' ? "Direct title search" : "Search for content"}
      autoComplete="off"
    />
  );
});

const SubmitButton = React.memo(({ isLoading, searchMode }) => {
  // Style based on search mode
  const buttonStyles = searchMode === 'direct'
    ? 'bg-blue-600 hover:bg-blue-500 text-white ring-blue-400/50 hover:ring-blue-400/70'
    : 'bg-indigo-600 hover:bg-indigo-500 text-white ring-indigo-400/50 hover:ring-indigo-400/70';

  return (
    <div className="pr-3 sm:pr-3.5">
      <motion.button
        type="submit"
        disabled={isLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg 
          transition-all duration-300 shadow-lg ring-1 hover:ring-2 
          disabled:opacity-70 disabled:cursor-not-allowed
          ${buttonStyles}`
        }
      >
        {isLoading ? 'Searching...' : searchMode === 'direct' ? 'Find' : 'Search'}
      </motion.button>
    </div>
  );
});

const SuggestionsDropdown = React.memo(({ 
  suggestions, 
  isFocused, 
  handleSuggestionClick, 
  handleSuggestionHover, 
  inputRef,
  searchMode
}) => {
  const dropdownRef = useRef(null);

  // Keyboard navigation
  useEffect(() => {
    const handleArrowKeys = (e) => {
      if (!isFocused || !dropdownRef.current) return;

      const items = dropdownRef.current.querySelectorAll('.suggestion-item');
      if (!items.length) return;

      const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
        items[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
        items[prevIndex].focus();
      } else if (e.key === 'Enter' && document.activeElement.classList.contains('suggestion-item')) {
        e.preventDefault();
        document.activeElement.click();
      }
    };

    document.addEventListener('keydown', handleArrowKeys);
    return () => document.removeEventListener('keydown', handleArrowKeys);
  }, [isFocused]);

  if (!suggestions?.length || !isFocused) {
    return null;
  }

  // Get dropdown theme based on search mode
  const dropdownBorderClass = searchMode === 'direct' 
    ? 'border-blue-600/40' 
    : 'border-indigo-700/50';

  const dropdownBgClass = searchMode === 'direct'
    ? 'bg-gray-800/95 from-gray-800/90 to-gray-900/95'
    : 'bg-gray-800/95 from-gray-800/90 to-gray-900/95';

  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl border ${dropdownBorderClass} 
        ${dropdownBgClass} backdrop-blur-lg overflow-hidden z-50`}
      style={{ 
        maxHeight: '300px', 
        overflowY: 'auto',
        scrollBehavior: 'smooth' 
      }}
    >
      <div className="py-1.5">
        {suggestions.map((suggestion, index) => (
          <SuggestionItem
            key={index}
            suggestion={suggestion}
            handleClick={() => handleSuggestionClick(suggestion)}
            handleHover={() => handleSuggestionHover(suggestion)}
            searchMode={searchMode}
          />
        ))}
      </div>
    </motion.div>
  );
});

const SuggestionItem = React.memo(({ suggestion, handleClick, handleHover, searchMode }) => {
  // Determine type indicator color based on suggestion type and search mode
  const getTypeColor = () => {
    if (searchMode === 'direct') {
      return suggestion.type === 'movie'
        ? 'bg-blue-700/80 text-blue-200'
        : 'bg-blue-600/80 text-blue-200';
    }
    
    switch (suggestion.type) {
      case 'movie':
        return 'bg-indigo-700/80 text-indigo-100';
      case 'tv':
        return 'bg-purple-700/80 text-purple-100';
      case 'person':
        return 'bg-emerald-700/80 text-emerald-100';
      case 'query':
        return 'bg-amber-700/80 text-amber-100';
      default:
        return 'bg-gray-700/80 text-gray-100';
    }
  };

  // Hover effect based on search mode
  const hoverBgClass = searchMode === 'direct'
    ? 'hover:bg-blue-800/50 group'
    : 'hover:bg-indigo-800/50 group';

  return (
    <motion.button
      className={`suggestion-item w-full text-left px-4 py-2.5 ${hoverBgClass} flex items-center justify-between transition-colors duration-200`}
      onClick={handleClick}
      onMouseEnter={handleHover}
      whileHover={{ backgroundColor: 'rgba(79, 70, 229, 0.2)' }}
      tabIndex={0}
    >      <div className="flex items-center">
        <MagnifyingGlassIcon className="w-4 h-4 mr-2 text-gray-400 group-hover:text-gray-200" />
        <span className="text-gray-200 group-hover:text-white font-medium">
          {suggestion.title || suggestion.text}
        </span>
      </div>
      
      {suggestion.type && (
        <span className={`text-xs font-medium py-0.5 px-2 rounded-full ${getTypeColor()} ml-2 transition-colors duration-200`}>
          {suggestion.type}
        </span>
      )}
    </motion.button>
  );
});