'use client';
import { useEffect,useRef,useCallback } from 'react';
import { MinusIcon,PlusIcon,CornersOutIcon } from '@phosphor-icons/react';
import type { World,PublicPlayer,Simulation } from '@/game/types';
type Props={world:World;players:PublicPlayer[];selected:number|null;onSelect:(id:number)=>void;preview?:boolean;sim?:Simulation;onTile?:(tile:number)=>void;selectedTile?:number|null};
export default function WorldMap({world,players,selected,onSelect,preview=false,sim,onTile,selectedTile}:Props) {
  const canvas=useRef<HTMLCanvasElement>(null), frame=useRef<HTMLDivElement>(null);
  const camera=useRef({x:0,y:0,zoom:1}), initial=useRef(true), pointers=useRef(new Map<number,{x:number;y:number}>()), drag=useRef({x:0,y:0,moved:false,distance:0});
  const paint=useCallback(()=>{
    const el=canvas.current,box=frame.current;if(!el||!box)return; const w=box.clientWidth,h=box.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(el.width!==w*dpr||el.height!==h*dpr){el.width=w*dpr;el.height=h*dpr;}
    const ctx=el.getContext('2d');if(!ctx)return;const font=getComputedStyle(el).fontFamily;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#243a38';ctx.fillRect(0,0,w,h);
    const fit=Math.min(w/(world.width*8),h/(world.height*8))*.94,scale=fit*camera.current.zoom;
    const ox=(w-world.width*8*scale)/2+camera.current.x,oy=(h-world.height*8*scale)/2+camera.current.y;
    ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
    const palette=new Map(players.map(p=>[p.id,p.color]));
    for(let t=0;t<world.land.length;t++) if(world.land[t]) {
      const region=world.regions[t],c=world.cities[region];
      const owner=sim?players[sim.owners[t]]?.id:c.owner;ctx.fillStyle=owner?palette.get(owner)??'#c9c0a3':'#c7bea1';
      ctx.fillRect(t%world.width*8,Math.floor(t/world.width)*8,8.5,8.5);
      if(sim?t===selectedTile:region===selected) {ctx.fillStyle='rgba(246,229,176,.24)';ctx.fillRect(t%world.width*8,Math.floor(t/world.width)*8,8.5,8.5);}
    }
    // Draw a single shared region boundary, with a heavier coast/selection outline.
    for(let t=0;t<world.land.length;t++) if(world.land[t]) {
      const x=t%world.width*8,y=Math.floor(t/world.width)*8,region=sim?sim.owners[t]:world.regions[t];
      const edges:[[number,number,number,number],number][]=[[[x,y,x+8,y],t-world.width],[[x+8,y,x+8,y+8],t%world.width===world.width-1?-1:t+1],[[x,y+8,x+8,y+8],t+world.width],[[x,y,x,y+8],t%world.width===0?-1:t-1]];
      for(const [line,n] of edges) if(n<0||n>=world.land.length||(sim?sim.owners[n]:world.regions[n])!==region||!world.land[n]) {
        const coast=!world.land[n];ctx.strokeStyle=(!sim&&region===selected)?'#f4ddb1':coast?'#e4d7b5':'rgba(56,60,43,.28)';ctx.lineWidth=(!sim&&region===selected?1.4:coast?1:.5)/scale;ctx.beginPath();ctx.moveTo(line[0],line[1]);ctx.lineTo(line[2],line[3]);ctx.stroke();
      }
    }
    ctx.restore();
    if(sim){for(const a of sim.armies){const x=ox+(a.tile%world.width+.5)*8*scale,y=oy+(Math.floor(a.tile/world.width)+.5)*8*scale;ctx.strokeStyle=palette.get(a.owner)??'#eee';ctx.lineWidth=2;if(a.path.length){ctx.beginPath();ctx.moveTo(x,y);for(const t of a.path)ctx.lineTo(ox+(t%world.width+.5)*8*scale,oy+(Math.floor(t/world.width)+.5)*8*scale);ctx.stroke();}ctx.fillStyle=palette.get(a.owner)??'#eee';ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#17231b';ctx.stroke();ctx.fillStyle='#fff4d5';ctx.font=`600 12px ${font}`;ctx.textAlign='center';ctx.fillText(String(a.troops),x,y-12);}}

    // Screen-space labels stay readable at every zoom level.
    const drawn:{x:number;y:number}[]=[];
    const sorted=[...world.cities].sort((a,b)=>Number(b.id===selected)-Number(a.id===selected)||Number(players.some(p=>p.capital===b.id))-Number(players.some(p=>p.capital===a.id)));
    for(const c of sorted) {
      const x=ox+c.x*8*scale,y=oy+c.y*8*scale; if(x<0||x>w||y<0||y>h)continue;
      const capital=players.some(p=>p.capital===c.id),active=c.id===selected;
      ctx.fillStyle=active?'#fff3d3':'#28352c';ctx.strokeStyle='#e9dfc8';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.rect(x-4,y-4,8,8);ctx.fill();ctx.stroke();
      if(capital){ctx.strokeStyle='#27302a';ctx.beginPath();ctx.moveTo(x-6,y-9);ctx.lineTo(x-6,y-15);ctx.lineTo(x-2,y-12);ctx.lineTo(x,y-16);ctx.lineTo(x+3,y-12);ctx.lineTo(x+6,y-15);ctx.lineTo(x+6,y-9);ctx.closePath();ctx.stroke();}
      if(c.port){ctx.strokeStyle='#263a35';ctx.beginPath();ctx.arc(x+9,y+2,4,0,Math.PI);ctx.moveTo(x+9,y-4);ctx.lineTo(x+9,y+6);ctx.stroke();}
      if(!active&&!capital&&camera.current.zoom<1.5)continue;
      if(!active&&drawn.some(d=>Math.abs(d.x-x)<110&&Math.abs(d.y-y)<40))continue;
      drawn.push({x,y});ctx.font=`${active?'600':'500'} 12px ${font}`;ctx.textAlign='center';
      const text=c.name,tw=ctx.measureText(text).width;
      ctx.fillStyle=active?'#19241f':'rgba(234,224,198,.94)';ctx.fillRect(x-tw/2-6,y+8,tw+12,21);
      ctx.fillStyle=active?'#f5e9cc':'#27362c';ctx.fillText(text,x,y+23);
    }
    ctx.fillStyle='#b9c7bc';ctx.font=`500 12px ${font}`;ctx.textAlign='left';ctx.fillText('K U Z E Y',22,36);
    ctx.strokeStyle='#b9c7bc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(46,46);ctx.lineTo(46,72);ctx.moveTo(40,54);ctx.lineTo(46,46);ctx.lineTo(52,54);ctx.stroke();
    if(preview){ctx.fillStyle='#c2cbbb';ctx.textAlign='right';ctx.fillText('Keşfedilecek bir dünya',w-24,h-24);}
  },[world,players,selected,preview,sim,selectedTile]);
  useEffect(()=>{const ob=new ResizeObserver(paint);if(frame.current)ob.observe(frame.current);paint();document.fonts.ready.then(paint);return()=>ob.disconnect();},[paint]);
  useEffect(()=>{if(initial.current){initial.current=false;camera.current={x:0,y:0,zoom:1};}paint();},[world,paint]);
  const zoom=(factor:number)=>{camera.current.zoom=Math.max(.8,Math.min(8,camera.current.zoom*factor));paint();};
  return <div className={`world-map ${preview?'map-preview':''}`} ref={frame}>
    <canvas ref={canvas} aria-label="Krallık haritası. Şehirleri haritadan veya şehir listesinden seçebilirsin." role="img"
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});drag.current={x:e.clientX,y:e.clientY,moved:false,distance:0};}}
      onPointerMove={e=>{const prev=pointers.current.get(e.pointerId);if(!prev)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(Math.hypot(e.clientX-drag.current.x,e.clientY-drag.current.y)>5)drag.current.moved=true;
        if(pointers.current.size===2){const [a,b]=[...pointers.current.values()];const dist=Math.hypot(a.x-b.x,a.y-b.y);if(drag.current.distance)zoom(dist/drag.current.distance);drag.current.distance=dist;drag.current.moved=true;}else{camera.current.x+=dx;camera.current.y+=dy;paint();}}}
      onPointerUp={e=>{pointers.current.delete(e.pointerId);if(drag.current.moved)return;const rect=e.currentTarget.getBoundingClientRect(),fit=Math.min(rect.width/(world.width*8),rect.height/(world.height*8))*.94,scale=fit*camera.current.zoom;const ox=(rect.width-world.width*8*scale)/2+camera.current.x,oy=(rect.height-world.height*8*scale)/2+camera.current.y;const x=Math.floor((e.clientX-rect.left-ox)/scale/8),y=Math.floor((e.clientY-rect.top-oy)/scale/8);if(x>=0&&y>=0&&x<world.width&&y<world.height){const tile=y*world.width+x;if(onTile){onTile(tile);}else{const id=world.regions[tile];if(id>=0)onSelect(id);}}}}
      onPointerCancel={e=>{pointers.current.delete(e.pointerId);drag.current.moved=true;}}
      onWheel={e=>zoom(e.deltaY<0?1.1:.9)} />
    {!preview&&<div className="map-controls"><button aria-label="Yakınlaştır" onClick={()=>zoom(1.25)}><PlusIcon/></button><button aria-label="Uzaklaştır" onClick={()=>zoom(.8)}><MinusIcon/></button><button aria-label="Haritayı ortala" onClick={()=>{camera.current={x:0,y:0,zoom:1};paint();}}><CornersOutIcon/></button></div>}
  </div>;
}
