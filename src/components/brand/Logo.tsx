import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark' | 'icon';
  width?: number;
  height?: number;
  className?: string;
}

/**
 * ZemiFix SVG logo — no external image dependency.
 *
 * variant="dark"  → used on the navy sidebar: white wordmark + orange accent
 * variant="light" → used on light backgrounds: navy wordmark + orange accent
 * variant="icon"  → compact square mark only (Z monogram)
 */
export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  width,
  height,
  className = '',
}) => {
  /* ── Icon-only mark ── */
  if (variant === 'icon') {
    const size = width ?? 36;
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="ZemiFix icon"
          role="img"
          style={{ width: size, height: size }}
        >
          {/* Background square */}
          <rect width="36" height="36" rx="8" fill="#FF5B00" />
          {/* Bold Z letterform */}
          <path
            d="M9 9h18l-13 18h13"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  /* ── Wordmark ── */
  const w = width ?? 150;
  const h = height ?? 38;

  // Colour tokens per variant
  const zemiColor  = variant === 'dark' ? '#FFFFFF' : '#0B1336';
  const fixColor   = '#FF5B00';
  const dotColor   = '#FF5B00';

  return (
    <div
      className={`inline-flex shrink-0 items-center ${className}`}
      style={{ width: w, height: h }}
    >
      <svg
        viewBox="0 0 150 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ZemiFix CMMS"
        role="img"
        style={{ width: w, height: h }}
      >
        {/* ── Icon mark (left) ── */}
        <rect x="0" y="3" width="32" height="32" rx="7" fill="#FF5B00" />
        <path
          d="M7 10h18L11 28h14"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ── "Zemi" wordmark ── */}
        <text
          x="40"
          y="28"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          fontSize="22"
          fontWeight="800"
          letterSpacing="-0.5"
          fill={zemiColor}
        >
          Zemi
        </text>

        {/* ── "Fix" in orange ── */}
        <text
          x="99"
          y="28"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          fontSize="22"
          fontWeight="800"
          letterSpacing="-0.5"
          fill={fixColor}
        >
          Fix
        </text>

        {/* ── Small orange dot (brand detail) ── */}
        <circle cx="144" cy="10" r="3" fill={dotColor} opacity="0.85" />
      </svg>
    </div>
  );
};
