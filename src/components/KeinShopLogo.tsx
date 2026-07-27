import React from 'react';

export default function KeinShopLogo({ className = "w-28 h-28" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pink Circle */}
      <circle cx="250" cy="250" r="230" fill="#FF7AA6" stroke="#203180" strokeWidth="4" />
      
      {/* Red Stars */}
      {/* Left Star */}
      <path d="M 160,110 L 165,123 L 178,123 L 168,131 L 172,144 L 160,136 L 148,144 L 152,131 L 142,123 L 155,123 Z" fill="#C80C0C" />
      {/* Right Star */}
      <path d="M 400,240 L 405,253 L 418,253 L 408,261 L 412,274 L 400,266 L 388,274 L 392,261 L 382,253 L 395,253 Z" fill="#C80C0C" />

      {/* Curved Text Path for KEIN SHOP */}
      <path id="curve-logo-text" d="M 100,165 A 175,175 0 0,1 400,165" fill="none" />
      <text fill="#FFFFFF" fontSize="56" fontWeight="900" fontFamily="'Inter', system-ui, sans-serif" letterSpacing="4">
        <textPath href="#curve-logo-text" startOffset="50%" textAnchor="middle">
          KEIN SHOP
        </textPath>
      </text>

      {/* Couple Illustration */}
      {/* BOY (Left) */}
      <g id="boy-illustration">
        {/* Hair Back */}
        <path d="M 90,320 C 70,270 100,180 180,180 C 220,180 230,210 230,230 C 210,240 190,240 170,230 C 130,250 110,280 90,320 Z" fill="#1C1B1F" />
        {/* Face Profile (Neck, Cheek, Ear) */}
        <path d="M 110,330 C 110,280 160,220 215,220 C 220,245 210,270 190,290 C 180,310 185,325 195,335 C 170,345 130,345 110,330 Z" fill="#F5C3A6" />
        {/* Ear */}
        <circle cx="145" cy="275" r="14" fill="#F5C3A6" stroke="#E5A686" strokeWidth="2" />
        <path d="M 142,270 C 142,270 147,272 145,278" stroke="#E5A686" strokeWidth="2" strokeLinecap="round" />
        {/* Hair Front Details */}
        <path d="M 95,290 C 85,250 115,200 165,190 C 150,180 185,185 205,205 C 190,205 215,215 220,230" fill="#1C1B1F" />
        {/* Collar & Shirt */}
        <path d="M 110,330 L 140,320 L 155,345 L 175,325 L 195,335 L 205,430 L 95,430 Z" fill="#E2E8F0" />
        <path d="M 140,320 L 160,355" stroke="#94A3B8" strokeWidth="3" />
        <path d="M 175,325 L 160,355" stroke="#94A3B8" strokeWidth="3" />
        {/* Closed Eye */}
        <path d="M 185,248 Q 193,253 198,248" stroke="#1C1B1F" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* Eyebrow */}
        <path d="M 180,238 Q 193,241 202,234" stroke="#1C1B1F" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>

      {/* GIRL (Right) */}
      <g id="girl-illustration">
        {/* Bun Hair */}
        <circle cx="340" cy="220" r="36" fill="#2C2321" />
        {/* Main Hair Volume */}
        <path d="M 245,340 C 240,300 255,240 305,230 C 355,220 365,260 360,300 C 350,330 325,360 295,355 C 275,355 255,350 245,340 Z" fill="#2C2321" />
        {/* Face & Neck Profile */}
        <path d="M 255,340 C 250,290 280,245 320,245 C 345,245 345,280 335,310 C 320,335 315,355 315,365 C 295,365 270,360 255,340 Z" fill="#F9D4B8" />
        {/* Closed Eye */}
        <path d="M 285,270 Q 295,275 305,270" stroke="#1C1B1F" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* Eyelashes */}
        <path d="M 290,271 L 286,277" stroke="#1C1B1F" strokeWidth="2" strokeLinecap="round" />
        <path d="M 297,273 L 295,280" stroke="#1C1B1F" strokeWidth="2" strokeLinecap="round" />
        <path d="M 303,271 L 305,277" stroke="#1C1B1F" strokeWidth="2" strokeLinecap="round" />
        {/* Blushing cheek */}
        <ellipse cx="310" cy="290" rx="15" ry="10" fill="#FF7AA6" opacity="0.4" />
        {/* Hoodie */}
        <path d="M 235,360 L 275,345 L 285,370 L 310,350 L 340,370 L 350,430 L 225,430 Z" fill="#F8FAFC" />
        {/* Hoodie strings */}
        <path d="M 285,370 L 280,410" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round" />
        <path d="M 310,350 L 313,405" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
