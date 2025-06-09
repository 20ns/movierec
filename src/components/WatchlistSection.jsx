import React from 'react';
import { ClockIcon, XMarkIcon, ArrowPathIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import MediaListSection from './MediaListSection';

const mapWatchlistItem = item => {
  if (!item?.mediaId) return null;
  return {
    id: item.mediaId,
    media_type: item.mediaType || 'movie',
    title: item.title || item.name || 'Unknown Title',
    name: item.name || item.title || 'Unknown Title',
    poster_path: item.posterPath || item.poster_path || null,
    backdrop_path: item.backdropPath || item.backdrop_path || null,
    release_date: item.releaseDate || item.firstAirDate || item.release_date || null,
    first_air_date: item.firstAirDate || item.releaseDate || item.first_air_date || item.release_date || null,
    vote_average: typeof item.voteAverage === 'number'
      ? item.voteAverage
      : parseFloat(item.vote_average || 0),
    popularity: typeof item.popularity === 'number' ? item.popularity : 0,
    genre_ids: Array.isArray(item.genreIds)
      ? item.genreIds
      : Array.isArray(item.genre_ids)
      ? item.genre_ids
      : []
  };
};

export default function WatchlistSection(props) {
  return (
    <MediaListSection
      title="Your Watchlist"
      IconEmpty={<ClockIcon className="h-8 w-8 text-gray-400" />}
      inHeader={props.inHeader}
      isOpen={props.isOpen}
      currentUser={props.currentUser}
      isAuthenticated={props.isAuthenticated}
      cacheKey="user_watchlist_cache"
      endpoint="/user/watchlist"
      mapItem={mapWatchlistItem}
      eventKey="watchlist-updated"
      cardPropsFactory={item => ({
        result: item,
        currentUser: props.currentUser,
        isMiniCard: props.inHeader,
        fromWatchlist: true,
        initialIsInWatchlist: true,
        onWatchlistToggle: () => props.onClose && props.onClose(item.id),
        icons: {
          sort: <ArrowsUpDownIcon className="h-5 w-5" />,
          refresh: <ArrowPathIcon className="h-5 w-5" />,
          close: <XMarkIcon className="h-5 w-5" />
        },
        emptyText: 'Add movies and shows using the clock icon.',
        onClose: props.onClose
      })}
    />
  );
}