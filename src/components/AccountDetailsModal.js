import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

function AccountDetailsModal({ currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');
  const modalRef = useRef(null);
  
  // Close when clicking outside
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };
  
  // Format date to be more readable
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get user creation date from a more reliable source
  const creationDate = currentUser?.attributes?.email_verified_at || 
                      currentUser?.attributes?.created || 
                      currentUser?.signInUserSession?.idToken?.payload?.auth_time;
  
  // Format user id for display
  const userId = currentUser?.attributes?.sub || 
                currentUser?.username || 
                currentUser?.signInUserSession?.idToken?.payload?.sub || 
                'N/A';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-75"
      onClick={handleBackdropClick}
    >
      <motion.div 
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-2xl bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()} // Prevent clicks from reaching the backdrop
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-gray-800">
          <h2 className="text-xl font-bold text-white">Account Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'profile' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'preferences' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
        </div>
        
        {/* Content */}
        <div className="p-5">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <h3 className="text-sm text-gray-400 mb-2">Email</h3>
                <p className="text-white text-lg">{currentUser?.attributes?.email || currentUser?.signInUserSession?.idToken?.payload?.email || 'N/A'}</p>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <h3 className="text-sm text-gray-400 mb-2">User ID</h3>
                <p className="text-white font-mono text-xs bg-gray-800 p-3 rounded-md overflow-x-auto border border-gray-700">
                  {userId}
                </p>
              </div>

              {/* Account created and Last session information removed */}
              
              <div className="mt-4 flex justify-center">
                <div className="px-4 py-2 bg-gray-800/70 rounded-full text-gray-400 text-sm border border-gray-700/50">
                  Account in good standing
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <p className="text-gray-300 text-center">
                Manage your movie preferences to get better recommendations.
              </p>
              
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => {
                    onClose();
                    // Delay slightly to prevent visual conflicts between modals
                    setTimeout(() => document.dispatchEvent(new CustomEvent('open-preferences')), 100);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all text-sm shadow-md hover:shadow-lg"
                >
                  Edit Preferences
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-800 px-5 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default AccountDetailsModal;
