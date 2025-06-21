/**
 * Login page for NBG OAuth
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const { login, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await login();
      // login() will redirect to NBG, so this won't execute
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to initiate login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>OWUI Feedback Analyzer</h1>
          <p>Sign in to access conversation analytics</p>
        </div>
        
        <div className="login-content">
          <div className="login-logo">
            <img src="/nbg-logo.png" alt="NBG" />
          </div>
          
          <button 
            className="login-button"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Redirecting to NBG...
              </>
            ) : (
              <>
                <svg className="login-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                </svg>
                Sign in with NBG
              </>
            )}
          </button>
          
          {(error || authError) && (
            <div className="login-error">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" />
              </svg>
              {error || authError}
            </div>
          )}
        </div>
        
        <div className="login-footer">
          <p>By signing in, you agree to NBG's terms of service</p>
        </div>
      </div>
    </div>
  );
};