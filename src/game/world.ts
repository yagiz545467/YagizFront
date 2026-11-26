import type { World, City } from './types';
import { neighbors, connected } from './grid';
import { B } from './balance';
export function random(seed: number) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const names = ['Akçakale','Karasu','Sarıova','Gökçe Limanı','Demirkapı','Ayazkent','Kızılhisar','Söğüt','Yelkovan','Bozdağ','İncesu','Altınova','Taşkale','Gümüşkent','Çamlıbel','Kuzgun','Aksu','Kıyıköy','Hisarönü','Yenice','Karakaya','Gölbaşı','Uçhisar','Esentepe','Güzelce','Dereköy','Sazlıca','Tuzla','Kavaklı','Işıklar','Kumkale','Alacahan','Turna','Sarpkale','İpekova','Yalıhisar','Kestane','Yıldızkent','Kurtkaya','Maviada'];
export function generateWorld(seed: number, playerCount = 8): World {
  const rng = random(seed), width = 96, height = 76;
  const land = Array<number>(width * height).fill(0), regions = Array<number>(land.length).fill(-1);
  const phases = Array.from({length: 5}, () => rng() * Math.PI * 2);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const dx = (x - width / 2) / 40, dy = (y - height / 2) / 29;
    const angle = Math.atan2(dy, dx), radius = Math.hypot(dx, dy);
    const coast = 1 + .12 * Math.sin(angle * 3 + phases[0]) + .1 * Math.sin(angle * 7 + phases[1]) + .05 * Math.sin(angle * 13 + phases[2]);
    if (radius < coast && x > 3 && y > 3 && x < width - 4 && y < height - 4) land[y * width + x] = 1;
  }
  const mainland = connected(Math.floor(height / 2) * width + width / 2, t => !!land[t], width, height);
  land.forEach((_, i) => { land[i] = mainland.has(i) ? 1 : 0; });
  const candidates = [...mainland];
  const count = Math.max(16, playerCount * 4 + 8);
  const sites: number[] = [];
  // Farthest-point sampling guarantees separated sites across one connected landmass.
  sites.push(candidates[Math.floor(rng() * candidates.length)]);
  while (sites.length < count) {
    let best = -1, score = -1;
    for (const tile of candidates) {
      const d = Math.min(...sites.map(s => (tile % width - s % width) ** 2 + (Math.floor(tile / width) - Math.floor(s / width)) ** 2));
      const edgePenalty = neighbors(tile, width, height).some(n => !land[n]) ? .9 : 1;
      if (d * edgePenalty > score) { score = d * edgePenalty; best = tile; }
    }
    sites.push(best);
  }
  const cities: City[] = sites.map((tile, i) => ({ id: i, name: names[i] ?? `Hisar ${i + 1}`, x: tile % width + .5, y: Math.floor(tile / width) + .5, tile, terrain: rng() < .18 ? 'mountain' : rng() < .3 ? 'forest' : 'plain', coastal: false, owner: null, troops: B.neutralTroops, level: 1, port: false, lab: false, ships: 0, fatigue: 0, morale: 100, fallout: false }));
  // Multi-source flood fill gives connected territories with a guaranteed connected adjacency graph.
  const queue = [...sites]; sites.forEach((t, i) => regions[t] = i);
  for (let i = 0; i < queue.length; i++) for (const n of neighbors(queue[i], width, height)) {
    if (land[n] && regions[n] === -1) { regions[n] = regions[queue[i]]; queue.push(n); }
  }
  const edges = new Set<string>();
  for (const t of candidates) for (const n of neighbors(t, width, height)) {
    if (!land[n]) cities[regions[t]].coastal = true;
    else if (regions[n] !== regions[t]) edges.add([regions[n], regions[t]].sort((a,b)=>a-b).join(':'));
  }
  return { width, height, land, regions, cities, links: [...edges].map(e=>e.split(':').map(Number) as [number,number]) };
}
export function adjacent(w: World, a: number, b: number) { return w.links.some(([x,y]) => x === a && y === b || x === b && y === a); }
export function seaRoute(w: World, a: number, b: number) {
  const shore = (id: number) => { const out = new Set<number>(); w.regions.forEach((r,t)=>{ if(r===id) for(const n of neighbors(t,w.width,w.height)) if(!w.land[n]) out.add(n); }); return out; };
  const from = shore(a), to = shore(b); if(!from.size || !to.size) return false;
  const sea = connected([...from][0], t=>!w.land[t], w.width,w.height);
  return [...to].some(t=>sea.has(t));
}
