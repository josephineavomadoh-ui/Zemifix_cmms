import React from 'react';
import Image from 'next/image';
import logoLight from './assets/zemifix-logo-light.jpg';
import logoDark from './assets/zemifix-logo-dark.jpg';
import brandMark from './assets/zemifix-mark.jpg';

interface LogoProps {
  variant?: 'light' | 'dark' | 'icon';
  width?: number;
  height?: number;
  className?: string;
}

const logoAssets = {
  light: logoLight,
  dark: logoDark,
  icon: brandMark,
} as const;

export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  width,
  height,
  className = '',
}) => {
  const isIcon = variant === 'icon';
  const imageWidth = width ?? (isIcon ? 36 : 150);
  const imageHeight = height ?? (isIcon ? 36 : 58);

  return (
    <Image
      src={logoAssets[variant]}
      alt={isIcon ? 'ZemiFix' : 'ZemiFix CMMS'}
      width={imageWidth}
      height={imageHeight}
      unoptimized
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width: imageWidth, height: imageHeight }}
    />
  );
};
