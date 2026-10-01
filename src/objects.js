// Camera-space event positions, limited to discovered tiles with clear sight.
export function projectObjects(s,camera=null){
 const angles=[-Math.PI/2,0,Math.PI/2,Math.PI],angle=camera?.angle??angles[s.dir],px=camera?.x??s.x,py=camera?.y??s.y;
 const cx=Math.cos(angle),cy=Math.sin(angle),items=[];
 for(const [cell,type] of Object.entries(s.map.events)){
  if(type==='enemy'||!s.map.seen[cell])continue;
  const [x,y]=cell.split(',').map(Number),rx=x-px,ry=y-py,depth=rx*cx+ry*cy,lateral=-rx*cy+ry*cx;
  if(depth<.18||depth>5||Math.abs(lateral)>depth*.9)continue;
  const distance=Math.hypot(rx,ry);let clear=true;
  for(let n=.05;n<distance;n+=.05)if(s.map.grid[Math.floor(py+.5+ry*n/distance)]?.[Math.floor(px+.5+rx*n/distance)]!==0){clear=false;break;}
  if(clear)items.push({x,y,type,depth,cx:420+lateral/depth*420/.72,cy:320+168/depth,scale:.85/depth});
 }
 return items.sort((a,b)=>b.depth-a.depth);
}
export function drawChest(c,tier,color){
 const trim=tier==='common'?'#b39b65':color;
 c.fillStyle='#061a1f88';c.beginPath();c.ellipse(5,7,118,23,0,0,7);c.fill();
 const polygon=(points,fill)=>{c.fillStyle=fill;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
 polygon([[-95,-68],[66,-68],[66,0],[-95,0]],'#765237');
 polygon([[66,-68],[100,-87],[100,-18],[66,0]],'#443d2e');
 polygon([[-95,-68],[-61,-89],[100,-89],[66,-68]],'#b08a53');
 // Rounded lid, with a visible side cap and a seam above the body.
 c.fillStyle='#9a7848';c.beginPath();c.moveTo(-95,-68);c.bezierCurveTo(-98,-129,66,-129,66,-68);c.closePath();c.fill();
 polygon([[66,-68],[100,-89],[100,-103],[78,-117],[47,-117]],'#67553b');
 c.strokeStyle='#382e24';c.lineWidth=3;for(const y of [-52,-27]){c.beginPath();c.moveTo(-89,y);c.lineTo(60,y);c.stroke();}
 c.strokeStyle=trim;c.lineWidth=tier==='gold'?9:6;c.strokeRect(-95,-68,161,68);
 for(const x of [-66,36]){c.fillStyle=trim;c.fillRect(x,-68,9,67);c.beginPath();c.moveTo(x+4,-68);c.quadraticCurveTo(x+4,-99,x+7,-110);c.stroke();}
 c.fillStyle=trim;c.fillRect(-24,-78,22,33);c.fillStyle='#263631';c.fillRect(-15,-66,5,12);
 for(const x of [-85,53])for(const y of [-58,-10]){c.fillStyle='#dfd6ab';c.beginPath();c.arc(x,y,3,0,7);c.fill();}
 if(tier!=='common'){
  c.strokeStyle=trim;c.lineWidth=3;c.strokeRect(-47,-57,66,44);
  c.fillStyle=trim;c.font='23px serif';c.textAlign='center';c.fillText(tier==='gold'?'✦':'◇',-14,-23);
 }
}
export function drawSpring(c,time){
 const oval=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fill();};
 oval(0,12,140,33,'#061b2488');oval(0,-2,125,38,'#435b59');oval(0,-15,126,37,'#90a89c');oval(0,-15,102,25,'#214e5b');
 const water=c.createLinearGradient(0,-40,0,12);water.addColorStop(0,'#377d87');water.addColorStop(.6,'#79c5c4');water.addColorStop(1,'#315f6d');oval(0,-15,99,23,water);
 c.strokeStyle='#d0e6d5aa';c.lineWidth=2;
 for(let i=0;i<3;i++){c.beginPath();c.ellipse(-15+i*12,-16,25+i*24+Math.sin(time/1200)*2,4+i*4,0,.15,2.8);c.stroke();}
 // Broad stone rim in perspective, reflections and moss anchor the water to the floor.
 for(let i=0;i<10;i++){const a=i*Math.PI/5;oval(Math.cos(a)*115,-15+Math.sin(a)*31,17,8,i%2?'#82998d':'#a2b2a0');}
 for(const x of [-106,86]){oval(x,5,20,7,'#627d4c');oval(x-6,1,12,5,'#95ad72');}
 c.strokeStyle='#c0e4d3';c.lineWidth=4;c.beginPath();c.moveTo(-35,-22);c.lineTo(-3,-22);c.moveTo(20,-9);c.lineTo(48,-9);c.stroke();
 c.strokeStyle='#709087';c.lineWidth=12;c.beginPath();c.moveTo(43,-38);c.quadraticCurveTo(63,-82,38,-93);c.stroke();
 c.strokeStyle='#a4dedbcc';c.lineWidth=4;c.beginPath();c.moveTo(37,-91);c.quadraticCurveTo(11,-70,7,-20);c.stroke();
}
