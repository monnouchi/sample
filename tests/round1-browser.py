"""Focused regression using explicit save fixtures, not a normal full playthrough."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright, expect

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory='dist'))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width':390, 'height':844}, has_touch=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        url = f'http://127.0.0.1:{server.server_port}'
        def fixture(potions):
            page.goto(url)
            page.evaluate('''async count=>{
                const {fresh}=await import('./src/game.js');const s=fresh(17);
                s.hp=25;s.potions=count;s.phase='battle';
                s.enemy={name:'苔角の獣',hp:1,maxHp:25,turn:0,boss:false};
                localStorage.setItem('suito-save-v1',JSON.stringify(s));
            }''', potions)
            page.reload();page.locator('#continue').tap();page.wait_for_timeout(250)
        def check(count):
            button=page.locator('#battle-potion')
            assert button.inner_text().count('露の薬')==1
            assert button.locator('.action-icon').inner_text()=='⚗'
            assert button.locator('#battle-potion-label').inner_text()=='露の薬'
            assert button.locator('#battle-potion-count').inner_text()==f'×{count}'
            expect(button).to_have_accessible_name(f'露の薬、残り{count}個、体力最大42回復')
            box=button.bounding_box();assert box['width']>=44 and box['height']>=44
        fixture(3);check(3)
        page.locator('#battle-potion').tap();page.wait_for_timeout(250);check(2)
        assert page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1')).potions")==2
        page.reload();page.locator('#continue').tap();check(2)
        page.wait_for_timeout(250);page.locator('[data-action="attack"]').tap()
        expect(page.locator('#explore-controls')).to_be_visible()
        assert page.locator('#potions').inner_text()=='2'
        page.locator('#map-button').tap()
        legend=page.locator('.legend').inner_text()
        assert '● 通常敵' in legend and '★ 守り手（最深部のボス）' in legend
        assert '魔物 / 守り手' not in legend
        page.locator('[data-modal="close"]').tap()
        fixture(1);check(1);page.locator('#battle-potion').tap();page.wait_for_timeout(250)
        check(0);expect(page.locator('#battle-potion')).to_be_disabled()
        page.reload();page.locator('#continue').tap();check(0)
        expect(page.locator('#battle-potion')).to_be_disabled()
        page.wait_for_timeout(250);page.locator('[data-action="attack"]').tap()
        expect(page.locator('#potion')).to_be_disabled()
        assert page.locator('#potions').inner_text()=='0'
        fixture(3);check(3)
        assert page.locator('script[type="module"]').get_attribute('src').startswith('./src/app.js?v=')
        assert not errors, errors
        print('PASS: 3→2 / reload / battle→explore / map legend / 1→0 / disabled / reload / new battle; icon, single label, accessible count, 44px targets; no JS errors')
        browser.close()
finally:
    server.shutdown();server.server_close()
