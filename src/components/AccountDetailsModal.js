import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  UserIcon, 
  EnvelopeIcon, 
  CalendarIcon, 
  ShieldCheckIcon,
  IdentificationIcon,
  ClockIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentDuplicateIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { resetPassword, confirmResetPassword, updatePassword, deleteUser, getCurrentUser, fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { getCurrentAccessToken, getCurrentUserInfo } from '../utils/tokenUtils';
import { createComponentLogger } from '../utils/centralizedLogger';

const logger = createComponentLogger('AccountDetailsModal');

function AccountDetailsModal({ currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');
  const modalRef = useRef(null);
  
  // Enhanced user data state
  const [userAttributes, setUserAttributes] = useState(null);
  const [userSession, setUserSession] = useState(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  
  // Password management states
  const [resetMode, setResetMode] = useState('request');
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
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Load comprehensive user data
  const loadUserData = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoadingUserData(true);
    logger.info('Loading comprehensive user data');
    
    try {
      // Get user attributes
      const attributes = await fetchUserAttributes();
      setUserAttributes(attributes);
      
      // Get session information
      const session = await fetchAuthSession();
      setUserSession(session);
      
      logger.info('User data loaded successfully', {
        attributesCount: Object.keys(attributes).length,
        hasValidSession: !!session?.tokens?.accessToken
      });
    } catch (error) {
      logger.error('Failed to load user data', { error: error.message }, error);
    } finally {
      setIsLoadingUserData(false);
    }
  }, [currentUser]);

  // Load user data when modal opens
  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser, loadUserData]);

  // Close when clicking outside
  const handleBackdropClick = useCallback((e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  }, [onClose]);
  
  // Format date to be more readable
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return "Invalid Date";
    }
  }, []);

  // Format timestamp from seconds
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp * 1000);
      return formatDate(date.toISOString());
    } catch {
      return "Invalid Timestamp";
    }
  }, [formatDate]);

  // Copy to clipboard functionality
  const copyToClipboard = useCallback(async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      logger.userAction('Copy to clipboard', { field: fieldName });
    } catch (error) {
      logger.error('Failed to copy to clipboard', { error: error.message });
    }
  }, []);

  // Comprehensive user data extraction
  const userData = useMemo(() => {
    const session = userSession?.tokens;
    const idToken = session?.idToken?.payload;
    const accessToken = session?.accessToken?.payload;
    
    return {
      // Basic Information
      email: userAttributes?.email || currentUser?.signInDetails?.loginId || 'N/A',
      username: currentUser?.username || idToken?.cognito_username || 'N/A',
      userId: currentUser?.userId || idToken?.sub || accessToken?.sub || 'N/A',
      
      // Account Status
      emailVerified: userAttributes?.email_verified === 'true',
      accountStatus: 'Active', // Cognito user is active if they can authenticate
      
      // Timestamps
      createdAt: idToken?.auth_time ? formatTimestamp(idToken.auth_time) : 'N/A',
      lastLogin: idToken?.iat ? formatTimestamp(idToken.iat) : 'N/A',
      tokenExpiry: idToken?.exp ? formatTimestamp(idToken.exp) : 'N/A',
      
      // Session Information
      tokenUse: accessToken?.token_use || 'N/A',
      clientId: accessToken?.client_id || idToken?.aud || 'N/A',
      issuer: idToken?.iss || 'N/A',
      
      // Device/Client Information
      deviceKey: userAttributes?.device_key || 'N/A',
      preferredUsername: userAttributes?.preferred_username || 'N/A',
      
      // Additional Cognito-specific data
      cognitoGroups: accessToken?.['cognito:groups'] || [],
      cognitoRoles: accessToken?.['cognito:roles'] || [],
      identityId: session?.identityId || 'N/A',
      
      // Raw token data (for debugging)
      rawIdToken: session?.idToken?.toString() || 'N/A',
      rawAccessToken: session?.accessToken?.toString() || 'N/A'
    };
  }, [userAttributes, userSession, currentUser, formatTimestamp]);

  // Pre-fill email from user info
  useEffect(() => {
    if (userData.email && userData.email !== 'N/A') {
      setResetEmail(userData.email);
    }
  }, [userData.email]);
  
  // Password management functions (keeping existing logic)
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setIsLoading(true);
    
    try {
      await resetPassword({ username: resetEmail });
      setResetSuccess('Verification code sent to your email.');
      setResetMode('confirm');
      logger.userAction('Password reset requested', { email: resetEmail });
    } catch (error) {
      logger.error('Password reset request failed', { error: error.message }, error);
      setResetError(error.message || 'Failed to request password reset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
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
      await confirmResetPassword({ username: resetEmail, confirmationCode: resetCode, newPassword });
      setResetSuccess('Password reset successful! You can now sign in with your new password.');
      
      // Clear form
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setResetMode('request');
        setResetSuccess('');
      }, 5000);
      
      logger.userAction('Password reset completed');
    } catch (error) {
      logger.error('Password reset confirmation failed', { error: error.message }, error);
      setResetError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
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
      await updatePassword({
        oldPassword: currentPassword,
        newPassword
      });
      
      setResetSuccess('Password changed successfully!');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setResetMode('request');
        setResetSuccess('');
      }, 5000);
      
      logger.userAction('Password changed successfully');
    } catch (error) {
      logger.error('Password change failed', { error: error.message }, error);
      
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

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteLoading(true);
    
    try {
      await deleteUser();
      
      onClose();
      document.dispatchEvent(new CustomEvent('account-deleted'));
      
      logger.userAction('Account deleted');
    } catch (error) {
      logger.error('Account deletion failed', { error: error.message }, error);
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

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    logger.userAction('Account tab changed', { tab });
  }, []);

  // Information display component
  const InfoField = ({ label, value, icon: Icon, sensitive = false, copyable = false }) => (
    <div className="bg-gray-800/30 hover:bg-gray-800/40 transition-colors duration-200 rounded-lg p-3 sm:p-4 border border-gray-700/30 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {Icon && <Icon className="w-4 h-4 text-purple-300 mr-2" />}
          <h3 className="text-xs sm:text-sm text-purple-300 font-medium">{label}</h3>
        </div>
        {copyable && value !== 'N/A' && (
          <button
            onClick={() => copyToClipboard(value, label)}
            className="text-gray-400 hover:text-purple-300 transition-colors p-1 rounded"
            title="Copy to clipboard"
          >
            {copiedField === label ? (
              <CheckIcon className="w-4 h-4 text-green-400" />
            ) : (
              <DocumentDuplicateIcon className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      <p className={`text-base sm:text-lg text-white ${sensitive && !showSensitiveData ? 'font-mono filter blur-sm' : ''} ${value === 'N/A' ? 'text-gray-400' : ''} break-all`}>
        {sensitive && !showSensitiveData ? '••••••••••••••••' : value}
      </p>
    </div>
  );

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
        className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-800/50"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-b border-gray-800/80 flex justify-between items-center">
          <div className="flex items-center">
            <UserIcon className="w-6 h-6 text-purple-400 mr-3" />
            <h2 className="text-xl font-semibold text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
              Account Information
            </h2>
            {isLoadingUserData && (
              <div className="ml-3 w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSensitiveData(!showSensitiveData)}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-purple-500/20 transition-all duration-200"
              title={showSensitiveData ? "Hide sensitive data" : "Show sensitive data"}
            >
              {showSensitiveData ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-purple-500/20 transition-all duration-200"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-800/80 bg-gray-900/40">
          <div className="flex px-2">
            {[
              { id: 'profile', label: 'Profile & Identity' },
              { id: 'session', label: 'Session Details' },
              { id: 'security', label: 'Security' },
              { id: 'technical', label: 'Technical Info' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`px-4 py-3 font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'border-b-2 border-purple-500 text-purple-300' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-purple-500/10'
                }`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto custom-scrollbar px-6 py-5 flex-grow bg-gradient-to-b from-gray-900/80 to-gray-900">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <InfoField
                label="Email Address"
                value={userData.email}
                icon={EnvelopeIcon}
                copyable={true}
              />
              
              <InfoField
                label="Username"
                value={userData.username}
                icon={UserIcon}
                copyable={true}
              />
              
              <InfoField
                label="User ID"
                value={userData.userId}
                icon={IdentificationIcon}
                sensitive={true}
                copyable={true}
              />
              
              <InfoField
                label="Account Status"
                value={`${userData.accountStatus}${userData.emailVerified ? ' (Verified)' : ' (Unverified)'}`}
                icon={ShieldCheckIcon}
              />
              
              <InfoField
                label="Account Created"
                value={userData.createdAt}
                icon={CalendarIcon}
              />
              
              <InfoField
                label="Last Login"
                value={userData.lastLogin}
                icon={ClockIcon}
              />
            </div>
          )}

          {activeTab === 'session' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <InfoField
                label="Session Token Expiry"
                value={userData.tokenExpiry}
                icon={ClockIcon}
              />
              
              <InfoField
                label="Token Type"
                value={userData.tokenUse}
                icon={ShieldCheckIcon}
              />
              
              <InfoField
                label="Client Application ID"
                value={userData.clientId}
                icon={ComputerDesktopIcon}
                sensitive={true}
                copyable={true}
              />
              
              <InfoField
                label="Identity Provider"
                value={userData.issuer}
                icon={GlobeAltIcon}
                copyable={true}
              />
              
              <InfoField
                label="Identity ID"
                value={userData.identityId}
                icon={IdentificationIcon}
                sensitive={true}
                copyable={true}
              />
              
              <InfoField
                label="Device Key"
                value={userData.deviceKey}
                icon={DevicePhoneMobileIcon}
                sensitive={true}
                copyable={true}
              />
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
          
          {activeTab === 'technical' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <InfoField
                  label="Access Token (JWT)"
                  value={userData.rawAccessToken}
                  icon={ShieldCheckIcon}
                  sensitive={true}
                  copyable={true}
                />
                
                <InfoField
                  label="ID Token (JWT)"
                  value={userData.rawIdToken}
                  icon={IdentificationIcon}
                  sensitive={true}
                  copyable={true}
                />
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700/50">
                <h3 className="text-sm text-gray-300 font-medium mb-2">Technical Information</h3>
                <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
                  <li>Tokens are JWT (JSON Web Tokens) used for authentication</li>
                  <li>Access tokens authenticate API requests</li>
                  <li>ID tokens contain user identity information</li>
                  <li>Sensitive data is hidden by default for security</li>
                  <li>Use the eye icon to toggle visibility</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-800/40 to-gray-900/40 backdrop-blur-sm px-6 py-4 border-t border-gray-700/30 flex justify-between items-center">
          <button
            onClick={() => loadUserData()}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-md text-sm font-medium transition-all duration-200 shadow-sm"
            disabled={isLoadingUserData}
          >
            {isLoadingUserData ? 'Refreshing...' : 'Refresh Data'}
          </button>
          
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
