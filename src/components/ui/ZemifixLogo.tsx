import React from 'react';

interface ZemifixLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon-only';
  /** Override text colour for wordmark (defaults to white; set to 'dark' on light backgrounds) */
  theme?: 'light' | 'dark';
  className?: string;
}

const sizeMap = {
  sm: { icon: 28, fontSize: 14, subFontSize: 9 },
  md: { icon: 36, fontSize: 18, subFontSize: 11 },
  lg: { icon: 48, fontSize: 24, subFontSize: 14 },
};

/**
 * ZemiFix brand logo — pure inline SVG, no external image dependency.
 *
 * icon-only: navy rounded-square with white "Z" + orange checkmark badge
 * full:      icon + wordmark "Zemi" (white/dark) + "Fix" (#FF5B00)
 */
export const ZemifixLogo: React.FC<ZemifixLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'light',
  className = '',
}) => {
  const dim = sizeMap[size];
  const iconSize = dim.icon;
  const radius = iconSize * 0.22;

  const wordmarkColor = theme === 'dark' ? '#080E29' : '#FFFFFF';

  if (variant === 'icon-only') {
    const badgeR = iconSize * 0.26;
    const badgeCx = iconSize - badgeR * 0.65;
    const badgeCy = iconSize - badgeR * 0.65;

    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox={`0 0 ${iconSize} ${iconSize}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ZemiFix"
        className={`shrink-0 ${className}`}
      >
        {/* Background square */}
        <rect width={iconSize} height={iconSize} rx={radius} fill="#080E29" />

        {/* White "Z" letter */}
        <text
          x={iconSize * 0.5}
          y={iconSize * 0.68}
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
          fontWeight="800"
          fontSize={iconSize * 0.52}
          letterSpacing="-1"
        >
          Z
        </text>

        {/* Orange badge circle (bottom-right) */}
        <circle cx={badgeCx} cy={badgeCy} r={badgeR} fill="#FF5B00" />

        {/* White checkmark inside badge */}
        <polyline
          points={`${badgeCx - badgeR * 0.5},${badgeCy} ${badgeCx - badgeR * 0.1},${badgeCy + badgeR * 0.42} ${badgeCx + badgeR * 0.52},${badgeCy - badgeR * 0.38}`}
          stroke="#FFFFFF"
          strokeWidth={badgeR * 0.32}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  /* full variant */
  const wordmarkGap = iconSize * 0.4;
  const totalWidth = iconSize + wordmarkGap + dim.fontSize * 5.6;

  return (
    <svg
      width={totalWidth}
      height={iconSize}
      viewBox={`0 0 ${totalWidth} ${iconSize}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ZemiFix CMMS"
      className={`shrink-0 ${className}`}
    >
      {/* Icon background */}
      <rect width={iconSize} height={iconSize} rx={radius} fill="#080E29" />

      {/* White "Z" */}
      <text
        x={iconSize * 0.5}
        y={iconSize * 0.68}
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize={iconSize * 0.52}
        letterSpacing="-1"
      >
        Z
      </text>

      {/* Orange badge */}
      {(() => {
        const badgeR = iconSize * 0.26;
        const badgeCx = iconSize - badgeR * 0.65;
        const badgeCy = iconSize - badgeR * 0.65;
        return (
          <>
            <circle cx={badgeCx} cy={badgeCy} r={badgeR} fill="#FF5B00" />
            <polyline
              points={`${badgeCx - badgeR * 0.5},${badgeCy} ${badgeCx - badgeR * 0.1},${badgeCy + badgeR * 0.42} ${badgeCx + badgeR * 0.52},${badgeCy - badgeR * 0.38}`}
              stroke="#FFFFFF"
              strokeWidth={badgeR * 0.32}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );
      })()}

      {/* Wordmark: "Zemi" */}
      <text
        x={iconSize + wordmarkGap}
        y={iconSize * 0.65}
        fill={wordmarkColor}
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontWeight="700"
        fontSize={dim.fontSize}
        letterSpacing="-0.5"
      >
        Zemi
      </text>

      {/* Wordmark: "Fix" in orange */}
      <text
        x={iconSize + wordmarkGap + dim.fontSize * 2.76}
        y={iconSize * 0.65}
        fill="#FF5B00"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontWeight="700"
        fontSize={dim.fontSize}
        letterSpacing="-0.5"
      >
        Fix
      </text>
    </svg>
  );
};
