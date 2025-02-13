import React, { useState } from 'react';
import AccountDetailsModal from './AccountDetailsModal';

const UserMenu = ({ userEmail, onSignout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsDropdownOpen(true)}
        onMouseLeave={() => setIsDropdownOpen(false)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white hover:bg-gray-800 transition-colors"
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
          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1"
          onMouseEnter={() => setIsDropdownOpen(true)}
          onMouseLeave={() => setIsDropdownOpen(false)}
        >
          <button
            onClick={() => setShowAccountDetails(true)}
            className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Account Details
          </button>
          <button
            onClick={onSignout}
            className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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