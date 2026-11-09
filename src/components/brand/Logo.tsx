import React from 'react';
import Image from 'next/image';

interface LogoProps {
  variant?: 'light' | 'dark' | 'icon';
  width?: number;
  height?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  width,
  height,
  className = '',
}) => {
  if (variant === 'icon') {
    const defaultDim = width || 36;
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: defaultDim, height: defaultDim }}>
        <Image
          src="/assets/aistudio/WhatsApp_Image_2026-11-05_at_02.54.45_c28fdec9.jpeg"
          alt="ZemiFix Icon"
          width={defaultDim}
          height={defaultDim}
          className="rounded-xl object-contain shadow-sm"
          priority
        />
      </div>
    );
  }

  if (variant === 'light') {
    // For white/light backgrounds: dark navy "Zemi" with orange "Fix"
    const defaultW = width || 150;
    const defaultH = height || 42;
    return (
      <div className={`relative inline-flex items-center shrink-0 ${className}`} style={{ width: defaultW, height: defaultH }}>
        <Image
          src="/assets/aistudio/WhatsApp_Image_2026-11-05_at_02.54.09_f33fe07f.jpeg"
          alt="ZemiFix Logo"
          width={defaultW}
          height={defaultH}
          className="object-contain"
          priority
        />
      </div>
    );
  }

  // Dark variant for dark navy sidebar/header: White "Zemi" with orange "Fix"
  const defaultW = width || 150;
  const defaultH = height || 42;
  return (
    <div className={`relative inline-flex items-center shrink-0 ${className}`} style={{ width: defaultW, height: defaultH }}>
      <Image
        src="/assets/aistudio/WhatsApp_Image_2026-11-05_at_02.54.33_e1f6d049.jpeg"
        alt="ZemiFix Logo"
        width={defaultW}
        height={defaultH}
        className="object-contain"
        priority
      />
    </div>
  );
};
