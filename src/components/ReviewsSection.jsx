// src/components/ReviewsSection.jsx
import React, { useState, useEffect } from 'react';

// Placeholder function - replace with actual API call
const fetchReviews = async (mediaId) => {
  console.log(`Fetching reviews for media ID: ${mediaId}`);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  // Return dummy data
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
  // Add onReviewsLoaded to dependency array (ensure it's stable via useCallback if passed from parent)
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
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingChange(star)}
                  className={`text-2xl ${newRating >= star ? 'text-yellow-400' : 'text-gray-500'} hover:text-yellow-300 transition-colors`}
                  aria-label={`Rate ${star} out of 5 stars`}
                >
                  ★
                </button>
              ))}
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
      {isLoading && <p className="text-gray-400">Loading reviews...</p>}
      {!isLoading && reviews.length === 0 && <p className="text-gray-400">No reviews yet. Be the first!</p>}
      {!isLoading && reviews.length > 0 && (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="p-3 bg-gray-700 bg-opacity-70 rounded-md border border-gray-600">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-200">{review.author}</span>
                <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={`text-lg ${review.rating >= star ? 'text-yellow-400' : 'text-gray-500'}`}>★</span>
                ))}
              </div>
              <p className="text-gray-300 text-sm">{review.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReviewsSection;