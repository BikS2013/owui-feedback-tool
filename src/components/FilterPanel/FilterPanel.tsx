import { useState, useEffect, useRef } from 'react';
import { Calendar, Sliders, X, Bot, MessageSquare, Sparkles, Copy } from 'lucide-react';
import { FilterOptions } from '../../types/conversation';
import { useFeedbackStore } from '../../store/feedbackStore';
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
  availableModels: string[];
  currentThread?: any; // Current selected thread for sample data
}

type TabType = 'manual' | 'natural';

const STORAGE_KEY = 'filterPanelSize';
const LLM_STORAGE_KEY = 'filterPanelSelectedLLM';
const MIN_WIDTH = 400;
const MIN_HEIGHT = 500;
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 600;

export function FilterPanel({ filters, onFiltersChange, isOpen, onClose, availableModels, currentThread }: FilterPanelProps) {
  const { dataSource } = useFeedbackStore();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Start with natural tab if we have an active natural language filter
    return filters.naturalLanguageQuery ? 'natural' : 'manual';
  });
  const [naturalQuery, setNaturalQuery] = useState(filters.naturalLanguageQuery || '');
  const [selectedLLM, setSelectedLLM] = useState<string>(() => {
    // Try to restore from localStorage
    return localStorage.getItem(LLM_STORAGE_KEY) || '';
  });
  const [llmConfigurations, setLlmConfigurations] = useState<LLMConfiguration[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [filterExpression, setFilterExpression] = useState<string>(filters.customJavaScriptFilter || '');
  const [executionError, setExecutionError] = useState<string>('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [copiedItem, setCopiedItem] = useState<'prompt' | 'filter' | null>(null);
  const [fetchedPrompt, setFetchedPrompt] = useState<string>('');
  const [isFetchingPrompt, setIsFetchingPrompt] = useState(false);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          width: Math.max(parsed.width || DEFAULT_WIDTH, MIN_WIDTH),
          height: Math.max(parsed.height || DEFAULT_HEIGHT, MIN_HEIGHT)
        };
      } catch {
        // Invalid data, use defaults
      }
    }
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  });
  const [isResizing, setIsResizing] = useState<'se' | 'e' | 's' | null>(null);
  const startSizeRef = useRef(size);
  const startPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Load LLM configurations from backend when panel opens
    if (isOpen) {
      fetchLLMConfigurations();
      // If there's an active JavaScript filter, show it
      if (filters.customJavaScriptFilter) {
        setFilterExpression(filters.customJavaScriptFilter);
      }
    }
  }, [isOpen, filters.customJavaScriptFilter]);

  // Save size to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
  }, [size]);

  // Save selected LLM to localStorage when it changes
  useEffect(() => {
    if (selectedLLM) {
      localStorage.setItem(LLM_STORAGE_KEY, selectedLLM);
    }
  }, [selectedLLM]);

  // Handle mouse move for resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      
      let newWidth = startSizeRef.current.width;
      let newHeight = startSizeRef.current.height;
      
      if (isResizing === 'e' || isResizing === 'se') {
        newWidth = Math.max(MIN_WIDTH, startSizeRef.current.width + deltaX);
      }
      
      if (isResizing === 's' || isResizing === 'se') {
        newHeight = Math.max(MIN_HEIGHT, startSizeRef.current.height + deltaY);
      }
      
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent, direction: 'se' | 'e' | 's') => {
    e.preventDefault();
    setIsResizing(direction);
    startSizeRef.current = size;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    
    // Set cursor style
    if (direction === 'se') {
      document.body.style.cursor = 'nwse-resize';
    } else if (direction === 'e') {
      document.body.style.cursor = 'ew-resize';
    } else if (direction === 's') {
      document.body.style.cursor = 'ns-resize';
    }
  };

  const fetchLLMConfigurations = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/llm/configurations`);
      
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
      modelFilter: [],
      customJavaScriptFilter: undefined,
      naturalLanguageQuery: undefined
    });
  };

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
      
      const requestBody: any = {
        llmConfiguration: selectedLLM,
        query: naturalQuery
      };
      
      if (currentThread) {
        requestBody.sampleData = currentThread;
      }
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/llm/get-prompt`, {
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
      // Fall back to local generation if server fails
      setFetchedPrompt(generatePrompt(naturalQuery));
      setShowPrompt(true);
    } finally {
      setIsFetchingPrompt(false);
    }
  };

  const generatePrompt = (query: string) => {
    // If we have sample data (current thread), use it in the prompt
    if (currentThread) {
      return `You are a JavaScript code generator for filtering LangGraph conversation data. Generate a safe, executable JavaScript function that filters data based on the user's natural language query.

IMPORTANT: The complete dataset is an array of objects similar to the sample provided below. Study the structure carefully to understand the data format.

SAMPLE DATA (one object from the array):
${JSON.stringify(currentThread, null, 2)}

DATASET STRUCTURE:
The complete dataset is an array of similar objects. Each object represents a conversation thread with:
- thread_id: unique identifier
- created_at/updated_at: timestamps
- values.messages: array of conversation messages
- values.retrieved_docs: array of retrieved documents (if any)
- Other fields as shown in the sample

Natural Language Query: "${query}"

Generate a JavaScript function that:
1. Accepts an array called 'threads' containing objects like the sample above
2. Returns a filtered array based on the query
3. Handles edge cases (null values, missing fields)
4. Is optimized for performance

The function should follow this template:
function filterThreads(threads) {
  // Your filtering logic here
  return threads.filter(thread => {
    // Conditions based on user query
  });
}

IMPORTANT RULES:
- Return ONLY executable JavaScript code, no explanations
- Use only safe JavaScript features (no eval, fetch, or DOM manipulation)
- Include helpful comments explaining the logic
- The code will be executed client-side in a sandboxed environment`;
    }
    
    // Fallback to schema-based prompt
    const dataSchema = {
      description: "Conversation and feedback data structure",
      conversation: {
        id: "string",
        title: "string",
        createdAt: "timestamp (milliseconds)",
        updatedAt: "timestamp (milliseconds)",
        userId: "string",
        messages: [{
          role: "user | assistant",
          content: "string",
          timestamp: "timestamp",
          model: "string (optional)",
          modelName: "string (optional)"
        }],
        averageRating: "number (1-10) | null",
        totalRatings: "number",
        qaPairCount: "number",
        modelsUsed: "string[]"
      },
      qaPair: {
        id: "string",
        conversationId: "string",
        question: "message object",
        answer: "message object",
        rating: "number (1-10) | null",
        sentiment: "1 | -1 | null",
        comment: "string"
      }
    };

    return `You are a filter expression generator. Convert the following natural language query into a JSON filter expression that can be used to filter conversations and Q&A pairs.

Data Schema:
${JSON.stringify(dataSchema, null, 2)}

Natural Language Query: "${query}"

Generate a JSON filter expression that can be applied to filter the data. The expression should follow this structure:
{
  "dateRange": {
    "start": null or ISO date string,
    "end": null or ISO date string
  },
  "ratingFilter": {
    "min": number (1-10),
    "max": number (1-10),
    "includeUnrated": boolean
  },
  "filterLevel": "conversation" or "qa",
  "modelFilter": array of model names to include (empty array means all),
  "customConditions": {
    // Optional: Additional conditions that can't be expressed in standard filters
    "description": "Human readable description of custom conditions",
    "conditions": []
  }
}

Important:
- Return ONLY valid JSON, no explanations
- Use null for unspecified date ranges
- Default to includeUnrated: true unless explicitly mentioned
- Default to filterLevel: "conversation" unless Q&A or answer-specific filtering is mentioned
- For model filtering, match against modelsUsed array in conversations
- If the query mentions specific time periods (like "last week", "yesterday"), calculate the appropriate dates
- Today's date is: ${new Date().toISOString().split('T')[0]}

Example queries and their filters:
- "Show me conversations from last week": dateRange with calculated start/end
- "Only highly rated conversations": ratingFilter with min: 7, max: 10
- "Claude 3 conversations": modelFilter: ["claude-3", "claude-3-opus", "claude-3-sonnet"]
- "Unrated Q&A pairs": filterLevel: "qa", includeUnrated: true, ratingFilter max: 0

Generate the filter expression:`;
  };

  const executeNaturalLanguageQuery = async () => {
    if (!naturalQuery.trim() || !selectedLLM) return;

    setIsExecuting(true);
    setExecutionError('');
    setFilterExpression('');
    setShowPrompt(false); // Hide prompt when generating

    try {
      console.log('🔍 [FilterPanel] Executing natural language query:', naturalQuery);
      console.log('   Using LLM configuration:', selectedLLM);
      console.log('   Sample data available:', !!currentThread);
      
      // Prepare request body with optional sample data
      const requestBody: any = {
        llmConfiguration: selectedLLM,
        query: naturalQuery
      };
      
      // Include current thread as sample data if available
      if (currentThread) {
        requestBody.sampleData = currentThread;
        console.log('   Including sample data from current thread');
      }
      
      // Call backend endpoint to convert natural language to filter
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/llm/convert-to-filter`, {
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
        if (data.responseType === 'javascript' && data.filterCode) {
          // JavaScript code response
          setFilterExpression(data.filterCode);
          console.log('✅ [FilterPanel] Generated JavaScript filter code');
        } else if (data.filterExpression) {
          // JSON filter response
          setFilterExpression(JSON.stringify(data.filterExpression, null, 2));
          console.log('✅ [FilterPanel] Generated JSON filter expression:', data.filterExpression);
        } else if (data.rawResponse) {
          // Raw response fallback
          setFilterExpression(data.rawResponse);
          console.log('📄 [FilterPanel] Showing raw response');
        } else {
          throw new Error('No filter expression generated');
        }
      } else {
        throw new Error(data.error || 'Failed to generate filter');
      }
    } catch (error) {
      console.error('❌ [FilterPanel] Error executing natural language query:', error);
      setExecutionError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  const applyGeneratedFilter = () => {
    if (!filterExpression) {
      console.warn('⚠️ [FilterPanel] No filter expression to apply');
      return;
    }

    console.log('📋 [FilterPanel] Applying generated filter:');
    console.log('   Expression length:', filterExpression.length);
    console.log('   Is JavaScript:', filterExpression.includes('function filterThreads') || filterExpression.includes('function processThreads'));

    // Check if it's JavaScript code
    if (filterExpression.includes('function filterThreads') || filterExpression.includes('function processThreads')) {
      // Apply JavaScript filter
      try {
        console.log('🚀 [FilterPanel] Applying JavaScript filter to data');
        console.log('   Filter code:', filterExpression.substring(0, 200) + '...');
        
        // Create the filter object with the JavaScript code
        const newFilters: FilterOptions = {
          ...filters,
          customJavaScriptFilter: filterExpression,
          naturalLanguageQuery: naturalQuery
        };

        console.log('   New filters object:', { ...newFilters, customJavaScriptFilter: newFilters.customJavaScriptFilter?.substring(0, 50) + '...' });
        onFiltersChange(newFilters);
        
        // Close the panel after applying
        onClose();
      } catch (error) {
        console.error('❌ [FilterPanel] Error applying JavaScript filter:', error);
        setExecutionError('Failed to apply JavaScript filter.');
      }
      return;
    }

    try {
      const generatedFilter = JSON.parse(filterExpression);
      
      // Apply the standard filters
      const newFilters: FilterOptions = {
        ...filters,
        dateRange: {
          start: generatedFilter.dateRange?.start ? new Date(generatedFilter.dateRange.start) : null,
          end: generatedFilter.dateRange?.end ? new Date(generatedFilter.dateRange.end) : null
        },
        ratingFilter: {
          min: generatedFilter.ratingFilter?.min ?? 1,
          max: generatedFilter.ratingFilter?.max ?? 10,
          includeUnrated: generatedFilter.ratingFilter?.includeUnrated ?? true
        },
        filterLevel: generatedFilter.filterLevel || 'conversation',
        modelFilter: generatedFilter.modelFilter || [],
        // Clear any previous JavaScript filter when applying JSON filter
        customJavaScriptFilter: undefined,
        naturalLanguageQuery: undefined
      };

      onFiltersChange(newFilters);
      
      // Store custom conditions if any (for future use)
      if (generatedFilter.customConditions) {
        console.log('📌 [FilterPanel] Custom conditions:', generatedFilter.customConditions);
        // TODO: Implement custom condition handling
      }

      // Close the panel after applying
      onClose();
    } catch (error) {
      console.error('❌ [FilterPanel] Error applying filter:', error);
      setExecutionError('Failed to apply filter. Please check the JSON format.');
    }
  };

  return (
    <div className="filter-panel-overlay" onClick={onClose}>
      <div 
        ref={panelRef}
        className={`filter-panel ${isResizing ? 'resizing' : ''}`} 
        onClick={e => e.stopPropagation()}
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}
      >
        {/* Resize handles */}
        <div 
          className="resize-handle resize-handle-e" 
          onMouseDown={(e) => handleResizeStart(e, 'e')}
        />
        <div 
          className="resize-handle resize-handle-s" 
          onMouseDown={(e) => handleResizeStart(e, 's')}
        />
        <div 
          className="resize-handle resize-handle-se" 
          onMouseDown={(e) => handleResizeStart(e, 'se')}
        />
        
        <div className="filter-panel-header">
          <h3>Filters</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <Sliders size={16} />
            <span>Manual Filters</span>
          </button>
          <button
            className={`filter-tab ${activeTab === 'natural' ? 'active' : ''}`}
            onClick={() => setActiveTab('natural')}
          >
            <MessageSquare size={16} />
            <span>Natural Language</span>
          </button>
        </div>

        <div className="filter-panel-content">
          {activeTab === 'manual' ? (
            <>
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
          </>
        ) : (
          <>
            <div className="natural-language-section">
              <div className="filter-section natural-language-content">
                <div className="filter-section-header">
                  <MessageSquare size={16} />
                  <h4>Natural Language Query</h4>
                  {filters.naturalLanguageQuery && (
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

                {naturalQuery.trim() && showPrompt ? (
                  <div className="filter-expression">
                    <div className="expression-header">
                      <h5>Prompt Preview</h5>
                      <button
                        className="copy-btn"
                        onClick={() => handleCopy(fetchedPrompt || generatePrompt(naturalQuery), 'prompt')}
                        title="Copy prompt"
                      >
                        <Copy size={14} />
                        {copiedItem === 'prompt' && <span className="copied-text">Copied!</span>}
                      </button>
                    </div>
                    <pre>{fetchedPrompt || generatePrompt(naturalQuery)}</pre>
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
                            onClick={() => handleCopy(filters.customJavaScriptFilter, 'filter')}
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
                )}
              </div>
              
              <div className="natural-language-actions">
                <div className="actions-left">
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
                      // Clear active natural language filter
                      if (filters.naturalLanguageQuery) {
                        onFiltersChange({
                          ...filters,
                          customJavaScriptFilter: undefined,
                          naturalLanguageQuery: undefined
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
          </>
        )}
        </div>
      </div>
    </div>
  );
}