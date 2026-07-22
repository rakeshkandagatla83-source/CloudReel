import { CreditCard } from 'lucide-react'

interface LogoProps {
  size?: number
}

/**
 * PhonePe logo. Brand: #5F259F (purple).
 * The mark is a stylized lightning/bolt arrow on a purple rounded square.
 */
export function PhonePeLogo({ size = 24 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="PhonePe"
    >
      <rect width="64" height="64" rx="14" fill="#5F259F" />
      <path
        fill="#fff"
        d="M44.4 27.5c0-1.1-.8-1.9-1.9-1.9h-3.6l-4-4.7c-.4-.5-1-.7-1.6-.6l-3 1c-.4.1-.5.6-.2 1l5.1 4.3h-7.9c-.4 0-.7.3-.7.7v1c0 1.1.8 1.9 1.9 1.9h1v7c0 2.6 1.4 4.2 3.7 4.2 1.3 0 2.3-.3 3.2-.9v4.2c0 .4.3.7.7.7h1.5c.4 0 .7-.3.7-.7V29.2h4c.4 0 .7-.3.7-.7v-1Zm-7.6 9.7c-.7.3-1.3.5-1.9.5-1.1 0-1.5-.5-1.5-1.7v-6.7h3.4v7.9Z"
      />
    </svg>
  )
}

/**
 * RazorPay logo. Brand: #072654 (navy) with #3395FF (blue) accent.
 * The mark is a stylized triangular/origami shape.
 */
export function RazorPayLogo({ size = 24 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="RazorPay"
    >
      <rect width="64" height="64" rx="14" fill="#072654" />
      <path
        fill="#3395FF"
        d="M43.8 12 38 33.5 32.4 13.4l-3 3.6L34 33l-12.7 8.4L18 51l11.4-7.4-2 7.4h7.5L44.5 12h-.7Z"
      />
      <path
        fill="#fff"
        opacity="0.9"
        d="m26 26.6 2.2-8.2L40 12.4l-3.8 14.2L26 26.6Z"
      />
    </svg>
  )
}

/**
 * Recurly logo. Brand: #1A2B49 (navy) with #FF8800 (orange).
 * Stylized 'R' wordmark.
 */
export function RecurlyLogo({ size = 24 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Recurly"
    >
      <rect width="64" height="64" rx="14" fill="#1A2B49" />
      <path
        fill="#FF8800"
        d="M22 18h13.4c5 0 8.6 2.9 8.6 7.4 0 3.4-2 5.7-4.9 6.7l5.9 9.9h-7l-5-8.7H28V42h-6V18Zm13.2 9.7c2.6 0 4.1-1.1 4.1-3.1s-1.5-3-4.1-3H28v6.1h7.2Z"
      />
    </svg>
  )
}

function FallbackLogo({ size = 24 }: LogoProps) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5"
      style={{ width: size, height: size }}
    >
      <CreditCard size={Math.round(size * 0.55)} className="text-white/55" />
    </div>
  )
}

const LOGO_MAP: Record<string, React.FC<LogoProps>> = {
  PHONEPE: PhonePeLogo,
  RAZORPAY: RazorPayLogo,
  RECURLY: RecurlyLogo,
}

export function getGatewayLogo(gatewayCode: string): React.FC<LogoProps> {
  return LOGO_MAP[gatewayCode.toUpperCase()] ?? FallbackLogo
}
