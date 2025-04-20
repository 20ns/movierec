import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Auth } from 'aws-amplify';

function AccountDetailsModal({ currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');
  const modalRef = useRef(null);
  
  // Password reset states
  const [resetMode, setResetMode] = useState('request'); // 'request' or 'confirm'
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  
  // Account deletion states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionPassword, setDeletionPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Close when clicking outside
  const handleBackdropClick = useCallback((e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  }, [onClose]);
  
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

  // memoize user‐derived values
  const creationDate = useMemo(() => {
    return currentUser?.attributes?.email_verified_at ||
           currentUser?.attributes?.created ||
           currentUser?.signInUserSession?.idToken?.payload?.auth_time;
  }, [currentUser]);

  // Format user id for display
  const userId = useMemo(() => {
    return currentUser?.attributes?.sub ||
           currentUser?.username ||
           currentUser?.signInUserSession?.idToken?.payload?.sub ||
           'N/A';
  }, [currentUser]);

  // only reformat when the date changes
  const formattedCreationDate = useMemo(
    () => formatDate(creationDate),
    [creationDate]
  );

  // Pre-fill email from user info
  useEffect(() => {
    if (currentUser?.attributes?.email) {
      setResetEmail(currentUser.attributes.email);
    }
  }, [currentUser]);
  
  // Handle request password reset
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setIsLoading(true);
    
    try {
      await Auth.forgotPassword(resetEmail);
      setResetSuccess('Verification code sent to your email.');
      setResetMode('confirm');
    } catch (error) {
      console.error('Request reset error:', error);
      setResetError(error.message || 'Failed to request password reset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle confirm password reset
  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await Auth.forgotPasswordSubmit(resetEmail, resetCode, newPassword);
      setResetSuccess('Password reset successful! You can now sign in with your new password.');
      
      // Clear form
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Return to request mode after success
      setTimeout(() => {
        setResetMode('request');
        setResetSuccess('');
      }, 5000);
    } catch (error) {
      console.error('Confirm reset error:', error);
      setResetError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get current authenticated user
      const user = await Auth.currentAuthenticatedUser();
      
      // Change password using Auth service
      await Auth.changePassword(
        user,
        currentPassword,
        newPassword
      );
      
      setResetSuccess('Password changed successfully!');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Return to request mode after success
      setTimeout(() => {
        setResetMode('request');
        setResetSuccess('');
      }, 5000);
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.code === 'NotAuthorizedException') {
        setResetError('Current password is incorrect. Please try again.');
      } else if (error.code === 'InvalidPasswordException') {
        setResetError('New password does not meet requirements. It must include uppercase, lowercase, numbers, and special characters.');
      } else {
        setResetError(error.message || 'Failed to change password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset state when changing tabs
  useEffect(() => {
    setResetError('');
    setResetSuccess('');
    setResetMode('request');
  }, [activeTab]);

  // Handle account deletion
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteLoading(true);
    
    try {
      // Get current authenticated user (verifies user is logged in)
      const user = await Auth.currentAuthenticatedUser();
      
      // Attempt to delete the user account
      await Auth.deleteUser();
      
      // Close modal and handle signout in parent component
      onClose();
      // Trigger custom event that App.js can listen for
      document.dispatchEvent(new CustomEvent('account-deleted'));
      
    } catch (error) {
      console.error('Delete account error:', error);
      setDeleteError(
        error.message || 'Failed to delete account. Please try again or contact support.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    // Store the original scroll position and body styles
    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    
    // Apply fixed positioning to body to prevent scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    // Re-enable scrolling and restore position when component unmounts
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, []);

  // memoize tab switch handler
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={() => onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", bounce: 0.3 }}
        className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col border border-gray-800/50"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-b border-gray-800/80 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">Account Details</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-purple-500/20 transition-all duration-200"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-800/80 bg-gray-900/40">
          <div className="flex px-2">
            <button
              className={`px-4 py-3 font-medium text-sm transition-all duration-200 ${
                activeTab === 'profile' 
                  ? 'border-b-2 border-purple-500 text-purple-300' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-purple-500/10'
              }`}
              onClick={() => handleTabChange('profile')}
            >
              Profile
            </button>
            <button
              className={`px-4 py-3 font-medium text-sm transition-all duration-200 ${
                activeTab === 'security' 
                  ? 'border-b-2 border-purple-500 text-purple-300' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-purple-500/10'
              }`}
              onClick={() => handleTabChange('security')}
            >
              Security
            </button>
            <button
              className={`px-4 py-3 font-medium text-sm transition-all duration-200 ${
                activeTab === 'preferences' 
                  ? 'border-b-2 border-purple-500 text-purple-300' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-purple-500/10'
              }`}
              onClick={() => handleTabChange('preferences')}
            >
              Preferences
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto custom-scrollbar px-6 py-5 flex-grow bg-gradient-to-b from-gray-900/80 to-gray-900">
          {activeTab === 'profile' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gray-800/30 hover:bg-gray-800/40 transition-colors duration-200 rounded-lg p-3 sm:p-4 border border-gray-700/30 shadow-sm">
                <h3 className="text-xs sm:text-sm text-purple-300 mb-2 font-medium">Email</h3>
                <p className="text-base sm:text-lg text-white break-all">{currentUser?.attributes?.email || currentUser?.signInUserSession?.idToken?.payload?.email || 'N/A'}</p>
              </div>
              
              <div className="bg-gray-800/30 hover:bg-gray-800/40 transition-colors duration-200 rounded-lg p-3 sm:p-4 border border-gray-700/30 shadow-sm">
                <h3 className="text-xs sm:text-sm text-purple-300 mb-2 font-medium">Account Status</h3>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" style={{animationDuration: '2s'}}></div>
                  </div>
                  <p className="ml-2 text-base text-white">Active</p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'security' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gray-800/30 hover:bg-gray-800/40 transition-colors duration-200 rounded-lg p-3 sm:p-4 border border-gray-700/30 shadow-sm">
                <h3 className="text-sm text-purple-300 font-medium mb-2">Change Password</h3>
                <p className="text-gray-400 text-sm mb-3">
                  Update your password while logged in.
                </p>
                
                <button
                  onClick={() => setResetMode('change')}
                  className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-md shadow-sm transition-all duration-200 transform hover:translate-y-[-1px]"
                >
                  Change Password
                </button>
              </div>
              
              <div className="bg-gray-800/30 hover:bg-gray-800/40 transition-colors duration-200 rounded-lg p-3 sm:p-4 border border-gray-700/30 shadow-sm">
                <h3 className="text-sm text-purple-300 font-medium mb-2">Forgot Password</h3>
                <p className="text-gray-400 text-sm mb-3">
                  {resetMode === 'request' 
                    ? 'Request a password reset code sent to your email.' 
                    : resetMode === 'confirm'
                    ? 'Enter the verification code and your new password.'
                    : 'Reset your password if you forgot it.'}
                </p>
                
                {resetError && (
                  <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded">
                    {resetError}
                  </div>
                )}
                
                {resetSuccess && (
                  <div className="mb-4 p-3 bg-green-900/50 border border-green-500 text-green-200 text-sm rounded">
                    {resetSuccess}
                  </div>
                )}
                
                {resetMode === 'change' ? (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Current Password</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">New Password</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="8+ characters with letters & numbers"
                        minLength="8"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm new password"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        className="text-sm text-gray-400 hover:text-gray-300"
                        onClick={() => setResetMode('request')}
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </form>
                ) : resetMode === 'request' ? (
                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Email Address</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                      <div className="flex items-center justify-end pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Sending...' : 'Send Reset Code'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Verification Code</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        required
                        placeholder="Enter code from email"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">New Password</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="8+ characters with letters & numbers"
                        minLength="8"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm new password"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        className="text-sm text-gray-400 hover:text-gray-300"
                        onClick={() => setResetMode('request')}
                        disabled={isLoading}
                      >
                        Request new code
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700/50">
                <h3 className="text-sm text-gray-300 font-medium mb-2">Security Tips</h3>
                <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
                  <li>Use a strong, unique password</li>
                  <li>Enable two-factor authentication when available</li>
                  <li>Never share your password with others</li>
                  <li>Update your password regularly</li>
                </ul>
              </div>
              
              {/* Delete Account Section */}
              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-red-900/30 mt-8">
                <h3 className="text-sm text-red-300 font-medium mb-2">Delete Account</h3>
                <p className="text-gray-300 text-sm mb-4">
                  This action is permanent and cannot be undone. All your data, including favorites, watchlist, and preferences will be permanently deleted.
                </p>
                
                {deleteError && (
                  <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded">
                    {deleteError}
                  </div>
                )}
                
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="border border-red-500/40 rounded-lg p-4 bg-red-900/20">
                    <p className="text-white text-sm font-medium mb-4">
                      Are you absolutely sure you want to delete your account?
                    </p>
                    
                    <form onSubmit={handleDeleteAccount} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-md"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteError('');
                          }}
                          disabled={deleteLoading}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-70"
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'preferences' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700/50">
                <h3 className="text-sm text-gray-400 mb-2">Content Preferences</h3>
                <p className="text-white text-sm sm:text-base">Personalize your movie and TV show recommendations by updating your preferences.</p>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    onClose();
                    // Delay slightly to prevent visual conflicts between modals
                    setTimeout(() => document.dispatchEvent(new CustomEvent('open-preferences')), 100);
                  }}
                  className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg transform hover:translate-y-[-1px]"
                >
                  Edit Preferences
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-800/40 to-gray-900/40 backdrop-blur-sm px-6 py-4 border-t border-gray-700/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-md text-sm font-medium transition-all duration-200 shadow-sm"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default AccountDetailsModal;
