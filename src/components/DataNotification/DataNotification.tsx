import { useState } from 'react';
import { useFeedbackStore } from '../../store/feedbackStore';
import { Info, AlertCircle, X } from 'lucide-react';
import './DataNotification.css';

export function DataNotification() {
  const { dataFormat, dataWarnings, conversations } = useFeedbackStore();
  const [dismissedFormat, setDismissedFormat] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState(false);
  
  if (!dataFormat && conversations.length === 0) {
    return null;
  }
  
  const formatInfo = {
    feedback: {
      title: 'Feedback Export Format',
      description: 'Data includes user ratings and feedback on conversations.',
      icon: Info,
      className: 'info'
    },
    chat: {
      title: 'Chat Export Format',
      description: 'Chat conversations imported without ratings. Analytics based on ratings will not be available.',
      icon: AlertCircle,
      className: 'warning'
    }
  };
  
  const info = dataFormat ? formatInfo[dataFormat as keyof typeof formatInfo] : null;
  
  if (!info && dataWarnings.length === 0) {
    return null;
  }
  
  // Hide notifications if both are dismissed
  if ((dismissedFormat || !info) && (dismissedWarnings || dataWarnings.length === 0)) {
    return null;
  }
  
  return (
    <div className="data-notification">
      {info && !dismissedFormat && (
        <div className={`notification-item ${info.className}`}>
          <info.icon size={16} />
          <div className="notification-content">
            <div className="notification-title">{info.title}</div>
            <div className="notification-description">{info.description}</div>
          </div>
          <button
            className="notification-close"
            onClick={() => setDismissedFormat(true)}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      {dataWarnings.length > 0 && !dismissedWarnings && (
        <div className="notification-item warning">
          <AlertCircle size={16} />
          <div className="notification-content">
            <div className="notification-title">Data Import Warnings</div>
            <ul className="warning-list">
              {dataWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
          <button
            className="notification-close"
            onClick={() => setDismissedWarnings(true)}
            aria-label="Close warnings"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}