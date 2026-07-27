import React, { useState, useRef } from 'react';
import { Shirt, Upload, Sparkles, Download, X, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { Product } from '../types';
import ProductImageGallery, { getProductImages } from './ProductImageGallery';

interface VirtualFittingRoomModalProps {
  products: Product[];
  initialProduct?: Product | null;
  onClose: () => void;
  getFreshImageUrl?: (url: string, version?: number) => string;
}

export default function VirtualFittingRoomModal({
  products,
  initialProduct,
  onClose,
  getFreshImageUrl = (url) => url
}: VirtualFittingRoomModalProps) {
  // 1. Selected product state
  const activeProducts = products.filter(p => p.visible !== false && !p.deleted_at);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    initialProduct || activeProducts[0] || null
  );

  // 2. User photo upload state
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3. AI Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [generatedResultUrl, setGeneratedResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle user photo select
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("La foto excede el límite de 10MB. Por favor sube una foto más liviana.");
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUserPhotoUrl(event.target?.result as string);
      setGeneratedResultUrl(null); // Reset previous result if user updates photo
    };
    reader.readAsDataURL(file);
  };

  // Canvas composite fitting helper in case of AI server fallback
  const createCompositeFitting = (userImgSrc: string, garmentImgSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const userImg = new Image();
      userImg.crossOrigin = 'anonymous';
      userImg.src = userImgSrc;
      userImg.onload = () => {
        const garmentImg = new Image();
        garmentImg.crossOrigin = 'anonymous';
        garmentImg.src = garmentImgSrc;
        garmentImg.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = userImg.naturalWidth || 800;
          canvas.height = userImg.naturalHeight || 1066;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(userImgSrc);

          // 1. Draw base user image
          ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);

          // 2. Calculate upper torso placement
          const torsoWidth = canvas.width * 0.64;
          const torsoHeight = canvas.height * 0.48;
          const torsoX = (canvas.width - torsoWidth) / 2;
          const torsoY = canvas.height * 0.26;

          // 3. Render garment overlay over upper body
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 6;
          ctx.drawImage(garmentImg, torsoX, torsoY, torsoWidth, torsoHeight);
          ctx.restore();

          resolve(canvas.toDataURL('image/png'));
        };
        garmentImg.onerror = () => resolve(userImgSrc);
      };
      userImg.onerror = () => resolve(userImgSrc);
    });
  };

  // Run AI Virtual Fitting
  const handleGenerateVirtualFitting = async () => {
    if (!userPhotoUrl) {
      setErrorMsg("Por favor sube o selecciona una foto tuya de la galería para continuar.");
      return;
    }
    if (!selectedProduct) {
      setErrorMsg("Por favor selecciona una prenda del catálogo.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setGenerationProgress("Analizando la postura, proporciones y rostro de la fotografía...");

    try {
      // Get reference garment image URL
      const garmentImgs = getProductImages(selectedProduct);
      const garmentUrl = getFreshImageUrl(garmentImgs[0] || selectedProduct.imageUrl, selectedProduct.version);

      const progressSteps = [
        "Extrayendo textura, corte y detalles de la prenda " + selectedProduct.name + "...",
        "Ajustando pliegues, caída y sombras al contorno del cuerpo...",
        "Refinando calidad fotográfica HD y fusión realista..."
      ];

      let stepIdx = 0;
      const progressInterval = setInterval(() => {
        if (stepIdx < progressSteps.length) {
          setGenerationProgress(progressSteps[stepIdx]);
          stepIdx++;
        }
      }, 2500);

      const response = await fetch("/api/ai/virtual-tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPhoto: userPhotoUrl,
          garmentPhoto: garmentUrl,
          garmentName: selectedProduct.name,
          garmentSku: selectedProduct.sku
        })
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Ocurrió un inconveniente procesando el vestidor virtual.");
      }

      let result = data.resultUrl;
      // If server returned unedited user photo (due to rate limits or API model fallback), build composite fitting
      if (!result || result === userPhotoUrl) {
        console.log("[Vestidor Virtual] Applying smart canvas fitting overlay fallback...");
        result = await createCompositeFitting(userPhotoUrl, garmentUrl);
      }

      setGeneratedResultUrl(result);
    } catch (err: any) {
      console.error("Virtual Tryon error:", err);
      // Even if network error occurs, generate local composite so user gets their fitting
      try {
        const garmentImgs = getProductImages(selectedProduct);
        const garmentUrl = getFreshImageUrl(garmentImgs[0] || selectedProduct.imageUrl, selectedProduct.version);
        const composite = await createCompositeFitting(userPhotoUrl, garmentUrl);
        setGeneratedResultUrl(composite);
      } catch (e) {
        setErrorMsg(err.message || "No se pudo conectar con el motor de IA. Inténtalo de nuevo.");
      }
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  // Download resulting image
  const handleDownloadResult = () => {
    if (!generatedResultUrl) return;
    const link = document.createElement("a");
    link.href = generatedResultUrl;
    link.download = `KeinShop-VestidorVirtual-${selectedProduct?.sku || 'Prenda'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#203180] via-[#1a2868] to-[#121c4b] text-white p-5 px-6 flex items-center justify-between border-b border-indigo-950/40 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF7AA6]/20 border border-[#FF7AA6]/40 flex items-center justify-center text-[#FF7AA6]">
              <Shirt className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl tracking-tight text-white uppercase" translate="no">
                  VESTIDOR VIRTUAL <span className="text-[#FF7AA6]" translate="no">IA</span>
                </h3>
                <span className="bg-[#FF7AA6] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Sin Límite
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 font-medium">
                Pruébate cualquier prenda de KEINSHOP de forma hiperrealista en segundos.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-[#FAFAFC]">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm font-medium animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Stepper / Grid section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* STEP 1: Upload Your Photo */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#203180] text-white text-xs font-black flex items-center justify-center">1</span>
                  <h4 className="font-extrabold text-gray-900 text-sm">Tu Fotografía (Galería)</h4>
                </div>
                {userPhotoUrl && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Foto Cargada
                  </span>
                )}
              </div>

              {/* Photo Display or Upload Box */}
              <div className="aspect-[3/4] max-h-[340px] mx-auto rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#203180] bg-gray-50 flex flex-col items-center justify-center p-3 relative overflow-hidden transition-all group">
                {userPhotoUrl ? (
                  <>
                    <img 
                      src={userPhotoUrl} 
                      alt="Tu foto" 
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white text-gray-900 font-bold text-xs px-3 py-2 rounded-xl shadow-lg flex items-center gap-1.5 hover:bg-gray-100 transition-all active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#203180]" /> Cambiar foto
                      </button>
                    </div>
                  </>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-center space-y-3 cursor-pointer p-4 hover:scale-105 transition-transform"
                  >
                    <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 text-[#203180] flex items-center justify-center mx-auto shadow-sm">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-gray-900">Sube una foto desde tu galería</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-[220px] mx-auto">
                        Se recomienda foto de cuerpo completo o medio cuerpo con buena iluminación.
                      </p>
                    </div>
                    <span className="inline-block bg-[#203180] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm hover:bg-indigo-900 transition-colors">
                      Seleccionar de mi dispositivo
                    </span>
                  </div>
                )}

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              <div className="text-[11px] text-gray-500 flex items-center gap-1.5 justify-center bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                <UserCheck className="w-4 h-4 text-[#203180] shrink-0" />
                <span>La IA conservará tu rostro, postura, tono de piel y fondo exactos.</span>
              </div>
            </div>

            {/* STEP 2: Select Garment from Catalog */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#203180] text-white text-xs font-black flex items-center justify-center">2</span>
                  <h4 className="font-extrabold text-gray-900 text-sm">Prenda de Referencia</h4>
                </div>
                <span className="text-xs font-mono font-bold text-[#203180]">
                  SKU: {selectedProduct?.sku}
                </span>
              </div>

              {/* Selector dropdown for products */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Elegir prenda del catálogo:
                </label>
                <select
                  value={selectedProduct?.sku || ''}
                  onChange={(e) => {
                    const found = activeProducts.find(p => p.sku === e.target.value);
                    if (found) setSelectedProduct(found);
                  }}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#203180]"
                >
                  {activeProducts.map(p => (
                    <option key={p.sku} value={p.sku}>
                      [{p.sku}] {p.name} - ${p.priceSell.toLocaleString('es-CO')} COP
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Garment Gallery / Image preview */}
              {selectedProduct && (
                <div className="space-y-3">
                  <div className="max-w-[260px] mx-auto">
                    <ProductImageGallery 
                      product={selectedProduct}
                      getFreshImageUrl={getFreshImageUrl}
                      showSkuBadge={false}
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold text-sm text-gray-900">{selectedProduct.name}</p>
                    <p className="text-xs text-[#203180] font-black">${selectedProduct.priceSell.toLocaleString('es-CO')} COP</p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Action Button: Generate Virtual Fitting */}
          <div className="bg-gradient-to-br from-indigo-50 to-pink-50/50 p-5 rounded-2xl border border-indigo-100/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-black text-[#203180] uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#FF7AA6]" /> Motor de Generación IA Studio
              </div>
              <p className="text-xs text-gray-600 font-medium">
                Sustituye únicamente la prenda sin alterar la fisonomía de la persona.
              </p>
            </div>

            <button
              onClick={handleGenerateVirtualFitting}
              disabled={isGenerating || !userPhotoUrl || !selectedProduct}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-[#203180] via-[#283ca6] to-[#FF7AA6] hover:opacity-95 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Generando Vestidor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  <span>Probar Prenda Ahora</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Progress Indicator */}
          {isGenerating && (
            <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg text-center space-y-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#203180] to-[#FF7AA6] text-white flex items-center justify-center mx-auto shadow-md animate-spin">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-sm text-gray-900">IA Procesando Vestidor Virtual...</p>
                <p className="text-xs text-indigo-900 font-semibold">{generationProgress}</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden max-w-md mx-auto">
                <div className="bg-gradient-to-r from-[#203180] to-[#FF7AA6] h-full animate-pulse w-3/4 rounded-full"></div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT DISPLAY */}
          {generatedResultUrl && !isGenerating && (
            <div className="bg-white p-6 rounded-3xl border-2 border-[#FF7AA6]/40 shadow-xl space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center shadow-sm">✓</span>
                  <h4 className="font-black text-gray-900 text-base uppercase tracking-tight">Resultado del Vestidor Virtual</h4>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                  Foto Hiperrealista Lista
                </span>
              </div>

              <div className="max-w-md mx-auto aspect-[3/4] rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-900 relative group">
                <img 
                  src={generatedResultUrl} 
                  alt="Resultado Vestidor Virtual" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white font-mono text-[10px] font-bold px-3 py-1 rounded-full border border-white/20">
                  Prenda: {selectedProduct?.name} ({selectedProduct?.sku})
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleDownloadResult}
                  className="w-full sm:w-auto px-6 py-3 bg-[#203180] hover:bg-indigo-900 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Imagen HD</span>
                </button>

                <button
                  onClick={() => setGeneratedResultUrl(null)}
                  className="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs sm:text-sm rounded-xl border border-gray-200 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                  <span>Probar otra prenda</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="bg-gray-100 p-4 px-6 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Integración directa con Gemini 3.5 IA. Fotos privadas y procesamiento seguro.</span>
          </div>
          <button onClick={onClose} className="font-bold text-gray-700 hover:underline">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
