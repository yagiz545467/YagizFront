import { heartbeat,realtimeCommand } from '@/game/realtime';
import { applyCommand,viewFor } from '@/game/engine';
import type { Room,Command } from '@/game/types';
import { requireSession,sameOrigin,HttpError,rateLimit } from '@/server/auth';
import { get,compareSwap,update } from '@/server/store';
import { body,json,error } from '@/server/http';
export const runtime='nodejs';
type Context={params:Promise<{code:string}>};
async function load(code:string) { if(!/^[A-F0-9]{6}$/.test(code)) throw new HttpError(404,'Oda bulunamadı.'); const record=await get<Room>(`room:${code}`); if(!record) throw new HttpError(404,'Oda bulunamadı.'); return record; }
export async function GET(_req:Request,ctx:Context) { try { const s=await requireSession(); const {code}=await ctx.params; const rec=await load(code);const room=rec.value.sim?await update(`room:${code}`,rec.value,r=>heartbeat(r,s.id,Date.now())):rec.value;return json({room:viewFor(room,s.id)}); } catch(e) { return error(e); } }
export async function POST(req:Request,ctx:Context) { try {
  sameOrigin(req); const s=await requireSession(); await rateLimit(req,`commands:${s.id}`,90); const {code}=await ctx.params; const b=await body(req);
  if(typeof b.presence==='boolean'){const rec=await load(code);const room=await update(`room:${code}`,rec.value,r=>heartbeat(r,s.id,Date.now(),b.presence as boolean));return json({room:viewFor(room,s.id)});}
  if(typeof b.commandId!=='string'||!Number.isInteger(b.version)||!b.command||typeof b.command!=='object'||Array.isArray(b.command)) throw new HttpError(400,'Geçersiz hamle.');
  const rec=await load(code); if(rec.value.sim){const next=await update(`room:${code}`,rec.value,r=>realtimeCommand(heartbeat(r,s.id,Date.now()),s.id,b.commandId as string,b.version as number,b.command as Command));return json({room:viewFor(next,s.id)});}
  const next=applyCommand(rec.value,s.id,b.commandId,b.version as number,b.command as Command);
  if(next!==rec.value && !await compareSwap(`room:${code}`,rec.version,next)) throw new HttpError(409,'Başka bir hamle kaydedildi. Oyun güncellendikten sonra tekrar dene.');
  return json({room:viewFor(next,s.id)});
} catch(e) { return error(e); } }
