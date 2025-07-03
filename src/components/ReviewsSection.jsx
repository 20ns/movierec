import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  StarIcon,
  HeartIcon,
  ShareIcon,
  ThumbsUpIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/solid';
import { 
  StarIcon as StarOutlineIcon,
  HeartIcon as HeartOutlineIcon,
  HandThumbUpIcon as ThumbsUpOutlineIcon
} from '@heroicons/react/24/outline';


const fetchReviews = async (mediaId) => {
  console.log(`Fetching reviews for media ID: ${mediaId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { id: 1, author: 'User123', rating: 4, comment: 'Great movie, really enjoyed the plot!', createdAt: new Date().toISOString() },
    { id: 2, author: 'Cinephile_Max', rating: 5, comment: 'A masterpiece! Must watch.', createdAt: new Date().toISOString() },
  ];
};

// Placeholder function - replace with actual API call
const submitReview = async (mediaId, reviewData) => {
  console.log(`Submitting review for media ID: ${mediaId}`, reviewData);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  // Return dummy success response
  return { success: true, newReview: { ...reviewData, id: Date.now(), createdAt: new Date().toISOString() } };
};

const ReviewsSection = ({ mediaId, currentUser, onReviewsLoaded }) => { // Add onReviewsLoaded prop
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!mediaId) return;

    const loadReviews = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedReviews = await fetchReviews(mediaId);
        setReviews(fetchedReviews);
        // Call the callback prop with whether reviews exist
        if (onReviewsLoaded) {
          onReviewsLoaded(fetchedReviews.length > 0);
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setError('Failed to load reviews.');
      } finally {
        setIsLoading(false);
      }
    };

    loadReviews();

  }, [mediaId, onReviewsLoaded]);

  const handleRatingChange = (rating) => {
    setNewRating(rating);
  };

  const handleCommentChange = (event) => {
    setNewComment(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!newRating || !newComment.trim() || !currentUser) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await submitReview(mediaId, {
        author: currentUser.attributes.email, // Or username if available
        rating: newRating,
        comment: newComment.trim(),
      });
      if (result.success && result.newReview) {
        setReviews(prevReviews => [result.newReview, ...prevReviews]);
        setNewRating(0);
        setNewComment('');
      } else {
        throw new Error('Submission failed');
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 p-4 bg-gray-800 bg-opacity-50 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-white mb-4">User Reviews</h3>

      {/* Add Review Form (Visible if logged in) */}
      {currentUser && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-700 rounded-md">
          <h4 className="text-lg font-medium text-gray-200 mb-3">Add Your Review</h4>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-300 mb-1">Rating</label>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRatingChange(star)}
                    className={`transition-all duration-200 ${newRating >= star ? 'text-yellow-400' : 'text-gray-500'} hover:text-yellow-300`}
                    aria-label={`Rate ${star} out of 5 stars`}
                  >
                    {newRating >= star ? (
                      <StarIcon className="w-6 h-6" />
                    ) : (
                      <StarOutlineIcon className="w-6 h-6" />
                    )}
                  </motion.button>
                ))}
              </div>
              {newRating > 0 && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-sm text-yellow-300 font-medium ml-2"
                >
                  {newRating}/5
                </motion.span>
              )}
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-300 mb-1">Comment</label>
            <textarea
              id="comment"
              value={newComment}
              onChange={handleCommentChange}
              rows="3"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Share your thoughts..."
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !newRating || !newComment.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}
      {!currentUser && (
         <p className="text-gray-400 text-sm mb-4">Please <a href="/signin" className="text-indigo-400 hover:underline">sign in</a> to add a review.</p>
      )}

      {/* Display Reviews */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          {[...Array(2)].map((_, i) => ( // Show 2 skeleton items
            <div key={i} className="p-3 bg-gray-700 bg-opacity-50 rounded-md border border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-gray-600 rounded w-1/4"></div> {/* Author */}
                <div className="h-3 bg-gray-600 rounded w-1/6"></div> {/* Date */}
              </div>
              <div className="flex items-center mb-3">
                <div className="h-5 bg-gray-600 rounded w-1/3"></div> {/* Rating */}
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-600 rounded w-full"></div> {/* Comment line 1 */}
                <div className="h-3 bg-gray-600 rounded w-5/6"></div> {/* Comment line 2 */}
              </div>
            </div>
          ))}
        </div>
      )}
      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-6 px-4 bg-gray-700/30 rounded-lg border border-dashed border-gray-600">
          <svg className="mx-auto h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343m11.314 11.314a8 8 0 00-11.314-11.314m11.314 11.314L6.343 7.343m11.314 11.314V12m-4.657 6.657H12" /> {/* Example icon */}
          </svg>
          <h4 className="mt-2 text-sm font-medium text-gray-300">No reviews yet</h4>
          <p className="mt-1 text-sm text-gray-400">
            {currentUser ? "Be the first to share your thoughts!" : "Sign in to add the first review."}
          </p>
          {currentUser && (
             <button
               onClick={() => document.getElementById('comment')?.focus()} // Focus the comment box
               className="mt-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
             >
               Add Review
             </button>
          )}
        </div>
      )}
      {!isLoading && reviews.length > 0 && (
        <ul className="space-y-5"> {/* Keep increased spacing */}
          {reviews.map((review) => (
            // Re-applying enhanced styling for each review item
            <li
              key={review.id}
              className="p-4 bg-gradient-to-br from-gray-700/60 to-gray-800/40 rounded-lg border border-gray-600/80 shadow-sm transition-shadow duration-200 hover:shadow-md" // Keep enhanced class
            >
              <div className="flex items-center justify-between mb-2"> {/* Keep increased bottom margin */}
                <span className="font-semibold text-indigo-300 text-sm">{review.author}</span> {/* Keep changed color and size */}
                <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span> {/* Keep date style */}
              </div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon 
                        key={star} 
                        className={`w-4 h-4 ${review.rating >= star ? 'text-yellow-400' : 'text-gray-600'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-yellow-300 font-medium">{review.rating}/5</span>
                </div>
                
                {/* Social actions for reviews */}
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                    onClick={() => {/* Handle review like */}}
                  >
                    <HeartOutlineIcon className="w-3 h-3" />
                    <span>{Math.floor(Math.random() * 20) + 1}</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                    onClick={() => {/* Handle review share */}}
                  >
                    <ShareIcon className="w-3 h-3" />
                  </motion.button>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">{review.comment}</p>
              
              {/* Review helpfulness */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Was this helpful?</span>
                <div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-1 hover:text-green-400 transition-colors"
                    onClick={() => {/* Handle helpful vote */}}
                  >
                    <ThumbsUpOutlineIcon className="w-3 h-3" />
                    <span>{Math.floor(Math.random() * 15) + 1}</span>
                  </motion.button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReviewsSection;