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
        for width,height in [(390,844),(390,568),(320,568),(1180,757),(844,390)]:
            page=browser.new_page(viewport={'width':width,'height':height},has_touch=True)
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}')
            page.evaluate('''async()=>{
                const {fresh}=await import('./src/game.js?v=20260930-round2');const s=fresh(3,{legacy:true});
                s.hp=93;s.phase='battle';s.enemy={name:'苔角の獣',hp:25,maxHp:25,turn:1,boss:false};
                localStorage.setItem('suito-save-v1',JSON.stringify(s));
            }''')
            page.reload();page.locator('#continue').tap();page.wait_for_timeout(250)
            info=page.locator('.battle-context')
            assert '苔角の獣' in page.locator('#enemy-name').inner_text() and '通常攻撃' in info.inner_text()
            assert page.locator('#enemy-name').is_visible() # Original scene HUD retained.
            for selector in ['#battle-potion','#flee']:
                button=page.locator(selector)
                button.evaluate("e=>e.scrollIntoView({block:'end',behavior:'instant'})")
                rect=info.bounding_box();box=button.bounding_box()
                assert 0<=rect['y'] and rect['y']+rect['height']<=height,(width,height,rect)
                assert rect['y']+rect['height']<=box['y'],(width,height,'overlap',rect,box)
                assert box['y']+box['height']<=height+1
                assert box['width']>=44 and box['height']>=44
            page.locator('#battle-potion').tap();page.wait_for_timeout(250)
            assert '体力が7回復' in page.locator('#message').text_content()
            assert '敵の反撃：体力に6ダメージ' in page.locator('#message').text_content()
            assert '強撃' in info.inner_text()
            saved=page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1'))")
            page.reload();page.locator('#continue').tap();page.wait_for_timeout(250)
            assert page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1'))")==saved
            assert '強撃' in info.inner_text()
            page.locator('[data-action="guard"]').tap();page.wait_for_timeout(250)
            assert '通常攻撃' in info.inner_text()
            assert '気力は満タン（回復なし）' in page.locator('#message').text_content()
            page.locator('#flee').evaluate("e=>e.scrollIntoView({block:'end',behavior:'instant'})")
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
            assert float(info.locator('#intent').evaluate('e=>getComputedStyle(e).fontSize').replace('px',''))>=14
            Path('artifacts').mkdir(exist_ok=True)
            page.screenshot(path=f'artifacts/round3-{width}x{height}.png')
            page.locator('#flee').tap();expect(page.locator('#explore-controls')).to_be_visible()
            expect(info).to_be_hidden()
            assert not errors,errors
            print(f'PASS {width}x{height}: scroll to potion/flee keeps name+intent visible; actions/logs/save; no overlap or overflow',flush=True)
            page.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
