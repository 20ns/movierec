import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  BoltIcon,
  FaceSmileIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  FilmIcon,
  TvIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  StarIcon
} from '@heroicons/react/24/solid';

// Mood options with enhanced data for filtering
const MOOD_OPTIONS = [
  {
    id: 'exciting',
    name: 'Exciting & Action-packed',
    icon: BoltIcon,
    color: 'from-orange-500 to-red-500',
    textColor: 'text-orange-300',
    description: 'High-energy thrills and adventure',
    genres: [28, 12, 53], // Action, Adventure, Thriller
    keywords: ['fast-paced', 'intense', 'adrenaline', 'explosive'],
    emoji: '⚡'
  },
  {
    id: 'thoughtful',
    name: 'Thoughtful & Profound',
    icon: SparklesIcon,
    color: 'from-indigo-500 to-purple-500',
    textColor: 'text-indigo-300',
    description: 'Deep, meaningful storytelling',
    genres: [18, 36, 99], // Drama, History, Documentary
    keywords: ['philosophical', 'introspective', 'meaningful', 'cerebral'],
    emoji: '🧠'
  },
  {
    id: 'funny',
    name: 'Funny & Light-hearted',
    icon: FaceSmileIcon,
    color: 'from-yellow-500 to-orange-500',
    textColor: 'text-yellow-300',
    description: 'Laughs and good vibes',
    genres: [35, 10751], // Comedy, Family
    keywords: ['hilarious', 'witty', 'charming', 'uplifting'],
    emoji: '😄'
  },
  {
    id: 'scary',
    name: 'Scary & Thrilling',
    icon: ExclamationTriangleIcon,
    color: 'from-red-500 to-purple-500',
    textColor: 'text-red-300',
    description: 'Spine-tingling suspense',
    genres: [27, 9648, 53], // Horror, Mystery, Thriller
    keywords: ['suspenseful', 'mysterious', 'terrifying', 'psychological'],
    emoji: '😱'
  },
  {
    id: 'emotional',
    name: 'Emotional & Moving',
    icon: HeartIcon,
    color: 'from-pink-500 to-rose-500',
    textColor: 'text-pink-300',
    description: 'Heartfelt and touching',
    genres: [18, 10749, 10751], // Drama, Romance, Family
    keywords: ['touching', 'heartwarming', 'tear-jerker', 'inspiring'],
    emoji: '💝'
  },
  {
    id: 'escapist',
    name: 'Escapist & Fantasy',
    icon: StarIcon,
    color: 'from-emerald-500 to-teal-500',
    textColor: 'text-emerald-300',
    description: 'Transport to other worlds',
    genres: [14, 878, 16], // Fantasy, Sci-Fi, Animation
    keywords: ['magical', 'otherworldly', 'imaginative', 'fantastical'],
    emoji: '✨'
  }
];

// Time commitment options
const TIME_OPTIONS = [
  { id: 'quick', name: 'Quick Watch', time: '< 90 min', icon: ClockIcon, emoji: '⚡' },
  { id: 'standard', name: 'Standard', time: '90-120 min', icon: FilmIcon, emoji: '🎬' },
  { id: 'long', name: 'Epic Journey', time: '> 2 hours', icon: StarIcon, emoji: '🎭' },
  { id: 'series', name: 'Binge Series', time: 'TV Episodes', icon: TvIcon, emoji: '📺' }
];

const MoodQuickFilters = ({ onMoodSelect, onTimeSelect, currentUser, isVisible = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleMoodSelect = (mood) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setSelectedMood(mood.id);
    
    // Create filter data for the recommendation system
    const filterData = {
      mood: mood.id,
      genres: mood.genres,
      keywords: mood.keywords,
      description: mood.description
    };
    
    onMoodSelect && onMoodSelect(filterData);
    
    // Reset animation state
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  const handleTimeSelect = (timeOption) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setSelectedTime(timeOption.id);
    
    onTimeSelect && onTimeSelect(timeOption);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  const clearFilters = () => {
    setSelectedMood(null);
    setSelectedTime(null);
    onMoodSelect && onMoodSelect(null);
    onTimeSelect && onTimeSelect(null);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 max-w-7xl mx-auto px-4"
    >
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
              >
                <SparklesIcon className="w-6 h-6 text-purple-400" />
              </motion.div>
              <div>
                <h3 className="text-xl font-bold text-white">I'm in the mood for...</h3>
                <p className="text-sm text-gray-400">Quick filters to match your vibe</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {(selectedMood || selectedTime) && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full transition-all"
                >
                  Clear
                </motion.button>
              )}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50 transition-all"
              >
                {isExpanded ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {(isExpanded || selectedMood || selectedTime) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="p-6 space-y-6">
                {/* Mood Selection */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Choose your mood</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {MOOD_OPTIONS.map((mood) => (
                      <motion.button
                        key={mood.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleMoodSelect(mood)}
                        disabled={isAnimating}
                        className={`group relative p-4 rounded-xl border transition-all duration-200 ${
                          selectedMood === mood.id
                            ? `bg-gradient-to-br ${mood.color} border-transparent shadow-lg`
                            : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600 hover:bg-gray-800'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">{mood.emoji}</div>
                          <p className={`text-xs font-medium ${
                            selectedMood === mood.id ? 'text-white' : 'text-gray-300 group-hover:text-white'
                          }`}>
                            {mood.name.split(' ')[0]}
                          </p>
                        </div>
                        
                        {selectedMood === mood.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 border-2 border-white/30 rounded-xl pointer-events-none"
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Time Commitment */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">How much time do you have?</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TIME_OPTIONS.map((timeOption) => (
                      <motion.button
                        key={timeOption.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTimeSelect(timeOption)}
                        disabled={isAnimating}
                        className={`p-3 rounded-lg border text-center transition-all duration-200 ${
                          selectedTime === timeOption.id
                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 border-transparent text-white shadow-lg'
                            : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <div className="text-lg mb-1">{timeOption.emoji}</div>
                        <p className="text-xs font-medium">{timeOption.name}</p>
                        <p className="text-xs opacity-80">{timeOption.time}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Selected Filters Display */}
                {(selectedMood || selectedTime) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-500/20"
                  >
                    <p className="text-sm text-purple-200 mb-2">You're looking for:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMood && (
                        <span className="px-3 py-1 bg-purple-600/30 text-purple-200 rounded-full text-xs">
                          {MOOD_OPTIONS.find(m => m.id === selectedMood)?.name}
                        </span>
                      )}
                      {selectedTime && (
                        <span className="px-3 py-1 bg-indigo-600/30 text-indigo-200 rounded-full text-xs">
                          {TIME_OPTIONS.find(t => t.id === selectedTime)?.name}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact View when collapsed */}
        {!isExpanded && !selectedMood && !selectedTime && (
          <div className="p-4">
            <div className="flex justify-center space-x-4">
              {MOOD_OPTIONS.slice(0, 3).map((mood) => (
                <motion.button
                  key={mood.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMoodSelect(mood)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-700 rounded-lg transition-all text-sm text-gray-300 hover:text-white"
                >
                  <span>{mood.emoji}</span>
                  <span>{mood.name.split(' ')[0]}</span>
                </motion.button>
              ))}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsExpanded(true)}
                className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-all text-sm"
              >
                +3 more
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MoodQuickFilters;