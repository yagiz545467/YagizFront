import { NextResponse } from 'next/server';
import { RuleError } from '../game/engine';
import { HttpError } from './auth';
export async function body(req:Request):Promise<Record<string,unknown>> {
  const text=await req.text(); if(text.length>8192) throw new HttpError(413,'İstek çok büyük.');
  let result; try { result=JSON.parse(text); } catch { throw new HttpError(400,'İstek biçimi geçersiz.'); }
  if(!result||typeof result!=='object'||Array.isArray(result)) throw new HttpError(400,'Geçersiz istek.'); return result;
}
export const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export function error(e:unknown) {
  if(e instanceof HttpError) return json({error:e.message},e.status);
  if(e instanceof RuleError) return json({error:e.message},409);
  console.error('YağızFront request failed:',e instanceof Error?e.message:'unknown');
  return json({error:'Sunucu kaydı tamamlayamadı. Bağlantını kontrol edip tekrar dene.'},503);
}
