# NWS Annapolis

Live National Weather Service forecast board for **Annapolis / Millersville** — hourly and 7-day from `api.weather.gov`, with alerts when present. TokenMax burn build.

Temperatures, wind, and alerts are **never invented**. `build.py` fetches NWS at build time and embeds `data/forecast.json`. The UI works offline from that snapshot (“snapshot at …”). If the fetch fails, the board ships as a clearly labeled **EXAMPLE** snapshot (empty periods) and this README notes the failure.

## Screens

1. **Now** — current hour + next periods, office name  
2. **Hourly** — next 48 hours  
3. **7-day** — day/night periods with detailed forecast  
4. **Alerts** — active alerts from the snapshot  
5. **About** — points, User-Agent, offline notes  

Hash routes: `#now` · `#hourly` · `#week` · `#alerts` · `#about`

## Run

```bash
./run.sh          # fetch + build + serve http://127.0.0.1:4325/
./run.sh --shots  # + screenshots/
```

Offline single file: `dist/nws-annapolis.html`

## Layout

- `web/` — index.html, app.css, app.js  
- `data/forecast.json` — NWS snapshot (embedded into dist)  
- `build.py` / `server.py` / `tests/screenshot.sh`

## Fetch status

See the latest `build.py` console line (`NWS fetch OK` or `NWS fetch FAILED`). User-Agent: `TokenMaxWeather/1.0 (Boyd local; contact: local)`. Office: NWS Baltimore/Washington (LWX).


---
## Repo notes
- **Built:** Oct 2026 (TokenMax build week; see SHORTLIST/ledger), by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/nws-annapolis` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
- Personal details (emails, phone numbers, home street address) were replaced with `[redacted-…]` placeholders.
