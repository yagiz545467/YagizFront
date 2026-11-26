import pg from 'pg';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000,max:1});
try { await pool.query('SELECT 1'); console.log('PostgreSQL bağlantısı başarılı.'); } finally { await pool.end(); }
