import { random,generateWorld } from './world';
import { neighbors } from './grid';
import type { World } from './types';
import earth from './maps/openfront-world.json';
export function continents(seed:number):World {
  const rng=random(seed),{width,height}=earth,land:number[]=[];
  // OpenFront World map16x, losslessly run-length encoded (CC BY-SA 4.0).
  earth.runs.forEach((count,i)=>{for(let n=0;n<count;n++)land.push(i%2);});
  for(let t=0;t<land.length;t++)if(t%width===0||t%width===width-1||t<width||t>=width*(height-1))land[t]=0;
  const cities=generateWorld(seed,8).cities;
  const candidates=land.flatMap((l,i)=>l&&i%width>2&&i%width<width-3&&Math.floor(i/width)>2&&Math.floor(i/width)<height-3&&neighbors(i,width,height).some(n=>land[n])?[i]:[]),coasts=candidates.filter(t=>neighbors(t,width,height).some(n=>!land[n]));
  const sites:number[]=[];
  for(let i=0;i<cities.length;i++) {const pool=i%2?candidates:coasts;let best=-1,score=-1;for(const t of pool){const d=sites.length?Math.min(...sites.map(s=>(s%width-t%width)**2+(Math.floor(s/width)-Math.floor(t/width))**2)):rng();if(d>score){score=d;best=t;}}sites.push(best);Object.assign(cities[i],{tile:best,x:best%width+.5,y:Math.floor(best/width)+.5,coastal:coasts.includes(best),owner:null});}
  // Nearest city is only a hit-test index. It never defines territory ownership.
  const regions=land.map((l,t)=>{if(!l)return -1;let best=0,d=Infinity;sites.forEach((s,i)=>{const n=(s%width-t%width)**2+(Math.floor(s/width)-Math.floor(t/width))**2;if(n<d){d=n;best=i;}});return best;});
  return {mapId:'openfront-world-v1',width,height,land,regions,cities,links:[]};
}
