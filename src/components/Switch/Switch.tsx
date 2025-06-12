import './Switch.css';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function Switch({ 
  checked, 
  onChange, 
  label, 
  disabled = false,
  size = 'medium',
  className = ''
}: SwitchProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <label className={`switch-container ${className}`}>
      <div className="switch-wrapper">
        <input
          type="checkbox"
          className="switch-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-checked={checked}
          role="switch"
        />
        <span 
          className={`switch-slider switch-${size} ${checked ? 'switch-checked' : ''} ${disabled ? 'switch-disabled' : ''}`}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
        >
          <span className="switch-thumb" />
        </span>
      </div>
      {label && <span className="switch-label">{label}</span>}
    </label>
  );
}