// Pack sync server — ESM, merge-on-write.
// NOTE: This file never persists settings, openRouterApiKey, or syncToken —
// mergeData only returns {masterItems, kits, trips}.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { mergeData } from '../shared/syncMerge.mjs'
import { persistData } from './persist.mjs'

const DATA_FILE = process.env.PACK_DATA_FILE ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'data.json')
const TOKEN = process.env.PACK_SYNC_TOKEN || ''
const PORT = 3001

// Ensure the data file exists on startup
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}')

// ── validation helpers ────────────────────────────────────────────────────────

function isParseableISO(s) {
  return typeof s === 'string' && Number.isFinite(Date.parse(s))
}

function validateRecord(r) {
  if (!r || typeof r !== 'object') return false
  if (typeof r.id !== 'string') return false
  if (!isParseableISO(r.updatedAt)) return false
  // deletedAt: if present and non-null, must be a string
  if (r.deletedAt != null && typeof r.deletedAt !== 'string') return false
  return true
}

function validateTripRecord(r) {
  if (!validateRecord(r)) return false
  if (r.items !== undefined) {
    if (!Array.isArray(r.items)) return false
    for (const item of r.items) {
      if (!validateRecord(item)) return false
    }
  }
  return true
}

// Returns null if valid, or an error string if not.
function validateShape(body) {
  if (!Array.isArray(body.masterItems)) return 'masterItems must be an array'
  if (!Array.isArray(body.kits)) return 'kits must be an array'
  if (!Array.isArray(body.trips)) return 'trips must be an array'

  for (const r of body.masterItems) {
    if (!validateRecord(r)) return 'invalid masterItem record'
  }
  for (const r of body.kits) {
    if (!validateRecord(r)) return 'invalid kit record'
  }
  for (const r of body.trips) {
    if (!validateTripRecord(r)) return 'invalid trip record'
  }
  return null
}

// Returns true if ANY record's updatedAt is more than 60s in the future.
function hasFarFuture(body) {
  const cutoff = Date.now() + 60_000

  function checkRecord(r) {
    return Date.parse(r.updatedAt) > cutoff
  }

  for (const r of body.masterItems) {
    if (checkRecord(r)) return true
  }
  for (const r of body.kits) {
    if (checkRecord(r)) return true
  }
  for (const r of body.trips) {
    if (checkRecord(r)) return true
    if (Array.isArray(r.items)) {
      for (const item of r.items) {
        if (checkRecord(item)) return true
      }
    }
  }
  return false
}

// ── request handler ───────────────────────────────────────────────────────────

function readCurrentData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8').trim()
    if (!raw || raw === '{}') return { masterItems: [], kits: [], trips: [] }
    const parsed = JSON.parse(raw)
    return {
      masterItems: Array.isArray(parsed.masterItems) ? parsed.masterItems : [],
      kits: Array.isArray(parsed.kits) ? parsed.kits : [],
      trips: Array.isArray(parsed.trips) ? parsed.trips : [],
    }
  } catch {
    return { masterItems: [], kits: [], trips: [] }
  }
}

const server = http.createServer((req, res) => {
  // CORS headers on every response
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Bearer auth
  const auth = req.headers['authorization']
  if (!TOKEN || auth !== 'Bearer ' + TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'unauthorized' }))
    return
  }

  if (req.url === '/api/data' && req.method === 'GET') {
    // Return raw file contents (may contain tombstones — client handles them)
    const data = fs.readFileSync(DATA_FILE, 'utf8')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(data)
    return
  }

  if (req.url === '/api/data' && req.method === 'PUT') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      // 1. Parse JSON
      let incoming
      try {
        incoming = JSON.parse(body)
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'invalid json' }))
        return
      }

      // 2. schemaVersion gate
      if (typeof incoming.schemaVersion !== 'number' || incoming.schemaVersion < 2) {
        res.writeHead(426, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'schema version too old' }))
        return
      }

      // 3. Shape validation
      const shapeError = validateShape(incoming)
      if (shapeError) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: shapeError }))
        return
      }

      // 4. Far-future rejection
      if (hasFarFuture(incoming)) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'updatedAt too far in future' }))
        return
      }

      // 5. Synchronous read → merge (no await between read and write)
      const current = readCurrentData()
      const merged = mergeData(current, incoming)

      // 6. Atomic write + rolling backup (best-effort)
      persistData(DATA_FILE, merged)

      // 7. Respond with merged doc (client folds it back)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(merged))
    })
    return
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(PORT, '127.0.0.1', () => {
  console.log('pack-sync listening on ' + PORT)
})
