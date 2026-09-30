export const SIZE = 11;
export const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
export const FLOORS = ['木漏れ日の回廊','霧雨の根底','星眠りの庭'];
export const SAVE_KEY = 'suito-save-v1';
export const key = (x,y) => `${x},${y}`;
export function random(seed) { let n=seed>>>0; return ()=>{ n+=0x6D2B79F5; let t=n; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function shuffle(a,r) { for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
export function generate(seed, floor=1) {
 const r=random(seed+floor*7919), grid=Array.from({length:SIZE},()=>Array(SIZE).fill(1));
 const dig=(x,y)=>{grid[y][x]=0; for(const [dx,dy] of shuffle([...DIRS],r)){const nx=x+dx*2,ny=y+dy*2;if(nx>0&&ny>0&&nx<SIZE-1&&ny<SIZE-1&&grid[ny][nx]){grid[y+dy][x+dx]=0;dig(nx,ny);}}};
 dig(1,1);
 // A few cross passages keep routes short and offer meaningful map choices.
 for(let i=0;i<7;i++){const x=1+Math.floor(r()*9),y=1+Math.floor(r()*9);if(grid[y][x] && ((grid[y-1][x]===0&&grid[y+1][x]===0)||(grid[y][x-1]===0&&grid[y][x+1]===0)))grid[y][x]=0;}
 const distances={[key(1,1)]:0},queue=[[1,1]];
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of DIRS){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(grid[ny]?.[nx]===0&&distances[k]===undefined){distances[k]=distances[key(x,y)]+1;queue.push([nx,ny]);}}}
 const sorted=queue.sort((a,b)=>distances[key(...b)]-distances[key(...a)]),exit=sorted[0],events={};
 events[key(...exit)]=floor===3?'shrine':'stairs';
 const cells=shuffle(sorted.filter(p=>distances[key(...p)]>3 && key(...p)!==key(...exit)),r);
 for(let i=0;i<cells.length;i++){if(i<4)events[key(...cells[i])]='enemy';else if(i<7)events[key(...cells[i])]='chest';else if(i===7)events[key(...cells[i])]='spring';}
 return {grid,events,exit,seen:{},visited:{}};
}
export function reveal(s){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=s.x+dx,y=s.y+dy;if(x>=0&&y>=0&&x<SIZE&&y<SIZE)s.map.seen[key(x,y)]=true;}s.map.visited[key(s.x,s.y)]=true;}
export function fresh(seed=Math.floor(Math.random()*4294967296)){
 const s={version:1,seed:seed>>>0,rng:seed>>>0,phase:'explore',floor:1,x:1,y:1,dir:1,hp:100,maxHp:100,focus:6,light:100,potions:3,gold:0,steps:0,kills:0,relic:false,map:generate(seed,1),enemy:null,log:['小さな灯りを携え、森へ足を踏み入れた。'],previous:[1,1]};
 if(s.map.grid[1][2])s.dir=2;reveal(s);return s;
}
function roll(s,n){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng%n;}
function recover(s,field,amount,max){const before=s[field];s[field]=Math.min(max,before+amount);return s[field]-before;}
function recovery(label,amount){return amount?`${label}が${amount}回復`:`${label}は満タン（回復なし）`;}
function log(s,t){s.log=[t,...s.log].slice(0,4);}
function hurt(s,n){s.hp=Math.max(0,s.hp-n);if(!s.hp){s.phase='dead';log(s,'灯りが遠のく。探索は、ここで終わった。');}}
function encounter(s,boss=false){const names=['苔角の獣','宵羽の蛾','根絡みの番人'];const hp=boss?65:19+s.floor*6;s.enemy={name:boss?'星樹の守り手':names[roll(s,3)],hp,maxHp:hp,turn:0,boss};s.phase='battle';log(s,`${s.enemy.name}が道をふさいだ。`);}
export function act(s,action){
 if(!s||['dead','won','returned'].includes(s.phase))return false;
 if(action==='return' && s.phase!=='battle'){s.phase=s.relic?'won':'returned';log(s,s.relic?'星の種を抱え、森の外へ帰還した。':'帰路の灯に導かれ、無事に森を出た。');return true;}
 if(s.phase==='battle')return battle(s,action);
 if(action==='potion'){if(!s.potions||s.hp===s.maxHp)return false;s.potions--;const healed=recover(s,'hp',42,s.maxHp);log(s,`露の薬。${recovery('体力',healed)}。`);return true;}
 if(action==='descend'&&s.phase==='stairs'){s.floor++;s.map=generate(s.seed,s.floor);s.x=s.y=1;s.dir=s.map.grid[1][2]?2:1;const light=recover(s,'light',25,100),focus=recover(s,'focus',6,6),hp=recover(s,'hp',18,100);s.phase='explore';s.previous=[1,1];reveal(s);log(s,`第${s.floor}層へ。${recovery('体力',hp)}。${recovery('灯り',light)}。${recovery('気力',focus)}。`);return true;}
 if(action==='stay'&&s.phase==='stairs'){s.phase='explore';return true;}
 if(s.phase==='stairs')return false;
 if(action==='left'||action==='right'){s.dir=(s.dir+(action==='left'?3:1))%4;return true;}
 if(action==='forward'||action==='back'){
 const d=DIRS[(s.dir+(action==='back'?2:0))%4],x=s.x+d[0],y=s.y+d[1];
 if(s.map.grid[y]?.[x]!==0){log(s,'深い茂みだ。この先には進めない。');return false;}
 s.previous=[s.x,s.y];s.x=x;s.y=y;s.steps++;s.light=Math.max(0,s.light-1);reveal(s);
 if(s.light===0){hurt(s,4);if(s.phase==='dead')return true;log(s,'灯りが尽きた。闇が体力を4奪う。帰還を急ごう。');}
 const k=key(x,y),e=s.map.events[k];
 if(e==='enemy')encounter(s);
 else if(e==='shrine')encounter(s,true);
 else if(e==='chest'){delete s.map.events[k];const gold=18+roll(s,18);s.gold+=gold;s.potions++;const light=recover(s,'light',10,100);log(s,`古い箱に結晶${gold}個と露の薬。${recovery('灯り',light)}。`);}
 else if(e==='spring'){delete s.map.events[k];const hp=recover(s,'hp',30,100),focus=recover(s,'focus',6,6);log(s,`清らかな泉。${recovery('体力',hp)}。${recovery('気力',focus)}。`);}
 else if(e==='stairs'){s.phase='stairs';log(s,'根の階段を見つけた。この先は、さらに深い森。');}
 else if(s.light>0)log(s,s.steps%4===0?'葉擦れの向こうに、何かの気配がする。':'地図に、新しい一歩を刻む。');
 return true;
 }
 return false;
}
function battle(s,a){
 const e=s.enemy;if(!['attack','skill','guard','potion','flee'].includes(a))return false;
 if(a==='skill'&&s.focus<3)return false;
 if(a==='potion'&&(!s.potions||s.hp===100))return false;
 if(a==='flee'){
 if(e.boss){log(s,'守り手の根が退路をふさいでいる。');return false;}
 hurt(s,4+s.floor);if(s.phase!=='dead'){[s.x,s.y]=s.previous;s.phase='explore';s.enemy=null;log(s,`身をひるがえして退いた。体力を${4+s.floor}失った。`);}return true;
 }
 let message='';
 if(a==='attack'||a==='skill'){const dmg=a==='skill'?23+roll(s,7):10+roll(s,5);if(a==='skill')s.focus-=3;e.hp=Math.max(0,e.hp-dmg);message=`${a==='skill'?'翠の一閃':'短剣の一撃'}。${dmg}のダメージ。`;}
 if(a==='potion'){s.potions--;const hp=recover(s,'hp',42,100);message=`露の薬による回復：${recovery('体力',hp)}。`;}
 if(a==='guard'){const focus=recover(s,'focus',2,6);message=`身を守った。${recovery('気力',focus)}。`;}
 if(e.hp<=0){s.kills++;s.gold+=e.boss?100:8+s.floor*4;s.focus=Math.min(6,s.focus+1);delete s.map.events[key(s.x,s.y)];s.phase='explore';if(e.boss){s.relic=true;message+=' 星の種を手に入れた！ 帰路の灯を使おう。';}else message+=' 魔物を退けた。';s.enemy=null;log(s,message);return true;}
 const heavy=e.turn%3===2;let damage=(e.boss?9:3+s.floor)+roll(s,4);if(heavy)damage*=2;if(a==='guard')damage=Math.max(1,Math.floor(damage/4));e.turn++;hurt(s,damage);if(s.phase!=='dead')log(s,`${message} 敵の${heavy?'強撃':'反撃'}：体力に${damage}ダメージ。`);return true;
}
export function serialize(s){return JSON.stringify(s);}
export function restore(raw){
 try{const s=JSON.parse(raw),int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
 if(!s||s.version!==1||!int(s.seed,0,4294967295)||!int(s.rng,0,4294967295)||!int(s.floor,1,3)||!int(s.x,0,10)||!int(s.y,0,10)||!int(s.dir,0,3)||!int(s.hp,0,100)||s.maxHp!==100||!int(s.focus,0,6)||!int(s.light,0,100)||!int(s.potions,0,1000)||!int(s.gold,0,100000)||!int(s.steps,0,100000)||!int(s.kills,0,1000)||typeof s.relic!=='boolean')return null;
 if(!['explore','battle','stairs','dead','won','returned'].includes(s.phase))return null;
 if(!s.map||!Array.isArray(s.map.grid)||s.map.grid.length!==11||s.map.grid.some(r=>!Array.isArray(r)||r.length!==11||r.some(c=>c!==0&&c!==1))||s.map.grid[s.y][s.x]!==0)return null;
 for(const obj of [s.map.events,s.map.seen,s.map.visited])if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).some(k=>!/^([0-9]|10),([0-9]|10)$/.test(k)))return null;
 if(Object.values(s.map.events).some(e=>!['enemy','chest','spring','stairs','shrine'].includes(e)))return null;
 if(!Array.isArray(s.previous)||s.previous.length!==2||!s.previous.every(v=>int(v,0,10))||s.map.grid[s.previous[1]][s.previous[0]]!==0)return null;
 if(!Array.isArray(s.log)||s.log.length>4||s.log.some(t=>typeof t!=='string'||t.length>200))return null;
 if(s.phase==='battle'&&(!s.enemy||typeof s.enemy.name!=='string'||s.enemy.name.length>40||!int(s.enemy.hp,1,100)||!int(s.enemy.maxHp,1,100)||s.enemy.hp>s.enemy.maxHp||!int(s.enemy.turn,0,100000)||typeof s.enemy.boss!=='boolean'))return null;
 s.log=s.log.map(t=>t.replaceAll('帰還の糸','帰路の灯'));
 return s;
 }catch{return null;}
}
