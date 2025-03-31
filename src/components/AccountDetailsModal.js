import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

function AccountDetailsModal({ currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');

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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-75">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-2xl bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden"
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
            <div className="space-y-4">
              <div>
                <h3 className="text-sm text-gray-400">Email</h3>
                <p className="text-white">{currentUser?.attributes?.email || 'N/A'}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-400">User ID</h3>
                <p className="text-white font-mono text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                  {currentUser?.attributes?.sub || 'N/A'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm text-gray-400">Created</h3>
                  <p className="text-white">{formatDate(currentUser?.attributes?.created)}</p>
                </div>
                <div>
                  <h3 className="text-sm text-gray-400">Last Updated</h3>
                  <p className="text-white">{formatDate(currentUser?.attributes?.updated)}</p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <p className="text-gray-300">
                Manage your movie preferences to get better recommendations.
              </p>
              
              <button
                onClick={() => {
                  onClose();
                  // Delay slightly to prevent visual conflicts between modals
                  setTimeout(() => document.dispatchEvent(new CustomEvent('open-preferences')), 100);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all text-sm"
              >
                Edit Preferences
              </button>
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
    </div>
  );
}

export default AccountDetailsModal;
