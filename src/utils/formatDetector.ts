export type DataFormat = 'feedback' | 'chat' | 'unknown';

export interface FormatDetectionResult {
  format: DataFormat;
  confidence: number;
  details: string;
}

export function detectDataFormat(data: any): FormatDetectionResult {
  if (!data || !Array.isArray(data)) {
    return {
      format: 'unknown',
      confidence: 1,
      details: 'Data is not an array or is empty'
    };
  }

  if (data.length === 0) {
    return {
      format: 'unknown',
      confidence: 1,
      details: 'Data array is empty'
    };
  }

  const firstEntry = data[0];
  
  // Check for Feedback Export Format
  const hasFeedbackFields = 
    firstEntry.version !== undefined && 
    firstEntry.type !== undefined && 
    firstEntry.data !== undefined && 
    firstEntry.meta !== undefined && 
    firstEntry.snapshot !== undefined;
  
  if (hasFeedbackFields) {
    // Validate more entries to increase confidence
    const validFeedbackEntries = data.slice(0, Math.min(5, data.length))
      .filter(entry => 
        entry.version !== undefined &&
        entry.type === 'rating' &&
        entry.data?.rating !== undefined &&
        entry.snapshot?.chat !== undefined
      );
    
    const confidence = validFeedbackEntries.length / Math.min(5, data.length);
    
    return {
      format: 'feedback',
      confidence,
      details: `Detected feedback export format with ${Math.round(confidence * 100)}% confidence`
    };
  }
  
  // Check for Chat Export Format
  const hasChatFields = 
    firstEntry.chat !== undefined && 
    firstEntry.title !== undefined &&
    firstEntry.user_id !== undefined &&
    firstEntry.version === undefined &&
    firstEntry.type === undefined &&
    firstEntry.snapshot === undefined;
  
  if (hasChatFields) {
    // Validate more entries to increase confidence
    const validChatEntries = data.slice(0, Math.min(5, data.length))
      .filter(entry => 
        entry.chat?.history?.messages !== undefined &&
        entry.title !== undefined &&
        entry.user_id !== undefined &&
        !entry.snapshot
      );
    
    const confidence = validChatEntries.length / Math.min(5, data.length);
    
    return {
      format: 'chat',
      confidence,
      details: `Detected chat export format with ${Math.round(confidence * 100)}% confidence`
    };
  }
  
  return {
    format: 'unknown',
    confidence: 1,
    details: 'Data format does not match any known format'
  };
}

export function validateDataIntegrity(data: any[], format: DataFormat): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(data)) {
    errors.push('Data is not an array');
    return { isValid: false, errors, warnings };
  }
  
  if (data.length === 0) {
    errors.push('Data array is empty');
    return { isValid: false, errors, warnings };
  }
  
  if (format === 'feedback') {
    data.forEach((entry, index) => {
      if (!entry.id) warnings.push(`Entry at index ${index} missing id`);
      if (!entry.snapshot?.chat) errors.push(`Entry at index ${index} missing chat snapshot`);
      if (!entry.data?.rating) warnings.push(`Entry at index ${index} missing rating`);
    });
  } else if (format === 'chat') {
    data.forEach((entry, index) => {
      if (!entry.id) warnings.push(`Entry at index ${index} missing id`);
      if (!entry.chat) errors.push(`Entry at index ${index} missing chat data`);
      if (!entry.chat?.history?.messages) errors.push(`Entry at index ${index} missing messages`);
      if (!entry.created_at && !entry.updated_at) {
        warnings.push(`Entry at index ${index} missing timestamps`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}