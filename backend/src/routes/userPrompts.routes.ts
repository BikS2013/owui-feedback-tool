import { Router, Request, Response } from 'express';
import { userPromptService } from '../services/userPromptService.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: User Prompts
 *   description: User prompt management endpoints
 */

/**
 * @swagger
 * /api/user-prompts:
 *   get:
 *     summary: List all user prompts
 *     tags: [User Prompts]
 *     responses:
 *       200:
 *         description: List of user prompts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prompts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n🌐 === API REQUEST: GET /api/user-prompts ===');
    console.log('📋 Fetching user prompts list...');
    console.log(`🔧 USER_PROMPTS_FOLDER env var: ${process.env.USER_PROMPTS_FOLDER}`);
    console.log(`📦 GITHUB_REPO env var: ${process.env.GITHUB_REPO}`);
    
    const prompts = await userPromptService.listPrompts();
    console.log(`✅ Found ${prompts.length} user prompts`);
    console.log('🌐 === END REQUEST ===\n');
    
    res.json({ prompts });
  } catch (error: any) {
    console.error('❌ Failed to list user prompts:', error);
    console.log('🌐 === END REQUEST (ERROR) ===\n');
    res.status(500).json({
      error: 'Failed to list user prompts',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/user-prompts/{filename}:
 *   get:
 *     summary: Get a specific user prompt by filename
 *     tags: [User Prompts]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The prompt filename (with extension)
 *     responses:
 *       200:
 *         description: User prompt details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prompt:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     content:
 *                       type: string
 *                     description:
 *                       type: string
 *       404:
 *         description: Prompt not found
 */
router.get('/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    console.log(`\n🌐 === API REQUEST: GET /api/user-prompts/${filename} ===`);
    console.log(`📋 Fetching user prompt: ${filename}`);
    console.log(`🔧 USER_PROMPTS_FOLDER env var: ${process.env.USER_PROMPTS_FOLDER}`);
    
    const prompt = await userPromptService.getPrompt(filename);
    
    if (!prompt) {
      console.log(`⚠️  Prompt not found: ${filename}`);
      console.log('🌐 === END REQUEST (404) ===\n');
      res.status(404).json({
        error: 'Prompt not found',
        message: `No prompt found with filename: ${filename}`
      });
      return;
    }
    
    console.log(`✅ Found prompt: ${filename}`);
    console.log('🌐 === END REQUEST ===\n');
    res.json({ prompt });
  } catch (error: any) {
    console.error(`❌ Failed to get user prompt ${req.params.filename}:`, error);
    console.log('🌐 === END REQUEST (ERROR) ===\n');
    res.status(500).json({
      error: 'Failed to get user prompt',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/user-prompts:
 *   post:
 *     summary: Create a new user prompt
 *     tags: [User Prompts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - content
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Filename with extension (e.g. "my_prompt.txt")
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Prompt created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prompt:
 *                   type: object
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'filename and content are required'
      });
      return;
    }
    
    console.log(`\n🌐 === API REQUEST: POST /api/user-prompts ===`);
    console.log(`📝 Creating user prompt: ${filename}`);
    const prompt = await userPromptService.createPrompt(filename, content);
    
    console.log(`✅ Created prompt: ${filename}`);
    console.log('🌐 === END REQUEST ===\n');
    res.status(201).json({ prompt });
  } catch (error: any) {
    console.error('❌ Failed to create user prompt:', error);
    console.log('🌐 === END REQUEST (ERROR) ===\n');
    res.status(500).json({
      error: 'Failed to create user prompt',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/user-prompts/{filename}:
 *   put:
 *     summary: Update an existing user prompt
 *     tags: [User Prompts]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The prompt filename (with extension)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Prompt updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prompt:
 *                   type: object
 */
router.put('/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const { content } = req.body;
    
    if (!content) {
      res.status(400).json({
        error: 'Missing required field',
        message: 'content is required'
      });
      return;
    }
    
    console.log(`\n🌐 === API REQUEST: PUT /api/user-prompts/${filename} ===`);
    console.log(`📝 Updating user prompt: ${filename}`);
    const prompt = await userPromptService.updatePrompt(filename, content);
    
    console.log(`✅ Updated prompt: ${filename}`);
    console.log('🌐 === END REQUEST ===\n');
    res.json({ prompt });
  } catch (error: any) {
    console.error(`❌ Failed to update user prompt ${req.params.filename}:`, error);
    console.log('🌐 === END REQUEST (ERROR) ===\n');
    res.status(500).json({
      error: 'Failed to update user prompt',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/user-prompts/{filename}:
 *   delete:
 *     summary: Delete a user prompt
 *     tags: [User Prompts]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The prompt filename (with extension)
 *     responses:
 *       204:
 *         description: Prompt deleted successfully
 *       404:
 *         description: Prompt not found
 */
router.delete('/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    console.log(`\n🌐 === API REQUEST: DELETE /api/user-prompts/${filename} ===`);
    console.log(`🗑️  Deleting user prompt: ${filename}`);
    
    await userPromptService.deletePrompt(filename);
    
    console.log(`✅ Deleted prompt: ${filename}`);
    console.log('🌐 === END REQUEST ===\n');
    res.status(204).send();
  } catch (error: any) {
    console.error(`❌ Failed to delete user prompt ${req.params.filename}:`, error);
    console.log('🌐 === END REQUEST (ERROR) ===\n');
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Prompt not found',
        message: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete user prompt',
        message: error.message
      });
    }
  }
});

export { router as userPromptsRoutes };