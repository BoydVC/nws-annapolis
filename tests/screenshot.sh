#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${NWS_ANNAPOLIS_PORT:-4325}"
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser)"
mkdir -p screenshots dist
if [[ ! -f dist/nws-annapolis.html ]]; then python3 build.py; fi
if ! ss -ltn | grep -q "127.0.0.1:$PORT "; then
  nohup python3 server.py > /tmp/nws-annapolis-$PORT.log 2>&1 &
  sleep 1
fi
shot() {
  local url="$1" out="$2" size="$3"; shift 3 || true
  local prof; prof="$(mktemp -d /tmp/nwsshot.XXXX)"
  "$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --run-all-compositor-stages-before-draw --virtual-time-budget=28000 \
    --window-size="$size" --user-data-dir="$prof" --screenshot="$out" "$@" "$url" >/dev/null 2>&1
  rm -rf "$prof"; echo "  $out ($(wc -c < "$out") bytes)"
}
U="http://127.0.0.1:$PORT"
shot "file://$PWD/dist/nws-annapolis.html#now" screenshots/00-best-home.png 1440,1100
shot "$U/#now" screenshots/00-desktop-now.png 1440,1000
shot "$U/#hourly" screenshots/01-hourly.png 1440,1000
shot "$U/#week" screenshots/02-week.png 1440,1100
shot "$U/#alerts" screenshots/03-alerts.png 1440,1000
shot "$U/#about" screenshots/04-about.png 1440,1000
shot "$U/#now" screenshots/05-phone.png 390,844 --user-agent="Mozilla/5.0 (iPhone)"
echo "screenshots done"
