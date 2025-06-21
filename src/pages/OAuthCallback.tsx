/**
 * OAuth callback handler page
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import './OAuthCallback.css';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Check for OAuth error
      const error = searchParams.get('error');
      if (error) {
        const errorDescription = searchParams.get('error_description') || 'Authentication failed';
        throw new Error(`${error}: ${errorDescription}`);
      }

      // Check for authorization code
      const code = searchParams.get('code');
      if (!code) {
        throw new Error('Authorization code not found');
      }

      // Exchange code for tokens
      setMessage('Completing authentication...');
      const result = await AuthService.handleCallback(searchParams);

      if (result.success) {
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        
        // Wait a moment to show success message
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Authentication failed');
      
      // Redirect to login after showing error
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    }
  };

  return (
    <div className="oauth-callback">
      <div className="callback-container">
        <div className={`callback-status ${status}`}>
          {status === 'processing' && (
            <div className="callback-spinner">
              <div className="spinner-ring"></div>
            </div>
          )}
          
          {status === 'success' && (
            <svg className="callback-icon success" viewBox="0 0 24 24" width="48" height="48">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
          
          {status === 'error' && (
            <svg className="callback-icon error" viewBox="0 0 24 24" width="48" height="48">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          )}
        </div>
        
        <h2 className="callback-title">
          {status === 'processing' && 'Authenticating...'}
          {status === 'success' && 'Welcome!'}
          {status === 'error' && 'Authentication Failed'}
        </h2>
        
        <p className="callback-message">{message}</p>
        
        {status === 'error' && (
          <button 
            className="callback-retry"
            onClick={() => navigate('/login', { replace: true })}
          >
            Return to Login
          </button>
        )}
      </div>
    </div>
  );
};