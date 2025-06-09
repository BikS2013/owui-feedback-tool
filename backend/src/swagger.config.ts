import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OWUI Feedback Backend API',
      version: '1.0.0',
      description: 'Backend API for OWUI Feedback application - Provides export functionality for conversations and Q&A pairs in various formats',
      contact: {
        name: 'NBG Tech Hub'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Export',
        description: 'Export endpoints for conversations and Q&A pairs'
      },
      {
        name: 'Health',
        description: 'Health check endpoint'
      },
      {
        name: 'GitHub',
        description: 'GitHub repository integration endpoints'
      },
      {
        name: 'LLM',
        description: 'LLM prompt execution endpoints'
      }
    ],
    components: {
      schemas: {
        Conversation: {
          type: 'object',
          required: ['title', 'createdAt', 'messages'],
          properties: {
            title: {
              type: 'string',
              description: 'The title of the conversation'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the conversation was created'
            },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                required: ['role', 'content', 'timestamp'],
                properties: {
                  role: {
                    type: 'string',
                    enum: ['user', 'assistant'],
                    description: 'The role of the message sender'
                  },
                  content: {
                    type: 'string',
                    description: 'The content of the message'
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Timestamp of the message'
                  }
                }
              }
            }
          }
        },
        QAPair: {
          type: 'object',
          required: ['question', 'answer', 'timestamp', 'conversationTitle'],
          properties: {
            question: {
              type: 'string',
              description: 'The user question'
            },
            answer: {
              type: 'string',
              description: 'The assistant answer'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of the Q&A pair'
            },
            conversationTitle: {
              type: 'string',
              description: 'Title of the parent conversation'
            }
          }
        },
        ExportRequest: {
          type: 'object',
          required: ['data', 'format'],
          properties: {
            data: {
              oneOf: [
                { $ref: '#/components/schemas/Conversation' },
                { $ref: '#/components/schemas/QAPair' }
              ],
              description: 'The data to export'
            },
            format: {
              type: 'string',
              enum: ['pdf', 'html'],
              description: 'The export format'
            }
          }
        },
        ExportResponse: {
          type: 'object',
          oneOf: [
            {
              properties: {
                success: {
                  type: 'boolean',
                  example: true
                },
                data: {
                  type: 'string',
                  description: 'Base64 encoded file data'
                },
                filename: {
                  type: 'string',
                  description: 'Suggested filename for the export'
                },
                mimeType: {
                  type: 'string',
                  description: 'MIME type of the exported file'
                }
              }
            },
            {
              properties: {
                success: {
                  type: 'boolean',
                  example: false
                },
                error: {
                  type: 'string',
                  description: 'Error message'
                }
              }
            }
          ]
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/index.ts']
};

export const swaggerSpec = swaggerJsdoc(options);