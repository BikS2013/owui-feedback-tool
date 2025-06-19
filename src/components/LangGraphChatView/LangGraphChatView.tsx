import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { User, Bot } from 'lucide-react';
import { LangGraphThread, LangGraphMessage } from '../../types/langgraph';
import { CollapsibleJSON } from '../CollapsibleJSON';
import './LangGraphChatView.css';

interface LangGraphChatViewProps {
  thread: LangGraphThread;
  showSourceView?: boolean;
  runs?: any[]; // Array of runs for Q&A matching
}

export function LangGraphChatView({ thread, showSourceView = false, runs = [] }: LangGraphChatViewProps) {
  console.log(`🌐 [LangGraphChatView] Rendering thread: ${thread.thread_id}`);
  console.log(`   - Messages: ${thread.values?.messages?.length || 0}`);
  console.log(`   - Runs: ${runs.length}`);
  console.log(`   - Source view: ${showSourceView}`);
  const renderStartTime = performance.now();
  
  if (showSourceView) {
    return (
      <div className="raw-json-container">
        <CollapsibleJSON 
          data={thread}
          defaultExpanded={false}
          maxInitialDepth={2}
        />
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

  // Helper functions - define before use
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

  // Match messages with runs
  const matchMessagesWithRuns = () => {
    const matchedPairs: { message: LangGraphMessage; run?: any; runIndex?: number }[] = [];
    
    // Get sorted runs (already in ascending order from backend)
    const sortedRuns = [...runs];
    
    console.log(`📊 Matching ${messages.length} messages with ${sortedRuns.length} runs`);
    
    let runIndex = 0;
    
    messages.forEach((message, messageIndex) => {
      if (message.type === 'human' && runIndex < sortedRuns.length) {
        // Match human message with run
        const run = sortedRuns[runIndex];
        
        console.log(`   - Message ${messageIndex} (${message.type}): Matched with run ${runIndex}`);
        console.log(`     Run created_at: ${run.created_at}, updated_at: ${run.updated_at}`);
        
        // Store both the run and its index for assistant message matching
        matchedPairs.push({ message, run, runIndex });
        runIndex++;
      } else {
        console.log(`   - Message ${messageIndex} (${message.type}): No run matched`);
        matchedPairs.push({ message });
      }
    });
    
    return matchedPairs;
  };

  const matchedMessages = runs.length > 0 ? matchMessagesWithRuns() : messages.map(msg => ({ message: msg }));

  // Helper function to format duration
  const formatDuration = (startTime: string, endTime: string): string => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;
    
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = ((durationMs % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  };

  // Find the corresponding run for assistant messages
  const findRunForAssistant = (assistantIndex: number): any => {
    // Find the last human message before this assistant message
    let lastHumanRunIndex = -1;
    
    for (let i = assistantIndex - 1; i >= 0; i--) {
      const item = matchedMessages[i];
      if (item.message.type === 'human' && item.runIndex !== undefined) {
        lastHumanRunIndex = item.runIndex;
        break;
      }
    }
    
    // Debug logging
    console.log(`🔍 Finding run for assistant at index ${assistantIndex}:`);
    console.log(`   - Last human run index: ${lastHumanRunIndex}`);
    console.log(`   - Total runs: ${runs.length}`);
    
    // Return the run at the found index
    if (lastHumanRunIndex >= 0 && lastHumanRunIndex < runs.length) {
      const run = runs[lastHumanRunIndex];
      console.log(`   - Found run:`, run);
      console.log(`   - Run updated_at: ${run?.updated_at}`);
      return run;
    }
    
    console.log(`   - No run found`);
    return null;
  };

  const component = (
    <div className="messages-container langgraph-messages">
      {matchedMessages.map((item, index) => {
        const message = item.message;
        const run = item.run;
        
        if (index === 0) {
          console.log(`   - Rendering ${matchedMessages.length} messages with runs...`);
        }
        
        // For assistant messages, find the corresponding run
        const assistantRun = (message.type === 'assistant' || message.type === 'ai') ? findRunForAssistant(index) : null;
        
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
                  {message.type === 'human' && run?.created_at ? (
                    format(new Date(run.created_at), 'h:mm:ss a')
                  ) : (message.type === 'assistant' || message.type === 'ai') && assistantRun?.updated_at ? (
                    format(new Date(assistantRun.updated_at), 'h:mm:ss a')
                  ) : (
                    format(new Date(getMessageTimestamp(message)), 'h:mm:ss a')
                  )}
                </span>
                {(message.type === 'assistant' || message.type === 'ai') && assistantRun?.created_at && assistantRun?.updated_at && (
                  <span className="message-duration" title="Response duration">
                    • {formatDuration(assistantRun.created_at, assistantRun.updated_at)}
                  </span>
                )}
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