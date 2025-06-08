import { ReactNode } from 'react';
import './NoLogoHeader.css';

interface NoLogoHeaderProps {
  // Title configuration (left side of first line)
  title?: ReactNode;
  
  // Subtitle configuration (left side of second line)
  subtitle?: ReactNode;
  
  // Controls configuration
  topRightControls?: ReactNode;
  bottomRightControls?: ReactNode;
  
  // Style customization
  backgroundColor?: string;
  className?: string;
  minHeight?: number;
  heightAdjustment?: number; // Optional pixel adjustment for alignment with LogoHeader
}

export function NoLogoHeader({
  title,
  subtitle,
  topRightControls,
  bottomRightControls,
  backgroundColor,
  className = '',
  minHeight = 105,
  heightAdjustment = 0
}: NoLogoHeaderProps) {
  const adjustedHeight = minHeight + heightAdjustment;
  
  return (
    <div 
      className={`no-logo-header ${className}`}
      style={{ 
        backgroundColor,
        minHeight: `${adjustedHeight}px`,
        color: 'rgba(255, 255, 255, 0.8)'
      }}
    >
      {/* First line: Title on left, controls on the right */}
      <div className="no-logo-header-top">
        {title && (
          <div className="no-logo-header-title">
            {title}
          </div>
        )}
        {topRightControls && (
          <div className="no-logo-header-controls">
            {topRightControls}
          </div>
        )}
      </div>
      
      {/* Second line: Subtitle on left, controls on right */}
      <div className="no-logo-header-bottom">
        {subtitle && (
          <div className="no-logo-header-subtitle">
            {subtitle}
          </div>
        )}
        {bottomRightControls && (
          <div className="no-logo-header-bottom-controls">
            {bottomRightControls}
          </div>
        )}
      </div>
    </div>
  );
}