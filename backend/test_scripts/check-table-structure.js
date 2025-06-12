import { Pool } from 'pg';

const connectionString = "postgresql://owuiadmin:123Serv321@556openwebui-postgresql.postgres.database.azure.com:5432/threads_backup";

async function checkTableStructure() {
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    
    // Get table columns
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'thread'
      ORDER BY ordinal_position;
    `);
    
    console.log('Thread table structure:');
    console.log('------------------------');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Get a sample row
    const sampleResult = await client.query('SELECT * FROM thread LIMIT 1');
    console.log('\nSample row:');
    console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();