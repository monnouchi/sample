// Native click is the only pointer action path. Movement and scrolling stay native.
export function protectControls(root=document,{getMode=()=>'',quietMs=360}={}){
 const pointers=new Map(),keys=new Set();let guarded=false,until=0,lastKey=null;
 const now=()=>performance.now(),game=button=>button?.matches('[data-action],#potion,#return,#rest,#mission-return');
 const ready=()=>now()>=until&&!pointers.size&&!keys.size;
 const stop=event=>{event.preventDefault();event.stopImmediatePropagation();};
 root.addEventListener('pointerdown',event=>{
  const button=event.target.closest('button');
  if(guarded&&ready())guarded=false;
  const gesture={id:event.pointerId,x:event.clientX,y:event.clientY,mode:getMode(),cancelled:false,blocked:guarded};
  pointers.set(event.pointerId,gesture);if(button)button._touchGesture=gesture;
  if(guarded)until=now()+quietMs;
 },{passive:true,capture:true});
 root.addEventListener('pointermove',event=>{const g=pointers.get(event.pointerId);if(g&&Math.hypot(event.clientX-g.x,event.clientY-g.y)>12)g.cancelled=true;},{passive:true});
 const release=event=>{const g=pointers.get(event.pointerId);if(g&&event.type==='pointercancel')g.cancelled=true;pointers.delete(event.pointerId);if(guarded)until=now()+quietMs;};
 root.addEventListener('pointerup',release,{passive:true,capture:true});root.addEventListener('pointercancel',release,{passive:true,capture:true});
 root.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  const g=event.detail===0?null:button._touchGesture;delete button._touchGesture;
  if(g?.cancelled){stop(event);return;}
  if(!game(button))return;
  const stale=g&&(g.mode!==getMode()||g.blocked);
  if((event.detail!==0&&!g)||stale||(guarded&&!ready())||(event.detail===0&&lastKey&&(lastKey.mode!==getMode()||lastKey.blocked))){stop(event);return;}
  guarded=false;
 },true);
 const actionKey=e=>['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','1','2','3','Enter',' '].includes(e.key);
 root.addEventListener('keydown',event=>{
  if(!actionKey(event))return;
  if(guarded&&ready())guarded=false;
  lastKey={mode:getMode(),blocked:guarded};keys.add(event.code||event.key);
  if(guarded){until=now()+quietMs;stop(event);}
 },true);
 root.addEventListener('keyup',event=>{keys.delete(event.code||event.key);if(guarded)until=now()+quietMs;const current=lastKey;queueMicrotask(()=>{if(lastKey===current)lastKey=null;});},true);
 const reset=()=>{pointers.clear();keys.clear();lastKey=null;guarded=true;until=now()+quietMs;};
 globalThis.addEventListener?.('blur',reset);
 return {transition(){guarded=true;until=now()+quietMs;},reset};
}
