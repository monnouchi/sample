import {restoreFind} from './loot.js?v=20261001-input-boundaries';
export const CHESTS={
 common:{name:'苔木の宝箱',mark:'Ⅰ',color:'#c2ad7e',potions:1,lightMax:10},
 silver:{name:'月銀の宝箱',mark:'Ⅱ',color:'#c5e1e8',potions:1,lightMax:15},
 gold:{name:'星金の宝箱',mark:'Ⅲ',color:'#f3d281',potions:2,lightMax:20}
};
// Cosmetic/reward tier roll is independent of the combat RNG and map generator.
export function chestTier(seed,floor,x,y){
 let n=(seed^Math.imul(floor,0x9e3779b1)^Math.imul(x,0x85ebca6b)^Math.imul(y,0xc2b2ae35))>>>0;
 n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);n=(n^(n>>>16))>>>0;
 const r=n/4294967296;return r<.7?'common':r<.95?'silver':'gold';
}
export function rewardGold(tier,roll){return tier==='common'?18+roll%16:tier==='silver'?26+roll%10:36+roll%10;}
export function restoreRewards(value,depth=3){
 if(!Array.isArray(value))return [];
 const found=new Set(),items=[];
 for(const item of value.slice(0,100)){
  if(!item||typeof item!=='object'||!Number.isInteger(item.floor)||item.floor<1||item.floor>depth||!Object.hasOwn(CHESTS,item.tier))continue;
  if(typeof item.id!=='string'||!new RegExp(`^${item.floor}:[1-9],[1-9]$`).test(item.id)||found.has(item.id))continue;
  const cap=item.lightMax===undefined?10:item.lightMax;
  if(![10,CHESTS[item.tier].lightMax].includes(cap)||!Number.isInteger(item.potions)||item.potions<1||item.potions>CHESTS[item.tier].potions)continue;
  if(!Number.isInteger(item.gold)||item.gold<18||item.gold>45||!Number.isInteger(item.light)||item.light<0||item.light>cap)continue;
  const find=restoreFind(item.find);found.add(item.id);items.push({... (find?{find}:{}),id:item.id,floor:item.floor,tier:item.tier,gold:item.gold,potions:item.potions,light:item.light,...(item.lightMax===undefined?{}:{lightMax:cap})});
  if(items.length===depth*3)break;
 }
 return items;
}
