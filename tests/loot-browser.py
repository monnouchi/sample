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
        for width,height in [(320,568),(390,568),(390,844)]:
            page=browser.new_page(viewport={'width':width,'height':height},has_touch=True)
            page.set_default_timeout(5000)
            page.goto(f'http://127.0.0.1:{server.server_port}')
            page.evaluate("""async()=>{const {fresh}=await import('./src/game.js');const s=fresh(31,{companion:'mei'});s.gearOwned=['blade','bark','wick'];s.equipment='blade';s.ward=1;s.wardFound=true;s.dialogue='<img src=x onerror=alert(1)>'+ '長い話。'.repeat(35);localStorage.setItem('suito-save-v1',JSON.stringify(s));}""")
            page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);page.wait_for_timeout(420)
            talk=page.locator('#companion-talk');assert talk.bounding_box()['height']==68
            assert talk.locator('img').count()==0
            assert talk.bounding_box()['y']<page.locator('#explore-controls').bounding_box()['y']
            talk.tap();page.wait_for_timeout(420);assert page.locator('#dialog-content img').count()==0;page.locator('[data-modal=close]').tap();page.wait_for_timeout(420)
            page.locator('#kit').tap();page.wait_for_timeout(420);page.locator('[data-modal="equip:bark"]').tap();page.wait_for_timeout(420)
            assert page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1')).equipment")=='bark'
            page.reload() # Leave active play before replacing a fixture; pagehide saves live state.
            page.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('suito-save-v1'));s.phase='battle';s.hp=1;s.supportCharge=1;s.enemy={name:'根絡みの番人',hp:100,maxHp:100,turn:0,boss:false};localStorage.setItem('suito-save-v1',JSON.stringify(s));}""")
            page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);page.wait_for_timeout(420);page.locator('[data-action=attack]').tap();page.wait_for_timeout(420);page.wait_for_timeout(420)
            assert '護符発動' in page.locator('#battle-feedback').inner_text()
            assert page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1')).hp")==25
            page.evaluate('scrollTo(0,0)')
            for sel in ['[data-action=attack]','[data-action=skill]','[data-action=guard]','#battle-potion','#flee']:
                b=page.locator(sel).bounding_box();assert b['height']>=44 and b['y']+b['height']<=height,(width,height,sel,b)
            assert talk.bounding_box()['height']==44
            saved=page.evaluate("localStorage.getItem('suito-save-v1')")
            page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);assert page.evaluate("localStorage.getItem('suito-save-v1')")==saved
            assert '護符発動' in page.locator('#kit-status').inner_text()
            Path('artifacts').mkdir(exist_ok=True);page.screenshot(path=f'artifacts/loot-{width}-{height}.png')
            print(f'PASS {width}x{height}: fixed dialogue, safe text, equip/save, rescue, all five combat controls',flush=True)
            page.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
