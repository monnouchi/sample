import {themeFloor} from './companions.js?v=20261001-cachefix';
import {projectObjects,drawChest,drawSpring} from './objects.js?v=20261001-cachefix';
import {chestTier,CHESTS} from './rewards.js?v=20261001-cachefix';
import {DIRS,key,random} from './game.js?v=20261001-cachefix';
import {illumination} from './view.js?v=20261001-cachefix';
const W=840,H=640;
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function path(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
const texture=document.createElement('canvas');texture.width=128;texture.height=256;
const t=texture.getContext('2d'),r=random(91);t.fillStyle='#233d2b';t.fillRect(0,0,128,256);
for(let i=0;i<1000;i++){const x=r()*128,y=r()*256;ellipse(t,x,y,2+r()*12,2+r()*7,`rgba(${35+r()*40},${65+r()*45},${35+r()*30},.6)`);}
for(let j=0;j<4;j++){const x=j*38-8;t.fillStyle='#233128';t.fillRect(x,0,12,256);t.strokeStyle='#57704a';t.lineWidth=2;t.beginPath();t.moveTo(x+7,256);t.bezierCurveTo(x-5,180,x+20,70,x+10,0);t.stroke();}
for(let i=0;i<80;i++){ellipse(t,r()*128,r()*256,2+r()*4,1+r()*3,'#60805066');}
const textures=[texture];
for(let floor=2;floor<=3;floor++){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const c=canvas.getContext('2d');c.drawImage(texture,0,0);
 c.fillStyle=floor===2?'#123e5080':'#52575f60';c.fillRect(0,0,128,256);
 c.strokeStyle=floor===2?'#4a605c':'#809388';c.lineWidth=floor===2?15:6;
 for(let i=0;i<5;i++){c.beginPath();c.moveTo(i*35-30,256);c.bezierCurveTo(i*25+40,190,i*30-20,90,i*25+10,0);c.stroke();}
 textures.push(canvas);
}
const PALETTES=[{sky:'#739977',floor:['#a7b292','#61795d','#273f32']},{sky:'#647f8c',floor:['#809b9e','#3d6267','#1c3c44']},{sky:'#8297b6',floor:['#a7b5bb','#596d7b','#293b4f']}];
export function drawScene(canvas,s,time=0,camera=null){
 const c=canvas.getContext('2d');c.clearRect(0,0,W,H);const floorIndex=themeFloor(s)-1,palette=PALETTES[floorIndex];
 const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#0a292c');sky.addColorStop(.4,palette.sky);sky.addColorStop(.52,'#b4c498');sky.addColorStop(1,'#123730');c.fillStyle=sky;c.fillRect(0,0,W,H);
 const rr=random(783);for(let i=0;i<70;i++){const x=rr()*W,y=rr()*220;c.fillStyle='#143d3270';c.fillRect(x,y,3+rr()*10,380-y);ellipse(c,x,y,20+rr()*100,15+rr()*40,`rgba(15,49,39,${.2+rr()*.3})`);}
 // Soft shafts of light through the canopy.
 for(let i=0;i<5;i++){const x=230+i*77;const g=c.createLinearGradient(x,0,x-100,H);g.addColorStop(0,'#e2efb11a');g.addColorStop(1,'#c9eac000');path(c,[[x,0],[x+22,0],[x-60,H],[x-175,H]],g);}
 const floor=c.createLinearGradient(0,315,0,H);floor.addColorStop(0,palette.floor[0]);floor.addColorStop(.25,palette.floor[1]);floor.addColorStop(1,palette.floor[2]);path(c,[[0,330],[W,330],[W,H],[0,H]],floor);
 // Receding stones and low ferns give depth to the forest floor.
 const fr=random(43);for(let i=0;i<220;i++){const y=335+fr()*310,p=(y-320)/320,x=fr()*W;ellipse(c,x,y,1+p*12,1+p*4,fr()>.5?'#b2b78728':'#102c2d66');}
 if(s){
 const [dx,dy]=DIRS[s.dir],angle=camera?.angle??Math.atan2(dy,dx),px=camera?.x??s.x,py=camera?.y??s.y,light=illumination(s.light),z=[];
 for(let sx=0;sx<W;sx+=2){const offset=Math.atan((sx/W*2-1)*.72),a=angle+offset,rx=Math.cos(a),ry=Math.sin(a);let dist=.02,hx=0,hy=0;
 while(dist<14){hx=px+.5+rx*dist;hy=py+.5+ry*dist;if(s.map.grid[Math.floor(hy)]?.[Math.floor(hx)]!==0)break;dist+=.035;}
 const depth=dist*Math.cos(offset),height=Math.min(1200,420/depth),top=320-height*.6;
 const fx=hx-Math.floor(hx),fy=hy-Math.floor(hy),edge=Math.min(fx,1-fx)<Math.min(fy,1-fy)?fy:fx;
 c.drawImage(textures[floorIndex],Math.floor(edge*127),0,1,256,sx,top,3,height);
 c.fillStyle=`rgba(7,29,30,${Math.min(.93,depth/light.reach*.65)})`;c.fillRect(sx,top,3,height);
 c.fillStyle=`rgba(159,186,155,${Math.min(.3,depth*.025)*(s.light/100)})`;c.fillRect(sx,top,3,height);z.push(depth);
 }
 // Draw discovered objects in camera space; clip every column against the wall depth.
 for(const item of projectObjects(s,camera)){
 const {x,y,type:e,depth,scale,cx,cy}=item;c.save();c.beginPath();
 for(let sx=0;sx<W;sx+=2)if(depth<=z[sx/2]+.08)c.rect(sx,0,2,H);
 c.clip();c.translate(cx,cy);c.scale(scale,scale);
 if(e==='chest'){const tier=chestTier(s.seed,s.floor,x,y);drawChest(c,tier,CHESTS[tier].color);}
 if(e==='stairs'){for(let i=0;i<5;i++){c.fillStyle=i%2?'#8d9d75':'#576f56';c.fillRect(-55-i*10,-65+i*15,110+i*20,12);}c.fillStyle='#e2dfa8';c.font='26px serif';c.textAlign='center';c.fillText('◇',0,-88);}
 if(e==='shrine'){c.strokeStyle='#f3d393';c.lineWidth=7;c.shadowColor='#f8d680';c.shadowBlur=24;path(c,[[0,-140],[48,-75],[0,-10],[-48,-75]],'#648079');c.strokeRect(-62,-155,124,160);c.shadowBlur=0;}
 if(e==='spring')drawSpring(c,time);
 if(e==='rest'||e==='rest-used'){path(c,[[-140,-100],[0,-180],[140,-100]],'#819577');c.fillStyle='#52674f';c.fillRect(-112,-100,12,100);c.fillRect(100,-100,12,100);path(c,[[-118,0],[118,0],[90,15],[-90,15]],'#3c5344');ellipse(c,0,-60,18,25,e==='rest'?'#e8d998':'#718278');c.strokeStyle='#b3bc8a';c.lineWidth=4;c.strokeRect(-25,-90,50,63);}
 c.restore();
 }
 }
 // Floor-specific dressing uses a local fixed seed, never the game RNG.
 const dressing=random(918+floorIndex);
 if(floorIndex===0){for(let i=0;i<35;i++){const x=dressing()*W,y=380+dressing()*250;path(c,[[x,y],[x+9,y-3],[x+17,y+4],[x+5,y+7]],i%2?'#a19c5944':'#d1b47955');}}
 if(floorIndex===1){for(const x of [35,805]){ellipse(c,x,595,110,20,'#7aa8b455');ellipse(c,x,595,78,8,'#c4dbe233');}for(let i=0;i<7;i++)ellipse(c,80+i*115,300+i%3*35,130,22,'#adceda0b');}
 if(floorIndex===2){for(let i=0;i<32;i++){const x=dressing()*W,y=400+dressing()*220;ellipse(c,x,y,3+dressing()*3,2,'#e1e7e6b0');}for(let i=0;i<9;i++){const x=dressing()*W,y=40+dressing()*210;path(c,[[x,y-4],[x+2,y],[x,y+4],[x-2,y]],'#e5e5c980');}}
 if(s?.version===2){const tones=['#b5cb7b0c','#75b69c10','#56796012','#d8ba6310','#72b7bf12','#608cc422','#6e7dba18','#e1c38f13','#d9e2ed12','#a8bade18'];c.fillStyle=tones[s.floor-1];c.fillRect(0,0,W,H);}
 // Foreground fronds frame the playable scene.
 const pr=random(31);for(let side=0;side<2;side++){c.save();if(side){c.translate(W,0);c.scale(-1,1);}for(let i=0;i<22;i++){const x=pr()*120,y=430+pr()*230;c.strokeStyle=i%2?'#295846':'#3c6546';c.lineWidth=2;c.beginPath();c.moveTo(x,y+50);c.quadraticCurveTo(x+10,y,x+60,y-35);c.stroke();for(let j=0;j<5;j++){const px=x+j*10,py=y+20-j*9;path(c,[[px,py],[px-25,py-20],[px+10,py-5]],'#356347');path(c,[[px,py],[px+30,py-4],[px+13,py+8]],'#244d39');}}c.restore();}
 if(s){c.fillStyle=`rgba(3,12,24,${illumination(s.light).shade})`;c.fillRect(0,0,W,H);}
 if(s?.phase==='battle')drawCreature(c,s.enemy,time);
 const fire=random(103);for(let i=0;i<25;i++){const x=fire()*W,y=fire()*H,alpha=.35+.3*Math.sin(time/1300+i);c.shadowColor='#e4ee99';c.shadowBlur=12;ellipse(c,x+Math.sin(time/2800+i)*4,y,1.3,1.3,`rgba(223,238,162,${alpha})`);}c.shadowBlur=0;
 const vignette=c.createRadialGradient(420,280,150,420,300,560);vignette.addColorStop(0,'#061e2100');vignette.addColorStop(1,'#021619a0');c.fillStyle=vignette;c.fillRect(0,0,W,H);
}
function drawCreature(c,e,time){
 if(e.boss){drawGuardian(c,time);return;}
 c.save();c.translate(420,385+Math.sin(time/900)*2);ellipse(c,0,135,135,17,'#061c24aa');
 if(e.name==='苔角の獣'){
  // A low, broad quadruped with paired moss-covered antlers.
  for(const x of [-100,-52,52,100])path(c,[[x-12,22],[x+12,22],[x+18,124],[x-19,124]],'#4d6247');
  ellipse(c,0,15,135,60,'#657b50');ellipse(c,0,-19,67,63,'#88925f');
  path(c,[[-54,-48],[-80,-87],[-18,-67]],'#b1b078');path(c,[[54,-48],[80,-87],[18,-67]],'#b1b078');
  c.strokeStyle='#afbd86';c.lineWidth=9;c.lineCap='round';
  for(const side of [-1,1]){c.beginPath();c.moveTo(side*30,-63);c.lineTo(side*55,-120);c.lineTo(side*89,-151);c.moveTo(side*52,-111);c.lineTo(side*25,-150);c.moveTo(side*67,-132);c.lineTo(side*104,-121);c.stroke();ellipse(c,side*55,-116,18,10,'#91b45f');}
  ellipse(c,0,11,48,30,'#b6b288');ellipse(c,0,10,17,11,'#293d31');
  for(const x of [-28,28])ellipse(c,x,-27,7,4,'#f8e9ae');
  for(let i=0;i<8;i++)ellipse(c,-112+i*31,-16+Math.sin(i)*12,20,12,'#97a45d');
 }else if(e.name==='宵羽の蛾'){
  // Wing spread and long antennae remain recognizable without color.
  for(const side of [-1,1]){c.save();c.scale(side,1);path(c,[[8,-26],[157,-142],[192,-68],[150,21],[174,83],[96,117],[15,57]],'#899cb1');path(c,[[17,-18],[143,-108],[158,-69],[127,7],[27,40]],'#465c81');ellipse(c,113,-47,28,37,'#d5ca9e');ellipse(c,113,-47,13,19,'#304360');path(c,[[24,47],[140,35],[123,93],[57,72]],'#b5adb0');c.restore();}
  ellipse(c,0,15,18,95,'#d2c5a1');ellipse(c,0,-66,22,24,'#e0d6ac');c.strokeStyle='#dedba9';c.lineWidth=4;
  for(const side of [-1,1]){c.beginPath();c.moveTo(side*9,-79);c.quadraticCurveTo(side*30,-155,side*60,-150);c.stroke();ellipse(c,side*60,-150,5,5,'#e7dfb4');}
 }else{
  // Narrow crooked trunk, unequal arms and long root legs.
  path(c,[[-24,-173],[31,-144],[20,-38],[57,67],[10,102],[-50,55],[-32,-67]],'#8c8870');
  c.strokeStyle='#baad82';c.lineWidth=18;c.lineCap='round';c.beginPath();c.moveTo(-27,-79);c.lineTo(-100,-22);c.lineTo(-125,83);c.moveTo(22,-59);c.lineTo(75,-104);c.lineTo(122,-71);c.stroke();
  c.lineWidth=8;for(let i=0;i<4;i++){c.beginPath();c.moveTo(-20+i*15,52);c.bezierCurveTo(-60+i*34,90,-80+i*47,110,-95+i*61,142-i*5);c.stroke();}
  c.strokeStyle='#4c6951';c.lineWidth=6;c.beginPath();c.moveTo(-17,-143);c.lineTo(-7,-80);c.lineTo(0,25);c.stroke();
  ellipse(c,-7,-98,6,8,'#f0e0a0');ellipse(c,16,-89,6,8,'#f0e0a0');
  path(c,[[14,-136],[52,-188],[72,-158],[41,-121]],'#a4b28a');
 }
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
 for(let y=0;y<11;y++)for(let x=0;x<11;x++){const k=key(x,y);if(!s.map.seen[k])continue;c.fillStyle=s.map.grid[y][x]?'#31483d':s.map.visited[k]?'#93ab83':'#456958';c.fillRect(x*cell+1,y*cell+1,cell-2,cell-2);const e=s.map.events[k];if(!s.map.grid[y][x]&&e){c.fillStyle=e==='enemy'||e==='shrine'?'#d79774':e==='spring'?'#83d9cd':'#edda93';const d=cell*.25;if(e==='rest'||e==='rest-used'){c.font=`${cell*.9}px serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=e==='rest'?'#e6dc9c':'#93ae9f';c.fillText(e==='rest'?'⌂':'✓',(x+.5)*cell,(y+.5)*cell);}else if(e==='shrine'){c.font=`${cell*.9}px serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('★',(x+.5)*cell,(y+.5)*cell);}else if(e==='stairs'){c.fillRect(x*cell+d,y*cell+d,cell/2,cell/2);}else{c.beginPath();c.arc((x+.5)*cell,(y+.5)*cell,cell*.18,0,7);c.fill();}}}
 c.save();c.translate((s.x+.5)*cell,(s.y+.5)*cell);c.rotate(s.dir*Math.PI/2);path(c,[[0,-cell*.43],[cell*.34,cell*.3],[0,cell*.12],[-cell*.34,cell*.3]],'#f5f1ce');c.restore();
}
