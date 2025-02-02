import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

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
  handleSuggestionHover
}) => {
  const inputRef = useRef(null);
  const [localQuery, setLocalQuery] = useState(query);
  const containerRef = useRef(null);

  // Debounced query update
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(localQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [localQuery, setQuery]);

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

  return (
    <div className="relative w-full flex justify-center" style={{ zIndex: 50 }} ref={containerRef}>
      <motion.form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="relative w-full max-w-2xl"
        style={{ zIndex: 50 }}
        animate={{
          scale: isFocused ? 1.02 : 1,
          boxShadow: isFocused
            ? '0 8px 30px rgba(98, 102, 241, 0.2)'
            : '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="flex items-center bg-gradient-to-r from-indigo-50 to-blue-50 backdrop-blur-xl rounded-full border-2 border-indigo-100 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-200/50 transition-all duration-300 shadow-lg">
          <SearchIcon isLoading={isLoading} />
          <InputField 
            inputRef={inputRef}
            localQuery={localQuery}
            setLocalQuery={setLocalQuery}
            setIsFocused={setIsFocused}
            handleKeyDown={handleKeyDown}
          />
          <SubmitButton isLoading={isLoading} />
        </div>
        <SuggestionsDropdown 
          suggestions={suggestions}
          isFocused={isFocused}
          handleSuggestionClick={handleSuggestionClick}
          handleSuggestionHover={handleSuggestionHover}
          inputRef={inputRef}
        />
      </motion.form>
    </div>
  );
});

const SearchIcon = React.memo(({ isLoading }) => (
  <motion.div
    className="pl-4 text-indigo-400"
    animate={{
      scale: isLoading ? [1, 1.2, 1] : 1,
      rotate: isLoading ? 360 : 0,
      transition: { duration: 0.5 } // Keep duration for animation speed, remove repeat
    }}
    style={{ willChange: 'transform' }}
  >
    <MagnifyingGlassIcon className="w-6 h-6" />
  </motion.div>
));

const InputField = React.memo(({ inputRef, localQuery, setLocalQuery, setIsFocused, handleKeyDown }) => (
  <input
    ref={inputRef}
    type="text"
    value={localQuery}
    onChange={(e) => setLocalQuery(e.target.value)}
    onFocus={() => setIsFocused(true)}
    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
    onKeyDown={handleKeyDown}
    placeholder="Search for movies or TV shows..."
    className="flex-grow pl-4 pr-3 py-3 text-lg bg-transparent focus:outline-none placeholder-indigo-300 text-indigo-600 font-medium"
    aria-label="Search for movies or TV shows"
  />
));

const SubmitButton = React.memo(({ isLoading }) => (
  <div className="pr-2">
    <motion.button
      type="submit"
      disabled={isLoading}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="px-5 py-2 text-base bg-gradient-to-br from-indigo-500 to-blue-500 text-white font-semibold rounded-full hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-indigo-200/50 disabled:opacity-75 disabled:cursor-not-allowed"
      style={{ willChange: 'transform' }}
    >
      {isLoading ? 'Searching...' : 'Search'}
    </motion.button>
  </div>
));

const SuggestionsDropdown = React.memo(({ suggestions, isFocused, handleSuggestionClick, handleSuggestionHover, inputRef }) => {
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
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        items[prevIndex].focus();
      } else if (e.key === 'Enter' && currentIndex > -1) {
        e.preventDefault();
        items[currentIndex].click();
      }
    };

    inputRef.current?.addEventListener('keydown', handleArrowKeys);
    return () => inputRef.current?.removeEventListener('keydown', handleArrowKeys);
  }, [isFocused, inputRef]);

  return (
    <AnimatePresence>
      {suggestions.length > 0 && isFocused && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute left-0 right-0 mt-2"
          style={{ zIndex: 100 }}
          ref={dropdownRef}
        >
          <div 
            className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-indigo-50"
            role="listbox"
            aria-labelledby="search-input"
          >
            {suggestions.map((suggestion, index) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
                onClick={handleSuggestionClick}
                onHover={handleSuggestionHover}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const SuggestionItem = React.memo(({ suggestion, index, onClick, onHover }) => {
  const handleClick = useCallback(() => onClick(suggestion), [onClick, suggestion]);
  const handleHover = useCallback(() => onHover(suggestion), [onHover, suggestion]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
      className="cursor-pointer group suggestion-item"
      role="option"
      tabIndex={0}
      onClick={handleClick}
      onMouseEnter={handleHover}
      onFocus={handleHover}
    >
      <div className="px-4 py-2 hover:bg-indigo-50/50 transition-colors duration-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MagnifyingGlassIcon className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-200" />
          <span className="text-base text-indigo-700 group-hover:text-indigo-900 transition-colors duration-200 font-medium">
            {suggestion.title}
          </span>
        </div>
        <span className="text-xs text-indigo-600 px-2 py-1 rounded-full bg-indigo-100 group-hover:bg-indigo-200 transition-colors duration-200">
          {suggestion.type}
        </span>
      </div>
    </motion.div>
  );
});