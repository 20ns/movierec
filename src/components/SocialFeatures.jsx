import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StarIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  ShareIcon,
  UserIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import {
  StarIcon as StarOutlineIcon,
  HeartIcon as HeartOutlineIcon,
  ChatBubbleLeftRightIcon as ChatOutlineIcon
} from '@heroicons/react/24/outline';

// Star rating component
const StarRating = ({ rating = 0, onRatingChange, readonly = false, size = 'medium' }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };
  
  const handleStarClick = (starRating) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starRating);
    }
  };
  
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverRating || rating);
        return (
          <motion.button
            key={star}
            whileHover={!readonly ? { scale: 1.1 } : {}}
            whileTap={!readonly ? { scale: 0.95 } : {}}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            disabled={readonly}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer'} transition-colors`}
          >
            {isFilled ? (
              <StarIcon className={`${sizeClasses[size]} text-yellow-400`} />
            ) : (
              <StarOutlineIcon className={`${sizeClasses[size]} text-gray-400`} />
            )}
          </motion.button>
        );
      })}
      {rating > 0 && (
        <span className="text-sm text-gray-400 ml-2">({rating}/5)</span>
      )}
    </div>
  );
};

// Quick actions component for media items
const MediaSocialActions = ({ 
  mediaId, 
  mediaTitle,
  currentUser, 
  isAuthenticated,
  onNeedsAuth,
  compact = false 
}) => {
  const [userRating, setUserRating] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [watchStatus, setWatchStatus] = useState('none'); // 'none', 'planning', 'watching', 'completed'
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's existing interactions
  useEffect(() => {
    if (isAuthenticated && mediaId) {
      loadUserInteractions();
    }
  }, [isAuthenticated, mediaId]);

  const loadUserInteractions = async () => {
    try {
      // This would load from your backend
      // const interactions = await fetchUserMediaInteractions(mediaId);
      // setUserRating(interactions.rating || 0);
      // setIsLiked(interactions.liked || false);
      // setWatchStatus(interactions.watchStatus || 'none');
    } catch (error) {
      console.error('Error loading user interactions:', error);
    }
  };

  const handleRatingChange = async (rating) => {
    if (!isAuthenticated) {
      onNeedsAuth && onNeedsAuth();
      return;
    }

    setIsLoading(true);
    try {
      // Save rating to backend
      // await saveUserRating(mediaId, rating);
      setUserRating(rating);
      
      // Show success feedback
      // toast.success(`Rated ${mediaTitle} ${rating} stars!`);
    } catch (error) {
      console.error('Error saving rating:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!isAuthenticated) {
      onNeedsAuth && onNeedsAuth();
      return;
    }

    setIsLoading(true);
    try {
      const newLikedState = !isLiked;
      // await saveUserLike(mediaId, newLikedState);
      setIsLiked(newLikedState);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWatchStatusChange = async (status) => {
    if (!isAuthenticated) {
      onNeedsAuth && onNeedsAuth();
      return;
    }

    setIsLoading(true);
    try {
      // await saveWatchStatus(mediaId, status);
      setWatchStatus(status);
    } catch (error) {
      console.error('Error updating watch status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = (platform) => {
    const url = `${window.location.origin}/movie/${mediaId}`;
    const text = `Check out ${mediaTitle} on MovieRec!`;
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        // toast.success('Link copied to clipboard!');
        break;
      default:
        break;
    }
    setShowShareMenu(false);
  };

  const watchStatusOptions = [
    { id: 'planning', label: 'Plan to Watch', icon: ClockIcon, color: 'text-blue-400' },
    { id: 'watching', label: 'Currently Watching', icon: EyeIcon, color: 'text-green-400' },
    { id: 'completed', label: 'Completed', icon: CheckCircleIcon, color: 'text-purple-400' }
  ];

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <StarRating rating={userRating} onRatingChange={handleRatingChange} size="small" />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLikeToggle}
          disabled={isLoading}
          className="transition-colors"
        >
          {isLiked ? (
            <HeartIcon className="w-4 h-4 text-red-500" />
          ) : (
            <HeartOutlineIcon className="w-4 h-4 text-gray-400 hover:text-red-400" />
          )}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Rating Section */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-white mb-2">Your Rating</h4>
          <StarRating rating={userRating} onRatingChange={handleRatingChange} />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLikeToggle}
          disabled={isLoading}
          className={`p-2 rounded-full transition-all ${
            isLiked ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400 hover:text-red-400'
          }`}
        >
          {isLiked ? (
            <HeartIcon className="w-5 h-5" />
          ) : (
            <HeartOutlineIcon className="w-5 h-5" />
          )}
        </motion.button>
      </div>

      {/* Watch Status */}
      <div>
        <h4 className="text-sm font-medium text-white mb-2">Watch Status</h4>
        <div className="flex flex-wrap gap-2">
          {watchStatusOptions.map((option) => {
            const IconComponent = option.icon;
            const isSelected = watchStatus === option.id;
            
            return (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleWatchStatusChange(option.id)}
                disabled={isLoading}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  isSelected 
                    ? `bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/50 ${option.color}`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{option.label}</span>
              </motion.button>
            );
          })}
          {watchStatus !== 'none' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleWatchStatusChange('none')}
              className="px-3 py-2 rounded-lg text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition-all"
            >
              Clear
            </motion.button>
          )}
        </div>
      </div>

      {/* Social Actions */}
      <div className="flex items-center space-x-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowReviewModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg transition-all"
        >
          <ChatBubbleLeftRightIcon className="w-4 h-4" />
          <span className="text-sm">Write Review</span>
        </motion.button>

        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-all"
          >
            <ShareIcon className="w-4 h-4" />
            <span className="text-sm">Share</span>
          </motion.button>

          <AnimatePresence>
            {showShareMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[150px]"
              >
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => handleShare('twitter')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    Share on Twitter
                  </button>
                  <button
                    onClick={() => handleShare('facebook')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    Share on Facebook
                  </button>
                  <button
                    onClick={() => handleShare('copy')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    Copy Link
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Social stats component
const SocialStats = ({ 
  averageRating = 0, 
  totalRatings = 0, 
  totalLikes = 0, 
  totalReviews = 0,
  compact = false 
}) => {
  if (compact) {
    return (
      <div className="flex items-center space-x-4 text-xs text-gray-400">
        <div className="flex items-center space-x-1">
          <StarIcon className="w-3 h-3 text-yellow-400" />
          <span>{averageRating.toFixed(1)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <HeartIcon className="w-3 h-3 text-red-400" />
          <span>{totalLikes}</span>
        </div>
        <div className="flex items-center space-x-1">
          <ChatBubbleLeftRightIcon className="w-3 h-3 text-blue-400" />
          <span>{totalReviews}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/50 rounded-lg">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-1 mb-1">
          <StarIcon className="w-4 h-4 text-yellow-400" />
          <span className="text-lg font-semibold text-white">{averageRating.toFixed(1)}</span>
        </div>
        <p className="text-xs text-gray-400">{totalRatings} ratings</p>
      </div>
      
      <div className="text-center">
        <div className="flex items-center justify-center space-x-1 mb-1">
          <HeartIcon className="w-4 h-4 text-red-400" />
          <span className="text-lg font-semibold text-white">{totalLikes}</span>
        </div>
        <p className="text-xs text-gray-400">likes</p>
      </div>
      
      <div className="text-center">
        <div className="flex items-center justify-center space-x-1 mb-1">
          <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-400" />
          <span className="text-lg font-semibold text-white">{totalReviews}</span>
        </div>
        <p className="text-xs text-gray-400">reviews</p>
      </div>
    </div>
  );
};

// Main social features export
export {
  StarRating,
  MediaSocialActions,
  SocialStats
};

export default {
  StarRating,
  MediaSocialActions,
  SocialStats
};