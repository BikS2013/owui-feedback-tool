/**
 * @swagger
 * /api/system-prompts:
 *   get:
 *     summary: List all system prompts
 *     tags: [System Prompts]
 *     responses:
 *       200:
 *         description: List of system prompts
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

/**
 * @swagger
 * /api/system-prompts/{filename}:
 *   get:
 *     summary: Get a specific system prompt by filename
 *     tags: [System Prompts]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The prompt filename (with extension)
 *     responses:
 *       200:
 *         description: System prompt details
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

/**
 * @swagger
 * /api/system-prompts:
 *   post:
 *     summary: Create a new system prompt
 *     tags: [System Prompts]
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

/**
 * @swagger
 * /api/system-prompts/{filename}:
 *   put:
 *     summary: Update an existing system prompt
 *     tags: [System Prompts]
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

/**
 * @swagger
 * /api/system-prompts/{filename}:
 *   delete:
 *     summary: Delete a system prompt
 *     tags: [System Prompts]
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

// This file only contains Swagger documentation
export {};