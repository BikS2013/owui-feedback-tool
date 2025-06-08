import { ReactNode } from 'react';
import { Search } from 'lucide-react';
import './List.css';

interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  header?: ReactNode;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  emptyState?: ReactNode;
  className?: string;
}

export function List<T>({
  items,
  renderItem,
  keyExtractor,
  header,
  searchable = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  emptyState,
  className = ''
}: ListProps<T>) {
  const defaultEmptyState = (
    <div className="list-empty-state">
      <p>No items available</p>
    </div>
  );

  return (
    <div className={`list-container ${className}`}>
      {header && <div className="list-header">{header}</div>}
      
      {searchable && (
        <div className="list-search-container">
          <Search size={16} className="list-search-icon" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="list-search-input"
          />
        </div>
      )}

      <div className="list-content">
        {items.length === 0 ? (
          emptyState || defaultEmptyState
        ) : (
          items.map((item, index) => (
            <div key={keyExtractor(item, index)} className="list-item-wrapper">
              {renderItem(item, index)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}