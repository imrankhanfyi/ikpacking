import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { useStore } from '../../store'
import { loadFromServer } from '../../store/sync'
import { SYNC_URL } from '../../constants'
import { toast, toastError } from '../../store/toastStore'
import { useSyncStatusStore } from '../../store/syncStatusStore'
import { buildConnectLink } from '../../lib/connectLink'

export function ApiSettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const [draft, setDraft] = useState(settings.openRouterApiKey)
  const [syncToken, setSyncToken] = useState(settings.syncToken)
  const [syncing, setSyncing] = useState(false)
  const syncStatus = useSyncStatusStore(s => s.status)
  const lastSyncedAt = useSyncStatusStore(s => s.lastSyncedAt)
  const lastError = useSyncStatusStore(s => s.lastError)
  const [showQR, setShowQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const connectLink = settings.syncToken
    ? buildConnectLink(window.location.origin, settings.syncToken)
    : null

  // Regenerate QR whenever the token changes or the QR panel is opened
  const prevLinkRef = useRef<string | null>(null)
  useEffect(() => {
    if (!showQR || !connectLink) {
      if (!connectLink) setQrDataUrl(null)
      return
    }
    if (prevLinkRef.current === connectLink && qrDataUrl) return
    prevLinkRef.current = connectLink
    QRCode.toDataURL(connectLink, { margin: 2, width: 240 })
      .then(url => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null))
  }, [showQR, connectLink])

  async function handleSaveSync() {
    updateSettings({ syncToken })
    setSyncing(true)
    // Test the connection
    try {
      const res = await fetch(`${SYNC_URL}/api/data`, {
        headers: { 'Authorization': `Bearer ${syncToken}` },
      })
      if (res.ok) {
        toast('Sync connected. Loading data from server...')
        await loadFromServer()
      } else {
        toastError('Connection failed — check your token.')
      }
    } catch {
      toastError('Could not reach sync server.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleCopyLink() {
    if (!connectLink) return
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(connectLink)
        toast('Connect link copied')
        return
      } catch {
        // fall through to fallback below
      }
    }
    // Fallback: select the text field so the user can copy manually
    const el = document.getElementById('connect-link-fallback') as HTMLInputElement | null
    el?.select()
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-[#2d2d2d]">OpenRouter API key</h3>
        <p className="text-xs text-[#999]">Used for AI trip generation and pattern learning.</p>
        <input type="password" value={draft} onChange={e => setDraft(e.target.value)} placeholder="sk-or-..." className="w-full bg-white border-[1.5px] border-[#ddd] text-[#2d2d2d] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2d2d2d]" />
        <button onClick={() => updateSettings({ openRouterApiKey: draft })} className="px-4 py-2 bg-[#2d2d2d] text-white rounded text-sm">Save key</button>
        {settings.openRouterApiKey && <p className="text-xs text-[#2a6e4e]">Key saved</p>}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-[#2d2d2d]">Server sync</h3>
        <p className="text-xs text-[#999]">Sync your data across devices. Enter your sync token to connect to {SYNC_URL.replace(/^https?:\/\//, '')}.</p>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[2px] text-[#999]">Sync token</label>
          <input type="password" value={syncToken} onChange={e => setSyncToken(e.target.value)} placeholder="your-sync-token" className="w-full mt-1 bg-white border-[1.5px] border-[#ddd] text-[#2d2d2d] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#2d2d2d]" />
        </div>
        <button onClick={handleSaveSync} disabled={syncing || !syncToken.trim()} className="px-4 py-2 bg-[#2d2d2d] text-white rounded text-sm disabled:opacity-50">
          {syncing ? 'Connecting...' : 'Save & connect'}
        </button>
        {settings.syncToken && <p className="text-xs text-[#2a6e4e]">Sync active</p>}
        {settings.syncToken && syncStatus === 'ok' && lastSyncedAt && (
          <p className="text-xs text-[#2a6e4e]">Last synced ✓ {new Date(lastSyncedAt).toLocaleString()}</p>
        )}
        {settings.syncToken && syncStatus === 'error' && lastError && (
          <p className="text-xs text-[#e05a33]">⚠ {lastError}</p>
        )}

        {/* Connect link + QR — only shown when a token is already saved */}
        {settings.syncToken && connectLink && (
          <div className="mt-2 space-y-3 border-[1.5px] border-[#ddd] rounded p-4">
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-[#999]">Connect another device</p>
            <p className="text-xs text-[#999]">Share this link or QR code to connect a new device without typing the token.</p>

            {/* Clipboard button + fallback text field */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-2 bg-[#2d2d2d] text-white rounded text-sm text-left"
              >
                Copy connect link
              </button>
              {/* Shown as a selectable fallback when clipboard API is unavailable */}
              <input
                id="connect-link-fallback"
                type="text"
                readOnly
                value={connectLink}
                className="w-full bg-white border-[1.5px] border-[#ddd] text-[#999] rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#2d2d2d] select-all"
                onClick={e => (e.target as HTMLInputElement).select()}
                aria-label="Connect link (tap to select)"
              />
            </div>

            {/* QR toggle */}
            <button
              onClick={() => setShowQR(v => !v)}
              className="px-4 py-2 border-[1.5px] border-[#ddd] text-[#2d2d2d] rounded text-sm"
            >
              {showQR ? 'Hide QR' : 'Show QR'}
            </button>

            {showQR && (
              <div className="flex flex-col items-center gap-2 pt-2">
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="Connect QR code" width={240} height={240} className="rounded border-[1.5px] border-[#ddd]" />
                  : <p className="text-xs text-[#999]">Generating QR…</p>
                }
                <p className="text-xs text-[#999]">Scan on your other device to connect.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
