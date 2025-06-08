import { Palette } from 'lucide-react';
import { useTheme } from '../../store/themeStore';
import './ColorSchemeToggle.css';

export function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useTheme();
  
  return (
    <button
      className="color-scheme-toggle"
      onClick={toggleColorScheme}
      title={`Switch to ${colorScheme === 'blue' ? 'green' : 'blue'} theme`}
      aria-label={`Current theme: ${colorScheme}. Click to switch.`}
    >
      <Palette size={16} />
    </button>
  );
}