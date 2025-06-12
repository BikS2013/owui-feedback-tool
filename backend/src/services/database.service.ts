import { Pool, PoolClient } from 'pg';
import { Agent } from '../types/agent.types.js';
import { Thread, ThreadPaginatedResponse } from '../types/thread.types.js';

export class DatabaseService {
  private pools: Map<string, Pool> = new Map();

  constructor() {
    // Cleanup pools on process exit
    process.on('SIGINT', () => this.closeAllPools());
    process.on('SIGTERM', () => this.closeAllPools());
  }

  private getPool(agent: Agent): Pool {
    if (!this.pools.has(agent.name)) {
      const pool = new Pool({
        connectionString: agent.database_connection_string,
        max: 10, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection cannot be established
        ssl: {
          rejectUnauthorized: false // For Azure PostgreSQL
        }
      });

      // Handle pool errors
      pool.on('error', (err) => {
        console.error(`Database pool error for agent ${agent.name}:`, err);
      });

      this.pools.set(agent.name, pool);
    }

    return this.pools.get(agent.name)!;
  }

  async getThreads(
    agent: Agent,
    page: number = 1,
    limit: number = 50,
    includeRetrievedDocs: boolean = false
  ): Promise<ThreadPaginatedResponse> {
    console.log(`Attempting to connect to database for agent: ${agent.name}`);
    console.log(`Connection string: ${agent.database_connection_string.replace(/:[^:@]+@/, ':****@')}`); // Log with masked password
    
    const pool = this.getPool(agent);
    let client: PoolClient | null = null;

    try {
      console.log('Acquiring database connection...');
      client = await pool.connect();
      console.log('Database connection acquired successfully');
      
      // Calculate offset
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await client.query('SELECT COUNT(*) FROM thread');
      const total = parseInt(countResult.rows[0].count, 10);

      // Get paginated threads
      const threadsResult = await client.query(
        `SELECT 
          thread_id,
          created_at,
          updated_at,
          metadata,
          status,
          config,
          values,
          interrupts
        FROM thread 
        ORDER BY created_at DESC NULLS LAST
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

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
      await client.query('SELECT 1');
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
}

// Export singleton instance
export const databaseService = new DatabaseService();