"""Companion modal: Chromium viewport/text/safe-area simulations, not Safari hardware."""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for w,h,large in [(320,568,False),(390,568,False),(390,844,False),(320,480,True),(844,390,True)]:
   page=browser.new_page(viewport={'width':w,'height':h},has_touch=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_port}')
   # A running saved adventure must survive entering and cancelling the chooser.
   page.evaluate('''async()=>{const {fresh}=await import('./src/game.js');localStorage.setItem('suito-save-v1',JSON.stringify(fresh(3,{companion:'ren'})));}''')
   page.reload();saved=page.evaluate("localStorage.getItem('suito-save-v1')")
   if large:page.add_style_tag(content='#dialog{--chooser-top:24px;--chooser-bottom:20px}')
   if large:page.add_style_tag(content='dialog h2{font-size:38px!important}dialog button{font-size:24px!important}.companion-choice strong{font-size:26px!important}.companion-choice small,.companion-choice>span,dialog p{font-size:20px!important}')
   page.locator('#start').tap();backgroundY=page.evaluate('scrollY');page.locator('[data-modal=new]').tap()
   expect(page.locator('#dialog-title')).to_be_focused()
   cancel=page.locator('.companion-footer button');body=page.locator('.companion-list');header=page.locator('.companion-header')
   for end in [False,True]:
    body.evaluate('(e,end)=>e.scrollTop=end?e.scrollHeight:0',end)
    b=cancel.bounding_box();d=body.bounding_box();a=header.bounding_box()
    assert b['height']>=48 and b['y']>=0 and b['y']+b['height']<=h,(w,h,large,b)
    assert a['y']+a['height']<=d['y']+1 and d['y']+d['height']<=b['y']+1
    assert not page.locator('#dialog').evaluate('e=>e.scrollWidth>e.clientWidth')
   assert page.locator('.companion-choice svg[role=img]').count()==3
   before=page.evaluate('scrollY');page.mouse.move(w-4,h-4);page.mouse.wheel(0,600);page.wait_for_timeout(100);assert page.evaluate('scrollY')==before
   Path('artifacts').mkdir(exist_ok=True);page.screenshot(path=f'artifacts/chooser-{w}-{h}-{large}.png')
   # Keyboard focus stays in the native modal, and can reach both choices and cancel.
   page.locator('#dialog-title').focus();reached=set()
   for _ in range(8):
    page.keyboard.press('Tab');assert page.evaluate("document.querySelector('#dialog').contains(document.activeElement)")
    reached.add(page.evaluate("document.activeElement.dataset.modal||''"))
   assert {'companion-ao','companion-mei','companion-ren','close'}<=reached
   page.keyboard.press('Escape');expect(page.locator('#dialog')).not_to_be_visible();expect(page.locator('#start')).to_be_focused()
   assert not page.evaluate("document.documentElement.classList.contains('companion-open')")
   assert abs(page.evaluate('scrollY')-backgroundY)<2
   assert page.evaluate("localStorage.getItem('suito-save-v1')")==saved
   page.locator('#start').tap();page.locator('[data-modal=new]').tap();cancel.tap()
   assert page.evaluate("localStorage.getItem('suito-save-v1')")==saved
   page.locator('#start').tap();page.locator('[data-modal=new]').tap();page.locator('[data-modal=companion-mei]').tap()
   expect(page.locator('#play')).to_be_visible();assert page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1')).companion")=='mei'
   expect(page.locator('#companion-talk .companion-portrait')).to_be_visible()
   assert not page.evaluate("document.documentElement.classList.contains('companion-open')")
   assert not errors,errors;print(f'PASS {w}x{h} large={large}: footer always visible, inner scroll, portraits, keyboard/Escape/cancel/save/start',flush=True);page.close()
  browser.close()
finally:server.shutdown();server.server_close()
