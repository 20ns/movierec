import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, ClockIcon, FilmIcon, TvIcon } from '@heroicons/react/24/solid';

export const FiltersSection = ({ activeFilters, setActiveFilters }) => {
  const timePeriodOptions = [
    { value: 'any', label: 'Any Time', icon: <ClockIcon className="w-4 h-4 text-gray-400" /> },
    { value: 'recent', label: 'Recent', icon: <SparklesIcon className="w-4 h-4 text-yellow-400" /> },
    { value: 'classic', label: 'Classic', icon: <FilmIcon className="w-4 h-4 text-red-500" /> },
    { value: '90s00s', label: '90s/00s', icon: <TvIcon className="w-4 h-4 text-blue-400" /> }
  ];

  const genreOptions = [
    { value: 'diverse', label: 'Diverse', icon: <SparklesIcon className="w-4 h-4 text-yellow-400" /> },
    { value: 'specific', label: 'Specific', icon: <FilmIcon className="w-4 h-4 text-red-500" /> }
  ];

  const typeOptions = [
    { value: 'all', label: 'All', icon: <TvIcon className="w-4 h-4 text-blue-400" /> },
    { value: 'movie', label: 'Movies', icon: <FilmIcon className="w-4 h-4 text-red-500" /> },
    { value: 'tv', label: 'TV', icon: <TvIcon className="w-4 h-4 text-blue-400" /> }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-4xl mb-6"
    >
      <div className="bg-gray-800/80 backdrop-blur-lg rounded-xl p-3 shadow-lg border border-gray-700">
        <div className="flex flex-wrap gap-3">
          <FilterGroup
            title="Genre"
            icon={<SparklesIcon className="w-5 h-5 text-yellow-400" />}
            options={genreOptions}
            filterKey="genre"
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
          />

          <FilterGroup
            title="Time"
            icon={<ClockIcon className="w-5 h-5 text-gray-400" />}
            options={timePeriodOptions}
            filterKey="time"
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
          />

          <FilterGroup
            title="Type"
            icon={<TvIcon className="w-5 h-5 text-blue-400" />}
            options={typeOptions}
            filterKey="type"
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
          />
        </div>
      </div>
    </motion.div>
  );
};

const FilterGroup = ({ title, icon, options, filterKey, activeFilters, setActiveFilters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === activeFilters[filterKey]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className="flex items-center pl-3 pr-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
      >
        {icon}
        <span className="ml-2 text-sm font-medium text-gray-300">
          {selectedOption.label}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute mt-2 z-50 min-w-[160px]"
          >
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilters(prev => ({ ...prev, [filterKey]: option.value }))}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 rounded-md"
                >
                  {option.icon}
                  <span className="ml-2">{option.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};