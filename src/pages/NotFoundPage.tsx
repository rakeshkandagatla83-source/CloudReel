import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Tv2 } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(48,49,203,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(48,49,203,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-150 h-150 rounded-full bg-[#3031cb]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">

        {/* Icon */}
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/4 border border-black/8">
          <Tv2 size={28} className="text-black/30" />
        </div>

        {/* 404 */}
        <p className="text-[10.5px] font-mono font-medium text-black/30 uppercase tracking-[0.2em] mb-3">
          Error 404
        </p>
        <h1 className="text-[3rem] font-bold text-black/88 tracking-tight leading-none mb-4">
          Page not found
        </h1>
        <p className="text-sm text-black/45 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 bg-black/4 hover:bg-black/7 border border-black/8 hover:border-black/14 text-black/55 hover:text-black/80 text-sm rounded-lg px-6 py-2.75 transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft size={14} />
            Go back
          </button>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="flex items-center justify-center gap-2 bg-[#3031cb] hover:bg-[#2829b0] text-white font-semibold text-sm rounded-lg px-6 py-2.75 transition-all duration-200 cursor-pointer active:scale-[0.99]"
          >
            Back to login
          </button>
        </div>

      </div>
    </div>
  )
}
