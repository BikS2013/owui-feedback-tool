import { Pool } from 'pg';

const connectionString = "postgresql://owuiadmin:123Serv321@556openwebui-postgresql.postgres.database.azure.com:5432/threads_backup";

async function testConnection() {
  console.log('Testing database connection...');
  console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@'));
  
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000 // 10 seconds timeout
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('Current time from database:', result.rows[0].now);
    
    // Check if thread table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'thread'
      );
    `);
    console.log('Thread table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Count threads
      const countResult = await client.query('SELECT COUNT(*) FROM thread');
      console.log('Number of threads:', countResult.rows[0].count);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    await pool.end();
  }
}

testConnection();