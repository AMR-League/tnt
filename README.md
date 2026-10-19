# Thursday Night Thunder — league website

The public website for American Motor Racing's **Thursday Night Thunder** iRacing league:
standings, the Chase, race results, schedule, driver pages and the roster, laid out for both phones and desktops.

**Live site:** https://amr-league.github.io/TNT/

The points themselves are still run in the league's Google Sheet (League Tools). This site only *reads* that data, so nothing here affects scoring.

---

## What's in this repository

| File | What it is | Edit it? |
|---|---|---|
| `config.json` | The site's settings: name, logo, colors, the **live data link**, and the list of archived seasons | **Yes**: this is the only file you normally change |
| `assets/tnt-logo.png` | The logo | Replace to change the logo (keep the same name) |
| `seasons/` | Archived seasons, one `.json` file each | Add a file at the end of each season |
| `index.html`, `app.js`, `styles.css` | The site itself | Only when changing how the site works |

There's no build step: the files are the site. GitHub Pages serves them exactly as they are.

---

## Common jobs

All of these can be done on github.com: open the file, click the **pencil** icon, make the change, then **Commit changes**. The site updates within a minute or two.

### Point the site at a new season's sheet
Each season's Google Sheet has its own data link (League Tools → Website → Website Setup Help explains how to get it).
1. Open `config.json` and click the pencil.
2. Replace the link after `"liveDataUrl":` with the new one. Keep the quotation marks.
3. **Commit changes.**

### Archive a finished season
Do this **before** switching `liveDataUrl` to the new season.
1. In the finished season's sheet: **League Tools → Website → Download Season Archive…** → **Download**.
2. Here on GitHub: open the `seasons` folder → **Add file → Upload files** → drop the file in → **Commit changes**.
3. Open `config.json` and add the season to `archivedSeasons`:
   ```json
   "archivedSeasons": [
     { "id": "2026-road-to-cup", "label": "2026 Road To Cup", "file": "seasons/2026-road-to-cup.json" }
   ]
   ```
   - `id`: short, lowercase, no spaces. It shows up in links (`?season=2026-road-to-cup`).
   - `label`: what the season picker shows.
   - `file`: `seasons/` + the exact file name you uploaded.
   - With more than one archived season, separate the entries with commas, newest first.
4. **Commit changes.** The **Season** picker appears in the header as soon as there's at least one archived season.

### Change colors or the logo
- Colors: `config.json` → `colors` → `primary` (navy) and `accent` (red), as hex codes.
- Logo: upload a new `assets/tnt-logo.png` (same file name) over the old one.

### Check that config.json is still valid
If the site shows "The site settings (config.json) couldn't be loaded", the file has a typo. The usual cause is a missing comma or quotation mark. Paste it into https://jsonlint.com to find the line.

---

## Handing off

- This repository belongs to the **AMR-League** GitHub organization, not to any one person. To hand it over, add the new admin as an organization **Owner** (Settings → People).
- The only link to a person's Google account is the data link in `config.json`, which comes from whoever owns the current season's sheet. A new sheet owner sets up their own data link (admin guide, *Website*) and pastes it in.

---

## How it works (for whoever maintains the code)

- `app.js` loads `config.json`, then fetches the season data: the `liveDataUrl` (the League Tools web app, which returns JSON), or `seasons/<file>.json` for an archived season (`?season=<id>` in the address).
- The data format is documented in **Web_Data_Contract_v1.md** (kept with the League Tools files). The site checks `schemaVersion` and shows a message if the sheet sends a newer format than it understands.
- The last copy of each season is kept in the visitor's browser (localStorage), so repeat visits show standings instantly while the latest data loads, and still show something if Google is unreachable.
- Pages are `#/` links (`#/standings`, `#/race/12`, `#/driver/<custId>`, …), so GitHub Pages needs no special setup.
- iRacing Cust IDs are used only in driver-page links, never shown. Drivers marked inactive in the sheet (left or removed from the league) have no driver page.
- Fonts: Archivo / Archivo Narrow from Google Fonts.
