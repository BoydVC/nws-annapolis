#!/usr/bin/env python3
"""Fetch NWS Annapolis/Millersville forecast, save data/forecast.json, build dist."""
import json
import os
import urllib.error
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
ET = ZoneInfo("America/New_York")
UA = "TokenMaxWeather/1.0 (Boyd local; contact: local)"
TIMEOUT = 20

POINTS = [
    {
        "id": "annapolis",
        "label": "Annapolis",
        "lat": 38.9784,
        "lon": -76.4922,
        "cityNote": "Annapolis, MD",
    },
    {
        "id": "millersville",
        "label": "Millersville",
        "lat": 39.0596,
        "lon": -76.6477,
        "cityNote": "near Odenton / Millersville, MD",
    },
]


def rd(rel):
    with open(os.path.join(HERE, rel), encoding="utf-8") as f:
        return f.read()


def http_json(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/geo+json, application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode())


def slim_period(p, hourly=False):
    out = {
        "startTime": p.get("startTime"),
        "endTime": p.get("endTime"),
        "isDaytime": p.get("isDaytime"),
        "temperature": p.get("temperature"),
        "temperatureUnit": p.get("temperatureUnit"),
        "windSpeed": p.get("windSpeed"),
        "windDirection": p.get("windDirection"),
        "shortForecast": p.get("shortForecast"),
        "icon": p.get("icon"),
        "probabilityOfPrecipitation": (p.get("probabilityOfPrecipitation") or {}).get(
            "value"
        ),
    }
    if not hourly:
        out["name"] = p.get("name")
        out["detailedForecast"] = p.get("detailedForecast")
    else:
        out["humidity"] = (p.get("relativeHumidity") or {}).get("value")
        out["dewpoint"] = (p.get("dewpoint") or {}).get("value")
    return out


def slim_alert(f):
    p = f.get("properties") or {}
    return {
        "id": p.get("id"),
        "event": p.get("event"),
        "headline": p.get("headline"),
        "severity": p.get("severity"),
        "urgency": p.get("urgency"),
        "certainty": p.get("certainty"),
        "onset": p.get("onset"),
        "ends": p.get("ends"),
        "description": p.get("description"),
        "instruction": p.get("instruction"),
        "areaDesc": p.get("areaDesc"),
    }


def example_payload(reason):
    now = datetime.now(ET)
    return {
        "meta": {
            "source": "EXAMPLE (fetch failed)",
            "userAgent": UA,
            "snapshotAt": now.isoformat(),
            "snapshotAtLabel": now.strftime("%a %b %-d, %Y · %-I:%M %p ET"),
            "isExample": True,
            "fetchOk": False,
            "fetchError": reason,
            "office": {
                "id": "LWX",
                "name": "Baltimore/Washington (EXAMPLE)",
                "url": "https://api.weather.gov/offices/LWX",
            },
            "primary": "annapolis",
        },
        "locations": [
            {
                "id": "annapolis",
                "label": "Annapolis",
                "lat": 38.9784,
                "lon": -76.4922,
                "cityNote": "Annapolis, MD — EXAMPLE only",
                "gridId": "LWX",
                "gridX": 115,
                "gridY": 78,
                "updated": None,
                "generatedAt": None,
                "periods": [],
                "hourly": [],
                "alerts": [],
            },
            {
                "id": "millersville",
                "label": "Millersville",
                "lat": 39.0596,
                "lon": -76.6477,
                "cityNote": "Millersville, MD — EXAMPLE only",
                "gridId": "LWX",
                "gridX": 109,
                "gridY": 80,
                "updated": None,
                "generatedAt": None,
                "periods": [],
                "hourly": [],
                "alerts": [],
            },
        ],
    }


def fetch_live():
    now = datetime.now(ET)
    office = http_json("https://api.weather.gov/offices/LWX")
    locations = []
    for pt in POINTS:
        points = http_json(
            f"https://api.weather.gov/points/{pt['lat']},{pt['lon']}"
        )
        props = points.get("properties") or {}
        fc_url = props.get("forecast")
        hr_url = props.get("forecastHourly")
        if not fc_url or not hr_url:
            raise RuntimeError(f"missing forecast URLs for {pt['id']}")
        fc = http_json(fc_url)
        hr = http_json(hr_url)
        al = http_json(
            f"https://api.weather.gov/alerts/active?point={pt['lat']},{pt['lon']}"
        )
        fprops = fc.get("properties") or {}
        hprops = hr.get("properties") or {}
        locations.append(
            {
                "id": pt["id"],
                "label": pt["label"],
                "lat": pt["lat"],
                "lon": pt["lon"],
                "cityNote": pt["cityNote"],
                "gridId": props.get("gridId"),
                "gridX": props.get("gridX"),
                "gridY": props.get("gridY"),
                "updated": fprops.get("updated"),
                "generatedAt": fprops.get("generatedAt"),
                "elevation": fprops.get("elevation"),
                "periods": [slim_period(p) for p in (fprops.get("periods") or [])],
                "hourly": [
                    slim_period(p, hourly=True)
                    for p in (hprops.get("periods") or [])[:48]
                ],
                "alerts": [slim_alert(f) for f in (al.get("features") or [])],
            }
        )
    return {
        "meta": {
            "source": "api.weather.gov",
            "userAgent": UA,
            "snapshotAt": now.isoformat(),
            "snapshotAtLabel": now.strftime("%a %b %-d, %Y · %-I:%M %p ET"),
            "isExample": False,
            "fetchOk": True,
            "office": {
                "id": office.get("id") or "LWX",
                "name": office.get("name") or "Baltimore/Washington",
                "address": office.get("address"),
                "telephone": office.get("telephone"),
                "url": office.get("@id") or "https://api.weather.gov/offices/LWX",
            },
            "primary": "annapolis",
        },
        "locations": locations,
    }


def load_or_fetch():
    data_path = os.path.join(HERE, "data", "forecast.json")
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    err = None
    try:
        payload = fetch_live()
        with open(data_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"NWS fetch OK → {data_path}")
        return payload, True, None
    except Exception as ex:
        err = str(ex)
        print(f"NWS fetch FAILED: {err}")
        if os.path.isfile(data_path):
            with open(data_path, encoding="utf-8") as f:
                existing = json.load(f)
            if existing.get("meta", {}).get("fetchOk") and existing.get("locations"):
                print("Keeping previous successful snapshot on disk.")
                return existing, True, err
        payload = example_payload(err)
        with open(data_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print("Wrote EXAMPLE empty snapshot.")
        return payload, False, err


def main():
    data, ok, err = load_or_fetch()
    data_js = json.dumps(data, ensure_ascii=False)
    html = rd("web/index.html")
    html = html.replace("/*__CSS__*/", rd("web/app.css"))
    html = html.replace("/*__FORECAST__*/ null /*__/FORECAST__*/", data_js)
    app = rd("web/app.js").replace("</script", "<\\/script")
    html = html.replace("/*__APP__*/", app)
    os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
    out = os.path.join(HERE, "dist", "nws-annapolis.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    nloc = len(data.get("locations") or [])
    print(
        f"built {out} ({os.path.getsize(out):,} bytes) · locations={nloc} · fetchOk={ok}"
        + (f" · err={err}" if err and not ok else "")
    )


if __name__ == "__main__":
    main()
