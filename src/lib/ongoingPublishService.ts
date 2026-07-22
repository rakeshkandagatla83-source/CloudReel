import { http } from './http'
import { apiConfig } from './apiConfig'
import { transformRecord } from './publishHistoryService'
import type { OngoingPublishRaw, OngoingPublish, StopPublishPayload } from '../types/publishHistory'

export const PUBLISH_PREVIEW_BASE =
  'https://webrtcpreview.janya.video/newsapp/janyawebrtcplayer.html'

export function getPreviewUrl(masterId: string): string {
  return `${PUBLISH_PREVIEW_BASE}?${masterId}`
}

function safeParsePlCid(extData: string | undefined): number | null {
  if (!extData) return null
  try {
    const parsed = JSON.parse(extData) as { plcid?: number }
    return parsed.plcid ?? null
  } catch {
    return null
  }
}

function transformOngoing(raw: OngoingPublishRaw): OngoingPublish {
  const base = transformRecord(raw)
  return {
    ...base,
    masterId: raw.Masterid ?? '',
    plCid: safeParsePlCid(raw.extData),
    isMultiple: raw.is_multiple ?? false,
    zixiOutputId: raw.zixioutputid ?? '',
    isZixiOutput: raw.is_zixioutput ?? false,
    zixiUrl: raw.zixiUrl ?? '',
    zixiUserName: raw.zixiUserName ?? '',
    zixiPassword: raw.zixiPassword ?? '',
    zixiInputId: raw.zixiInputId ?? '',
  }
}

export async function fetchOngoingPublishes(cid: string): Promise<OngoingPublish[]> {
  const data = await http.get<OngoingPublishRaw[]>(
    apiConfig.dotnetApiBase,
    `v1/gateway/status?cid=${cid}`,
  )
  return Array.isArray(data) ? data.map(transformOngoing) : []
}

export async function stopOngoingPublish(
  record: OngoingPublish,
  userId: string,
  username: string,
): Promise<{ code: number; Message?: string }> {
  // id = Masterid (live input identifier), matches Angular: itemtodelete = item.Masterid
  const payload: StopPublishPayload = {
    id: record.masterId,
    userid: userId,
    username,
  }

  // is_multiple and is_zixioutput both add sno/platform/cid/zixi fields
  if (record.isMultiple || record.isZixiOutput) {
    payload.sno = record.sno
    payload.platform = record.outputMode
    payload.cid = record.cid
    payload.zixioutputid = record.zixiOutputId
    payload.zixiurl = record.zixiUrl
    payload.zixiusername = record.zixiUserName
    payload.zixipassword = record.zixiPassword
    payload.zixiinputid = record.zixiInputId
    payload.is_zixioutput = record.isZixiOutput
  }

  // URL selection mirrors Angular logic exactly
  let url: string
  if (record.isZixiOutput) {
    url = 'v1/gateway/zixioutstop-publish'
  } else if (record.isMultiple) {
    url = 'v1/gateway/multistop-publish'
  } else {
    url = 'v1/gateway/stop-publish'
  }

  return http.post<{ code: number; Message?: string }>(apiConfig.dotnetApiBase, url, payload)
}

export async function moveToHistory(sno: number, cid: string, currentStatus: string): Promise<void> {
  const status = currentStatus.replace(/\(publish\)/gi, '(history)').trim()
  await http.post(apiConfig.dotnetApiBase, 'v1/gateway/move-to-history', {
    sno,
    cid: Number(cid),
    status,
  })
}
