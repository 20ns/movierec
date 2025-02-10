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

  // --- Dark Mode Styles (Permanent) ---
  const inputFieldClasses = "text-gray-200 placeholder-gray-400"; // Light text and placeholder
  const suggestionDropdownClasses = "bg-gray-700/95 border-gray-600"; // Slightly lighter dark background
  const suggestionItemClasses = "hover:bg-gray-600/50 text-gray-200"; // Dark hover, light text
  const suggestionItemTextClasses = "text-gray-200 group-hover:text-gray-100"; // Lighter text on hover
  const suggestionItemTypeTextClasses = "text-gray-300 bg-gray-600 group-hover:bg-gray-500";
  const searchIconClasses = "text-gray-400";
  const buttonClasses = "from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 hover:shadow-gray-300/50";

  // --- End Dark Mode Styles ---

  return (
    <div className={`relative w-full flex justify-center`} style={{ zIndex: 50 }} ref={containerRef}> {/* Removed bg-gray-800 */}
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
            ? '0 8px 30px rgba(98, 102, 241, 0.2)' // Keep focus shadow
            : '0 4px 6px rgba(0, 0, 0, 0.1)'  // Regular shadow
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className={`flex items-center bg-gray-800 rounded-full border-2 focus-within:ring-4 transition-all duration-300 shadow-lg focus-within:ring-gray-500/50 border-gray-600`}> {/* Added bg-gray-800, removed gradient and backdrop-blur */}
          <SearchIcon isLoading={isLoading} searchIconClasses={searchIconClasses} />
          <InputField
            inputRef={inputRef}
            localQuery={localQuery}
            setLocalQuery={setLocalQuery}
            setIsFocused={setIsFocused}
            handleKeyDown={handleKeyDown}
            inputFieldClasses={inputFieldClasses}
          />
          <SubmitButton isLoading={isLoading} buttonClasses={buttonClasses}/>
        </div>
        <SuggestionsDropdown
          suggestions={suggestions}
          isFocused={isFocused}
          handleSuggestionClick={handleSuggestionClick}
          handleSuggestionHover={handleSuggestionHover}
          inputRef={inputRef}
          suggestionDropdownClasses={suggestionDropdownClasses}
          suggestionItemClasses={suggestionItemClasses}
          suggestionItemTextClasses={suggestionItemTextClasses}
          suggestionItemTypeTextClasses={suggestionItemTypeTextClasses}
        />
      </motion.form>
    </div>
  );
});

const SearchIcon = React.memo(({ isLoading, searchIconClasses }) => (
  <motion.div
    className={`pl-4 ${searchIconClasses}`}
    animate={{
      scale: isLoading ? [1, 1.2, 1] : 1,
      rotate: isLoading ? 360 : 0,
      transition: { duration: 0.5 }
    }}
    style={{ willChange: 'transform' }}
  >
    <MagnifyingGlassIcon className="w-6 h-6" />
  </motion.div>
));

const InputField = React.memo(({ inputRef, localQuery, setLocalQuery, setIsFocused, handleKeyDown, inputFieldClasses }) => (
  <input
    ref={inputRef}
    type="text"
    value={localQuery}
    onChange={(e) => setLocalQuery(e.target.value)}
    onFocus={() => setIsFocused(true)}
    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
    onKeyDown={handleKeyDown}
    placeholder="Search for movies or TV shows..."
    className={`flex-grow pl-4 pr-3 py-3 text-lg bg-transparent focus:outline-none font-medium ${inputFieldClasses}`}
    aria-label="Search for movies or TV shows"
  />
));

const SubmitButton = React.memo(({ isLoading, buttonClasses }) => (
  <div className="pr-2">
    <motion.button
      type="submit"
      disabled={isLoading}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`px-5 py-2 text-base bg-gradient-to-br ${buttonClasses} font-semibold rounded-full transition-all duration-300 shadow-lg disabled:opacity-75 disabled:cursor-not-allowed`}
      style={{ willChange: 'transform' }}
    >
      {isLoading ? 'Searching...' : 'Search'}
    </motion.button>
  </div>
));
const SuggestionsDropdown = React.memo(({ suggestions, isFocused, handleSuggestionClick, handleSuggestionHover, inputRef, suggestionDropdownClasses, suggestionItemClasses, suggestionItemTextClasses, suggestionItemTypeTextClasses }) => {
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
            className={`${suggestionDropdownClasses} rounded-2xl shadow-xl overflow-hidden`}
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
                suggestionItemClasses={suggestionItemClasses}
                suggestionItemTextClasses={suggestionItemTextClasses}
                suggestionItemTypeTextClasses={suggestionItemTypeTextClasses}

              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const SuggestionItem = React.memo(({ suggestion, index, onClick, onHover, suggestionItemClasses, suggestionItemTextClasses, suggestionItemTypeTextClasses }) => {
  const handleClick = useCallback(() => onClick(suggestion), [onClick, suggestion]);
  const handleHover = useCallback(() => onHover(suggestion), [onHover, suggestion]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
      className={`cursor-pointer group suggestion-item ${suggestionItemClasses}`}
      role="option"
      tabIndex={0}
      onClick={handleClick}
      onMouseEnter={handleHover}
      onFocus={handleHover}
    >
      <div className="px-4 py-2  transition-colors duration-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MagnifyingGlassIcon className={`w-4 h-4 ${suggestionItemTextClasses}`} />
          <span className={`text-base font-medium ${suggestionItemTextClasses}`}>
            {suggestion.title}
          </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full  transition-colors duration-200 ${suggestionItemTypeTextClasses}`}>
          {suggestion.type}
        </span>
      </div>
    </motion.div>
  );
});