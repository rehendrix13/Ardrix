export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="lg" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff5a1f" /><stop offset="0.6" stopColor="#ff9a3c" /><stop offset="1" stopColor="#ffd27a" />
        </linearGradient>
      </defs>
      <path d="M256 92 L408 404 H338 L256 228 L174 404 H104 Z" fill="url(#lg)" />
      <path d="M256 300 L292 380 H220 Z" fill="#ffd27a" />
    </svg>
  );
}
