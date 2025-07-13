import { Router, Request, Response } from 'express';

/**
 * Factory function to create prompt routes for different prompt types
 */
export function createPromptRoutes(tagName: string, promptService: any) {
  const router = Router();
  const lowercaseName = tagName.toLowerCase();

  // Note: Swagger documentation would need to be static for each route instance
  // since it doesn't support dynamic template literals

  // GET /
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
      console.log(`\n🌐 === API REQUEST: GET /api/${lowercaseName.replace(' ', '-')} ===`);
      console.log(`📋 Fetching ${lowercaseName} list...`);
      console.log(`📦 GITHUB_REPO env var: ${process.env.GITHUB_REPO}`);
      
      const prompts = await promptService.listPrompts();
      console.log(`✅ Found ${prompts.length} ${lowercaseName}`);
      console.log('🌐 === END REQUEST ===\n');
      
      res.json({ prompts });
    } catch (error: any) {
      console.error(`❌ Failed to list ${lowercaseName}:`, error);
      console.log('🌐 === END REQUEST (ERROR) ===\n');
      res.status(500).json({
        error: `Failed to list ${lowercaseName}`,
        message: error.message
      });
    }
  });

  // GET /:filename
  router.get('/:filename', async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename } = req.params;
      console.log(`\n🌐 === API REQUEST: GET /api/${lowercaseName.replace(' ', '-')}/${filename} ===`);
      console.log(`📋 Fetching ${lowercaseName.slice(0, -1)}: ${filename}`);
      
      const prompt = await promptService.getPrompt(filename);
      
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
      console.error(`❌ Failed to get ${lowercaseName.slice(0, -1)} ${req.params.filename}:`, error);
      console.log('🌐 === END REQUEST (ERROR) ===\n');
      res.status(500).json({
        error: `Failed to get ${lowercaseName.slice(0, -1)}`,
        message: error.message
      });
    }
  });

  // POST /
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
      
      console.log(`\n🌐 === API REQUEST: POST /api/${lowercaseName.replace(' ', '-')} ===`);
      console.log(`📝 Creating ${lowercaseName.slice(0, -1)}: ${filename}`);
      const prompt = await promptService.createPrompt(filename, content);
      
      console.log(`✅ Created prompt: ${filename}`);
      console.log('🌐 === END REQUEST ===\n');
      res.status(201).json({ prompt });
    } catch (error: any) {
      console.error(`❌ Failed to create ${lowercaseName.slice(0, -1)}:`, error);
      console.log('🌐 === END REQUEST (ERROR) ===\n');
      res.status(500).json({
        error: `Failed to create ${lowercaseName.slice(0, -1)}`,
        message: error.message
      });
    }
  });

  // PUT /:filename
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
      
      console.log(`\n🌐 === API REQUEST: PUT /api/${lowercaseName.replace(' ', '-')}/${filename} ===`);
      console.log(`📝 Updating ${lowercaseName.slice(0, -1)}: ${filename}`);
      const prompt = await promptService.updatePrompt(filename, content);
      
      console.log(`✅ Updated prompt: ${filename}`);
      console.log('🌐 === END REQUEST ===\n');
      res.json({ prompt });
    } catch (error: any) {
      console.error(`❌ Failed to update ${lowercaseName.slice(0, -1)} ${req.params.filename}:`, error);
      console.log('🌐 === END REQUEST (ERROR) ===\n');
      res.status(500).json({
        error: `Failed to update ${lowercaseName.slice(0, -1)}`,
        message: error.message
      });
    }
  });

  // DELETE /:filename
  router.delete('/:filename', async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename } = req.params;
      console.log(`\n🌐 === API REQUEST: DELETE /api/${lowercaseName.replace(' ', '-')}/${filename} ===`);
      console.log(`🗑️  Deleting ${lowercaseName.slice(0, -1)}: ${filename}`);
      
      await promptService.deletePrompt(filename);
      
      console.log(`✅ Deleted prompt: ${filename}`);
      console.log('🌐 === END REQUEST ===\n');
      res.status(204).send();
    } catch (error: any) {
      console.error(`❌ Failed to delete ${lowercaseName.slice(0, -1)} ${req.params.filename}:`, error);
      console.log('🌐 === END REQUEST (ERROR) ===\n');
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: 'Prompt not found',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: `Failed to delete ${lowercaseName.slice(0, -1)}`,
          message: error.message
        });
      }
    }
  });

  return router;
}