import asyncio
from playwright.async_api import async_playwright
EXE="/Users/chabanmazen/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell"
O="t19"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=["--use-gl=angle","--enable-unsafe-swiftshader"])
        pg = await (await b.new_context(viewport={"width":1366,"height":1024})).new_page()
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
        await pg.goto("http://localhost:3100/"); await pg.evaluate("localStorage.setItem('mc_op','mazen'); localStorage.setItem('mc_attract_min','0')"); await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.click('[data-demo]'); await pg.wait_for_timeout(1500)
        # quelques vrais contacts hors démo pour le bilan
        for n,co,prof,t in [('Léa Morel','Agence Côté Sud','Agence événementielle','hot'),('Karim Aït','Provence DMC','Agence séminaire / DMC','hot'),('Anne Vidal','Groupe Méditerranée','Entreprise','warm')]:
            await pg.click('#go'); await pg.wait_for_timeout(450)
            await pg.fill('#f-name', n); await pg.fill('#f-company', co); await pg.fill('#f-phone','06 11 22 33 44')
            await pg.click(f'[data-single="profile"] [data-v="{prof}"]'); await pg.click('[data-single="eventType"] [data-v="Séminaire"]'); await pg.click('[data-multi="needs"] [data-v="Son"]'); await pg.click('[data-multi="needs"] [data-v="Écran LED"]')
            await pg.click(f'[data-t="{t}"]')
            if n=='Karim Aït': await pg.screenshot(path=f"{O}/capture.png")
            await pg.click('#cap-save'); await pg.wait_for_timeout(500)
        await pg.evaluate("location.hash='regie'"); await pg.wait_for_timeout(1500); await pg.screenshot(path=f"{O}/regie.png")
        await pg.evaluate("location.hash='contacts'"); await pg.wait_for_timeout(1200); await pg.screenshot(path=f"{O}/contacts.png")
        await pg.evaluate("location.hash='mur'"); await pg.wait_for_timeout(1500); await pg.screenshot(path=f"{O}/mur.png")
        await pg.goto("http://localhost:3100/bilan"); await pg.wait_for_timeout(1500); await pg.screenshot(path=f"{O}/bilan.png", full_page=True)
        await pg.pdf(path=f"{O}/bilan.pdf") if False else None
        print(errs[:6] or 'no errors')
        await b.close()
asyncio.run(main())
