import { useState, useRef, useCallback, useEffect } from 'react'
import { MessageCircle, Tv2, FileText, Play, Square, Trash2, RefreshCw, Link, Pencil, Plus, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useStudioCtx } from './StudioContext'
import { http } from '../../lib/http'
import { apiConfig } from '../../lib/apiConfig'
import { TELEPROMPTER_WS_URL, YT_CLIENT_ID, YT_CLIENT_SECRET, YT_SCOPE, GOOGLE_SHEETS_API_KEY } from '../../lib/studioConfig'
import { getStorage, setStorage } from '../../lib/storage'
import { openAuthPopup, attachPopupListener, checkYtTokenHealth } from '../../lib/socialAuthService'
import type { UserData } from '../../types/user'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Select, SelectItem } from '../../components/ui/Select'
import { Toaster } from '../../components/ui/Toast'

type SocialTab = 'whatsapp' | 'youtube' | 'teleprompter'

// ── Shared ────────────────────────────────────────────────────────────────────

const inputCls = 'flex-1 min-w-0 bg-surface border border-primary-border rounded-lg px-2.5 py-1.5 text-[11px] text-primary-text placeholder-secondary-text outline-none focus:border-[#3031cb]/40 transition-colors'
const loadBtnCls = 'px-2.5 py-1.5 rounded-lg bg-surface-2 border border-primary-border text-[10px] text-secondary-text hover:text-primary-text hover:bg-surface cursor-pointer transition-colors flex items-center gap-1 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed'

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn('w-7 h-4 rounded-full relative transition-colors shrink-0', disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer', on ? 'bg-[#3031cb]' : 'bg-surface-2')}
    >
      <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-surface transition-[left] duration-200', on ? 'left-3.5' : 'left-0.5')} />
    </button>
  )
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────

interface WaMessage { id: string; phNo: string; time: string; msg: string }

function randomId(): string {
  return Math.random().toString(36).slice(2, 12)
}

const WA_SVG_HTML =
  '<svg width="100px" height="100px" viewBox="-2.73 0 1225.016 1225.016" xmlns="http://www.w3.org/2000/svg">' +
  '<path fill="#E0E0E0" d="M1041.858 178.02C927.206 63.289 774.753.07 612.325 0 277.617 0 5.232 272.298 5.098 606.991c-.039 106.986 27.915 211.42 81.048 303.476L0 1225.016l321.898-84.406c88.689 48.368 188.547 73.855 290.166 73.896h.258c334.654 0 607.08-272.346 607.222-607.023.056-162.208-63.052-314.724-177.688-429.463z"/>' +
  '<path fill="#25D366" d="M27.875 1190.114l82.211-300.18c-50.719-87.852-77.391-187.523-77.359-289.602.133-319.398 260.078-579.25 579.469-579.25 155.016.07 300.508 60.398 409.898 169.891 109.414 109.492 169.633 255.031 169.57 409.812-.133 319.406-260.094 579.281-579.445 579.281h-.258c-96.977-.031-192.266-24.375-276.898-70.5l-307.188 80.548z"/>' +
  '<path fill-rule="evenodd" clip-rule="evenodd" fill="#FFF" d="M462.273 349.294c-11.234-24.977-23.062-25.477-33.75-25.914-8.742-.375-18.75-.352-28.742-.352-10 0-26.25 3.758-39.992 18.766-13.75 15.008-52.5 51.289-52.5 125.078 0 73.797 53.75 145.102 61.242 155.117 7.5 10 103.758 166.266 256.203 226.383 126.695 49.961 152.477 40.023 179.977 37.523s88.734-36.273 101.234-71.297c12.5-35.016 12.5-65.031 8.75-71.305-3.75-6.25-13.75-10-28.75-17.5s-88.734-43.789-102.484-48.789-23.75-7.5-33.75 7.516c-10 15-38.727 48.773-47.477 58.773-8.75 10.023-17.5 11.273-32.5 3.773-15-7.523-63.305-23.344-120.609-74.438-44.586-39.75-74.688-88.844-83.438-103.859-8.75-15-.938-23.125 6.586-30.602 6.734-6.719 15-17.508 22.5-26.266 7.484-8.758 9.984-15.008 14.984-25.008 5-10.016 2.5-18.773-1.25-26.273s-32.898-81.67-46.234-111.326z"/>' +
  '</svg>'

function buildNewsValue(message: WaMessage, includeIcon: boolean): string {
  if (includeIcon) {
    return '<div class="svg-div">' + WA_SVG_HTML + '</div>&nbsp;<span>' + message.msg + '</span>'
  }
  return '<span>' + message.msg + '</span>'
}

function epochToDateTime(epoch: string): string {
  if (!epoch) return ''
  const ms = Number(epoch) * 1000
  if (!isFinite(ms) || ms === 0) return epoch
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function WaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-2.73 0 1225.016 1225.016" xmlns="http://www.w3.org/2000/svg">
      <path fill="#E0E0E0" d="M1041.858 178.02C927.206 63.289 774.753.07 612.325 0 277.617 0 5.232 272.298 5.098 606.991c-.039 106.986 27.915 211.42 81.048 303.476L0 1225.016l321.898-84.406c88.689 48.368 188.547 73.855 290.166 73.896h.258c334.654 0 607.08-272.346 607.222-607.023.056-162.208-63.052-314.724-177.688-429.463z" />
      <path fill="#25D366" d="M27.875 1190.114l82.211-300.18c-50.719-87.852-77.391-187.523-77.359-289.602.133-319.398 260.078-579.25 579.469-579.25 155.016.07 300.508 60.398 409.898 169.891 109.414 109.492 169.633 255.031 169.57 409.812-.133 319.406-260.094 579.281-579.445 579.281h-.258c-96.977-.031-192.266-24.375-276.898-70.5l-307.188 80.548z" />
      <path fill="#FFF" fillRule="evenodd" clipRule="evenodd" d="M462.273 349.294c-11.234-24.977-23.062-25.477-33.75-25.914-8.742-.375-18.75-.352-28.742-.352-10 0-26.25 3.758-39.992 18.766-13.75 15.008-52.5 51.289-52.5 125.078 0 73.797 53.75 145.102 61.242 155.117 7.5 10 103.758 166.266 256.203 226.383 126.695 49.961 152.477 40.023 179.977 37.523s88.734-36.273 101.234-71.297c12.5-35.016 12.5-65.031 8.75-71.305-3.75-6.25-13.75-10-28.75-17.5s-88.734-43.789-102.484-48.789-23.75-7.5-33.75 7.516c-10 15-38.727 48.773-47.477 58.773-8.75 10.023-17.5 11.273-32.5 3.773-15-7.523-63.305-23.344-120.609-74.438-44.586-39.75-74.688-88.844-83.438-103.859-8.75-15-.938-23.125 6.586-30.602 6.734-6.719 15-17.508 22.5-26.266 7.484-8.758 9.984-15.008 14.984-25.008 5-10.016 2.5-18.773-1.25-26.273s-32.898-81.67-46.234-111.326z" />
    </svg>
  )
}

function WhatsAppPanel() {
  const { cid, channel, addLog, sendWs, toggleGfxBand } = useStudioCtx()
  const [sheetId, setSheetId] = useState('1OejdYRWMKQzZvghptGui-2x4aSXtqJdyhZZ8yYucV1Q')
  const gid = '0'
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showIcon, setShowIcon] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (!sheetId.trim()) return
    setBusy(true)
    try {
      const sheet = cid === '218' ? 'Sheet2' : 'Sheet1'
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheet}!A1:G?key=${GOOGLE_SHEETS_API_KEY}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { values?: string[][] }
      const rows = data.values ?? []
      setMessages(rows.map(r => ({
        id: randomId(),
        phNo: r[0] ?? '',
        time: r[6] ?? epochToDateTime(r[4] ?? ''),
        msg: `${r[1] ?? ''} - ${r[3] ?? ''}`,
      })))
      setSelectedIndex(null)
      addLog(`WhatsApp: ${rows.length} messages loaded`, 'info')
    } catch (e) { addLog(`WhatsApp load error: ${(e as Error).message}`, 'err') }
    finally { setBusy(false) }
  }, [sheetId, cid, addLog])

  const toggle = useCallback((i: number) => {
    const turningOn = selectedIndex !== i
    // Only send p_bottomNews when turning ON. Sending it on toggle-off would
    // clear the viewer's #bottom-news container (removeNews + disabled:false filter),
    // leaving the lower band empty the next time it is enabled from GfxPanel.
    if (turningOn) {
      const message = messages[i]
      const newsValue = buildNewsValue(message, showIcon)
      sendWs({
        Type: 'p_bottomNews',
        channel,
        bottomNews: [{ id: message.id, news_value: newsValue, disabled: true }],
        displayStyle: true,
        template_type: 'template1',
        methodType: 'preview',
        source: 'whatsapp',
      })
    }
    // Skip content re-send on turn-ON: we already sent our own p_bottomNews above.
    // Otherwise toggleGfxBand would re-send the cached GFX editor content and overwrite our social message.
    void toggleGfxBand('lower_band', turningOn, turningOn)
    setSelectedIndex(turningOn ? i : null)
  }, [selectedIndex, messages, showIcon, channel, sendWs, toggleGfxBand])

  // Re-send p_bottomNews when the icon toggle flips while a message is active,
  // so the viewer's news_value updates live without re-selecting the row.
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    if (selectedIndex === null) return
    const message = messages[selectedIndex]
    sendWs({
      Type: 'p_bottomNews',
      channel,
      bottomNews: [{ id: message.id, news_value: buildNewsValue(message, showIcon), disabled: true }],
      displayStyle: true,
      template_type: 'template1',
      methodType: 'preview',
      source: 'whatsapp',
    })
  }, [showIcon]) // eslint-disable-line react-hooks/exhaustive-deps

  const confirmDelete = useCallback(async () => {
    if (confirmIdx === null) return
    const i = confirmIdx
    try {
      await http.post(apiConfig.dotnetApiBase, 'v1/gateway/delete/google-sheet-data', { sheetId, rowId: i, gid })
      setMessages(prev => prev.filter((_, j) => j !== i))
      setSelectedIndex(prev => prev === i ? null : prev !== null && prev > i ? prev - 1 : prev)
      addLog(`WhatsApp: row ${i + 1} deleted`, 'info')
    } catch (e) { addLog(`WhatsApp delete error: ${(e as Error).message}`, 'err') }
  }, [confirmIdx, sheetId, gid, addLog])

  return (
    <div className="flex flex-col gap-2 p-2 h-full">
      {/* Sheet ID + GID + Load */}
      <div className="flex gap-1.5 items-center">
        <input value={sheetId} onChange={e => setSheetId(e.target.value)} placeholder="Google Sheet ID" className={inputCls} />
        <button type="button" onClick={load} disabled={busy || !sheetId.trim()} className={loadBtnCls}>
          <RefreshCw size={9} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Loading…' : 'Load'}
        </button>
      </div>

      {/* WhatsApp icon toggle */}
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-primary-border bg-surface-2">
        <WaIcon className="shrink-0 w-4 h-4" />
        <span className="text-[10px] text-secondary-text flex-1">Show WhatsApp icon</span>
        <span className={cn('text-[9px] font-bold', showIcon ? 'text-emerald-500' : 'text-secondary-text')}>{showIcon ? 'ON' : 'OFF'}</span>
        <Toggle on={showIcon} onToggle={() => setShowIcon(v => !v)} />
      </div>

      <div className="flex flex-col flex-1 min-h-0">
      {messages.length === 0
        ? <p className="text-center text-[10px] text-secondary-text py-6">Enter a Sheet ID and click Load.</p>
        : <>
            {/* Header */}
            <div className="grid grid-cols-[20px_85px_1fr_52px] gap-1 px-2 text-[9px] text-secondary-text font-semibold">
              <span>#</span><span>Phone</span><span>Message</span><span className="text-center">Action</span>
            </div>
            <div className="flex flex-col gap-0.5 overflow-y-auto flex-1 min-h-0">
              {messages.map((m, i) => {
                const active = selectedIndex === i
                return (
                  <div key={i} className={cn('grid grid-cols-[20px_85px_1fr_52px] gap-1 items-start px-2 py-1.5 rounded-lg border text-[10px] transition-colors', active ? 'border-emerald-500/25 bg-emerald-50/50' : 'border-primary-border bg-surface-2')}>
                    <span className="text-secondary-text font-mono text-[9px] pt-0.5">{i + 1}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-primary-text font-mono truncate text-[9px]">{m.phNo}</span>
                      <span className="text-secondary-text text-[8px] mt-0.5 leading-tight">{m.time}</span>
                    </div>
                    <div className="flex items-start gap-1 min-w-0">
                      {showIcon && active && <WaIcon className="shrink-0 w-3 h-3 mt-0.5" />}
                      <span className="text-primary-text wrap-break-word leading-relaxed line-clamp-2 text-[9px]" title={m.msg}>{m.msg}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Toggle on={active} onToggle={() => toggle(i)} />
                      <button type="button" onClick={() => setConfirmIdx(i)} className="text-secondary-text hover:text-[#3031cb] cursor-pointer transition-colors shrink-0">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
      }
      </div>

      <ConfirmDialog
        open={confirmIdx !== null}
        onOpenChange={open => { if (!open) setConfirmIdx(null) }}
        title="Delete message?"
        description="This will remove the row from the Google Sheet. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </div>
  )
}

// ── YouTube ───────────────────────────────────────────────────────────────────

interface YtMessage { id: string; publishedAt: string; msg: string }

const YT_SVG_HTML =
  '<svg width="100px" height="100px" viewBox="0 -7 48 48" xmlns="http://www.w3.org/2000/svg">' +
  '<g fill="none" fill-rule="evenodd">' +
  '<g transform="translate(-200 -368)" fill="#CE1312">' +
  '<path d="M219.044 391.27l-.001-13.582 12.969 6.814-12.968 6.768zM247.52 375.334s-.47-3.331-1.908-4.798c-1.826-1.926-3.872-1.935-4.809-2.047C234.086 368 224.011 368 224.011 368h-.022S213.914 368 207.197 368.49c-.939.112-2.983.121-4.81 2.047-1.438 1.467-1.907 4.798-1.907 4.798S200 379.247 200 383.158v3.668c0 3.912.48 7.823.48 7.823s.469 3.33 1.907 4.798c1.827 1.926 4.226 1.866 5.294 2.067C211.52 401.885 224 402 224 402s10.086-.015 16.803-.505c.937-.113 2.983-.122 4.809-2.048 1.438-1.467 1.908-4.798 1.908-4.798S248 390.738 248 386.826v-3.668c0-3.91-.48-7.824-.48-7.824z"/>' +
  '</g>' +
  '</g>' +
  '</svg>'

function buildYtNewsValue(message: YtMessage, includeIcon: boolean): string {
  if (includeIcon) {
    return '<div class="svg-div">' + YT_SVG_HTML + '</div>&nbsp;<span>' + message.msg + '</span>'
  }
  return '<span>' + message.msg + '</span>'
}
interface YtTokens { refreshToken?: string; accessToken?: string; ID?: number; chId?: string | number }

function convertToIST(utcTime: string): string {
  const date = new Date(utcTime)
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(date.getTime() + istOffset).toISOString().replace(/T|\.(\d{3})Z/g, ' ').trim()
}

function getYtUser() {
  const u = getStorage<UserData>('pcr_user')
  return { id: u?.id ?? 0, name: [u?.firstname, u?.lastname].filter(Boolean).join(' ') || 'user' }
}

function YtIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 -7 48 48" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <g transform="translate(-200 -368)" fill="#CE1312">
          <path d="M219.044 391.27l-.001-13.582 12.969 6.814-12.968 6.768zM247.52 375.334s-.47-3.331-1.908-4.798c-1.826-1.926-3.872-1.935-4.809-2.047C234.086 368 224.011 368 224.011 368h-.022S213.914 368 207.197 368.49c-.939.112-2.983.121-4.81 2.047-1.438 1.467-1.907 4.798-1.907 4.798S200 379.247 200 383.158v3.668c0 3.912.48 7.823.48 7.823s.469 3.33 1.907 4.798c1.827 1.926 4.226 1.866 5.294 2.067C211.52 401.885 224 402 224 402s10.086-.015 16.803-.505c.937-.113 2.983-.122 4.809-2.048 1.438-1.467 1.908-4.798 1.908-4.798S248 390.738 248 386.826v-3.668c0-3.91-.48-7.824-.48-7.824z" />
        </g>
      </g>
    </svg>
  )
}

// Ensures token health is checked only on the first YouTube tab open per page load
let ytTabHealthChecked = false

function YoutubePanel() {
  const { cid, channel, addLog, sendWs, toggleGfxBand } = useStudioCtx()
  const [videoId, setVideoId] = useState(() => getStorage<string>('yt_video_id') ?? '')
  const [ytTokens, setYtTokens] = useState<YtTokens>(() => getStorage<YtTokens>('yt_tokens') ?? {})
  const [messages, setMessages] = useState<YtMessage[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showIcon, setShowIcon] = useState(false)
  const [busy, setBusy] = useState(false)
  const [accountSuspended, setAccountSuspended] = useState(false)
  const [suspendedToastOpen, setSuspendedToastOpen] = useState(false)
  const [noActiveLiveChat, setNoActiveLiveChat] = useState(false)

  const ytRedirectUri = `${window.location.origin}/silent-refresh.html`

  // Ref so loadChatMessages / refreshAccessToken can call openGoogleAuth without a circular dep
  const openGoogleAuthRef = useRef<() => void>(() => {})

  const saveTokensToBackend = useCallback(async (tokens: YtTokens) => {
    const user = getYtUser()
    const timestamp = Math.floor(Date.now() / 1000)
    try {
      await http.post(apiConfig.dotnetApiBase, 'v1/gateway/add-ytmetadata', {
        cid, userName: user.name,
        ytChannelId: `${channel}-${cid}`, channelName: channel,
        userId: user.id, refreshToken: tokens.refreshToken ?? '',
        accessToken: tokens.accessToken ?? '', remarks: '',
        createdDate: timestamp, modifiedDate: timestamp,
        createdBy: user.id, modifiedBy: user.id,
      })
    } catch (e) { addLog(`YouTube token save error: ${(e as Error).message}`, 'err') }
  }, [cid, channel, addLog])

  const loadChatMessages = useCallback(async (token: string) => {
    try {
      const vidRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(r => r.json()) as { items?: Array<{ liveStreamingDetails?: { activeLiveChatId?: string } }>; error?: { errors?: Array<{ message?: string; reason?: string }> } }

      if (vidRes.error?.errors?.[0]?.message === 'Invalid Credentials') { throw new Error('token_expired') }
      if (vidRes.error?.errors?.[0]?.reason === 'authenticatedUserAccountSuspended') {
        setAccountSuspended(true)
        setSuspendedToastOpen(true)
        addLog('YouTube: account is suspended — please contact Google support', 'err')
        return
      }
      setAccountSuspended(false)
      const chatId = vidRes.items?.[0]?.liveStreamingDetails?.activeLiveChatId
      if (!chatId) { setNoActiveLiveChat(true); addLog('YouTube: no active live chat for this video', 'warn'); return }
      setNoActiveLiveChat(false)

      const chatRes = await fetch(
        `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${chatId}&part=snippet,authorDetails`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(r => r.json()) as { items?: Array<Record<string, Record<string, string>>> }

      setMessages((chatRes.items ?? []).map(item => ({
        id: randomId(),
        publishedAt: convertToIST(item.snippet.publishedAt),
        msg: `${item.authorDetails.displayName} - ${item.snippet.displayMessage}`,
      })))
      setSelectedIndex(null)
      addLog(`YouTube: ${chatRes.items?.length ?? 0} messages loaded`, 'info')
    } catch (e) {
      if ((e as Error).message === 'token_expired') throw e
      addLog(`YouTube chat error: ${(e as Error).message}`, 'err')
    }
  }, [videoId, addLog])

  const refreshAccessToken = useCallback(async (refreshToken: string): Promise<string | null> => {
    try {
      const body = new URLSearchParams({
        refresh_token: refreshToken, client_id: YT_CLIENT_ID,
        client_secret: YT_CLIENT_SECRET, grant_type: 'refresh_token',
      })
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
      })
      const data = await res.json() as { access_token?: string; error?: string }
      if (data.error === 'invalid_grant') { openGoogleAuthRef.current(); return null }
      return data.access_token ?? null
    } catch { return null }
  }, [])

  const openGoogleAuth = useCallback(() => {
    const params = new URLSearchParams({
      scope: YT_SCOPE, access_type: 'offline',
      include_granted_scopes: 'true', response_type: 'code',
      redirect_uri: ytRedirectUri, client_id: YT_CLIENT_ID,
      prompt: 'select_account',
    })
    const popup = openAuthPopup(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
    if (!popup) { addLog('YouTube: popup was blocked', 'warn'); return }
    attachPopupListener(popup, async (urlParams) => {
      const code = urlParams.get('code')
      if (!code) return
      try {
        const body = new URLSearchParams({
          code: decodeURIComponent(code), redirect_uri: ytRedirectUri,
          client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET, grant_type: 'authorization_code',
        })
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
        })
        const data = await res.json() as { refresh_token?: string; access_token?: string }
        const stored = getStorage<YtTokens>('yt_tokens') ?? {}
        const updated: YtTokens = {
          ...stored,
          ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
          ...(data.access_token ? { accessToken: data.access_token } : {}),
        }
        setYtTokens(updated)
        setStorage('yt_tokens', updated)
        await saveTokensToBackend(updated)
        if (data.access_token) await loadChatMessages(data.access_token)
      } catch (e) { addLog(`YouTube auth error: ${(e as Error).message}`, 'err') }
    }, () => {})
  }, [ytRedirectUri, saveTokensToBackend, loadChatMessages, addLog])

  // Keep ref in sync so loadChatMessages / refreshAccessToken can call without circular dep
  useEffect(() => { openGoogleAuthRef.current = openGoogleAuth }, [openGoogleAuth])

  // On mount: fetch stored tokens from backend
  useEffect(() => {
    const user = getYtUser()
    if (user.id) {
      http.get<{ summary?: { id: number }; data?: YtTokens[] }>(
        apiConfig.dotnetApiBase, `v1/gateway/get/ytmetadata/by/user?id=${user.id}`
      ).then(res => {
        if (res.summary?.id === 1 && res.data) {
          const found = res.data.find(e => String(e.chId) === String(cid))
          if (found) { setYtTokens(found); setStorage('yt_tokens', found) }
        }
      }).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // On first YouTube tab open only: verify stored token is still valid with Google
  useEffect(() => {
    if (ytTabHealthChecked) return
    const { refreshToken, accessToken } = ytTokens
    if (!refreshToken && !accessToken) return

    ytTabHealthChecked = true

    async function runHealthCheck() {
      try {
        if (refreshToken) {
          const body = new URLSearchParams({
            refresh_token: refreshToken, client_id: YT_CLIENT_ID,
            client_secret: YT_CLIENT_SECRET, grant_type: 'refresh_token',
          })
          const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
          })
          const data = await res.json() as { access_token?: string; error?: string }
          if (data.error || !data.access_token) {
            const empty: YtTokens = {}
            setYtTokens(empty)
            setStorage('yt_tokens', empty)
            addLog('YouTube: stored token has expired — please reconnect', 'warn')
          } else {
            const updated: YtTokens = { refreshToken, accessToken: data.access_token }
            setYtTokens(updated)
            setStorage('yt_tokens', updated)
          }
        } else if (accessToken) {
          const ok = await checkYtTokenHealth(accessToken)
          if (!ok) {
            const empty: YtTokens = {}
            setYtTokens(empty)
            setStorage('yt_tokens', empty)
            addLog('YouTube: stored token has expired — please reconnect', 'warn')
          }
        }
      } catch { /* ignore transient network errors */ }
    }

    void runHealthCheck()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (!videoId.trim()) return
    setStorage('yt_video_id', videoId)
    setBusy(true)
    try {
      if (ytTokens.accessToken) {
        try {
          await loadChatMessages(ytTokens.accessToken)
        } catch (e) {
          if ((e as Error).message !== 'token_expired') throw e
          // Access token expired — silently refresh and retry
          if (ytTokens.refreshToken) {
            const newToken = await refreshAccessToken(ytTokens.refreshToken)
            if (newToken) await loadChatMessages(newToken)
          } else {
            openGoogleAuth()
          }
        }
      } else if (ytTokens.refreshToken) {
        const token = await refreshAccessToken(ytTokens.refreshToken)
        if (token) await loadChatMessages(token)
      } else {
        openGoogleAuth()
      }
    } finally { setBusy(false) }
  }, [videoId, ytTokens, refreshAccessToken, loadChatMessages, openGoogleAuth])

  const toggle = useCallback((i: number) => {
    const turningOn = selectedIndex !== i
    // Only send p_bottomNews when turning ON. Sending it on toggle-off would
    // clear the viewer's #bottom-news container (removeNews + disabled:false filter),
    // leaving the lower band empty the next time it is enabled from GfxPanel.
    if (turningOn) {
      const message = messages[i]
      const newsValue = buildYtNewsValue(message, showIcon)
      sendWs({
        Type: 'p_bottomNews',
        channel,
        bottomNews: [{ id: message.id, news_value: newsValue, disabled: true }],
        displayStyle: true,
        template_type: 'template1',
        methodType: 'preview',
        source: 'youtube',
      })
    }
    // Skip content re-send on turn-ON: we already sent our own p_bottomNews above.
    // Otherwise toggleGfxBand would re-send the cached GFX editor content and overwrite our social message.
    void toggleGfxBand('lower_band', turningOn, turningOn)
    setSelectedIndex(turningOn ? i : null)
  }, [selectedIndex, messages, showIcon, channel, sendWs, toggleGfxBand])

  // Re-send p_bottomNews when the icon toggle flips while a message is active,
  // so the viewer's news_value updates live without re-selecting the row.
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    if (selectedIndex === null) return
    const message = messages[selectedIndex]
    sendWs({
      Type: 'p_bottomNews',
      channel,
      bottomNews: [{ id: message.id, news_value: buildYtNewsValue(message, showIcon), disabled: true }],
      displayStyle: true,
      template_type: 'template1',
      methodType: 'preview',
      source: 'youtube',
    })
  }, [showIcon]) // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = useCallback(() => {
    const empty: YtTokens = {}
    setYtTokens(empty); setStorage('yt_tokens', empty); setMessages([]); setSelectedIndex(null); setAccountSuspended(false); setNoActiveLiveChat(false)
  }, [])

  const isConnected = !!(ytTokens.refreshToken || ytTokens.accessToken)

  return (
    <div className="flex flex-col gap-2 p-2 h-full">
      {/* Connection status */}
      <div className={cn('flex items-center gap-2 px-2 py-1 rounded-lg border text-[9px]', isConnected ? 'border-emerald-500/20 bg-emerald-50/50 text-emerald-600' : 'border-primary-border bg-surface-2 text-secondary-text')}>
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isConnected ? 'bg-emerald-500' : 'bg-secondary-text')} />
        <span className="flex-1">{isConnected ? 'YouTube connected' : 'Not connected'}</span>
        {isConnected
          ? <button type="button" onClick={disconnect} className="text-secondary-text hover:text-[#3031cb] cursor-pointer transition-colors">Disconnect</button>
          : <button type="button" onClick={openGoogleAuth} className="flex items-center gap-1 text-secondary-text hover:text-primary-text cursor-pointer transition-colors"><Link size={9} />Connect</button>
        }
      </div>

      {/* Suspended account error banner */}
      {accountSuspended && (
        <div id="studio-social-yt-suspended-banner" className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-red-900/20 border border-red-500/20">
          <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-semibold text-red-300">YouTube Account Suspended</p>
            <p className="text-[9px] text-red-300/70 leading-relaxed">
              This YouTube account has been suspended. Please contact Google support to resolve the issue.
            </p>
          </div>
        </div>
      )}

      {/* Video ID + Load */}
      <div id="studio-social-yt-video-input-row" className="flex gap-1.5 items-center">
        <input id="studio-social-yt-video-id-input" value={videoId} onChange={e => { setVideoId(e.target.value); setNoActiveLiveChat(false) }} placeholder="YouTube Video ID / Live Stream ID" className={inputCls} />
        <button id="studio-social-yt-btn-load" type="button" onClick={load} disabled={busy || !videoId.trim() || accountSuspended} className={loadBtnCls}>
          <RefreshCw size={9} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Loading…' : 'Load'}
        </button>
      </div>

      {/* YouTube icon toggle */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-primary-border bg-surface-2">
        <YtIcon className="shrink-0 w-4 h-4" />
        <span className="text-[10px] text-secondary-text flex-1">Show YouTube icon</span>
        <span className={cn('text-[9px] font-bold', showIcon ? 'text-red-500' : 'text-secondary-text', accountSuspended && 'opacity-35')}>{showIcon ? 'ON' : 'OFF'}</span>
        <Toggle on={showIcon} onToggle={() => setShowIcon(v => !v)} disabled={accountSuspended} />
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        {messages.length === 0
          ? noActiveLiveChat
            ? (
              <div id="studio-social-yt-no-live-chat-msg" className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber-900/20 border border-amber-500/20">
                <AlertCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-semibold text-amber-300">No active live chat</p>
                  <p className="text-[9px] text-amber-300/70 leading-relaxed">
                    This video has no active live chat. The stream may not be live yet, or it has already ended.
                  </p>
                </div>
              </div>
            )
            : <p className="text-center text-[10px] text-secondary-text py-6">{isConnected ? 'Enter a Video ID and click Load.' : 'Connect your YouTube account first.'}</p>
          : <>
              {/* Header */}
              <div className="grid grid-cols-[20px_60px_1fr_36px] gap-1 px-2 text-[9px] text-secondary-text font-semibold">
                <span>#</span><span>Time (IST)</span><span>Message</span><span className="text-center">On</span>
              </div>
              <div className="flex flex-col gap-0.5 overflow-y-auto flex-1 min-h-0">
                {messages.map((m, i) => {
                  const active = selectedIndex === i
                  return (
                    <div key={i} className={cn('grid grid-cols-[20px_60px_1fr_36px] gap-1 items-start px-2 py-1.5 rounded-lg border text-[10px] transition-colors', active ? 'border-red-500/25 bg-red-50/50' : 'border-primary-border bg-surface-2')}>
                      <span className="text-secondary-text font-mono text-[9px] pt-0.5">{i + 1}</span>
                      <span className="text-secondary-text text-[8px] font-mono leading-tight pt-0.5">{m.publishedAt.slice(11)}</span>
                      <div className="flex items-start gap-1 min-w-0">
                        {showIcon && active && <YtIcon className="shrink-0 w-3 h-3 mt-0.5" />}
                        <span className="text-primary-text wrap-break-word leading-relaxed line-clamp-2 text-[9px]" title={m.msg}>{m.msg}</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <Toggle on={active} onToggle={() => toggle(i)} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
        }
      </div>

      <Toaster
        id="studio-social-yt-suspended-toast"
        open={suspendedToastOpen}
        onOpenChange={setSuspendedToastOpen}
        title="YouTube Account Suspended"
        description="This YouTube account has been suspended. Please contact Google support."
        variant="error"
      />
    </div>
  )
}

// ── Teleprompter ──────────────────────────────────────────────────────────────

type TpLayoutType = 'clear' | 'lc_tp' | 'tp_only' | 'lc_only'

const TP_LAYOUT_BUTTONS: Array<{ layoutType: TpLayoutType; label: string }> = [
  { layoutType: 'clear',   label: 'Clear'    },
  { layoutType: 'lc_tp',  label: 'LC + TP'  },
  { layoutType: 'tp_only', label: 'Only TP'  },
  { layoutType: 'lc_only', label: 'Only LC'  },
]

interface TpRundown { id: number; newsTitle: string; onAirDate?: string; onAirTime?: string }
interface TpScript { Sno: number; TpScriptMaster_Id: number; scriptTitle: string; scriptDetails: string; creationTime: string }

function TeleprompterPanel() {
  const { cid, addLog, webrtcSources, channel } = useStudioCtx()
  const [rundowns, setRundowns] = useState<TpRundown[]>([])
  const [selectedRd, setSelectedRd] = useState<TpRundown | null>(null)
  const [scripts, setScripts] = useState<TpScript[]>([])
  const [playingSno, setPlayingSno] = useState<number | null>(null)
  const [rdBusy, setRdBusy] = useState(true)
  const [scriptsBusy, setScriptsBusy] = useState(false)
  const [showRdForm, setShowRdForm] = useState(false)
  const [newRd, setNewRd] = useState({ newsTitle: '', onAirDate: '', onAirTime: '' })
  const [savingRd, setSavingRd] = useState(false)
  const [scriptForm, setScriptForm] = useState<{ mode: 'add' | 'edit'; sno?: number; title: string; story: string } | null>(null)
  const [savingScript, setSavingScript] = useState(false)
  const [confirmSno, setConfirmSno] = useState<number | null>(null)
  const [errorToast, setErrorToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const layoutWsRef = useRef<WebSocket | null>(null)
  const layoutWsHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const layoutWsReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLayoutWsMountedRef = useRef(false)

  // ── Anchor layout control ──────────────────────────────────────
  const eventId = getStorage<string>('studio_event_id') ?? ''
  const anchorLayoutStorageKey = `tp_anchor_layouts_${cid}_${eventId}`
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null)
  const [anchorLayoutMap, setAnchorLayoutMap] = useState<Record<string, TpLayoutType>>(
    () => getStorage<Record<string, TpLayoutType>>(anchorLayoutStorageKey) ?? {},
  )

  const sendLayoutPacket = useCallback((participantId: string, layoutType: TpLayoutType) => {
    const ws = layoutWsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ requestType: 'layout_control', room: channel, userId: participantId, layoutType }))
      addLog(`TP layout: ${participantId} → ${layoutType}`, 'info')
    } else {
      addLog('TP layout WS not connected', 'warn')
    }
  }, [channel, addLog])

  const handleLayoutSelect = useCallback((layoutType: TpLayoutType) => {
    if (!selectedAnchorId) return
    const updatedMap = { ...anchorLayoutMap, [selectedAnchorId]: layoutType }
    setAnchorLayoutMap(updatedMap)
    setStorage(anchorLayoutStorageKey, updatedMap)
    sendLayoutPacket(selectedAnchorId, layoutType)
  }, [selectedAnchorId, anchorLayoutMap, anchorLayoutStorageKey, sendLayoutPacket])

  // Keep-alive layout WS: connect on mount, heartbeat every 40s, reconnect on close, clear on unmount
  useEffect(() => {
    isLayoutWsMountedRef.current = true
    const userEmail = getStorage<UserData>('pcr_user')?.emailAddress ?? ''

    function connectLayoutWs() {
      if (!isLayoutWsMountedRef.current) return
      const ws = new WebSocket(TELEPROMPTER_WS_URL)
      layoutWsRef.current = ws

      ws.onopen = () => {
        if (layoutWsHeartbeatRef.current) clearInterval(layoutWsHeartbeatRef.current)
        layoutWsHeartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'GetHeartBeat', id: crypto.randomUUID(), uid: userEmail, cid, data: '' }))
          }
        }, 40_000)
      }

      ws.onclose = () => {
        if (layoutWsHeartbeatRef.current) { clearInterval(layoutWsHeartbeatRef.current); layoutWsHeartbeatRef.current = null }
        if (isLayoutWsMountedRef.current) layoutWsReconnectRef.current = setTimeout(connectLayoutWs, 3000)
      }
    }

    connectLayoutWs()

    return () => {
      isLayoutWsMountedRef.current = false
      if (layoutWsHeartbeatRef.current) { clearInterval(layoutWsHeartbeatRef.current); layoutWsHeartbeatRef.current = null }
      if (layoutWsReconnectRef.current) { clearTimeout(layoutWsReconnectRef.current); layoutWsReconnectRef.current = null }
      const saved = getStorage<Record<string, TpLayoutType>>(anchorLayoutStorageKey) ?? {}
      const ws = layoutWsRef.current
      if (ws?.readyState === WebSocket.OPEN) {
        Object.entries(saved).forEach(([participantId, layoutType]) => {
          if (layoutType !== 'clear') {
            ws.send(JSON.stringify({ requestType: 'layout_control', room: channel, userId: participantId, layoutType: 'clear' }))
          }
        })
      }
      ws?.close()
      layoutWsRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const userId = getStorage<UserData>('pcr_user')?.id ?? 0

  const loadRundowns = useCallback(async () => {
    setRdBusy(true)
    try {
      const res = await http.get<{ code?: number; data?: TpRundown[] }>(apiConfig.dotnetApiBase, `v1/Producer/get-script/${cid}`)
      const list = res.data ?? []
      setRundowns(list)
      const storedRd = getStorage<TpRundown>('selectedRd')
      if (storedRd) {
        const found = list.find(r => r.id === storedRd.id)
        if (found) setSelectedRd(found)
      }
    } catch (e) { addLog(`Teleprompter: rundown load error: ${(e as Error).message}`, 'err') }
    finally { setRdBusy(false) }
  }, [cid, addLog])

  const loadScripts = useCallback(async (rd: TpRundown) => {
    setScriptsBusy(true)
    try {
      const res = await http.get<{ code?: number; data?: TpScript[] }>(apiConfig.dotnetApiBase, `v1/producer/get-script-details/?scriptId=${rd.id}`)
      setScripts(res.data ?? [])
      setPlayingSno(null)
    } catch (e) { addLog(`Teleprompter: scripts load error: ${(e as Error).message}`, 'err') }
    finally { setScriptsBusy(false) }
  }, [addLog])

  useEffect(() => {
    loadRundowns()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedRd) loadScripts(selectedRd)
    else setScripts([])
  }, [selectedRd]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectRundown = useCallback((rd: TpRundown) => {
    setSelectedRd(rd)
    setStorage('selectedRd', rd)
  }, [])

  const createRundown = useCallback(async () => {
    if (!newRd.newsTitle.trim()) return
    setSavingRd(true)
    try {
      const onAirEpoch = newRd.onAirDate && newRd.onAirTime
        ? Math.floor(new Date(`${newRd.onAirDate}T${newRd.onAirTime}`).getTime() / 1000)
        : 0
      const res = await http.post<{ code?: number; Message?: string }>(apiConfig.dotnetApiBase, 'v1/Producer/add-script-info', {
        cid, newsTitle: newRd.newsTitle, onAirDate: newRd.onAirDate, onAirTime: onAirEpoch,
      })
      if (res.code === -1) {
        const errorMessage = res.Message ?? 'Failed to create rundown'
        addLog(`Teleprompter: create rundown error: ${errorMessage}`, 'err')
        setErrorToast({ open: true, message: errorMessage })
        return
      }
      setNewRd({ newsTitle: '', onAirDate: '', onAirTime: '' })
      setShowRdForm(false)
      addLog(`Teleprompter: rundown "${newRd.newsTitle}" created`, 'info')
      await loadRundowns()
    } catch (e) {
      const errorMessage = (e as Error).message
      addLog(`Teleprompter: create rundown error: ${errorMessage}`, 'err')
      setErrorToast({ open: true, message: errorMessage })
    }
    finally { setSavingRd(false) }
  }, [newRd, cid, addLog, loadRundowns])

  const saveScript = useCallback(async () => {
    if (!scriptForm || !selectedRd) return
    setSavingScript(true)
    try {
      if (scriptForm.mode === 'add') {
        await http.post(apiConfig.dotnetApiBase, 'v1/producer/add-script-details', {
          id: selectedRd.id, createdBy: userId,
          scriptTitle: scriptForm.title, scriptDetails: scriptForm.story,
          creationTime: Math.floor(Date.now() / 1000),
        })
        addLog(`Teleprompter: script "${scriptForm.title}" added`, 'info')
      } else {
        await http.put(apiConfig.dotnetApiBase, 'v1/producer/update-script-details', {
          id: scriptForm.sno, updatedBy: userId,
          scriptTitle: scriptForm.title, scriptDetails: scriptForm.story,
          modifyTime: Math.floor(Date.now() / 1000), status: 'P',
        })
        addLog(`Teleprompter: script "${scriptForm.title}" updated`, 'info')
      }
      setScriptForm(null)
      await loadScripts(selectedRd)
    } catch (e) { addLog(`Teleprompter: save script error: ${(e as Error).message}`, 'err') }
    finally { setSavingScript(false) }
  }, [scriptForm, selectedRd, userId, addLog, loadScripts])

  const confirmDeleteScript = useCallback(async () => {
    if (confirmSno === null) return
    const sno = confirmSno
    try {
      await http.delete(apiConfig.dotnetApiBase, `v1/producer/remove-script-deatils?scriptId=${sno}`)
      setScripts(prev => prev.filter(s => s.Sno !== sno))
      if (playingSno === sno) setPlayingSno(null)
      addLog('Teleprompter: script deleted', 'info')
    } catch (e) { addLog(`Teleprompter: delete error: ${(e as Error).message}`, 'err') }
  }, [confirmSno, playingSno, addLog])

  const sendWsPlay = useCallback((script: TpScript, play: boolean) => {
    const ws = layoutWsRef.current
    if (ws?.readyState !== WebSocket.OPEN) {
      addLog('Teleprompter: WS not connected, cannot send play packet', 'warn')
      return
    }
    ws.send(JSON.stringify({
      requestType: 'Teleprompter',
      roomId: channel,
      date: Number(script.creationTime),
      elementId: String(script.Sno),
      indexTostart: 0,
      rundown: script.TpScriptMaster_Id,
      slugId: script.Sno,
      title: play ? script.scriptTitle : '',
      story: play ? script.scriptDetails : '',
    }))
    addLog(`Teleprompter: ${play ? 'playing' : 'stopped'} "${script.scriptTitle}"`, 'info')
  }, [addLog, channel])

  const togglePlay = useCallback((script: TpScript) => {
    const isPlaying = playingSno === script.Sno
    sendWsPlay(script, !isPlaying)
    setPlayingSno(isPlaying ? null : script.Sno)
  }, [playingSno, sendWsPlay])

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Anchor layout control */}
      <div id="studio-tp-anchor-control" className="flex flex-col gap-1.5">
        <p className="text-[9px] font-semibold text-secondary-text uppercase tracking-wide">Anchor Control</p>
        <div id="studio-tp-anchor-select">
          {(() => {
            const anchorSources = webrtcSources.filter(src => src.name.toLowerCase().startsWith('anchor'))
            return (
              <Select
                value={selectedAnchorId ?? undefined}
                onValueChange={v => setSelectedAnchorId(v)}
                placeholder={anchorSources.length === 0 ? 'No anchors online' : 'Select anchor…'}
                disabled={anchorSources.length === 0}
                className="w-full"
              >
                {anchorSources.map(src => (
                  <SelectItem key={src.id} value={src.name}>{src.name}</SelectItem>
                ))}
              </Select>
            )
          })()}
        </div>

        {selectedAnchorId && (
          <div id="studio-tp-layout-buttons" className="grid grid-cols-2 gap-1">
            {TP_LAYOUT_BUTTONS.map(({ layoutType, label }) => {
              const isActive = (anchorLayoutMap[selectedAnchorId] ?? 'clear') === layoutType
              return (
                <button
                  key={layoutType}
                  id={`studio-tp-layout-btn-${layoutType}`}
                  type="button"
                  onClick={() => handleLayoutSelect(layoutType)}
                  className={cn(
                    'py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-colors',
                    isActive
                      ? 'bg-[#3031cb]/15 border-[#3031cb]/40 text-[#3031cb]'
                      : 'bg-surface border-primary-border text-secondary-text hover:bg-surface-2 hover:text-primary-text',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div id="studio-tp-section-divider" className="border-t border-primary-border" />

      {/* Rundown selector */}
      <p className="text-[9px] font-semibold text-secondary-text uppercase tracking-wide">Rundown Control</p>
      <div className="flex gap-1.5 items-center">
        <Select
          value={selectedRd ? String(selectedRd.id) : undefined}
          onValueChange={v => { const rd = rundowns.find(r => r.id === Number(v)); if (rd) selectRundown(rd) }}
          disabled={rdBusy || rundowns.length === 0}
          placeholder={rdBusy ? 'Loading…' : rundowns.length === 0 ? 'No rundowns' : 'Select rundown…'}
          className="flex-1 min-w-0"
        >
          {rundowns.map(rd => <SelectItem key={rd.id} value={String(rd.id)}>{rd.newsTitle}</SelectItem>)}
        </Select>
        <button type="button" onClick={loadRundowns} disabled={rdBusy} className={loadBtnCls} title="Refresh rundowns">
          <RefreshCw size={9} className={rdBusy ? 'animate-spin' : ''} />
        </button>
        <button type="button" onClick={() => setShowRdForm(v => !v)} className={cn(loadBtnCls, showRdForm ? 'text-[#3031cb] border-[#3031cb]/30' : '')} title="New rundown">
          <Plus size={9} /> New
        </button>
      </div>

      {/* New rundown form */}
      {showRdForm && (
        <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-primary-border bg-surface">
          <p className="text-[9px] font-semibold text-secondary-text uppercase tracking-wide">New Rundown</p>
          <input value={newRd.newsTitle} onChange={e => setNewRd(v => ({ ...v, newsTitle: e.target.value }))} placeholder="Rundown title" className={inputCls} />
          <div className="flex gap-1.5">
            <input type="date" value={newRd.onAirDate} onChange={e => setNewRd(v => ({ ...v, onAirDate: e.target.value }))} className={cn(inputCls, 'flex-1')} />
            <input type="time" value={newRd.onAirTime} onChange={e => setNewRd(v => ({ ...v, onAirTime: e.target.value }))} className={cn(inputCls, 'w-24 shrink-0 flex-none')} />
          </div>
          <div className="flex gap-1.5 justify-end">
            <button type="button" onClick={() => setShowRdForm(false)} className={cn(loadBtnCls, 'text-secondary-text')}>Cancel</button>
            <button type="button" onClick={createRundown} disabled={savingRd || !newRd.newsTitle.trim()} className={cn(loadBtnCls, 'bg-[#3031cb]/10 border-[#3031cb]/30 text-[#3031cb] hover:bg-[#3031cb]/20')}>
              {savingRd ? 'Saving…' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Scripts section */}
      {selectedRd && (
        <>
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[9px] text-secondary-text font-semibold uppercase tracking-wide truncate flex-1 mr-2">{selectedRd.newsTitle} · {scripts.length} scripts</span>
            <button type="button" onClick={() => setScriptForm({ mode: 'add', title: '', story: '' })} className={loadBtnCls}>
              <Plus size={9} /> Add Script
            </button>
          </div>

          {/* Add/Edit script form */}
          {scriptForm && (
            <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-primary-border bg-surface">
              <p className="text-[9px] font-semibold text-secondary-text uppercase tracking-wide">{scriptForm.mode === 'add' ? 'New Script' : 'Edit Script'}</p>
              <input
                value={scriptForm.title}
                onChange={e => setScriptForm(v => v ? { ...v, title: e.target.value } : v)}
                placeholder="Script title"
                className={inputCls}
              />
              <textarea
                value={scriptForm.story}
                onChange={e => setScriptForm(v => v ? { ...v, story: e.target.value } : v)}
                placeholder="Script content…"
                rows={4}
                className={cn(inputCls, 'resize-none leading-relaxed')}
              />
              <div className="flex gap-1.5 justify-end">
                <button type="button" onClick={() => setScriptForm(null)} className={cn(loadBtnCls, 'text-secondary-text')}>Cancel</button>
                <button type="button" onClick={saveScript} disabled={savingScript || !scriptForm.title.trim()} className={cn(loadBtnCls, 'bg-[#3031cb]/10 border-[#3031cb]/30 text-[#3031cb] hover:bg-[#3031cb]/20')}>
                  {savingScript ? 'Saving…' : scriptForm.mode === 'add' ? 'Add' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {scriptsBusy
            ? <p className="text-center text-[10px] text-secondary-text py-4">Loading scripts…</p>
            : scripts.length === 0
            ? <p className="text-center text-[10px] text-secondary-text py-4">No scripts yet. Click Add Script to create one.</p>
            : <div className="flex flex-col gap-1 overflow-y-auto max-h-80">
                {scripts.map(s => {
                  const isPlaying = playingSno === s.Sno
                  return (
                    <div key={s.Sno} className={cn('rounded-lg border p-2 text-[10px] transition-colors', isPlaying ? 'border-emerald-500/25 bg-emerald-50/50' : 'border-primary-border bg-surface-2')}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-primary-text font-semibold flex-1 truncate">{s.scriptTitle}</span>
                        <button
                          type="button"
                          onClick={() => togglePlay(s)}
                          className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer flex items-center gap-0.5 shrink-0 transition-colors', isPlaying ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30' : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30')}
                        >
                          {isPlaying ? <><Square size={8} /> Stop</> : <><Play size={8} /> Play</>}
                        </button>
                        <button
                          type="button"
                          onClick={() => setScriptForm({ mode: 'edit', sno: s.Sno, title: s.scriptTitle, story: s.scriptDetails })}
                          className="text-secondary-text hover:text-primary-text cursor-pointer transition-colors shrink-0"
                        >
                          <Pencil size={9} />
                        </button>
                        <button type="button" onClick={() => setConfirmSno(s.Sno)} className="text-secondary-text hover:text-[#3031cb] cursor-pointer transition-colors shrink-0">
                          <Trash2 size={9} />
                        </button>
                      </div>
                      <p className="text-secondary-text leading-relaxed line-clamp-2 text-[9px]">{s.scriptDetails}</p>
                    </div>
                  )
                })}
              </div>
          }
        </>
      )}

      {!selectedRd && !rdBusy && rundowns.length > 0 && (
        <p className="text-center text-[10px] text-secondary-text py-6">Select a rundown above to view its scripts.</p>
      )}

      <ConfirmDialog
        open={confirmSno !== null}
        onOpenChange={open => { if (!open) setConfirmSno(null) }}
        title="Delete script?"
        description="This will permanently delete the script and cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteScript}
      />

      <Toaster
        id="studio-tp-error-toast"
        open={errorToast.open}
        onOpenChange={open => setErrorToast(prev => ({ ...prev, open }))}
        title="Rundown Error"
        description={errorToast.message}
        variant="error"
      />
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

const TABS: Array<{ id: SocialTab; label: string; icon: React.ReactNode }> = [
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={9} /> },
  { id: 'youtube', label: 'YouTube', icon: <Tv2 size={9} /> },
  { id: 'teleprompter', label: 'Teleprompter', icon: <FileText size={9} /> },
]

export function SocialPanel() {
  const [tab, setTab] = useState<SocialTab>(() =>
    new URLSearchParams(window.location.search).get('code') ? 'youtube' : 'whatsapp'
  )

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex border-b border-primary-border">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn('flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-semibold cursor-pointer border-b-2 transition-colors whitespace-nowrap',
              tab === t.id ? 'text-[#3031cb] border-[#3031cb]' : 'text-secondary-text border-transparent hover:text-primary-text')}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'whatsapp' ? <WhatsAppPanel />
          : tab === 'youtube' ? <YoutubePanel />
          : <TeleprompterPanel />}
      </div>
    </div>
  )
}
