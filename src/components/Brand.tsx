import React from 'react';

interface BrandProps {
  className?: string;
  accent?: boolean;
}

export default function Brand({ className = "", accent = true }: BrandProps) {
  return (
    <span 
      className={`keinshop-brand ${accent ? 'keinshop-brand--accent' : ''} ${className}`} 
      translate="no"
      aria-label="KEINSHOP"
    >
      KEINSHOP
    </span>
  );
}
