import puppeteer from 'puppeteer';
import { format } from 'date-fns';
import { Conversation, QAPair, Message } from '../types/export.types.js';
import { generateHTML } from '../utils/html-generator.js';

export class ExportService {
  async exportConversation(
    conversation: Conversation,
    qaPairs: QAPair[],
    exportFormat: 'pdf' | 'html'
  ): Promise<{ filename: string; buffer: Buffer }> {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
    const filename = `conversation_${conversation.id}_${timestamp}.${exportFormat}`;

    // Generate HTML content
    const html = generateHTML(conversation, qaPairs);

    if (exportFormat === 'html') {
      return {
        filename,
        buffer: Buffer.from(html, 'utf-8')
      };
    }

    // Generate PDF using Puppeteer
    const pdfBuffer = await this.generatePDF(html);
    return {
      filename,
      buffer: pdfBuffer
    };
  }

  async exportQAPair(
    qaPair: { question: Message; answer: Message; rating?: number | null; comment?: string | null },
    conversationId: string,
    exportFormat: 'pdf' | 'html'
  ): Promise<{ filename: string; buffer: Buffer }> {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
    const filename = `qa_pair_${qaPair.answer.id}_${timestamp}.${exportFormat}`;

    // Generate HTML content for QA pair
    const html = this.generateQAPairHTML(qaPair, conversationId);

    if (exportFormat === 'html') {
      return {
        filename,
        buffer: Buffer.from(html, 'utf-8')
      };
    }

    // Generate PDF using Puppeteer
    const pdfBuffer = await this.generatePDF(html);
    return {
      filename,
      buffer: pdfBuffer
    };
  }

  private async generatePDF(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Set content with proper UTF-8 encoding for Greek characters
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generate PDF with proper settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true,
        preferCSSPageSize: false
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private generateQAPairHTML(
    qaPair: { question: Message; answer: Message; rating?: number | null; comment?: string | null },
    conversationId: string
  ): string {
    const questionTime = format(new Date(qaPair.question.timestamp * 1000), 'HH:mm:ss');
    const answerTime = format(new Date(qaPair.answer.timestamp * 1000), 'HH:mm:ss');
    const date = format(new Date(qaPair.question.timestamp * 1000), 'yyyy-MM-dd HH:mm:ss');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Q&A Pair</title>
        <style>
          ${this.getStyles()}
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Q&A Pair</h1>
          
          <div class="metadata">
            <p><strong>Conversation ID:</strong> ${conversationId}</p>
            <p><strong>Date:</strong> ${date}</p>
          </div>

          <div class="message user">
            <h2>Question</h2>
            <div class="message-meta">
              <span class="time">${questionTime}</span>
            </div>
            <div class="content">
              ${this.escapeHtml(qaPair.question.content)}
            </div>
          </div>

          <div class="message assistant">
            <h2>Answer - ${qaPair.answer.modelName || 'AI Assistant'}</h2>
            <div class="message-meta">
              <span class="time">${answerTime}</span>
              ${qaPair.answer.model ? `<span class="model">(${qaPair.answer.model})</span>` : ''}
            </div>
            ${qaPair.rating ? `<p class="rating"><strong>Rating:</strong> ${qaPair.rating}/10</p>` : ''}
            <div class="content">
              ${this.processMarkdown(qaPair.answer.content)}
            </div>
            ${qaPair.comment ? `
              <div class="feedback">
                <h3>Feedback</h3>
                <p>${this.escapeHtml(qaPair.comment)}</p>
              </div>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getStyles(): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
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
        margin-bottom: 20px;
        text-align: center;
      }
      h2 {
        color: #34495e;
        margin-top: 30px;
        margin-bottom: 10px;
        font-size: 1.3em;
      }
      h3 {
        color: #555;
        margin-top: 20px;
        margin-bottom: 10px;
        font-size: 1.1em;
      }
      .metadata {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 4px;
        margin-bottom: 30px;
      }
      .metadata p {
        margin: 5px 0;
      }
      .message {
        margin-bottom: 30px;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid;
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
        font-size: 0.9em;
        color: #666;
        margin-bottom: 10px;
      }
      .time {
        margin-right: 10px;
      }
      .model {
        font-family: monospace;
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
      }
      code {
        background-color: #f4f4f4;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: monospace;
      }
      pre {
        background-color: #f4f4f4;
        padding: 10px;
        border-radius: 4px;
        overflow-x: auto;
      }
      pre code {
        background-color: transparent;
        padding: 0;
      }
      @media print {
        body {
          background-color: white;
        }
        .container {
          box-shadow: none;
          padding: 0;
        }
      }
    `;
  }

  private escapeHtml(text: string): string {
    const div = { textContent: text, innerHTML: '' };
    div.textContent = text;
    return div.innerHTML;
  }

  private processMarkdown(text: string): string {
    // Simple markdown processing for bold and links
    let processed = this.escapeHtml(text);
    
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
    
    return processed;
  }
}