import { ReactNode } from 'react';
import './LogoHeader.css';

interface LogoHeaderProps {
  // Logo configuration
  logoSrc?: string;
  logoAlt?: string;
  logoHeight?: number;
  onLogoClick?: () => void;
  
  // Title configuration (appears below logo)
  title?: ReactNode;
  
  // Subtitle configuration (middle of second line)
  subtitle?: ReactNode;
  
  // Controls configuration
  topRightControls?: ReactNode;
  bottomRightControls?: ReactNode;
  
  // Style customization
  backgroundColor?: string;
  className?: string;
  minHeight?: number;
}

export function LogoHeader({
  logoSrc,
  logoAlt = 'Logo',
  logoHeight = 60,
  onLogoClick,
  title,
  subtitle,
  topRightControls,
  bottomRightControls,
  backgroundColor,
  className = '',
  minHeight = 105
}: LogoHeaderProps) {
  return (
    <div 
      className={`logo-header ${className}`}
      style={{ 
        backgroundColor,
        minHeight: `${minHeight}px`
      }}
    >
      {/* First line: Logo positioned absolutely, controls on the right */}
      <div className="logo-header-top">
        {logoSrc && (
          <img 
            src={logoSrc} 
            alt={logoAlt} 
            className="logo-header-logo"
            style={{ height: `${logoHeight}px` }}
            onClick={onLogoClick}
            role={onLogoClick ? 'button' : undefined}
            tabIndex={onLogoClick ? 0 : undefined}
          />
        )}
        {topRightControls && (
          <div className="logo-header-controls">
            {topRightControls}
          </div>
        )}
      </div>
      
      {/* Second line: Title on left, subtitle in middle, controls on right */}
      <div className="logo-header-bottom">
        {title && (
          <div className="logo-header-title">
            {title}
          </div>
        )}
        {subtitle && (
          <div className="logo-header-subtitle">
            {subtitle}
          </div>
        )}
        {bottomRightControls && (
          <div className="logo-header-bottom-controls">
            {bottomRightControls}
          </div>
        )}
      </div>
    </div>
  );
}