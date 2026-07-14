# Pack — Operations Guide

How to set up, deploy, and maintain the Pack app. Reference this when changing devices, moving servers, or onboarding a new machine.

## Architecture

```
Your devices (phone, laptop)
    ↓ browser
https://pack.imrankhan.fyi
    ↓ Caddy (port 443 / HTTPS)
    ├── /api/*  → pack-sync (Node.js, port 3001) → /opt/pack-sync/data.json
    └── /*      → /var/www/pack/ (static files)
```

- **Static app** served by Caddy from `/var/www/pack/`
- **Sync server** is a tiny Node.js process that reads/writes a single JSON file
- **Data lives** in `/opt/pack-sync/data.json` on the server (the single source of truth)
- **localStorage** is a local cache — the server version wins on load

## Credentials

| What | Value | Where it's stored |
|------|-------|-------------------|
| Server SSH | `root@94.130.96.213` | Your Mac's SSH key |
| Sync token | `YOUR_TOKEN_HERE` | Server: `/etc/systemd/system/pack-sync.service` (env var). App: Manage > API key > Sync token |
| OpenRouter API key | (your key) | App: Manage > API key. Also stored in sync data. |

## Setting Up a New Device

1. Open `https://pack.imrankhan.fyi` in the browser
2. Complete onboarding (enter OpenRouter key or skip)
3. Go to **Manage > API key**
4. Enter:
   - Server URL: `https://pack.imrankhan.fyi`
   - Sync token: `YOUR_TOKEN_HERE`
5. Click **Save & connect**
6. Your data (master list, kits, trips) loads from the server

That's it. Changes on this device will auto-sync to the server within 1.5 seconds.

## Setting Up a New Dev Machine

Prerequisites: Node.js, npm, git.

```bash
git clone https://github.com/cyntraplace/packing.git
cd packing
npm install
npm run dev        # runs on http://localhost:5173
npm run build      # builds to dist/
npm test           # runs vitest
```

## Deploying Changes

From the project root:

```bash
# Option A: use the deploy script (checks for uncommitted/unpushed changes first)
./deploy.sh

# Option B: manual
npm run build
scp -r dist/* root@94.130.96.213:/var/www/pack/
```

The service worker auto-invalidates the cache on each build (build ID is injected at build time).

### Deploying server (sync) changes

The client deploy above only ships `dist/`. When `server/` changes, deploy the
sync server too. Deploy **all** server modules together — a partial deploy breaks
the ESM imports and takes sync down on restart:

```bash
# From the project root. persist.mjs is imported by server.mjs, so ship both.
scp server/server.mjs server/persist.mjs root@94.130.96.213:/opt/pack-sync/server/
ssh root@94.130.96.213 "systemctl restart pack-sync && systemctl status pack-sync --no-pager"
```

Then smoke-test: an authenticated PUT should return 200 and leave a fresh
`data.json.bak.*` snapshot beside `/opt/pack-sync/data.json` (rolling backups,
newest 50 kept; no-op writes are not backed up).

## Moving to a New Server

### 1. Back up the data

```bash
ssh root@94.130.96.213 "cat /opt/pack-sync/data.json" > pack-backup.json
```

### 2. On the new server

Install prerequisites:

```bash
apt update && apt install -y nodejs caddy
ufw allow 80/tcp
ufw allow 22/tcp
```

Create the sync server:

```bash
mkdir -p /opt/pack-sync/server /opt/pack-sync/shared
```

Deploy **both** files from the repo (relative paths must be preserved so the ESM import resolves):

```bash
# From your dev machine's project root:
scp server/server.mjs  root@SERVER_IP:/opt/pack-sync/server/server.mjs
scp shared/syncMerge.mjs root@SERVER_IP:/opt/pack-sync/shared/syncMerge.mjs
```

The sync server script (`/opt/pack-sync/server/server.mjs`) — ESM, merge-on-write:

```javascript
// Pack sync server — ESM, merge-on-write.
// NOTE: This file never persists settings, openRouterApiKey, or syncToken —
// mergeData only returns {masterItems, kits, trips}.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { mergeData } from '../shared/syncMerge.mjs'

const DATA_FILE = process.env.PACK_DATA_FILE ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'data.json')
const TOKEN = process.env.PACK_SYNC_TOKEN || ''
const PORT = 3001

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}')

// ... (see server/server.mjs in the repo for the full source)

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const auth = req.headers['authorization']
  if (!TOKEN || auth !== 'Bearer ' + TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'unauthorized' }))
    return
  }

  if (req.url === '/api/data' && req.method === 'GET') {
    const data = fs.readFileSync(DATA_FILE, 'utf8')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(data)
  } else if (req.url === '/api/data' && req.method === 'PUT') {
    // PUT: validate → merge-on-write → respond with merged doc
    // See server/server.mjs for full validation (schemaVersion gate, shape, far-future)
    // ...
  } else {
    res.writeHead(404); res.end('not found')
  }
})

server.listen(PORT, '127.0.0.1', () => console.log('pack-sync listening on ' + PORT))
```

Create the systemd service (`/etc/systemd/system/pack-sync.service`):

```ini
[Unit]
Description=Pack Sync Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/pack-sync
ExecStart=/usr/bin/node /opt/pack-sync/server/server.mjs
Environment=PACK_SYNC_TOKEN=YOUR_TOKEN_HERE
Environment=PACK_DATA_FILE=/opt/pack-sync/data.json
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Start it:

```bash
systemctl daemon-reload
systemctl enable pack-sync
systemctl start pack-sync
```

Restore data:

```bash
cp pack-backup.json /opt/pack-sync/data.json
```

### 3. Configure Caddy

```bash
cat > /etc/caddy/Caddyfile << 'EOF'
:80 {
    handle /api/* {
        reverse_proxy localhost:3001
    }

    handle {
        root * /var/www/pack
        file_server
        try_files {path} /index.html
        encode gzip

        header /sw.js Cache-Control "no-cache"
        header /manifest.json Cache-Control "no-cache"
        header /assets/* Cache-Control "public, max-age=31536000, immutable"
    }
}
EOF
systemctl restart caddy
```

### 4. Deploy the app

```bash
mkdir -p /var/www/pack
# From your dev machine:
npm run build
scp -r dist/* root@NEW_SERVER_IP:/var/www/pack/
```

### 5. Update your devices

On each device, go to Manage > API key and update the Server URL to the new IP.

## Generating a New Sync Token

If the token is compromised:

```bash
# Generate new token
NEW_TOKEN=$(openssl rand -hex 24)
echo $NEW_TOKEN

# Update server
ssh root@94.130.96.213 "sed -i 's/PACK_SYNC_TOKEN=.*/PACK_SYNC_TOKEN=$NEW_TOKEN/' /etc/systemd/system/pack-sync.service && systemctl daemon-reload && systemctl restart pack-sync"
```

Then update the token on each device in Manage > API key.

## HTTPS Configuration

HTTPS is already configured via Let's Encrypt (Caddy auto-provisions).

## Troubleshooting

**Sync not working:**
```bash
# Check sync server is running
ssh root@94.130.96.213 "systemctl status pack-sync"

# Test the API
curl -H "Authorization: Bearer YOUR_TOKEN" https://pack.imrankhan.fyi/api/data

# Check logs
ssh root@94.130.96.213 "journalctl -u pack-sync -n 20"
```

**White screen after deploy:**
Hard refresh (Cmd+Shift+R) or open in a private tab to bypass the service worker cache. If opening fresh on a new device, clear site data in browser settings (Application → Storage → Clear site data).

**Data lost:**
The server file is the source of truth: `/opt/pack-sync/data.json`. Back it up periodically:
```bash
ssh root@94.130.96.213 "cat /opt/pack-sync/data.json" > "pack-backup-$(date +%Y%m%d).json"
```

**Service worker stuck:**
In browser dev tools > Application > Service Workers > Unregister, then reload.
