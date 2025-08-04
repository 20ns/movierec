import React, { useState } from 'react';
import { deleteUser } from 'aws-amplify/auth';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const AccountDetailsModal = ({ isOpen, onClose, email, currentUser }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const resetPreferences = async () => {
    if (!currentUser) return;
    
    setIsDeleting(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
        throw new Error('No valid access token available');
      }
      const token = currentUser.signInUserSession.accessToken.jwtToken;
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/user/preferences/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) throw new Error('Failed to reset preferences');
      
      // Clear local storage preferences
      localStorage.removeItem(`userPrefs_${currentUser.attributes.sub}`);
      localStorage.removeItem(`questionnaire_completed_${currentUser.attributes.sub}`);
      
      setSuccessMessage('Your preferences have been reset successfully.');
      setShowConfirmation(false);
    } catch (error) {
      console.error('Error resetting preferences:', error);
      setErrorMessage('Failed to reset preferences. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Modal Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-75 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Modal Content */}
      <div
        className={`relative bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all duration-300 ease-in-out ${
          isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        
        <h2 className="text-xl font-semibold mb-4 text-white">Account Details</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <p className="mt-1 text-gray-400">{email}</p>
          </div>
          
          <div className="pt-4 border-t border-gray-800">
            <h3 className="text-lg font-medium text-white mb-3">Preferences</h3>
            
            {successMessage && (
              <div className="mb-4 p-3 bg-green-900/50 border border-green-700 text-green-200 rounded">
                {successMessage}
              </div>
            )}
            
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded">
                {errorMessage}
              </div>
            )}
            
            <p className="text-sm text-gray-400 mb-3">
              Tastes and preferences change over time. You can reset your recommendation preferences if you'd like to start fresh.
            </p>
            
            {!showConfirmation ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowConfirmation(true)}
                className="flex items-center px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded transition-colors duration-200"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Reset Recommendation Preferences
              </motion.button>
            ) : (
              <div className="bg-gray-800/60 p-4 rounded-lg">
                <p className="text-sm text-gray-300 mb-3">
                  Are you sure? This will delete all your questionnaire answers and recommendation preferences. This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetPreferences}
                    disabled={isDeleting}
                    className={`px-4 py-2 ${isDeleting ? 'bg-gray-700' : 'bg-red-700 hover:bg-red-600'} text-white rounded transition-colors duration-200`}
                  >
                    {isDeleting ? 'Resetting...' : 'Yes, Reset'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowConfirmation(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-200"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded transition-colors duration-200"
          >
            Close
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailsModal;