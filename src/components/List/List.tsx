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
  searchAction?: ReactNode | ((sampleData: T | null) => ReactNode);
  emptyState?: ReactNode;
  className?: string;
  selectedId?: string | null;
  getItemId?: (item: T) => string;
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
  searchAction,
  emptyState,
  className = '',
  selectedId = null,
  getItemId
}: ListProps<T>) {
  const defaultEmptyState = (
    <div className="list-empty-state">
      <p>No items available</p>
    </div>
  );

  // Calculate sample data based on selection state
  const getSampleData = (): T | null => {
    if (items.length === 0) return null;
    
    if (selectedId && getItemId) {
      // If there's a selected item, find and return it
      const selectedItem = items.find(item => getItemId(item) === selectedId);
      if (selectedItem) return selectedItem;
    }
    
    // Otherwise, return the first item
    return items[0];
  };

  const sampleData = getSampleData();
  
  // Resolve searchAction - if it's a function, call it with sampleData
  const resolvedSearchAction = typeof searchAction === 'function' 
    ? searchAction(sampleData) 
    : searchAction;

  return (
    <div className={`list-container ${className}`}>
      {header && <div className="list-header">{header}</div>}
      
      {searchable && (
        <div className="list-search-container">
          <div className="list-search-wrapper">
            <Search size={16} className="list-search-icon" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="list-search-input"
            />
          </div>
          {resolvedSearchAction && <div className="list-search-action">{resolvedSearchAction}</div>}
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