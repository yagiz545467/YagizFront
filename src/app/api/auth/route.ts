import { authenticate, recover, session, logout, sameOrigin, rateLimit } from '@/server/auth';
import { body,json,error } from '@/server/http';
export const runtime='nodejs';
export async function GET() { try { return json({identity:await session()}); } catch(e) { return error(e); } }
export async function POST(req:Request) { try { sameOrigin(req); await rateLimit(req,'auth'); const b=await body(req); return json(b.recovery ? {identity:await recover(b.recovery)} : await authenticate(b.password,b.name)); } catch(e) { return error(e); } }
export async function DELETE(req:Request) { try { sameOrigin(req); await logout(); return json({ok:true}); } catch(e) { return error(e); } }
