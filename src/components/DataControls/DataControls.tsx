import { useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { useFeedbackStore } from '../../store/feedbackStore';
import { UploadModal } from '../UploadModal/UploadModal';
import './DataControls.css';

export function DataControls() {
  const { clearData } = useFeedbackStore();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This will remove all conversations.')) {
      clearData();
    }
  };

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  return (
    <>
      <button
        className="data-control-button upload"
        onClick={handleUploadClick}
        title="Upload data"
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

      <UploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </>
  );
}