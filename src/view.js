// Transient view state only: never written into the version-1 game save.
export function beginMotion(before,after,action,time){
 if(!['forward','back','left','right'].includes(action))return null;
 const turn=action==='left'?-Math.PI/2:action==='right'?Math.PI/2:0;
 if(!turn&&before.x===after.x&&before.y===after.y)return null;
 return {from:before,to:{x:after.x,y:after.y},angle:before.dir*Math.PI/2-Math.PI/2,turn,start:time,duration:180};
}
export function cameraAt(motion,time){
 if(!motion||time>=motion.start+motion.duration)return null;
 const t=Math.max(0,(time-motion.start)/motion.duration),p=t*t*(3-2*t);
 return {x:motion.from.x+(motion.to.x-motion.from.x)*p,y:motion.from.y+(motion.to.y-motion.from.y)*p,angle:motion.angle+motion.turn*p,moving:true};
}
export function illumination(light){const strength=Math.max(0,Math.min(100,light))/100;return {reach:2+strength*7,shade:(1-strength)*.48};}
