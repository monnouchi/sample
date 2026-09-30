import {DIRS,key,random} from './game.js?v=20260930-round2';
import {illumination} from './view.js';
const W=840,H=640;
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function path(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
const texture=document.createElement('canvas');texture.width=128;texture.height=256;
const t=texture.getContext('2d'),r=random(91);t.fillStyle='#233d2b';t.fillRect(0,0,128,256);
for(let i=0;i<1000;i++){const x=r()*128,y=r()*256;ellipse(t,x,y,2+r()*12,2+r()*7,`rgba(${35+r()*40},${65+r()*45},${35+r()*30},.6)`);}
for(let j=0;j<4;j++){const x=j*38-8;t.fillStyle='#233128';t.fillRect(x,0,12,256);t.strokeStyle='#57704a';t.lineWidth=2;t.beginPath();t.moveTo(x+7,256);t.bezierCurveTo(x-5,180,x+20,70,x+10,0);t.stroke();}
for(let i=0;i<80;i++){ellipse(t,r()*128,r()*256,2+r()*4,1+r()*3,'#60805066');}
export function drawScene(canvas,s,time=0,camera=null){
 const c=canvas.getContext('2d');c.clearRect(0,0,W,H);
 const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#0a292c');sky.addColorStop(.4,s?.floor===3?'#42626a':'#739977');sky.addColorStop(.52,'#b4c498');sky.addColorStop(1,'#123730');c.fillStyle=sky;c.fillRect(0,0,W,H);
 const rr=random(783);for(let i=0;i<70;i++){const x=rr()*W,y=rr()*220;c.fillStyle='#143d3270';c.fillRect(x,y,3+rr()*10,380-y);ellipse(c,x,y,20+rr()*100,15+rr()*40,`rgba(15,49,39,${.2+rr()*.3})`);}
 // Soft shafts of light through the canopy.
 for(let i=0;i<5;i++){const x=230+i*77;const g=c.createLinearGradient(x,0,x-100,H);g.addColorStop(0,'#e2efb11a');g.addColorStop(1,'#c9eac000');path(c,[[x,0],[x+22,0],[x-60,H],[x-175,H]],g);}
 const floor=c.createLinearGradient(0,315,0,H);floor.addColorStop(0,'#a7b292');floor.addColorStop(.25,'#61795d');floor.addColorStop(1,'#273f32');path(c,[[0,330],[W,330],[W,H],[0,H]],floor);
 // Receding stones and low ferns give depth to the forest floor.
 const fr=random(43);for(let i=0;i<220;i++){const y=335+fr()*310,p=(y-320)/320,x=fr()*W;ellipse(c,x,y,1+p*12,1+p*4,fr()>.5?'#b2b78728':'#102c2d66');}
 if(s){
 const [dx,dy]=DIRS[s.dir],angle=camera?.angle??Math.atan2(dy,dx),px=camera?.x??s.x,py=camera?.y??s.y,light=illumination(s.light),z=[];
 for(let sx=0;sx<W;sx+=2){const offset=Math.atan((sx/W*2-1)*.72),a=angle+offset,rx=Math.cos(a),ry=Math.sin(a);let dist=.02,hx=0,hy=0;
 while(dist<14){hx=px+.5+rx*dist;hy=py+.5+ry*dist;if(s.map.grid[Math.floor(hy)]?.[Math.floor(hx)]!==0)break;dist+=.035;}
 const depth=dist*Math.cos(offset),height=Math.min(1200,420/depth),top=320-height*.6;
 const fx=hx-Math.floor(hx),fy=hy-Math.floor(hy),edge=Math.min(fx,1-fx)<Math.min(fy,1-fy)?fy:fx;
 c.drawImage(texture,Math.floor(edge*127),0,1,256,sx,top,3,height);
 c.fillStyle=`rgba(7,29,30,${Math.min(.93,depth/light.reach*.65)})`;c.fillRect(sx,top,3,height);
 c.fillStyle=`rgba(159,186,155,${Math.min(.3,depth*.025)*(s.light/100)})`;c.fillRect(sx,top,3,height);z.push(depth);
 }
 // Draw an event ahead only when it is in the forward line of sight.
 for(let d=camera?.moving?-1:5;d>=0;d--){const x=s.x+dx*d,y=s.y+dy*d;let clear=true;for(let n=1;n<=d;n++)if(s.map.grid[s.y+dy*n]?.[s.x+dx*n]!==0)clear=false;if(!clear)continue;const e=s.map.events[key(x,y)];if(!e||e==='enemy')continue;
 const scale=1/(d+.8),cx=420,cy=340+105*scale;c.save();c.translate(cx,cy);c.scale(scale,scale);
 if(e==='chest'){c.shadowColor='#e3cb78';c.shadowBlur=16;c.fillStyle='#745735';c.fillRect(-44,-45,88,48);c.shadowBlur=0;c.strokeStyle='#d8c080';c.lineWidth=4;c.strokeRect(-44,-45,88,48);c.beginPath();c.moveTo(-44,-25);c.lineTo(44,-25);c.stroke();c.fillStyle='#e4d39b';c.fillRect(-6,-32,12,15);}
 if(e==='stairs'){for(let i=0;i<5;i++){c.fillStyle=i%2?'#8d9d75':'#576f56';c.fillRect(-55-i*10,-65+i*15,110+i*20,12);}c.fillStyle='#e2dfa8';c.font='26px serif';c.textAlign='center';c.fillText('◇',0,-88);}
 if(e==='shrine'){c.strokeStyle='#f3d393';c.lineWidth=7;c.shadowColor='#f8d680';c.shadowBlur=24;path(c,[[0,-140],[48,-75],[0,-10],[-48,-75]],'#648079');c.strokeRect(-62,-155,124,160);c.shadowBlur=0;}
 if(e==='spring'){ellipse(c,0,0,65,16,'#72c9bd80');ellipse(c,0,-4,42,9,'#b3e4d677');c.shadowColor='#8bdddc';c.shadowBlur=24;ellipse(c,0,-25,6,9,'#c4f2e3');}
 c.restore();
 }
 }
 // Foreground fronds frame the playable scene.
 const pr=random(31);for(let side=0;side<2;side++){c.save();if(side){c.translate(W,0);c.scale(-1,1);}for(let i=0;i<22;i++){const x=pr()*120,y=430+pr()*230;c.strokeStyle=i%2?'#295846':'#3c6546';c.lineWidth=2;c.beginPath();c.moveTo(x,y+50);c.quadraticCurveTo(x+10,y,x+60,y-35);c.stroke();for(let j=0;j<5;j++){const px=x+j*10,py=y+20-j*9;path(c,[[px,py],[px-25,py-20],[px+10,py-5]],'#356347');path(c,[[px,py],[px+30,py-4],[px+13,py+8]],'#244d39');}}c.restore();}
 if(s){c.fillStyle=`rgba(3,12,24,${illumination(s.light).shade})`;c.fillRect(0,0,W,H);}
 if(s?.phase==='battle')drawCreature(c,s.enemy,time);
 const fire=random(103);for(let i=0;i<25;i++){const x=fire()*W,y=fire()*H,alpha=.35+.3*Math.sin(time/1300+i);c.shadowColor='#e4ee99';c.shadowBlur=12;ellipse(c,x+Math.sin(time/2800+i)*4,y,1.3,1.3,`rgba(223,238,162,${alpha})`);}c.shadowBlur=0;
 const vignette=c.createRadialGradient(420,280,150,420,300,560);vignette.addColorStop(0,'#061e2100');vignette.addColorStop(1,'#021619a0');c.fillStyle=vignette;c.fillRect(0,0,W,H);
}
function drawCreature(c,e,time){
 if(e.boss){drawGuardian(c,time);return;}
 c.save();c.translate(420,390+Math.sin(time/700)*3);const boss=e.boss;const scale=boss?1.1:.85;c.scale(scale,scale);
 ellipse(c,0,130,108,20,'#061c24aa');c.shadowColor=boss?'#adc9dc':'#a2d795';c.shadowBlur=20;
 // Original forest spirit: a seed-like masked body suspended among roots.
 for(let side of [-1,1]){c.save();c.scale(side,1);c.strokeStyle=boss?'#788b86':'#697c50';c.lineWidth=10;c.lineCap='round';c.beginPath();c.moveTo(28,-75);c.bezierCurveTo(85,-140,50,-170,97,-206);c.stroke();c.lineWidth=5;for(let j=0;j<3;j++){c.beginPath();c.moveTo(50+j*9,-108-j*26);c.lineTo(100+j*11,-132-j*26);c.lineTo(112+j*8,-157-j*24);c.stroke();}for(let j=0;j<3;j++){c.lineWidth=8-j;c.beginPath();c.moveTo(35,35);c.bezierCurveTo(130-j*20,65,30+j*30,95,80+j*27,120+j*6);c.stroke();}c.restore();}
 c.shadowBlur=0;const body=c.createLinearGradient(-70,-100,60,100);body.addColorStop(0,'#719466');body.addColorStop(.4,boss?'#385257':'#324f38');body.addColorStop(1,'#112e30');path(c,[[0,-125],[55,-75],[69,9],[31,88],[0,112],[-42,75],[-64,-12],[-43,-92]],body);
 c.strokeStyle='#94b17b';c.lineWidth=2;c.beginPath();c.moveTo(0,-100);c.lineTo(-15,0);c.lineTo(0,90);c.moveTo(0,-23);c.lineTo(42,14);c.moveTo(-12,10);c.lineTo(-43,36);c.stroke();
 path(c,[[-46,-66],[0,-95],[43,-64],[28,-12],[0,15],[-33,-15]],'#cfcea1');path(c,[[-46,-66],[0,-95],[-8,-31],[0,15],[-33,-15]],'#91a687');
 c.shadowColor='#fff4bb';c.shadowBlur=16;ellipse(c,-20,-46,7,4,'#f0e7a2');ellipse(c,20,-46,7,4,'#f0e7a2');c.shadowBlur=0;
 for(let i=0;i<14;i++){const a=i*2.4,x=Math.cos(a)*55,y=Math.sin(a)*65+40;path(c,[[x,y],[x+22,y-17],[x+13,y+7]],i%2?'#668858':'#96ac70');}
 if(boss){c.strokeStyle='#dfd69b';c.lineWidth=2;c.beginPath();c.arc(0,-40,110,0,Math.PI*2);c.stroke();for(let i=0;i<7;i++){const a=i*Math.PI*2/7;c.fillStyle='#ece3ad';c.fillRect(Math.cos(a)*110-3,Math.sin(a)*110-43,6,6);}}
 c.restore();
}
function drawGuardian(c,time){
 c.save();c.translate(420,350+Math.sin(time/1000)*2);
 ellipse(c,0,190,160,25,'#061c24bb');
 // Broad crowned tree silhouette, distinct from the small masked common enemy.
 for(const side of [-1,1]){c.save();c.scale(side,1);c.strokeStyle='#d2bc79';c.lineWidth=15;c.lineCap='round';
 for(let i=0;i<4;i++){c.beginPath();c.moveTo(25,65);c.bezierCurveTo(80+i*20,65,40+i*32,165,90+i*28,182-i*8);c.stroke();}
 c.strokeStyle='#749d91';c.lineWidth=20;c.beginPath();c.moveTo(35,-15);c.lineTo(90,-70);c.lineTo(115,-150);c.lineTo(160,-192);c.stroke();
 for(let i=0;i<3;i++){c.lineWidth=9;c.beginPath();c.moveTo(95+i*14,-90-i*32);c.lineTo(160+i*15,-98-i*33);c.lineTo(170+i*16,-134-i*34);c.stroke();}c.restore();}
 path(c,[[-45,-105],[45,-105],[80,50],[50,140],[-50,140],[-80,50]],'#355653');
 c.strokeStyle='#e7d68e';c.lineWidth=5;c.strokeRect(-39,-100,78,210);
 path(c,[[-68,-105],[-85,-167],[-32,-145],[0,-200],[32,-145],[85,-167],[68,-105]],'#e3c875');
 c.shadowColor='#d8fff0';c.shadowBlur=30;path(c,[[0,-70],[37,-5],[0,70],[-37,-5]],'#cdf3db');c.shadowBlur=0;
 c.strokeStyle='#f2dfa0';c.lineWidth=2;c.beginPath();c.ellipse(0,-10,125,157,0,0,Math.PI*2);c.stroke();
 c.restore();
}
export function drawMap(canvas,s,large=false){
 const c=canvas.getContext('2d'),size=canvas.width,cell=size/11;c.clearRect(0,0,size,size);c.fillStyle='#091d20';c.fillRect(0,0,size,size);if(!s)return;
 for(let y=0;y<11;y++)for(let x=0;x<11;x++){const k=key(x,y);if(!s.map.seen[k])continue;c.fillStyle=s.map.grid[y][x]?'#31483d':s.map.visited[k]?'#93ab83':'#456958';c.fillRect(x*cell+1,y*cell+1,cell-2,cell-2);const e=s.map.events[k];if(!s.map.grid[y][x]&&e){c.fillStyle=e==='enemy'||e==='shrine'?'#d79774':e==='spring'?'#83d9cd':'#edda93';const d=cell*.25;if(e==='shrine'){c.font=`${cell*.9}px serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('★',(x+.5)*cell,(y+.5)*cell);}else if(e==='stairs'){c.fillRect(x*cell+d,y*cell+d,cell/2,cell/2);}else{c.beginPath();c.arc((x+.5)*cell,(y+.5)*cell,cell*.18,0,7);c.fill();}}}
 c.save();c.translate((s.x+.5)*cell,(s.y+.5)*cell);c.rotate(s.dir*Math.PI/2);path(c,[[0,-cell*.43],[cell*.34,cell*.3],[0,cell*.12],[-cell*.34,cell*.3]],'#f5f1ce');c.restore();
}
