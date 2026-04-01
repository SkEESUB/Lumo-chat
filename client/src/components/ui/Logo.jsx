import React from 'react';
import lumoLogo from '../../assets/lumo-logo.svg';

export default function Logo({ className = "w-20 md:w-32 lg:w-40" }) {
  return (
    <img 
      src={lumoLogo} 
      alt="Lumo Logo" 
      className={`drop-shadow-[0_0_15px_rgba(0,200,255,0.6)] object-contain transition-all duration-300 ${className}`}
    />
  );
}
