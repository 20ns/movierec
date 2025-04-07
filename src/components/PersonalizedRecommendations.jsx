import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MediaCard } from './MediaCard'; // Assuming MediaCard exists in this path
import { SparklesIcon, ArrowPathIcon, LightBulbIcon } from '@heroicons/react/24/solid';

// Constants for caching
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const RECOMMENDATIONS_CACHE_KEY = 'movieRec_recommendations';
// Session flag to avoid loading screen during the current browsing session
const SESSION_RECS_LOADED_FLAG = 'movieRec_session_loaded';

// Helper function to get cache initially (run outside component scope if possible, or early)
const getInitialCache = (userId) => {
  if (!userId) return null;
  try {
    const cachedString = localStorage.getItem(RECOMMENDATIONS_CACHE_KEY);
    if (cachedString) {
      const parsed = JSON.parse(cachedString);
      const isExpired = Date.now() - parsed.timestamp > CACHE_EXPIRATION_TIME;
      const isSameUser = parsed.userId === userId;
      const hasValidData = Array.isArray(parsed.data) && parsed.data.length > 0;

      if (!isExpired && isSameUser && hasValidData) {
        console.log('Valid cached recommendations found on initial load for user:', userId);
        sessionStorage.setItem(SESSION_RECS_LOADED_FLAG, 'true'); // Mark session as loaded
        return parsed; // Return { timestamp, data, userId, dataSource, reason }
      } else {
         console.log('Cache invalid:', { isExpired, isSameUser, hasValidData });
         localStorage.removeItem(RECOMMENDATIONS_CACHE_KEY); // Clean up invalid cache
      }
    }
    return null;
  } catch (e) {
    console.error('Error reading initial cache:', e);
    localStorage.removeItem(RECOMMENDATIONS_CACHE_KEY); // Clean up potentially corrupted cache
    return null;
  }
};


const PersonalizedRecommendations = forwardRef(({
  currentUser,
  isAuthenticated,
  preferencesUpdated = 0,
  propUserPreferences, // Renamed for clarity
  initialLoadComplete = false // Flag from parent indicating initial app load is done
}, ref) => {

  // --- Initial State Setup ---
  // Attempt to load from cache *before* initial render effects run
  const initialCachedData = getInitialCache(isAuthenticated ? currentUser?.attributes?.sub : null);
  const hasLoadedThisSession = sessionStorage.getItem(SESSION_RECS_LOADED_FLAG) === 'true';

  const [recommendations, setRecommendations] = useState(initialCachedData?.data || []);
  const [userPreferences, setUserPreferences] = useState(null); // Local copy, updated from props
  const [dataSource, setDataSource] = useState(initialCachedData?.dataSource || null);
  const [recommendationReason, setRecommendationReason] = useState(initialCachedData?.reason || '');
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false); // Default to false
  const [hasCheckedQuestionnaire, setHasCheckedQuestionnaire] = useState(false);

  // Loading States: Only true if NO cache AND haven't loaded this session yet
  const [isLoading, setIsLoading] = useState(!initialCachedData && !hasLoadedThisSession);
  const [isThinking, setIsThinking] = useState(!initialCachedData && !hasLoadedThisSession);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Internal State & Refs
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [userFavorites, setUserFavorites] = useState([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [shownRecommendations, setShownRecommendations] = useState(() => new Set(initialCachedData?.data?.map(item => item.id) || [])); // Initialize from cache

  const isFetchingRef = useRef(false);
  // This ref tracks if we have successfully loaded data (from cache or fetch) for the *first time*
  const initialFetchCompletedRef = useRef(initialCachedData !== null);
  const recommendationsContainerRef = useRef(null);

  // --- Cache Management ---
  const saveRecommendationsToCache = useCallback((data, userId, currentDataSource, currentReason) => {
    if (!userId || !Array.isArray(data)) return;
    const cache = {
      timestamp: Date.now(),
      data,
      userId,
      dataSource: currentDataSource || 'unknown',
      reason: currentReason || 'Based on your profile'
    };
    console.log('Saving recommendations to cache:', { userId, count: data.length, dataSource: cache.dataSource });
    localStorage.setItem(RECOMMENDATIONS_CACHE_KEY, JSON.stringify(cache));
    sessionStorage.setItem(SESSION_RECS_LOADED_FLAG, 'true'); // Mark session as loaded
  }, []);

  const getRecommendationsFromCache = useCallback((userId) => {
     // Re-uses the initial logic, could be DRYer but okay for clarity
     return getInitialCache(userId);
  }, []);

  // --- Prop Synchronization ---
  useEffect(() => {
    // Update local preferences when prop changes
    if (propUserPreferences) {
      setUserPreferences(propUserPreferences);
      // We don't automatically fetch here; `preferencesUpdated` prop handles that explicitly.
    }
  }, [propUserPreferences]);

  // --- Initial Checks (Questionnaire, etc.) ---
  useEffect(() => {
    if (isAuthenticated && currentUser?.attributes?.sub && !hasCheckedQuestionnaire) {
      const userId = currentUser.attributes.sub;
      const completionStatus = localStorage.getItem(`questionnaire_completed_${userId}`);
      const completed = completionStatus === 'true';

      console.log(`Questionnaire check for user ${userId}:`, completed);
      setHasCompletedQuestionnaire(completed);
      setHasCheckedQuestionnaire(true);

      // If questionnaire isn't complete, ensure loading states are off
      // and mark initial fetch as "complete" (since we won't fetch)
      if (!completed) {
        setIsLoading(false);
        setIsThinking(false);
        setDataSource('none'); // Indicate no personalization source
        initialFetchCompletedRef.current = true; // Prevent fetch attempts
        console.log('Questionnaire not complete, skipping personalized fetch.');
      }
    }
  }, [isAuthenticated, currentUser, hasCheckedQuestionnaire]);


  // --- Data Fetching Functions ---

  const fetchGenericRecommendations = useCallback(async () => {
    console.log('Fetching generic recommendations...');
    let fetchedItems = [];
    try {
      // Fetch Trending
      const trendingResponse = await axios.get('https://api.themoviedb.org/3/trending/all/week', {
        params: { api_key: process.env.REACT_APP_TMDB_API_KEY, page: Math.floor(Math.random() * 5) + 1 }
      });
      fetchedItems = trendingResponse.data.results
        .filter(item => item.poster_path && item.overview && !shownRecommendations.has(item.id))
        .map(item => ({ ...item, score: Math.round((item.vote_average / 10) * 100) }));

      // Fetch Top Rated Movies if needed
      if (fetchedItems.length < 6) {
        const needed = 6 - fetchedItems.length;
        const topRatedResponse = await axios.get('https://api.themoviedb.org/3/movie/top_rated', {
          params: { api_key: process.env.REACT_APP_TMDB_API_KEY, page: Math.floor(Math.random() * 5) + 1 }
        });
        const existingIds = new Set(fetchedItems.map(item => item.id));
        const additionalItems = topRatedResponse.data.results
          .filter(item => item.poster_path && item.overview && !existingIds.has(item.id) && !shownRecommendations.has(item.id))
          .map(item => ({ ...item, media_type: 'movie', score: Math.round((item.vote_average / 10) * 100) }))
          .slice(0, needed);
        fetchedItems = [...fetchedItems, ...additionalItems];
      }

      fetchedItems = fetchedItems.slice(0, 6); // Ensure max 6

      if (fetchedItems.length > 0) {
        console.log(`Fetched ${fetchedItems.length} generic recommendations.`);
        setRecommendations(fetchedItems);
        setDataSource('generic');
        setRecommendationReason('Popular This Week');
        // Update shown recommendations *only* for generic/fallbacks to avoid rapid cycling
        setShownRecommendations(prev => {
          const newShown = new Set(prev);
          fetchedItems.forEach(item => newShown.add(item.id));
          // Limit shown history size to prevent excessive memory use
          if (newShown.size > 100) {
             const oldest = Array.from(newShown).slice(0, newShown.size - 100);
             oldest.forEach(id => newShown.delete(id));
          }
          return newShown;
        });
        // Do NOT cache generic recommendations as personalized
      } else {
         console.log('No generic recommendations found.');
         setRecommendations([]); // Clear if nothing found
      }
      return fetchedItems;

    } catch (error) {
      console.error('Error fetching generic recommendations:', error);
      setRecommendations([]);
      return [];
    }
  }, [shownRecommendations]); // Depend on shownRecommendations

  const fetchSupplementaryRecommendations = useCallback(async (currentCount, existingIds = new Set()) => {
    // Fetches popular/top-rated to fill gaps, avoiding duplicates
    const minRecommendationCount = 3;
    const neededCount = Math.max(0, minRecommendationCount - currentCount);
    if (neededCount <= 0) return [];

    console.log(`Fetching ${neededCount} supplementary recommendations.`);
    try {
      const [topRatedResponse, popularResponse] = await Promise.all([
        axios.get('https://api.themoviedb.org/3/movie/top_rated', { params: { api_key: process.env.REACT_APP_TMDB_API_KEY, page: Math.floor(Math.random() * 2) + 1 } }),
        axios.get('https://api.themoviedb.org/3/movie/popular', { params: { api_key: process.env.REACT_APP_TMDB_API_KEY, page: Math.floor(Math.random() * 2) + 1 } })
      ]);

      const supplementaryResults = [
        ...topRatedResponse.data.results.map(item => ({ ...item, media_type: 'movie' })),
        ...popularResponse.data.results.map(item => ({ ...item, media_type: 'movie' }))
      ]
      .filter(item => item.poster_path && item.overview && !existingIds.has(item.id) && !shownRecommendations.has(item.id))
      .map(item => ({ ...item, score: Math.round((item.vote_average / 10) * 100) }));

      // Unique items, sorted by vote average, limited to needed count
      const uniqueMap = new Map();
      supplementaryResults.forEach(item => {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });

      const finalSupplementary = Array.from(uniqueMap.values())
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, neededCount);

      console.log(`Fetched ${finalSupplementary.length} supplementary items.`);
      return finalSupplementary;

    } catch (error) {
      console.error('Error fetching supplementary recommendations:', error);
      return [];
    }
  }, [shownRecommendations]);

  const fetchLatestPreferences = useCallback(async () => {
    // Only fetches if needed (e.g., not available from props during refresh)
    if (!isAuthenticated || !currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.log('Cannot fetch preferences: Not authenticated.');
      return null;
    }
    // If we already have them locally (from props), return them
    if (userPreferences) {
       return userPreferences;
    }

    console.log('Fetching latest preferences from API...');
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          console.log('Fetched preferences successfully:', data);
          setUserPreferences(data); // Update local state
          localStorage.setItem('userPrefs', JSON.stringify(data)); // Also cache locally
          return data;
        } else {
           console.log('No preferences data returned from API.');
           localStorage.removeItem('userPrefs');
        }
      } else {
         console.error('Failed to fetch preferences, status:', response.status);
         localStorage.removeItem('userPrefs');
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      localStorage.removeItem('userPrefs');
    }
    setUserPreferences(null); // Ensure state is null if fetch fails
    return null;
  }, [currentUser, isAuthenticated, userPreferences]); // Depend on local userPreferences

  const fetchUserFavoritesAndGenres = useCallback(async () => {
    if (!isAuthenticated || !currentUser?.signInUserSession?.accessToken?.jwtToken) {
        console.log('Cannot fetch favorites: Not authenticated.');
        return { favorites: [], genres: [] };
    }

    console.log('Fetching user favorites...');
    try {
        const response = await fetch(
          `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`,
          {
            headers: {
              Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          }
        );

        if (!response.ok) throw new Error(`Failed to fetch favorites (status: ${response.status})`);

        const data = await response.json();
        const favorites = data?.items || [];
        setUserFavorites(favorites); // Update state

        if (favorites.length > 0) {
          console.log(`Fetched ${favorites.length} favorites.`);
          // Extract genres
          const genrePromises = favorites.map(item =>
            axios.get(`https://api.themoviedb.org/3/${item.mediaType}/${item.mediaId}`, {
              params: { api_key: process.env.REACT_APP_TMDB_API_KEY }
            }).catch(e => {
               console.warn(`Failed to fetch details for ${item.mediaType}/${item.mediaId}:`, e.message);
               return null; // Ignore errors for individual items
            })
          );

          const genreResults = await Promise.all(genrePromises);
          const allGenres = genreResults
            .filter(Boolean) // Filter out null results from errors
            .flatMap(res => res.data?.genres?.map(g => g.id) || []);

          const genreCount = allGenres.reduce((acc, g) => {
            acc[g] = (acc[g] || 0) + 1;
            return acc;
          }, {});

          const topGenres = Object.entries(genreCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3) // Take top 3
            .map(([id]) => id);

          setFavoriteGenres(topGenres); // Update state
          console.log('Derived top genres from favorites:', topGenres);
          return { favorites, genres: topGenres };
        } else {
          console.log('No favorites found.');
          setFavoriteGenres([]);
          return { favorites: [], genres: [] };
        }
    } catch (error) {
        console.error('Error fetching user favorites or genres:', error);
        setUserFavorites([]);
        setFavoriteGenres([]);
        return { favorites: [], genres: [] };
    }
}, [currentUser, isAuthenticated]); // Dependencies


  // --- Core Recommendation Fetching Logic ---
  const fetchRecommendations = useCallback(async (forceRefresh = false) => {
    const userId = currentUser?.attributes?.sub;

    // Guard: Check prerequisites
    if (!isAuthenticated || !userId) {
        console.log('fetchRecommendations skipped: Not authenticated.');
        setIsLoading(false);
        setIsThinking(false);
        return;
    }
    // Guard: Questionnaire must be completed
     if (!hasCompletedQuestionnaire && hasCheckedQuestionnaire) {
      console.log('fetchRecommendations skipped: Questionnaire not complete.');
      setIsLoading(false);
      setIsThinking(false);
      setDataSource('none'); // Ensure data source reflects this
      initialFetchCompletedRef.current = true; // Mark as "complete" since we won't fetch
      return;
    }
    // Guard: Already fetching
    if (isFetchingRef.current) {
      console.log('fetchRecommendations skipped: Fetch already in progress.');
      return;
    }
    // Guard: Already have data and not forcing refresh
    // Check initialFetchCompletedRef *instead* of recommendations.length to allow cache invalidation to work
    if (!forceRefresh && initialFetchCompletedRef.current) {
      console.log('fetchRecommendations skipped: Initial fetch/cache load already completed.');
      // Ensure loading states are off if we somehow got here with them on
      if (isLoading || isThinking) {
         setIsLoading(false);
         setIsThinking(false);
      }
      return;
    }

    console.log(`fetchRecommendations called: forceRefresh=${forceRefresh}, userId=${userId}`);
    isFetchingRef.current = true;
    setIsLoading(true); // Show loading skeleton initially
    setIsThinking(true); // Start thinking animation

    // Short delay for "thinking" feel, only if not refreshing (refresh has its own delay)
    if (!isRefreshing && !hasLoadedThisSession) {
        await new Promise(resolve => setTimeout(resolve, 1200)); // Adjust delay as needed
    }

    let fetchedRecs = [];
    let finalDataSource = 'generic'; // Default
    let finalReason = 'Popular This Week';

    try {
        // Step 1: Get latest Preferences and Favorites (concurrently)
        const [prefsData, favData] = await Promise.all([
            fetchLatestPreferences(),
            fetchUserFavoritesAndGenres()
        ]);
        const effectivePreferences = prefsData; // Already updated state in fetchLatestPreferences if successful
        const currentFavorites = favData.favorites;
        const derivedFavoriteGenres = favData.genres; // Genres from favorites

        // Determine if we have enough data for personalized recs
        const hasPreferences = effectivePreferences && (
            effectivePreferences.favoriteGenres?.length > 0 ||
            effectivePreferences.contentType ||
            effectivePreferences.eraPreferences?.length > 0 ||
            effectivePreferences.moodPreferences?.length > 0 ||
            effectivePreferences.languagePreferences?.length > 0 ||
            effectivePreferences.runtimePreference
        );
        const hasFavorites = currentFavorites.length > 0;

        console.log('Personalization data check:', { hasPreferences, hasFavorites });

        // Step 2: If no personalization data, fallback to generic
        if (!hasPreferences && !hasFavorites) {
            console.log('No personalization data available, fetching generic.');
            finalDataSource = 'generic';
            finalReason = 'Popular This Week';
            fetchedRecs = await fetchGenericRecommendations();

        } else {
            // Step 3: Prepare parameters for personalized fetch
            let mediaType = 'movie'; // Default
            if (effectivePreferences?.contentType === 'tv') mediaType = 'tv';
            else if (effectivePreferences?.contentType === 'movies') mediaType = 'movie';
            // Could add logic here to infer from favorites if contentType is 'any' or unset

            let genresToUse = effectivePreferences?.favoriteGenres?.length > 0
                ? effectivePreferences.favoriteGenres
                : derivedFavoriteGenres; // Fallback to favorite-derived genres

            // Add other preference filters (era, mood, runtime, language/region)
            // (Code for yearParams, moodParams, runtimeParams, regionParams - same as your original logic)
            let yearParams = {};
            if (hasPreferences && effectivePreferences.eraPreferences?.length > 0) {
              // ... (same era logic as before)
              if (effectivePreferences.eraPreferences.includes('classic')) { yearParams[mediaType === 'movie' ? 'release_date.lte' : 'first_air_date.lte'] = '1980-12-31'; }
              else if (effectivePreferences.eraPreferences.includes('modern')) { /* 1980-2010 */ yearParams[mediaType === 'movie' ? 'release_date.gte' : 'first_air_date.gte'] = '1980-01-01'; yearParams[mediaType === 'movie' ? 'release_date.lte' : 'first_air_date.lte'] = '2010-12-31';}
              else if (effectivePreferences.eraPreferences.includes('recent')) { yearParams[mediaType === 'movie' ? 'release_date.gte' : 'first_air_date.gte'] = '2011-01-01';}
            }
            let moodParams = {};
             if (hasPreferences && effectivePreferences.moodPreferences?.length > 0) {
                const moodGenresMap = { /* ... same map ... */ 'exciting': '28,12,10752,878', 'funny': '35,16,10751', 'thoughtful': '18,99,36,9648', 'scary': '27,9648,53', 'emotional': '10749,18,10751,10402' };
                let moodGenres = [...new Set(effectivePreferences.moodPreferences.flatMap(mood => moodGenresMap[mood]?.split(',') || []))];
                if (moodGenres.length > 0) moodParams.with_genres = moodGenres.join(','); // Will be merged/overridden by specific genres later if both exist
            }
            let runtimeParams = {};
            if (hasPreferences && effectivePreferences.runtimePreference && mediaType === 'movie') {
               switch (effectivePreferences.runtimePreference) { /* ... same runtime logic ... */ case 'short': runtimeParams['with_runtime.lte'] = '90'; break; case 'medium': runtimeParams['with_runtime.gte'] = '90'; runtimeParams['with_runtime.lte'] = '120'; break; case 'long': runtimeParams['with_runtime.gte'] = '120'; break; }
            }
            let regionParams = {};
            if (hasPreferences && effectivePreferences.languagePreferences?.length > 0) {
                const languageMap = { /* ... same map ... */ 'en': { region: 'US,GB,CA,AU', language: 'en' }, 'es': { region: 'ES,MX', language: 'es' }, 'fr': { region: 'FR,CA', language: 'fr' }, 'de': { region: 'DE,AT', language: 'de' }, 'hi': { region: 'IN', language: 'hi' }, 'ja': { region: 'JP', language: 'ja' }, 'ko': { region: 'KR', language: 'ko' }, 'zh': { region: 'CN,TW,HK', language: 'zh' }, 'any': {} };
                for (const pref of effectivePreferences.languagePreferences) {
                   if (pref !== 'any' && languageMap[pref]) { /* ... same language/region logic ... */ if(languageMap[pref].region) regionParams.region = languageMap[pref].region; if(languageMap[pref].language) regionParams.with_original_language = languageMap[pref].language; break;}
                }
                if (effectivePreferences.languagePreferences.includes('hi')) { regionParams.region = 'IN'; regionParams.with_original_language = 'hi';}
            }

            // Combine genre sources (prioritize specific over mood if both present)
            const finalGenreParam = genresToUse.length > 0 ? genresToUse.join(',') : moodParams.with_genres;
            if (genresToUse.length > 0 && moodParams.with_genres) {
                // If specific genres are selected, they usually override broad mood genres
                delete moodParams.with_genres;
            }


            // Step 4: Fetch from TMDB Discover endpoint
            if (genresToUse.length > 0 || Object.keys(moodParams).length > 0 || Object.keys(regionParams).length > 0 || Object.keys(yearParams).length > 0 ) {
                console.log(`Fetching personalized ${mediaType} recommendations with params:`, { genres: finalGenreParam, regionParams, yearParams, moodParams, runtimeParams });
                const response = await axios.get(
                    `https://api.themoviedb.org/3/discover/${mediaType}`,
                    {
                        params: {
                            api_key: process.env.REACT_APP_TMDB_API_KEY,
                            with_genres: finalGenreParam,
                            sort_by: 'popularity.desc',
                            page: Math.floor(Math.random() * 3) + 1,
                            'vote_count.gte': 50, // Slightly higher vote count for personalized
                            include_adult: false,
                            ...yearParams,
                            ...moodParams, // Will not contain with_genres if specific genres used
                            ...regionParams,
                            ...runtimeParams,
                        }
                    }
                );

                const favoriteIds = new Set(currentFavorites.map(fav => fav.mediaId));
                fetchedRecs = response.data.results
                    .filter(item => item.poster_path && item.overview && !favoriteIds.has(item.id.toString())) // Exclude favorited
                    .map(item => ({
                        ...item,
                        media_type: mediaType,
                        score: Math.round((item.vote_average / 10) * 100)
                    }))
                    .slice(0, 6); // Limit results

                 console.log(`Fetched ${fetchedRecs.length} personalized items initially.`);

                 // Determine data source and reason based on what was used
                 if (hasPreferences && hasFavorites) {
                     finalDataSource = 'both';
                     finalReason = 'Based on your preferences and favorites';
                 } else if (hasPreferences) {
                     finalDataSource = 'preferences';
                     finalReason = 'Based on your questionnaire responses';
                 } else {
                     finalDataSource = 'favorites';
                     finalReason = 'Because you liked similar items';
                 }

                 // Step 5: Fetch supplementary if needed
                 if (fetchedRecs.length < 3) {
                     const existingIds = new Set(fetchedRecs.map(r => r.id));
                     const supplementary = await fetchSupplementaryRecommendations(fetchedRecs.length, existingIds);
                     fetchedRecs = [...fetchedRecs, ...supplementary].slice(0, 6);
                     console.log(`Total recommendations after supplementary: ${fetchedRecs.length}`);
                 }

            } else {
                 // Fallback if no specific criteria could be formed (should be rare if hasPrefs/hasFavs is true)
                 console.log('No specific criteria for personalized fetch, falling back to generic.');
                 finalDataSource = 'generic';
                 finalReason = 'Popular This Week';
                 fetchedRecs = await fetchGenericRecommendations();
            }
        }

        // Step 6: Update state and cache (only cache personalized results)
        if (fetchedRecs.length > 0) {
            setRecommendations(fetchedRecs);
            setDataSource(finalDataSource);
            setRecommendationReason(finalReason);
            // Only cache if it was personalized, not generic fallback
            if (finalDataSource !== 'generic' && finalDataSource !== 'none') {
                 saveRecommendationsToCache(fetchedRecs, userId, finalDataSource, finalReason);
            }
        } else {
             console.log('No recommendations found, even after fallbacks.');
             setRecommendations([]); // Clear if nothing found
             setDataSource('none');
             setRecommendationReason('');
             // Maybe fetch generic one last time if everything else failed?
             await fetchGenericRecommendations();
        }

    } catch (error) {
        console.error('Error during fetchRecommendations process:', error);
        // Fallback to generic on any major error in the personalized path
        await fetchGenericRecommendations(); // Show something rather than nothing
        setDataSource('generic'); // Ensure dataSource reflects the fallback
        setRecommendationReason('Popular This Week');
    } finally {
        // Use setTimeout to ensure the "thinking" state persists for a minimum duration for UX
        setTimeout(() => {
            setIsThinking(false);
            setIsLoading(false); // Turn off skeleton loader
            setIsRefreshing(false);
            isFetchingRef.current = false;
            initialFetchCompletedRef.current = true; // Mark as complete
            sessionStorage.setItem(SESSION_RECS_LOADED_FLAG, 'true'); // Ensure session flag is set
            console.log('fetchRecommendations finished.');
        }, isRefreshing ? 300 : 800); // Shorter delay if refreshing, longer otherwise
    }
  }, [
    currentUser, isAuthenticated, hasCompletedQuestionnaire, hasCheckedQuestionnaire, // Core dependencies
    fetchLatestPreferences, fetchUserFavoritesAndGenres, fetchGenericRecommendations, fetchSupplementaryRecommendations, // Fetch helpers
    saveRecommendationsToCache, // Cache helper
    isRefreshing, hasLoadedThisSession // State influencing behavior
    // Removed userPreferences, favoriteGenres, userFavorites - fetch functions get latest inside
  ]);


  // --- Effect Hooks ---

  // Main effect to trigger initial fetch if needed
  useEffect(() => {
    console.log('Main fetch effect check:', {
        isAuthenticated, initialLoadComplete, hasCompletedQuestionnaire, hasCheckedQuestionnaire,
        initialFetchCompleted: initialFetchCompletedRef.current, isFetching: isFetchingRef.current
    });
    // Only run if authenticated, initial app load is complete, questionnaire status is known,
    // and we haven't completed the first fetch/cache load yet.
    if (isAuthenticated && initialLoadComplete && hasCheckedQuestionnaire && !initialFetchCompletedRef.current && !isFetchingRef.current) {
        console.log('Triggering initial fetchRecommendations...');
        fetchRecommendations(false);
    } else if (isAuthenticated && initialLoadComplete && hasCheckedQuestionnaire && !hasCompletedQuestionnaire && !initialFetchCompletedRef.current) {
        // Explicitly handle case where questionnaire isn't done after check
        console.log('Questionnaire not complete, ensuring fetch is skipped and state is clean.');
        setIsLoading(false);
        setIsThinking(false);
        setDataSource('none');
        initialFetchCompletedRef.current = true; // Prevent future attempts until state changes
    }
  }, [isAuthenticated, initialLoadComplete, hasCompletedQuestionnaire, hasCheckedQuestionnaire, fetchRecommendations]); // Add fetchRecommendations


  // Effect to handle preference updates from parent
  useEffect(() => {
    if (preferencesUpdated > 0 && isAuthenticated && currentUser?.attributes?.sub) {
        console.log('Preferences updated, triggering cache clear and refresh.');
        // Clear cache *before* refresh starts
        localStorage.removeItem(RECOMMENDATIONS_CACHE_KEY);
        sessionStorage.removeItem(SESSION_RECS_LOADED_FLAG);
        // Mark that we need to fetch again
        initialFetchCompletedRef.current = false;
        // Trigger the refresh handler
        handleRefresh();
    }
    // Intentionally disable exhaustive-deps, handleRefresh has its own useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencesUpdated, isAuthenticated, currentUser?.attributes?.sub]); // Add handleRefresh dependency if needed


  // --- Event Handlers & Imperative Handle ---

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isFetchingRef.current) return; // Prevent multiple refreshes

    console.log('handleRefresh called.');
    setIsRefreshing(true);
    setIsThinking(true); // Show thinking immediately
    setRefreshCounter(prev => prev + 1);

    // Scroll to top smoothly
    recommendationsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Clear cache and session flag *again* just to be sure
    if (currentUser?.attributes?.sub) {
        localStorage.removeItem(RECOMMENDATIONS_CACHE_KEY);
        sessionStorage.removeItem(SESSION_RECS_LOADED_FLAG);
    }
    // Mark that we absolutely need to fetch fresh data
    initialFetchCompletedRef.current = false;

    // Add a small delay *before* fetching for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500)); // Short delay for refresh spin

    await fetchRecommendations(true); // Force fetch from API

    // Note: The finally block in fetchRecommendations handles turning off isRefreshing/isThinking
  }, [isRefreshing, currentUser?.attributes?.sub, fetchRecommendations]); // Add fetchRecommendations dependency


  useImperativeHandle(ref, () => ({
    refresh: handleRefresh
  }), [handleRefresh]); // Dependency: handleRefresh


  // Listen for external refresh events (e.g., from header)
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log("Received external refresh-recommendations event");
      handleRefresh();
    };
    document.addEventListener('refresh-recommendations', handleRefreshEvent);
    return () => {
      document.removeEventListener('refresh-recommendations', handleRefreshEvent);
    };
  }, [handleRefresh]); // Dependency: handleRefresh


  // --- Render Logic ---

  // Don't render anything until authentication status and questionnaire check are resolved
  if (!isAuthenticated || !hasCheckedQuestionnaire) {
     console.log('Rendering null: Not authenticated or questionnaire check pending.');
     return null;
  }

  // Special case: If questionnaire is definitively not completed, show *only* the prompt to complete it
  if (!hasCompletedQuestionnaire) {
      console.log('Rendering Questionnaire Prompt Only');
      return (
          <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-12 max-w-7xl mx-auto px-4"
          >
             <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-6 shadow-lg border border-indigo-800">
                <div className="flex items-center">
                    <motion.div initial={{ rotate: -10, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="mr-5 flex-shrink-0">
                        <SparklesIcon className="h-10 w-10 text-purple-300" />
                    </motion.div>
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Unlock Personalized Recommendations</h3>
                        <p className="text-purple-200 leading-relaxed mb-4">
                        Complete your quick preference profile to discover movies and shows tailored just for you!
                        </p>
                        <button
                          className="px-4 py-2 bg-white text-purple-900 rounded-lg font-medium hover:bg-purple-100 transition-colors"
                          onClick={() => document.dispatchEvent(new CustomEvent('open-questionnaire'))}
                        >
                        Start Questionnaire
                        </button>
                    </div>
                </div>
             </div>
          </motion.section>
      );
  }

  // --- Main Render for Authenticated Users with Completed Questionnaire ---
  console.log('Rendering main section:', { isLoading, isThinking, recsCount: recommendations.length, dataSource });

  return (
    <motion.section
      ref={recommendationsContainerRef}
      initial={{ opacity: 0 }} // Keep initial simple, let AnimatePresence handle entry
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="mb-12 max-w-7xl mx-auto px-4 scroll-mt-24" // Added scroll-mt-24
    >
      {/* Header: Title and Refresh Button */}
      <div className="flex justify-between items-center mb-4">
         <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
             <AnimatePresence mode="wait">
                 <motion.span
                     key={`heading-${dataSource || 'loading'}-${refreshCounter}`} // Key ensures animation on change
                     initial={{ opacity: 0, y: -15 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 15 }}
                     transition={{ duration: 0.3, ease: 'easeInOut' }}
                 >
                     {isThinking ? "Finding Recommendations..." :
                      dataSource === 'both' ? 'For You (Prefs & Favs)' :
                      dataSource === 'preferences' ? 'Based on Your Preferences' :
                      dataSource === 'favorites' ? 'Because You Liked' :
                      dataSource === 'generic' ? 'Popular This Week' :
                      'Recommendations'}
                 </motion.span>
             </AnimatePresence>
         </h2>
         {/* Show refresh button only if not initially loading/thinking or if there are recs */}
         {(!isLoading || recommendations.length > 0) && (
             <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={handleRefresh}
                 disabled={isRefreshing || isThinking} // Disable while processing
                 className={`flex items-center space-x-1 text-sm ${isRefreshing || isThinking ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-3 py-1 rounded-full transition-colors duration-200`}
             >
                 <motion.div
                    animate={isRefreshing || isThinking ? { rotate: 360 } : { rotate: 0 }}
                    transition={isRefreshing || isThinking ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.3 }}
                 >
                    <ArrowPathIcon className="h-4 w-4" />
                 </motion.div>
                 <span>{isRefreshing || isThinking ? 'Refreshing...' : 'Refresh'}</span>
             </motion.button>
         )}
      </div>

      {/* Recommendation Reason */}
      {!isThinking && !isLoading && recommendationReason && recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center bg-gray-800/60 rounded-lg p-2 mb-4 text-sm text-gray-300 overflow-hidden"
        >
          <LightBulbIcon className="h-4 w-4 text-yellow-400 mr-2 flex-shrink-0" />
          <span>{recommendationReason}</span>
        </motion.div>
      )}

      {/* Content Area: Thinking, Loading, Recommendations, or Empty State */}
      <AnimatePresence mode="wait">
        {isThinking ? (
          // Thinking Animation (Prioritized over Loading Skeleton)
          <motion.div
            key={`thinking-${refreshCounter}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 mb-6 shadow-lg"
          >
            {/* Simplified Thinking Animation */}
            <div className="flex flex-col items-center justify-center space-y-4 min-h-[200px]">
               <motion.div
                 animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                 transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                 className="text-5xl"
               >
                 🧠
               </motion.div>
               <p className="text-lg font-semibold text-indigo-300">Thinking...</p>
               <div className="w-3/4 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                     className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                     initial={{ x: "-100%" }}
                     animate={{ x: "100%" }}
                     transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
               </div>
            </div>
          </motion.div>

        ) : isLoading ? (
          // Loading Skeleton (Only shown if not Thinking)
          <motion.div
            key={`loading-${refreshCounter}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl h-[350px] shadow-md overflow-hidden animate-pulse">
                <div className="h-3/5 bg-gray-700"></div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                </div>
              </div>
            ))}
          </motion.div>

        ) : recommendations.length > 0 ? (
          // Recommendations Grid
          <motion.div
            key={`recommendations-${refreshCounter}`} // Key changes on refresh for exit/enter animation
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            exit="exit" // Animate exit on refresh
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
              exit: { opacity: 0, transition: { staggerChildren: 0.05, staggerDirection: -1 } }
            }}
          >
            {recommendations.map((item) => (
              <motion.div
                key={item.id} // Use item id as key
                layout // Enable layout animation for smoother reshuffles (optional)
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
                  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } }
                }}
              >
                <MediaCard
                  result={item}
                  currentUser={currentUser}
                  // Pass necessary props to MediaCard
                />
              </motion.div>
            ))}
          </motion.div>

        ) : (
           // Empty State (No recommendations found after loading/thinking)
           <motion.div
             key="empty-state"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.4 }}
             className="text-center py-12 bg-gray-800/50 rounded-xl p-8 border border-gray-700"
           >
             <motion.div
               initial={{ scale: 0.8, opacity: 0.5 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ duration: 0.5, delay: 0.1 }}
               className="mb-4 text-5xl text-indigo-400"
             >
               🤷‍♂️
             </motion.div>
             <h3 className="text-xl font-semibold text-white mb-3">Couldn't find recommendations right now.</h3>
             <p className="text-gray-400 max-w-md mx-auto mb-6">
                This might happen if your preferences are very specific or if there was trouble fetching data. Try refreshing, adding more favorites, or adjusting your preferences.
             </p>
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={handleRefresh}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full transition-colors"
               disabled={isRefreshing || isThinking}
             >
                {isRefreshing || isThinking ? 'Trying again...' : 'Try Refreshing'}
             </motion.button>
           </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
});

PersonalizedRecommendations.displayName = 'PersonalizedRecommendations';

export default PersonalizedRecommendations;