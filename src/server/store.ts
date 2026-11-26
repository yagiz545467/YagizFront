import { Pool } from 'pg';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

type RecordValue<T> = { value: T; version: number };
const globals = globalThis as typeof globalThis & { yfPool?: Pool; yfDb?: DatabaseSync; yfSchema?: Promise<unknown> };
async function driver() {
  if(process.env.DATABASE_URL) {
    globals.yfPool ??= new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:10000});
    globals.yfSchema ??= globals.yfPool.query('CREATE TABLE IF NOT EXISTS yagiz_records (key TEXT PRIMARY KEY, value JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 0)');
    try { await globals.yfSchema; } catch(e) { globals.yfSchema=undefined; throw e; }
    return {pg:globals.yfPool};
  }
  if(process.env.VERCEL || process.env.NODE_ENV==='production') throw new Error('DATABASE_URL yapılandırılmalı. Vercel için PostgreSQL bağlantısı ekle.');
  if(!globals.yfDb) {
    const { DatabaseSync } = await import('node:sqlite');
    const root=process.env.YF_DATA_DIR ?? join(process.cwd(),'.data'); mkdirSync(root,{recursive:true});
    globals.yfDb=new DatabaseSync(join(root,'yagizfront.sqlite'));
    globals.yfDb.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS yagiz_records (key TEXT PRIMARY KEY,value TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
  }
  return {sqlite:globals.yfDb};
}
export async function get<T>(key:string): Promise<RecordValue<T>|null> {
  const d=await driver();
  if(d.pg) { const r=await d.pg.query('SELECT value, version FROM yagiz_records WHERE key=$1',[key]); return r.rows[0]??null; }
  const row=d.sqlite!.prepare('SELECT value,version FROM yagiz_records WHERE key=?').get(key) as {value:string;version:number}|undefined;
  return row?{value:JSON.parse(row.value),version:row.version}:null;
}
export async function insert(key:string,value:unknown) {
  const d=await driver();
  if(d.pg) { const r=await d.pg.query('INSERT INTO yagiz_records(key,value) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',[key,JSON.stringify(value)]); return r.rowCount===1; }
  return d.sqlite!.prepare('INSERT OR IGNORE INTO yagiz_records(key,value) VALUES(?,?)').run(key,JSON.stringify(value)).changes===1;
}
export async function compareSwap(key:string,version:number,value:unknown) {
  const d=await driver();
  if(d.pg) { const r=await d.pg.query('UPDATE yagiz_records SET value=$1::jsonb,version=version+1 WHERE key=$2 AND version=$3',[JSON.stringify(value),key,version]); return r.rowCount===1; }
  return d.sqlite!.prepare('UPDATE yagiz_records SET value=?,version=version+1 WHERE key=? AND version=?').run(JSON.stringify(value),key,version).changes===1;
}
export async function update<T>(key:string,initial:T,fn:(value:T)=>T) {
  for(let i=0;i<12;i++) {
    const current=await get<T>(key);
    if(!current) { const v=fn(structuredClone(initial)); if(await insert(key,v)) return v; }
    else { const v=fn(structuredClone(current.value)); if(await compareSwap(key,current.version,v)) return v; }
  }
  throw new Error('Yoğun işlem nedeniyle kayıt yapılamadı. Tekrar dene.');
}
