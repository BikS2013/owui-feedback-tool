import React, { useRef } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { useFeedbackStore } from '../../store/feedbackStore';
import './DataControls.css';

export function DataControls() {
  const { clearData, loadFromFile } = useFeedbackStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This will remove all conversations.')) {
      clearData();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.json')) {
        alert('Please upload a JSON file');
        return;
      }


      try {
        await loadFromFile(file);
      } catch (error) {
        console.error('Error loading file:', error);
      }

      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      <button
        className="data-control-button upload"
        onClick={handleUploadClick}
        title="Upload new JSON file"
      >
        <Upload size={16} />
      </button>

      <button
        className="data-control-button clear"
        onClick={handleClearData}
        title="Clear all data"
      >
        <Trash2 size={16} />
      </button>
    </>
  );
}