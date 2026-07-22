# PCR 3.0 - API Endpoints Reference

## Base URL Configuration

All endpoints are resolved dynamically based on environment (dev/uat/prod) via `src/lib/apiConfig.ts`.

| Variable | Dev Example | Purpose |
|----------|-------------|---------|
| `dotnetApiBase` | `https://devapi1.janya.video/` | Main .NET backend |
| `scalaApiBase` | `https://uatapi1.janya.video/` | Scala/playout services |
| `studioPcrApiBase` | `https://uatapi2.janya.video/` | Layout/PCR services |
| `studioGfxApiBase` | `https://capidev.janya.video/` | Graphics API |
| `studioConferenceBase` | `https://conference-test-api.janya.video/` | Conference services |

> **Auth pattern**: `[FeatureAuthorize("FEATURE_NAME")]` is a custom attribute on the .NET backend.
> All protected endpoints also require the `Authorization: Bearer {token}`, `userId`, and `Channel-Id` headers injected by `src/lib/http.ts`.
> Endpoints marked **None** are open (no auth required on the server).
> Endpoints on `scalaApiBase`, `studioPcrApiBase`, `studioGfxApiBase`, and `studioConferenceBase` are separate microservices - their auth is not in this controller project.

---

## Authentication & User Management

**Controller**: `LoginController.cs` | **Route prefix**: `v{version}/login`

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `v1/login` | POST | dotnetApiBase | None | `lib/authService.ts` | User login (JANYA or MSAL auth type) |
| `v1/login/validate/token` | GET | dotnetApiBase | None | `lib/authService.ts` | Validate OIDC token on MSAL callback |

---

## Asset Management (MAM / Playout)

**Controller**: `MAM.cs` / `Playout.cs` (Scala microservice for playout routes)

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `v1/playout/getassets/with/folders` | POST | scalaApiBase | Scala service | `features/assets/useAssets.ts`, `lib/studioConfig.ts` | Fetch videos/assets with folder structure, filtering, and pagination |
| `v1/playout/multi/delAssets` | POST | scalaApiBase | Scala service | `pages/AssetsPage.tsx` | Batch delete multiple assets |
| `v2/playout/renameasset` | POST | scalaApiBase | Scala service | `pages/AssetsPage.tsx` | Rename an asset |
| `v1/playout/addassethistory` | POST | scalaApiBase | Scala service | `pages/AssetsPage.tsx` | Log asset operation to history (create/delete/edit) |
| `v1/qc/add` | POST | scalaApiBase | Scala service | `pages/AssetsPage.tsx` | Add QC metadata (remarks, tags, category, season, episode) |
| `v1/pcr/presigned-url` | POST | dotnetApiBase | **None** | `lib/s3Service.ts` | Get S3 presigned URL for file upload |
| `v1/playout/getassets` | GET | dotnetApiBase | Scala service | `lib/studioConfig.ts` | Fetch GFX assets |
| `v1/mam/get-multi-socialmedia-metadata` | GET | dotnetApiBase | `FeatureAuthorize("MAM_API")` | `lib/socialAuthService.ts` | Fetch all connected social media channels |

---

## Events & Calendar

**Controller**: `ProducerEventController.cs` / `ChannelController.cs`

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `v2/ProducerEvent/producerEventPlaylist` | POST | dotnetApiBase | `FeatureAuthorize("PRODUCEREVENT_API")` | `features/events/useEvents.ts` | Fetch calendar events for a month |
| `v2/ProducerEvent/insertEvent` | POST | dotnetApiBase | `FeatureAuthorize("PRODUCEREVENT_API")` | `features/events/useEvents.ts` | Create new calendar event |
| `v2/ProducerEvent/updateEvent` | POST | dotnetApiBase | `FeatureAuthorize("PRODUCEREVENT_API")` | `features/events/useEvents.ts` | Update existing calendar event |
| `v2/ProducerEvent/deleteEvent` | POST | dotnetApiBase | `FeatureAuthorize("PRODUCEREVENT_API")` | `features/events/useEvents.ts` | Delete calendar event |
| `v2/Channel/GetCloudInstanceDetailsByChid` | GET | dotnetApiBase | `FeatureAuthorize("FORTEST_API")` | `features/events/useEvents.ts` | Get cloud instance details for channel |
| `v2/Channel/GetFirstFreePcrInstance` | GET | dotnetApiBase | `FeatureAuthorize("FORTEST_API")` | `features/events/useEvents.ts` | Find first available PCR cloud instance |
| `v2/Channel/UpdateInstanceChid` | PUT | dotnetApiBase | `FeatureAuthorize("FORTEST_API")` | `features/events/useEvents.ts` | Assign cloud instance to channel |
| `/api/TencentApi` | POST | studioGfxApiBase | GFX service | `features/events/useEvents.ts` | Start/stop cloud instance, get instance details |

---

## Layout Builder

**Controller**: `studioPcrApiBase` microservice (not in this .NET project)

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `pcr/v1/get` | GET | studioPcrApiBase | PCR service | `features/layout-builder/layoutBuilderApi.ts` | Fetch layouts for a channel |
| `pcr/v1/windows/add` | POST | studioPcrApiBase | PCR service | `features/layout-builder/layoutBuilderApi.ts` | Add new layout window configuration |
| `pcr/v1/windows/update` | POST | studioPcrApiBase | PCR service | `features/layout-builder/layoutBuilderApi.ts` | Update existing layout window |
| `pcr/v1/windows/delete` | POST | studioPcrApiBase | PCR service | `features/layout-builder/layoutBuilderApi.ts` | Delete layout window |

---

## Graphics (GFX) Management

**Controller**: `studioGfxApiBase` microservice (not in this .NET project)

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `api/get_gfx_setup_Data/getstatus` | GET | studioGfxApiBase | GFX service | `lib/studioConfig.ts`, `pages/GfxPage.tsx` | Get GFX band status (ON/OFF) and content |
| `api/get_gfx_setup_Data/getalignment` | GET | studioGfxApiBase | GFX service | `lib/studioConfig.ts`, `pages/GfxPage.tsx` | Get GFX band alignment/layout settings |
| `api/get_gfx_setup_Data/getvalue` | GET | studioGfxApiBase | GFX service | `pages/GfxPage.tsx`, `features/studio/useStudio.ts` | Get specific band value (text/asset) |
| `api/set_gfx_setup_Data` | POST | studioGfxApiBase | GFX service | `pages/GfxPage.tsx`, `features/studio/useStudio.ts` | Set GFX band content/alignment/display |

---

## Publishing & Broadcast

**Controller**: `Gateway.cs` | **Route prefix**: `v{version}/gateway`

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `v1/gateway/status` | GET | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/ongoingPublishService.ts` | Fetch ongoing publish records for channel |
| `v1/gateway/status-history/{cid}/{start}/{end}/{sortOrder}` | GET | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/publishHistoryService.ts` | Fetch historical publish records with pagination |
| `v1/gateway/stop-publish` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/ongoingPublishService.ts` | Stop single publish record |
| `v1/gateway/multistop-publish` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/ongoingPublishService.ts` | Stop multi-platform publish |
| `v1/gateway/zixioutstop-publish` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/ongoingPublishService.ts` | Stop Zixi output publish |
| `v1/gateway/move-to-history` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/ongoingPublishService.ts` | Archive publish record to history |
| `v1/gateway/start-publish` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts` | Start single RTMP publish |
| `v1/gateway/rtmp-multi-socialmedia-platform` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts` | Publish studio output to multiple social platforms |
| `v1/gateway/upload-multi-socialmedia-platform` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts` | Upload VOD to multiple social platforms |
| `v1/gateway/get-instances-status` | GET | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts` | Check if backend instances are available |
| `v1/gateway/get-apm/{cid}` | GET | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts` | Fetch pre/post-roll profiles |
| `v1/gateway/get-uploadinstance-status` | GET | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts` | Check if VOD upload instance is free |

---

## Social Media - General

**Controller**: `Gateway.cs`

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `v1/gateway/add-rtmpmetadata` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts` | Save custom RTMP channel |
| `v1/gateway/rtmp-golive` | POST | dotnetApiBase | **Not found in controller** | `lib/socialAuthService.ts` | Start RTMP stream |
| `v1/gateway/rtmp-stoplive` | POST | dotnetApiBase | **Not found in controller** | `lib/socialAuthService.ts` | Stop RTMP stream |

---

## Social Media - Facebook

**Controller**: `Gateway.cs` / `OAuthController.cs`

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `v1/gateway/facebookpages/{cid}/{userId}` | GET | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts` | Fetch saved Facebook pages |
| `v1/gateway/managefbmetadata` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts` | Save Facebook page metadata |
| `v1/oauth/facebooklongtoken/fb_exchange_token/{id}/{secret}/{token}` | POST | dotnetApiBase | `FeatureAuthorize("OAUTH_API")` | `lib/socialAuthService.ts` | Exchange short-lived FB token for long-lived |
| `graph.facebook.com/v22.0/me` | GET | Facebook Graph API | Facebook OAuth token | `lib/socialAuthService.ts` | Get Facebook user profile |
| `graph.facebook.com/v22.0/me/accounts` | GET | Facebook Graph API | Facebook OAuth token | `lib/socialAuthService.ts` | Get Facebook user pages |
| `graph.facebook.com/v22.0/{pageId}` | GET/POST | Facebook Graph API | Facebook OAuth token | `lib/socialAuthService.ts` | Get page token, fan count, upload thumbnail |
| `graph.facebook.com/v22.0/{pageId}/live_videos` | GET/POST | Facebook Graph API | Facebook OAuth token | `lib/socialAuthService.ts` | Start/get/stop Facebook live stream |
| `graph.facebook.com/v22.0/{videoId}` | GET/POST | Facebook Graph API | Facebook OAuth token | `lib/socialAuthService.ts` | Get video status/stats, end live video |
| `graph.facebook.com/v22.0/{videoId}/thumbnails` | POST | Facebook Graph API | Facebook OAuth token | `lib/socialAuthService.ts` | Upload video thumbnail |

---

## Social Media - Instagram

**Controller**: Facebook Graph API (no dedicated backend route)

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `graph.facebook.com/v22.0/me/accounts` | GET | Facebook Graph API | Facebook OAuth token | `lib/socialAuthService.ts` | Get Instagram pages (via FB Graph) |
| `graph.facebook.com/v22.0/{igId}` | GET | Facebook Graph API | Facebook OAuth token | `lib/socialAuthService.ts` | Get Instagram account details |

---

## Social Media - Twitter/X

**Controller**: `Gateway.cs` / `OAuthController.cs`

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `twitter.com/i/oauth2/authorize` | GET | Twitter OAuth | None (OAuth redirect) | `lib/socialAuthService.ts` | Twitter OAuth 2.0 authorization |
| `v1/oauth/exchangetokentwitter` | POST | dotnetApiBase | `FeatureAuthorize("OAUTH_API")` | `lib/socialAuthService.ts` | Exchange Twitter auth code for tokens |
| `v1/gateway/twitterProfile` | GET | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts` | Get Twitter user profile |
| `v1/gateway/managetwittermetadata` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts` | Save Twitter account metadata |
| `v1/oauth/twitter-refreshtoken` | POST | dotnetApiBase | `FeatureAuthorize("OAUTH_API")` | `lib/socialAuthService.ts` | Refresh Twitter access token |
| `v1/gateway/twitterStatics` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/publishHistoryService.ts` | Get Twitter post statistics |

---

## Social Media - YouTube

**Controller**: `Gateway.cs` / `OAuthController.cs` / YouTube Data API (direct)

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `accounts.google.com/o/oauth2/v2/auth` | GET | Google OAuth | None (OAuth redirect) | `lib/socialAuthService.ts`, `features/studio/SocialPanel.tsx` | Google OAuth 2.0 authorization |
| `oauth2.googleapis.com/token` | POST | Google OAuth | None (client credentials) | `lib/socialAuthService.ts`, `features/studio/SocialPanel.tsx`, `lib/publishHistoryService.ts` | Exchange code for tokens / refresh tokens |
| `youtube/v3/channels` | GET | YouTube Data API | Google OAuth token | `lib/socialAuthService.ts` | Get YouTube channel details |
| `youtube/v3/liveStreams` | GET | YouTube Data API | Google OAuth token | `lib/socialAuthService.ts` | Get live streams for channel |
| `youtube/v3/liveBroadcasts` | GET/POST/DELETE | YouTube Data API | Google OAuth token | `lib/socialAuthService.ts` | Create/get/delete live broadcasts |
| `youtube/v3/liveBroadcasts/bind` | POST | YouTube Data API | Google OAuth token | `lib/socialAuthService.ts` | Bind broadcast to stream |
| `youtube/v3/liveBroadcasts/transition` | POST | YouTube Data API | Google OAuth token | `lib/socialAuthService.ts` | Transition broadcast state (testing - live - complete) |
| `youtube/v3/videos` | GET | YouTube Data API | Google OAuth token | `lib/publishHistoryService.ts` | Get video statistics |
| `youtube/v3/liveChat/messages` | GET | YouTube Data API | Google OAuth token | `features/studio/SocialPanel.tsx` | Get live chat messages |
| `upload/youtube/v3/thumbnails/set` | POST | YouTube Data API | Google OAuth token | `lib/socialAuthService.ts` | Upload video thumbnail |
| `v1/gateway/add-ytmetadata` | POST | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `lib/socialAuthService.ts`, `features/studio/SocialPanel.tsx` | Save YouTube channel metadata |
| `v1/gateway/get/ytmetadata/by/user` | GET | dotnetApiBase | `FeatureAuthorize("GATEWAY_API")` | `features/studio/SocialPanel.tsx` | Fetch saved YouTube metadata for a user |

---

## Video Conference

**Controller**: `Producer.cs` | **Route prefix**: `v{version}/producer`

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `v1/Producer/add-videoconference-info` | POST | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `lib/studioConfig.ts`, `features/events/useEvents.ts` | Create meeting room/conference |
| `v1/Producer/get-videoconference-participants` | GET | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `lib/studioConfig.ts` | Get live participants in conference |
| `v1/Producer/upd-videoconference-imagepath` | PUT | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `lib/studioConfig.ts` | Update participant thumbnail image |
| `v1/producer/get-videoconference-info-by-event` | GET | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `features/events/useEvents.ts` | Get meeting details for event |
| `describeLiveStreamOnlineList` | GET | studioConferenceBase | Conference service | `lib/studioConfig.ts` | List online participants in live stream |

---

## Audio / Video Matrix

**Controller**: `Producer.cs` | **Route prefix**: `v{version}/producer`

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `v1/Producer/audio-video-info/{channelId}` | GET | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `features/studio/MatrixModal.tsx` | Fetch audio/video matrix info for channel |
| `v1/Producer/audio-video` | POST | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `features/studio/MatrixModal.tsx` | Add audio/video matrix configuration |
| `v1/Producer/upd-av/{channelId}/{type}` | PUT | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `features/studio/MatrixModal.tsx` | Update audio/video matrix configuration |

---

## Teleprompter / Script Management

**Controller**: `Producer.cs` | **Route prefix**: `v{version}/producer`

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `v1/Producer/get-script/{cid}` | GET | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `features/studio/SocialPanel.tsx` | Fetch script rundowns for channel |
| `v1/producer/get-script-details` | GET | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `features/studio/SocialPanel.tsx` | Fetch scripts for rundown |
| `v1/Producer/add-script-info` | POST | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `features/studio/SocialPanel.tsx` | Create script rundown |
| `v1/producer/add-script-details` | POST | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `features/studio/SocialPanel.tsx` | Add script to rundown |
| `v1/producer/update-script-details` | PUT | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `features/studio/SocialPanel.tsx` | Update script content |
| `v1/producer/remove-script-deatils` | DELETE | dotnetApiBase | `FeatureAuthorize("PRODUCER_API")` | `features/studio/SocialPanel.tsx` | Delete script (note: typo in endpoint name) |

---

## Google Sheets

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `v1/gateway/delete/google-sheet-data` | POST | dotnetApiBase | **Not found in controller** | `features/studio/SocialPanel.tsx` | Delete Google Sheet row data |
| `sheets/v4/spreadsheets/{id}/values/{range}` | GET/PUT | Google Sheets API | Google OAuth token | `lib/socialAuthService.ts` | Read/write Google Sheets data |

---

## Billing & Subscriptions

**Controller**: `Recurly.cs` | **Route prefix**: `v1/recurly`

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `v1/recurly/subscriptionplans` | GET | dotnetApiBase | `FeatureAuthorize("UPLOADER_API")` | `pages/SubscriptionPlansPage.tsx` | Fetch subscription plans |
| `v1/recurly/subscription/{gatewayId}` | GET | dotnetApiBase | `FeatureAuthorize("UPLOADER_API")` | `pages/SubscriptionPlansPage.tsx` | Fetch subscription details by gateway |
| `v1/recurly/accounts/{gatewayId}` | GET | dotnetApiBase | `FeatureAuthorize("UPLOADER_API")` | `pages/SubscriptionPlansPage.tsx` | Fetch account details by gateway |
| `v1/recurly/add-account` | POST | dotnetApiBase | `FeatureAuthorize("UPLOADER_API")` | `pages/SubscriptionPlansPage.tsx` | Add new subscription account |
| `v1/recurly/upsert-paymentdetails` | POST | dotnetApiBase | `FeatureAuthorize("UPLOADER_API")` | `pages/SubscriptionPlansPage.tsx` | Update payment details |
| `v1/recurly/insert-paymenthistory` | POST | dotnetApiBase | `FeatureAuthorize("UPLOADER_API")` | `pages/SubscriptionPlansPage.tsx` | Record payment history |
| `v1/recurly/cancel-subscription/{subscriptionId}` | DELETE | dotnetApiBase | `FeatureAuthorize("UPLOADER_API")` | `pages/SubscriptionPlansPage.tsx` | Cancel a subscription |

---

## External / Third-Party

| Endpoint | Method | Base | Auth | File | Description |
|----------|--------|------|------|------|-------------|
| `http://13.233.229.201:8082/service/api/v1/external/approve/live/stream/request` | POST | External IP | None (internal network) | `features/publish/useOngoingPublishes.ts` | Platform stream approval request |

---

## WebSocket Connections

| URL | Variable | Auth | File | Description |
|-----|----------|------|------|-------------|
| `wss://ws-htmlgfx-test.janya.video` | `studioWsUrl` | Token in query/header | `lib/studioConfig.ts` | GFX band content/alignment real-time updates |
| `wss://ws-controler-test.janya.video` | `controlWsUrl` | Token in query/header | `lib/studioConfig.ts` | Studio control messages |
| `wss://recording.janya.video` | - | Token in query/header | `lib/studioConfig.ts` | Recording status updates |
| `wss://ws-nrcstp.janya.video` | `teleprompterWsUrl` | Token in query/header | `lib/studioConfig.ts` | Teleprompter synchronization |

---

## Preview / Embed URLs

| URL Pattern | Variable | File | Description |
|-------------|----------|------|-------------|
| `{studioRtmpPreviewBase}/newsapp/nblprvS.html` | `studioRtmpPreviewBase` | `lib/studioConfig.ts` | RTMP preview player |
| `{studioWebrtcPreviewBase}/prv` | `studioWebrtcPreviewBase` | `lib/studioConfig.ts` | WebRTC preview player |
| `{studioTemplateBase}/live-match-sldp/masterN.html` | `studioTemplateBase` | `lib/studioConfig.ts` | Studio preview/master template |
| `https://webrtcpreview.janya.video/newsapp/janyawebrtcplayer.html` | - | `lib/ongoingPublishService.ts` | Publish preview player |

---

## Distinct FeatureAuthorize Values

| Module | Feature Name | Feature UID | Used In |
|--------|--------------|-------------|---------|
| MAM | GATEWAY CONTROLLER API | `GATEWAY_API` | Publishing & Broadcast, Social Media (General, Facebook, Twitter, YouTube) |
| MAM | MAM CONTROLLER API | `MAM_API` | MAM |
| MAM | OAUTH CONTROLLER API | `OAUTH_API` | Social Media - Facebook OAuth, Twitter OAuth |
| MAM | PRODUCER CONTROLLER API | `PRODUCER_API` | Video Conference, Audio/Video Matrix, Teleprompter / Script Management |
| MAM | PRODUCER EVENT CONTROLLER API | `PRODUCEREVENT_API` | Events & Calendar |
| MAM | UPLOADER CONTROLLER API | `UPLOADER_API` | Billing & Subscriptions |
| MAM | FOR TEST | `FORTEST_API` | Events & Calendar (channel/cloud instance) |

---

## Technical Notes

- **HTTP client**: Axios wrapper in `src/lib/http.ts` - auto-injects `Authorization: Bearer {token}`, `userId`, and `Channel-Id` headers on every request.
- **Pattern**: `http.get(baseUrl, path, config)` / `http.post(baseUrl, path, body, config)`
- **Auth flow**: JANYA native login + MSAL (Microsoft) OIDC support via `LoginController.cs` (both open - no auth required).
- **`[FeatureAuthorize]`**: Custom .NET attribute - validates JWT and checks if the user's role has the given feature flag enabled.
- **Social OAuth**: Direct OAuth 2.0 flows for Google/YouTube/Twitter run client-side; Facebook uses a backend token exchange proxy.
- **Missing from controller**: `rtmp-golive`, `rtmp-stoplive`, and `delete/google-sheet-data` routes were not found in `JanyaApi/Controllers/` - likely implemented in a separate microservice.
- **`v1/pcr/presigned-url`**: Intentionally unauthenticated on the backend (`PcrPublisherController.cs`) - S3 presigned URLs are self-expiring and scoped.
- **Environment config**: `src/lib/env.ts` reads `VITE_APP_BASE_URL`, `VITE_OIDC_*` environment variables.
