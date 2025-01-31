import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

export const SearchInput = ({ 
  query, 
  setQuery, 
  handleSearch, 
  isLoading, 
  isFocused, 
  setIsFocused, 
  suggestions, 
  handleSuggestionClick,
  handleSuggestionHover
}) => (
  <div className="relative w-full flex justify-center" style={{ zIndex: 50 }}>
    <motion.form
      onSubmit={handleSearch}
      className="relative w-full max-w-2xl"
      style={{ zIndex: 50 }}
      animate={{
        scale: isFocused ? 1.02 : 1,
        boxShadow: isFocused
          ? '0 8px 30px rgba(98, 102, 241, 0.2)'
          : '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="flex items-center bg-gradient-to-r from-indigo-50 to-blue-50 backdrop-blur-xl rounded-full border-2 border-indigo-100 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-200/50 transition-all duration-300 shadow-lg">
        <SearchIcon isLoading={isLoading} />
        <InputField 
          query={query}
          setQuery={setQuery}
          setIsFocused={setIsFocused}
        />
        <SubmitButton />
      </div>
      <SuggestionsDropdown 
        suggestions={suggestions}
        isFocused={isFocused}
        handleSuggestionClick={handleSuggestionClick}
        handleSuggestionHover={handleSuggestionHover}
      />
    </motion.form>
  </div>
);

const SearchIcon = ({ isLoading }) => (
  <motion.div
    className="pl-4 text-indigo-400"
    animate={{ scale: isLoading ? [1, 1.2, 1] : 1, rotate: isLoading ? 360 : 0 }}
    transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
  >
    <MagnifyingGlassIcon className="w-6 h-6" />
  </motion.div>
);

const InputField = ({ query, setQuery, setIsFocused }) => (
  <input
    type="text"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    onFocus={() => setIsFocused(true)}
    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
    placeholder="Search for movies or TV shows..."
    className="flex-grow pl-4 pr-3 py-3 text-lg bg-transparent focus:outline-none placeholder-indigo-300 text-indigo-600 font-medium"
  />
);

const SubmitButton = () => (
  <div className="pr-2">
    <motion.button
      type="submit"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="px-5 py-2 text-base bg-gradient-to-br from-indigo-500 to-blue-500 text-white font-semibold rounded-full hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-indigo-200/50"
    >
      Search
    </motion.button>
  </div>
);

const SuggestionsDropdown = ({ suggestions, isFocused, handleSuggestionClick, handleSuggestionHover }) => (
  <AnimatePresence>
    {suggestions.length > 0 && isFocused && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute left-0 right-0 mt-2"
        style={{ zIndex: 100 }}
      >
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-indigo-50">
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

const SuggestionItem = ({ suggestion, index, onClick, onHover }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ delay: index * 0.1, type: 'spring' }}
    className="cursor-pointer group"
    onClick={() => onClick(suggestion)}
    onMouseEnter={() => onHover(suggestion)}
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