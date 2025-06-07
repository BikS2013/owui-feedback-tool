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

  // Calculate position for rated count
  // The circle starts at top (12 o'clock) and goes clockwise
  // Position it 20 degrees from the start
  const ratedAngleOffset = 20;
  const ratedAngleInDegrees = -90 + ratedAngleOffset;
  const ratedAngleInRadians = (ratedAngleInDegrees * Math.PI) / 180;
  
  // Calculate position on the circle line itself
  const labelOffset = radius;
  const ratedX = size / 2 + labelOffset * Math.cos(ratedAngleInRadians);
  const ratedY = size / 2 + labelOffset * Math.sin(ratedAngleInRadians);
  
  // Calculate position for unrated count
  // Convert percentage to radians (subtract 90 degrees because SVG starts at 3 o'clock)
  // Add a larger offset into the unrated section (e.g., 20 degrees)
  const unratedAngleOffset = 20;
  const unratedAngleInDegrees = (percentage / 100) * 360 - 90 + unratedAngleOffset;
  const unratedAngleInRadians = (unratedAngleInDegrees * Math.PI) / 180;
  
  const unratedX = size / 2 + labelOffset * Math.cos(unratedAngleInRadians);
  const unratedY = size / 2 + labelOffset * Math.sin(unratedAngleInRadians);

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
        {/* Rated count positioned on the rated section */}
        <div 
          className="progress-count rated-count"
          style={{
            left: `${ratedX}px`,
            top: `${ratedY}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <span>{ratedCount}</span>
        </div>
        {/* Unrated count positioned at the start of unrated section */}
        <div 
          className="progress-count unrated-count"
          style={{
            left: `${unratedX}px`,
            top: `${unratedY}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <span>{unratedCount}</span>
        </div>
      </div>
    </div>
  );
}