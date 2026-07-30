# CloudReel Homepage — Master Build Prompt

> **Goal:** Rebuild the CloudReel marketing homepage by fusing the **current light-theme UI** (live at cloudreel-one.vercel.app) with the **richer content** from the dark reference HTML. Keep the light design language; layer in the missing narrative sections. Ship a premium, animated, single-page marketing site.
>
> **Stack:** React 19 + TypeScript, Vite, Tailwind CSS v4 (config-in-CSS `@theme`), Lucide React icons, **Motion** (Framer Motion) for animation. One component per file under `src/features/landing/`, composed in `src/pages/LandingPage.tsx`. Follow project rules: feature-prefixed `id` on every structural/interactive element, `is/has/can` boolean naming, `handle*` handlers, semantic Tailwind tokens (no raw hex in JSX), `cn()` for conditional classes, Tailwind v4 utility names (`bg-linear-to-r`, `rounded-xl`, `shadow-sm`, `ring-3`).

---

## 0. Global Design System (light-first)

**Theme:** Light default, dark-compatible (a theme toggle exists in the nav). Design light-first; provide `dark:` overrides where cheap.

**Color tokens (add to `@theme`):**
| Token | Light value | Use |
|-------|-------------|-----|
| `--color-ink` | `#0B0D11` | primary text, display headings |
| `--color-muted` | `#5B6472` | body/sub copy |
| `--color-muted-2` | `#9AA3AF` | mono captions, meta |
| `--color-bg` | `#FFFFFF` | page base |
| `--color-bg-tint` | `#F7F8FB` | alternating section bands |
| `--color-surface` | `#FFFFFF` | cards (with shadow + border) |
| `--color-line` | `#E6E8EE` | borders/dividers |
| `--color-brand-indigo` | `#3B38D0` | primary buttons, links |
| `--color-brand-magenta` | `#D300EA` | accent start |
| `--brand-grad` | `linear-gradient(105deg,#d300ea,#6d28d9,#3031cb)` | accent words, icon strokes, chips, mock highlights |
| `--color-live` | `#FF4757` | LIVE / on-air dots |
| `--color-ok` | `#10B981` | checkmarks, low-latency |
| grid line | `rgba(11,13,17,.04)` | blueprint background |

**Product-mock panels stay dark** (`#0B0D11`) even on the light page — high-contrast "real device" feel, matching the current hero mock.

**Typography:**
- **Display:** heavy grotesk, **UPPERCASE**, tight tracking (`-0.02em`), line-height ~1.05. Sizes `clamp(38px,5.4vw,72px)` H1, `clamp(28px,3.8vw,48px)` H2.
- **Body/UI:** Manrope (or current sans), 16px, line-height 1.65.
- **Mono labels:** IBM Plex Mono — eyebrows, chips, stats captions, meta. 11–12px, `letter-spacing:.14em`, uppercase.

**Primitives:**
- **Eyebrow:** mono uppercase label + small gradient square/dot. Optionally a rounded pill with hairline border.
- **Gradient accent word:** `--brand-grad` clipped to text on select display words.
- **Buttons:** primary = solid indigo, `rounded-xl`, white text, soft brand shadow, arrow/broadcast icon; secondary = ghost, hairline border, subtle hover fill, leading icon (play).
- **Cards:** white, `rounded-2xl`, 1px `--color-line`, `shadow-sm`; hover → lift + border tint + shadow bloom.
- **Chips:** mono, hairline border, `rounded-md`, muted text.
- **Section rhythm:** max-width `1180px`, padding `clamp(64px,9vw,120px)`; alternate `--color-bg` / `--color-bg-tint`; blueprint grid + low-opacity radial brand glow behind hero & final CTA.

---

## 1. Global Motion System

Use **Motion (Framer Motion)**. One shared reveal variant + section-specific accents. **Always gate on `prefers-reduced-motion`** (render final state, no transitions).

- **Scroll reveal (default for every section):** `opacity 0→1`, `y 24→0`, `duration .6s`, `ease [0.22,1,0.36,1]`, `whileInView`, `viewport={{ once:true, margin:'-12%' }}`.
- **Stagger:** children `staggerChildren: 0.07` for grids/lists.
- **Hover (cards):** spring `y:-4`, scale `1.01`, border/shadow tint. `type:'spring', stiffness:300, damping:24`.
- **Hero load:** headline lines clip-reveal (mask up) in sequence; sub + CTAs fade-rise; product mock floats in from `y:20, scale .98`.
- **Live mock loop:** cycle an "ON AIR" highlight across preview cells (2.4s), animate audio waveform bars (~420ms), tick the timecode, pulse RTMP/SRT chips.
- **Stat count-up:** animate numbers 0→value when in view.
- **Gradient shimmer:** slow background-position drift on accent words / primary button (subtle, 6s).
- **Icon draw:** stroke path `pathLength 0→1` on reveal for spec/crew icons.
- **Reduced motion:** disable loops, count-ups, shimmer; keep static final frames.

Prefer transform/opacity only (GPU-friendly). No layout-thrashing animations.

---

## 2. Section-by-Section Spec

> Order below is the merged narrative. Each section: **Purpose · Copy · Layout · UI · Motion · Component & IDs.**

### S0 — Navbar  `LandingNavbar`
- **Purpose:** Sticky wayfinding + primary conversion.
- **Copy:** Logo (CR gradient mark + "CloudReel" + mono "CLOUD PRODUCER"). Links: Platform · Use cases · AI Crew · How it works · Solutions · Vision. Right: theme toggle, **Sign In** (ghost), **Get Started** (primary, broadcast icon). Mobile burger.
- **UI:** translucent white, `backdrop-blur`, hairline bottom border, 68px tall.
- **Motion:** on scroll past hero, condense height + strengthen blur/shadow; links underline-grow on hover; mobile menu slide-down.
- **IDs:** `landing-nav`, `landing-nav-logo`, `landing-nav-links`, `landing-btn-get-started`, `landing-btn-signin`, `landing-btn-burger`.

### S1 — Hero  `HeroSection` + `BroadcastMockup`
- **Purpose:** One-line promise + live proof.
- **Copy:** Eyebrow "LIVE BROADCAST PLATFORM". H1 (uppercase): **"BROADCAST AT SCALE. PRODUCE ON CLOUD."** with "AT SCALE" gradient. Sub: "Create, manage and distribute broadcast-quality live video to millions — all from your browser. **No hardware. No crew. No limits.**" CTAs: **Request a Demo** (primary→), **Explore Features** (ghost ▶). Trust row: Browser-based · Up to 8 live inputs · Multi-platform output.
- **Layout:** 2-col (`1.02fr 1.1fr`); left copy, right dark product mock. Stats bar spans full width below: **6** Remote Guests · **8+** Input Protocols · **24/7** Linear Channels · **1-Click** Social Publish.
- **UI:** blueprint grid bg + radial brand glow top-right. Mock = dark "ON AIR CR" panel: dual program feeds (real photos), timecode, RTMP-IN/SRT-OUT chips, "REMOTE GUESTS (6)" thumb grid, protocol chip row, transport bar (CUT/DISSOLVE/WIPE + scrub + waveform).
- **Motion:** headline clip-reveal; mock floats in; live cell cycling + waveform + ticking timecode + pulsing chips; stats count-up.
- **IDs:** `landing-hero`, `landing-hero-headline`, `landing-hero-cta`, `landing-hero-mock`, `landing-hero-stats`.

### S2 — Value / Thesis  `ValueSection`  *(from HTML)*
- **Purpose:** Reframe from "streaming tool" → "AI TV studio".
- **Copy:** Eyebrow "MORE THAN CLOUD PRODUCTION". H2: **"IT'S A COMPLETE AI TV STUDIO IN YOUR BROWSER."** Two columns: (1) "CloudReel automates the work of an entire crew — creators, broadcasters, enterprises and universities launch professional live channels with **one person and one camera.**" (2) "News, podcasts, sports, webinars, TV channels or social shows — complex broadcast workflows become a **simple, browser-based experience**, from first input to final publish."
- **UI:** tinted band; large H2 left/full, 2-col lead paragraphs with **bold** key phrases in ink.
- **Motion:** reveal + word-level emphasis fade on the bolded phrases.
- **IDs:** `landing-value`, `landing-value-headline`.

### S3 — Platform Capabilities  `CapabilitiesSection` + `MultiviewerCard`  *(merge live 7 features + HTML ingest/mix/output)*
- **Purpose:** Prove production depth.
- **Copy:** Eyebrow "PLATFORM CAPABILITIES". H2: **"EVERYTHING A CONTROL ROOM DOES — ENGINEERED FOR THE CLOUD."** Lead: "A full pipeline in one place: bring sources in, mix live, deliver everywhere at once."
- **Layout:** Optional 3 pillar headers (**Ingest · Vision Mixing · Output**), then a responsive card grid of 7 capabilities:
  1. **24/7 Linear Channels** — always-on HD to OTT/social/TV. chips: RTMP SRT HLS ZIXI RTP RTSP
  2. **Remote Guests (up to 16 WebRTC)** — green room, IFB, A/V control. chips: WebRTC · Green Room · IFB
  3. **Live Source Switching** — cut/dissolve/wipe, preview-before-publish, zero latency, built-in DVR.
  4. **Graphics & Overlay Engine** — lower-thirds, bugs, L-bands, astons, multi-layer compositing.
  5. **Live Polls & Surveys** — real-time audience engagement overlays.
  6. **Cloud Studio** — talkback, IFB, green room, pre-air QC — no hardware.
  7. **1-Click Social Publish** — Facebook + YouTube simulcast; AI live captions*.
- **UI:** white cards, gradient-stroke Lucide icon in soft brand tile, mono category, title, checklist (ok-green ticks), chip row.
- **Feature band — Multiviewer:** split card "SEE EVERY FEED AT A GLANCE." + animated 6-cell wall showing sources + latency (`42 ms`), cycling on-air highlight.
- **Motion:** grid staggers in; icons draw; multiviewer cell cycling; card hover lift.
- **IDs:** `landing-capabilities`, `landing-cap-grid`, `landing-cap-card-{slug}`, `landing-multiviewer`, `landing-mv-cell-{i}`.

### S4 — Supported Protocols  `ProtocolsSection`  *(from live site)*
- **Purpose:** "connect anything" credibility.
- **Copy:** Eyebrow "SUPPORTED PROTOCOLS". H2: **"SPEAK EVERY BROADCAST LANGUAGE."** Lead: "Native support for every major ingest & delivery protocol — no adapters, no workarounds." Publish-to: Facebook · YouTube · Twitch · Custom RTMP · OTT · CDN · Satellite Uplink · Linear TV. Protocols (name + expansion): RTMP, SRT, HLS, WebRTC, NDI, ZIXI, RTP, RTSP.
- **UI:** two-part — left "PUBLISH TO" pill cloud; right protocol grid (mono code + expansion). Subtle blueprint bg.
- **Motion:** protocol tiles pop-in stagger; publish-to pills gentle marquee or hover-glow.
- **IDs:** `landing-protocols`, `landing-protocol-grid`, `landing-protocol-{code}`.

### S5 — AI Crew  `AICrewSection`  *(from HTML)*
- **Purpose:** Humanize the AI as a "crew".
- **Copy:** Eyebrow "YOUR AI PRODUCTION CREW". H2: **"THE WHOLE CONTROL ROOM. AUTOMATED."** Lead: "Every role a broadcast team relies on, handled by AI — working together on every show." 8 cards: **AI Director** (switches cameras, active-speaker, dynamic layouts) · **AI Producer** (rundowns, playlists, schedule) · **AI Graphics** (lower-thirds, scoreboards, sponsors) · **AI Camera Op** (face tracking, reframe per aspect ratio) · **AI Audio** (levels, denoise, voice enhance) · **AI Editor** (live highlight & vertical clips) · **AI Social** (simulcast YouTube/IG/LinkedIn/X/Twitch/OTT) · **AI Translator** (subtitles, voice translation, lip-sync).
- **UI:** 4-col grid (2 on tablet, 1 on mobile); compact cards, gradient icon tile, title, one-line role.
- **Motion:** staggered rise; hover lift + icon draw; optional subtle "connect" line pulse suggesting collaboration.
- **IDs:** `landing-crew`, `landing-crew-grid`, `landing-crew-card-{role}`.

### S6 — How It Works / Intelligence Stack  `IntelligenceStack`  *(from HTML)*
- **Purpose:** "tools vs intelligence" differentiation.
- **Copy:** Eyebrow "HOW IT WORKS". H2: **"MOST PLATFORMS GIVE YOU TOOLS. CLOUDREEL GIVES YOU INTELLIGENCE."** 6 layers (num / verb): 01 Produce — AI Director · 02 Understand — AI Vision (faces, speakers, gestures, logos) · 03 Brand — AI Graphics · 04 Clip — AI Content IQ (highlights) · 05 Deliver — AI Distribution · 06 Learn — AI Analytics.
- **UI:** vertical rack of horizontal rows (`name | description | index/verb`); hover slides row right + tints; gradient left edge.
- **Motion:** rows reveal top-down stagger; on hover translateX + gradient index glow; optional connecting spine that "fills" on scroll.
- **IDs:** `landing-stack`, `landing-stack-row-{n}`.

### S7 — Showcase / Use Cases  `ShowcaseSection`  *(from HTML, image-ready)*
- **Purpose:** Breadth of formats with real imagery.
- **Copy:** Eyebrow "IN PRODUCTION EVERYWHERE". H2: **"ONE PLATFORM. EVERY KIND OF LIVE."** Lead: "From studio news to stadium sport — any format, any aspect ratio, any platform." 6 tiles: Live News (studio · lower-thirds · ticker) · Sports & Events (multi-cam · replay · scoreboard) · Worship & Community (multi-language · captions) · Webinars & Town Halls (remote guests · slides) · Podcasts & Shows (auto-clips · vertical cuts) · Education & Training (recordings · translation).
- **UI:** 3-col image tiles (16:10), photo with dark scrim, LIVE chip top-left, title + mono meta bottom. Gradient placeholder until real photos are dropped in (`--img`).
- **Motion:** tile hover zoom + lift + border tint; LIVE dot pulse; reveal stagger.
- **IDs:** `landing-showcase`, `landing-showcase-grid`, `landing-showcase-tile-{slug}`.

### S8 — Comparison  `ComparisonSection`  *(from HTML)*
- **Purpose:** Frame the switch.
- **Copy:** Eyebrow "WHY TEAMS SWITCH". H2: **"BROADCAST QUALITY, WITHOUT THE BROADCAST OVERHEAD."** Two cards — **Traditional** (✗ expensive hardware, multiple licenses, large teams, long setup, limited scale, high opex) vs **CloudReel AI Studio** (✓ runs in browser, AI-assisted workflows, remote collaboration, live in minutes, scales w/o hardware, far lower cost/show).
- **UI:** side-by-side; "old" card muted/tinted with grey ✗; "new" card white, brand header, green ✓, subtle brand glow.
- **Motion:** cards slide in from opposite sides; ✗/✓ icons draw sequentially.
- **IDs:** `landing-comparison`, `landing-cmp-old`, `landing-cmp-new`.

### S9 — Benefits / ROI  `BenefitsSection`  *(from HTML)*
- **Purpose:** Quantify the win.
- **Copy:** Eyebrow "WHY ENTERPRISES CHOOSE CLOUDREEL". H2: **"DO MORE, WITH FEWER PEOPLE, FOR LESS."** Wide stat: **Up to 80%** lower live-production costs (no studio, no crew, no hardware refresh). Then: **Minutes** (launch a channel in minutes, not months) · **Global** (scale worldwide, no hardware) · **Remote** (produce from anywhere, in the browser).
- **UI:** stat grid; wide hero-stat card with brand gradient tint; big gradient figure + mono caption.
- **Motion:** count-up on the 80% + figures; wide card gradient drift.
- **IDs:** `landing-benefits`, `landing-benefit-{slug}`.

### S10 — Audience / Built For  `AudienceSection`  *(from HTML)*
- **Purpose:** Self-identification.
- **Copy:** Eyebrow "BUILT FOR". H2: **"RUN AN ENTIRE CHANNEL WITH ONE PERSON."** Chips: Independent creators · News publishers · Sports orgs · Faith orgs · Universities · Corporate comms · Government · OTT platforms · FAST channels · Podcast networks · Event organizers.
- **UI:** wrap of hairline-border chips; hover → brand border + ink text.
- **Motion:** chips stagger-pop; hover border-glow.
- **IDs:** `landing-audience`, `landing-audience-chip-{slug}`.

### S11 — Media OS Modules  `MediaOSSection`  *(from HTML)*
- **Purpose:** Show it's a platform, not one feature.
- **Copy:** Eyebrow "THE AI MEDIA OPERATING SYSTEM". H2: **"ONE PLATFORM FOR THE ENTIRE CONTENT LIFECYCLE."** 7 modules: AI Studio (live production) · AI Producer (rundown automation) · AI Playout (24×7 channel) · AI Asset Manager (library, QC, metadata) · AI Monetization (ads, SCTE, FAST) · AI Distribution Hub (OTT, social, syndication) · AI Insights (analytics, engagement).
- **UI:** auto-fit card grid with a gradient left accent bar per module; tag (mono) + title + one-liner.
- **Motion:** left accent bar grows on reveal; hover lift.
- **IDs:** `landing-mediaos`, `landing-module-{slug}`.

### S12 — Vision Quote  `VisionSection`  *(from HTML)*
- **Purpose:** Emotional anchor.
- **Copy:** Eyebrow "OUR VISION". Blockquote: **"Professional broadcasting should no longer require a professional broadcast team."** — CloudReel.
- **UI:** centered, oversized display quote with gradient on "professional broadcast team"; radial glow.
- **Motion:** quote clip-reveal word-by-word; slow glow pulse.
- **IDs:** `landing-vision`, `landing-vision-quote`.

### S13 — Final CTA  `FinalCTASection`  *(merge both)*
- **Purpose:** Convert.
- **Copy:** Eyebrow "ONE PERSON. ONE CAMERA. UNLIMITED PRODUCTION." H2: **"LAUNCH YOUR LIVE CHANNEL ON CLOUD."** Sub: "Talk to our broadcast experts — from concept to air." CTAs: **Request a Demo** (primary), **Contact Sales** (ghost). Contact: sales@janya.video · +91-97021 73996 · +91-98814 91028.
- **UI:** centered, strong radial brand glow, blueprint bg; contact line in mono.
- **Motion:** glow pulse; buttons subtle shimmer; reveal.
- **IDs:** `landing-final-cta`, `landing-btn-request-demo`, `landing-btn-contact-sales`.

### S14 — Footer  `LandingFooter`
- **Purpose:** Nav + legitimacy.
- **Copy:** Logo + "The AI operating system for live production. **Formerly Janya.**" Columns — **Platform** (Capabilities, AI Crew, How it works, Media OS) · **Solutions** (Creators, Broadcasters, Enterprise, Education) · **Company** (Vision, Book a demo, Start free trial). Bottom: © 2026 CloudReel · "Built for live."
- **UI:** tinted band, hairline top border, mono column heads.
- **Motion:** link color transitions only (keep calm).
- **IDs:** `landing-footer`, `landing-footer-col-{name}`.

---

## 3. Build Order (recommended)

1. Tokens + fonts + global primitives (buttons, eyebrow, card, chip) + Motion reveal helper.
2. **S0 Nav + S1 Hero** (incl. animated `BroadcastMockup`).
3. **S2 Value → S3 Capabilities + Multiviewer**.
4. **S4 Protocols → S5 AI Crew → S6 Intelligence Stack**.
5. **S7 Showcase → S8 Comparison → S9 Benefits**.
6. **S10 Audience → S11 Media OS → S12 Vision → S13 Final CTA → S14 Footer**.
7. Responsive pass (940px / 560px breakpoints) + reduced-motion pass + a11y (focus rings, aria labels, alt text).

## 4. Quality Bar
- Light-first, dark-compatible; no raw hex in JSX (tokens only).
- Every section wrapped in the shared scroll-reveal; motion purposeful, never decorative-for-its-own-sake; **all** loops honor `prefers-reduced-motion`.
- Real photos in Hero mock + Showcase (image-ready placeholders until assets land).
- Lucide icons (gradient stroke via `<linearGradient>`); custom SVG only for logo + mock.
- Feature-prefixed IDs on every structural/interactive element.
