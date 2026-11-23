import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <div className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Outer wallet / coin contour */}
        <rect
          x="2.5"
          y="4.5"
          width="31"
          height="27"
          rx="8"
          fill="#101827"
          stroke="url(#spendwise-border)"
          strokeWidth="1.5"
        />
        {/* Subtle coin arc */}
        <circle
          cx="25.5"
          cy="11.5"
          r="4"
          stroke="#E7C68C"
          strokeWidth="1.4"
          strokeOpacity="0.85"
        />
        {/* Financial pulse + upward data trend */}
        <path
          d="M7 22.5H11.5L14.5 16L18.2 24.5L22.2 14L26 18.2L29.5 13"
          stroke="url(#spendwise-pulse)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="spendwise-border" x1="2.5" y1="4.5" x2="33.5" y2="31.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#25E0A4" stopOpacity="0.65" />
            <stop offset="1" stopColor="#6E8BFF" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="spendwise-pulse" x1="7" y1="24" x2="29.5" y2="13" gradientUnits="userSpaceOnUse">
            <stop stopColor="#25E0A4" />
            <stop offset="1" stopColor="#6E8BFF" />
          </linearGradient>
        </defs>
      </svg>
      <span className="font-display text-lg font-bold tracking-tight text-[#F6F8FC] whitespace-nowrap">
        SPENDWISE <span className="text-[#25E0A4]">AI</span>
      </span>
    </div>
  );
};
