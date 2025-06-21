import { useState, useEffect } from 'react';
import { X, MessageSquare, Sparkles, Copy, Calendar, Bot, Star, ChevronUp, ChevronDown } from 'lucide-react';
import { FilterOptions, Conversation } from '../../types/conversation';
import { useFeedbackStore } from '../../store/feedbackStore';
import { format } from 'date-fns';
import { storageUtils } from '../../utils/storageUtils';
import { useResizable } from '../../hooks/useResizable';
import './FilterPanel.css';

interface LLMConfiguration {
  name: string;
  provider: string;
  model: string;
  description?: string;
  enabled: boolean;
}

interface FilterPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  isOpen: boolean;
  onClose: () => void;
  currentThread?: any; // Current selected thread for sample data
  conversations: Conversation[]; // For extracting available models
  containerRef?: HTMLElement; // Reference to container for positioning in magic mode
  sampleData?: any; // Generic sample data (can be thread or conversation)
}

const LLM_STORAGE_KEY = 'filterPanelSelectedLLM';
const QUERY_HISTORY_KEY = 'filterPanelQueryHistory';
const SELECTED_TAB_KEY = 'filterPanelSelectedTab';
const MAX_HISTORY_SIZE = 50;

type FilterTab = 'static' | 'natural';

export function FilterPanel({ filters, onFiltersChange, isOpen, onClose, currentThread, conversations, sampleData }: FilterPanelProps) {
  const { dataSource } = useFeedbackStore();
  const [activeTab, setActiveTab] = useState<FilterTab>(() => {
    const saved = localStorage.getItem(SELECTED_TAB_KEY);
    return (saved === 'static' || saved === 'natural') ? saved : 'static';
  });
  const [displayMode, setDisplayMode] = useState(storageUtils.getDisplayMode());
  
  // Use resizable hook for engineering mode
  const {
    modalRef,
    modalSize,
    isResizing,
    handleResizeStart,
    handleOverlayClick
  } = useResizable({
    defaultWidth: 480,
    defaultHeight: 600,
    minWidth: 400,
    minHeight: 500,
    storageKey: 'filterPanelSize'
  });
  
  // Natural Language filter state
  const [naturalQuery, setNaturalQuery] = useState(filters.naturalLanguageQuery || '');
  const [selectedLLM, setSelectedLLM] = useState<string>(() => {
    // Try to restore from localStorage
    return localStorage.getItem(LLM_STORAGE_KEY) || '';
  });
  const [queryHistory, setQueryHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem(QUERY_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Static filter state
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: filters.dateRange?.start ? format(filters.dateRange.start, 'yyyy-MM-dd') : '',
    end: filters.dateRange?.end ? format(filters.dateRange.end, 'yyyy-MM-dd') : ''
  });
  const [selectedModels, setSelectedModels] = useState<string[]>(filters.modelFilter || []);
  const [ratingRange, setRatingRange] = useState({
    min: filters.ratingFilter?.min || 1,
    max: filters.ratingFilter?.max || 10,
    includeUnrated: filters.ratingFilter?.includeUnrated ?? true
  });
  const [llmConfigurations, setLlmConfigurations] = useState<LLMConfiguration[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [filterExpression, setFilterExpression] = useState<string>(filters.customJavaScriptFilter || '');
  const [executionError, setExecutionError] = useState<string>('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [copiedItem, setCopiedItem] = useState<'prompt' | 'filter' | null>(null);
  const [fetchedPrompt, setFetchedPrompt] = useState<string>('');
  const [isFetchingPrompt, setIsFetchingPrompt] = useState(false);
  const [lastGeneratedScripts, setLastGeneratedScripts] = useState<{
    filterScript?: string;
    renderScript?: string;
    responseType?: string;
  } | null>(null);
  
  // Extract available models from conversations
  const availableModels = Array.from(new Set(
    conversations.flatMap(conv => conv.modelsUsed || [])
  )).sort();

  useEffect(() => {
    // Load LLM configurations from backend when panel opens
    if (isOpen) {
      fetchLLMConfigurations();
      // If there's an active JavaScript filter or render script, show it
      if (filters.customJavaScriptFilter || filters.customRenderScript) {
        let displayText = '';
        
        if (filters.customJavaScriptFilter) {
          displayText += '// FILTER SCRIPT\n' + filters.customJavaScriptFilter;
        }
        
        if (filters.customRenderScript) {
          if (displayText) displayText += '\n\n';
          displayText += '// RENDER SCRIPT\n' + filters.customRenderScript;
        }
        
        setFilterExpression(displayText);
        
        // Also restore the last generated scripts
        setLastGeneratedScripts({
          filterScript: filters.customJavaScriptFilter,
          renderScript: filters.customRenderScript,
          responseType: filters.customJavaScriptFilter && filters.customRenderScript ? 'both' : 
                       filters.customJavaScriptFilter ? 'filter' : 'render'
        });
      }
    }
  }, [isOpen, filters.customJavaScriptFilter, filters.customRenderScript]);


  // Save selected LLM to localStorage when it changes
  useEffect(() => {
    if (selectedLLM) {
      localStorage.setItem(LLM_STORAGE_KEY, selectedLLM);
    }
  }, [selectedLLM]);

  // Listen for display mode changes
  useEffect(() => {
    const cleanup = storageUtils.onDisplayModeChange((mode) => {
      setDisplayMode(mode);
    });
    return cleanup;
  }, []);

  // Save query history to localStorage
  useEffect(() => {
    localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(queryHistory));
  }, [queryHistory]);

  // Save selected tab to localStorage
  useEffect(() => {
    localStorage.setItem(SELECTED_TAB_KEY, activeTab);
  }, [activeTab]);

  // Handle ESC key to close panel and history navigation hotkeys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
      
      // Only handle history navigation in magic mode on natural language tab
      if (displayMode === 'magic' && activeTab === 'natural' && isOpen) {
        if (event.altKey && event.key === 'ArrowUp') {
          event.preventDefault();
          navigateHistoryUp();
        } else if (event.altKey && event.key === 'ArrowDown') {
          event.preventDefault();
          navigateHistoryDown();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose, displayMode, activeTab, historyIndex, queryHistory]);


  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    
    // Remove duplicates and add to beginning
    const newHistory = [query, ...queryHistory.filter(q => q !== query)].slice(0, MAX_HISTORY_SIZE);
    setQueryHistory(newHistory);
    setHistoryIndex(-1); // Reset index when new query is added
  };

  const navigateHistoryUp = () => {
    if (queryHistory.length === 0) return;
    
    const newIndex = historyIndex < queryHistory.length - 1 ? historyIndex + 1 : historyIndex;
    if (newIndex !== historyIndex) {
      setHistoryIndex(newIndex);
      setNaturalQuery(queryHistory[newIndex]);
    }
  };

  const navigateHistoryDown = () => {
    if (historyIndex <= 0) {
      setHistoryIndex(-1);
      setNaturalQuery('');
    } else {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setNaturalQuery(queryHistory[newIndex]);
    }
  };

  const clearHistory = () => {
    setQueryHistory([]);
    setHistoryIndex(-1);
    localStorage.removeItem(QUERY_HISTORY_KEY);
  };

  const fetchLLMConfigurations = async () => {
    try {
      const apiUrl = await storageUtils.getApiUrl();
      const response = await fetch(`${apiUrl}/api/llm/configurations`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch LLM configurations');
      }
      
      const data = await response.json();
      console.log('🔧 [FilterPanel] Loaded LLM configurations from backend:', data);
      
      if (data.configurations && Array.isArray(data.configurations)) {
        setLlmConfigurations(data.configurations);
        
        // Check if saved selection is still valid
        const savedLLM = localStorage.getItem(LLM_STORAGE_KEY);
        const savedConfigExists = savedLLM && data.configurations.some((c: LLMConfiguration) => c.name === savedLLM);
        
        if (savedConfigExists) {
          // Use the saved selection if it's still valid
          console.log('🔧 [FilterPanel] Restoring saved LLM selection:', savedLLM);
          setSelectedLLM(savedLLM);
        } else if (data.defaultConfiguration) {
          // Fall back to default configuration
          const defaultConfig = data.configurations.find((c: LLMConfiguration) => c.name === data.defaultConfiguration);
          if (defaultConfig) {
            setSelectedLLM(defaultConfig.name);
          }
        } else if (data.configurations.length > 0) {
          // Fall back to first configuration
          setSelectedLLM(data.configurations[0].name);
        }
      } else {
        console.warn('⚠️ [FilterPanel] No configurations in response:', data);
        setLlmConfigurations([]);
      }
    } catch (error) {
      console.error('❌ [FilterPanel] Error loading LLM configurations:', error);
      setLlmConfigurations([]);
    }
  };

  if (!isOpen) return null;

  const handleCopy = async (text: string, type: 'prompt' | 'filter') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(type);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const fetchPromptFromServer = async () => {
    if (!naturalQuery.trim() || !selectedLLM) return;

    setIsFetchingPrompt(true);
    setFetchedPrompt('');

    try {
      console.log('🔍 [FilterPanel] Fetching prompt from server:', naturalQuery);
      const effectiveSampleData = sampleData || currentThread;
      console.log('   Sample data available:', !!effectiveSampleData);
      
      const requestBody: any = {
        llmConfiguration: selectedLLM,
        query: naturalQuery
      };
      
      if (effectiveSampleData) {
        requestBody.sampleData = effectiveSampleData;
        console.log('   Including sample data');
        if (effectiveSampleData.thread_id) {
          console.log('   Sample thread ID:', effectiveSampleData.thread_id);
        } else if (effectiveSampleData.id) {
          console.log('   Sample conversation ID:', effectiveSampleData.id);
        }
      } else {
        console.log('   No sample data available - using schema-based approach');
      }
      
      const apiUrl = await storageUtils.getApiUrl();
      const response = await fetch(`${apiUrl}/api/llm/get-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to fetch prompt');
      }

      const data = await response.json();
      
      if (data.success && data.prompt) {
        setFetchedPrompt(data.prompt);
        setShowPrompt(true);
        console.log('✅ [FilterPanel] Successfully fetched prompt from server');
      } else {
        throw new Error(data.error || 'No prompt returned');
      }
    } catch (error) {
      console.error('❌ [FilterPanel] Error fetching prompt:', error);
      setExecutionError('Failed to fetch prompt from server');
    } finally {
      setIsFetchingPrompt(false);
    }
  };


  const executeNaturalLanguageQuery = async () => {
    if (!naturalQuery.trim() || !selectedLLM) return null;

    // Add to history when executing
    addToHistory(naturalQuery);

    setIsExecuting(true);
    setExecutionError('');
    setFilterExpression('');
    setShowPrompt(false); // Hide prompt when generating

    try {
      console.log('🔍 [FilterPanel] Executing natural language query:', naturalQuery);
      console.log('   Using LLM configuration:', selectedLLM);
      const effectiveSampleData = sampleData || currentThread;
      console.log('   Sample data available:', !!effectiveSampleData);
      
      // Prepare request body with optional sample data
      const requestBody: any = {
        llmConfiguration: selectedLLM,
        query: naturalQuery
      };
      
      // Include sample data if available
      if (effectiveSampleData) {
        requestBody.sampleData = effectiveSampleData;
        console.log('   Including sample data');
        if (effectiveSampleData.thread_id) {
          console.log('   Sample thread ID:', effectiveSampleData.thread_id);
        } else if (effectiveSampleData.id) {
          console.log('   Sample conversation ID:', effectiveSampleData.id);
        }
      } else {
        console.log('   No sample data available - using schema-based approach');
      }
      
      // Call backend endpoint to convert natural language to filter
      const apiUrl = await storageUtils.getApiUrl();
      const response = await fetch(`${apiUrl}/api/llm/convert-to-filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to convert query');
      }

      const data = await response.json();
      
      if (data.success) {
        // Handle dual-script responses
        if (data.responseType === 'both' || data.responseType === 'filter' || data.responseType === 'render') {
          // New dual-script format
          let displayText = '';
          
          if (data.filterScript) {
            displayText += '// FILTER SCRIPT\n' + data.filterScript;
          }
          
          if (data.renderScript) {
            if (displayText) displayText += '\n\n';
            displayText += '// RENDER SCRIPT\n' + data.renderScript;
          }
          
          setFilterExpression(displayText);
          console.log(`✅ [FilterPanel] Generated ${data.responseType} script(s)`);
          if (data.filterScript) console.log('   • Filter script: ✓');
          if (data.renderScript) console.log('   • Render script: ✓');
          
          // In magic mode, log the generated scripts to console for debugging
          if (displayMode === 'magic') {
            console.log('🎩 [MAGIC MODE] Generated Scripts:');
            console.log('=====================================');
            if (data.filterScript) {
              console.log('📝 FILTER SCRIPT:');
              console.log(data.filterScript);
              console.log('-------------------------------------');
            }
            if (data.renderScript) {
              console.log('🎨 RENDER SCRIPT:');
              console.log(data.renderScript);
              console.log('-------------------------------------');
            }
            console.log('Query:', naturalQuery);
            console.log('LLM:', selectedLLM);
            console.log('=====================================');
          }
        } else if (data.rawResponse) {
          // Raw response fallback
          setFilterExpression(data.rawResponse);
          console.log('📄 [FilterPanel] Showing raw response');
          
          // In magic mode, log the raw response too
          if (displayMode === 'magic') {
            console.log('🎩 [MAGIC MODE] Raw Response:');
            console.log('=====================================');
            console.log(data.rawResponse);
            console.log('Query:', naturalQuery);
            console.log('LLM:', selectedLLM);
            console.log('=====================================');
          }
        } else {
          throw new Error('No filter expression generated');
        }
        
        // Store the actual scripts in state for applying later
        const generatedScripts = {
          filterScript: data.filterScript,
          renderScript: data.renderScript,
          responseType: data.responseType
        };
        setLastGeneratedScripts(generatedScripts);
        
        // Return the generated scripts for immediate use
        return generatedScripts;
      } else {
        throw new Error(data.error || 'Failed to generate filter');
      }
    } catch (error) {
      console.error('❌ [FilterPanel] Error executing natural language query:', error);
      setExecutionError(error instanceof Error ? error.message : 'An error occurred');
      return null;
    } finally {
      setIsExecuting(false);
    }
  };

  const applyGeneratedFilter = () => {
    if (!filterExpression) {
      console.warn('⚠️ [FilterPanel] No filter expression to apply');
      return;
    }

    console.log('📋 [FilterPanel] Applying generated filter/render scripts');
    console.log('   Expression length:', filterExpression.length);

    // Check if we have dual-script data
    if (lastGeneratedScripts && (lastGeneratedScripts.filterScript || lastGeneratedScripts.renderScript)) {
      console.log('🎯 [FilterPanel] Applying dual-script response');
      console.log('   Response type:', lastGeneratedScripts.responseType);
      
      try {
        const newFilters: FilterOptions = {
          ...filters,
          customJavaScriptFilter: lastGeneratedScripts.filterScript || filters.customJavaScriptFilter,
          customRenderScript: lastGeneratedScripts.renderScript || filters.customRenderScript,
          naturalLanguageQuery: naturalQuery,
          renderScriptTimestamp: lastGeneratedScripts.renderScript ? Date.now() : filters.renderScriptTimestamp
        };

        if (lastGeneratedScripts.filterScript) console.log('   • Applying filter script');
        if (lastGeneratedScripts.renderScript) console.log('   • Applying render script with new timestamp:', Date.now());
        
        onFiltersChange(newFilters);
        
        // Close the panel after applying
        onClose();
      } catch (error) {
        console.error('❌ [FilterPanel] Error applying dual scripts:', error);
        setExecutionError('Failed to apply scripts.');
      }
      return;
    }

    // If we get here without lastGeneratedScripts, it means the filter expression
    // might be raw JavaScript code (for backward compatibility)
    if (filterExpression.includes('function filterThreads') || filterExpression.includes('function processThreads')) {
      // Apply JavaScript filter
      try {
        console.log('🚀 [FilterPanel] Applying raw JavaScript filter');
        console.log('   Filter code:', filterExpression.substring(0, 200) + '...');
        
        // Create the filter object with the JavaScript code
        const newFilters: FilterOptions = {
          ...filters,
          customJavaScriptFilter: filterExpression,
          naturalLanguageQuery: naturalQuery
        };

        onFiltersChange(newFilters);
        onClose();
      } catch (error) {
        console.error('❌ [FilterPanel] Error applying JavaScript filter:', error);
        setExecutionError('Failed to apply JavaScript filter.');
      }
      return;
    }

    // If nothing matched, show an error
    setExecutionError('No valid filter or render script found. Please generate a filter first.');
  };

  const applyStaticFilters = () => {
    const newFilters: FilterOptions = {
      ...filters,
      dateRange: {
        start: dateRange.start ? new Date(dateRange.start) : null,
        end: dateRange.end ? new Date(dateRange.end) : null
      },
      modelFilter: selectedModels.length > 0 ? selectedModels : undefined,
      ratingFilter: {
        min: ratingRange.min,
        max: ratingRange.max,
        includeUnrated: ratingRange.includeUnrated
      }
    };
    
    onFiltersChange(newFilters);
    onClose();
  };

  const clearStaticFilters = () => {
    setDateRange({ start: '', end: '' });
    setSelectedModels([]);
    setRatingRange({ min: 1, max: 10, includeUnrated: true });
    
    const newFilters: FilterOptions = {
      ...filters,
      dateRange: undefined,
      modelFilter: undefined,
      ratingFilter: undefined
    };
    
    onFiltersChange(newFilters);
  };

  const hasActiveStaticFilters = () => {
    return filters.dateRange || filters.modelFilter || filters.ratingFilter;
  };

  // Get the conversation list width dynamically in magic mode
  const getMagicModeOverlayStyle = () => {
    if (displayMode === 'magic') {
      const resizablePanel = document.querySelector('.resizable-panel');
      if (resizablePanel) {
        const width = resizablePanel.getBoundingClientRect().width;
        return { width: `${width}px` };
      }
    }
    return {};
  };

  return (
    <div 
      className={`filter-panel-overlay ${displayMode === 'magic' ? 'magic-mode-overlay' : ''}`}
      style={getMagicModeOverlayStyle()}
      onClick={(e) => displayMode === 'engineering' ? handleOverlayClick(e, onClose) : undefined}
    >
      <div 
        ref={displayMode === 'engineering' ? modalRef : undefined}
        className={`filter-panel ${displayMode === 'engineering' && isResizing ? 'resizing' : ''} ${displayMode === 'magic' ? 'magic-mode-panel' : ''}`}
        style={{
          width: displayMode === 'magic' ? 'auto' : `${modalSize.width}px`,
          height: displayMode === 'magic' ? 'auto' : `${modalSize.height}px`,
          maxWidth: displayMode === 'magic' ? 'none' : '90vw',
          maxHeight: displayMode === 'magic' ? 'none' : '90vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Resize handles - only show in engineering mode */}
        {displayMode === 'engineering' && (
          <>
            <div className="resize-handle resize-handle-n" onMouseDown={(e) => handleResizeStart(e, 'top')} />
            <div className="resize-handle resize-handle-s" onMouseDown={(e) => handleResizeStart(e, 'bottom')} />
            <div className="resize-handle resize-handle-e" onMouseDown={(e) => handleResizeStart(e, 'right')} />
            <div className="resize-handle resize-handle-w" onMouseDown={(e) => handleResizeStart(e, 'left')} />
            <div className="resize-handle resize-handle-ne" onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
            <div className="resize-handle resize-handle-nw" onMouseDown={(e) => handleResizeStart(e, 'top-left')} />
            <div className="resize-handle resize-handle-se" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
            <div className="resize-handle resize-handle-sw" onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
          </>
        )}
        
        <div className="filter-panel-header">
          <h3>Filters</h3>
          {displayMode === 'magic' && filters.naturalLanguageQuery && (
            <span className="active-filter-badge-header">Active Natural Language Filter</span>
          )}
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeTab === 'static' ? 'active' : ''}`}
            onClick={() => setActiveTab('static')}
          >
            Static Filters
            {hasActiveStaticFilters() && <span className="filter-indicator" />}
          </button>
          <button 
            className={`filter-tab ${activeTab === 'natural' ? 'active' : ''}`}
            onClick={() => setActiveTab('natural')}
          >
            Natural Language
            {filters.naturalLanguageQuery && <span className="filter-indicator" />}
          </button>
        </div>

        <div className="filter-panel-content">
          {activeTab === 'static' ? (
            <div className="static-filters-section">
              {/* Date Range Filter */}
              <div className="filter-section">
                <div className="filter-section-header">
                  <Calendar size={16} />
                  <h4>Date Range</h4>
                  {filters.dateRange && (
                    <span className="active-filter-badge">Active</span>
                  )}
                </div>
                <div className="date-inputs">
                  <div className="input-group">
                    <label>From</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>To</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Model Filter */}
              <div className="filter-section">
                <div className="filter-section-header">
                  <Bot size={16} />
                  <h4>Model Filter</h4>
                  {filters.modelFilter && filters.modelFilter.length > 0 && (
                    <span className="active-filter-badge">Active ({filters.modelFilter.length})</span>
                  )}
                </div>
                <div className="model-checkboxes">
                  {availableModels.length > 0 ? (
                    availableModels.map(model => (
                      <label key={model} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedModels.includes(model)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModels([...selectedModels, model]);
                            } else {
                              setSelectedModels(selectedModels.filter(m => m !== model));
                            }
                          }}
                        />
                        {model}
                      </label>
                    ))
                  ) : (
                    <p className="no-models">No models found in conversations</p>
                  )}
                </div>
              </div>

              {/* Rating Filter */}
              <div className="filter-section">
                <div className="filter-section-header">
                  <Star size={16} />
                  <h4>Rating Filter</h4>
                  {filters.ratingFilter && (
                    <span className="active-filter-badge">Active</span>
                  )}
                </div>
                <div className="rating-range">
                  <div className="input-group">
                    <label>Min Rating:</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={ratingRange.min}
                      onChange={(e) => setRatingRange({ ...ratingRange, min: parseInt(e.target.value) })}
                    />
                    <span className="rating-value">{ratingRange.min}</span>
                  </div>
                  <div className="input-group">
                    <label>Max Rating:</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={ratingRange.max}
                      onChange={(e) => setRatingRange({ ...ratingRange, max: parseInt(e.target.value) })}
                    />
                    <span className="rating-value">{ratingRange.max}</span>
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={ratingRange.includeUnrated}
                      onChange={(e) => setRatingRange({ ...ratingRange, includeUnrated: e.target.checked })}
                    />
                    Include unrated conversations
                  </label>
                </div>
              </div>

              {/* Static Filter Actions */}
              <div className="filter-actions">
                <button className="reset-btn" onClick={clearStaticFilters}>
                  Clear All
                </button>
                <button className="apply-btn" onClick={applyStaticFilters}>
                  Apply Filters
                </button>
              </div>
            </div>
          ) : (
            <div className={`natural-language-section ${displayMode === 'magic' ? 'magic-mode' : ''}`}>
              <div className="filter-section natural-language-content">
                <div className="filter-section-header">
                  <MessageSquare size={16} />
                  <h4>Natural Language Query</h4>
                  {filters.naturalLanguageQuery && displayMode !== 'magic' && (
                    <span className="active-filter-badge">Active Natural Language Filter</span>
                  )}
                  <div className="llm-selector-header">
                    <label>Model:</label>
                    <select
                      value={selectedLLM}
                      onChange={(e) => setSelectedLLM(e.target.value)}
                      disabled={!Array.isArray(llmConfigurations) || llmConfigurations.length === 0}
                    >
                      {!Array.isArray(llmConfigurations) || llmConfigurations.length === 0 ? (
                        <option value="">No LLM configurations available</option>
                      ) : (
                        llmConfigurations.map(config => (
                          <option key={config.name} value={config.name}>
                            {config.name} ({config.provider} - {config.model})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  {displayMode === 'magic' && (
                    <div className="history-controls">
                      <button
                        onClick={navigateHistoryUp}
                        disabled={queryHistory.length === 0 || historyIndex >= queryHistory.length - 1}
                        title="Previous query (⌥↑)"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={navigateHistoryDown}
                        disabled={historyIndex < 0}
                        title="Next query (⌥↓)"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        className="clear-history-btn"
                        onClick={clearHistory}
                        disabled={queryHistory.length === 0}
                        title="Clear history"
                      >
                        C
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="natural-query-input">
                  <textarea
                    placeholder={dataSource === 'agent' 
                      ? "Describe what you want to filter in natural language...&#10;&#10;Examples for LangGraph data:&#10;• Show me threads with more than 10 messages&#10;• Find conversations where the user mentioned 'error' or 'bug'&#10;• Get threads created in the last 7 days with retrieved documents&#10;• Show threads where the assistant provided code examples"
                      : "Describe what you want to filter in natural language...&#10;&#10;Examples:&#10;• Show me conversations from last week with ratings above 7&#10;• Find all Claude 3 conversations that are unrated&#10;• Get Q&A pairs with negative sentiment from yesterday"}
                    value={naturalQuery}
                    onChange={(e) => setNaturalQuery(e.target.value)}
                    rows={3}
                  />
                </div>

                {executionError && (
                  <div className="execution-error">
                    <p>{executionError}</p>
                  </div>
                )}

                {displayMode === 'engineering' && (
                  naturalQuery.trim() && showPrompt ? (
                    <div className="filter-expression">
                      <div className="expression-header">
                        <h5>Prompt Preview</h5>
                        <button
                          className="copy-btn"
                          onClick={() => handleCopy(fetchedPrompt, 'prompt')}
                          title="Copy prompt"
                        >
                          <Copy size={14} />
                          {copiedItem === 'prompt' && <span className="copied-text">Copied!</span>}
                        </button>
                      </div>
                      <pre>{fetchedPrompt}</pre>
                    </div>
                  ) : (
                    <>
                      {filterExpression && (
                        <div className="filter-expression">
                          <div className="expression-header">
                            <h5>Generated Filter Expression:</h5>
                            <button
                              className="copy-btn"
                              onClick={() => handleCopy(filterExpression, 'filter')}
                              title="Copy filter expression"
                            >
                              <Copy size={14} />
                              {copiedItem === 'filter' && <span className="copied-text">Copied!</span>}
                            </button>
                          </div>
                          <pre>{filterExpression}</pre>
                        </div>
                      )}
                      
                      {!filterExpression && filters.customJavaScriptFilter && (
                        <div className="filter-expression">
                          <div className="expression-header">
                            <h5>Active JavaScript Filter:</h5>
                            <button
                              className="copy-btn"
                              onClick={() => handleCopy(filters.customJavaScriptFilter || '', 'filter')}
                              title="Copy active filter"
                            >
                              <Copy size={14} />
                              {copiedItem === 'filter' && <span className="copied-text">Copied!</span>}
                            </button>
                          </div>
                          <pre>{filters.customJavaScriptFilter}</pre>
                          <p className="filter-info">
                            This filter is currently active. Generate a new filter to replace it, or use the Clear button to remove it.
                          </p>
                        </div>
                      )}
                    </>
                  )
                )}
              </div>
              
              <div className="natural-language-actions">
                <div className="actions-left">
                  {displayMode === 'engineering' ? (
                    // Engineering mode: Show all buttons
                    <>
                      <button
                        className="generate-btn"
                        onClick={executeNaturalLanguageQuery}
                        disabled={!naturalQuery.trim() || !selectedLLM || isExecuting}
                        title={!naturalQuery.trim() ? "Enter a query" : !selectedLLM ? "Select a model" : "Generate filter"}
                      >
                        {isExecuting ? (
                          <>
                            <div className="button-spinner" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>Generate</span>
                          </>
                        )}
                      </button>
                      
                      <button 
                        className="toggle-prompt-btn-action"
                        onClick={() => {
                          if (showPrompt) {
                            setShowPrompt(false);
                            setFetchedPrompt('');
                          } else {
                            fetchPromptFromServer();
                          }
                        }}
                        disabled={!naturalQuery.trim() || !selectedLLM || isFetchingPrompt}
                        title={!naturalQuery.trim() ? "Enter a query to see prompt" : !selectedLLM ? "Select a model first" : isFetchingPrompt ? "Fetching prompt..." : showPrompt ? "Hide prompt preview" : "Show prompt preview"}
                      >
                        {isFetchingPrompt ? (
                          <>
                            <div className="button-spinner" />
                            <span>Loading...</span>
                          </>
                        ) : (
                          showPrompt ? 'Hide' : 'Show'
                        )} Prompt
                      </button>
                      
                      <button
                        className="apply-filter-btn"
                        onClick={applyGeneratedFilter}
                        disabled={!filterExpression || showPrompt}
                        title={showPrompt ? "Hide prompt to apply filter" : !filterExpression ? "Generate a filter first" : "Apply the generated filter"}
                      >
                        Apply Filter
                      </button>
                    </>
                  ) : (
                    // Magic mode: Only show Execute button
                    <button
                      className="generate-btn"
                      onClick={async () => {
                        // Always generate new scripts in magic mode
                        const generatedScripts = await executeNaturalLanguageQuery();
                        
                        if (generatedScripts && (generatedScripts.filterScript || generatedScripts.renderScript)) {
                          // Apply the newly generated scripts immediately
                          const newFilters: FilterOptions = {
                            ...filters,
                            customJavaScriptFilter: generatedScripts.filterScript || undefined,
                            customRenderScript: generatedScripts.renderScript || undefined,
                            naturalLanguageQuery: naturalQuery,
                            renderScriptTimestamp: generatedScripts.renderScript ? Date.now() : undefined
                          };
                          
                          onFiltersChange(newFilters);
                          onClose();
                          
                          // Show console hint
                          const tempMsg = document.createElement('div');
                          tempMsg.className = 'magic-mode-console-hint';
                          tempMsg.textContent = '💡 Generated script logged to browser console (F12)';
                          document.body.appendChild(tempMsg);
                          setTimeout(() => tempMsg.remove(), 4000);
                        }
                      }}
                      disabled={!naturalQuery.trim() || !selectedLLM || isExecuting}
                      title={!naturalQuery.trim() ? "Enter a query" : !selectedLLM ? "Select a model first" : "Execute filter"}
                    >
                      {isExecuting ? (
                        <>
                          <div className="button-spinner" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>Execute</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                <div className="actions-right">
                  <button 
                    className="clear-btn" 
                    onClick={() => {
                      setNaturalQuery('');
                      setFilterExpression('');
                      setExecutionError('');
                      setShowPrompt(false);
                      setFetchedPrompt('');
                      setLastGeneratedScripts(null);
                      // Clear active natural language filter, filter script, and render script
                      if (filters.naturalLanguageQuery || filters.customJavaScriptFilter || filters.customRenderScript) {
                        onFiltersChange({
                          ...filters,
                          customJavaScriptFilter: undefined,
                          customRenderScript: undefined,
                          naturalLanguageQuery: undefined,
                          renderScriptTimestamp: undefined
                        });
                      }
                    }}
                    title="Clear all inputs and active filters"
                  >
                    Clear
                  </button>
                  
                  <button 
                    className="close-btn-action" 
                    onClick={onClose}
                    title="Close filter panel"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}