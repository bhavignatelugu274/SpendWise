import React, { useState } from 'react';
import { Wallet } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#101827] via-[#151F30] to-[#070B14] border border-white/10 text-[#94A3B8] p-6 ${className}`}
      >
        <Wallet className="w-8 h-8 text-[#25E0A4]/70 mb-2" aria-hidden="true" />
        <span className="text-xs font-medium text-[#94A3B8] text-center">
          {fallbackTitle ?? alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
