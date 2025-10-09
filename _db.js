const { Pool } = require('pg');

// Reuse one pool across invocations
const globalForPool = globalThis;
if (!globalForPool.pgPool) {
  globalForPool.pgPool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false } // force TLS even if URL lacks ?sslmode=require
  });
}
module.exports = { pool: globalForPool.pgPool };
