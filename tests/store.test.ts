import {beforeAll,describe,it,expect} from 'vitest';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {get,insert,compareSwap,update} from '../src/server/store';
beforeAll(()=>{process.env.YF_DATA_DIR=mkdtempSync(join(tmpdir(),'yf-tests-'));delete process.env.DATABASE_URL;});
describe('durable optimistic persistence',()=>{
  it('only accepts one writer for the same version',async()=>{await insert('race',{gold:100});const results=await Promise.all([compareSwap('race',0,{gold:50}),compareSwap('race',0,{gold:75})]);expect(results.filter(Boolean)).toHaveLength(1);expect((await get('race'))?.version).toBe(1);});
  it('retrieves saved state without depending on a player connection',async()=>{await insert('saved',{turn:45,players:['a','b']});expect((await get('saved'))?.value).toEqual({turn:45,players:['a','b']});});
  it('serializes simultaneous membership additions',async()=>{await Promise.all(['a','b','c','d'].map(id=>update<string[]>('members',[],v=>[...v,id])));expect((await get<string[]>('members'))?.value.sort()).toEqual(['a','b','c','d']);});
});
