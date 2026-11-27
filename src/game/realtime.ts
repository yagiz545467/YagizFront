import { applyCommand,beginTurn,capture,createRoom,RuleError,viewFor,owned,winner } from './engine';
import { continents } from './continents';
import { neighbors } from './grid';
import { B } from './balance';
import type { Room,Command,Army,World } from './types';
export const RT={stepMs:1000,heartbeatMs:8000,economySeconds:30,expandCost:8,armyCost:25,maxArmies:12,buildingCosts:{barracks:160,farm:120,market:180,walls:200,shipyard:220}};
function need(ok:unknown,message:string):asserts ok {if(!ok)throw new RuleError(message);}
export function newRealtimeRoom(code:string,id:string,name:string,seed:number){const r=createRoom(code,id,name,seed);r.schema=2;r.world=continents(seed);r.sim={owners:Array(r.world.land.length).fill(-1),armies:[],buildings:{},seen:{},clock:0,last:0,paused:false,running:false};return r;}
export function pathTo(w:World,start:number,end:number,ships:number) {
  if(!Number.isInteger(end)||end<0||end>=w.land.length)return null;
  const parent=new Int32Array(w.land.length).fill(-2),queue=[start];parent[start]=-1;
  for(let i=0;i<queue.length;i++){const t=queue[i];if(t===end){const path:number[]=[];let n=end;while(n!==start){path.push(n);n=parent[n];}return path.reverse();}for(const n of neighbors(t,w.width,w.height))if(parent[n]===-2&&(w.land[n]||ships>0)){parent[n]=t;queue.push(n);}}
  return null;
}
function claim(r:Room,tile:number,owner:number,radius=1){const s=r.sim!;let frontier=[tile];const seen=new Set<number>();for(let i=0;i<=radius;i++){const next:number[]=[];for(const t of frontier){if(seen.has(t)||!r.world.land[t]||r.world.cities.some(c=>c.tile===t&&c.owner!==r.players[owner]?.id))continue;seen.add(t);if(s.owners[t]<0||s.owners[t]===owner)s.owners[t]=owner;next.push(...neighbors(t,r.world.width,r.world.height));}frontier=next;}}
function syncOwners(r:Room){const s=r.sim!;for(let i=0;i<s.owners.length;i++)if(s.owners[i]>=0&&!r.players[s.owners[i]]?.alive)s.owners[i]=-1;s.armies=s.armies.filter(a=>r.players.find(p=>p.id===a.owner)?.alive&&a.troops>0);for(const c of r.world.cities)if(c.owner)s.owners[c.tile]=r.players.findIndex(p=>p.id===c.owner);}
function strength(a:Army,enemy:Army){const counters:Record<string,string>={attack:'siege',defend:'attack',siege:'defend',crescent:'attack',feint:'crescent'};return a.troops*Math.max(.5,1-a.fatigue*.004)*(counters[a.tactic??'attack']===enemy.tactic?B.counterBonus:1)*(a.tactic==='defend'?1.15:1);}
function tick(r:Room){const s=r.sim!;s.clock++;
  for(const a of s.armies){if(a.troops<=0||r.phase!=='playing')continue;if(!a.path.length){a.fatigue=Math.max(0,a.fatigue-1);continue;}const next=a.path[0];const enemy=s.armies.find(b=>b.owner!==a.owner&&b.troops>0&&(b.tile===next||neighbors(a.tile,r.world.width,r.world.height).includes(b.tile)));
    if(enemy){const left=strength(a,enemy),right=strength(enemy,a);const lossA=Math.max(1,Math.ceil(right*.07)),lossB=Math.max(1,Math.ceil(left*.07));a.troops-=lossA;enemy.troops-=lossB;a.fatigue=Math.min(100,a.fatigue+2);if(enemy.troops>0)continue;}
    if(a.troops<=0)continue;
    const c=r.world.cities.find(c=>c.tile===next&&!c.fallout);if(c&&c.owner!==a.owner){const wall=(s.buildings[c.id]??[]).includes('walls')?1.5:1;const loss=Math.max(1,Math.ceil(c.troops*.08*wall));c.troops=Math.max(0,c.troops-Math.max(1,Math.ceil(a.troops*.08*(a.tactic==='siege'?1.5:1))));a.troops-=loss;if(a.troops<=0||c.troops>0)continue;const p=r.players.find(p=>p.id===a.owner)!;capture(r,c,p,a.troops);a.troops=c.troops;c.troops=1;}
    a.tile=next;a.path.shift();a.fatigue=Math.min(100,a.fatigue+.2);if(r.world.land[next]){s.owners[next]=r.players.findIndex(p=>p.id===a.owner);claim(r,next,s.owners[next]);}}
  if(s.clock%RT.economySeconds===0){for(const p of r.players.filter(p=>p.alive)){beginTurn(r,p);for(const c of owned(r,p.id)){const buildings=s.buildings[c.id]??[];if(buildings.includes('farm'))p.gold+=20;if(buildings.includes('market'))p.gold+=35;if(buildings.includes('barracks'))c.troops+=15;}}
    r.round++;}
  syncOwners(r);winner(r);r.actions=0;
}
// No offline catch-up: the first request after an expired lease only resumes.
// A shared CAS update makes simultaneous heartbeats advance the clock once.
export function heartbeat(original:Room,id:string,now:number,online=true):Room {
  if(!original.sim)return original;const r=structuredClone(original),s=r.sim!;need(r.players.some(p=>p.id===id),'Bu odanın oyuncusu değilsin.');
  // Only untouched lobbies can safely replace the former generated islands.
  if(r.phase==='lobby'&&r.world.mapId!=='openfront-world-v1'){r.world=continents(r.seed);s.owners=Array(r.world.land.length).fill(-1);}
  const wasOnline=r.players.filter(p=>p.alive).every(p=>now-(s.seen[p.id]??0)<RT.heartbeatMs);
  s.seen[id]=online?now:0;const allOnline=r.players.filter(p=>p.alive).every(p=>now-(s.seen[p.id]??0)<RT.heartbeatMs);
  if(!online||!allOnline||!wasOnline||s.paused||r.phase!=='playing'){s.last=now;s.running=allOnline&&!s.paused&&r.phase==='playing';r.version++;return r;}
  const steps=Math.min(3,Math.floor((now-s.last)/RT.stepMs));for(let i=0;i<steps&&r.phase==='playing';i++)tick(r);s.last=steps?now:s.last;s.running=true;r.version++;return r;
}
export function realtimeCommand(original:Room,actor:string,key:string,version:number,cmd:Command):Room {
  if(!original.sim)return applyCommand(original,actor,key,version,cmd);
  need(/^[\w-]{8,80}$/.test(key),'Geçersiz komut kimliği.');if(original.commands.includes(`${actor}:${key}`))return original;
  // Heartbeats may change the view version. Legality is checked on the current
  // serialized server state, not on a client snapshot or client-supplied time.
  let r=structuredClone(original);let s=r.sim!;const p=r.players.find(p=>p.id===actor);need(p,'Oyuncu bulunamadı.');
  if(['ready','start','draft','capital'].includes(cmd.type)){
    const oldWorld=r.world;r=applyCommand(r,actor,key,r.version,cmd);s=r.sim!;
    if(cmd.type==='start')r.world=oldWorld;
    if(cmd.type==='draft'&&cmd.city!==undefined)claim(r,r.world.cities[cmd.city].tile,r.players.findIndex(p=>p.id===actor),3);
    if(cmd.type==='capital'&&r.phase==='playing'){s.last=Date.now();r.actions=0;for(const p of r.players){p.gold=B.initialGold;p.visits=0;p.events=[];}for(const c of r.world.cities)if(c.owner)c.troops=B.initialTroops;}return r;
  }
  need(r.phase==='playing'&&p.alive,'Maç başlamadı veya hanedanın elendi.');
  if(cmd.type==='pause'){need(r.host===actor,'Yalnızca oda sahibi duraklatabilir.');s.paused=!s.paused;s.running=false;}
  else {
    need(s.running&&!s.paused,'Tüm yaşayan oyuncular çevrim içi olduğunda oyun devam eder.');
    const c=r.world.cities.find(c=>c.id===cmd.city);
    const spend=(gold:number)=>{need(p.gold>=gold,`${gold} altın gerekiyor.`);p.gold-=gold;};
    if(cmd.type==='expand'){const t=cmd.tile;need(Number.isInteger(t)&&t!>=0&&t!<s.owners.length&&r.world.land[t!]&&s.owners[t!]===-1,'Sahipsiz bir kara noktası seç.');const index=r.players.indexOf(p);need(neighbors(t!,r.world.width,r.world.height).some(n=>s.owners[n]===index),'Kendi sınırına bitişik toprağı seç.');need(!r.world.cities.some(c=>c.tile===t&&c.owner!==actor),'Şehirleri ordunla kuşatmalısın.');spend(RT.expandCost);claim(r,t!,index,2);}
    else if(cmd.type==='raise'){need(c?.owner===actor&&!c.fallout,'Kendi şehrini seç.');need(Number.isInteger(cmd.amount)&&cmd.amount!>=5&&cmd.amount!<c.troops,'Şehirde en az bir asker bırak.');need(s.armies.filter(a=>a.owner===actor).length<RT.maxArmies,'En fazla 12 ordu kurulabilir.');spend(RT.armyCost);const ships=c.port?c.ships:0;need(!ships||cmd.amount!<=ships*B.shipCapacity,'Donanma kapasitesi yetersiz.');c.ships-=ships;c.troops-=cmd.amount!;s.armies.push({id:key,owner:actor,tile:c.tile,troops:cmd.amount!,path:[],ships,tactic:'attack',fatigue:0});}
    else if(cmd.type==='order'){const a=s.armies.find(a=>a.id===cmd.army&&a.owner===actor);need(a,'Kendi ordunu seç.');if(cmd.choice==='stop')a.path=[];else{const path=pathTo(r.world,a.tile,cmd.tile!,a.ships);need(path,'Bu hedefe yol yok. Deniz geçişi için gemili bir ordu gerekiyor.');a.path=path;}if(cmd.tactic){need(['attack','defend','siege','crescent','feint'].includes(cmd.tactic),'Geçersiz taktik.');a.tactic=cmd.tactic;}}
    else if(cmd.type==='building'){need(c?.owner===actor&&!c.fallout,'Kendi şehrini seç.');need(cmd.kind&&Object.hasOwn(RT.buildingCosts,cmd.kind),'Bina türü geçersiz.');need(!(s.buildings[c.id]??[]).includes(cmd.kind),'Bina zaten var.');if(cmd.kind==='shipyard')need(c.port,'Tersane için liman gerekiyor.');spend(RT.buildingCosts[cmd.kind as keyof typeof RT.buildingCosts]);(s.buildings[c.id]??=[]).push(cmd.kind);}
    else {
      need(!['end','attack','move','defend','pursue','settle'].includes(cmd.type),'Bu komut yeni oyun modunda kullanılmaz.');need(!(cmd.type==='event'&&cmd.choice==='investigate'),'Araştırma seçeneği kaldırıldı.');
      const savedActive=r.active;r.active=r.players.indexOf(p);r.actions=1;
      if(cmd.type==='build'&&cmd.kind==='ship'){need(c&&(s.buildings[c.id]??[]).includes('shipyard'),'Gemi yapmadan önce tersane kur.');}
      r=applyCommand(r,actor,key,r.version,cmd);s=r.sim!;r.active=savedActive;r.actions=0;
      syncOwners(r);return r;
    }
  }
  r.version++;r.commands.push(`${actor}:${key}`);syncOwners(r);return r;
}
export const realtimeView=(r:Room,id:string)=>viewFor(r,id);
