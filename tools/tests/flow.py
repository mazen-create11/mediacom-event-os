import asyncio
from playwright.async_api import async_playwright
EXE="/Users/chabanmazen/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell"
B="http://localhost:3100"; O="t4"
async def tablet(b, op, w=1366, h=1024):
    ctx = await b.new_context(viewport={"width":w,"height":h})
    pg = await ctx.new_page()
    errs=[]
    pg.on("console", lambda m: errs.append(f"[{op}] {m.type}: {m.text}") if m.type in("error",) else None)
    pg.on("pageerror", lambda e: errs.append(f"[{op}] PAGEERROR: {e}"))
    await pg.goto(B+"/", wait_until="load")
    await pg.evaluate(f"localStorage.setItem('mc_op','{op}')")
    await pg.reload(wait_until="load"); await pg.wait_for_timeout(1500)
    return pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=["--use-gl=angle","--enable-unsafe-swiftshader"])
        mz, e1 = await tablet(b, 'mazen')
        co, e2 = await tablet(b, 'coraline')
        # Mazen : nouveau contact
        await mz.click('#go'); await mz.wait_for_timeout(700)
        await mz.screenshot(path=f"{O}/capture-open.png")
        await mz.fill('#f-name', 'Lucie Fabre'); await mz.fill('#f-company', 'Office de tourisme de Cassis')
        await mz.fill('#f-phone', '06 12 34 56 78'); await mz.fill('#f-email', 'l.fabre@example.fr'); await mz.fill('#f-role', 'Responsable événements')
        await mz.click('[data-t="hot"]')
        await mz.click('[data-single="eventType"] [data-v="Événement public"]')
        await mz.click('[data-multi="needs"] [data-v="Scène mobile MediaScène"]'); await mz.click('[data-multi="needs"] [data-v="Son"]')
        await mz.click('[data-single="audience"] [data-v="2 000 +"]')
        await mz.fill('#f-notes', 'Fête du port en juillet, veut la MediaScène 60 m².')
        await mz.wait_for_timeout(300)
        await mz.screenshot(path=f"{O}/capture-filled.png")
        await mz.click('#cap-save'); await mz.wait_for_timeout(1200)
        await mz.screenshot(path=f"{O}/after-save.png")
        await co.wait_for_timeout(800)
        await co.screenshot(path=f"{O}/coraline-sees.png")
        # Doublon : Coraline ressaisit le même e-mail
        await co.click('#go'); await co.wait_for_timeout(600)
        await co.fill('#f-email', 'l.fabre@example.fr'); await co.wait_for_timeout(300)
        await co.screenshot(path=f"{O}/dupe.png")
        await co.keyboard.press('Escape'); await co.wait_for_timeout(500)
        # Mazen transmet à Coraline
        await mz.evaluate("location.hash='contacts'"); await mz.wait_for_timeout(900)
        await mz.click('#v-contacts .lead-row >> text=Lucie Fabre'); await mz.wait_for_timeout(600)
        await mz.click('[data-act="transfer"]'); await mz.wait_for_timeout(500)
        await mz.click('[data-to="coraline"]'); await mz.click('[data-q="Veut un devis"]')
        await mz.screenshot(path=f"{O}/transfer-sheet.png")
        await mz.click('[data-go]'); await mz.wait_for_timeout(1500)
        await co.screenshot(path=f"{O}/coraline-toast.png")
        await co.click('.toast.transfer >> text=Ouvrir la fiche'); await co.wait_for_timeout(1200)
        await co.screenshot(path=f"{O}/coraline-fiche.png")
        # Présentation
        await mz.evaluate("location.hash='book'"); await mz.wait_for_timeout(1200)
        await mz.click('[data-present="mediascene"]'); await mz.wait_for_timeout(2200)
        await mz.screenshot(path=f"{O}/present.png")
        await mz.keyboard.press('Escape')
        print("\n".join(e1+e2) or "no errors")
        await b.close()
asyncio.run(main())
