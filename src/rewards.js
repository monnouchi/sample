export const CHESTS={
 common:{name:'苔木の宝箱',mark:'Ⅰ',color:'#c2ad7e'},
 silver:{name:'月銀の宝箱',mark:'Ⅱ',color:'#c5e1e8'},
 gold:{name:'星金の宝箱',mark:'Ⅲ',color:'#f3d281'}
};
// Cosmetic/reward tier roll is independent of the combat RNG and map generator.
export function chestTier(seed,floor,x,y){
 let n=(seed^Math.imul(floor,0x9e3779b1)^Math.imul(x,0x85ebca6b)^Math.imul(y,0xc2b2ae35))>>>0;
 n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);n=(n^(n>>>16))>>>0;
 const r=n/4294967296;return r<.7?'common':r<.95?'silver':'gold';
}
export function rewardGold(tier,roll){return tier==='common'?18+roll%16:tier==='silver'?26+roll%10:36+roll%10;}
export function restoreRewards(value){
 if(!Array.isArray(value))return [];
 const found=new Set(),items=[];
 for(const item of value.slice(0,100)){
  if(!item||typeof item!=='object'||!Number.isInteger(item.floor)||item.floor<1||item.floor>3||!Object.hasOwn(CHESTS,item.tier))continue;
  if(typeof item.id!=='string'||!new RegExp(`^${item.floor}:[1-9],[1-9]$`).test(item.id)||found.has(item.id))continue;
  if(!Number.isInteger(item.gold)||item.gold<18||item.gold>45||item.potions!==1||!Number.isInteger(item.light)||item.light<0||item.light>10)continue;
  found.add(item.id);items.push({id:item.id,floor:item.floor,tier:item.tier,gold:item.gold,potions:1,light:item.light});
  if(items.length===9)break;
 }
 return items;
}
