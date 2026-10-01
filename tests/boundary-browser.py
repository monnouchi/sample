"""Fixtures inject maps only; queued pairs fix 40ms intervals in-page to avoid host-driver latency. Other actions use native taps/keys."""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from subprocess import check_output
from playwright.sync_api import sync_playwright,expect
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':568},has_touch=True)
  url=f'http://127.0.0.1:{server.server_port}'
  def fixture(event='stairs',phase='explore'):
   page.goto(url);page.evaluate('''async ({event,phase})=>{const {fresh,DIRS,key}=await import('./src/game.js');const s=fresh(3,{companion:'mei'});s.hp=60;s.phase=phase;s.map.events={};const [dx,dy]=DIRS[s.dir];s.map.events[key(s.x+dx,s.y+dy)]=event;localStorage.setItem('suito-save-v1',JSON.stringify(s));}''',{'event':event,'phase':phase});page.reload();page.locator('#continue').tap();page.wait_for_timeout(420)
  state=lambda:page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1'))")
  def tap(sel):page.locator(sel).tap()
  def burst(sel,n=5):
   for _ in range(n):
    box=page.locator(sel).bounding_box();page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2);page.wait_for_timeout(40)
  def queued_pair(trigger,target):
   return page.evaluate("""async ({trigger,target})=>{document.querySelector(trigger).click();const saved=JSON.parse(localStorage.getItem('suito-save-v1'));for(let i=0;i<5;i++){const b=document.querySelector(target);b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:89,pointerType:'touch'}));b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:89,pointerType:'touch'}));b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));await new Promise(r=>setTimeout(r,40));}return saved;}""",{'trigger':trigger,'target':target})
  # Demonstrate the unsafe pre-fix path with its actual app/control modules.
  page.route('**/src/app.js?*',lambda r:r.fulfill(body=check_output(['git','show','7137b0f:src/app.js'],text=True),content_type='text/javascript'))
  page.route('**/src/controls.js?*',lambda r:r.fulfill(body=check_output(['git','show','7137b0f:src/controls.js'],text=True),content_type='text/javascript'))
  fixture();tap('[data-action=forward]');tap('[data-modal=return]');assert state()['phase']=='returned'
  print('REPRODUCED pre-fix: movement→stairs→immediate modal return ends adventure without confirmation',flush=True)
  page.unroute('**/src/app.js?*');page.unroute('**/src/controls.js?*')
  fixture();entered=queued_pair('[data-action=forward]','[data-modal=return]');assert entered['phase']=='stairs'
  assert state()==entered;assert page.locator('#dialog').get_attribute('data-kind')=='stairs'
  page.wait_for_timeout(420);arrived=queued_pair('[data-modal=descend]','#return');assert state()['floor']==2
  assert state()==arrived;expect(page.locator('#dialog')).not_to_be_visible()
  page.wait_for_timeout(420);queued_pair('#return','[data-modal=return]');assert state()==arrived
  page.wait_for_timeout(420);tap('[data-modal=return]');assert state()['phase']=='returned'
  print('PASS stairs/descend/return: continuing bursts rejected; fresh deliberate confirmation returns',flush=True)
  # Stair return now asks for confirmation, cancellation returns to the stair choice.
  fixture(phase='stairs');queued_pair('[data-modal=return]','[data-modal=return]');assert state()['phase']=='stairs'
  page.wait_for_timeout(420);tap('[data-modal=close]');assert page.locator('#dialog').get_attribute('data-kind')=='stairs'
  page.wait_for_timeout(420);tap('[data-modal=stay]');assert state()['phase']=='explore'
  # Held second finger plus queued click, keyboard repeats and cancelled pointers.
  fixture();page.evaluate("document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:99,pointerType:'touch'}))")
  tap('[data-action=forward]');page.wait_for_timeout(420);tap('[data-modal=return]');assert page.locator('#dialog').get_attribute('data-kind')=='stairs'
  page.evaluate("document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:99,pointerType:'touch'}))");page.wait_for_timeout(420)
  page.evaluate("document.querySelector('[data-modal=return]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}))");assert page.locator('#dialog').get_attribute('data-kind')=='stairs'
  fixture();page.keyboard.down('ArrowUp');assert state()['phase']=='stairs'
  page.locator('[data-modal=return]').focus()
  for _ in range(4):page.keyboard.down('ArrowUp');page.keyboard.press('Enter');page.wait_for_timeout(40)
  assert state()['phase']=='stairs';assert page.locator('#dialog').get_attribute('data-kind')=='stairs'
  page.keyboard.up('ArrowUp');page.wait_for_timeout(420);page.keyboard.press('Enter');assert page.locator('#dialog').get_attribute('data-kind')=='return'
  # Chest overlay blocks carry-over close, then closing cannot spill into return.
  fixture('chest');page.evaluate("document.querySelector('[data-action=right]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:99,pointerType:'touch'}))")
  tap('[data-action=forward]');earned=state();burst('[data-modal=reward-close]');assert state()==earned;expect(page.locator('#dialog')).to_be_visible()
  page.evaluate("document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:99,pointerType:'touch'}))");page.wait_for_timeout(420);queued_pair('[data-modal=reward-close]','#return');expect(page.locator('#dialog')).not_to_be_visible();assert state()['phase']=='explore'
  # Facility/optional modal boundaries and resumed stair modal remain guarded.
  page.wait_for_timeout(420);queued_pair('#kit','[data-modal=close]');expect(page.locator('#dialog')).to_be_visible()
  page.wait_for_timeout(420);queued_pair('[data-modal=close]','#return');expect(page.locator('#dialog')).not_to_be_visible()
  fixture(phase='stairs');page.reload();queued_pair('#continue','[data-modal=return]');assert state()['phase']=='stairs';assert page.locator('#dialog').get_attribute('data-kind')=='stairs'
  # Entering/leaving the camp panel is a layout/input boundary too.
  page.goto(url);page.evaluate("""async()=>{const {fresh,generate}=await import('./src/game.js');const s=fresh(3,{companion:'mei'});s.floor=4;s.hp=30;s.map=generate(s.seed,4);s.map.events={'1,1':'rest'};s.dir=s.map.grid[1][2]?2:1;localStorage.setItem('suito-save-v1',JSON.stringify(s));}""")
  page.reload();tap('#continue');page.wait_for_timeout(420);tap('[data-action=forward]');page.wait_for_timeout(420);tap('[data-action=back]')
  burst('#rest');assert state()['rested']==[];page.wait_for_timeout(420);tap('#rest');assert state()['rested']==[4]
  # Cancellation leaves the saved adventure byte-for-byte unchanged; reload never confirms.
  fixture();before=page.evaluate("localStorage.getItem('suito-save-v1')");tap('#return')
  expect(page.locator('[data-modal=close]')).to_be_focused();page.wait_for_timeout(420);page.keyboard.press('Enter')
  assert page.evaluate("localStorage.getItem('suito-save-v1')")==before
  page.wait_for_timeout(420);tap('#return');page.keyboard.press('Escape');assert page.evaluate("localStorage.getItem('suito-save-v1')")==before
  page.wait_for_timeout(420);tap('#return');page.reload();tap('#continue');page.wait_for_timeout(420);assert state()['phase']=='explore';assert page.evaluate("localStorage.getItem('suito-save-v1')")==before
  # Relic return and its persistent mission button both require the same confirmation.
  page.goto(url);page.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('suito-save-v1'));s.relic=true;localStorage.setItem('suito-save-v1',JSON.stringify(s));}""");page.reload();tap('#continue');page.wait_for_timeout(420)
  queued_pair('[data-modal=return]','[data-modal=return]');assert page.locator('#dialog-title').inner_text()=='本当に帰還する？';assert state()['phase']=='explore'
  page.wait_for_timeout(420);tap('[data-modal=close]');page.wait_for_timeout(420);tap('#mission-return');assert page.locator('#dialog-title').inner_text()=='本当に帰還する？'
  page.wait_for_timeout(420);tap('[data-modal=return]');assert state()['phase']=='won'
  print('PASS held touch/cancel/delayed click/key repeats, chest/kit/reload boundaries; old save retained',flush=True)
  b.close()
finally:server.shutdown();server.server_close()
