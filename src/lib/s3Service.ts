import { http } from './http'
import { apiConfig } from './apiConfig'

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadHandle {
  /** Resolves with the public URL of the uploaded object. */
  done: () => Promise<string>
  abort: () => void
}

// Upload contexts:
//   "video"            → channel bucket  {subfolder/}videos/{filename}
//   "graphic"          → channel bucket  {subfolder/}graphics/{filename}
//   "thumbnail"        → playout-metadata bucket  producer/{channelName}/thumbnails/{filename}
//   "defaultBgCover"   → playout-metadata bucket  producer/{channelName}/bgCover/{filename}
//                        Used only for Default Background (filename always: bgvideoimg.png)
//   "guestCover"       → playout-metadata bucket  producer/{channelName}/{filename}
//                        Used for regular guest/participant covers (filename: original file.name)
export type UploadContext = 'video' | 'graphic' | 'thumbnail' | 'defaultBgCover' | 'guestCover'

// Matches the backend AssetType enum
const ASSET_TYPE: Record<UploadContext, string> = {
  video: 'MAMPrimary',
  graphic: 'MAMSecondary',
  thumbnail: 'ProducerEventThumbnail',
  defaultBgCover: 'ProducerParticipantCover',
  guestCover: 'ProducerGuestCover',  // backend needs to add this case → producer/{channelName}/
}

interface PresignFile {
  FileName: string
  FileType: string
}

interface PresignResult {
  FileName: string
  key: string
  url: string
}

interface PresignResponse {
  code: number
  data: PresignResult[]
}

async function fetchPresignedUrl(file: File, context: UploadContext): Promise<{ url: string; key: string }> {
  const res = await http.post<PresignResponse>(apiConfig.dotnetApiBase, 'v1/pcr/presigned-url', {
    Files: [{ FileName: file.name, FileType: file.type || 'application/octet-stream' } satisfies PresignFile],
    AssetType: ASSET_TYPE[context],
  })

  const result = res.data?.[0]
  if (!result?.url) throw new Error('No presigned URL returned.')
  return { url: result.url, key: result.key }
}

export function createClientUpload(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  context: UploadContext = 'video',
): UploadHandle {
  let innerHandle: UploadHandle | null = null
  let aborted = false

  const checkAbort = () => {
    if (aborted) {
      const err = new Error('Upload aborted')
      err.name = 'AbortError'
      throw err
    }
  }

  const done = async (): Promise<string> => {
    checkAbort()

    const { url: presignedUrl, key } = await fetchPresignedUrl(file, context)

    checkAbort()
    innerHandle = uploadWithPresignedUrl(file, presignedUrl, onProgress)
    await innerHandle.done()
    return `https://d2aqhkzukipl76.cloudfront.net/${key}`
  }

  return {
    done,
    abort: () => {
      aborted = true
      innerHandle?.abort()
    },
  }
}

/**
 * Upload using a pre-signed PUT URL.
 *
 * @param file         - The File to upload.
 * @param presignedUrl - Pre-signed S3 PUT URL.
 * @param onProgress   - Optional progress callback.
 * @param signal       - Optional AbortSignal.
 */
export function uploadWithPresignedUrl(
  file: File,
  presignedUrl: string,
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal,
): UploadHandle {
  let xhr: XMLHttpRequest | null = null

  const done = () =>
    new Promise<string>((resolve, reject) => {
      xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress?.({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          })
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr!.status >= 200 && xhr!.status < 300) {
          resolve(presignedUrl.split('?')[0])
        } else {
          reject(new Error(`Upload failed: HTTP ${xhr!.status}`))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
      xhr.addEventListener('abort', () => {
        const err = new Error('Upload aborted')
        err.name = 'AbortError'
        reject(err)
      })

      signal?.addEventListener('abort', () => xhr?.abort())

      xhr.open('PUT', presignedUrl)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.send(file)
    })

  return {
    done,
    abort: () => xhr?.abort(),
  }
}
