import sys, asyncio, json
from playwright.async_api import async_playwright
EXE="/Users/chabanmazen/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell"
OUT=sys.argv[1]; W=int(sys.argv[2]); H=int(sys.argv[3]); views=sys.argv[4].split(',')
BASE="http://localhost:3100"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=["--use-gl=angle","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        ctx = await b.new_context(viewport={"width":W,"height":H}, device_scale_factor=1)
        pg = await ctx.new_page()
        errs=[]
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in("error","warning") else None)
        pg.on("pageerror", lambda e: errs.append("PAGEERROR: "+str(e)))
        await pg.goto(BASE+"/", wait_until="load")
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path=f"{OUT}/first-run.png")
        await pg.evaluate("localStorage.setItem('mc_op','mazen')")
        await pg.reload(wait_until="load")
        await pg.wait_for_timeout(1500)
        for v in views:
            if v.startswith('js:'):
                await pg.evaluate(v[3:]); await pg.wait_for_timeout(1500); continue
            if v.startswith('shot:'):
                await pg.screenshot(path=f"{OUT}/{v[5:]}.png"); continue
            if v.startswith('full:'):
                await pg.screenshot(path=f"{OUT}/{v[5:]}.png", full_page=False); continue
            await pg.evaluate(f"location.hash='{v}'")
            await pg.wait_for_timeout(2600 if v!='scene' else 6000)
            await pg.screenshot(path=f"{OUT}/{v}.png")
        print("\n".join(errs[:30]) or "no errors")
        await b.close()
asyncio.run(main())
