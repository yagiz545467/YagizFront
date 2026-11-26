import { B, TACTICS, TECHS } from './balance';
import { adjacent, generateWorld, seaRoute } from './world';
import type { Room, Player, Command, City, Tactic, View, PersonalEvent } from './types';

export class RuleError extends Error { constructor(message: string) { super(message); this.name = 'RuleError'; } }
function need(ok: unknown, text: string): asserts ok { if (!ok) throw new RuleError(text); }
export function roll(r: Room) { r.rng = (Math.imul(r.rng, 1664525) + 1013904223) >>> 0; return r.rng / 4294967296; }
function log(r: Room, text: string) { r.log.push({id: (r.log.at(-1)?.id ?? 0) + 1, text}); r.log = r.log.slice(-100); }
function report(p: Player, text: string) { p.reports = [...p.reports, text].slice(-24); }
const colors = ['#8f9c71','#b27862','#6d9a9b','#c6ac6c','#9f8fa6','#8d9eb1','#c58f9c','#b2ab91'];
export function newPlayer(id: string, name: string, index: number): Player { return { id, name, color: colors[index], ready: false, gold: B.initialGold, capital: null, ruler: name, generation: 1, married: false, children: [], alive: true, exile: null, seekingAsylum: false, security: 0, research: 0, tech: 0, atomic: false, visits: 0, events: [], reports: [] }; }
export function createRoom(code: string, id: string, name: string, seed: number): Room {
  return {schema: 1, code, host: id, phase: 'lobby', version: 0, seed, rng: seed >>> 0, players: [newPlayer(id,name,0)], world: generateWorld(seed,8), draft: [], draftIndex: 0, active: 0, round: 1, actions: B.actions, battle: null, missions: [], treaties: [], log: [], winner: null, commands: [], createdAt: new Date().toISOString()};
}
export function joinRoom(r: Room, id: string, name: string) {
  if (r.players.some(p=>p.id===id)) return;
  need(r.phase==='lobby','Bu maç başladı. Yalnızca mevcut oyuncular dönebilir.');
  need(r.players.length<B.players.max,'Oda dolu. En fazla 8 kişi oynayabilir.');
  need(!r.players.some(p=>p.name.toLocaleLowerCase('tr')===name.toLocaleLowerCase('tr')),'Bu odada aynı isimde bir oyuncu var.');
  r.players.push(newPlayer(id,name,r.players.length)); log(r,`${name} odaya katıldı.`);
}
export const owned = (r: Room, id: string) => r.world.cities.filter(c=>c.owner===id);
function player(r: Room, id?: string) { const p = r.players.find(p=>p.id===id); need(p,'Oyuncu bulunamadı.'); return p; }
function city(r: Room, id?: number) { need(Number.isInteger(id),'Bir şehir seç.'); const c = r.world.cities.find(c=>c.id===id); need(c,'Şehir bulunamadı.'); return c; }
function mine(r: Room, p: Player, id?: number) { const c = city(r,id); need(c.owner===p.id,'Bu şehir sana ait değil.'); need(!c.fallout,'Bu bölge nükleer serpinti altında.'); return c; }
function pay(p: Player, amount: number) { need(p.gold>=amount,`Bu işlem için ${amount} altın gerekiyor.`); p.gold -= amount; }
function action(r: Room, p: Player) { need(r.phase==='playing','Maç henüz başlamadı.'); need(p.alive,'Hanedanın elendi.'); need(r.players[r.active]?.id===p.id,'Şu an başka bir oyuncunun sırası.'); need(!r.battle,'Önce devam eden savaşı sonuçlandırın.'); need(!p.seekingAsylum,'Önce sığınma taleplerinin yanıtını bekle.'); need(r.actions>0,'Eylem hakkın kalmadı. Turunu bitirebilirsin.'); r.actions--; }
function winner(r: Room) {
  const alive = r.players.filter(p=>p.alive);
  if (alive.length<=1 && r.phase==='playing') { r.phase='finished'; r.winner=alive[0]?.id ?? null; r.battle=null; log(r,alive[0] ? `${alive[0].name} hanedanı kazandı.` : 'Hayatta kalan hanedan yok.'); }
}
function eliminate(r: Room, p: Player) {
  p.alive=false; p.events=[]; p.exile=null; p.seekingAsylum=false;
  owned(r,p.id).forEach(c=>{ c.owner=null; });
  r.missions=r.missions.filter(m=>m.actor!==p.id && m.target!==p.id);
  r.treaties=r.treaties.filter(t=>t.from!==p.id && t.to!==p.id);
  log(r,`${p.name} hanedanının hükmü sona erdi.`);
  for(const guest of r.players.filter(g=>g.alive && g.exile===p.id)) { guest.exile=null; seekAsylum(r,guest); }
  for(const guest of r.players.filter(g=>g.alive && g.seekingAsylum)) if(!r.treaties.some(t=>t.kind==='asylum' && t.from===guest.id)) eliminate(r,guest);
  winner(r);
}
export function rulerDies(r: Room, p: Player) {
  if (!p.children.length) { eliminate(r,p); return; }
  p.ruler=p.children.shift()!; p.generation++; p.married=false;
  log(r,`${p.name} hanedanında ${p.ruler} tahta geçti.`);
  if(p.children.length && owned(r,p.id).length>1 && roll(r)<B.revoltChance) {
    const c=owned(r,p.id).find(c=>c.id!==p.capital)!; c.owner=null; c.troops=Math.max(20,Math.floor(c.troops/2));
    p.children.pop(); log(r,`${c.name}, taht kavgasında bağımsızlığını ilan etti.`);
  }
}
function seekAsylum(r: Room, p: Player) {
  if(!p.alive || owned(r,p.id).length || p.exile) return;
  p.capital=null; p.seekingAsylum=true;
  r.treaties=r.treaties.filter(t=>!(t.kind==='asylum' && t.from===p.id));
  for(const host of r.players.filter(h=>h.id!==p.id && h.alive && owned(r,h.id).length)) r.treaties.push({id:`asylum-${p.id}-${host.id}-${r.version}`,from:p.id,to:host.id,kind:'asylum',accepted:false});
  if(!r.treaties.some(t=>t.kind==='asylum' && t.from===p.id)) eliminate(r,p);
  else log(r,`${p.name} hanedanı sığınacak bir ülke arıyor.`);
}
function capture(r: Room, c: City, p: Player, troops: number) {
  const old=c.owner ? player(r,c.owner) : null;
  c.owner=p.id; c.troops=Math.max(1,troops); c.fatigue=B.battleFatigue; c.morale=80;
  p.exile=null; p.seekingAsylum=false; r.treaties=r.treaties.filter(t=>!(t.kind==='asylum' && t.from===p.id));
  if(p.capital===null) p.capital=c.id;
  log(r,`${p.name}, ${c.name} şehrini ele geçirdi.`);
  if(old) {
    if(old.capital===c.id) { if(roll(r)<B.rulerCaptureRisk) rulerDies(r,old); old.capital=owned(r,old.id)[0]?.id ?? null; }
    seekAsylum(r,old);
    for(const guest of r.players.filter(g=>g.alive && g.exile===old.id)) if(!owned(r,old.id).length) { guest.exile=null; seekAsylum(r,guest); }
  }
}
function addEvent(r: Room,p: Player,kind: PersonalEvent['kind'],agent?: string) {
  if(p.events.length>=3) { if(agent) report(player(r,agent),'Ajanın saraya ulaşamadı; güvenlik nedeniyle görev kapandı.'); return; }
  const details = {
    visitor: ['Sarayda bir ziyaretçi','Tanımadığın bir ziyaretçi huzuruna çıkmak istiyor. Muhafızlar mühürsüz bir mektup bulmuş.'],
    marriage: ['Bir evlilik teklifi','Komşu bir ailenin elçisi evlilik teklif ediyor. Bu kişinin geçmişi henüz araştırılmadı.'],
    harvest: ['Bereketli bir mevsim','Ambarlar doldu. Fazlayı pazarda satabilir veya halkına dağıtabilirsin.'],
    claim: ['Tahta uzanan gölge','Hanedan içinden biri tahtta hak iddia ediyor. Uzlaşmak altın, direnmek asker gerektirecek.'],
  }[kind];
  p.events.push({id:`event-${p.id}-${r.version}-${p.visits}-${p.events.length}`,kind,title:details[0],text:details[1],threat:!!agent || ((kind==='visitor'||kind==='marriage') && roll(r)<B.visitorRisk),agent,created:r.round});
}
function beginTurn(r: Room,p: Player) {
  r.actions=B.actions; p.visits++;
  const cities=owned(r,p.id).filter(c=>!c.fallout);
  p.gold+=cities.reduce((s,c)=>s+B.income*c.level,0) * (p.tech>=1 ? 1.2:1);
  p.gold=Math.floor(p.gold);
  for(const c of cities) { c.troops+=B.production*c.level + (p.tech>=3 ? 6:0); c.fatigue=Math.max(0,c.fatigue-B.recovery); c.morale=Math.min(100,c.morale+5); }
  for(const t of r.treaties.filter(t=>t.kind==='trade' && t.accepted && (t.from===p.id||t.to===p.id))) {
    if(tradeAvailable(r,t.from,t.to)) p.gold+=B.tradeIncome+(p.tech>=2?15:0);
  }
  p.research+=cities.filter(c=>c.lab).length*B.researchPerLab;
  if(p.tech<TECHS.length && p.research>=B.researchThresholds[p.tech]) { p.research-=B.researchThresholds[p.tech]; report(p,`${TECHS[p.tech]} araştırması tamamlandı.`); p.tech++; }
  if(p.tech===TECHS.length && cities.some(c=>c.lab) && !p.atomic && roll(r)<B.atomicChance) { p.atomic=true; report(p,'İleri fizik çalışmaları atom bombasını mümkün kıldı.'); }
  const due=r.missions.filter(m=>m.actor===p.id && m.due<=p.visits); r.missions=r.missions.filter(m=>!due.includes(m));
  for(const m of due) {
    const target=player(r,m.target); if(!target.alive) continue;
    if(roll(r)>Math.max(.1,B.spyChance-target.security*.08)) { report(p,'Casusun yakalandı; görev başarısız.'); report(target,'Muhafızların yabancı bir ajanı yakaladı.'); continue; }
    if(m.kind==='intel') report(p,`${target.name}: ${Math.floor(target.gold)} altın, ${owned(r,target.id).reduce((s,c)=>s+c.troops,0)} asker, ${target.children.length} varis.`);
    if(m.kind==='sabotage') { const c=owned(r,target.id)[0]; if(c) { c.troops=Math.floor(c.troops*(1-B.sabotageDamage)); c.morale=60; report(p,`${c.name} garnizonu sabote edildi.`); report(target,`${c.name} garnizonunda sabotaj yaşandı.`); } }
    if(m.kind==='assassinate') { addEvent(r,target,'visitor',p.id); report(p,'Ajanın saraya ulaştı. Sonuç hedefin kararından sonra belli olacak.'); }
  }
  if(roll(r)<B.eventChance) { const k = !p.married && roll(r)<.4 ? 'marriage' : p.children.length>1 && roll(r)<.3 ? 'claim' : roll(r)<.5 ? 'harvest' : 'visitor'; addEvent(r,p,k); }
}
function nextTurn(r: Room) {
  winner(r); if(r.phase==='finished') return;
  let tries=0;
  do { r.active=(r.active+1)%r.players.length; if(r.active===0) r.round++; tries++; } while(!r.players[r.active].alive && tries<=r.players.length);
  beginTurn(r,r.players[r.active]);
}
export function tradeAvailable(r: Room, a: string,b: string) { return owned(r,a).some(x=>x.port&&!x.fallout && owned(r,b).some(y=>y.port&&!y.fallout && seaRoute(r.world,x.id,y.id))); }
const counters: Record<Tactic,Tactic> = { attack:'siege', defend:'attack', siege:'defend', crescent:'attack', feint:'crescent' };
function strength(r: Room,c: City,troops: number,t: Tactic,enemy: Tactic,defending: boolean) {
  const p=c.owner ? player(r,c.owner):null;
  const tech=p ? (p.tech>=5?1.4:p.tech>=4?1.25:p.tech>=3?1.12:1):1;
  return troops*B.tactical[t]*(counters[t]===enemy?B.counterBonus:1)*Math.max(B.minFatigueMultiplier,1-c.fatigue*B.fatiguePenalty)*(c.morale/100)*tech*(defending?B.defenseBonus*(c.terrain==='mountain'?B.mountainBonus:c.terrain==='forest'?B.forestBonus:1):1);
}
function finishBattle(r: Room,pursue?: boolean) {
  const b=r.battle!; const from=city(r,b.from),to=city(r,b.to), attacker=player(r,b.attacker); const defense=b.defense ?? 'defend';
  if(defense==='feint' && pursue===undefined) { b.stage='pursue'; return; }
  let force=b.troops;
  if(defense==='feint') {
    if(!pursue) { from.troops+=Math.floor(force*(1-B.retreatLoss)); from.fatigue=Math.min(100,from.fatigue+B.battleFatigue); log(r,`${attacker.name} takibe gitmedi; ordu geri döndü.`); r.battle=null; return; }
    force=Math.floor(force*(1-B.pursuitTrap)); log(r,`${attacker.name} takipte pusuya düştü.`);
  }
  const power=strength(r,from,force,b.tactic,defense,false)*(b.naval?B.navalPenalty:1);
  const resist=strength(r,to,to.troops,defense,b.tactic,true);
  if(power>resist) { capture(r,to,attacker,Math.floor(force*(1-B.casualtyWin))); }
  else { from.troops+=Math.floor(force*(1-B.casualtyLose)); to.troops=Math.max(1,Math.floor(to.troops*(1-B.casualtyWin))); to.fatigue=Math.min(100,to.fatigue+B.battleFatigue); log(r,`${to.name} savunması saldırıyı püskürttü.`); }
  from.fatigue=Math.min(100,from.fatigue+B.battleFatigue); r.battle=null; winner(r);
}
export function applyCommand(original: Room, actor: string, commandId: string, expectedVersion: number, cmd: Command): Room {
  need(typeof commandId==='string' && /^[\w-]{8,80}$/.test(commandId),'Geçersiz işlem kimliği.');
  const key=`${actor}:${commandId}`; if(original.commands.includes(key)) return original;
  need(original.version===expectedVersion,'Oyun güncellendi. Son durumu aldıktan sonra tekrar dene.');
  const r=structuredClone(original), p=player(r,actor);
  need(r.phase!=='finished','Bu maç sona erdi.');
  const ctype=cmd.type;
  if(ctype==='ready') { need(r.phase==='lobby','Oyun başladı.'); p.ready=!p.ready; }
  else if(ctype==='start') {
    need(r.host===actor,'Oyunu yalnızca oda sahibi başlatabilir.'); need(r.phase==='lobby','Oyun zaten başladı.');
    need(r.players.length>=2 && r.players.every(p=>p.ready),'En az iki oyuncu katılmalı ve herkes hazır olmalı.');
    r.world=generateWorld(r.seed,r.players.length); r.phase='draft';
    r.draft=Array.from({length:B.citiesPerPlayer},(_,i)=>i%2?[...r.players].reverse():r.players).flat().map(p=>p.id);
    log(r,'Şehir seçimi başladı. Her hanedan dört şehir seçecek.');
  }
  else if(ctype==='draft') {
    need(r.phase==='draft' && r.draft[r.draftIndex]===actor,'Şehir seçme sırası sende değil.');
    const c=city(r,cmd.city); need(!c.owner,'Bu şehir zaten seçildi.'); c.owner=actor; c.troops=B.initialTroops;
    r.draftIndex++; if(r.draftIndex===r.draft.length) r.phase='capital';
  }
  else if(ctype==='capital') {
    need(r.phase==='capital','Başkent seçimi açık değil.'); const c=mine(r,p,cmd.city); p.capital=c.id;
    if(r.players.every(p=>p.capital!==null)) { r.phase='playing'; beginTurn(r,r.players[0]); log(r,'Hanedanların mücadelesi başladı.'); }
  }
  else if(ctype==='defend') {
    need(p.alive && r.battle?.stage==='defend' && r.battle.defender===actor,'Yanıtını bekleyen bir savaş yok.');
    need(cmd.tactic && Object.hasOwn(TACTICS,cmd.tactic),'Bir taktik seç.'); r.battle.defense=cmd.tactic; finishBattle(r);
  }
  else if(ctype==='pursue') { need(p.alive && r.battle?.stage==='pursue' && r.battle.attacker===actor,'Takip kararı sana ait değil.'); need(['yes','no'].includes(cmd.choice??''),'Takip kararını seç.'); finishBattle(r,cmd.choice==='yes'); }
  else if(ctype==='treaty') {
    need(r.phase==='playing' && p.alive,'Diplomasi şu anda kapalı.'); const t=r.treaties.find(t=>t.id===cmd.id && t.to===actor && !t.accepted); need(t,'Bu teklif artık mevcut değil.'); need(cmd.choice==='accept'||cmd.choice==='reject','Bir yanıt seç.');
    const source=player(r,t.from); need(source.alive,'Teklifi gönderen elendi.');
    if(cmd.choice==='accept') {
      if(t.kind==='asylum') { need(owned(r,actor).length,'Sürgündeyken ev sahipliği yapamazsın.'); source.exile=actor; source.seekingAsylum=false; r.treaties=r.treaties.filter(x=>!(x.kind==='asylum' && x.from===source.id)); log(r,`${p.name}, ${source.name} hanedanına sığınma hakkı verdi.`); }
      else { need(tradeAvailable(r,source.id,p.id),'İki tarafta da açık deniz bağlantılı liman gerekiyor.'); t.accepted=true; log(r,`${source.name} ve ${p.name} ticaret anlaşması yaptı.`); }
    } else { r.treaties=r.treaties.filter(x=>x.id!==t.id); if(t.kind==='asylum' && !r.treaties.some(x=>x.kind==='asylum' && x.from===source.id)) eliminate(r,source); }
  }
  else if(ctype==='event') {
    need(r.phase==='playing' && p.alive,'Bu olay artık yanıtlanamaz.');
    const e=p.events.find(e=>e.id===cmd.id); need(e,'Olay bulunamadı.'); need(['accept','reject','investigate'].includes(cmd.choice??''),'Bir karar seç.');
    if(cmd.choice==='investigate') { need(!e.investigated,'Bu olay zaten araştırıldı.'); pay(p,35); e.investigated=true; report(p,e.threat?'Muhafızlar ciddi bir tehdit tespit etti.':'Araştırmada bir tehdit bulunamadı.'); }
    else {
      p.events=p.events.filter(x=>x.id!==e.id);
      if(cmd.choice==='accept') {
        if(e.threat) { const chance=Math.max(.05,B.assassinationChance-p.security*.06); if(roll(r)<chance) { if(e.agent) report(player(r,e.agent),'Suikast başarılı oldu.'); log(r,`${p.name} hükümdarı bir suikastta öldü.`); rulerDies(r,p); } else { report(p,'Muhafızların suikast girişimini durdurdu.'); if(e.agent) report(player(r,e.agent),'Suikast girişimi engellendi.'); } }
        else if(e.kind==='marriage') { p.married=true; report(p,'Evlilik gerçekleşti. Artık varis yetiştirebilirsin.'); }
        else if(e.kind==='harvest') p.gold+=90;
        else if(e.kind==='claim') { pay(p,80); report(p,'Taht iddiası uzlaşmayla çözüldü.'); }
        else p.gold+=40;
      } else { if(e.agent) report(player(r,e.agent),'Ziyaret reddedildi; ajan geri döndü.'); if(e.kind==='harvest') owned(r,actor).forEach(c=>c.morale=100); if(e.kind==='claim') { const c=owned(r,actor).find(c=>c.id!==p.capital); if(c) { c.owner=null; log(r,`${c.name} taht iddiasını destekleyerek ayrıldı.`); } } }
    }
  }
  else if(ctype==='surrender') { need(r.phase==='playing' && p.alive,'Teslim olamazsın.'); need(!r.battle,'Önce savaş sonuçlanmalı.'); eliminate(r,p); }
  else if(ctype==='end') {
    need(r.phase==='playing' && p.alive && r.players[r.active].id===actor,'Tur sırası sende değil.'); need(!r.battle,'Önce savaş kararları tamamlanmalı.'); need(!p.events.length,'Önce sarayındaki olayları yanıtla.'); need(!p.seekingAsylum,'Önce sığınma talepleri sonuçlanmalı.'); nextTurn(r);
  }
  else {
    action(r,p);
    if(ctype==='build') {
      const c=mine(r,p,cmd.city); need(['port','lab','upgrade','ship','recruit'].includes(cmd.kind??''),'Geçersiz inşaat.');
      if(cmd.kind==='port') { need(c.coastal&&!c.port,'Liman için limansız bir kıyı şehri seç.'); pay(p,B.costs.port); c.port=true; }
      if(cmd.kind==='lab') { need(!c.lab,'Bu şehirde bilim merkezi var.'); pay(p,B.costs.lab); c.lab=true; }
      if(cmd.kind==='upgrade') { need(c.level<B.maxLevel,'Şehir en yüksek seviyede.'); pay(p,B.costs.upgrade*c.level); c.level++; }
      if(cmd.kind==='ship') { need(c.port && c.ships<B.maxShips,'Gemi için uygun bir liman gerekiyor.'); pay(p,B.costs.ship); c.ships++; }
      if(cmd.kind==='recruit') { pay(p,B.costs.recruit); c.troops+=B.recruit; }
    }
    else if(ctype==='settle') { const c=city(r,cmd.city); need(!c.owner&&!c.fallout,'Bu bölgeye şehir kuramazsın.'); need(owned(r,actor).some(a=>adjacent(r.world,a.id,c.id)),'Kendi şehrine komşu bir bölge seç.'); pay(p,B.costs.city); c.owner=actor; c.troops=B.recruit; log(r,`${p.name}, ${c.name} bölgesini yerleşime açtı.`); }
    else if(ctype==='move'||ctype==='attack') {
      // Exiled rulers may recruit a small expedition in a consenting host's port.
      const from=city(r,cmd.city),to=city(r,cmd.to); need(from.id!==to.id&&!to.fallout,'Farklı, yaşanabilir bir hedef seç.');
      const expedition=p.exile===from.owner && from.port && ctype==='attack';
      need(from.owner===actor||expedition,'Ordu kaynağı sana veya sığındığın ülkenin limanına ait olmalı.');
      const amount=cmd.amount; need(Number.isInteger(amount)&&amount!>=B.attackTroopMin,'En az 5 asker gönder.');
      if(expedition) { need(amount!<=B.recruit,'Sürgün seferine en fazla 35 asker katılır.'); pay(p,B.costs.recruit+B.costs.ship); }
      else need(amount!<from.troops,'Şehirde en az bir asker bırakmalısın.');
      const naval=!adjacent(r.world,from.id,to.id);
      if(naval) { need(from.port && to.coastal && seaRoute(r.world,from.id,to.id),'Çıkarma için liman ve erişilebilir kıyı gerekiyor.'); need(expedition||from.ships>0,'Önce limanda gemi inşa et.'); need(amount! <= (expedition?1:from.ships)*B.shipCapacity,'Gemi kapasitesi yetersiz.'); }
      if(!expedition) from.troops-=amount!;
      if(ctype==='move') { need(to.owner===actor,'Asker yalnızca kendi şehrine taşınabilir.'); to.troops+=amount!; }
      else {
        need(to.owner!==actor && to.owner!==p.exile,'Kendi ülkene veya sığınma sağlayan hanedana saldıramazsın.');
        need(cmd.tactic && Object.hasOwn(TACTICS,cmd.tactic),'Bir saldırı taktiği seç.');
        r.battle={id:commandId,attacker:actor,defender:to.owner,from:from.id,to:to.id,troops:amount!,tactic:cmd.tactic,stage:'defend',naval};
        log(r,`${p.name}, ${to.name} üzerine yürüdü.`);
        if(!to.owner) { r.battle.defense='defend'; finishBattle(r); }
      }
    }
    else if(ctype==='trade') { const target=player(r,cmd.target); need(target.id!==actor && target.alive,'Başka bir yaşayan hanedan seç.'); need(tradeAvailable(r,actor,target.id),'Her iki hanedanın da deniz bağlantılı limanı olmalı.'); need(!r.treaties.some(t=>t.kind==='trade' && [t.from,t.to].includes(actor) && [t.from,t.to].includes(target.id)),'Bu hanedanla zaten bir teklif veya anlaşma var.'); r.treaties.push({id:commandId,from:actor,to:target.id,kind:'trade',accepted:false}); }
    else if(ctype==='marry') { need(!p.married,'Hükümdar zaten evli.'); need(!p.events.some(e=>e.kind==='marriage'),'Önce mevcut evlilik teklifini yanıtla.'); pay(p,B.costs.marry); addEvent(r,p,'marriage'); }
    else if(ctype==='child') { need(p.married && p.children.length<B.maxChildren,'Evli olmalı ve en fazla dört varise sahip olmalısın.'); pay(p,B.costs.child); if(roll(r)<B.childChance) { p.children.push(['Deniz','Aras','Duru','Ege'][p.children.length]+` ${p.generation}`); report(p,'Hanedanına yeni bir varis katıldı.'); } else report(p,'Bu tur hanedanına yeni bir çocuk katılmadı.'); }
    else if(ctype==='security') { need(p.security<5,'Muhafızlar en yüksek seviyede.'); pay(p,B.costs.security); p.security++; }
    else if(ctype==='spy') { const target=player(r,cmd.target); need(target.id!==actor && target.alive,'Başka bir yaşayan hanedan seç.'); need(['intel','sabotage','assassinate'].includes(cmd.kind??''),'Casusun görevini seç.'); pay(p,B.costs.spy); r.missions.push({id:commandId,actor,target:target.id,kind:cmd.kind as 'intel'|'sabotage'|'assassinate',due:p.visits+B.spyDelay}); }
    else if(ctype==='nuke') { need(p.atomic,'Atom teknolojisi henüz keşfedilmedi.'); const c=city(r,cmd.city); need(c.owner!==actor && !c.fallout,'Başka bir bölge seç.'); pay(p,B.costs.nuke); const victim=c.owner?player(r,c.owner):null; c.troops=0;c.owner=null;c.port=false;c.lab=false;c.ships=0;c.fallout=true;log(r,`${c.name} nükleer saldırıyla yok oldu.`); if(victim) { if(victim.capital===c.id) rulerDies(r,victim); victim.capital=owned(r,victim.id)[0]?.id??null;seekAsylum(r,victim); } }
    else throw new RuleError('Bilinmeyen komut.');
  }
  winner(r);
  if(r.phase==='playing' && !r.players[r.active].alive && !r.battle) nextTurn(r);
  r.version++; r.commands=[...r.commands,key]; return r;
}
export function viewFor(r: Room,id: string): View {
  need(r.players.some(p=>p.id===id),'Bu odanın oyuncusu değilsin.');
  const {rng: _rng,seed: _seed,commands: _commands,missions,players,battle,...rest}=structuredClone(r);
  return {...rest,me:id,players:players.map(p=>{
    const {gold,research,atomic,events,reports,security,...pub}=p;
    return p.id===id ? {...pub,gold,research,atomic,reports,security,events:events.map(e=>({...e,threat:e.investigated?e.threat:false,agent:undefined}))} : pub;
  }),missions:missions.filter(m=>m.actor===id),battle:battle?{...battle,tactic:battle.attacker===id?battle.tactic:undefined,defense:battle.defender===id?battle.defense:undefined}:null};
}
