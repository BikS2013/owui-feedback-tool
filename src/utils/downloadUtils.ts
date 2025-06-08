import { Conversation, QAPair } from '../types/conversation';
import { Message } from '../types/feedback';
import { format } from 'date-fns';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { parseMarkdownToTextRuns, detectMarkdownHeading } from './markdownParser';

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

export async function downloadAsDocx(docxBlob: Blob, filename: string) {
  console.log('downloadAsDocx called:', filename);
  downloadBlob(docxBlob, filename);
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

export async function formatConversationForDownload(conversation: Conversation, qaPairs: QAPair[]) {
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
  
  // DOCX format
  const sections: Paragraph[] = [];
  
  // Title
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: conversation.title, font: 'Aptos' })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );
  
  // Metadata
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Conversation ID: ', bold: true, font: 'Aptos' }),
        new TextRun({ text: conversation.id, font: 'Aptos' })
      ],
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ', bold: true, font: 'Aptos' }),
        new TextRun({ text: format(new Date(conversation.createdAt), 'yyyy-MM-dd HH:mm:ss'), font: 'Aptos' })
      ],
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Q&A Pairs: ', bold: true, font: 'Aptos' }),
        new TextRun({ text: conversation.qaPairCount.toString(), font: 'Aptos' })
      ],
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Rated Responses: ', bold: true, font: 'Aptos' }),
        new TextRun({ text: conversation.totalRatings.toString(), font: 'Aptos' })
      ],
      spacing: { after: 120 }
    })
  );
  
  if (conversation.averageRating) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Average Rating: ', bold: true, font: 'Aptos' }),
          new TextRun({ text: `${conversation.averageRating.toFixed(1)}/10`, font: 'Aptos' })
        ],
        spacing: { after: 400 }
      })
    );
  } else {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: ' ', font: 'Aptos' })],
        spacing: { after: 400 }
      })
    );
  }
  
  // Messages
  for (const msg of conversation.messages) {
    const qaPair = qaPairs.find(qa => qa.answer.id === msg.id);
    const rating = qaPair?.rating;
    const comment = qaPair?.comment;
    
    // Role header
    const roleText = msg.role === 'user' ? 'User' : (msg.modelName || 'AI Assistant');
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: roleText, font: 'Aptos' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    );
    
    // Timestamp and model info
    let metaText = format(new Date(msg.timestamp * 1000), 'HH:mm:ss');
    if (msg.model) metaText += ` (${msg.model})`;
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: metaText, font: 'Aptos' })],
        spacing: { after: 120 }
      })
    );
    
    // Rating
    if (rating) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Rating: ', bold: true, font: 'Aptos' }),
            new TextRun({ text: `${rating}/10`, font: 'Aptos' })
          ],
          spacing: { after: 200 }
        })
      );
    }
    
    // Message content - split by newlines to preserve formatting
    const contentLines = msg.content.split('\n');
    for (const line of contentLines) {
      // Check if this line is a heading
      const headingInfo = detectMarkdownHeading(line);
      
      if (headingInfo) {
        // It's a heading - parse the heading text for bold notation
        const textRuns = parseMarkdownToTextRuns(headingInfo.text, 'Aptos');
        sections.push(
          new Paragraph({
            children: textRuns,
            heading: headingInfo.level,
            spacing: { before: 200, after: 120 }
          })
        );
      } else {
        // Regular paragraph - parse for bold notation
        const textRuns = parseMarkdownToTextRuns(line || ' ', 'Aptos');
        sections.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 120 }
          })
        );
      }
    }
    
    // Feedback comment
    if (comment) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: 'Feedback:', bold: true, font: 'Aptos' })],
          spacing: { before: 200, after: 120 }
        })
      );
      
      // Process comment lines for headings
      const commentLines = comment.split('\n');
      for (const line of commentLines) {
        const headingInfo = detectMarkdownHeading(line);
        
        if (headingInfo) {
          const textRuns = parseMarkdownToTextRuns(headingInfo.text, 'Aptos');
          sections.push(
            new Paragraph({
              children: textRuns,
              heading: headingInfo.level,
              spacing: { before: 120, after: 120 }
            })
          );
        } else {
          const textRuns = parseMarkdownToTextRuns(line || ' ', 'Aptos');
          sections.push(
            new Paragraph({
              children: textRuns,
              spacing: { after: 120 }
            })
          );
        }
      }
    }
    
    // Add separator
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: '---', font: 'Aptos' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 }
      })
    );
  }
  
  // Create DOCX document
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });
  
  // Generate DOCX blob
  const docxBlob = await Packer.toBlob(doc);


  return {
    jsonFilename: `conversation_${conversation.id}_${timestamp}.json`,
    jsonData,
    markdownFilename: `conversation_${conversation.id}_${timestamp}.md`,
    markdownContent,
    docxFilename: `conversation_${conversation.id}_${timestamp}.docx`,
    docxBlob,
  };
}

export async function formatQAPairForDownload(
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
  
  // DOCX format
  const sections: Paragraph[] = [];
  
  // Title
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: 'Q&A Pair', font: 'Aptos' })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );
  
  // Metadata
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Conversation ID: ', bold: true, font: 'Aptos' }),
        new TextRun({ text: conversationId, font: 'Aptos' })
      ],
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ', bold: true, font: 'Aptos' }),
        new TextRun({ text: format(new Date(qaPair.question.timestamp * 1000), 'yyyy-MM-dd HH:mm:ss'), font: 'Aptos' })
      ],
      spacing: { after: 400 }
    })
  );
  
  // Question
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: 'Question', font: 'Aptos' })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: format(new Date(qaPair.question.timestamp * 1000), 'HH:mm:ss'), font: 'Aptos' })],
      spacing: { after: 200 }
    })
  );
  
  // Question content
  const docxQuestionLines = qaPair.question.content.split('\n');
  for (const line of docxQuestionLines) {
    const headingInfo = detectMarkdownHeading(line);
    
    if (headingInfo) {
      const textRuns = parseMarkdownToTextRuns(headingInfo.text, 'Aptos');
      sections.push(
        new Paragraph({
          children: textRuns,
          heading: headingInfo.level,
          spacing: { before: 200, after: 120 }
        })
      );
    } else {
      const textRuns = parseMarkdownToTextRuns(line || ' ', 'Aptos');
      sections.push(
        new Paragraph({
          children: textRuns,
          spacing: { after: 120 }
        })
      );
    }
  }
  
  // Answer
  const answerTitle = `Answer - ${qaPair.answer.modelName || 'AI Assistant'}`;
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: answerTitle, font: 'Aptos' })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 }
    })
  );
  
  let metaText = format(new Date(qaPair.answer.timestamp * 1000), 'HH:mm:ss');
  if (qaPair.answer.model) metaText += ` (${qaPair.answer.model})`;
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: metaText, font: 'Aptos' })],
      spacing: { after: 120 }
    })
  );
  
  if (qaPair.rating) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Rating: ', bold: true, font: 'Aptos' }),
          new TextRun({ text: `${qaPair.rating}/10`, font: 'Aptos' })
        ],
        spacing: { after: 200 }
      })
    );
  }
  
  // Answer content
  const docxAnswerLines = qaPair.answer.content.split('\n');
  for (const line of docxAnswerLines) {
    const headingInfo = detectMarkdownHeading(line);
    
    if (headingInfo) {
      const textRuns = parseMarkdownToTextRuns(headingInfo.text, 'Aptos');
      sections.push(
        new Paragraph({
          children: textRuns,
          heading: headingInfo.level,
          spacing: { before: 200, after: 120 }
        })
      );
    } else {
      const textRuns = parseMarkdownToTextRuns(line || ' ', 'Aptos');
      sections.push(
        new Paragraph({
          children: textRuns,
          spacing: { after: 120 }
        })
      );
    }
  }
  
  // Feedback comment
  if (qaPair.comment) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: 'Feedback:', bold: true, font: 'Aptos' })],
        spacing: { before: 200, after: 120 }
      })
    );
    
    // Process comment lines for headings
    const commentLines = qaPair.comment.split('\n');
    for (const line of commentLines) {
      const headingInfo = detectMarkdownHeading(line);
      
      if (headingInfo) {
        const textRuns = parseMarkdownToTextRuns(headingInfo.text, 'Aptos');
        sections.push(
          new Paragraph({
            children: textRuns,
            heading: headingInfo.level,
            spacing: { before: 120, after: 120 }
          })
        );
      } else {
        const textRuns = parseMarkdownToTextRuns(line || ' ', 'Aptos');
        sections.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 120 }
          })
        );
      }
    }
  }
  
  // Create DOCX document
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });
  
  // Generate DOCX blob
  const docxBlob = await Packer.toBlob(doc);

  return {
    jsonFilename: `qa_pair_${qaPair.answer.id}_${timestamp}.json`,
    jsonData,
    markdownFilename: `qa_pair_${qaPair.answer.id}_${timestamp}.md`,
    markdownContent,
    docxFilename: `qa_pair_${qaPair.answer.id}_${timestamp}.docx`,
    docxBlob,
  };
}