import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MediaCard } from './MediaCard';
import { SparklesIcon, ArrowPathIcon, LightBulbIcon } from '@heroicons/react/24/solid';

// Constants
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours
const RECOMMENDATIONS_CACHE_KEY_PREFIX = 'movieRec_recommendations_';
const SESSION_RECS_LOADED_FLAG = 'movieRec_session_loaded';
const MIN_RECOMMENDATION_COUNT = 3; // Minimum desired recommendations
const MAX_RECOMMENDATION_COUNT = 6; // Maximum recommendations to show
const SHOWN_ITEMS_LIMIT = 150; // Limit history of shown generic/supplementary items

// Helper to get user-specific cache key
const getCacheKey = (userId) => userId ? `${RECOMMENDATIONS_CACHE_KEY_PREFIX}${userId}` : null;

// Helper function to get cache
const getRecommendationsFromCache = (userId) => {
    const cacheKey = getCacheKey(userId);
    if (!cacheKey) return null;
    try {
        const cachedString = localStorage.getItem(cacheKey);
        if (cachedString) {
            const parsed = JSON.parse(cachedString);
            const isExpired = Date.now() - parsed.timestamp > CACHE_EXPIRATION_TIME;
            if (!isExpired && Array.isArray(parsed.data) && parsed.data.length > 0) {
                console.log('[Cache] Valid cache found for user:', userId);
                sessionStorage.setItem(SESSION_RECS_LOADED_FLAG, 'true');
                return parsed;
            } else {
                console.log('[Cache] Invalid or empty cache for user:', userId, { isExpired, hasData: Array.isArray(parsed.data) && parsed.data.length > 0 });
                localStorage.removeItem(cacheKey);
            }
        } else {
            // console.log('[Cache] No cache found for user:', userId);
        }
        return null;
    } catch (e) {
        console.error('[Cache] Error reading cache for user:', userId, e);
        localStorage.removeItem(cacheKey);
        return null;
    }
};

const PersonalizedRecommendations = forwardRef(({
  currentUser,
  isAuthenticated,
  propUserPreferences,
  propHasCompletedQuestionnaire,
  initialAppLoadComplete
}, ref) => {

  const userId = isAuthenticated ? currentUser?.attributes?.sub : null;

  // --- State ---
  const [recommendations, setRecommendations] = useState([]);
  const [dataSource, setDataSource] = useState(null);
  const [recommendationReason, setRecommendationReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shownItemsHistory, setShownItemsHistory] = useState(() => new Set()); // Tracks non-personalized items shown
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [cacheChecked, setCacheChecked] = useState(false);

  // --- Refs ---
  const isFetchingRef = useRef(false);
  const dataLoadCompletedRef = useRef(false); // Tracks if data load attempt *completed* for current state
  const recommendationsContainerRef = useRef(null);

  // --- Cache Management ---
  const saveRecommendationsToCache = useCallback((data, currentUserId, currentDataSource, currentReason) => {
    const currentCacheKey = getCacheKey(currentUserId);
    if (!currentCacheKey || !Array.isArray(data) || data.length === 0) return;
    if (currentDataSource === 'generic' || currentDataSource === 'none' || currentDataSource === 'supplementary') {
       console.log('[Cache] Skipping cache save for non-personalized source:', currentDataSource);
       return;
    }
    const cache = { timestamp: Date.now(), data, dataSource: currentDataSource, reason: currentReason };
    try {
        localStorage.setItem(currentCacheKey, JSON.stringify(cache));
        sessionStorage.setItem(SESSION_RECS_LOADED_FLAG, 'true');
        console.log('[Cache] Saved recommendations for user:', currentUserId, { count: data.length, dataSource: cache.dataSource });
    } catch (e) {
        console.error("[Cache] Error saving recommendations to localStorage:", e);
        localStorage.removeItem(currentCacheKey);
    }
  }, []);

  // --- Effect to Load Initial Cache ---
  useEffect(() => {
    if (userId && !cacheChecked) {
        console.log(`[Init] Checking cache for user ${userId}...`);
        const cached = getRecommendationsFromCache(userId);
        if (cached) {
            setRecommendations(cached.data);
            setDataSource(cached.dataSource);
            setRecommendationReason(cached.reason);
            // Don't populate shownItemsHistory from cache, let generic fetches handle it if needed
            dataLoadCompletedRef.current = true;
            console.log("[Init] Loaded recommendations from cache.");
        } else {
            setRecommendations([]); // Ensure empty if no cache
            setDataSource(null);
            setRecommendationReason('');
            dataLoadCompletedRef.current = false; // Ensure fetch happens if no cache
        }
        setCacheChecked(true);
    } else if (!userId) {
        // Reset on logout
        setRecommendations([]); setDataSource(null); setRecommendationReason('');
        setCacheChecked(false); dataLoadCompletedRef.current = false;
        setShownItemsHistory(new Set()); // Clear history on logout
        sessionStorage.removeItem(SESSION_RECS_LOADED_FLAG);
    }
  }, [userId, cacheChecked]);

  // --- Data Fetching Functions ---

  const fetchGenericRecommendations = useCallback(async (excludeIds = new Set()) => {
    console.log('[Fetch] Fetching generic recommendations...');
    let fetchedItems = [];
    const combinedExclusions = new Set([...excludeIds, ...shownItemsHistory]);
    console.log(`[Fetch] Generic exclusions count: ${combinedExclusions.size}`);

    try {
        // Fetch Trending
        const trendingResponse = await axios.get('https://api.themoviedb.org/3/trending/all/week', {
            params: { api_key: process.env.REACT_APP_TMDB_API_KEY, page: Math.floor(Math.random() * 5) + 1 }
        });
        fetchedItems = trendingResponse.data.results
            .filter(item => item.poster_path && item.overview && !combinedExclusions.has(item.id))
            .map(item => ({ ...item, score: Math.round((item.vote_average / 10) * 100) }));

        // Fetch Top Rated Movies if needed
        if (fetchedItems.length < MAX_RECOMMENDATION_COUNT) {
            const needed = MAX_RECOMMENDATION_COUNT - fetchedItems.length;
            const topRatedResponse = await axios.get('https://api.themoviedb.org/3/movie/top_rated', {
                params: { api_key: process.env.REACT_APP_TMDB_API_KEY, page: Math.floor(Math.random() * 5) + 1 }
            });
            const currentIds = new Set(fetchedItems.map(item => item.id));
            const additionalItems = topRatedResponse.data.results
                .filter(item => item.poster_path && item.overview && !currentIds.has(item.id) && !combinedExclusions.has(item.id))
                .map(item => ({ ...item, media_type: 'movie', score: Math.round((item.vote_average / 10) * 100) }))
                .slice(0, needed);
            fetchedItems = [...fetchedItems, ...additionalItems];
        }

        fetchedItems = fetchedItems.slice(0, MAX_RECOMMENDATION_COUNT);

        if (fetchedItems.length > 0) {
            console.log(`[Fetch] Fetched ${fetchedItems.length} generic items.`);
            // Update history *only* for generic/supplementary items shown
            setShownItemsHistory(prev => {
                const newShown = new Set(prev);
                fetchedItems.forEach(item => newShown.add(item.id));
                // Limit history size
                if (newShown.size > SHOWN_ITEMS_LIMIT) {
                    const oldest = Array.from(newShown).slice(0, newShown.size - SHOWN_ITEMS_LIMIT);
                    console.log(`[History] Pruning ${oldest.length} oldest shown items.`);
                    oldest.forEach(id => newShown.delete(id));
                }
                return newShown;
            });
        } else {
            console.log('[Fetch] No generic recommendations found after filtering.');
        }
        return fetchedItems;
    } catch (error) {
        console.error('[Fetch] Error fetching generic recommendations:', error.response?.data || error.message);
        return [];
    }
  }, [shownItemsHistory]); // Depend on history

  const fetchSupplementaryRecommendations = useCallback(async (currentCount, existingIds = new Set()) => {
    const neededCount = Math.max(0, MIN_RECOMMENDATION_COUNT - currentCount);
    if (neededCount <= 0) return [];

    console.log(`[Fetch] Fetching ${neededCount} supplementary recommendations.`);
    const combinedExclusions = new Set([...existingIds, ...shownItemsHistory]);
    console.log(`[Fetch] Supplementary exclusions count: ${combinedExclusions.size}`);

    try {
        const [topRatedResponse, popularResponse] = await Promise.all([
            axios.get('https://api.themoviedb.org/3/movie/top_rated', { params: { api_key: process.env.REACT_APP_TMDB_API_KEY, page: Math.floor(Math.random() * 2) + 1 } }),
            axios.get('https://api.themoviedb.org/3/movie/popular', { params: { api_key: process.env.REACT_APP_TMDB_API_KEY, page: Math.floor(Math.random() * 2) + 1 } })
        ]);
        const supplementaryResults = [
            ...topRatedResponse.data.results.map(item => ({ ...item, media_type: 'movie' })),
            ...popularResponse.data.results.map(item => ({ ...item, media_type: 'movie' }))
        ]
        .filter(item => item.poster_path && item.overview && !combinedExclusions.has(item.id))
        .map(item => ({ ...item, score: Math.round((item.vote_average / 10) * 100) }));

        const uniqueMap = new Map();
        supplementaryResults.forEach(item => { if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item); });
        const finalSupplementary = Array.from(uniqueMap.values()).sort((a, b) => b.vote_average - a.vote_average).slice(0, neededCount);

        console.log(`[Fetch] Fetched ${finalSupplementary.length} supplementary items.`);
        if (finalSupplementary.length > 0) {
             // Update history for supplementary items shown
             setShownItemsHistory(prev => {
                 const newShown = new Set(prev);
                 finalSupplementary.forEach(item => newShown.add(item.id));
                 if (newShown.size > SHOWN_ITEMS_LIMIT) { /* Limit size */ Array.from(newShown).slice(0, newShown.size - SHOWN_ITEMS_LIMIT).forEach(id => newShown.delete(id)); }
                 return newShown;
             });
        }
        return finalSupplementary;
    } catch (error) {
        console.error('[Fetch] Error fetching supplementary recommendations:', error.response?.data || error.message);
        return [];
    }
  }, [shownItemsHistory]); // Depend on history

  const fetchUserFavoritesAndGenres = useCallback(async (token) => {
    if (!token) return { favorites: [], genres: [] };
    console.log('[Fetch] Fetching user favorites for recommendation engine...');
    try {
        const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, credentials: 'include'
        });
        if (!response.ok) throw new Error(`Favorites API Error: Status ${response.status}`);
        const data = await response.json();
        const favorites = data?.items || [];
        if (favorites.length === 0) {
            console.log('[Fetch] No favorites found.');
            return { favorites: [], genres: [] };
        }
        console.log(`[Fetch] Fetched ${favorites.length} favorites.`);
        // Derive genres (same logic as before)
        const genrePromises = favorites.map(item =>
            axios.get(`https://api.themoviedb.org/3/${item.mediaType}/${item.mediaId}`, { params: { api_key: process.env.REACT_APP_TMDB_API_KEY } })
            .catch(e => { console.warn(`[Fetch] Failed TMDB details for ${item.mediaType}/${item.mediaId}:`, e.message); return null; })
        );
        const genreResults = await Promise.all(genrePromises);
        const allGenres = genreResults.filter(Boolean).flatMap(res => res.data?.genres?.map(g => g.id) || []);
        const genreCount = allGenres.reduce((acc, g) => { acc[g] = (acc[g] || 0) + 1; return acc; }, {});
        const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => parseInt(id, 10)); // Ensure IDs are numbers
        console.log('[Fetch] Derived top genres from favorites:', topGenres);
        return { favorites, genres: topGenres };
    } catch (error) {
        console.error('[Fetch] Error fetching user favorites or deriving genres:', error);
        return { favorites: [], genres: [] };
    }
  }, []);


  // --- Core Recommendation Fetching Logic ---
  const fetchRecommendations = useCallback(async (forceRefresh = false) => {
    const currentUserId = currentUser?.attributes?.sub;
    const currentToken = currentUser?.signInUserSession?.accessToken?.jwtToken;

    // Guards
    if (!isAuthenticated || !currentUserId || !currentToken) { console.log('[FetchRecs] Skipped: Not authenticated.'); return; }
    if (!propHasCompletedQuestionnaire) { console.log('[FetchRecs] Skipped: Questionnaire incomplete.'); setRecommendations([]); setDataSource('none'); setRecommendationReason('Complete your profile for recommendations.'); dataLoadCompletedRef.current = true; setIsLoading(false); setIsThinking(false); return; }
    if (isFetchingRef.current) { console.log('[FetchRecs] Skipped: Fetch already in progress.'); return; }
    if (!forceRefresh && dataLoadCompletedRef.current) { console.log('[FetchRecs] Skipped: Data already loaded and no force refresh.'); return; }

    console.log(`[FetchRecs] Called: forceRefresh=${forceRefresh}, userId=${currentUserId}`);
    isFetchingRef.current = true;
    setIsRefreshing(forceRefresh);
    setIsThinking(true);
    if (recommendations.length === 0 || forceRefresh) {
        console.log("[FetchRecs] Setting isLoading to true.");
        setIsLoading(true);
    }

    // Clear shown history only on forced refresh to allow more generic results potentially
    if (forceRefresh) {
        console.log("[FetchRecs] Clearing shownItemsHistory due to forced refresh.");
        setShownItemsHistory(new Set());
    }

    await new Promise(resolve => setTimeout(resolve, forceRefresh ? 500 : 1000)); // Thinking delay

    let fetchedRecs = [];
    let finalDataSource = 'none'; // Start with 'none'
    let finalReason = '';
    let personalizationAttempted = false;

    try {
        // Step 1: Get Preferences (from prop) and Fetch Favorites
        const effectivePreferences = propUserPreferences;
        console.log("[FetchRecs] Effective Preferences:", effectivePreferences);
        const favData = await fetchUserFavoritesAndGenres(currentToken);
        const currentFavorites = favData.favorites;
        const derivedFavoriteGenres = favData.genres;
        const favoriteIds = new Set(currentFavorites.map(fav => fav.mediaId.toString())); // Ensure string IDs for comparison
        console.log(`[FetchRecs] Favorite IDs Count: ${favoriteIds.size}`);


        // Step 2: Determine if personalized fetch is possible
        const hasValidPreferences = effectivePreferences && (
            effectivePreferences.favoriteGenres?.length > 0 ||
            effectivePreferences.contentType ||
            effectivePreferences.eraPreferences?.length > 0 ||
            effectivePreferences.moodPreferences?.length > 0 ||
            effectivePreferences.languagePreferences?.length > 0 ||
            effectivePreferences.runtimePreference
        );
        const hasFavorites = currentFavorites.length > 0;
        console.log('[FetchRecs] Personalization data check:', { hasValidPreferences, hasFavorites });

        // Step 3: Attempt Personalized Fetch if data exists
        if (hasValidPreferences || hasFavorites) {
            personalizationAttempted = true;
            let mediaType = 'movie'; // Default
            if (effectivePreferences?.contentType === 'tv') mediaType = 'tv';
            // Allow 'any' or infer based on genre/favorites later if needed

            let genresToUse = effectivePreferences?.favoriteGenres?.length > 0
                ? effectivePreferences.favoriteGenres
                : derivedFavoriteGenres; // Fallback to favorite-derived genres

            console.log("[FetchRecs] Genres for TMDB query:", genresToUse);

            // Build TMDB parameters
            const params = {
                api_key: process.env.REACT_APP_TMDB_API_KEY,
                sort_by: 'popularity.desc',
                page: Math.floor(Math.random() * 3) + 1,
                'vote_count.gte': 50,
                include_adult: false,
            };

            // Add genres (prioritize specific over mood)
            const moodGenreMap = { 'exciting': '28,12,10752,878', 'funny': '35,16,10751', 'thoughtful': '18,99,36,9648', 'scary': '27,9648,53', 'emotional': '10749,18,10751,10402' };
            let moodGenres = [];
            if (hasValidPreferences && effectivePreferences.moodPreferences?.length > 0) {
                moodGenres = [...new Set(effectivePreferences.moodPreferences.flatMap(mood => moodGenreMap[mood]?.split(',') || []))].map(g => parseInt(g, 10));
            }

            if (genresToUse.length > 0) {
                params.with_genres = genresToUse.join(',');
            } else if (moodGenres.length > 0) {
                params.with_genres = moodGenres.join(','); // Use mood genres if no specific ones
            }

            // Add other filters if available from valid preferences
            if (hasValidPreferences) {
                // Era
                if (effectivePreferences.eraPreferences?.length > 0) {
                    const dateKey = mediaType === 'movie' ? 'release_date' : 'first_air_date';
                    if (effectivePreferences.eraPreferences.includes('classic')) params[`${dateKey}.lte`] = '1980-12-31';
                    else if (effectivePreferences.eraPreferences.includes('modern')) { params[`${dateKey}.gte`] = '1980-01-01'; params[`${dateKey}.lte`] = '2010-12-31'; }
                    else if (effectivePreferences.eraPreferences.includes('recent')) params[`${dateKey}.gte`] = '2011-01-01';
                }
                // Runtime (only for movies)
                if (effectivePreferences.runtimePreference && mediaType === 'movie') {
                    if (effectivePreferences.runtimePreference === 'short') params['with_runtime.lte'] = '90';
                    else if (effectivePreferences.runtimePreference === 'medium') { params['with_runtime.gte'] = '90'; params['with_runtime.lte'] = '120'; }
                    else if (effectivePreferences.runtimePreference === 'long') params['with_runtime.gte'] = '120';
                }
                // Language/Region
                if (effectivePreferences.languagePreferences?.length > 0) {
                    const langMap = { en: { lang: 'en' }, es: { lang: 'es' }, fr: { lang: 'fr' }, de: { lang: 'de' }, hi: { lang: 'hi', region: 'IN' }, ja: { lang: 'ja' }, ko: { lang: 'ko' }, zh: { lang: 'zh' }, any: {} };
                    for (const pref of effectivePreferences.languagePreferences) {
                        if (pref !== 'any' && langMap[pref]) {
                            if (langMap[pref].lang) params.with_original_language = langMap[pref].lang;
                            if (langMap[pref].region) params.region = langMap[pref].region; // Only add region if specified
                            break; // Use first specific preference
                        }
                    }
                }
            }


            // Only fetch if we have genres or other specific filters
            if (params.with_genres || params.with_original_language || params['release_date.lte'] || params['release_date.gte'] || params['first_air_date.lte'] || params['first_air_date.gte'] || params['with_runtime.lte'] || params['with_runtime.gte'] ) {
                const discoverUrl = `https://api.themoviedb.org/3/discover/${mediaType}`;
                console.log(`[FetchRecs] Attempting Personalized Fetch: ${discoverUrl}`, params);

                try {
                    const response = await axios.get(discoverUrl, { params });
                    console.log(`[FetchRecs] Personalized Fetch Response Status: ${response.status}. Results count: ${response.data?.results?.length}`);

                    if (response.data?.results?.length > 0) {
                        fetchedRecs = response.data.results
                            .filter(item => item.poster_path && item.overview && !favoriteIds.has(item.id.toString()))
                            .map(item => ({ ...item, media_type: mediaType, score: Math.round((item.vote_average / 10) * 100) }))
                            .slice(0, MAX_RECOMMENDATION_COUNT); // Limit results
                        console.log(`[FetchRecs] Filtered Personalized Recs Count (excluding favorites): ${fetchedRecs.length}`);

                        if (fetchedRecs.length > 0) {
                             // Determine data source and reason
                             if (hasValidPreferences && hasFavorites) { finalDataSource = 'both'; finalReason = 'Based on your preferences and favorites'; }
                             else if (hasValidPreferences) { finalDataSource = 'preferences'; finalReason = 'Based on your questionnaire responses'; }
                             else { finalDataSource = 'favorites'; finalReason = 'Because you liked similar items'; }
                        } else {
                             console.log("[FetchRecs] Personalized fetch returned results, but all were filtered out (e.g., favorites).");
                        }
                    } else {
                        console.log("[FetchRecs] Personalized fetch returned 0 results from TMDB.");
                    }

                } catch (error) {
                    console.error(`[FetchRecs] Error during personalized TMDB fetch (${discoverUrl}):`, error.response?.data || error.message);
                    // Don't fallback immediately, let subsequent steps handle it.
                }

            } else {
                console.log("[FetchRecs] Skipping personalized TMDB call: Insufficient specific filters (e.g., only 'any' type selected).");
            }

            // Step 4: Fetch supplementary if personalized results are insufficient
            if (fetchedRecs.length < MIN_RECOMMENDATION_COUNT) {
                 console.log(`[FetchRecs] Personalized results (${fetchedRecs.length}) are less than minimum (${MIN_RECOMMENDATION_COUNT}). Fetching supplementary.`);
                 const existingIds = new Set(fetchedRecs.map(r => r.id));
                 const supplementary = await fetchSupplementaryRecommendations(fetchedRecs.length, existingIds);
                 const combinedRecs = [...fetchedRecs, ...supplementary].slice(0, MAX_RECOMMENDATION_COUNT);

                 // If we *only* got supplementary items, adjust the reason/source
                 if (fetchedRecs.length === 0 && supplementary.length > 0) {
                     console.log("[FetchRecs] Only supplementary items found.");
                     fetchedRecs = combinedRecs;
                     finalDataSource = 'supplementary'; // Indicate source was supplementary/generic
                     finalReason = 'Popular movies you might like';
                 } else if (supplementary.length > 0) {
                    fetchedRecs = combinedRecs;
                    console.log(`[FetchRecs] Combined personalized + supplementary count: ${fetchedRecs.length}`);
                    // Keep original personalized reason if we started with some personalized items
                 } else {
                    console.log("[FetchRecs] Supplementary fetch also returned no new items.");
                 }
            }
        } // End if (hasValidPreferences || hasFavorites)

        // Step 5: Fallback to Generic if no personalized/supplementary results found yet
        if (fetchedRecs.length === 0) {
             if (personalizationAttempted) {
                 console.log("[FetchRecs] No personalized or supplementary results found. Falling back to generic.");
             } else {
                 console.log("[FetchRecs] No personalization data available. Fetching generic.");
             }
             const genericRecs = await fetchGenericRecommendations(favoriteIds); // Exclude favorites from generic too
             if (genericRecs.length > 0) {
                 fetchedRecs = genericRecs;
                 finalDataSource = 'generic';
                 finalReason = 'Popular This Week';
             } else {
                 console.log("[FetchRecs] Generic fallback also returned no results.");
             }
        }

        // Step 6: Final state update
        if (fetchedRecs.length > 0) {
            console.log(`[FetchRecs] SUCCESS: Setting ${fetchedRecs.length} recommendations. Source: ${finalDataSource}`);
            setRecommendations(fetchedRecs);
            setDataSource(finalDataSource);
            setRecommendationReason(finalReason);
            saveRecommendationsToCache(fetchedRecs, currentUserId, finalDataSource, finalReason);
        } else {
             // This is where the "Couldn't find" message originates
             console.warn("[FetchRecs] FAILURE: No recommendations found after all attempts (personalized, supplementary, generic). Setting empty state.");
             setRecommendations([]);
             setDataSource('none'); // Explicitly 'none'
             setRecommendationReason('Could not find recommendations matching your profile right now.'); // More specific empty reason
        }

    } catch (error) {
        // Catch unexpected errors in the overall process
        console.error('[FetchRecs] CRITICAL ERROR during recommendation fetch process:', error);
        setRecommendations([]);
        setDataSource('error'); // Indicate an error state
        setRecommendationReason('An error occurred while fetching recommendations.');
    } finally {
        console.log("[FetchRecs] Finalizing fetch cycle.");
        // Use setTimeout to ensure loading/thinking state persists briefly for UX
        setTimeout(() => {
            setIsLoading(false);
            setIsThinking(false);
            setIsRefreshing(false);
            isFetchingRef.current = false;
            dataLoadCompletedRef.current = true; // Mark attempt as complete
            sessionStorage.setItem(SESSION_RECS_LOADED_FLAG, 'true'); // Ensure session flag is set
            console.log('[FetchRecs] States reset (isLoading, isThinking, isRefreshing: false). DataLoadCompleted: true.');
        }, 300);
    }
  }, [
    currentUser, isAuthenticated, propHasCompletedQuestionnaire, propUserPreferences, // Core props
    fetchUserFavoritesAndGenres, fetchGenericRecommendations, fetchSupplementaryRecommendations, // Fetch helpers
    saveRecommendationsToCache, // Cache helper
    recommendations.length // To influence initial isLoading state
  ]);


  // --- Effect to Trigger Initial Fetch ---
  useEffect(() => {
    console.log('[Effect InitCheck]', { userId, cacheChecked, initialAppLoadComplete, propHasCompletedQuestionnaire, dataLoaded: dataLoadCompletedRef.current, isFetching: isFetchingRef.current });

    // Conditions to Fetch: User ready, App ready, Questionnaire done, Data not loaded yet, Not already fetching
    if (userId && cacheChecked && initialAppLoadComplete && propHasCompletedQuestionnaire && !dataLoadCompletedRef.current && !isFetchingRef.current) {
        console.log('[Effect InitCheck] Triggering initial fetchRecommendations...');
        // Determine if we need the skeleton loader (no cache loaded OR cache exists but session flag not set - implies new session)
        const hasExistingCache = recommendations.length > 0; // Check if cache was successfully loaded earlier
        const sessionLoaded = sessionStorage.getItem(SESSION_RECS_LOADED_FLAG) === 'true';
        if (!hasExistingCache || !sessionLoaded) {
            console.log("[Effect InitCheck] Setting isLoading true (no cache or new session).");
            setIsLoading(true);
        }
        fetchRecommendations(false);
    } else if (userId && cacheChecked && initialAppLoadComplete && !propHasCompletedQuestionnaire && !dataLoadCompletedRef.current) {
       // Handle case where user is ready, but questionnaire is confirmed incomplete, and we haven't marked load as complete for this state
       console.log("[Effect InitCheck] User ready, questionnaire incomplete. Setting empty state and marking load complete.");
       setRecommendations([]);
       setDataSource('none');
       setRecommendationReason('Complete your profile for recommendations.');
       dataLoadCompletedRef.current = true; // Mark as 'complete' for this incomplete state
       setIsLoading(false);
       setIsThinking(false);
    } else if (!userId && cacheChecked) {
       // Handle logout after cache was checked
       console.log("[Effect InitCheck] User logged out. Resetting state.");
       setRecommendations([]); setDataSource(null); setRecommendationReason('');
       dataLoadCompletedRef.current = false; // Ready for next login
       setIsLoading(false); setIsThinking(false);
    }

  }, [userId, cacheChecked, initialAppLoadComplete, propHasCompletedQuestionnaire, fetchRecommendations, recommendations.length]); // Add recommendations.length


  // --- Manual Refresh Handler ---
  const handleRefresh = useCallback(async () => {
    if (isFetchingRef.current) { console.log("[Refresh] Skipped: Already fetching."); return; }
    const currentUserId = currentUser?.attributes?.sub;
    if (!currentUserId || !propHasCompletedQuestionnaire) { console.log("[Refresh] Skipped: No user or questionnaire incomplete."); return; }

    console.log('[Refresh] handleRefresh called.');
    setIsRefreshing(true); setIsThinking(true); // Show immediate feedback
    setRefreshCounter(prev => prev + 1);
    recommendationsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Clear cache before fetching
    const currentCacheKey = getCacheKey(currentUserId);
    if (currentCacheKey) {
        localStorage.removeItem(currentCacheKey);
        console.log("[Refresh] Cleared cache.");
    }
    sessionStorage.removeItem(SESSION_RECS_LOADED_FLAG);

    // Reset data loaded flag to force fetch
    dataLoadCompletedRef.current = false;

    // Fetch recommendations, forcing refresh
    await fetchRecommendations(true);
    // finally block in fetchRecommendations handles resetting states

  }, [currentUser, propHasCompletedQuestionnaire, fetchRecommendations]);

  // --- Imperative Handle ---
  useImperativeHandle(ref, () => ({
    refresh: handleRefresh
  }), [handleRefresh]);


  // --- Render Logic ---

  if (!isAuthenticated || !initialAppLoadComplete) {
    // console.log('[Render] Null: Not authenticated or initial app load incomplete.');
    return null;
  }
   if (!propHasCompletedQuestionnaire) {
       // console.log('[Render] Null: Questionnaire not complete (handled by parent).');
       // Parent AppContent shows the prompt to complete it.
       return null;
   }

  // console.log('[Render] Rendering Recs Section:', { isLoading, isThinking, isRefreshing, recsCount: recommendations.length, dataSource });

  // Determine what main content to show
  let content;
  if (isLoading && recommendations.length === 0) {
      // Skeleton Loader: Only if loading state is true AND there are zero recommendations currently rendered
      content = (
          <motion.div key={`loading-skeleton-${refreshCounter}`} /* ... skeleton JSX ... */ >
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl h-[350px] shadow-md overflow-hidden animate-pulse">
                 <div className="h-3/5 bg-gray-700"></div>
                 <div className="p-4 space-y-3">
                    <div className="h-5 bg-gray-700 rounded w-3/4"></div><div className="h-4 bg-gray-700 rounded w-1/2"></div><div className="h-4 bg-gray-700 rounded w-full"></div>
                 </div>
              </div>
             ))}
          </motion.div>
      );
  } else if (isThinking && recommendations.length === 0) {
      // Thinking Animation: If thinking state is true AND zero recommendations rendered (covers initial fetch thinking before results)
      content = (
          <motion.div key={`thinking-empty-${refreshCounter}`} /* ... thinking animation JSX ... */ >
            <div className="flex flex-col items-center justify-center space-y-4 min-h-[250px]">
               <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="text-5xl">🧠</motion.div>
               <p className="text-lg font-semibold text-indigo-300">Thinking...</p>
               <div className="w-3/4 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
               </div>
            </div>
          </motion.div>
      );
  } else if (recommendations.length > 0) {
      // Recommendations Grid: If we have recommendations (even if isThinking is true during refresh)
      content = (
          <motion.div key={`recommendations-grid-${refreshCounter}`} /* ... grid + mapping JSX ... */
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden" animate="visible" exit="exit"
            variants={{
               hidden: { opacity: 0 },
               visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: isRefreshing ? 0 : 0.1 } },
               exit: { opacity: 0, transition: { staggerChildren: 0.05, staggerDirection: -1 } }
            }}>
            {recommendations.map((item) => (
              <motion.div key={item.id} layout variants={{ hidden: { opacity: 0, y: 20, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }, exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } } }}>
                 <MediaCard result={item} currentUser={currentUser} />
              </motion.div>
            ))}
          </motion.div>
      );
  } else if (!isThinking && !isLoading) {
      // Empty State: Only show if NOT loading and NOT thinking, and recommendations are empty
       content = (
           <motion.div key="empty-state" /* ... empty state JSX ... */
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
             className="text-center py-12 bg-gray-800/50 rounded-xl p-8 border border-gray-700">
               <motion.div initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-4 text-5xl text-indigo-400">🤷‍♂️</motion.div>
               <h3 className="text-xl font-semibold text-white mb-3">Couldn't find recommendations right now.</h3>
               <p className="text-gray-400 max-w-md mx-auto mb-6">{recommendationReason || "This might happen if your profile is very specific, or if there was trouble fetching data. Try refreshing or adjusting your preferences."}</p>
               <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleRefresh} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full transition-colors" disabled={isThinking}>
                  {isThinking ? 'Trying...' : 'Try Refreshing'}
               </motion.button>
           </motion.div>
       );
  } else {
      // Fallback case - should ideally not be reached
      content = <div key="empty-fallback"></div>;
  }

  return (
    <motion.section
      ref={recommendationsContainerRef}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-12 max-w-7xl mx-auto px-4 scroll-mt-24"
    >
      {/* Header: Title and Refresh Button */}
      <div className="flex justify-between items-center mb-4 min-h-[36px]"> {/* Min height to prevent layout shift */}
         <h2 className="text-2xl font-bold text-white flex items-center space-x-2 overflow-hidden">
             <AnimatePresence mode="wait">
                 <motion.span
                     key={`heading-${dataSource || 'loading'}-${refreshCounter}`}
                     initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
                     transition={{ duration: 0.3, ease: 'easeInOut' }} className="block"
                 >
                     {isThinking && recommendations.length === 0 ? "Finding Recommendations..." : // Show thinking text only if loading initial state
                      isThinking && recommendations.length > 0 ? "Refreshing..." : // Show refreshing text if thinking but results exist
                      dataSource === 'both' ? 'For You (Prefs & Favs)' :
                      dataSource === 'preferences' ? 'Based on Your Preferences' :
                      dataSource === 'favorites' ? 'Because You Liked' :
                      dataSource === 'generic' ? 'Popular This Week' :
                      dataSource === 'supplementary' ? 'Also Popular' :
                      dataSource === 'none' ? 'Personalize Your Feed' :
                      dataSource === 'error' ? 'Error' :
                      'Recommendations'}
                 </motion.span>
             </AnimatePresence>
         </h2>
         {/* Refresh Button */}
         {propHasCompletedQuestionnaire && ( // Only show if questionnaire done
             <motion.button
                 whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                 onClick={handleRefresh} disabled={isThinking} aria-label="Refresh recommendations"
                 className={`flex items-center space-x-1 text-sm ${isThinking ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-3 py-1 rounded-full transition-colors duration-200 shadow-md`}
             >
                 <motion.div animate={isThinking ? { rotate: 360 } : { rotate: 0 }} transition={isThinking ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.3 }}>
                    <ArrowPathIcon className="h-4 w-4" />
                 </motion.div>
                 <span>{isThinking ? 'Refreshing...' : 'Refresh'}</span>
             </motion.button>
         )}
      </div>

      {/* Recommendation Reason */}
      {!isThinking && recommendationReason && recommendations.length > 0 && dataSource !== 'error' && (
        <motion.div /* ... reason JSX ... */ >
             <LightBulbIcon className="h-4 w-4 text-yellow-400 mr-2 flex-shrink-0" />
             <span>{recommendationReason}</span>
        </motion.div>
      )}
      {dataSource === 'error' && recommendationReason && (
         <motion.div /* ... error reason JSX ... */ className="flex items-center bg-red-900/50 border border-red-700 rounded-lg p-2 mb-4 text-sm text-red-200 overflow-hidden">
              {/* Error Icon? */} <span>{recommendationReason}</span>
         </motion.div>
      )}


      {/* Content Area using AnimatePresence */}
      <AnimatePresence mode="wait">
        {content}
      </AnimatePresence>

    </motion.section>
  );
});

PersonalizedRecommendations.displayName = 'PersonalizedRecommendations';
export default PersonalizedRecommendations;