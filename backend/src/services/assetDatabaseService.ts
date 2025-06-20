import { Pool } from 'pg';
import crypto from 'crypto';

interface AssetRecord {
  id: string;
  created_at: Date;
  owner_category: string;
  asset_category: string;
  owner_key: string;
  asset_key: string;
  description: string;
  data: any;
  data_hash: string;
}

interface AssetData {
  content: string;
  category?: string;
}

export class AssetDatabaseService {
  private pool: Pool | null = null;
  private ownerCategory: string;
  private ownerKey: string;

  constructor() {
    this.ownerCategory = process.env.ASSET_OWNER_CLASS || '';
    this.ownerKey = process.env.ASSET_OWNER_NAME || '';
    
    // Report configuration status on initialization
    const isConfigured = this.isConfigured();
    if (isConfigured) {
      console.log('📊 Asset Database: ✅ Configured');
      console.log(`   Owner: ${this.ownerKey} (${this.ownerCategory})`);
    } else {
      console.log('📊 Asset Database: ❌ Not configured (operating without database caching)');
    }
  }

  private ensureConnection(): Pool | null {
    if (!this.pool) {
      const connectionString = process.env.ASSET_DB;
      if (!connectionString) {
        // Silently return null if database not configured
        return null;
      }
      
      this.pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    }
    return this.pool;
  }

  private calculateHash(content: string): string {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    console.log(`[Asset DB] Calculated hash for content (length: ${content.length}): ${hash}`);
    return hash;
  }

  async getAsset(assetKey: string, assetCategory: string = 'general'): Promise<AssetRecord | null> {
    const pool = this.ensureConnection();
    if (!pool) {
      // Database not configured, silently return null
      return null;
    }
    
    try {
      const query = `
        SELECT id, created_at, owner_category, asset_category, owner_key, 
               asset_key, description, data, data_hash
        FROM public.asset
        WHERE owner_key = $1 AND asset_key = $2
      `;
      
      const result = await pool.query<AssetRecord>(query, [this.ownerKey, assetKey]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      return null;
    } catch (error) {
      // Silently handle connection errors, don't log
      return null;
    }
  }

  async storeAsset(assetKey: string, content: string, assetCategory: string = 'general'): Promise<void> {
    const pool = this.ensureConnection();
    if (!pool) {
      // Database not configured, silently return
      return;
    }
    
    // Always calculate hash based on the original content string
    const dataHash = this.calculateHash(content);
    const description = `Asset: ${assetKey}`;
    
    // Parse content as JSON if possible, otherwise store as text
    let data: any;
    try {
      data = JSON.parse(content);
    } catch {
      data = { content };
    }
    
    console.log(`[Asset DB] Storing asset: ${assetKey}`);
    console.log(`[Asset DB] Content hash: ${dataHash}`);

    try {
      // Check if asset already exists
      const existing = await this.getAsset(assetKey, assetCategory);
      
      if (existing) {
        // Debug logging
        console.log(`[Asset DB] Found existing asset: ${assetKey}`);
        console.log(`[Asset DB] Existing stored hash: ${existing.data_hash}`);
        console.log(`[Asset DB] New content hash: ${dataHash}`);
        console.log(`[Asset DB] Hashes match: ${existing.data_hash === dataHash}`);
        
        // Check if content has changed by comparing hashes
        if (existing.data_hash !== dataHash) {
          console.log(`[Asset DB] Content changed, updating...`);
          // Begin transaction
          await pool.query('BEGIN');
          
          try {
            // Copy current version to asset_log
            await pool.query(`
              INSERT INTO public.asset_log (
                asset_id, created_at, owner_category, asset_category,
                owner_key, asset_key, description, data, data_hash
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              existing.id,
              existing.created_at,
              existing.owner_category,
              existing.asset_category,
              existing.owner_key,
              existing.asset_key,
              existing.description,
              existing.data,
              existing.data_hash
            ]);
            
            // Update asset with new content
            await pool.query(`
              UPDATE public.asset
              SET data = $1, data_hash = $2, created_at = NOW(), asset_category = $3
              WHERE id = $4
            `, [data, dataHash, assetCategory, existing.id]);
            
            await pool.query('COMMIT');
            console.log(`[Asset DB] Successfully updated asset and created log entry`);
          } catch (error) {
            await pool.query('ROLLBACK');
            console.error(`[Asset DB] Error during update transaction:`, error);
            throw error;
          }
        }
        // Asset unchanged - no logging
      } else {
        // Insert new asset
        await pool.query(`
          INSERT INTO public.asset (
            owner_category, asset_category, owner_key, asset_key,
            description, data, data_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          this.ownerCategory,
          assetCategory,
          this.ownerKey,
          assetKey,
          description,
          data,
          dataHash
        ]);
        
        console.log(`[Asset DB] New asset stored successfully`);
      }
    } catch (error) {
      console.error(`[Asset DB] Error in storeAsset:`, error);
      // Don't throw, just log the error
    }
  }

  async getAssetWithFallback(
    assetKey: string, 
    assetCategory: string = 'general',
    fetchFromSource: () => Promise<string>
  ): Promise<{ content: string; source: 'database' | 'github' }> {
    try {
      // Try to fetch from source (GitHub)
      const content = await fetchFromSource();
      
      // Store/update in database
      await this.storeAsset(assetKey, content, assetCategory);
      
      return { content, source: 'github' };
    } catch (error) {
      // If source fails, try database (silently, no logging)
      const dbAsset = await this.getAsset(assetKey, assetCategory);
      
      if (dbAsset) {
        // Extract content from JSONB data
        console.log(`[Asset DB] Fallback to database for: ${assetKey}`);
        console.log(`[Asset DB] Database data type: ${typeof dbAsset.data}`);
        console.log(`[Asset DB] Database data structure:`, Object.keys(dbAsset.data));
        
        let content: string;
        if (typeof dbAsset.data === 'string') {
          content = dbAsset.data;
        } else if (dbAsset.data.content) {
          content = dbAsset.data.content;
        } else {
          // If it's valid JSON data (not wrapped in content), return it as JSON string
          content = JSON.stringify(dbAsset.data);
        }
        
        console.log(`[Asset DB] Extracted content (length: ${content.length})`);
        return { content, source: 'database' };
      }
      
      // If not in database either, throw original error
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  isConfigured(): boolean {
    return !!(process.env.ASSET_DB && this.ownerCategory && this.ownerKey);
  }
}

// Export singleton instance
let instance: AssetDatabaseService | null = null;

export const getAssetDatabaseService = (): AssetDatabaseService => {
  if (!instance) {
    instance = new AssetDatabaseService();
  }
  return instance;
};