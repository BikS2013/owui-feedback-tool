import { Grid, List } from 'lucide-react';
import { Switch } from '../Switch';
import './ViewModeSwitch.css';

export type ViewMode = 'grid' | 'list';

interface ViewModeSwitchProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewModeSwitch({ mode, onChange, className = '' }: ViewModeSwitchProps) {
  return (
    <div className={`view-mode-switch ${className}`}>
      <button
        className={`view-mode-btn ${mode === 'list' ? 'active' : ''}`}
        onClick={() => onChange('list')}
        title="List view"
        aria-label="Switch to list view"
      >
        <List size={16} />
      </button>
      <button
        className={`view-mode-btn ${mode === 'grid' ? 'active' : ''}`}
        onClick={() => onChange('grid')}
        title="Grid view"
        aria-label="Switch to grid view"
      >
        <Grid size={16} />
      </button>
    </div>
  );
}

// Alternative implementation using the Switch component
export function ViewModeToggle({ mode, onChange, className = '' }: ViewModeSwitchProps) {
  return (
    <div className={`view-mode-toggle ${className}`}>
      <List size={16} className={mode === 'list' ? 'icon-active' : 'icon-inactive'} />
      <Switch
        checked={mode === 'grid'}
        onChange={(checked) => onChange(checked ? 'grid' : 'list')}
        size="small"
      />
      <Grid size={16} className={mode === 'grid' ? 'icon-active' : 'icon-inactive'} />
    </div>
  );
}