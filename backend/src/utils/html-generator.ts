import { format } from 'date-fns';
import { Conversation, QAPair } from '../types/export.types.js';

export function generateHTML(conversation: Conversation, qaPairs: QAPair[]): string {
  const date = format(new Date(conversation.createdAt), 'yyyy-MM-dd HH:mm:ss');
  
  const messagesHtml = conversation.messages.map(msg => {
    const qaPair = qaPairs.find(qa => qa.answer.id === msg.id);
    const rating = qaPair?.rating;
    const comment = qaPair?.comment;
    const time = format(new Date(msg.timestamp * 1000), 'HH:mm:ss');
    
    const roleText = msg.role === 'user' ? 'User' : (msg.modelName || 'AI Assistant');
    const messageClass = msg.role === 'user' ? 'user' : 'assistant';
    
    return `
      <div class="message ${messageClass}">
        <h3>${roleText}</h3>
        <div class="message-meta">
          <span class="time">${time}</span>
          ${msg.model ? `<span class="model">(${msg.model})</span>` : ''}
        </div>
        ${rating ? `<p class="rating"><strong>Rating:</strong> ${rating}/10</p>` : ''}
        <div class="content">
          ${processMarkdown(msg.content)}
        </div>
        ${comment ? `
          <div class="feedback">
            <h4>Feedback</h4>
            <p>${escapeHtml(comment)}</p>
          </div>
        ` : ''}
      </div>
    `;
  }).join('\n');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${conversation.title}</title>
      <style>
        ${getStyles()}
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${conversation.title}</h1>
        
        <div class="metadata">
          <p><strong>Conversation ID:</strong> ${conversation.id}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Q&A Pairs:</strong> ${conversation.qaPairCount}</p>
          <p><strong>Rated Responses:</strong> ${conversation.totalRatings}</p>
          ${conversation.averageRating ? `<p><strong>Average Rating:</strong> ${conversation.averageRating.toFixed(1)}/10</p>` : ''}
        </div>

        <div class="messages">
          ${messagesHtml}
        </div>
      </div>
    </body>
    </html>
  `;
}

function getStyles(): string {
  return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 30px;
      text-align: center;
      font-size: 2em;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    h3 {
      color: #555;
      margin-bottom: 10px;
      font-size: 1.2em;
    }
    h4 {
      color: #666;
      margin-bottom: 8px;
      font-size: 1.1em;
    }
    .metadata {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .metadata p {
      margin: 8px 0;
    }
    .messages {
      margin-top: 30px;
    }
    .message {
      margin-bottom: 30px;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid;
      position: relative;
    }
    .message.user {
      background-color: #e3f2fd;
      border-left-color: #2196f3;
    }
    .message.assistant {
      background-color: #f3e5f5;
      border-left-color: #9c27b0;
    }
    .message-meta {
      font-size: 0.85em;
      color: #666;
      margin-bottom: 10px;
    }
    .time {
      margin-right: 10px;
    }
    .model {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    .rating {
      color: #4caf50;
      font-weight: bold;
      margin: 10px 0;
    }
    .content {
      white-space: pre-wrap;
      word-wrap: break-word;
      line-height: 1.7;
    }
    .feedback {
      margin-top: 20px;
      padding: 15px;
      background-color: #fff3cd;
      border-radius: 4px;
      border-left: 4px solid #ffc107;
    }
    strong {
      color: #2c3e50;
      font-weight: 600;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre {
      background-color: #f4f4f4;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 15px 0;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    a {
      color: #2196f3;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 30px 0;
    }
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
      .message {
        page-break-inside: avoid;
      }
    }
  `;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function processMarkdown(text: string): string {
  let processed = escapeHtml(text);
  
  // Convert **bold** to <strong>
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert [text](url) to links
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Convert markdown headings
  processed = processed.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  processed = processed.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  processed = processed.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  processed = processed.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  processed = processed.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  processed = processed.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert code blocks
  processed = processed.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
  
  // Convert inline code
  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  return processed;
}