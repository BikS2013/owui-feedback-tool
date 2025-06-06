import { Calendar, Sliders, X, Bot } from 'lucide-react';
import { FilterOptions } from '../../types/conversation';
import './FilterPanel.css';

interface FilterPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  isOpen: boolean;
  onClose: () => void;
  availableModels: string[];
}

export function FilterPanel({ filters, onFiltersChange, isOpen, onClose, availableModels }: FilterPanelProps) {
  if (!isOpen) return null;

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value ? new Date(value) : null
      }
    });
  };

  const handleRatingChange = (field: 'min' | 'max', value: number) => {
    onFiltersChange({
      ...filters,
      ratingFilter: {
        ...filters.ratingFilter,
        [field]: value
      }
    });
  };

  const handleFilterLevelChange = (level: 'conversation' | 'qa') => {
    onFiltersChange({
      ...filters,
      filterLevel: level
    });
  };

  const handleIncludeUnratedChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      ratingFilter: {
        ...filters.ratingFilter,
        includeUnrated: checked
      }
    });
  };

  const handleModelToggle = (model: string) => {
    const newModels = filters.modelFilter.includes(model)
      ? filters.modelFilter.filter(m => m !== model)
      : [...filters.modelFilter, model];
    
    onFiltersChange({
      ...filters,
      modelFilter: newModels
    });
  };

  const resetFilters = () => {
    onFiltersChange({
      dateRange: { start: null, end: null },
      ratingFilter: { min: 1, max: 10, includeUnrated: true },
      searchTerm: filters.searchTerm,
      filterLevel: 'conversation',
      modelFilter: []
    });
  };

  return (
    <div className="filter-panel-overlay" onClick={onClose}>
      <div className="filter-panel" onClick={e => e.stopPropagation()}>
        <div className="filter-panel-header">
          <h3>Filters</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="filter-section">
          <div className="filter-section-header">
            <Calendar size={16} />
            <h4>Date Range</h4>
          </div>
          
          <div className="date-inputs">
            <div className="input-group">
              <label>From</label>
              <input
                type="date"
                value={filters.dateRange.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                onChange={(e) => handleDateChange('start', e.target.value)}
              />
            </div>
            
            <div className="input-group">
              <label>To</label>
              <input
                type="date"
                value={filters.dateRange.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                onChange={(e) => handleDateChange('end', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-section-header">
            <Sliders size={16} />
            <h4>Rating Filter</h4>
          </div>

          <div className="filter-level-toggle">
            <label>
              <input
                type="radio"
                name="filterLevel"
                value="conversation"
                checked={filters.filterLevel === 'conversation'}
                onChange={() => handleFilterLevelChange('conversation')}
              />
              Conversation Level
            </label>
            <label>
              <input
                type="radio"
                name="filterLevel"
                value="qa"
                checked={filters.filterLevel === 'qa'}
                onChange={() => handleFilterLevelChange('qa')}
              />
              Q&A Level
            </label>
          </div>

          <div className="rating-range">
            <div className="input-group">
              <label>Min Rating</label>
              <input
                type="range"
                min="1"
                max="10"
                value={filters.ratingFilter.min}
                onChange={(e) => handleRatingChange('min', Number(e.target.value))}
              />
              <span className="rating-value">{filters.ratingFilter.min}</span>
            </div>

            <div className="input-group">
              <label>Max Rating</label>
              <input
                type="range"
                min="1"
                max="10"
                value={filters.ratingFilter.max}
                onChange={(e) => handleRatingChange('max', Number(e.target.value))}
              />
              <span className="rating-value">{filters.ratingFilter.max}</span>
            </div>
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.ratingFilter.includeUnrated}
              onChange={(e) => handleIncludeUnratedChange(e.target.checked)}
            />
            Include unrated items
          </label>
        </div>

        <div className="filter-section">
          <div className="filter-section-header">
            <Bot size={16} />
            <h4>Model Filter</h4>
          </div>

          <div className="model-checkboxes">
            {availableModels.length === 0 ? (
              <p className="no-models">No models found</p>
            ) : (
              availableModels.map(model => (
                <label key={model} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.modelFilter.includes(model)}
                    onChange={() => handleModelToggle(model)}
                  />
                  {model}
                </label>
              ))
            )}
          </div>
        </div>

        <div className="filter-actions">
          <button className="reset-btn" onClick={resetFilters}>
            Reset Filters
          </button>
          <button className="apply-btn" onClick={onClose}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}