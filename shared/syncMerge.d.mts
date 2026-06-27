// Type declarations for syncMerge.mjs (the client imports the .mjs; the server
// runs it raw). Generic over any record carrying the sync fields.

export interface SyncRecord {
  id: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncData {
  masterItems: unknown[]
  kits: unknown[]
  trips: unknown[]
}

export function canonicalJSON(value: unknown): string

export function pickWinner<T extends SyncRecord>(a: T, b: T): T

export function mergeRecords<T extends SyncRecord>(base: T[], incoming: T[]): T[]

export function mergeTrips<T extends SyncRecord>(base: T[], incoming: T[]): T[]

export function mergeData<T extends SyncData>(
  base: Partial<T> | null | undefined,
  incoming: Partial<T> | null | undefined,
): { masterItems: T['masterItems']; kits: T['kits']; trips: T['trips'] }

export function liveOnly<T extends SyncRecord>(records: T[]): T[]
