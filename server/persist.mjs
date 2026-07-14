// Atomic write + best-effort rolling backups for the sync server's data file.
import fs from 'node:fs'
import path from 'node:path'

// Process-wide monotonic counter, used as a within-millisecond tiebreaker so
// backup filenames sort chronologically even for same-millisecond writes.
let backupSeq = 0

export function persistData(dataFile, merged, opts = {}) {
  const keep = opts.keep ?? 50

  const nextRaw = JSON.stringify(merged)

  // Capture the prior on-disk content BEFORE overwriting, so we can skip a
  // no-op backup when this write doesn't actually change anything. Saves fire
  // per debounced mutation and every foreground pull re-PUTs, so most writes
  // are content-identical; backing those up would churn the rolling window down
  // to minutes deep during active use and evict the snapshots worth keeping.
  let priorRaw = null
  try { priorRaw = fs.readFileSync(dataFile, 'utf8') } catch { /* no prior file */ }

  // Atomic write via temp file + rename — same behavior as before.
  // If this throws, the caller (server.mjs) handles it; we do not catch it here.
  const tmp = dataFile + '.tmp'
  fs.writeFileSync(tmp, nextRaw)
  fs.renameSync(tmp, dataFile)

  // Nothing changed on disk → no new snapshot worth keeping. (First-ever write,
  // priorRaw === null, is treated as a change and backed up.)
  if (priorRaw === nextRaw) return

  // Rolling backup + prune: best-effort. The primary write already succeeded,
  // so nothing below may throw out of this function.
  try {
    const dir = path.dirname(dataFile)
    const base = path.basename(dataFile)
    const prefix = base + '.bak.'

    // Fixed-width fields (13-digit ms + 6-digit monotonic counter) mean lexical
    // filename sort == chronological order. Date.now() is the primary component
    // (correct across process restarts); the counter breaks same-ms ties and is
    // never reused, so a freshly written backup can never sort as the oldest.
    const suffix = Date.now() + '-' + String(backupSeq++).padStart(6, '0')
    const backupPath = path.join(dir, prefix + suffix)
    fs.copyFileSync(dataFile, backupPath)

    const backups = fs.readdirSync(dir)
      .filter(name => name.startsWith(prefix))
      .sort()

    const excess = backups.length - keep
    if (excess > 0) {
      for (const name of backups.slice(0, excess)) {
        fs.unlinkSync(path.join(dir, name))
      }
    }
  } catch {
    // Backup/prune failure must never take down the write path.
  }
}
