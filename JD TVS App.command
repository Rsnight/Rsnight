#!/bin/zsh
cd "$(dirname "$0")"

PORT="${PORT:-4174}"
APP_URL="http://localhost:${PORT}/login.html"

if ! curl -fsS "http://localhost:${PORT}/api/state" >/dev/null 2>&1; then
  nohup node server.js > /tmp/jd-tvs-app.log 2>&1 &
  sleep 1
fi

open "$APP_URL"
