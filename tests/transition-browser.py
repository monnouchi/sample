"""Native taps plus synthetic queued, cancelled, multi-pointer and held-key transitions."""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright,expect
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':568},has_touch=True)
  url=f'http://127.0.0.1:{server.server_port}'
  def fixture():
   page.goto(url);page.evaluate('''async()=>{const {fresh,DIRS,key}=await import('./src/game.js');const s=fresh(3,{companion:'ren'});s.hp=60;s.map.events={};const [dx,dy]=DIRS[s.dir];s.map.events[key(s.x+dx,s.y+dy)]='enemy';localStorage.setItem('suito-save-v1',JSON.stringify(s));}''');page.reload();page.locator('#continue').tap();page.wait_for_timeout(420)
  state=lambda:page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1'))")
  def burst(sel):
   box=page.locator(sel).bounding_box();assert box is not None,sel
   page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2);page.wait_for_timeout(40)
  fixture();page.locator('[data-action=forward]').tap();entered=state();assert entered['phase']=='battle'
  for sel in ['#flee','[data-action=attack]','#battle-potion']*3:burst(sel)
  assert state()==entered
  page.wait_for_timeout(420);page.locator('[data-action=guard]').tap();assert state()['enemy']['turn']==1
  page.wait_for_timeout(300);page.locator('#flee').tap();exited=state();assert exited['phase']=='explore'
  for _ in range(3):burst('[data-action=forward]')
  assert state()==exited;page.wait_for_timeout(420);page.locator('[data-action=forward]').tap();assert state()['phase']=='battle'
  # A second finger held across entry must not activate any freshly exposed action.
  fixture();page.evaluate("document.querySelector('[data-action=right]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:99,pointerType:'touch'}))")
  page.locator('[data-action=forward]').tap();entered=state();page.wait_for_timeout(400)
  page.locator('#battle-potion').tap();assert state()==entered
  page.evaluate("document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:99,pointerType:'touch'}))");page.wait_for_timeout(420)
  # A delayed click with no new pointerdown is not a new deliberate tap.
  page.evaluate("document.querySelector('#flee').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}))");assert state()==entered
  page.locator('[data-action=guard]').tap();assert state()['enemy']['turn']==1
  # Held movement key/repeats cannot become a battle activation.
  fixture();page.keyboard.down('ArrowUp');entered=state();assert entered['phase']=='battle'
  for _ in range(4):page.keyboard.down('ArrowUp');page.keyboard.press('1');page.wait_for_timeout(60)
  assert state()==entered;page.keyboard.up('ArrowUp');page.wait_for_timeout(420);page.keyboard.press('3');assert state()['enemy']['turn']==1
  # Restored battles require release/quiet then support intentional keyboard or touch input.
  saved=state();page.reload();page.locator('#continue').tap();page.locator('#flee').tap();assert state()==saved
  page.wait_for_timeout(420);page.locator('#battle-potion').tap();assert state()['potions']==saved['potions']-1
  print('PASS native bursts: no flee/attack/potion across entry/exit/reload; held second finger, cancel, delayed click, keyboard repeat; deliberate tap/key accepted',flush=True)
  b.close()
finally:server.shutdown();server.server_close()
