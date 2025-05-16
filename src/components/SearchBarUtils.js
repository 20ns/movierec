import axios from 'axios';

// --- Utility Functions (No significant performance bottlenecks) ---
export const hexToRgb = (hex) => {
    hex = hex.substring(hex[0] === '#' ? 1 : 0); 
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
};

// --- Genre Color Mapping (Constant Lookup - Very Efficient) ---
const genreColors = {
    28: '#7f1d1d',   12: '#14532d',   16: '#713f12',
    35: '#4c1d95',   80: '#1e293b',   18: '#1e3a8a',
    10751: '#134e4a', 14: '#581c87',  27: '#3c1513',
    9648: '#312e81', 10749: '#831843', 878: '#0c4a6e',
    default: '#1e1b4b'
};

export const getGenreColor = (genreIds = []) => {
    const firstGenre = genreIds[0] || 'default';
    return hexToRgb(genreColors[firstGenre] || genreColors.default); // Direct return, slightly cleaner
};

// --- Mock Social Data (Constant Lookup - Very Efficient) ---
const MOCK_SOCIAL_DATA = { // Define outside function
    603: { friendsWatched: 12, friendsLiked: 11 },
    238: { friendsWatched: 8, friendsLiked: 7 },
};

export const getSocialProof = (item) => {
    return MOCK_SOCIAL_DATA[item.id] || { friendsWatched: 0, friendsLiked: 0 };
};

// --- Axios Instance (Caching and Retry) ---
export const axiosInstance = axios.create({
  headers: { 'Cache-Control': 'no-cache' }, //  We'll handle caching manually.
});

// Manual In-Memory Cache
const cache = new Map();

export const fetchWithRetry = async (url, params, retries = 2) => {
    const key = JSON.stringify({ url, params });

    // Check cache first
    if (cache.has(key)) {
        const cached = cache.get(key);
        if (cached.expiry > Date.now()) {
          return { data: cached.data };
        } else {
          cache.delete(key);
        }
    }

    try {
      const response = await axiosInstance.get(url, { params });
      cache.set(key, { data: response.data, expiry: Date.now() + 300000 });
      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, (1 << (2 - retries)) * 100));
        return fetchWithRetry(url, params, retries - 1);
      }
      throw error;
    }
};


// --- Recommendation Engine (Most Complex - Focus on Optimizations) ---
const CREW_WEIGHTS = { 
    Director: 5,
    'Original Music Composer': 3,
    'Director of Photography': 2
};
const SEASONAL_GENRES = {
    11: [10751, 18], 0: [18, 9648], 9: [27, 53], 6: [12, 14]
};
const ANNIVERSARY_YEARS = [5, 10, 15, 20, 25, 30, 40, 50];
const CURRENT_YEAR = new Date().getFullYear(); // Calculate once


const getSeasonalBoostGenres = () => {
    return SEASONAL_GENRES[new Date().getMonth()] || [];
};
const isClassic = (releaseYear) => ANNIVERSARY_YEARS.some(y => (CURRENT_YEAR - releaseYear) % y === 0);


// --- Title Matching Utilities (New) ---
export const extractTitleTerms = (title) => {
    if (!title) return [];
    
    // Remove common articles and prefixes that don't help with matching
    const cleanTitle = title.toLowerCase()
        .replace(/^(the|a|an) /, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Split into meaningful terms (skip common words and short terms)
    const skipWords = new Set(['and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by']);
    return cleanTitle.split(' ')
        .filter(term => term.length > 2 && !skipWords.has(term));
};

// Calculate title similarity score between query and item title
export const getTitleSimilarityScore = (query, itemTitle) => {
    if (!query || !itemTitle) return 0;
    
    const queryTerms = extractTitleTerms(query);
    const titleTerms = extractTitleTerms(itemTitle);
    
    // Handle empty terms case
    if (queryTerms.length === 0 || titleTerms.length === 0) return 0;
    
    // Check for exact match after cleaning
    const queryClean = queryTerms.join(' ');
    const titleClean = titleTerms.join(' ');
    
    if (queryClean === titleClean) return 100;
    if (titleClean.startsWith(queryClean)) return 90;
    if (titleClean.includes(queryClean)) return 80;
    
    // Count matching terms
    const matchingTerms = queryTerms.filter(term => 
        titleTerms.some(titleTerm => titleTerm.includes(term) || term.includes(titleTerm))
    );
    
    // Calculate match percentage
    const matchRatio = matchingTerms.length / queryTerms.length;
    return Math.round(matchRatio * 70); // Max 70 for partial term matches
};

export const calculateMatchScore = (item, targetDetails) => {
    let score = 0;
    const reasons = [];

    // Add title matching for recommendation similarity
    if (targetDetails.title && (item.title || item.name)) {
        const titleScore = getTitleSimilarityScore(
            targetDetails.title,
            item.title || item.name
        );
        
        if (titleScore > 70) { 
            reasons.push(`Similar title`); 
            score += titleScore / 10; // Scale down to fit with other scores
        }
    }


    const genreMatches = item.genre_ids.filter(id => targetDetails.genres.includes(id)).length;
    if (genreMatches > 0) { reasons.push(`Matched ${genreMatches} genres`); score += genreMatches * 5; }

    // Keyword Matching
    const keywordMatches = item.keywords?.filter(keyword => targetDetails.keywords.includes(keyword)).length || 0;
    if (keywordMatches > 0) { reasons.push(`Matched ${keywordMatches} keywords`); score += keywordMatches * 3; }

    // Cast Matching
    const castMatches = item.cast?.filter(actorId => targetDetails.cast.includes(actorId)).length || 0;
    if (castMatches > 0) { reasons.push(`Matched cast`); score += castMatches * 2; }

    // Director Matching
    if (targetDetails.director && item.crew?.some(c => c.id === targetDetails.director)) {
        reasons.push(`Directed by target director`); score += 4;
    }

    // Recent Release
    const releaseYear = new Date(item.release_date || item.first_air_date || CURRENT_YEAR).getFullYear(); // Use pre-calculated CURRENT_YEAR
    if (CURRENT_YEAR - releaseYear <= 5) { reasons.push(`Recent release (${releaseYear})`); score += 3; }

    // Popularity (Simplified Math.floor)
    const popularityBoost = Math.min(Math.floor((item.popularity || 0) / 20), 5); // More performant Math.floor
    if (popularityBoost > 0) { reasons.push(`Popularity boost`); score += popularityBoost; }

    // Vote Average
    if ((item.vote_average || 0) > 3) { reasons.push(`High vote average`); score += (item.vote_average || 0) * 2.5; }

    // Genre Diversity
    const uniqueGenres = new Set(item.genre_ids).size;
    if (uniqueGenres > 1) { reasons.push(`Genre diversity`); score += Math.min(uniqueGenres, 3); }

    // Similar Tastes (Consider caching viewingHistory if it becomes a bottleneck in other parts of the app)
    const viewingHistory = JSON.parse(localStorage.getItem('viewingHistory') || '[]');
    const similarTastesCount = viewingHistory.filter(h => h.genre_ids?.some(g => item.genre_ids.includes(g))).length; // Renamed for clarity
    if (similarTastesCount > 0) { reasons.push(`Similar tastes boost`); score += similarTastesCount * 2; }


    const creativeTeamScore = item.credits?.crew?.reduce((crewScore, member) => crewScore + (CREW_WEIGHTS[member.job] || 0), 0) || 0;
    if (creativeTeamScore > 0) { reasons.push(`Creative team boost`); score += creativeTeamScore; }


    if (item.genre_ids.some(g => getSeasonalBoostGenres().includes(g))) {
        reasons.push(`Seasonal recommendation`); score += 3;
    }

    // Classic Film Anniversary
    if (isClassic(releaseYear)) { reasons.push(`Classic film anniversary`); score += 2; }

    return { score: Math.min(Math.round(score), 100), reasons };
};


export const fetchEnhancedRecommendations = async (primaryResult) => {
    if (!primaryResult?.media_type || !primaryResult?.id) {
        console.error('Invalid primary result:', primaryResult);
        return [];
    }

    try {
        const mediaType = primaryResult.media_type;
        const mediaId = primaryResult.id;
        const apiKey = process.env.REACT_APP_TMDB_API_KEY;

        if (!['movie', 'tv'].includes(mediaType)) {
            console.error('Error: Invalid mediaType:', mediaType);
            return [];
        }

        // Fetch details, keywords, credits in parallel
        const detailsResponse = await fetchWithRetry(
            `https://api.themoviedb.org/3/${mediaType}/${mediaId}`,
            { api_key: apiKey, append_to_response: 'keywords,credits' }
        );

        const detailsData = detailsResponse.data; // Cache data for reuse
        const keywords = mediaType === 'movie'
            ? detailsData.keywords?.keywords?.map(k => k.id) || []
            : detailsData.keywords?.results?.map(k => k.id) || [];

        const targetDetails = {
            genres: detailsData.genres.map(g => g.id),
            keywords: keywords,
            director: detailsData.credits.crew.find(c => c.job === 'Director')?.id,
            cast: detailsData.credits.cast.slice(0, 5).map(c => c.id),
            analysis: { mood: 'neutral', themes: [] }, // Assuming analysis is not calculated here for perf, or is fast.
            title: detailsData.title || detailsData.name // Add title for similarity matching
        };

        // Fetch similar and cross-media recommendations in parallel
        const similarMediaPromise = fetchWithRetry(
            `https://api.themoviedb.org/3/${mediaType}/${mediaId}/similar`,
            { api_key: apiKey }
        );

        const crossMediaType = mediaType === 'movie' ? 'tv' : 'movie';
        const crossMediaPromise = fetchWithRetry(
            `https://api.themoviedb.org/3/discover/${crossMediaType}`,
            {
                api_key: apiKey,
                with_genres: targetDetails.genres.join(','),
                sort_by: 'popularity.desc',
                page: 1
            }
        );

        const crossMediaResponses = await Promise.allSettled([similarMediaPromise, crossMediaPromise]);

        let combinedResults = [];

        crossMediaResponses.forEach((response, index) => { // Use forEach for slight perf in this case
            if (response.status === 'fulfilled') {
                const currentMediaType = index === 0 ? mediaType : crossMediaType;
                const resultsWithType = response.value.data.results.map(result => ({ ...result, media_type: currentMediaType }));
                combinedResults.push(...resultsWithType);
            }
        });

        if (detailsData.similar?.results) { // Use cached detailsData
            const similarWithType = detailsData.similar.results.map(result => ({ ...result, media_type: mediaType }));
            combinedResults.push(...similarWithType);
        }

        // Efficient filtering for unique results using Set and direct ID check
        const seenIds = new Set();
        const uniqueResults = combinedResults.filter(item => {
            if (!item.id || !item.media_type || item.id === mediaId || seenIds.has(item.id)) { // Early exit conditions
                return false;
            }
            seenIds.add(item.id);
            return true;
        });

        // Optionally read user preferences (e.g., favorite genres) from localStorage
        const userPrefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');

        // Scoring and Sorting (Keep as is, already quite optimized)
        let scoredResults = uniqueResults
            .map(item => ({ ...item, ...calculateMatchScore(item, targetDetails) })) // Combine score and reasons in one pass
            .sort((a, b) => b.score - a.score);

        // After scoring your combinedResults, do a final re-weight based on user preferences
        scoredResults = scoredResults.map(item => {
            let boostedScore = item.score;
            if (userPrefs.favoriteGenres && item.genre_ids.some(g => userPrefs.favoriteGenres.includes(g))) {
                boostedScore += 5; // small boost for favorite genres
                item.reasons.push("Matched your favorite genre");
            }
            // New: boost score if user rated similar items highly
            const ratings = JSON.parse(localStorage.getItem('userRatings') || '{}');
            if (ratings.similar && ratings.similar.length > 0) {
                const hasSimilarRatedItems = ratings.similar.some(r => item.genre_ids.includes(r.genreId) && r.rating >= 4);
                if (hasSimilarRatedItems) {
                    boostedScore += 3;
                    item.reasons.push("Boost from similar highly rated items");
                }
            }
            return { ...item, score: boostedScore };
        }).sort((a, b) => b.score - a.score);

        // Genre Diversity Filtering (Optimized with Set and early break)
        let finalResults = [];
        const seenGenres = new Set();
        for (const result of scoredResults) { // Standard for...of loop is generally fast
            const mainGenre = result.genre_ids[0];
            if (!seenGenres.has(mainGenre)) {
                finalResults.push(result);
                seenGenres.add(mainGenre);
            } else {
                finalResults.push(result); // Keep even if genre seen, as per original logic
            }
            if (finalResults.length >= 9) break; // Early exit when limit reached
        }

        return finalResults.slice(0, 9); // Slice after loop, cleaner

    } catch (error) {
        console.error('Recommendation engine error:', error);
        // console.log('Error details in fetchEnhancedRecommendations:', error.message, error.response); // Removed log
        return [];
    }
};


// --- Content Analysis (Backend Dependent - Client-side optimization limited) ---
export const analyzeContent = async (text) => {
    try {
        const response = await axios.post('/api/analyze', { text });
        return response.data; // Directly return response.data, assuming it's already in { mood, themes } format
    } catch (error) {
        return { mood: 'neutral', themes: [] };
    }
};

// --- Wildcard Recommendation (External API Dependent - Limited client-side optimization) ---
const WILDCARD_PARAMS = { // Define params once
    api_key: process.env.REACT_APP_TMDB_API_KEY,
    sort_by: 'vote_average.desc',
    'vote_count.gte': 5000,
    with_original_language: 'en'
};

export const getWildcardRecommendation = async () => {
    try {
        const { data } = await axios.get(
            'https://api.themoviedb.org/3/discover/movie',
            { params: { ...WILDCARD_PARAMS, page: Math.floor(Math.random() * 100) + 1 } } // Spread params for cleaner code
        );
        const randomIndex = Math.floor(Math.random() * data.results.length); // Calculate random index once
        return data.results[randomIndex];
    } catch (error) {
        console.error("Error fetching wildcard recommendation:", error); // More informative error logging
        return undefined; // Or handle error as needed, returning undefined is safer than throwing here.
    }
};

// --- Advanced Search Utilities ---

// Maps common mood words to our defined mood categories
export const getMoodFromText = (text) => {
  const moodMap = {
    // Exciting category
    'funny': 'exciting',
    'comedy': 'exciting',
    'laugh': 'exciting',
    'light': 'exciting',
    'happy': 'exciting',
    'upbeat': 'exciting',
    'action': 'exciting',
    'adventure': 'exciting',
    
    // Thoughtful category
    'thoughtful': 'thoughtful',
    'deep': 'thoughtful',
    'meaningful': 'thoughtful',
    'thought-provoking': 'thoughtful',
    'intellectual': 'thoughtful',
    'philosophical': 'thoughtful',
    'smart': 'thoughtful',
    'documentary': 'thoughtful',
    
    // Emotional category
    'sad': 'emotional',
    'emotional': 'emotional',
    'moving': 'emotional',
    'touching': 'emotional',
    'heart': 'emotional',
    'tear': 'emotional',
    'cry': 'emotional',
    'romance': 'emotional',
    'romantic': 'emotional',
    
    // Scary category
    'scary': 'scary',
    'horror': 'scary',
    'thriller': 'scary',
    'suspense': 'scary',
    'tension': 'scary',
    'frightening': 'scary',
    'creepy': 'scary',
    'terrifying': 'scary'
  };
  
  const lowerText = text.toLowerCase();
  
  for (const [keyword, mood] of Object.entries(moodMap)) {
    if (lowerText.includes(keyword)) {
      return mood;
    }
  }
  
  return null;
};

// Maps mood categories to genre IDs for searching
export const getMoodGenreIds = (mood) => {
  const moodGenreMap = {
    'exciting': [28, 12, 35, 10751, 10752], // Action, Adventure, Comedy, Family, War
    'thoughtful': [18, 99, 36, 9648],       // Drama, Documentary, History, Mystery
    'emotional': [10749, 18, 10751],        // Romance, Drama, Family
    'scary': [27, 9648, 53]                 // Horror, Mystery, Thriller
  };
  
  return mood ? moodGenreMap[mood] || [] : [];
};

// Get relevant genres for a specific context
export const getContextGenreIds = (context) => {
  const contextGenreMap = {
    'date': [10749, 35, 18],        // Romance, Comedy, Drama
    'family': [10751, 16, 12, 35],  // Family, Animation, Adventure, Comedy
    'friends': [35, 28, 12],        // Comedy, Action, Adventure
    'solo': [18, 9648, 53, 878],    // Drama, Mystery, Thriller, Sci-Fi
    'learning': [99, 36]            // Documentary, History
  };
  
  return context ? contextGenreMap[context] || [] : [];
};

// Maps emotional states to recommended genres
export const getEmotionalStateGenreIds = (state) => {
  const emotionGenreMap = {
    'sad': [35, 12, 10751, 16],      // Comedy, Adventure, Family, Animation (uplifting content)
    'happy': [35, 10749, 10751],     // Comedy, Romance, Family
    'bored': [28, 12, 878, 53],      // Action, Adventure, Sci-Fi, Thriller
    'stressed': [35, 10751, 14],     // Comedy, Family, Fantasy
    'lonely': [10749, 18, 35],       // Romance, Drama, Comedy
    'tired': [35, 16, 10751],        // Comedy, Animation, Family
    'angry': [35, 10751, 14, 16]     // Comedy, Family, Fantasy, Animation
  };
  
  return state ? emotionGenreMap[state.toLowerCase()] || [] : [];
};

// Extracts possible titles from a "movies like X" query
export const extractReferenceTitles = (query) => {
  const matches = query.match(/(movies|shows|films|series)\s+like\s+([a-z0-9 ']+)(\s+but\s+.+)?/i);
  
  if (matches && matches[2]) {
    return matches[2].trim();
  }
  
  return null;
};

// Format a query intent summary for display
export const formatQueryIntentSummary = (queryIntent) => {
  if (!queryIntent) return null;
  
  let summaryParts = [];
  
  if (queryIntent.referenceName) {
    summaryParts.push(`Similar to "${queryIntent.referenceName}"`);
    
    if (queryIntent.modifierType) {
      switch (queryIntent.modifierType) {
        case 'family-friendly': 
          summaryParts.push('More family-friendly');
          break;
        case 'darker':
          summaryParts.push('Darker tone');
          break;
        case 'lighter':
          summaryParts.push('Lighter content');
          break;
        case 'scarier':
          summaryParts.push('Scarier');
          break;
        case 'more-action':
          summaryParts.push('More action');
          break;
        case 'funnier':
          summaryParts.push('Funnier');
          break;
        case 'more-dramatic':
          summaryParts.push('More dramatic');
          break;
      }
    }
    
    return summaryParts.join(' but ');
  }
  
  if (queryIntent.mood) {
    switch (queryIntent.mood) {
      case 'exciting': 
        summaryParts.push('Exciting content');
        break;
      case 'thoughtful':
        summaryParts.push('Thoughtful, meaningful content');
        break;
      case 'emotional':
        summaryParts.push('Emotional, moving content');
        break;
      case 'scary':
        summaryParts.push('Scary, thrilling content');
        break;
    }
  }
  
  if (queryIntent.context) {
    switch (queryIntent.context) {
      case 'date':
        summaryParts.push('Great for date night');
        break;
      case 'family':
        summaryParts.push('Family-friendly');
        break;
      case 'friends':
        summaryParts.push('Fun with friends');
        break;
      case 'solo':
        summaryParts.push('Perfect for watching alone');
        break;
      case 'learning':
        summaryParts.push('Educational content');
        break;
    }
  }
  
  if (queryIntent.emotionalState) {
    summaryParts.push(`Great when feeling ${queryIntent.emotionalState}`);
  }
  
  if (queryIntent.genres && queryIntent.genres.length > 0) {
    summaryParts.push(queryIntent.genres.join(', '));
  }
  
  if (queryIntent.subjects && queryIntent.subjects.length > 0) {
    summaryParts.push(`About ${queryIntent.subjects.join(', ')}`);
  }
  
  if (queryIntent.timeRange) {
    summaryParts.push(`From ${queryIntent.timeRange.start}-${queryIntent.timeRange.end}`);
  } else if (queryIntent.year) {
    summaryParts.push(`From ${queryIntent.year}`);
  }
  
  if (queryIntent.person) {
    summaryParts.push(`With ${queryIntent.person}`);
  }
  
  return summaryParts.join(' • ');
};