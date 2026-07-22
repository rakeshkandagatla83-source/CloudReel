import { describe, it, expect, vi, beforeEach } from 'vitest'

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

// ── XHR mock ──────────────────────────────────────────────────────────────

type EventHandler = (e: Partial<ProgressEvent | Event>) => void

let xhrInstance!: MockXHR

class MockXHR {
  open = vi.fn()
  setRequestHeader = vi.fn()
  send = vi.fn()
  abort = vi.fn()
  status = 200
  upload: { addEventListener: (ev: string, h: EventHandler) => void; _listeners: Record<string, EventHandler[]> } = {
    _listeners: {},
    addEventListener(ev, h) { (this._listeners[ev] ??= []).push(h) },
  }
  private _listeners: Record<string, EventHandler[]> = {}

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    xhrInstance = this
  }

  addEventListener(ev: string, h: EventHandler) {
    (this._listeners[ev] ??= []).push(h)
  }

  trigger(ev: string, data: Partial<ProgressEvent | Event> = {}) {
    ;(this._listeners[ev] ?? []).forEach(h => h(data))
  }

  triggerUpload(ev: string, data: Partial<ProgressEvent> = {}) {
    ;(this.upload._listeners[ev] ?? []).forEach(h => h(data))
  }
}

vi.stubGlobal('XMLHttpRequest', MockXHR)

// ── HTTP mock ─────────────────────────────────────────────────────────────

const { mockHttpPost } = vi.hoisted(() => ({ mockHttpPost: vi.fn() }))

vi.mock('../http', () => ({
  http: { post: mockHttpPost },
}))

// ── Import after mocks ─────────────────────────────────────────────────────

import { uploadWithPresignedUrl, createClientUpload } from '../s3Service'

const PRESIGNED_URL = 'https://s3.amazonaws.com/bucket/file.mp4?sig=abc'
const PUBLIC_URL = 'https://s3.amazonaws.com/bucket/file.mp4'
const CLOUDFRONT_URL = 'https://d2aqhkzukipl76.cloudfront.net/videos/test.mp4'
const makeFile = (name = 'test.mp4', type = 'video/mp4') => new File(['data'], name, { type })

const PRESIGN_RESPONSE = { code: 1, data: [{ FileName: 'test.mp4', key: 'videos/test.mp4', url: PRESIGNED_URL }] }

beforeEach(() => vi.clearAllMocks())

// ── uploadWithPresignedUrl ────────────────────────────────────────────────

describe('uploadWithPresignedUrl', () => {
  it('resolves with the public URL (without query string) on HTTP 2xx', async () => {
    const file = makeFile()
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL)

    const promise = handle.done()
    xhrInstance.status = 200
    xhrInstance.trigger('load')

    await expect(promise).resolves.toBe(PUBLIC_URL)
  })

  it('opens a PUT request to the presigned URL', async () => {
    const file = makeFile()
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL)
    handle.done()
    expect(xhrInstance.open).toHaveBeenCalledWith('PUT', PRESIGNED_URL)
  })

  it('sets Content-Type header from file.type', async () => {
    const file = makeFile('clip.mp4', 'video/mp4')
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL)
    handle.done()
    expect(xhrInstance.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'video/mp4')
  })

  it('falls back to application/octet-stream for files without a type', async () => {
    const file = makeFile('file.bin', '')
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL)
    handle.done()
    expect(xhrInstance.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream')
  })

  it('sends the file as the XHR body', async () => {
    const file = makeFile()
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL)
    handle.done()
    expect(xhrInstance.send).toHaveBeenCalledWith(file)
  })

  it('rejects with an error message when HTTP status is 4xx/5xx', async () => {
    const file = makeFile()
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL)

    const promise = handle.done()
    xhrInstance.status = 403
    xhrInstance.trigger('load')

    await expect(promise).rejects.toThrow('Upload failed: HTTP 403')
  })

  it('rejects with a network error message on XHR error event', async () => {
    const file = makeFile()
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL)

    const promise = handle.done()
    xhrInstance.trigger('error')

    await expect(promise).rejects.toThrow('Network error during upload')
  })

  it('rejects with AbortError name on XHR abort event', async () => {
    const file = makeFile()
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL)

    const promise = handle.done()
    xhrInstance.trigger('abort')

    const err = await promise.catch(e => e)
    expect(err.name).toBe('AbortError')
    expect(err.message).toBe('Upload aborted')
  })

  it('calls abort() on the XHR when handle.abort() is called', () => {
    const file = makeFile()
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL)
    handle.done()
    handle.abort()
    expect(xhrInstance.abort).toHaveBeenCalled()
  })

  it('fires the onProgress callback with loaded, total, and percentage', async () => {
    const file = makeFile()
    const onProgress = vi.fn()
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL, onProgress)
    handle.done()

    xhrInstance.triggerUpload('progress', { lengthComputable: true, loaded: 50, total: 100 })

    expect(onProgress).toHaveBeenCalledWith({ loaded: 50, total: 100, percentage: 50 })
  })

  it('does not call onProgress when progress is not length-computable', async () => {
    const file = makeFile()
    const onProgress = vi.fn()
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL, onProgress)
    handle.done()

    xhrInstance.triggerUpload('progress', { lengthComputable: false, loaded: 50, total: 0 })

    expect(onProgress).not.toHaveBeenCalled()
  })

  it('aborts XHR when AbortSignal fires', async () => {
    const controller = new AbortController()
    const file = makeFile()
    const handle = uploadWithPresignedUrl(file, PRESIGNED_URL, undefined, controller.signal)
    handle.done()

    controller.abort()

    expect(xhrInstance.abort).toHaveBeenCalled()
  })
})

// ── createClientUpload ─────────────────────────────────────────────────────

describe('createClientUpload', () => {
  it('fetches a presigned URL from the backend then uploads the file', async () => {
    mockHttpPost.mockResolvedValue(PRESIGN_RESPONSE)

    const file = makeFile()
    const handle = createClientUpload(file)
    const promise = handle.done()

    await flushPromises()

    xhrInstance.status = 200
    xhrInstance.trigger('load')

    await expect(promise).resolves.toBe(CLOUDFRONT_URL)
    expect(mockHttpPost).toHaveBeenCalled()
  })

  it('throws AbortError when aborted before upload starts', async () => {
    mockHttpPost.mockResolvedValue(PRESIGN_RESPONSE)

    const file = makeFile()
    const handle = createClientUpload(file)
    handle.abort()

    const err = await handle.done().catch(e => e)
    expect(err.name).toBe('AbortError')
  })

  it('passes onProgress to the underlying XHR upload', async () => {
    mockHttpPost.mockResolvedValue(PRESIGN_RESPONSE)

    const onProgress = vi.fn()
    const file = makeFile()
    const handle = createClientUpload(file, onProgress)
    const promise = handle.done()

    await flushPromises()

    xhrInstance.triggerUpload('progress', { lengthComputable: true, loaded: 25, total: 100 })
    xhrInstance.status = 200
    xhrInstance.trigger('load')
    await promise

    expect(onProgress).toHaveBeenCalledWith({ loaded: 25, total: 100, percentage: 25 })
  })

  it('throws when the backend returns no presigned URL', async () => {
    mockHttpPost.mockResolvedValue({ code: 0, data: [] })

    const file = makeFile()
    const handle = createClientUpload(file)

    await expect(handle.done()).rejects.toThrow('No presigned URL returned.')
  })

  it('uses graphic context when specified', async () => {
    mockHttpPost.mockResolvedValue(PRESIGN_RESPONSE)

    const file = makeFile('banner.png', 'image/png')
    const handle = createClientUpload(file, undefined, 'graphic')
    const promise = handle.done()

    await flushPromises()
    xhrInstance.status = 200
    xhrInstance.trigger('load')
    await promise

    expect(mockHttpPost).toHaveBeenCalledWith(
      expect.any(String),
      'v1/pcr/presigned-url',
      expect.objectContaining({ AssetType: 'MAMSecondary' }),
    )
  })
})
