import React, { useState, useEffect, useRef } from 'react';
import { EventEmitter } from '../events';
import { getCurrentAccessToken, getUserId as getTokenUserId } from '../utils/tokenUtils';

const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

export default function useMediaList({
  currentUser,
  isAuthenticated,
  inHeader = false,
  isOpen = false,
  cacheKeyPrefix,
  fetchEndpoint,
  mapItem,
  eventName
}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState('dateAdded');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const panelRef = useRef(null);
  const sortMenuRef = useRef(null);
  const scrollRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  const clearCache = (userId) => {
    try {
      localStorage.removeItem(`${cacheKeyPrefix}_${userId}`);
    } catch (_) {}
  };

  const getCache = (userId) => {
    try {
      const raw = localStorage.getItem(`${cacheKeyPrefix}_${userId}`);
      if (!raw) return null;
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < CACHE_EXPIRY_TIME) {
        return data;
      }
      clearCache(userId);
      return null;
    } catch (_) {
      clearCache(userId);
      return null;
    }
  };

  const setCache = (userId, data) => {
    try {
      const payload = { data, timestamp: Date.now() };
      localStorage.setItem(`${cacheKeyPrefix}_${userId}`, JSON.stringify(payload));
    } catch (_) {}
  };

  const fetchList = async (forceRefresh = false) => {
    const token = await getCurrentAccessToken();
    if (!token) {
      setError('Authentication token missing');
      setIsLoading(false);
      return;
    }
    const userId = await getTokenUserId(currentUser);
    if (!userId) {
      setError('User identifier missing');
      setIsLoading(false);
      return;
    }
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < 5000) {
      if (items.length > 0) setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    lastFetchTimeRef.current = now;
    try {
      const cached = !forceRefresh ? getCache(userId) : null;
      let list = null;
      if (cached) {
        list = cached;
      } else {
        const res = await fetch(
          `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}${fetchEndpoint}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          }
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        const rawItems =
          data.items && Array.isArray(data.items) ? data.items
            : Array.isArray(data) ? data
            : [];
        list = rawItems;
        setCache(userId, rawItems);
      }
      const mapped = list.map(mapItem).filter(Boolean);
      setItems(mapped);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedItems = React.useMemo(() => {
    if (!items.length) return [];
    const arr = [...items];
    switch (sortOption) {
      case 'alphabetical':
        return arr.sort((a, b) => a.title.localeCompare(b.title));
      case 'rating':
        return arr.sort((a, b) => b.vote_average - a.vote_average);
      case 'dateAdded':
      default:
        return arr;
    }
  }, [items, sortOption]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchList();
    }
  }, [isOpen, isAuthenticated, currentUser]);

  useEffect(() => {
    const handler = (e) => {
      const { mediaId, isInList, item } = e.detail || {};
      if (!mediaId) return;
      setItems((prev) => {
        let updated = prev;
        if (isInList && item) {
          const mapped = mapItem(item);
          if (!prev.some((i) => String(i.id) === String(mapped.id))) {
            updated = [mapped, ...prev];
          }
        } else {
          updated = prev.filter((i) => String(i.id) !== String(mediaId));
        }
        const userId = currentUser.username || currentUser.attributes?.sub;
        setCache(userId, updated);
        return updated;
      });
    };
    document.addEventListener(eventName, handler);
    return () => document.removeEventListener(eventName, handler);
  }, [eventName, mapItem, currentUser]);

  return {
    items: sortedItems,
    isLoading,
    error,
    sortOption,
    setSortOption,
    showSortMenu,
    setShowSortMenu,
    panelRef,
    sortMenuRef,
    scrollRef,
    fetchList,
    setItems,
  };
}