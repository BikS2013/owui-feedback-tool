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

// This file only contains Swagger documentation
export {};