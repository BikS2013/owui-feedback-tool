import { Conversation, QAPair } from '../types/conversation';
import { Message } from '../types/feedback';
import { format } from 'date-fns';

export function downloadAsJSON(data: unknown, filename: string) {
  console.log('downloadAsJSON called:', filename);
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function downloadAsMarkdown(content: string, filename: string) {
  console.log('downloadAsMarkdown called:', filename);
  const blob = new Blob([content], { type: 'text/markdown' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  console.log('downloadBlob called:', filename, 'size:', blob.size);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  console.log('Triggering download click');
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function formatConversationForDownload(conversation: Conversation, qaPairs: QAPair[]) {
  console.log('formatConversationForDownload called with:', { 
    conversationId: conversation.id, 
    messagesCount: conversation.messages?.length || 0,
    qaPairsCount: qaPairs?.length || 0
  });
  
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  
  // JSON format
  const jsonData = {
    conversation: {
      id: conversation.id,
      title: conversation.title,
      userId: conversation.userId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      qaPairCount: conversation.qaPairCount,
      totalRatings: conversation.totalRatings,
      averageRating: conversation.averageRating,
      modelsUsed: conversation.modelsUsed
    },
    messages: conversation.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      model: msg.model,
      modelName: msg.modelName,
      parentId: msg.parentId,
      childrenIds: msg.childrenIds,
      rating: msg.annotation?.rating || null,
      detailedRating: msg.annotation?.details?.rating || null,
      feedbackComment: msg.feedbackId ? 
        qaPairs.find(qa => qa.answer.id === msg.id)?.comment || null : null
    }))
  };
  
  // Markdown format
  const markdownContent = `# ${conversation.title}

**Conversation ID:** ${conversation.id}  
**Date:** ${format(new Date(conversation.createdAt), 'yyyy-MM-dd HH:mm:ss')}  
**Q&A Pairs:** ${conversation.qaPairCount}  
**Rated Responses:** ${conversation.totalRatings}  
${conversation.averageRating ? `**Average Rating:** ${conversation.averageRating.toFixed(1)}/10` : ''}

---

${conversation.messages.map(msg => {
  const qaPair = qaPairs.find(qa => qa.answer.id === msg.id);
  const rating = qaPair?.rating;
  const comment = qaPair?.comment;
  
  let header = msg.role === 'user' ? '## 👤 User' : `## 🤖 ${msg.modelName || 'AI Assistant'}`;
  if (msg.model) header += ` (${msg.model})`;
  header += `\n*${format(new Date(msg.timestamp * 1000), 'HH:mm:ss')}*`;
  
  if (rating) {
    header += `\n**Rating:** ${rating}/10`;
  }
  
  let content = `\n\n${msg.content}`;
  
  if (comment) {
    content += `\n\n> **Feedback:** ${comment}`;
  }
  
  return header + content;
}).join('\n\n---\n\n')}
`;
  
  return {
    jsonFilename: `conversation_${conversation.id}_${timestamp}.json`,
    jsonData,
    markdownFilename: `conversation_${conversation.id}_${timestamp}.md`,
    markdownContent
  };
}

export function formatQAPairForDownload(
  qaPair: { question: Message; answer: Message; rating?: number | null; comment?: string | null },
  conversationId: string
) {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  
  // JSON format
  const jsonData = {
    conversationId,
    qaPair: {
      question: {
        id: qaPair.question.id,
        content: qaPair.question.content,
        timestamp: qaPair.question.timestamp,
        userId: qaPair.question.userId
      },
      answer: {
        id: qaPair.answer.id,
        content: qaPair.answer.content,
        timestamp: qaPair.answer.timestamp,
        model: qaPair.answer.model,
        modelName: qaPair.answer.modelName,
        rating: qaPair.rating || null,
        feedbackComment: qaPair.comment || null
      }
    }
  };
  
  // Markdown format
  const markdownContent = `# Q&A Pair

**Conversation ID:** ${conversationId}  
**Date:** ${format(new Date(qaPair.question.timestamp * 1000), 'yyyy-MM-dd HH:mm:ss')}

## 👤 Question
*${format(new Date(qaPair.question.timestamp * 1000), 'HH:mm:ss')}*

${qaPair.question.content}

---

## 🤖 Answer - ${qaPair.answer.modelName || 'AI Assistant'}${qaPair.answer.model ? ` (${qaPair.answer.model})` : ''}
*${format(new Date(qaPair.answer.timestamp * 1000), 'HH:mm:ss')}*
${qaPair.rating ? `\n**Rating:** ${qaPair.rating}/10` : ''}

${qaPair.answer.content}
${qaPair.comment ? `\n\n> **Feedback:** ${qaPair.comment}` : ''}
`;
  
  return {
    jsonFilename: `qa_pair_${qaPair.answer.id}_${timestamp}.json`,
    jsonData,
    markdownFilename: `qa_pair_${qaPair.answer.id}_${timestamp}.md`,
    markdownContent
  };
}