import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

interface FallbackImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  alt?: string;
  fallbackSrc?: string;
}

export function FallbackImage({
  src,
  alt = "Imagen",
  fallbackSrc,
  className = "w-full h-full object-cover",
  ...props
}: FallbackImageProps) {
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);

  const defaultFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 24 24' fill='none' stroke='%23CCCCCC' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' style='background:%23F3F4F6;'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";
  const finalFallback = fallbackSrc || defaultFallback;

  useEffect(() => {
    setError(false);
    if (!src) {
      setCurrentSrc(finalFallback);
    } else {
      setCurrentSrc(src);
    }
  }, [src, finalFallback]);

  const handleError = () => {
    if (error) return; // Prevent infinite loops
    setError(true);
    setCurrentSrc(finalFallback);
  };

  if (!currentSrc || currentSrc === finalFallback) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-50 border border-gray-150 rounded-xl p-4 text-gray-400 select-none ${className}`}>
        <ImageOff className="w-8 h-8 mb-1.5 stroke-[1.25] text-gray-300" />
        <span className="text-[10px] font-mono tracking-wider uppercase text-gray-400">Sin Imagen</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      onError={handleError}
      className={className}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
}
