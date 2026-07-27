import React, { useState } from 'react';
import { 
  Share2, 
  Download, 
  ExternalLink, 
  Search, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  Tag, 
  DollarSign, 
  Sparkles,
  Shirt,
  Printer,
  X,
  ArrowLeft
} from 'lucide-react';
import { Product, UserRole } from '../types';
import { getPublicOrigin } from '../lib/urlHelper';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PublicCatalog from './PublicCatalog';
import ProductImageGallery from './ProductImageGallery';
import VirtualFittingRoomModal from './VirtualFittingRoomModal';

interface CatalogoProps {
  products: Product[];
  onToggleVisibility: (sku: string) => void;
  role: UserRole;
}

const DEFAULT_FALLBACK_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 24 24' fill='none' stroke='%23CCCCCC' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' style='background:%23F3F4F6;'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";

const getFreshImageUrl = (url: string, version?: number) => {
  if (!url) return DEFAULT_FALLBACK_IMAGE;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (!version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${version}`;
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.onerror = null;
  const src = e.currentTarget.src;
  if (src && !src.includes("retry=") && !src.startsWith("data:")) {
    const separator = src.includes("?") ? "&" : "?";
    e.currentTarget.src = `${src}${separator}retry=${Date.now()}`;
  } else {
    e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
  }
};

const createFallbackCanvasDataUrl = (): string => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F3F4F6';
      ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = '#203180';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KEINSHOP', 150, 140);
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '12px sans-serif';
      ctx.fillText('Imagen no disponible', 150, 170);
      return canvas.toDataURL('image/jpeg', 0.9);
    }
  } catch (e) {
    console.warn("Error creating canvas fallback image:", e);
  }
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
};

const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
  const fallback = createFallbackCanvasDataUrl();
  if (!imageUrl) return fallback;
  if (imageUrl.startsWith('data:image/')) return imageUrl;

  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || fallback);
        reader.onerror = () => resolve(fallback);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn("CORS fetch failed for URL:", imageUrl, err);
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(fallback), 3000);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 300;
        canvas.height = img.naturalHeight || 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
          return;
        }
      } catch (e) {
        console.warn("Canvas conversion error (tainted image):", e);
      }
      resolve(fallback);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(fallback);
    };
    img.src = imageUrl;
  });
};

export default function Catalogo({ products, onToggleVisibility, role }: CatalogoProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [copied, setCopied] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showPublicOverlay, setShowPublicOverlay] = useState(false);
  const [showFittingRoom, setShowFittingRoom] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const generateDirectPdfPresentation = async (visibleProds: Product[]) => {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    
    // Cover Page
    pdf.setFillColor(32, 49, 128); // #203180
    pdf.rect(0, 0, 210, 297, 'F');

    // Accent Palette Lines
    pdf.setFillColor(255, 122, 166); // #FF7AA6
    pdf.rect(0, 0, 52.5, 4, 'F');
    pdf.setFillColor(200, 12, 12); // #C80C0C
    pdf.rect(52.5, 0, 52.5, 4, 'F');
    pdf.setFillColor(170, 170, 170);
    pdf.rect(105, 0, 52.5, 4, 'F');
    pdf.setFillColor(32, 49, 128);
    pdf.rect(157.5, 0, 52.5, 4, 'F');

    // Brand Title & Banner
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(26);
    pdf.text("CATÁLOGO OFICIAL KEINSHOP", 105, 80, { align: 'center' });

    pdf.setFontSize(14);
    pdf.setTextColor(255, 122, 166);
    pdf.text("COLECCIÓN Y PRESENTACIÓN DE PRENDAS", 105, 95, { align: 'center' });

    pdf.setFontSize(11);
    pdf.setTextColor(220, 225, 255);
    pdf.text("Comercialización y pedidos especiales", 105, 110, { align: 'center' });
    pdf.text("Otavalo, Ecuador • WhatsApp: +593 99 910 6921", 105, 118, { align: 'center' });
    pdf.text("keinshop.1102@gmail.com", 105, 126, { align: 'center' });

    pdf.setDrawColor(255, 122, 166);
    pdf.setLineWidth(0.5);
    pdf.line(40, 140, 170, 140);

    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`Total de prendas catalogadas: ${visibleProds.length}`, 105, 155, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(200, 200, 220);
    pdf.text("Innovando desde 2023 • Tu estilo, tu marca, tu KEINSHOP", 105, 165, { align: 'center' });

    // Grid pages (4 items per A4 page)
    const itemsPerPage = 4;
    for (let i = 0; i < visibleProds.length; i += itemsPerPage) {
      const chunk = visibleProds.slice(i, i + itemsPerPage);
      pdf.addPage();

      // Page Header
      pdf.setFillColor(245, 247, 250);
      pdf.rect(0, 0, 210, 22, 'F');
      pdf.setDrawColor(32, 49, 128);
      pdf.setLineWidth(0.8);
      pdf.line(0, 22, 210, 22);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(32, 49, 128);
      pdf.text("CATÁLOGO KEINSHOP — PRESENTACIÓN OFICIAL DE PRODUCTOS", 15, 14);

      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Página ${Math.floor(i / itemsPerPage) + 2}`, 195, 14, { align: 'right' });

      // Render 4 grid slots
      for (let j = 0; j < chunk.length; j++) {
        const p = chunk[j];
        const col = j % 2;
        const row = Math.floor(j / 2);
        const x = 15 + col * 92;
        const y = 30 + row * 118;

        // Card Border Container
        pdf.setDrawColor(220, 225, 230);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, y, 88, 110, 3, 3, 'FD');

        // Image embedding
        const freshUrl = getFreshImageUrl(p.imageUrl, p.version);
        const b64 = await getBase64ImageFromUrl(freshUrl);
        if (b64 && b64.startsWith('data:image/')) {
          try {
            const format = b64.includes('image/png') ? 'PNG' : 'JPEG';
            pdf.addImage(b64, format, x + 4, y + 4, 80, 60);
          } catch (imgErr) {
            console.warn("Failed to embed image in pdf:", imgErr);
          }
        }

        // Product text metadata
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(20, 20, 20);
        pdf.text(p.name.substring(0, 28), x + 4, y + 71);

        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`SKU: ${p.sku} | Categoría: ${p.category || 'General'}`, x + 4, y + 77);

        pdf.setFontSize(12);
        pdf.setTextColor(32, 49, 128);
        pdf.text(`$${p.priceSell.toLocaleString('es-CO')} USD/COP`, x + 4, y + 86);

        pdf.setFontSize(8);
        if (p.stock > 0) {
          pdf.setTextColor(30, 120, 50);
          pdf.text(`Stock Disponible: ${p.stock} u.`, x + 4, y + 92);
        } else {
          pdf.setTextColor(180, 30, 30);
          pdf.text('Agotado', x + 4, y + 92);
        }

        if (p.sizes && p.sizes.length > 0) {
          pdf.setTextColor(80, 80, 80);
          pdf.text(`Tallas: ${p.sizes.join(', ')}`, x + 4, y + 98);
        }
        if (p.colors && p.colors.length > 0) {
          pdf.setTextColor(80, 80, 80);
          pdf.text(`Colores: ${p.colors.join(', ')}`, x + 4, y + 104);
        }
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text("KEINSHOP Otavalo, Ecuador • Atención WhatsApp: +593 99 910 6921", 105, 288, { align: 'center' });
    }

    // Index Page
    pdf.addPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(32, 49, 128);
    pdf.text("ÍNDICE Y LISTADO GENERAL DE PRODUCTOS", 15, 20);

    let curY = 32;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text("SKU", 15, curY);
    pdf.text("Producto", 45, curY);
    pdf.text("Categoría", 120, curY);
    pdf.text("Precio", 165, curY);
    pdf.text("Stock", 195, curY, { align: 'right' });
    curY += 4;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(15, curY, 195, curY);
    curY += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40, 40, 40);
    visibleProds.forEach((p) => {
      if (curY > 275) {
        pdf.addPage();
        curY = 20;
      }
      pdf.text(p.sku, 15, curY);
      pdf.text(p.name.substring(0, 32), 45, curY);
      pdf.text(p.category || 'General', 120, curY);
      pdf.text(`$${p.priceSell.toLocaleString('es-CO')}`, 165, curY);
      pdf.text(`${p.stock}`, 195, curY, { align: 'right' });
      curY += 6;
    });

    pdf.save(`Catalogo_Oficial_KEINSHOP_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleDownloadPDF = async () => {
    const visibleProducts = products.filter(p => p.visible);
    if (visibleProducts.length === 0) {
      alert("No hay productos visibles en el catálogo para exportar.");
      return;
    }

    setDownloadingPdf(true);

    try {
      await generateDirectPdfPresentation(visibleProducts);
    } catch (err) {
      console.error("Critical error generating PDF presentation:", err);
      alert("Ocurrió un inconveniente al generar el PDF. Por favor verifique sus datos e reintente.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopyLink = () => {
    const publicLink = `${getPublicOrigin()}${window.location.pathname}?view=catalog`;
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = ['Todos', 'Mujer', 'Accesorios', 'Hombre', 'Unisex', 'Otros'];

  const filteredProducts = products.filter(p => {
    // Gestor or Admin can see all to toggle, but a basic catalog customer view would filter by visible: true.
    // However, this CRM component should show editable visibility!
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top action bar: Share link and simulated public visibility */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-[#050507]">Catálogo Digital Editable KEINSHOP</h2>
          <p className="text-xs text-gray-500 mt-1">Activa visibilidades y comparte el catálogo interactivo directo con clientes.</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Vestidor Virtual IA */}
          <button
            onClick={() => setShowFittingRoom(true)}
            className="bg-gradient-to-r from-[#203180] to-indigo-900 hover:from-indigo-900 hover:to-[#203180] text-white font-extrabold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-indigo-900/20 border border-indigo-700/50"
          >
            <Shirt className="w-4 h-4 text-[#FF7AA6]" /> Vestidor Virtual IA
          </button>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="bg-indigo-50 hover:bg-indigo-100 text-[#203180] font-extrabold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 border border-indigo-100 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? '¡Copiado!' : 'Copiar Link Público'}
          </button>

          {/* Open in new tab */}
          <a
            href="?view=catalog"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 border border-gray-200 transition-all active:scale-95"
          >
            <ExternalLink className="w-4 h-4" /> Abrir Vista Pública (Nueva Pestaña)
          </a>

          {/* Download & Preview Catalog PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPdf}
            className="bg-[#FF7AA6] hover:bg-pink-600 text-white font-extrabold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-sm disabled:opacity-50"
          >
            {downloadingPdf ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Generando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Descargar Catálogo PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid search filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar en el catálogo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat 
                  ? 'bg-[#203180] text-white' 
                  : 'bg-gray-150 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Cards Grid (3 Products per row) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-5">
        {filteredProducts.map((p) => (
          <div 
            key={p.sku} 
            onClick={() => setSelectedProduct(p)}
            className={`bg-white rounded-2xl sm:rounded-3xl overflow-hidden border transition-all duration-200 shadow-sm hover:shadow-lg hover:border-[#203180]/30 cursor-pointer flex flex-col justify-between ${
              p.visible ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-75'
            }`}
          >
            
            <div className="relative aspect-square bg-gray-50 overflow-hidden">
              <img 
                src={getFreshImageUrl(p.imageUrl, p.version)} 
                alt={p.name} 
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                referrerPolicy="no-referrer"
                onError={handleImageError}
              />
              
              <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-col gap-0.5">
                <span className="bg-[#203180] text-white font-mono text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm">
                  {p.sku}
                </span>
              </div>

              {/* Quick toggle visibility overlay for editor roles */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(p.sku); }}
                disabled={role === 'Vendedor'}
                className={`absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 p-1.5 rounded-full shadow-md transition-all ${
                  p.visible ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'
                }`}
                title={p.visible ? "Ocultar del catálogo público" : "Mostrar en catálogo público"}
              >
                {p.visible ? <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </button>
            </div>

            <div className="p-2 sm:p-3 md:p-4 space-y-1 sm:space-y-2 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-gray-900 line-clamp-1 text-xs sm:text-sm">{p.name}</h4>
                <span className="text-xs sm:text-sm md:text-base font-black text-[#203180] font-mono block mt-0.5">
                  ${p.priceSell.toLocaleString('es-CO')}
                </span>
              </div>

              <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs text-gray-500 font-medium">
                <span className="font-mono">Stock: {p.stock} u.</span>
                <span className="text-[#203180] font-bold flex items-center gap-0.5">
                  Ver detalles →
                </span>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Admin Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <span className="text-xs font-black uppercase text-[#203180] tracking-widest flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Detalle de Producto en Catálogo
              </span>
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="p-1 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-200 transition-all"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <ProductImageGallery 
                  product={selectedProduct}
                  getFreshImageUrl={getFreshImageUrl}
                  handleImageError={handleImageError}
                />

                <div className="space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="bg-indigo-50 text-[#203180] font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                      {selectedProduct.category}
                    </span>
                    <h3 className="font-black text-lg text-gray-900 leading-snug">{selectedProduct.name}</h3>
                    
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Precio de Venta</span>
                      <span className="text-2xl font-black text-[#203180] font-mono">
                        ${selectedProduct.priceSell.toLocaleString('es-CO')} <span className="text-xs text-gray-400 font-sans font-medium">COP</span>
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-100 space-y-1 text-xs">
                      <p className="text-gray-600 leading-relaxed">
                        {selectedProduct.description || "Sin descripción adicional configurada."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-medium">Stock disponible:</span>
                      <span className="font-bold font-mono text-gray-900">{selectedProduct.stock} unidades</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-medium">Estado en catálogo público:</span>
                      <span className={`font-bold ${selectedProduct.visible ? 'text-green-600' : 'text-amber-600'}`}>
                        {selectedProduct.visible ? 'Visible al público' : 'Oculto / Borrador'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                <div className="space-y-1.5 pt-3 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase">Tallas disponibles:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.sizes.map(size => (
                      <span key={size} className="px-2.5 py-1 bg-gray-100 text-gray-700 font-bold text-xs rounded-lg">
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-500 uppercase">Colores disponibles:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.colors.map(color => (
                      <span key={color} className="px-2.5 py-1 bg-indigo-50 text-[#203180] font-bold text-xs rounded-lg">
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2 items-center justify-between flex-shrink-0">
              <button
                onClick={() => {
                  setShowFittingRoom(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#203180] to-indigo-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Shirt className="w-4 h-4 text-[#FF7AA6]" /> Vestidor Virtual
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onToggleVisibility(selectedProduct.sku);
                    setSelectedProduct(prev => prev ? { ...prev, visible: !prev.visible } : null);
                  }}
                  disabled={role === 'Vendedor'}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    selectedProduct.visible 
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {selectedProduct.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {selectedProduct.visible ? 'Ocultar' : 'Hacer Visible'}
                </button>

                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-5 py-2 bg-[#203180] text-white rounded-xl text-xs font-bold hover:bg-indigo-900 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Simulated Public Catalog PDF Export Overlay */}
      {showExportPreview && (() => {
        const visibleProds = products.filter(p => p.visible);
        const PRODUCTS_PER_PAGE = 4;
        const pageChunks: Product[][] = [];
        for (let i = 0; i < visibleProds.length; i += PRODUCTS_PER_PAGE) {
          pageChunks.push(visibleProds.slice(i, i + PRODUCTS_PER_PAGE));
        }
        const totalBookletPages = 2 + pageChunks.length;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
              
              <div className="p-4 bg-[#203180] text-white flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Printer className="w-5 h-5 text-[#FF7AA6]" />
                  <h3 className="font-bold">Editor de Catálogo Impreso (Librito de {totalBookletPages} Páginas)</h3>
                </div>
                <button 
                  onClick={() => setShowExportPreview(false)}
                  className="text-white hover:bg-indigo-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-white/20"
                >
                  Cerrar
                </button>
              </div>

              {/* Document sheet view */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-200/80 flex flex-col items-center space-y-8">
                
                {/* --- PÁGINA 1: PORTADA --- */}
                <div className="pdf-booklet-page w-[794px] h-[1123px] bg-gradient-to-br from-[#050507] via-[#203180] to-[#050507] text-white p-12 rounded-xl shadow-2xl flex flex-col justify-between relative overflow-hidden font-sans border border-gray-800 shrink-0">
                  <div className="absolute top-0 left-0 right-0 h-3 flex">
                    <div className="h-full w-1/4 bg-[#203180]"></div>
                    <div className="h-full w-1/4 bg-[#FF7AA6]"></div>
                    <div className="h-full w-1/4 bg-[#C80C0C]"></div>
                    <div className="h-full w-1/4 bg-[#AAAAAA]"></div>
                  </div>

                  <div className="pt-8 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-6 shadow-2xl">
                      <span className="text-3xl font-black text-[#FF7AA6] tracking-widest uppercase">KS</span>
                    </div>

                    <span className="bg-[#FF7AA6] text-white text-xs font-black uppercase px-4 py-1.5 rounded-full tracking-widest mb-4 shadow-sm">
                      PUBLICACIÓN OFICIAL DE PRODUCTOS
                    </span>

                    <h1 className="text-4xl font-black text-white tracking-wider uppercase mb-3">
                      CATÁLOGO OFICIAL <span className="text-[#FF7AA6]" translate="no">KEINSHOP</span>
                    </h1>

                    <p className="text-indigo-100 font-bold text-lg max-w-lg mb-2">
                      Comercialización y pedidos especiales
                    </p>

                    <div className="flex items-center gap-3 text-indigo-200 text-sm font-mono mb-6">
                      <span>Otavalo, Ecuador</span>
                      <span>•</span>
                      <span>keinshop.1102@gmail.com</span>
                    </div>

                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-white/10 border border-white/15 text-white text-sm font-semibold mb-8">
                      <Sparkles className="w-4 h-4 text-[#FF7AA6]" />
                      <span>Innovando desde 2023</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full max-w-lg pt-8 border-t border-white/15 text-xs">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-[#FF7AA6] font-mono font-black text-2xl block">
                          {visibleProds.length}
                        </span>
                        <span className="text-gray-300 text-[10px] uppercase font-bold">Total de prendas</span>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-indigo-300 font-mono font-black text-2xl block">
                          {pageChunks.length}
                        </span>
                        <span className="text-gray-300 text-[10px] uppercase font-bold">Páginas de prendas</span>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-emerald-400 font-mono font-black text-2xl block">100%</span>
                        <span className="text-gray-300 text-[10px] uppercase font-bold">Sincronizado</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between text-xs text-indigo-100">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span>Atención Directa WhatsApp: +593 99 910 6921</span>
                    </div>
                    <span className="font-mono text-gray-300">Página 1 de {totalBookletPages}</span>
                  </div>
                </div>

                {/* --- PÁGINAS DEL CUERPO (4 PRODUCTOS POR PÁGINA) --- */}
                {pageChunks.map((chunk, pageIdx) => {
                  const currentPageNum = pageIdx + 2;
                  return (
                    <div key={`page-${pageIdx}`} className="pdf-booklet-page w-[794px] h-[1123px] bg-white p-8 rounded-xl shadow-2xl flex flex-col justify-between font-sans text-xs border border-gray-200 shrink-0">
                      
                      <div>
                        <div className="flex items-center justify-between border-b-2 border-[#203180] pb-3 mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#203180] text-white flex items-center justify-center font-black text-sm">
                              KS
                            </div>
                            <div>
                              <h2 className="text-sm font-black text-[#203180] uppercase tracking-wide">
                                CATÁLOGO KEINSHOP — COLECCIÓN ACTIVA
                              </h2>
                              <p className="text-[10px] text-gray-500 font-medium">
                                Otavalo, Ecuador • Comercialización y pedidos especiales
                              </p>
                            </div>
                          </div>
                          <span className="bg-indigo-50 text-[#203180] font-black text-[10px] px-3 py-1 rounded-full border border-indigo-100">
                            Página {currentPageNum} de {totalBookletPages}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                          {chunk.map((p) => (
                            <div key={p.sku} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs h-[420px]">
                              <div>
                                <div className="aspect-square w-full bg-gray-50 rounded-xl overflow-hidden border border-gray-100 mb-3 relative">
                                  <img 
                                    src={getFreshImageUrl(p.imageUrl, p.version)} 
                                    alt={p.name}
                                    data-product-sku={p.sku}
                                    className="w-full h-full object-cover" 
                                    onError={handleImageError}
                                  />
                                  <span className="absolute top-2 left-2 bg-[#203180] text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md">
                                    {p.sku}
                                  </span>
                                  <span className="absolute top-2 right-2 bg-[#FF7AA6] text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md uppercase">
                                    {p.category || 'General'}
                                  </span>
                                </div>

                                <h4 className="font-extrabold text-gray-900 text-sm line-clamp-1 leading-tight">{p.name}</h4>

                                <div className="mt-2 flex items-baseline justify-between">
                                  <div>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase block">Precio Oficial</span>
                                    <span className="text-base font-black text-[#203180] font-mono">
                                      ${p.priceSell.toLocaleString('es-CO')} <span className="text-[9px] font-sans text-gray-400">COP/USD</span>
                                    </span>
                                  </div>
                                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${p.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                                    {p.stock > 0 ? `Stock: ${p.stock}` : 'Agotado'}
                                  </span>
                                </div>

                                {(p.sizes?.length > 0 || p.colors?.length > 0) && (
                                  <div className="text-[9px] text-gray-600 space-y-0.5 pt-2 mt-2 border-t border-gray-100">
                                    {p.sizes?.length > 0 && (
                                      <div className="truncate"><span className="font-bold text-gray-800">Tallas:</span> {p.sizes.join(', ')}</div>
                                    )}
                                    {p.colors?.length > 0 && (
                                      <div className="truncate"><span className="font-bold text-gray-800">Colores:</span> {p.colors.join(', ')}</div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[9px] text-gray-400 font-medium">
                                <span>Ref: {p.sku}</span>
                                <span className="text-[#203180] font-bold">KEINSHOP Ecuador</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500">
                        <span>Atención Directa WhatsApp: +593 99 910 6921</span>
                        <span>Otavalo, Ecuador</span>
                        <span className="font-mono">Página {currentPageNum} de {totalBookletPages}</span>
                      </div>
                    </div>
                  );
                })}

                {/* --- PÁGINA FINAL: ÍNDICE Y CIERRE DE MARCA --- */}
                <div className="pdf-booklet-page w-[794px] h-[1123px] bg-white p-8 rounded-xl shadow-2xl flex flex-col justify-between font-sans text-xs border border-gray-200 shrink-0">
                  <div>
                    <div className="flex items-center justify-between border-b-2 border-[#203180] pb-3 mb-6">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#203180]"></span>
                        <h2 className="text-sm font-black text-[#203180] uppercase tracking-wide">
                          ÍNDICE GENERAL DE PRODUCTOS Y REFERENCIAS
                        </h2>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Total Prendas: {visibleProds.length}
                      </span>
                    </div>

                    <div className="mb-8 overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-left text-[10px]">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-600 uppercase font-extrabold bg-gray-100">
                            <th className="py-2 px-3">SKU</th>
                            <th className="py-2 px-3">Prenda</th>
                            <th className="py-2 px-3">Categoría</th>
                            <th className="py-2 px-3 text-right">Precio</th>
                            <th className="py-2 px-3 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/60">
                          {visibleProds.map((p) => (
                            <tr key={p.sku} className="hover:bg-gray-50">
                              <td className="py-2 px-3 font-mono font-bold text-[#203180]">{p.sku}</td>
                              <td className="py-2 px-3 font-bold text-gray-900">{p.name}</td>
                              <td className="py-2 px-3 text-gray-600">{p.category || 'General'}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">${p.priceSell.toLocaleString('es-CO')}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${p.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                                  {p.stock > 0 ? `${p.stock} u.` : 'Agotado'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-[#050507] text-white p-8 rounded-2xl border border-gray-800 text-center relative overflow-hidden">
                      <div className="w-16 h-1 bg-gradient-to-r from-[#203180] via-[#FF7AA6] to-[#C80C0C] mx-auto rounded-full mb-4"></div>

                      <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
                        <span className="keinshop-brand text-2xl text-white" translate="no">KEINSHOP</span>
                      </h2>

                      <p className="text-indigo-200 font-bold text-xs max-w-md mx-auto mb-5 leading-relaxed">
                        KEINSHOP CRM & Inteligencia de Negocio — Comercialización y pedidos especiales — Innovando desde 2023
                      </p>

                      <div className="flex flex-wrap justify-center items-center gap-3 text-xs mb-6 pt-4 border-t border-white/10 font-medium">
                        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                          <span className="text-[#FF7AA6] font-bold">Instagram:</span>
                          <span className="text-gray-200">@keinshopec</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                          <span className="text-[#203180] font-bold">Facebook:</span>
                          <span className="text-gray-200">KeinShop</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                          <span className="text-emerald-400 font-bold">WhatsApp:</span>
                          <span className="text-gray-200">+593 99 910 6921</span>
                        </div>
                      </div>

                      <p className="text-sm font-black italic text-[#FF7AA6] tracking-wide">
                        “Tu estilo, tu marca, tu KEINSHOP”
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500">
                    <span>Otavalo, Ecuador</span>
                    <span className="font-mono">Página {totalBookletPages} de {totalBookletPages}</span>
                  </div>
                </div>

              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setShowExportPreview(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs py-2 px-4 rounded-lg transition-all"
                  disabled={downloadingPdf}
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={downloadingPdf}
                  className="bg-[#203180] text-white hover:bg-indigo-950 font-extrabold text-xs py-2 px-5 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 min-h-[38px]"
                >
                  {downloadingPdf ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Descargar Catálogo PDF
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Interactive Public Catalog Preview Modal */}
      {showPublicOverlay && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex flex-col animate-fade-in overflow-hidden">
          {/* Top Control Bar */}
          <div className="bg-[#203180] text-white px-6 py-3 flex justify-between items-center border-b border-indigo-900 flex-shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-ping"></span>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base leading-none">Simulador de Catálogo Público Interactivo</h3>
                <p className="text-[10px] text-indigo-200 mt-0.5">Así ven tus clientes el catálogo en tiempo real con carrito de compras y WhatsApp direct.</p>
              </div>
            </div>

            <button
              onClick={() => setShowPublicOverlay(false)}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 border border-white/15 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al Administrador
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto">
            <PublicCatalog products={products} />
          </div>
        </div>
      )}

      {/* Vestidor Virtual IA Modal */}
      {showFittingRoom && (
        <VirtualFittingRoomModal
          products={products}
          initialProduct={selectedProduct}
          onClose={() => setShowFittingRoom(false)}
        />
      )}

    </div>
  );
}
