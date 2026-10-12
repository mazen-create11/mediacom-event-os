import asyncio
from playwright.async_api import async_playwright
EXE="/Users/chabanmazen/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell"
O="t16"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=["--use-gl=angle","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg = await (await b.new_context(viewport={"width":1366,"height":1024})).new_page()
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
        await pg.goto("http://localhost:3100/"); await pg.evaluate("localStorage.setItem('mc_op','mazen'); localStorage.setItem('mc_attract_min','0')"); 
        await pg.goto("http://localhost:3100/#scene"); await pg.reload(); await pg.wait_for_timeout(5000)
        await pg.click('[data-format="mediascene"]')
        for i,t in enumerate([300, 1700, 1800, 2200, 3500]):
            await pg.wait_for_timeout(t); await pg.screenshot(path=f"{O}/ms-{i}.png", clip={"x":124,"y":96,"width":810,"height":800})
        await pg.click('[data-size="120"]'); await pg.wait_for_timeout(10500)
        await pg.screenshot(path=f"{O}/ms-120.png")
        await pg.evaluate("location.hash='book'"); await pg.wait_for_timeout(1500)
        await pg.click('[data-tab="mediascene"]'); await pg.wait_for_timeout(1200); await pg.screenshot(path=f"{O}/book-ms.png")
        await pg.click('[data-model="ms120"]'); await pg.wait_for_timeout(800); await pg.screenshot(path=f"{O}/book-ms120.png")
        await pg.click('[data-tab="corporate"]'); await pg.wait_for_timeout(1200); await pg.screenshot(path=f"{O}/book-corp.png")
        print(errs[:6] or 'no errors')
        await b.close()
asyncio.run(main())
