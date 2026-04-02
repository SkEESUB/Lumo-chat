import React from 'react';

export default function Icon({ className = "w-8 h-8" }) {
  return (
    <svg 
      className={`drop-shadow-[0_0_15px_rgba(0,200,255,0.4)] ${className}`}
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lumoGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path d="M12 21c-1.66 0-3.2-.42-4.5-1.15L3 21l1.15-4.5C3.42 15.2 3 13.66 3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9z" stroke="url(#lumoGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8.5" cy="12" r="1.5" fill="url(#lumoGrad)"/>
      <circle cx="15.5" cy="12" r="1.5" fill="url(#lumoGrad)"/>
      <path d="M8.5 12L12 8.5L15.5 12" stroke="url(#lumoGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
