import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { Product } from '../types';

const DEFAULT_FALLBACK_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 24 24' fill='none' stroke='%23CCCCCC' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' style='background:%23F3F4F6;'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";

export function getProductImages(product: Product | null | undefined): string[] {
  if (!product) return [];

  const urls: string[] = [];
  const seen = new Set<string>();

  const addUrl = (rawUrl?: string) => {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    const trimmed = rawUrl.trim();
    if (!trimmed) return;

    // Use string without query params for deduplication comparison
    const baseKey = trimmed.split('?')[0];
    if (!seen.has(baseKey) && !seen.has(trimmed)) {
      seen.add(baseKey);
      seen.add(trimmed);
      urls.push(trimmed);
    }
  };

  // Primary imageUrl
  addUrl(product.imageUrl);

  // images array
  if (Array.isArray(product.images) && product.images.length > 0) {
    const sorted = [...product.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    sorted.forEach(img => {
      if (typeof img === 'string') {
        addUrl(img);
      } else if (img && typeof img.url === 'string') {
        addUrl(img.url);
      }
    });
  }

  // photos array
  if (Array.isArray((product as any).photos)) {
    (product as any).photos.forEach((ph: any) => {
      if (typeof ph === 'string') addUrl(ph);
    });
  }

  return urls;
}

interface ProductImageGalleryProps {
  product: Product;
  getFreshImageUrl?: (url: string, version?: number) => string;
  handleImageError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  showSkuBadge?: boolean;
}

export default function ProductImageGallery({
  product,
  getFreshImageUrl = (url) => url || DEFAULT_FALLBACK_IMAGE,
  handleImageError = (e) => { e.currentTarget.src = DEFAULT_FALLBACK_IMAGE; },
  showSkuBadge = true
}: ProductImageGalleryProps) {
  const images = getProductImages(product);
  const displayImages = images.length > 0 ? images : [DEFAULT_FALLBACK_IMAGE];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index when product changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [product?.sku]);

  // Touch Swipe Handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 35; // px

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    
    // User swiped left (finger moved left) -> go to NEXT image
    if (distance > minSwipeDistance) {
      if (displayImages.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % displayImages.length);
      }
    } 
    // User swiped right (finger moved right) -> go to PREVIOUS image
    else if (distance < -minSwipeDistance) {
      if (displayImages.length > 1) {
        setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
      }
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayImages.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayImages.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % displayImages.length);
    }
  };

  const currentImgUrl = getFreshImageUrl(displayImages[currentIndex], product.version);

  return (
    <div className="flex flex-col gap-3">
      {/* Main Image Viewport with Touch Swipe & Navigation Controls */}
      <div 
        className="aspect-square rounded-2xl overflow-hidden border border-gray-150 bg-gray-50 shadow-inner relative group select-none touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img 
          src={currentImgUrl} 
          alt={`${product.name} - Foto ${currentIndex + 1}`} 
          className="w-full h-full object-cover transition-all duration-300"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />

        {/* Top-Left SKU Badge */}
        {showSkuBadge && (
          <div className="absolute top-3 left-3 bg-[#203180] text-white font-mono text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md z-10">
            SKU: {product.sku}
          </div>
        )}

        {/* Top-Right Image Counter Badge (if multiple images) */}
        {displayImages.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white font-mono text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md z-10 flex items-center gap-1 border border-white/20">
            <ImageIcon className="w-3 h-3 text-[#FF7AA6]" />
            <span>{currentIndex + 1} / {displayImages.length}</span>
          </div>
        )}

        {/* Navigation Arrows (if multiple images) */}
        {displayImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 hover:bg-white text-gray-900 rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-20"
              title="Foto anterior"
              aria-label="Ver foto anterior"
            >
              <ChevronLeft className="w-5 h-5 text-[#203180]" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 hover:bg-white text-gray-900 rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-20"
              title="Siguiente foto"
              aria-label="Ver siguiente foto"
            >
              <ChevronRight className="w-5 h-5 text-[#203180]" />
            </button>
          </>
        )}

        {/* Bottom Swipe Hint Overlay for Touch Devices */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none z-10">
            <span className="bg-black/60 backdrop-blur-sm text-white/90 text-[9px] font-bold px-3 py-1 rounded-full border border-white/10 shadow-sm flex items-center gap-1">
              👈 Desliza o usa las flechas ({displayImages.length} fotos) 👉
            </span>
          </div>
        )}
      </div>

      {/* Thumbnails Row (if multiple images) */}
      {displayImages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-gray-300">
          {displayImages.map((imgUrl, idx) => {
            const isSelected = idx === currentIndex;
            const thumbUrl = getFreshImageUrl(imgUrl, product.version);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all duration-200 relative ${
                  isSelected 
                    ? 'border-[#203180] ring-2 ring-[#203180]/30 scale-105 shadow-md' 
                    : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-400'
                }`}
                aria-label={`Ver foto ${idx + 1}`}
              >
                <img 
                  src={thumbUrl} 
                  alt={`${product.name} miniatura ${idx + 1}`} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={handleImageError}
                />
                {isSelected && (
                  <span className="absolute inset-0 border-2 border-[#203180] rounded-xl pointer-events-none"></span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
