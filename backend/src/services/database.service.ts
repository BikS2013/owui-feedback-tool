import { Pool, PoolClient } from 'pg';
import { Agent } from '../types/agent.types.js';
import { Thread, ThreadPaginatedResponse, Run, RunsPaginatedResponse, Checkpoint, CheckpointsPaginatedResponse } from '../types/thread.types.js';

export class DatabaseService {
  private pools: Map<string, Pool> = new Map();
  public verbose: boolean;

  constructor() {
    // Check if verbose logging is enabled
    this.verbose = process.env.DATABASE_VERBOSE === 'true';
    
    // Cleanup pools on process exit
    process.on('SIGINT', () => this.closeAllPools());
    process.on('SIGTERM', () => this.closeAllPools());
  }

  private getPool(agent: Agent): Pool {
    if (!this.pools.has(agent.name)) {
      // Parse the connection string to check if it's Azure PostgreSQL
      const isAzure = agent.database_connection_string.includes('.database.azure.com');
      
      const pool = new Pool({
        connectionString: agent.database_connection_string,
        max: 10, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: isAzure ? 30000 : 10000, // Azure needs more time (30s), others 10s
        statement_timeout: 30000, // Statement timeout 30 seconds
        query_timeout: 30000, // Query timeout 30 seconds
        ssl: isAzure ? {
          rejectUnauthorized: false, // For Azure PostgreSQL
          requestCert: true
        } : {
          rejectUnauthorized: false
        }
      });

      // Handle pool errors
      pool.on('error', (err) => {
        console.error(`Database pool error for agent ${agent.name}:`, err);
        // Log additional details for Azure connection issues
        if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
          console.error('Connection timeout - possible causes:');
          console.error('- Azure PostgreSQL firewall rules may need to be updated');
          console.error('- Network connectivity issues');
          console.error('- SSL/TLS configuration mismatch');
        }
      });

      // Monitor pool connections
      pool.on('connect', () => {
        console.log(`New connection established for agent ${agent.name}`);
      });

      pool.on('acquire', () => {
        const poolStats = {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        };
        console.log(`Connection acquired for agent ${agent.name}. Pool stats:`, poolStats);
      });

      this.pools.set(agent.name, pool);
    }

    return this.pools.get(agent.name)!;
  }

  private logQuery(query: string, params: any[], duration: number, rowCount?: number) {
    if (!this.verbose) return;
    
    console.log('\n--- SQL Query Executed ---');
    console.log('Query:', query.trim());
    console.log('Parameters:', params);
    console.log('Duration:', `${duration}ms`);
    if (rowCount !== undefined) {
      console.log('Rows affected:', rowCount);
    }
    console.log('-------------------------\n');
  }

  private async executeQuery(client: PoolClient, query: string, params: any[] = []): Promise<any> {
    const startTime = Date.now();
    try {
      const result = await client.query(query, params);
      const duration = Date.now() - startTime;
      this.logQuery(query, params, duration, result.rowCount);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.verbose) {
        console.error('\n--- SQL Query Failed ---');
        console.error('Query:', query.trim());
        console.error('Parameters:', params);
        console.error('Duration:', `${duration}ms`);
        console.error('Error:', error);
        console.error('------------------------\n');
      }
      throw error;
    }
  }

  async getThreads(
    agent: Agent,
    page: number = 1,
    limit: number = 50,
    includeRetrievedDocs: boolean = false,
    fromDate?: Date,
    toDate?: Date
  ): Promise<ThreadPaginatedResponse> {
    console.log(`Attempting to connect to database for agent: ${agent.name}`);
    console.log(`Connection string: ${agent.database_connection_string.replace(/:[^:@]+@/, ':****@')}`); // Log with masked password
    
    const pool = this.getPool(agent);
    let client: PoolClient | null = null;

    try {
      console.log('Acquiring database connection...');
      
      // Add retry logic for connection
      let connectionAttempts = 0;
      const maxAttempts = 3;
      let lastError: Error | null = null;
      
      while (connectionAttempts < maxAttempts) {
        try {
          connectionAttempts++;
          console.log(`Connection attempt ${connectionAttempts}/${maxAttempts}...`);
          client = await pool.connect();
          console.log('Database connection acquired successfully');
          break;
        } catch (error) {
          lastError = error as Error;
          console.error(`Connection attempt ${connectionAttempts} failed:`, error);
          
          if (connectionAttempts < maxAttempts) {
            // Wait before retrying (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, connectionAttempts - 1), 5000);
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      if (!client) {
        throw lastError || new Error('Failed to acquire database connection after multiple attempts');
      }
      
      // Calculate offset
      const offset = (page - 1) * limit;

      // Build WHERE clause for date filtering
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramCounter = 1;

      if (fromDate) {
        whereConditions.push(`created_at >= $${paramCounter}`);
        queryParams.push(fromDate.toISOString());
        paramCounter++;
      }

      if (toDate) {
        whereConditions.push(`created_at <= $${paramCounter}`);
        queryParams.push(toDate.toISOString());
        paramCounter++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count with date filtering
      const countQuery = `SELECT COUNT(*) FROM thread ${whereClause}`;
      const countResult = await this.executeQuery(client, countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count, 10);

      // Add pagination parameters
      queryParams.push(limit);
      queryParams.push(offset);

      // Get paginated threads with date filtering
      const threadsQuery = `SELECT 
          thread_id,
          created_at,
          updated_at,
          metadata,
          status,
          config,
          values,
          interrupts
        FROM thread 
        ${whereClause}
        ORDER BY created_at DESC NULLS LAST
        LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
      
      const threadsResult = await this.executeQuery(client, threadsQuery, queryParams);

      let threads: Thread[] = threadsResult.rows;
      
      // Remove retrieved_docs from values if not requested
      if (!includeRetrievedDocs) {
        threads = threads.map(thread => {
          if (thread.values && typeof thread.values === 'object' && 'retrieved_docs' in thread.values) {
            // Create a copy of the thread with values modified
            const { retrieved_docs, ...valuesWithoutDocs } = thread.values;
            return {
              ...thread,
              values: valuesWithoutDocs
            };
          }
          return thread;
        });
      }
      
      const totalPages = Math.ceil(total / limit);

      return {
        threads,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      console.error(`Error fetching threads for agent ${agent.name}:`, error);
      throw new Error(`Failed to fetch threads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async testConnection(agent: Agent): Promise<boolean> {
    const pool = this.getPool(agent);
    let client: PoolClient | null = null;

    try {
      client = await pool.connect();
      await this.executeQuery(client, 'SELECT 1');
      return true;
    } catch (error) {
      console.error(`Connection test failed for agent ${agent.name}:`, error);
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getThreadDocuments(agent: Agent, threadId: string): Promise<any> {
    const pool = this.getPool(agent);
    let client: PoolClient | null = null;

    try {
      client = await pool.connect();
      
      const query = `SELECT values->'retrieved_docs' as documents 
                     FROM thread 
                     WHERE thread_id = $1`;
      
      const result = await this.executeQuery(client, query, [threadId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].documents || [];
    } catch (error) {
      console.error(`Error fetching documents for thread ${threadId}:`, error);
      throw new Error(`Failed to fetch documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getThreadRuns(
    agent: Agent,
    threadId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<RunsPaginatedResponse> {
    console.log(`Fetching runs for thread: ${threadId} from agent: ${agent.name}`);
    
    const pool = this.getPool(agent);
    let client: PoolClient | null = null;

    try {
      client = await pool.connect();
      
      // Calculate offset
      const offset = (page - 1) * limit;

      // Get total count - note the table is 'run' not 'runs'
      const countQuery = `SELECT COUNT(*) FROM run WHERE thread_id = $1::uuid`;
      const countResult = await this.executeQuery(client, countQuery, [threadId]);
      const total = parseInt(countResult.rows[0].count, 10);

      // Get paginated runs from the 'run' table
      const runsQuery = `SELECT 
          run_id::text as run_id,
          thread_id::text as thread_id,
          created_at,
          updated_at,
          status,
          metadata,
          kwargs as config,
          assistant_id::text as assistant_id,
          multitask_strategy
        FROM run 
        WHERE thread_id = $1::uuid
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3`;
      
      const runsResult = await this.executeQuery(client, runsQuery, [threadId, limit, offset]);
      
      const runs: Run[] = runsResult.rows.map(row => ({
        run_id: row.run_id,
        thread_id: row.thread_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        status: row.status,
        metadata: row.metadata,
        config: row.config,
        // Additional fields from the actual schema
        assistant_id: row.assistant_id,
        multitask_strategy: row.multitask_strategy
      }));
      
      const totalPages = Math.ceil(total / limit);

      return {
        runs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      console.error(`Error fetching runs for thread ${threadId}:`, error);
      throw new Error(`Failed to fetch runs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getThreadCheckpoints(
    agent: Agent,
    threadId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<CheckpointsPaginatedResponse> {
    console.log(`Fetching checkpoints for thread: ${threadId} from agent: ${agent.name}`);
    
    const pool = this.getPool(agent);
    let client: PoolClient | null = null;

    try {
      client = await pool.connect();
      
      // Calculate offset
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM checkpoints WHERE thread_id = $1::uuid`;
      const countResult = await this.executeQuery(client, countQuery, [threadId]);
      const total = parseInt(countResult.rows[0].count, 10);

      // Get paginated checkpoints
      const checkpointsQuery = `SELECT 
          thread_id::text as thread_id,
          checkpoint_id::text as checkpoint_id,
          run_id::text as run_id,
          parent_checkpoint_id::text as parent_checkpoint_id,
          checkpoint,
          metadata,
          checkpoint_ns
        FROM checkpoints 
        WHERE thread_id = $1::uuid
        ORDER BY checkpoint_id ASC
        LIMIT $2 OFFSET $3`;
      
      const checkpointsResult = await this.executeQuery(client, checkpointsQuery, [threadId, limit, offset]);
      
      const checkpoints: Checkpoint[] = checkpointsResult.rows;
      const totalPages = Math.ceil(total / limit);

      return {
        checkpoints,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      console.error(`Error fetching checkpoints for thread ${threadId}:`, error);
      throw new Error(`Failed to fetch checkpoints: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  private async closeAllPools(): Promise<void> {
    console.log('Closing all database pools...');
    const closePromises = Array.from(this.pools.entries()).map(async ([name, pool]) => {
      try {
        await pool.end();
        console.log(`Closed pool for agent: ${name}`);
      } catch (error) {
        console.error(`Error closing pool for agent ${name}:`, error);
      }
    });

    await Promise.all(closePromises);
    this.pools.clear();
  }

  async testConnection(agent: Agent): Promise<{ success: boolean; message: string; details?: any }> {
    const pool = this.getPool(agent);
    let client: PoolClient | null = null;

    try {
      console.log(`Testing database connection for agent: ${agent.name}`);
      const startTime = Date.now();
      
      client = await pool.connect();
      const connectTime = Date.now() - startTime;
      
      // Run a simple query to test the connection
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      const queryTime = Date.now() - startTime - connectTime;
      
      return {
        success: true,
        message: 'Database connection successful',
        details: {
          connectionTime: `${connectTime}ms`,
          queryTime: `${queryTime}ms`,
          totalTime: `${Date.now() - startTime}ms`,
          serverTime: result.rows[0].current_time,
          postgresVersion: result.rows[0].pg_version,
          poolStats: {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount
          }
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Database connection test failed for agent ${agent.name}:`, error);
      
      return {
        success: false,
        message: `Database connection failed: ${errorMessage}`,
        details: {
          error: errorMessage,
          suggestions: [
            'Check if the database server is accessible from your network',
            'Verify the connection string is correct',
            'Ensure Azure PostgreSQL firewall rules allow your IP',
            'Check if SSL is required and properly configured',
            'Verify database credentials are correct'
          ]
        }
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();