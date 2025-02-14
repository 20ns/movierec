import React, { useState, useRef, useEffect } from 'react';
import AccountDetailsModal from './AccountDetailsModal';

const UserMenu = ({ userEmail, onSignout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
  };

  const startCloseTimer = () => {
    timeoutRef.current = setTimeout(() => {
      handleCloseDropdown();
    }, 200);
  };

  const clearCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onMouseEnter={() => {
          clearCloseTimer();
          setIsDropdownOpen(true);
        }}
        onMouseLeave={startCloseTimer}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200" // Dark mode colors
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </button>

      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-10 transition-opacity duration-200 ease-in-out opacity-0" // Initial opacity 0
          style={{
            opacity: isDropdownOpen ? 1 : 0, // Animate opacity
            transform: isDropdownOpen ? 'translateY(0)' : 'translateY(-10px)', // Slide-down effect
            transition: 'opacity 0.2s ease, transform 0.2s ease', // Combine transitions
          }}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={startCloseTimer}
        >
          <button
            onClick={() => {
              setShowAccountDetails(true);
            }}
            className="block w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 text-left" // Dark mode colors
          >
            Account Details
          </button>
          <button
            onClick={() => {
              onSignout();
              handleCloseDropdown();
            }}
            className="block w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 text-left" // Dark mode colors
          >
            Sign Out
          </button>
        </div>
      )}

      <AccountDetailsModal
        isOpen={showAccountDetails}
        onClose={() => setShowAccountDetails(false)}
        email={userEmail}
      />
    </div>
  );
};

export default UserMenu;