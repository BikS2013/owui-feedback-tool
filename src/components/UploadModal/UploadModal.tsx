import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Upload, Database } from 'lucide-react';
import { useFeedbackStore } from '../../store/feedbackStore';
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

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'agent'>('file');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadFromFile, loadFromAgentThreads } = useFeedbackStore();

  useEffect(() => {
    if (isOpen && activeTab === 'agent') {
      fetchAgents();
    }
  }, [isOpen, activeTab]);

  const fetchAgents = async () => {
    setIsLoadingAgents(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/agent`);
      
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
    if (!selectedAgent) {
      setError('Please select an agent');
      return;
    }

    setIsLoadingThreads(true);
    setError(null);

    try {
      await loadFromAgentThreads(selectedAgent);
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-wrapper">
        <div className="upload-modal modal-content" onClick={(e) => e.stopPropagation()}>
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