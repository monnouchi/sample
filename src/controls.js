// Keep native click/keyboard activation as the single action path. Pointer events
// only cancel a click after a drag; never execute game actions or block scrolling.
export function protectControls(root=document){
 root.addEventListener('pointerdown',event=>{
  const button=event.target.closest('button');if(!button||event.pointerType==='mouse')return;
  button._touchGesture={id:event.pointerId,x:event.clientX,y:event.clientY,cancelled:false};
 },{passive:true});
 const update=event=>{for(const button of root.querySelectorAll('button')){const g=button._touchGesture;if(g?.id===event.pointerId&&(event.type==='pointercancel'||Math.hypot(event.clientX-g.x,event.clientY-g.y)>12))g.cancelled=true;}};
 root.addEventListener('pointermove',update,{passive:true});
 root.addEventListener('pointercancel',update,{passive:true});
 root.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;const g=button._touchGesture;delete button._touchGesture;if(event.detail!==0&&g?.cancelled){event.preventDefault();event.stopImmediatePropagation();}},true);
}
