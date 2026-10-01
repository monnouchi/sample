"""Touch emulation and synthetic cancellation coverage; not Safari device QA."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
  page.goto(f'http://127.0.0.1:{server.server_port}');page.locator('#start').tap();page.wait_for_timeout(250)
  state=lambda:page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1'))")
  before=state();page.locator('[data-action=forward]').tap();page.wait_for_timeout(250);assert state()['steps']==before['steps']+1
  for _ in range(3):page.locator('[data-action=right]').tap();page.wait_for_timeout(250)
  assert state()['dir']==(before['dir']+3)%4
  button=page.locator('[data-action=left]');button.scroll_into_view_if_needed();box=button.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
  cdp=page.context.new_cdp_session(page);old=state()['dir'];cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});page.wait_for_timeout(650);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(250)
  assert state()['dir']==(old+3)%4;assert not page.evaluate('getSelection().toString()')
  old=state()['dir'];button.scroll_into_view_if_needed();box=button.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for offset in [16,32,48,64]:cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-offset}]});page.wait_for_timeout(30)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(250);assert state()['dir']==old
  old=state()['dir'];page.evaluate("""()=>{const b=document.querySelector('[data-action=left]');for(const [type,x] of [['pointerdown',20],['pointermove',65],['pointerup',65]])b.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:9,pointerType:'touch',clientX:x,clientY:10}));b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));}""");assert state()['dir']==old
  # A cancelled touch does not swallow keyboard activation.
  button.focus();page.keyboard.press('Enter');page.wait_for_timeout(250);assert state()['dir']==(old+3)%4
  page.locator('#help').tap();before=state();page.evaluate("document.querySelector('[data-action=forward]').click()");assert state()==before;page.locator('[data-modal=close]').tap()
  assert page.locator('[data-action=forward] small').evaluate("e=>getComputedStyle(e).userSelect")=='none'
  assert page.locator('#message').evaluate("e=>getComputedStyle(e).userSelect")!='none'
  assert 'user-scalable=no' not in page.locator('meta[name=viewport]').get_attribute('content')
  print('PASS: native tap, repeated taps, long press (one action/no selection), native swipe + synthetic slide cancellation, keyboard, modal guard, selectable log and zoom metadata');b.close()
finally:server.shutdown();server.server_close()
