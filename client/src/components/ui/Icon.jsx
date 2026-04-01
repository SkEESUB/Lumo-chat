import React from 'react';
import lumoIcon from '../../assets/lumo-icon.svg';

export default function Icon({ className = "w-8 h-8" }) {
  return (
    <img 
      src={lumoIcon} 
      alt="Lumo Icon" 
      className={`drop-shadow-[0_0_15px_rgba(0,200,255,0.6)] object-contain ${className}`}
    />
  );
}
