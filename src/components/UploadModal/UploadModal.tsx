import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Upload, Database } from 'lucide-react';
import { useFeedbackStore } from '../../store/feedbackStore';
import { useResizable } from '../../hooks/useResizable';
import './UploadModal.css';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Agent {
  name: string;
  url: string;
  database_connection_string: string;
}

const UPLOAD_MODAL_STORAGE_KEY = 'uploadModalCriteria';

interface SavedCriteria {
  activeTab: 'file' | 'agent';
  selectedAgent: string;
  fromDate: string;
  toDate: string;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  // Load saved criteria from localStorage
  const loadSavedCriteria = (): SavedCriteria => {
    try {
      const saved = localStorage.getItem(UPLOAD_MODAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading saved upload criteria:', error);
    }
    return {
      activeTab: 'file',
      selectedAgent: '',
      fromDate: '',
      toDate: ''
    };
  };

  const savedCriteria = loadSavedCriteria();
  
  const [activeTab, setActiveTab] = useState<'file' | 'agent'>(savedCriteria.activeTab);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>(savedCriteria.selectedAgent);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>(savedCriteria.fromDate);
  const [toDate, setToDate] = useState<string>(savedCriteria.toDate);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadFromFile, loadFromAgentThreads } = useFeedbackStore();
  
  // Use resizable hook
  const {
    modalRef,
    modalSize,
    isResizing,
    handleResizeStart,
    handleOverlayClick
  } = useResizable({
    defaultWidth: 600,
    defaultHeight: 500,
    minWidth: 400,
    minHeight: 400,
    storageKey: 'uploadModalSize'
  });

  // Save criteria to localStorage whenever they change
  const saveCriteria = () => {
    const criteria: SavedCriteria = {
      activeTab,
      selectedAgent,
      fromDate,
      toDate
    };
    try {
      localStorage.setItem(UPLOAD_MODAL_STORAGE_KEY, JSON.stringify(criteria));
    } catch (error) {
      console.error('Error saving upload criteria:', error);
    }
  };

  // Save criteria whenever they change
  useEffect(() => {
    saveCriteria();
  }, [activeTab, selectedAgent, fromDate, toDate]);

  useEffect(() => {
    if (isOpen && activeTab === 'agent') {
      fetchAgents();
    }
  }, [isOpen, activeTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const fetchAgents = async () => {
    console.log('🔍 Fetching agents list...');
    setIsLoadingAgents(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const url = `${apiUrl}/agent`;
      console.log('📡 Fetching from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      
      const data = await response.json();
      if (data.success && data.agents) {
        setAgents(data.agents);
        if (data.agents.length > 0 && !selectedAgent) {
          setSelectedAgent(data.agents[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setError('Failed to load agents. Please check your connection.');
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.json')) {
        setError('Please upload a JSON file');
        return;
      }

      try {
        await loadFromFile(file);
        onClose();
      } catch (error) {
        console.error('Error loading file:', error);
        setError('Failed to load file. Please check the file format.');
      }

      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadAgentThreads = async () => {
    console.log('🎯 Load Threads button clicked!', { selectedAgent, fromDate, toDate });
    
    if (!selectedAgent) {
      setError('Please select an agent');
      return;
    }

    // Validate date range
    let fromDateTime: Date | undefined;
    let toDateTime: Date | undefined;
    
    if (fromDate) {
      // Set to start of day for fromDate
      fromDateTime = new Date(fromDate);
      fromDateTime.setHours(0, 0, 0, 0);
    }
    
    if (toDate) {
      // Set to end of day for toDate
      toDateTime = new Date(toDate);
      toDateTime.setHours(23, 59, 59, 999);
    }
    
    if (fromDateTime && toDateTime && fromDateTime > toDateTime) {
      setError('From date must be before To date');
      return;
    }

    setIsLoadingThreads(true);
    setError(null);

    try {
      console.log('📤 Calling loadFromAgentThreads with:', selectedAgent, fromDateTime, toDateTime);
      await loadFromAgentThreads(selectedAgent, 1, fromDateTime, toDateTime);
      onClose();
    } catch (error) {
      console.error('Error loading agent threads:', error);
      setError('Failed to load agent threads. Please try again.');
    } finally {
      setIsLoadingThreads(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={(e) => handleOverlayClick(e, onClose)}>
      <div className="modal-wrapper">
        <div 
          ref={modalRef}
          className={`upload-modal modal-content resizable ${isResizing ? 'resizing' : ''}`} 
          onClick={(e) => e.stopPropagation()}
          style={{
            width: `${modalSize.width}px`,
            height: `${modalSize.height}px`,
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}
        >
          {/* Resize handles */}
          <div className="resize-handle resize-handle-n" onMouseDown={(e) => handleResizeStart(e, 'top')} />
          <div className="resize-handle resize-handle-s" onMouseDown={(e) => handleResizeStart(e, 'bottom')} />
          <div className="resize-handle resize-handle-e" onMouseDown={(e) => handleResizeStart(e, 'right')} />
          <div className="resize-handle resize-handle-w" onMouseDown={(e) => handleResizeStart(e, 'left')} />
          <div className="resize-handle resize-handle-ne" onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
          <div className="resize-handle resize-handle-nw" onMouseDown={(e) => handleResizeStart(e, 'top-left')} />
          <div className="resize-handle resize-handle-se" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
          <div className="resize-handle resize-handle-sw" onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
          
        <div className="modal-header">
          <h2>Load Data</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => setActiveTab('file')}
          >
            <Upload size={16} />
            Upload File
          </button>
          <button
            className={`modal-tab ${activeTab === 'agent' ? 'active' : ''}`}
            onClick={() => setActiveTab('agent')}
          >
            <Database size={16} />
            Agent Threads
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {activeTab === 'file' ? (
            <div className="upload-file-section">
              <p className="upload-description">
                Upload a JSON file containing conversation data
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                className="upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={20} />
                Choose File
              </button>
            </div>
          ) : (
            <div className="agent-section">
              <p className="upload-description">
                Select an agent to load threads from their database
              </p>
              
              {isLoadingAgents ? (
                <div className="loading-state">Loading agents...</div>
              ) : agents.length > 0 ? (
                <>
                  <div className="agent-select-container">
                    <label htmlFor="agent-select">Select Agent:</label>
                    <select
                      id="agent-select"
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="agent-select"
                    >
                      {agents.map((agent) => (
                        <option key={agent.name} value={agent.name}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="date-filter-container">
                    <div className="date-input-group">
                      <label htmlFor="from-date">From Date (Optional):</label>
                      <input
                        id="from-date"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="date-input"
                      />
                    </div>
                    
                    <div className="date-input-group">
                      <label htmlFor="to-date">To Date (Optional):</label>
                      <input
                        id="to-date"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="date-input"
                      />
                    </div>
                  </div>
                  
                  <button
                    className="load-threads-button"
                    onClick={handleLoadAgentThreads}
                    disabled={!selectedAgent || isLoadingThreads}
                  >
                    {isLoadingThreads ? 'Loading...' : 'Load Threads'}
                  </button>
                </>
              ) : (
                <div className="no-agents-message">
                  No agents available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}