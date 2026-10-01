// Original procedural foley. No samples, continuous music, or gameplay RNG.
export function actionCues(before, after, action) {
 const cues=[];
 if(before.phase==='battle'){
  if(action==='attack'||action==='skill')cues.push(action==='skill'?(after.lastAttack?.kind==='miss'?'spell-miss':after.lastAttack?.kind==='critical'?'spell-critical':'skill'):(after.lastAttack?.kind==='miss'?'miss':after.lastAttack?.kind==='critical'?'critical':'attack'));
  if(action==='potion')cues.push('potion');
  if(action==='flee')cues.push('flee');
  else if(after.enemy&&after.enemy.turn>before.turn)cues.push(action==='guard'?'guard':before.turn%3===2?'heavy':'hurt');
  if(after.kills>before.kills)cues.push(after.relic&&!before.relic?'relic':'victory');
 }else{
  if(after.steps>before.steps)cues.push('step');
  else if(after.dir!==before.dir)cues.push(action==='left'?'left':'right');
  if(action==='potion')cues.push('potion');
  if(after.phase==='battle')cues.push(after.enemy.boss?'boss':'encounter');
  if(after.hp<before.hp)cues.push('hurt');
  if(before.event==='spring'&&after.steps>before.steps)cues.push('spring');
 }
 if(after.phase==='dead')cues.push('death');
 return cues;
}
// [offset, duration, start Hz, end Hz, gain, noise, stereo position]
export function score(kind,floor=1,step=0){
 const foot=step%2?.22:-.22;
 const n=(at,d,f,end,g,p=0)=>[at,d,f,end,g,true,p];
 const t=(at,d,f,end,g,p=0)=>[at,d,f,end,g,false,p];
 switch(kind){
 case 'step':return [n(0,.13,[1300,620,900][floor-1],230,.12,foot),t(.015,.10,90,45,.12,foot),...(floor===2?[n(.055,.16,1900,950,.045,-foot)]:[])];
 case 'left':case 'right':return [n(0,.12,1500,450,.045,kind==='left'?-.35:.35)];
 case 'attack':return [n(0,.075,3000,800,.07,-.3),t(.06,.12,150,55,.12,.12),n(.06,.07,1600,360,.10,.12)];
 case 'skill':case 'spell-critical':return [t(0,.13,420,840,.05,-.2),n(.07,.09,2400,4800,.07,-.35),t(.14,.18,kind==='spell-critical'?440:330,70,.13,.2),n(.14,.12,3000,480,.12,.2),...(kind==='spell-critical'?[t(.17,.22,1320,880,.055)]:[])];
 case 'spell-miss':return [t(0,.13,420,840,.05,-.2),n(.07,.16,2400,600,.065,.35)];
 case 'miss':return [n(0,.16,2400,600,.065,-.35)];
 case 'critical':return [n(0,.08,3200,900,.08,-.3),t(.06,.19,190,45,.15),t(.09,.22,1100,750,.05,.25),n(.06,.12,2000,300,.11)];
 case 'hurt':case 'heavy':{const heavy=kind==='heavy';return [t(.17,.18,heavy?72:115,38,heavy?.18:.13),n(.17,.12,heavy?650:1100,210,.11)];}
 case 'guard':return [t(.17,.10,640,420,.10,-.15),t(.18,.15,970,630,.045,.15),n(.17,.09,1800,600,.065)];
 case 'potion':case 'spring':return [t(0,.09,800,1150,.06,-.15),t(.10,.13,620,920,.07,.15),n(0,.22,1200,2400,.025)];
 case 'chest':return [n(0,.18,650,250,.10,-.2),t(.11,.12,180,75,.10),n(.14,.09,2400,500,.05,.2)];
 case 'reward':return [t(0,.25,660,660,.055,-.2),t(.10,.27,880,880,.05,.2),t(.20,.32,1320,1320,.035)];
 case 'victory':case 'relic':return [t(.12,.22,440,440,.055,-.15),t(.23,.3,kind==='relic'?880:660,kind==='relic'?880:660,.05,.15)];
 case 'encounter':case 'boss':return [n(.08,.28,350,150,.07),t(.08,.30,kind==='boss'?65:120,55,.10)];
 case 'flee':return [n(0,.12,1100,400,.09,-.3),n(.10,.13,900,300,.07,.3)];
 case 'death':return [t(0,.4,130,38,.09),n(0,.3,500,100,.04)];
 case 'return':return [t(0,.3,330,660,.045,-.2),t(.12,.35,660,880,.045,.2)];
 case 'enter':return [n(0,.5,[1800,850,1200][floor-1],350,.025,-.3),t(.12,.4,[440,294,523][floor-1],[440,294,523][floor-1],.025,.3)];
 default:return [];
 }
}
export class ForestAudio {
 constructor({createContext=()=>new(window.AudioContext||window.webkitAudioContext)(),hidden=()=>document.hidden,onError=()=>{}}={}){
  this.createContext=createContext;this.hidden=hidden;this.onError=onError;this.muted=true;this.context=null;this.groups=[];this.epoch=0;
 }
 setMuted(value){this.muted=value;if(value)this.stop();}
 async unlock(){
  if(this.muted||this.hidden())return false;
  try{
   if(!this.context){
    const c=this.context=this.createContext();this.master=c.createGain();this.master.gain.value=.55;
    // Hard output bound, even if several rapid actions overlap.
    const limiter=c.createWaveShaper();limiter.curve=Float32Array.from({length:2049},(_,i)=>.7*Math.tanh((i/1024-1)/.7));
    this.master.connect(limiter);limiter.connect(c.destination);
    this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const data=this.noise.getChannelData(0);
    let seed=713;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
   }
   if(this.context.state!=='running')await this.context.resume();
   return this.context.state==='running'&&!this.muted&&!this.hidden();
  }catch{this.setMuted(true);this.onError();return false;}
 }
 stop(){this.epoch++;for(const g of [...this.groups])g.stop();}
 background(){this.stop();if(this.context)this.context.suspend().catch(()=>{});}
 async play(kinds,{floor=1,step=0}={}){
  const epoch=this.epoch;
  if(!await this.unlock()||epoch!==this.epoch)return;
  const notes=(Array.isArray(kinds)?kinds:[kinds]).flatMap(k=>score(k,floor,step));if(!notes.length)return;
  while(this.groups.length>=4)this.groups[0].stop();
  const c=this.context,nodes=[],sources=[],bus=c.createGain(),delay=c.createDelay(.3),echo=c.createGain();
  nodes.push(bus,delay,echo);bus.connect(this.master);delay.delayTime.value=[.065,.12,.19][floor-1];echo.gain.value=[.07,.10,.14][floor-1];bus.connect(delay);delay.connect(echo);echo.connect(this.master);
  let timer;const group={stop:()=>{clearTimeout(timer);for(const s of sources){try{s.stop();}catch{}}for(const n of nodes)n.disconnect();this.groups=this.groups.filter(g=>g!==group);}};this.groups.push(group);
  const now=c.currentTime+.005;
  for(const [at,d,f,end,level,noise,pan] of notes){
   const source=noise?c.createBufferSource():c.createOscillator(),filter=c.createBiquadFilter(),gain=c.createGain();
   if(noise){source.buffer=this.noise;filter.type='lowpass';filter.Q.value=.6;filter.frequency.setValueAtTime(f,now+at);filter.frequency.exponentialRampToValueAtTime(end,now+at+d);}
   else{source.type='sine';source.frequency.setValueAtTime(f,now+at);source.frequency.exponentialRampToValueAtTime(end,now+at+d);filter.frequency.value=8000;}
   gain.gain.setValueAtTime(0,now+at);gain.gain.linearRampToValueAtTime(level,now+at+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+at+d);
   source.connect(filter);filter.connect(gain);
   if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan;gain.connect(p);p.connect(bus);nodes.push(p);}else gain.connect(bus);
   nodes.push(source,filter,gain);sources.push(source);source.start(now+at);source.stop(now+at+d+.01);
  }
  timer=setTimeout(group.stop,(Math.max(...notes.map(n=>n[0]+n[1]))+.35)*1000);
 }
}
