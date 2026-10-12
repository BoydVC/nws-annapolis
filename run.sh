#!/usr/bin/env bash
# NWS Annapolis: fetch + build offline snapshot, then serve on 127.0.0.1:4325.
#   ./run.sh           build + serve
#   ./run.sh --shots   build + screenshot + serve
set -euo pipefail
cd "$(dirname "$0")"
PORT=4325
python3 build.py
if [[ "${1:-}" == "--shots" ]]; then bash tests/screenshot.sh; fi
if ss -ltn | grep -q "127.0.0.1:$PORT "; then
  echo "already serving on http://127.0.0.1:$PORT/"
else
  nohup python3 server.py > /tmp/nws-annapolis-$PORT.log 2>&1 &
  sleep 1
  echo "serving http://127.0.0.1:$PORT/ (pid $!)  ·  offline file: dist/nws-annapolis.html"
fi
