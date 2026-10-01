"""Round 3: battle fixtures for viewport/scroll/action/save regressions."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory='dist'))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for width,height,large in [(390,844,False),(390,568,False),(320,568,False),(320,568,True)]:
            page=browser.new_page(viewport={'width':width,'height':height},has_touch=True)
            page.goto(f'http://127.0.0.1:{server.server_port}')
            page.evaluate("""async()=>{const {fresh}=await import('./src/game.js');const s=fresh(31,{companion:'mei'});s.gearOwned=['blade','bark','wick'];s.equipment='blade';s.ward=s.wardFound=1;localStorage.setItem('suito-save-v1',JSON.stringify(s));}""")
            page.reload();page.locator('#continue').tap();page.wait_for_timeout(420)
            if large:page.add_style_tag(content='.kit-header h2{font-size:32px}.kit-list strong,.kit-list small,.kit-list p,.kit-list button{font-size:22px!important}')
            page.locator('#kit').tap();footer=page.locator('.kit-footer button');body=page.locator('.kit-list')
            b=footer.bounding_box();assert b['height']>=44 and b['y']+b['height']<=height
            if not large:
                assert not body.evaluate('e=>e.scrollHeight>e.clientHeight'),(width,height)
            page.locator('.kit-rules summary').tap();body.evaluate('e=>e.scrollTop=e.scrollHeight')
            assert footer.bounding_box()==b
            footer.tap();expect(page.locator('#kit')).to_be_focused()
            page.locator('#kit').tap();page.locator('[data-modal="equip:bark"]').tap();expect(page.locator('#dialog')).not_to_be_visible()
            assert page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1')).equipment")=='bark'
            page.reload();page.locator('#continue').tap();page.locator('#kit').tap()
            expect(page.locator('[data-modal="equip:bark"]')).to_be_disabled()
            assert page.locator('.kit-row').count()==3
            footer.tap();page.reload()
            page.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('suito-save-v1'));s.phase='battle';s.enemy={name:'敵',hp:100,maxHp:100,turn:0,boss:false};localStorage.setItem('suito-save-v1',JSON.stringify(s));}""")
            page.reload();page.locator('#continue').tap();page.locator('#battle-details summary').tap();page.locator('#kit').tap()
            assert page.locator('.kit-row button:disabled').count()==3
            footer.tap();assert page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1')).equipment")=='bark'
            print(f'PASS kit {width}x{height} enlarged={large}: compact comparison, fixed footer, internal scrolling, switch/save, combat locked',flush=True)
            page.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
