// Local, disposable integration game. Never print session or recovery secrets.
const root=process.env.TEST_URL??'http://localhost:3000';
async function request(path,method='GET',data,cookie){const res=await fetch(`${root}/api/${path}`,{method,headers:{'content-type':'application/json',origin:root,...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined});const value=await res.json();if(!res.ok)throw new Error(value.error);return{value,cookie:res.headers.get('set-cookie')?.split(';')[0]};}
const a=await request('auth','POST',{name:`RT-A-${Date.now()%100000}`,password:process.env.GAME_PASSWORD});
const b=await request('auth','POST',{name:`RT-B-${Date.now()%100000}`,password:process.env.GAME_PASSWORD});
let r=(await request('rooms','POST',{},a.cookie)).value.room;const code=r.code;
r=(await request('rooms','POST',{code},b.cookie)).value.room;
const tokens={[a.value.identity.id]:a.cookie,[b.value.identity.id]:b.cookie};
async function cmd(id,command){r=(await request(`rooms/${code}`,'POST',{commandId:crypto.randomUUID(),version:r.version,command},tokens[id])).value.room;}
await cmd(a.value.identity.id,{type:'ready'});await cmd(b.value.identity.id,{type:'ready'});await cmd(a.value.identity.id,{type:'start'});
while(r.phase==='draft')await cmd(r.draft[r.draftIndex],{type:'draft',city:r.world.cities.find(c=>!c.owner).id});
for(const p of r.players)await cmd(p.id,{type:'capital',city:r.world.cities.find(c=>c.owner===p.id).id});
await request(`rooms/${code}`,'GET',undefined,a.cookie);await request(`rooms/${code}`,'GET',undefined,b.cookie);
const source=r.world.cities.find(c=>c.owner===a.value.identity.id);
await cmd(a.value.identity.id,{type:'raise',city:source.id,amount:20});
if(r.sim.armies.length!==1)throw new Error('Army missing');
const stopped=(await request(`rooms/${code}`,'POST',{presence:false},b.cookie)).value.room;
await new Promise(resolve=>setTimeout(resolve,1100));
const after=(await request(`rooms/${code}`,'GET',undefined,a.cookie)).value.room;
if(after.sim.clock!==stopped.sim.clock||after.sim.running)throw new Error('Offline simulation advanced');
await request(`rooms/${code}`,'POST',{presence:false},a.cookie);
console.log('PASS: v2 HTTP login, room, draft, capitals, army creation and offline pause.');
