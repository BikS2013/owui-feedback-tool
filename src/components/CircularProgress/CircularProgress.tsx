import React from 'react';
import './CircularProgress.css';

interface CircularProgressProps {
  percentage: number;
  label: string;
  ratedCount: number;
  unratedCount: number;
  size?: number;
  strokeWidth?: number;
}

export function CircularProgress({ 
  percentage, 
  label, 
  ratedCount, 
  unratedCount,
  size = 180,
  strokeWidth = 12 
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const ratedPercentage = percentage;
  const unratedPercentage = 100 - percentage;

  return (
    <div className="circular-progress-container">
      <div className="circular-progress">
        <svg width={size} height={size} className="progress-ring">
          {/* Background circle */}
          <circle
            className="progress-ring-background"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress circle */}
          <circle
            className="progress-ring-progress"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            style={{
              strokeDasharray: `${circumference} ${circumference}`,
              strokeDashoffset,
            }}
          />
        </svg>
        <div className="progress-text">
          <span className="progress-percentage">{percentage.toFixed(0)}%</span>
          <span className="progress-label">{label}</span>
        </div>
      </div>
      
      <div className="progress-stats">
        <div className="stat-box rated">
          <span className="stat-label">Rated:</span>
          <span className="stat-value">{ratedCount}</span>
          <span className="stat-percent">({ratedPercentage.toFixed(1)}%)</span>
        </div>
        <div className="stat-box unrated">
          <span className="stat-label">Unrated:</span>
          <span className="stat-value">{unratedCount}</span>
          <span className="stat-percent">({unratedPercentage.toFixed(1)}%)</span>
        </div>
      </div>
    </div>
  );
}