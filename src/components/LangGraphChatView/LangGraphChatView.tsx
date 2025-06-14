import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { User, Bot } from 'lucide-react';
import { LangGraphThread, LangGraphMessage } from '../../types/langgraph';
import './LangGraphChatView.css';

interface LangGraphChatViewProps {
  thread: LangGraphThread;
  showSourceView?: boolean;
}

export function LangGraphChatView({ thread, showSourceView = false }: LangGraphChatViewProps) {
  console.log(`🌐 [LangGraphChatView] Rendering thread: ${thread.thread_id}`);
  console.log(`   - Messages: ${thread.values?.messages?.length || 0}`);
  console.log(`   - Source view: ${showSourceView}`);
  const renderStartTime = performance.now();
  
  if (showSourceView) {
    return (
      <div className="raw-json-container">
        <pre className="raw-json-content">
          {JSON.stringify(thread, null, 2)}
        </pre>
      </div>
    );
  }

  const messages = thread.values?.messages || [];

  if (messages.length === 0) {
    console.log('⚠️ [LangGraphChatView] No messages in thread');
    return (
      <div className="messages-container">
        <div className="empty-state">
          <p>No messages found in this thread</p>
        </div>
      </div>
    );
  }

  const getMessageContent = (msg: LangGraphMessage): string => {
    if (typeof msg.content === 'string') return msg.content;
    if (typeof msg.text === 'string') return msg.text;
    if (typeof msg.content === 'object' && msg.content?.text) return msg.content.text;
    return JSON.stringify(msg.content || msg.text || '');
  };

  const getMessageTimestamp = (msg: LangGraphMessage): number => {
    if (msg.timestamp) {
      return typeof msg.timestamp === 'string' 
        ? new Date(msg.timestamp).getTime()
        : msg.timestamp;
    }
    // Fallback to thread timestamps
    return msg.type === 'human' 
      ? new Date(thread.created_at).getTime()
      : new Date(thread.updated_at || thread.created_at).getTime();
  };

  const getModelName = (msg: LangGraphMessage): string => {
    return msg.response_metadata?.model_name || msg.model || 'AI Assistant';
  };

  const component = (
    <div className="messages-container langgraph-messages">
      {messages.map((message, index) => {
        if (index === 0) {
          console.log(`   - Rendering ${messages.length} messages...`);
        }
        return (
          <div key={message.id || `${thread.thread_id}-${index}`} className={`message ${message.type === 'human' ? 'user' : 'assistant'}`}>
            <div className="message-header">
              <div className="message-icon">
                {message.type === 'human' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className="message-meta">
                <span className="message-role">
                  {message.type === 'human' ? 'Human' : getModelName(message)}
                </span>
                <span className="message-time">
                  {format(new Date(getMessageTimestamp(message)), 'h:mm a')}
                </span>
              </div>
            </div>
            
            <div className="message-content">
              {message.type === 'human' ? (
                <p>{getMessageContent(message)}</p>
              ) : (
                <ReactMarkdown>{getMessageContent(message)}</ReactMarkdown>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
  
  const renderEndTime = performance.now();
  console.log(`✅ [LangGraphChatView] Render completed in ${(renderEndTime - renderStartTime).toFixed(2)}ms`);
  
  return component;
}