import React, { useState, useRef, useEffect } from 'react';
import { 
  MagnifyingGlassIcon as SearchIcon, 
  UserIcon, 
  AdjustmentsHorizontalIcon, 
  HeartIcon 
} from '@heroicons/react/24/outline';

function Header({ 
  currentUser, 
  isAuthenticated, 
  setShowSearch, 
  showSearch, 
  setShowQuestionnaire,
  setShowFavorites,
  showFavorites,
  onSignout,
  setShowAccountDetails // New prop for handling account details modal
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 bg-gray-900 bg-opacity-80 backdrop-blur-sm border-b border-gray-800 shadow-lg">
      <div className="flex items-center justify-between">
        {/* Logo area */}
        <div className="flex items-center">
          <a href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-400">
            MovieRec
          </a>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-3">
          {/* Toggle search button - always visible */}
          <button 
            onClick={() => setShowSearch(!showSearch)} 
            className={`p-2 rounded-full ${showSearch ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} transition-colors`}
            title="Search movies"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
          
          {/* Only show these buttons when the user is authenticated */}
          {isAuthenticated && (
            <>
              {/* Preferences button */}
              <button 
                onClick={() => setShowQuestionnaire(true)} 
                className="p-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-full transition-colors"
                title="Set movie preferences"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
              </button>
              
              {/* Favorites button */}
              <button 
                onClick={() => setShowFavorites(!showFavorites)} 
                className={`p-2 rounded-full ${showFavorites ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} transition-colors`}
                title="View favorites"
              >
                <HeartIcon className="w-5 h-5" />
              </button>
            </>
          )}

          {/* User profile menu */}
          {isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-full transition-colors"
                title={`${currentUser?.attributes?.email || 'User profile'}`}
              >
                <UserIcon className="w-5 h-5" />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-md shadow-xl overflow-hidden z-20 border border-gray-700">
                  <div 
                    onClick={() => {
                      setShowAccountDetails(true);
                      setShowUserMenu(false);
                    }}
                    className="px-4 py-3 text-sm text-gray-300 border-b border-gray-700 hover:bg-gray-700 cursor-pointer"
                  >
                    <div className="font-medium">Account</div>
                    <div className="truncate text-gray-400">{currentUser?.attributes?.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      onSignout();
                      setShowUserMenu(false);
                    }}
                    className="block w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 text-left"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a 
              href="/auth"
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-md text-sm font-medium transition-all shadow-md"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
