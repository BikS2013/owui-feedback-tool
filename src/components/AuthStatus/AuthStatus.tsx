/**
 * Auth status component showing user info and logout option
 */

import React, { useState } from 'react';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './AuthStatus.css';

export const AuthStatus: React.FC = () => {
  const { user, isAuthenticated, logout, authStatus } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // Don't show if auth is disabled
  if (!authStatus?.enabled) {
    return null;
  }

  // Don't show if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    setShowDropdown(false);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const displayName = user.name || user.preferred_username || user.email || 'User';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="auth-status">
      <button 
        className="auth-status-button"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-expanded={showDropdown}
      >
        <div className="auth-avatar">
          {user.picture ? (
            <img src={user.picture} alt={displayName} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <span className="auth-name">{displayName}</span>
        <ChevronDown className={`auth-chevron ${showDropdown ? 'open' : ''}`} size={16} />
      </button>

      {showDropdown && (
        <>
          <div 
            className="auth-dropdown-backdrop" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="auth-dropdown">
            <div className="auth-dropdown-header">
              <div className="auth-avatar large">
                {user.picture ? (
                  <img src={user.picture} alt={displayName} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="auth-info">
                <div className="auth-fullname">{displayName}</div>
                {user.email && (
                  <div className="auth-email">{user.email}</div>
                )}
                {user.roles && user.roles.length > 0 && (
                  <div className="auth-roles">
                    {user.roles.map((role, index) => (
                      <span key={index} className="auth-role-badge">
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="auth-dropdown-divider" />
            
            <button className="auth-dropdown-item" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};