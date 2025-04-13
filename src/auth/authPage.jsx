import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import { motion, AnimatePresence } from 'framer-motion';

function AuthPage({ onSignupSuccess, onSigninSuccess }) {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await Auth.signUp({
        username: email,
        password,
        attributes: { email },
      });
      setNeedsVerification(true);
      setSuccess('Account created successfully. Please check your email for the verification code.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      let errorMessage = 'Error signing up. Please try again.';
      if (err.code === 'UsernameExistsException') {
        errorMessage = 'An account with this email already exists. Please sign in or use a different email.';
      } else if (err.code === 'InvalidPasswordException') {
        errorMessage = 'Password must be at least 8 characters with uppercase, lowercase, and numbers.';
      } else if (err.code === 'InvalidParameterException') {
        errorMessage = 'Please enter a valid email address.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error('Sign up error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await Auth.confirmSignUp(email, verificationCode);
      const user = await Auth.signIn(email, password);
      onSignupSuccess(user);
      navigate('/onboarding');
    } catch (err) {
      let errorMessage = 'Error verifying account';
      if (err.code === 'CodeMismatchException') {
        errorMessage = 'Invalid verification code. Please try again.';
      } else if (err.code === 'NotAuthorizedException') {
        errorMessage = 'Incorrect email or password.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await Auth.resendSignUp(email);
      setSuccess('Verification code resent successfully.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      let errorMessage = 'Error resending verification code';
      if (err.code === 'LimitExceededException') {
        errorMessage = 'Attempt limit exceeded. Please try again later.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await Auth.signIn(email, password);
      console.log('[AuthPage] Sign-in successful, calling onSigninSuccess with user', { 
        userId: user?.attributes?.sub || user?.username,
      });
      onSigninSuccess(user);
      navigate('/');
    } catch (err) {
      console.error('[AuthPage] Sign-in error:', err);
      setError(err.message || 'Error signing in');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await Auth.forgotPassword(email);
      setSuccess('Verification code sent to your email.');
      setResetCodeSent(true);
    } catch (err) {
      console.error('[AuthPage] Forgot password error:', err);
      setError(err.message || 'Error requesting password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await Auth.forgotPasswordSubmit(email, verificationCode, newPassword);
      setSuccess('Password has been reset successfully. You can now sign in with your new password.');
      setTimeout(() => {
        setIsForgotPassword(false);
        setResetCodeSent(false);
        setPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setVerificationCode('');
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('[AuthPage] Reset password confirmation error:', err);
      setError(err.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    setIsForgotPassword(false);
    setResetCodeSent(false);
    setError('');
    setSuccess('');
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  const formVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12"
    >
      <div className="w-full max-w-md">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-400">
            MovieRec
          </h1>
          <p className="mt-2 text-gray-300">
            {isForgotPassword ? (resetCodeSent ? 'Reset Your Password' : 'Forgot Password') :
             isSigningUp ? 'Create Your Account' :
             needsVerification ? 'Verify Your Account' : 'Welcome Back'}
          </p>
        </motion.div>
        <motion.div
          className="bg-gray-800 bg-opacity-70 shadow-lg rounded-xl p-8 border border-gray-700 min-h-[360px] w-full flex flex-col custom-scrollbar"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-green-900/50 border border-green-500 text-green-200 text-sm rounded"
            >
              {success}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {isForgotPassword && resetCodeSent ? (
              <motion.form
                key="reset-form"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleConfirmPasswordReset}
                className="space-y-6"
              >
                <motion.div className="mb-4" variants={itemVariants}>
                  <h3 className="text-xl font-bold text-white mb-1">Reset Password</h3>
                  <p className="text-sm text-gray-400">Enter the verification code and your new password.</p>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label htmlFor="reset-code" className="block text-sm font-medium text-gray-300">Verification Code</label>
                  <input
                    id="reset-code"
                    name="reset-code"
                    type="text"
                    autoComplete="one-time-code"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter code from email"
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-300">New Password</label>
                  <div className="mt-1 relative">
                    <input
                      id="new-password"
                      name="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8+ characters"
                      className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex="-1"
                    >
                      {showNewPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-300">Confirm New Password</label>
                  <div className="mt-1 relative">
                    <input
                      id="confirm-new-password"
                      name="confirm-new-password"
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      tabIndex="-1"
                    >
                      {showConfirmNewPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.div>
                <motion.div variants={itemVariants} className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </motion.div>
                <motion.div variants={itemVariants} className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={handleBackToSignIn}
                    className="text-sm text-indigo-400 hover:text-indigo-300 focus:outline-none"
                  >
                    Back to Sign In
                  </button>
                </motion.div>
              </motion.form>
            ) : isForgotPassword ? (
              <motion.form
                key="forgot-form"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleRequestPasswordReset}
                className="space-y-6"
              >
                <motion.div className="mb-4" variants={itemVariants}>
                  <h3 className="text-xl font-bold text-white mb-1">Reset Your Password</h3>
                  <p className="text-sm text-gray-400">We'll send a verification code to your email.</p>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="you@example.com"
                  />
                </motion.div>
                <motion.div variants={itemVariants} className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </motion.div>
                <motion.div variants={itemVariants} className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={handleBackToSignIn}
                    className="text-sm text-indigo-400 hover:text-indigo-300 focus:outline-none"
                  >
                    Back to Sign In
                  </button>
                </motion.div>
              </motion.form>
            ) : isSigningUp ? (
              <motion.form
                key="signup-form"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleSignUp}
                className="space-y-6"
              >
                <motion.div className="mb-4" variants={itemVariants}>
                  <h3 className="text-xl font-bold text-white mb-1">Create Your Account</h3>
                  <p className="text-sm text-gray-400">Join MovieRec to get personalized recommendations</p>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="you@example.com"
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="8+ characters"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300">Confirm Password</label>
                  <div className="mt-1 relative">
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Re-enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex="-1"
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.div>
                <motion.div variants={itemVariants} className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                </motion.div>
                <motion.div variants={itemVariants} className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setIsSigningUp(false)}
                    className="text-sm text-indigo-400 hover:text-indigo-300 focus:outline-none"
                  >
                    Already have an account? Sign in
                  </button>
                </motion.div>
              </motion.form>
            ) : needsVerification ? (
              <motion.form
                key="verify-form"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleVerification}
                className="space-y-6"
              >
                <motion.div className="mb-4" variants={itemVariants}>
                  <h3 className="text-xl font-bold text-white mb-1">Verify Your Account</h3>
                  <p className="text-sm text-gray-400">Enter the verification code sent to your email.</p>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label htmlFor="verification-code" className="block text-sm font-medium text-gray-300">Verification Code</label>
                  <input
                    id="verification-code"
                    name="verification-code"
                    type="text"
                    autoComplete="one-time-code"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter verification code"
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <p className="mt-2 text-sm text-gray-400">
                    Please check your email (including spam folder) for the verification code.
                  </p>
                  <p className="mt-2 text-sm text-gray-400">
                    Didn't receive the code?{' '}
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={loading}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      Resend code
                    </button>
                  </p>
                </motion.div>
                <motion.div variants={itemVariants} className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify Account'}
                  </button>
                </motion.div>
              </motion.form>
            ) : (
              <motion.form
                key="signin-form"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleSignIn}
                className="space-y-6"
              >
                <motion.div className="mb-4" variants={itemVariants}>
                  <h3 className="text-xl font-bold text-white mb-1">Welcome Back</h3>
                  <p className="text-sm text-gray-400">Sign in to your account</p>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="you@example.com"
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm text-indigo-400 hover:text-indigo-300 focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.div>
                <motion.div variants={itemVariants} className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </motion.div>
                <motion.div variants={itemVariants} className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setIsSigningUp(true)}
                    className="text-sm text-indigo-400 hover:text-indigo-300 focus:outline-none"
                  >
                    Don't have an account? Sign up
                  </button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-400">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default AuthPage;