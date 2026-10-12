import asyncio
from playwright.async_api import async_playwright
EXE="/Users/chabanmazen/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell"
O="t23"
U="https://mediacom-event-os.pages.dev"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE)
        wall = await (await b.new_context(viewport={"width":1600,"height":800})).new_page()
        app = await (await b.new_context(viewport={"width":1366,"height":1024})).new_page()
        phone = await (await b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True)).new_page()
        errs=[]
        for pg,n in [(wall,'mur'),(app,'app'),(phone,'tel')]: pg.on("pageerror", lambda e, n=n: errs.append(f"[{n}] {e}"))
        await wall.goto(U+"/mur"); await app.goto(U+"/"); await app.evaluate("localStorage.setItem('mc_op','mazen')"); await app.goto(U+"/#mur"); await app.reload()
        await wall.wait_for_timeout(3000)
        qr = await wall.evaluate("document.querySelector('.w-step small')?.textContent")
        await phone.goto(U+"/nuage"); await phone.wait_for_timeout(1500)
        await phone.fill('#w', 'Séminaire'); await phone.click('#s'); await phone.wait_for_timeout(1500)
        msg = await phone.evaluate("document.querySelector('#msg').innerText")
        await phone.screenshot(path=f"{O}/tel.png")
        await phone.wait_for_timeout(1700); await phone.click('#sugg button:nth-child(2)'); await phone.wait_for_timeout(3500)
        on_wall = await wall.evaluate("[...document.querySelectorAll('.w-word-i:not(.seed)')].map(e=>e.textContent)")
        last = await wall.evaluate("document.querySelector('#w-last-t').textContent")
        await wall.screenshot(path=f"{O}/mur.png")
        mod = await app.evaluate("document.querySelector('#mw-count')?.textContent")
        # Pilotage depuis l'app : scène message
        await app.fill('#mw-msg', 'Bienvenue sur le stand'); await app.click('#mw-msg-save'); await wall.wait_for_timeout(4000)
        scene = await wall.evaluate("document.querySelector('#wall').dataset.scene")
        await app.click('[data-scene="cloud"]'); await wall.wait_for_timeout(3000)
        print({'qr_vers': qr, 'tel': msg[:60], 'mots_sur_mur': on_wall, 'dernier': last, 'moderation': mod, 'scene_apres_message': scene}); print(errs or 'no errors')
        await b.close()
asyncio.run(main())
