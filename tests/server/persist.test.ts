import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { persistData } from '../../server/persist.mjs'

let dir: string
let dataFile: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'packpersist-'))
  dataFile = path.join(dir, 'data.json')
})

afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('persistData', () => {
  it('writes valid JSON that round-trips to the object written', () => {
    const doc = { masterItems: [{ id: 'a' }], kits: [], trips: [] }
    persistData(dataFile, doc)
    const onDisk = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    expect(onDisk).toEqual(doc)
  })

  it('keeps only the N most recent backups after M > N writes', () => {
    for (let i = 0; i < 6; i++) {
      persistData(dataFile, { masterItems: [], kits: [], trips: [], seq: i }, { keep: 3 })
    }
    const backups = fs.readdirSync(dir)
      .filter(name => name.startsWith('data.json.bak.'))
      .sort()
    expect(backups.length).toBe(3)

    // Surviving backups should correspond to the 3 most recent writes (seq 3,4,5).
    const seqs = backups
      .map(name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')).seq)
      .sort((a, b) => a - b)
    expect(seqs).toEqual([3, 4, 5])
  })

  it('each surviving backup file is valid JSON', () => {
    for (let i = 0; i < 5; i++) {
      persistData(dataFile, { masterItems: [], kits: [], trips: [], seq: i }, { keep: 2 })
    }
    const backups = fs.readdirSync(dir).filter(name => name.startsWith('data.json.bak.'))
    expect(backups.length).toBe(2)
    for (const name of backups) {
      expect(() => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))).not.toThrow()
    }
  })

  it('skips the backup when a write does not change the on-disk content', () => {
    const doc = { masterItems: [{ id: 'a' }], kits: [], trips: [] }
    persistData(dataFile, doc)                 // first write: null -> X, one backup
    persistData(dataFile, doc)                 // identical: no new backup
    persistData(dataFile, doc)                 // identical: no new backup
    let backups = fs.readdirSync(dir).filter(n => n.startsWith('data.json.bak.'))
    expect(backups.length).toBe(1)
    // A genuinely different write DOES back up.
    persistData(dataFile, { ...doc, kits: [{ id: 'k' }] })
    backups = fs.readdirSync(dir).filter(n => n.startsWith('data.json.bak.'))
    expect(backups.length).toBe(2)
    // The primary file always reflects the latest write regardless.
    expect(JSON.parse(fs.readFileSync(dataFile, 'utf8')).kits).toEqual([{ id: 'k' }])
  })

  it('does not throw when backup creation fails, and the primary write still succeeds', () => {
    vi.spyOn(fs, 'copyFileSync').mockImplementation(() => {
      throw new Error('simulated backup failure')
    })
    const doc = { masterItems: [], kits: [], trips: [], marker: 'ok' }
    expect(() => persistData(dataFile, doc)).not.toThrow()
    const onDisk = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    expect(onDisk).toEqual(doc)
    // No backup should exist since copyFileSync always threw.
    const backups = fs.readdirSync(dir).filter(name => name.startsWith('data.json.bak.'))
    expect(backups.length).toBe(0)
  })

  it('does not throw when pruning fails (unlink error), primary write still succeeds', () => {
    // Create backups first (keep them small so we quickly exceed the cap).
    for (let i = 0; i < 3; i++) {
      persistData(dataFile, { masterItems: [], kits: [], trips: [], seq: i }, { keep: 1 })
    }
    vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {
      throw new Error('simulated prune failure')
    })
    const doc = { masterItems: [], kits: [], trips: [], marker: 'final' }
    expect(() => persistData(dataFile, doc, { keep: 1 })).not.toThrow()
    const onDisk = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    expect(onDisk).toEqual(doc)
  })
})
