import { Router } from 'express';
import { ExportService } from '../services/export.service.js';
import { ExportRequest, ExportQAPairRequest } from '../types/export.types.js';

const router = Router();
const exportService = new ExportService();

/**
 * @swagger
 * /api/export/conversation:
 *   post:
 *     summary: Export a conversation to PDF or HTML format
 *     tags: [Export]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversation
 *               - format
 *             properties:
 *               conversation:
 *                 type: object
 *                 required:
 *                   - title
 *                   - createdAt
 *                   - messages
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: "Discussion about AI"
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-01-08T10:30:00Z"
 *                   messages:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: string
 *                           enum: [user, assistant]
 *                         content:
 *                           type: string
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *               qaPairs:
 *                 type: array
 *                 description: Optional Q&A pairs to include
 *                 items:
 *                   type: object
 *               format:
 *                 type: string
 *                 enum: [pdf, html]
 *                 example: "pdf"
 *     responses:
 *       200:
 *         description: Successful export
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 html:
 *                   type: string
 *                 filename:
 *                   type: string
 *       400:
 *         description: Bad request - Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/conversation', async (req, res): Promise<void> => {
  try {
    const exportRequest: ExportRequest = req.body;
    
    if (!exportRequest.conversation || !exportRequest.format) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await exportService.exportConversation(
      exportRequest.conversation,
      exportRequest.qaPairs || [],
      exportRequest.format
    );

    // Set appropriate headers based on format
    if (exportRequest.format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('Export conversation error:', error);
    res.status(500).json({ 
      error: 'Failed to export conversation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/export/qa-pair:
 *   post:
 *     summary: Export a single Q&A pair to PDF or HTML format
 *     tags: [Export]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qaPair
 *               - conversationId
 *               - format
 *             properties:
 *               qaPair:
 *                 type: object
 *                 required:
 *                   - question
 *                   - answer
 *                   - timestamp
 *                   - conversationTitle
 *                 properties:
 *                   question:
 *                     type: string
 *                     example: "What is artificial intelligence?"
 *                   answer:
 *                     type: string
 *                     example: "Artificial intelligence is..."
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-01-08T10:30:00Z"
 *                   conversationTitle:
 *                     type: string
 *                     example: "AI Discussion"
 *               conversationId:
 *                 type: string
 *                 example: "conv-123"
 *               format:
 *                 type: string
 *                 enum: [pdf, html]
 *                 example: "pdf"
 *     responses:
 *       200:
 *         description: Successful export
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 html:
 *                   type: string
 *                 filename:
 *                   type: string
 *       400:
 *         description: Bad request - Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/qa-pair', async (req, res): Promise<void> => {
  try {
    const exportRequest: ExportQAPairRequest = req.body;
    
    if (!exportRequest.qaPair || !exportRequest.conversationId || !exportRequest.format) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await exportService.exportQAPair(
      exportRequest.qaPair,
      exportRequest.conversationId,
      exportRequest.format
    );

    // Set appropriate headers based on format
    if (exportRequest.format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('Export QA pair error:', error);
    res.status(500).json({ 
      error: 'Failed to export QA pair',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as exportRoutes };