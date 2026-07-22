const PROTOCOLS = [
  { name: 'RTMP', desc: 'Real-Time Messaging Protocol' },
  { name: 'SRT', desc: 'Secure Reliable Transport' },
  { name: 'HLS', desc: 'HTTP Live Streaming' },
  { name: 'WebRTC', desc: 'Web Real-Time Communication' },
  { name: 'NDI', desc: 'Network Device Interface' },
  { name: 'ZIXI', desc: 'Zixi Broadcast Protocol' },
  { name: 'RTP', desc: 'Real-time Transport Protocol' },
  { name: 'RTSP', desc: 'Real Time Streaming Protocol' },
]

const DESTINATIONS = [
  'Facebook Live',
  'YouTube Live',
  'Twitch',
  'Custom RTMP',
  'OTT Platforms',
  'CDN Delivery',
  'Satellite Uplink',
  'Linear TV',
]

const STUDIO_SPECS = [
  { label: 'Talkback', value: 'On-air IFB without broadcast bleed' },
  { label: 'Green Room', value: 'Virtual pre-broadcast staging area' },
  { label: 'Quality Check', value: 'Pre-air A/V validation per source' },
  { label: 'Infrastructure', value: 'Zero hardware required' },
]

export function ProtocolsSection() {
  return (
    <section id="protocols" className="relative bg-secondary-bg py-28 border-t border-primary-border overflow-hidden">
      {/* Subtle center radial — CloudReel brand */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 55%, rgba(48,49,203,0.05) 0%, transparent 65%)',
        }}
      />
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Protocols row */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-28">
          <div>
            <div className="text-xs tracking-[0.3em] text-active-accent uppercase mb-4 font-mono">
              Supported Protocols
            </div>
            <h2 className="text-5xl sm:text-6xl font-black text-primary-text leading-[0.9] mb-6">
              SPEAK EVERY
              <br />
              <span className="text-secondary-text">BROADCAST</span>
              <br />
              LANGUAGE.
            </h2>
            <p className="text-secondary-text text-base leading-relaxed mb-8">
              Native support for every major video ingest and delivery protocol. Connect any camera,
              encoder, or platform to your cloud studio without adapters or workarounds.
            </p>

            {/* Destinations */}
            <div>
              <div className="text-sm tracking-[0.2em] text-muted-text uppercase mb-3 font-semibold font-mono">
                Publish to
              </div>
              <div className="flex flex-wrap gap-2">
                {DESTINATIONS.map((d) => (
                  <span
                    key={d}
                    className="px-3 py-1.5 rounded-full bg-component-bg border border-primary-border text-sm text-secondary-text"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Protocol cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {PROTOCOLS.map((p) => (
              <div
                key={p.name}
                id={`landing-protocol-card-${p.name.toLowerCase()}`}
                className="group flex items-center gap-3 p-4 rounded-xl border border-primary-border bg-surface hover:bg-surface-2 hover:border-active-accent/25 transition-all duration-200 cursor-default"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-active-accent/8 border border-active-accent/15 group-hover:bg-active-accent/15 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-active-accent/50 group-hover:bg-active-accent transition-colors" />
                </div>
                <div>
                  <div className="text-sm font-bold text-primary-text transition-colors font-mono">
                    {p.name}
                  </div>
                  <div className="text-sm text-muted-text leading-tight mt-0.5">
                    {p.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Studio specs row */}
        <div id="studio" className="rounded-2xl border border-primary-border bg-surface overflow-hidden">
          <div
            className="px-8 py-6 border-b border-primary-border"
            style={{
              background: 'linear-gradient(90deg, rgba(6,182,212,0) 0%, rgba(6,182,212,0.06) 100%)',
            }}
          >
            <div className="text-xs tracking-[0.3em] text-[#06b6d4] uppercase mb-2 font-mono">
              Cloud Studio
            </div>
            <h3 className="text-3xl sm:text-4xl font-black text-primary-text leading-tight">
              A COMPLETE BROADCAST STUDIO.{' '}
              <span className="text-secondary-text">IN YOUR BROWSER.</span>
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-primary-border">
            {STUDIO_SPECS.map(({ label, value }) => (
              <div key={label} className="px-6 py-5">
                <div className="text-sm tracking-[0.18em] text-[#06b6d4] uppercase mb-2 font-semibold font-mono">
                  {label}
                </div>
                <div className="text-base text-secondary-text leading-snug">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
