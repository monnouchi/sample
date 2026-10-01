"""Explicit exploration fixtures; mobile Chromium emulation, not an iPhone device."""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright,expect
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  url=f'http://127.0.0.1:{server.server_port}'
  for w,h in [(320,568),(390,568),(390,844)]:
   page=browser.new_page(viewport={'width':w,'height':h},has_touch=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(url);page.evaluate('''async()=>{const {fresh}=await import('./src/game.js');const s=fresh(3,{companion:'ren'});s.map.events={};localStorage.setItem('suito-save-v1',JSON.stringify(s));}''')
   page.reload();page.locator('#continue').tap();page.wait_for_timeout(420)
   lines=[]
   for i in range(12):
    page.locator('[data-action='+('back' if i%2 else 'forward')+']').tap();page.wait_for_timeout(420)
    lines.append(page.locator('#message').inner_text())
    if i==3:page.reload();page.locator('#continue').tap();page.wait_for_timeout(420)
   assert sum('天窓の光が、根の奥へ続いている。' in x for x in lines)==1
   assert page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1')).ambientSeen")==[1]
   page.goto(url)
   page.evaluate('''async()=>{const {fresh,DIRS,key}=await import('./src/game.js');const s=fresh(3,{companion:'ren'});s.log=['レン「'+ '光と根の道を確かめ、町に灯りを持ち帰ろう。'.repeat(5)+'」'];s.map.events={};const [dx,dy]=DIRS[s.dir];s.map.events[key(s.x+dx,s.y+dy)]='enemy';localStorage.setItem('suito-save-v1',JSON.stringify(s));}''')
   page.reload();page.locator('#continue').tap();page.wait_for_timeout(420)
   assert len(page.locator('#message').inner_text())>100
   page.locator('[data-action=forward]').tap();page.wait_for_timeout(420)
   expect(page.locator('#battle-controls')).to_be_visible()
   assert not page.locator('#message').is_visible()
   for sel in ['[data-action=attack]','[data-action=skill]','[data-action=guard]','#battle-potion','#flee']:
    box=page.locator(sel).bounding_box();assert box['height']>=44 and box['width']>=44
    assert box['y']>=0 and box['y']+box['height']<=h,(w,h,sel,box)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   page.locator('[data-action=guard]').tap();page.wait_for_timeout(420)
   page.locator('#flee').tap();expect(page.locator('#explore-controls')).to_be_visible()
   assert not errors,errors
   print(f'PASS {w}x{h}: scenery once across reload; long dialogue→battle all five targets on screen; guard/flee',flush=True)
   page.close()
  browser.close()
finally:server.shutdown();server.server_close()
