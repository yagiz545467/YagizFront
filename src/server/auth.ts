import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { get, insert, update } from './store';
export type Identity={id:string;name:string};
export class HttpError extends Error { constructor(public status:number,message:string) { super(message); } }
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function secret() { const s=process.env.SESSION_SECRET; if(!s||s.length<32) throw new HttpError(503,'Sunucuda SESSION_SECRET yapılandırılmalı (en az 32 karakter).'); return s; }
const cookieName='yf_session';
export async function setSession(identity:Identity) {
  const value=Buffer.from(JSON.stringify({...identity,expires:Date.now()+30*86400000})).toString('base64url');
  const signature=createHmac('sha256',secret()).update(value).digest('base64url');
  (await cookies()).set(cookieName,`${value}.${signature}`,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:30*86400});
}
export async function session():Promise<Identity|null> {
  const token=(await cookies()).get(cookieName)?.value; if(!token) return null;
  try { const [data,sig]=token.split('.'); const expected=createHmac('sha256',secret()).update(data).digest(); const actual=Buffer.from(sig,'base64url');
    if(actual.length!==expected.length || !timingSafeEqual(actual,expected)) return null;
    const parsed=JSON.parse(Buffer.from(data,'base64url').toString());
    if(typeof parsed.id!=='string'||typeof parsed.name!=='string'||parsed.expires<Date.now()) return null;
    return {id:parsed.id,name:parsed.name};
  } catch { return null; }
}
export async function requireSession() { const s=await session(); if(!s) throw new HttpError(401,'Oturumun sona erdi. Giriş yap veya kurtarma kodunu kullan.'); return s; }
export async function logout() { (await cookies()).delete(cookieName); }
export async function authenticate(password:unknown,name:unknown) {
  const expected=process.env.GAME_PASSWORD; if(!expected) throw new HttpError(503,'Sunucuda GAME_PASSWORD tanımlanmamış.');
  if(typeof password!=='string'||!timingSafeEqual(Buffer.from(hash(password)),Buffer.from(hash(expected)))) throw new HttpError(401,'Giriş şifresi yanlış.');
  if(typeof name!=='string'||name.trim().length<2||name.trim().length>24||/[<>\x00-\x1F]/.test(name)) throw new HttpError(400,'Hanedan adı 2–24 karakter olmalı.');
  const identity={id:randomUUID(),name:name.trim()}, recovery=randomBytes(24).toString('base64url');
  await insert(`identity:${hash(recovery)}`,identity); await setSession(identity); return {identity,recovery};
}
export async function recover(code:unknown) { if(typeof code!=='string'||code.length>100) throw new HttpError(400,'Geçersiz kurtarma kodu.'); const record=await get<Identity>(`identity:${hash(code.trim())}`); if(!record) throw new HttpError(401,'Kurtarma kodu bulunamadı.'); await setSession(record.value); return record.value; }
export function sameOrigin(req:Request) {
  const origin=req.headers.get('origin'); if(!origin) return;
  let supplied:URL; try { supplied=new URL(origin); } catch { throw new HttpError(403,'Geçersiz istek kaynağı.'); }
  // Next may reconstruct request.url from the listener (0.0.0.0), while Host
  // retains the actual browser origin. Never accept an arbitrary forwarded host.
  const host=req.headers.get('host')??new URL(req.url).host;
  if(supplied.host!==host || !['http:','https:'].includes(supplied.protocol)) throw new HttpError(403,'Bu kaynaktan işlem yapılamaz.');
}
export async function rateLimit(req:Request,scope:string,limit=15) {
  const ip=req.headers.get('x-real-ip')??req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'local';
  const now=Date.now();
  const value=await update(`limit:${scope}:${hash(ip)}`,{count:0,until:now+60000},v=>v.until<now?{count:1,until:now+60000}:{...v,count:v.count+1});
  if(value.count>limit) throw new HttpError(429,'Çok fazla deneme yapıldı. Bir dakika bekleyip tekrar dene.');
}
