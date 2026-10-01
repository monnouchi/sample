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
   page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);page.wait_for_timeout(420)
   expect(page.locator('.journal')).to_be_hidden()
   assert not page.locator('#event-notice').is_visible()
   for i in range(4):
    page.locator('[data-action='+('back' if i%2 else 'forward')+']').tap();page.wait_for_timeout(420);page.wait_for_timeout(420)
   assert '天窓の光が、根の奥へ続いている。' in page.locator('#companion-talk').inner_text()
   assert '天窓の光' not in page.locator('#message').text_content()
   page.locator('#event-history').tap();page.wait_for_timeout(420);expect(page.locator('#dialog')).to_be_visible()
   assert '天窓の光' not in page.locator('#dialog-content').inner_text()
   page.locator('[data-modal=close]').tap();page.wait_for_timeout(420);expect(page.locator('#event-history')).to_be_focused()
   page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);page.wait_for_timeout(420)
   expect(page.locator('.journal')).to_be_hidden()
   assert '天窓の光' in page.locator('#companion-talk').inner_text()
   page.goto(url)
   page.evaluate("""async()=>{const {fresh}=await import('./src/game.js');const s=fresh(31,{companion:'mei'});delete s.dialogueSchema;delete s.eventNotice;s.hp=70;s.log=['メイ「'+s.dialogue+'」'];localStorage.setItem('suito-save-v1',JSON.stringify(s));}""")
   page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);page.wait_for_timeout(420)
   assert '傷は隠さず' in page.locator('#companion-talk').inner_text()
   assert '傷は隠さず' not in page.locator('#message').text_content()
   expect(page.locator('.journal')).to_be_hidden()
   page.locator('#potion').tap();page.wait_for_timeout(420);expect(page.locator('#event-notice')).to_be_visible()
   assert '体力が30回復' in page.locator('#event-notice').inner_text()
   page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);page.wait_for_timeout(420)
   assert '体力が30回復' in page.locator('#event-notice').inner_text()
   page.locator('#event-history').scroll_into_view_if_needed()
   box=page.locator('#event-history').bounding_box();scroll=page.evaluate('scrollY')
   page.locator('#event-history').tap();page.wait_for_timeout(420);assert '体力が30回復' in page.locator('#dialog-content').inner_text()
   locked=page.evaluate('scrollY');page.mouse.move(w-3,h-3);page.mouse.wheel(0,500);page.wait_for_timeout(100);assert page.evaluate('scrollY')==locked
   page.locator('[data-modal=close]').tap();page.wait_for_timeout(420);expect(page.locator('#event-history')).to_be_focused()
   assert abs(page.evaluate('scrollY')-scroll)<2
   assert page.locator('#event-history').bounding_box()==box
   page.goto(url)
   page.evaluate('''async()=>{const {fresh,DIRS,key}=await import('./src/game.js');const s=fresh(3,{companion:'ren'});s.log=['レン「'+ '光と根の道を確かめ、町に灯りを持ち帰ろう。'.repeat(5)+'」'];s.map.events={};const [dx,dy]=DIRS[s.dir];s.map.events[key(s.x+dx,s.y+dy)]='enemy';localStorage.setItem('suito-save-v1',JSON.stringify(s));}''')
   page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);page.wait_for_timeout(420)
   expect(page.locator('.journal')).to_be_hidden()
   page.locator('[data-action=forward]').tap();page.wait_for_timeout(420);page.wait_for_timeout(420)
   expect(page.locator('#battle-controls')).to_be_visible()
   assert not page.locator('#message').is_visible()
   for sel in ['[data-action=attack]','[data-action=skill]','[data-action=guard]','#battle-potion','#flee']:
    box=page.locator(sel).bounding_box();assert box['height']>=44 and box['width']>=44
    assert box['y']>=0 and box['y']+box['height']<=h,(w,h,sel,box)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   page.locator('[data-action=guard]').tap();page.wait_for_timeout(420);page.wait_for_timeout(420)
   page.locator('#flee').tap();page.wait_for_timeout(420);expect(page.locator('#explore-controls')).to_be_visible()
   assert not errors,errors
   print(f'PASS {w}x{h}: separate dialogue/event outputs, old save, potion notice, history focus/scroll; long dialogue→battle all five targets on screen; guard/flee',flush=True)
   page.close()
  browser.close()
finally:server.shutdown();server.server_close()
