/**
 * Isotipo de MercadoPago (óvalo celeste + apretón de manos), SVG autocontenido para
 * usarlo como ícono de marca en las opciones de pago. No depende de assets externos.
 */
export function MercadoPagoLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="MercadoPago"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mp-oval" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4EC1F0" />
          <stop offset="1" stopColor="#009EE3" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="24" rx="23" ry="16.5" fill="url(#mp-oval)" />
      {/* Apretón de manos */}
      <path
        fill="#fff"
        d="M24 33.2c-2.2 0-4.2-1-5.9-2.2-1.2-.9-2.3-1.9-3.8-2.2-.9-.2-1.9 0-2.8-.3-1-.3-1.4-1.5-.8-2.4.3-.4.8-.7 1.3-1 2.4-1.6 4.6-3.5 7.1-5 1.5-.9 3.2-1.6 5-1.5 1.1.1 2.2.5 3.1 1.1l.8.5.8-.5c.9-.6 2-1 3.1-1.1 1.8-.1 3.5.6 5 1.5 2.5 1.5 4.7 3.4 7.1 5 .5.3 1 .6 1.3 1 .6.9.2 2.1-.8 2.4-.9.3-1.9.1-2.8.3-1.5.3-2.6 1.3-3.8 2.2-1.7 1.2-3.7 2.2-5.9 2.2z"
      />
      {/* Pulgares */}
      <path
        fill="#009EE3"
        d="M24 19.4c.7-.5 1.4-.8 2.2-.9-.2.9-.8 1.6-1.5 2.2-.2.2-.5.2-.7.2h-.6c-.7-.6-1.3-1.3-1.5-2.2.8.1 1.5.4 2.1.7z"
      />
    </svg>
  )
}
