import { randomBytes } from 'node:crypto';
import { createRoom,joinRoom,viewFor } from '@/game/engine';
import type { Room } from '@/game/types';
import { requireSession,sameOrigin,rateLimit,HttpError } from '@/server/auth';
import { get,insert,update } from '@/server/store';
import { body,json,error } from '@/server/http';
export const runtime='nodejs';
export async function GET() { try { const s=await requireSession(); const index=await get<string[]>(`rooms:${s.id}`); const rooms=await Promise.all((index?.value??[]).map(code=>get<Room>(`room:${code}`))); return json({rooms:rooms.filter(r=>r&&r.value.players.some(p=>p.id===s.id)).map(r=>({code:r!.value.code,phase:r!.value.phase,players:r!.value.players.length,round:r!.value.round}))}); } catch(e) { return error(e); } }
export async function POST(req:Request) { try {
  sameOrigin(req); const s=await requireSession(); await rateLimit(req,'rooms',20); const b=await body(req); let room:Room;
  if(b.code) { const code=String(b.code).trim().toUpperCase(); if(!/^[A-F0-9]{6}$/.test(code)) throw new HttpError(400,'Oda kodu 6 karakter olmalı.');
    const record=await get<Room>(`room:${code}`); if(!record) throw new HttpError(404,'Bu kodda bir oda yok.');
    room=await update(`room:${code}`,record.value,r=>{ const before=r.players.length; joinRoom(r,s.id,s.name); if(r.players.length!==before) r.version++; return r; });
  } else { let created:Room|null=null; for(let i=0;i<5;i++) { const code=randomBytes(3).toString('hex').toUpperCase(); const candidate=createRoom(code,s.id,s.name,randomBytes(4).readUInt32LE()); if(await insert(`room:${code}`,candidate)) { created=candidate; break; } } if(!created) throw new HttpError(503,'Oda oluşturulamadı. Tekrar dene.'); room=created; }
  await update<string[]>(`rooms:${s.id}`,[],codes=>[room.code,...codes.filter(c=>c!==room.code)].slice(0,50)); return json({room:viewFor(room,s.id)});
} catch(e) { return error(e); } }
