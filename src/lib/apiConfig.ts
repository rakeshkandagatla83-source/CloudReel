// ── API Config ────────────────────────────────────────────────────────────────
// All service base URLs in one place, keyed by environment.
// VITE_ENV_LABEL in each .env file selects the active config at runtime.
// Sensitive values (OIDC, S3 keys, app URL) stay in .env files via env.ts.

interface ApiConfig {
  dotnetApiBase: string
  scalaApiBase: string
  studioWsUrl: string
  controlWsUrl: string
  studioTemplateBase: string
  studioCdnBase: string
  studioConferenceBase: string
  studioPcrApiBase: string
  studioRtmpPreviewBase: string
  studioWebrtcPreviewBase: string
  studioGfxApiBase: string
  meetingHostBase: string
}

const configs = {
  dev: {
    dotnetApiBase: 'http://localhost:9782/',
    // dotnetApiBase: 'https://devapi1.janya.video/',
    scalaApiBase: 'https://uatapi1.janya.video/',
    studioWsUrl: 'wss://ws-htmlgfx-test.janya.video',
    // studioWsUrl: 'ws://localhost:9705',
    controlWsUrl: 'wss://ws-controler-test.janya.video',
    studioTemplateBase: 'https://html-template.janya.video',
    studioCdnBase: 'https://d25z9m9h2phgvi.cloudfront.net',
    studioConferenceBase: 'https://conference-test-api.janya.video',
    studioPcrApiBase: 'https://uatapi2.janya.video',
    studioRtmpPreviewBase: 'https://prv3sg.janya.video/newsapp/nblprvS.html',
    studioWebrtcPreviewBase: 'https://webrtcplyer.janya.video/prv',
    studioGfxApiBase: 'https://capidev.janya.video',
    // meetingHostBase: 'https://webrtc-test.janya.video',
    meetingHostBase: 'https://webrtc-test.janya.video',
  },

  uat: {
    dotnetApiBase: 'https://devapi1.janya.video/',
    scalaApiBase: 'https://uatapi1.janya.video/',
    studioWsUrl: 'wss://ws-htmlgfx-test.janya.video',
    controlWsUrl: 'wss://ws-controler-test.janya.video',
    studioTemplateBase: 'https://html-template.janya.video',
    studioCdnBase: 'https://d25z9m9h2phgvi.cloudfront.net',
    studioConferenceBase: 'https://conference-test-api.janya.video',
    studioPcrApiBase: 'https://uatapi2.janya.video',
    studioRtmpPreviewBase: 'https://prv3sg.janya.video/newsapp/nblprvS.html',
    studioWebrtcPreviewBase: 'https://webrtcplyer.janya.video/prv',
    studioGfxApiBase: 'https://capidev.janya.video',
    meetingHostBase: 'https://meeting.janya.video',
  },

  prod: {
    dotnetApiBase: 'https://fastapi1.janya.video/',
    scalaApiBase: 'https://uatapi1.janya.video/',
    studioWsUrl: 'wss://ws-htmlgfx-test.janya.video',
    controlWsUrl: 'wss://ws-controler.janya.video',
    studioTemplateBase: 'https://html-template.janya.video',
    studioCdnBase: 'https://d25z9m9h2phgvi.cloudfront.net',
    studioConferenceBase: 'https://conference-test-api.janya.video',
    studioPcrApiBase: 'https://uatapi2.janya.video',
    studioRtmpPreviewBase: 'https://prv3sg.janya.video/newsapp/nblprvS.html',
    studioWebrtcPreviewBase: 'https://webrtcplyer.janya.video/prv',
    studioGfxApiBase: 'https://capidev.janya.video',
    meetingHostBase: 'https://meeting.janya.video',
  },
} satisfies Record<string, ApiConfig>

type Env = keyof typeof configs

const label = import.meta.env.VITE_ENV_LABEL as string
const activeEnv: Env = label in configs ? (label as Env) : 'dev'

export const apiConfig: ApiConfig = configs[activeEnv]
