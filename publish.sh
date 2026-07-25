#!/bin/bash
# Publish Launch Command to the internet (Netlify frontend + tunnel to THIS machine).
#
#   ./publish.sh
#
# What it does:
#   1. Makes sure the local app is running (starts it if not)
#   2. Makes sure a Cloudflare tunnel to it is running (starts one if not)
#   3. Writes the tunnel URL into public/api-base.js
#   4. Deploys the frontend to Netlify
#
# Run it again any time the tunnel URL changes (e.g. after a reboot).
# Requirements: cloudflared (brew install cloudflared), netlify-cli (logged in).

set -euo pipefail
cd "$(dirname "$0")"

# 1. Local server
if ! lsof -ti :3000 >/dev/null 2>&1; then
  echo "→ starting local server (npm run dev)…"
  nohup npm run dev > /tmp/lc-dev.log 2>&1 &
  sleep 2
fi
echo "✓ local server running on :3000"

# 2. Tunnel
TUNNEL=$(pgrep -f "cloudflared tunnel --url" >/dev/null && grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/lc-tunnel.log 2>/dev/null | head -1 || true)
if [ -z "${TUNNEL:-}" ]; then
  echo "→ starting Cloudflare tunnel…"
  pkill -f "cloudflared tunnel --url" 2>/dev/null || true
  nohup cloudflared tunnel --url http://localhost:3000 > /tmp/lc-tunnel.log 2>&1 &
  sleep 8
  TUNNEL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/lc-tunnel.log | head -1)
  [ -n "$TUNNEL" ] || { echo "✗ tunnel failed to start — see /tmp/lc-tunnel.log"; exit 1; }
  echo "→ waiting 50s for the tunnel's DNS to publish (don't skip — querying too early poisons DNS caches)…"
  sleep 50
fi
echo "✓ tunnel: $TUNNEL"

# 3. Point the frontend at the tunnel
sed -i '' "s|var TUNNEL_API_BASE = \"[^\"]*\";|var TUNNEL_API_BASE = \"$TUNNEL\";|" public/api-base.js
echo "✓ public/api-base.js → $TUNNEL"

# 4. Verify the tunnel answers, then deploy
if curl -s --max-time 20 "$TUNNEL/api/status" | grep -q mode; then
  echo "✓ API reachable through the tunnel"
else
  echo "⚠ tunnel not answering yet — deploying anyway; give DNS a minute before testing"
fi

netlify deploy --prod --dir public
echo ""
echo "Done. Public site: https://launch-command-suite.netlify.app"
echo "Keep this machine, the server, and the tunnel running while the site is in use."
