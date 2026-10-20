import asyncio
from playwright.async_api import async_playwright
B='http://127.0.0.1:8765/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for label,vp in [('desk',{'width':1366,'height':900}),('mob',{'width':390,'height':844})]:
            ctx=await b.new_context(viewport=vp); pg=await ctx.new_page()
            await pg.goto(B+'#/'); await pg.wait_for_timeout(300)
            assert await pg.evaluate("document.documentElement.dataset.theme") is None
            await pg.click('#theme-toggle'); await pg.wait_for_timeout(100)
            t=await pg.evaluate("[document.documentElement.dataset.theme, localStorage.getItem('tnt-theme'), document.querySelector('#theme-toggle').getAttribute('aria-label')]")
            print(label,'after click:',t)
            await pg.reload(); await pg.wait_for_timeout(300)
            print(label,'after reload:',await pg.evaluate("document.documentElement.dataset.theme"))
            for name,h in [('home','#/'),('race','#/race/12'),('driver','#/driver/2000')]:
                await pg.goto(B+h); await pg.wait_for_timeout(300)
                await pg.screenshot(path=f'light_{label}_{name}.png', full_page=(label=='desk'))
            await pg.click('#theme-toggle'); print(label,'toggled back:',await pg.evaluate("document.documentElement.dataset.theme"))
            await ctx.close()
        await b.close()
asyncio.run(main())
