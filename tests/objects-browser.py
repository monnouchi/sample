"""Rendered-object screenshots and pixel occlusion checks on explicit fixtures."""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in [320,390]:
   page=browser.new_page(viewport={'width':width,'height':844})
   page.goto(f'http://127.0.0.1:{server.server_port}')
   result=page.evaluate('''async()=>{const {fresh}=await import('./src/game.js');const {drawScene}=await import('./src/render.js?v=20261001-sound');const s=fresh(1,{legacy:true});s.dir=1;s.map.grid=Array.from({length:11},(_,y)=>Array.from({length:11},(_,x)=>x===0||y===0||x===10||y===10?1:0));s.map.events={'2,1':'chest','4,1':'spring'};s.map.seen={'2,1':true,'4,1':true};const canvas=document.createElement('canvas');canvas.width=840;canvas.height=640;canvas.style.width='100%';canvas.id='object-test';document.body.replaceChildren(canvas);window.testScene={s,drawScene,canvas};drawScene(canvas,s,0);const base=canvas.toDataURL();s.map.grid[1][3]=1;drawScene(canvas,s,0);const wall=canvas.toDataURL();delete s.map.events['4,1'];drawScene(canvas,s,0);const hidden=canvas.toDataURL();return {different:base!==wall,occluded:wall===hidden};}''')
   assert result=={'different':True,'occluded':True},result
   for kind in ['common','silver','gold','spring']:
    page.evaluate('''async kind=>{const {s,drawScene,canvas}=testScene;const {chestTier}=await import('./src/rewards.js');if(kind!=='spring'){for(let seed=0;seed<10000;seed++)if(chestTier(seed,1,2,1)===kind){s.seed=seed;break;}}s.map.events={'2,1':kind==='spring'?'spring':'chest'};s.light=100;drawScene(canvas,s,0);}''',kind)
    Path('artifacts').mkdir(exist_ok=True);page.screenshot(path=f'artifacts/object-{kind}-{width}.png')
    values=page.evaluate('''()=>{const {s,drawScene,canvas}=testScene;const c=canvas.getContext('2d');const luminance=()=>{const b=c.getImageData(0,0,840,640).data;let n=0;for(let i=0;i<b.length;i+=4)n+=b[i]+b[i+1]+b[i+2];return n;};const bright=luminance();s.light=0;drawScene(canvas,s,0);const dark=luminance();delete s.map.events['2,1'];drawScene(canvas,s,0);return {bright,dark,consumed:canvas.toDataURL()};}''')
    assert values['bright']>values['dark']>0
   print(f'PASS {width}: chest/spring render, wall pixel equality, low-light brightness',flush=True)
   page.close()
  browser.close()
finally:server.shutdown();server.server_close()
