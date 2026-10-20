# Website tests (Python + Playwright)

1. `pip install playwright` then `playwright install chromium`.
2. Make a test copy of the site (e.g. `www/`), copy `live.json`, `off.json` and `projected.json` in, put `projected.json` at `seasons/2026-summer.json`, and use `config.sample.json` as its `config.json` (points `liveDataUrl` at `live.json` and lists two archived seasons).
3. Serve it: `python -m http.server 8765` from inside `www/`.
4. Run `python shoot.py` (all pages × seasons × phone/desktop; prints only problems and saves screenshots), `python light.py` (theme toggle) and `python csvtest.py` (every CSV export).

Google Fonts errors in the console are expected if the test machine has no internet.
