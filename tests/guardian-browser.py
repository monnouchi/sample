"""Injected encounter fixture; combat, save/reload and return then use real UI taps."""
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
  for w,h in [(320,568),(390,568),(390,844)]:
   page=browser.new_page(viewport={'width':w,'height':h},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_port}')
   page.evaluate("""async()=>{const {fresh,DIRS,key}=await import('./src/game.js');const s=fresh(31,{companion:'mei'});s.floor=10;s.hp=70;s.map.events={};const [dx,dy]=DIRS[s.dir];s.map.events[key(s.x+dx,s.y+dy)]='shrine';localStorage.setItem('suito-save-v1',JSON.stringify(s));}""")
   def tap(sel):page.locator(sel).tap();page.wait_for_timeout(450)
   state=lambda:page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1'))")
   page.reload();tap('#continue');tap('[data-action=forward]');assert state()['enemy']['pattern']==1
   tap('[data-action=attack]');assert '次は強撃' in page.locator('#intent').inner_text()
   saved=state();page.reload();tap('#continue');assert state()==saved
   for sel in ['[data-action=attack]','[data-action=skill]','[data-action=guard]','#battle-potion','#flee']:
    box=page.locator(sel).bounding_box();assert box['height']>=44 and box['y']+box['height']<=h,(w,h,sel,box)
   hp=state()['hp'];tap('[data-action=guard]');assert hp-state()['hp']<=6;assert '一手の隙' in page.locator('#intent').inner_text()
   hp=state()['hp'];tap('#battle-potion');assert state()['hp']==min(100,hp+42);assert '反撃なし' in page.locator('#battle-feedback').inner_text()
   for _ in range(20):
    s=state()
    if s['relic']:break
    phase=s['enemy']['turn']%3;tap('[data-action='+('guard' if phase==1 else 'skill' if s['focus']>=3 else 'attack')+']')
   assert state()['relic'];assert '灯草の種' in page.locator('#dialog-title').inner_text();assert '静ま' in page.locator('#dialog-content').inner_text()
   page.wait_for_timeout(420);tap('[data-modal=return]');expect(page.locator('[data-modal=close]')).to_be_focused()
   danger=page.locator('[data-modal=return]');assert '冒険を終える' in danger.inner_text();assert danger.locator('svg[aria-hidden=true]').count()==1
   assert page.locator('[data-modal=close] svg[aria-hidden=true]').count()==1
   box=danger.bounding_box();assert box['height']>=44 and box['y']+box['height']<=h,(w,h,box)
   assert danger.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(139, 48, 43)'
   before=state();tap('[data-modal=close]');assert state()==before;tap('#mission-return');tap('[data-modal=return]');assert state()['phase']=='won'
   assert '芽が緑に灯った' in page.locator('#dialog-content').inner_text();assert not errors,errors
   page.goto(f'http://127.0.0.1:{server.server_port}')
   page.evaluate("""async()=>{const {fresh}=await import('./src/game.js');const s=fresh(31,{companion:'ren'});s.phase='battle';s.hp=70;s.enemy={name:'星樹の守り手',hp:90,maxHp:90,turn:1,boss:true};localStorage.setItem('suito-save-v1',JSON.stringify(s));}""")
   page.reload();tap('#continue');assert '次は通常攻撃' in page.locator('#intent').inner_text()
   tap('[data-action=guard]');assert '次は強撃' in page.locator('#intent').inner_text()
   saved=state();page.reload();tap('#continue');assert state()==saved
   print(f'PASS {w}x{h}: normal/warning/guard/opening/no counter/reload, guardian calm+seed, danger icons/safe focus/cancel/win',flush=True);page.close()
  browser.close()
finally:server.shutdown();server.server_close()
