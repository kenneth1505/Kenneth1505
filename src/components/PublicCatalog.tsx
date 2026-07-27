import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Share2, 
  ExternalLink, 
  Check, 
  X, 
  ShoppingBag,
  Info,
  Tag,
  Trash2,
  Instagram,
  MessageCircle,
  Facebook,
  Sparkles,
  Download,
  Save,
  Upload,
  Shirt,
  RefreshCw
} from 'lucide-react';
import { Product } from '../types';
import { getPublicOrigin } from '../lib/urlHelper';
import { jsPDF } from 'jspdf';
import ProductImageGallery from './ProductImageGallery';
import VirtualFittingRoomModal from './VirtualFittingRoomModal';

interface PublicCatalogProps {
  products: Product[];
}

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

const DEFAULT_FALLBACK_IMAGE = createFallbackCanvasDataUrl();

const getFreshImageUrl = (url: string, version?: number) => {
  if (!url) return DEFAULT_FALLBACK_IMAGE;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (!version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${version}`;
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
        console.warn("Canvas conversion error:", e);
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

export default function PublicCatalog({ products }: PublicCatalogProps) {
  const [items, setItems] = useState<Product[]>(products || []);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedProductLink, setCopiedProductLink] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showFittingRoom, setShowFittingRoom] = useState(false);

  const handleDownloadPublicPDF = async () => {
    const activeProducts = visibleProducts;
    if (activeProducts.length === 0) {
      alert("No hay productos disponibles en el catálogo para exportar.");
      return;
    }

    setDownloadingPdf(true);

    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      
      // Cover Page
      pdf.setFillColor(32, 49, 128); // #203180
      pdf.rect(0, 0, 210, 297, 'F');

      pdf.setFillColor(255, 122, 166); // #FF7AA6
      pdf.rect(0, 0, 52.5, 4, 'F');
      pdf.setFillColor(200, 12, 12);
      pdf.rect(52.5, 0, 52.5, 4, 'F');
      pdf.setFillColor(170, 170, 170);
      pdf.rect(105, 0, 52.5, 4, 'F');
      pdf.setFillColor(32, 49, 128);
      pdf.rect(157.5, 0, 52.5, 4, 'F');

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
      pdf.text(`Total de prendas catalogadas: ${activeProducts.length}`, 105, 155, { align: 'center' });
      pdf.setFontSize(10);
      pdf.setTextColor(200, 200, 220);
      pdf.text("Innovando desde 2023 • Tu estilo, tu marca, tu KEINSHOP", 105, 165, { align: 'center' });

      // Pages
      const itemsPerPage = 4;
      for (let i = 0; i < activeProducts.length; i += itemsPerPage) {
        const chunk = activeProducts.slice(i, i + itemsPerPage);
        pdf.addPage();

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

        for (let j = 0; j < chunk.length; j++) {
          const p = chunk[j];
          const col = j % 2;
          const row = Math.floor(j / 2);
          const x = 15 + col * 92;
          const y = 30 + row * 118;

          pdf.setDrawColor(220, 225, 230);
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(x, y, 88, 110, 3, 3, 'FD');

          const freshUrl = getFreshImageUrl(p.imageUrl, p.version);
          const b64 = await getBase64ImageFromUrl(freshUrl);
          if (b64 && b64.startsWith('data:image/')) {
            try {
              const format = b64.includes('image/png') ? 'PNG' : 'JPEG';
              pdf.addImage(b64, format, x + 4, y + 4, 80, 60);
            } catch (imgErr) {
              console.warn("Failed to embed image in public pdf:", imgErr);
            }
          }

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

        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text("KEINSHOP Otavalo, Ecuador • WhatsApp: +593 99 910 6921", 105, 288, { align: 'center' });
      }

      pdf.save(`Catalogo_Oficial_KEINSHOP_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("Error generating public PDF catalog:", err);
      alert("Ocurrió un inconveniente al generar la presentación PDF. Por favor reintente.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Shopping Cart States
  const [cart, setCart] = useState<{ product: Product; quantity: number; size: string; color: string }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [logisticNotes, setLogisticNotes] = useState('');
  const [cartToast, setCartToast] = useState<string | null>(null);

  // Fetch live products from backend to ensure 100% sync with Inventory
  const fetchPublicProducts = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const serverItems = await res.json();
        if (Array.isArray(serverItems)) {
          const mergedMap = new Map<string, Product>();
          serverItems.forEach((p: Product) => {
            if (p && p.sku) mergedMap.set(p.sku, p);
          });
          // Merge with passed products prop if any local unsaved items
          if (Array.isArray(products)) {
            products.forEach((p: Product) => {
              if (p && p.sku && !mergedMap.has(p.sku)) {
                mergedMap.set(p.sku, p);
              }
            });
          }
          setItems(Array.from(mergedMap.values()));
        }
      }
    } catch (err) {
      console.error("Error fetching public catalog inventory:", err);
      if (products && products.length > 0) {
        setItems(products);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicProducts();

    // Listen for real-time SSE updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = () => {
        fetchPublicProducts();
      };
    } catch (e) {
      console.error("SSE connection error in PublicCatalog:", e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (products && products.length > 0) {
      setItems(prev => {
        const mergedMap = new Map<string, Product>();
        prev.forEach(p => { if (p && p.sku) mergedMap.set(p.sku, p); });
        products.forEach(p => { if (p && p.sku) mergedMap.set(p.sku, p); });
        return Array.from(mergedMap.values());
      });
    }
  }, [products]);

  const categories = ['Todos', 'Mujer', 'Accesorios', 'Hombre', 'Unisex', 'Otros'];

  // Only show visible products to the public (resilient boolean / string check)
  const visibleProducts = items.filter(p => 
    p &&
    p.visible !== false && 
    (p.visible as any) !== 'false' && 
    !p.deleted_at && 
    p.status !== 'inactive'
  );

  const filteredProducts = visibleProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'Todos' || selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleShareCatalog = () => {
    const shareUrl = getPublicOrigin() + window.location.pathname + '?view=catalog';
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareProduct = (p: Product) => {
    const shareUrl = `${getPublicOrigin()}${window.location.pathname}?view=catalog&product=${p.sku}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedProductLink(true);
    setTimeout(() => setCopiedProductLink(false), 2000);
  };

  const logCatalogInteraction = (productId: string, type: 'view' | 'click' | 'order') => {
    fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        user_id: clientName ? clientName.trim() : null,
        type: type
      })
    }).catch(err => console.error(`Error logging ${type} interaction:`, err));
  };

  const handleOpenProduct = (p: Product) => {
    setSelectedProduct(p);
    // Auto select first size/color if available
    if (p.sizes && p.sizes.length > 0) {
      setSelectedSize(p.sizes[0]);
    } else {
      setSelectedSize('');
    }
    if (p.colors && p.colors.length > 0) {
      setSelectedColor(p.colors[0]);
    } else {
      setSelectedColor('');
    }
    logCatalogInteraction(p.sku, 'view');
  };

  // Add to cart helper
  const handleAddToCart = (product: Product, size?: string, color?: string) => {
    const activeSize = size || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : '');
    const activeColor = color || (product.colors && product.colors.length > 0 ? product.colors[0] : '');

    setCart(prev => {
      const existingIdx = prev.findIndex(item => 
        item.product.sku === product.sku && 
        item.size === activeSize && 
        item.color === activeColor
      );

      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + 1
        };
        return next;
      } else {
        return [...prev, { product, quantity: 1, size: activeSize, color: activeColor }];
      }
    });

    setCartToast(`¡"${product.name}" (${activeSize || 'Estándar'}) se agregó al carrito!`);
    setTimeout(() => setCartToast(null), 3000);

    logCatalogInteraction(product.sku, 'click');
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, change: number) => {
    setCart(prev => {
      const next = [...prev];
      const nextQty = next[index].quantity + change;
      if (nextQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      next[index] = { ...next[index], quantity: nextQty };
      return next;
    });
  };

  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + item.product.priceSell * item.quantity, 0);

    let message = `¡Hola KEINSHOP! ⚡️ Quisiera realizar el siguiente pedido desde el catálogo digital:\n\n`;
    
    if (clientName.trim()) {
      message += `👤 *Cliente:* ${clientName.trim()}\n`;
    }
    if (logisticNotes.trim()) {
      message += `📝 *Nota logística:* ${logisticNotes.trim()}\n`;
    }
    message += `\n📦 *Detalle del Pedido:*`;

    cart.forEach((item) => {
      const sizeStr = item.size ? ` (Talla: ${item.size})` : '';
      const colorStr = item.color ? ` (Color: ${item.color})` : '';
      const itemTotal = item.product.priceSell * item.quantity;
      message += `\n- ${item.product.name}${sizeStr}${colorStr} x${item.quantity} - $${itemTotal.toLocaleString('es-CO')} COP`;
      
      // Register interaction for order
      logCatalogInteraction(item.product.sku, 'order');
    });

    message += `\n\n💵 *Total a pagar:* $${total.toLocaleString('es-CO')} COP\n`;
    message += `\n¡Quedo atento(a) para coordinar el pago y la entrega! Muchas gracias.`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=593999106921&text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOrderWhatsAppDirect = (p: Product) => {
    const message = `¡Hola KEINSHOP! Me interesa este producto de su catálogo:
*Producto:* ${p.name}
*SKU:* ${p.sku}
*Precio:* $${p.priceSell.toLocaleString('es-CO')} COP
${selectedSize ? `*Talla elegida:* ${selectedSize}` : ''}
${selectedColor ? `*Color elegido:* ${selectedColor}` : ''}

¿Tienen disponibilidad para entrega o pedido especial? ¡Muchas gracias!`;
    
    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=593999106921&text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    // Register interaction for order direct
    logCatalogInteraction(p.sku, 'order');
  };


  // Check if a specific product was requested in the URL on first render
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productSku = params.get('product');
    if (productSku) {
      const match = products.find(p => p.sku === productSku && p.visible);
      if (match) {
        handleOpenProduct(match);
      }
    }
  }, [products]);

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#050507] font-sans selection:bg-[#203180]/10">
      
      {/* Toast Feedback */}
      {cartToast && (
        <div className="fixed bottom-6 right-6 bg-[#203180] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-indigo-950 z-50 flex items-center gap-2.5 animate-in slide-in-from-bottom-5 font-bold text-xs sm:text-sm">
          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span>{cartToast}</span>
        </div>
      )}

      {/* Dynamic Navigation Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#AAAAAA]/15 z-40 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-2" translate="no">
            <span className="w-3 h-8 bg-[#203180] rounded-full"></span>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-black text-[#203180] tracking-widest leading-none" translate="no">
                KEIN<span className="text-[#FF7AA6]" translate="no">SHOP</span>
              </h1>
              <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 mt-0.5">Catálogo de Clientes</span>
            </div>
          </div>

          {/* Share, PDF Download, Fitting Room and Cart buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFittingRoom(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#203180] to-indigo-900 hover:from-indigo-900 hover:to-[#203180] text-white font-extrabold text-xs rounded-xl transition-all duration-200 active:scale-95 shadow-sm border border-indigo-700/50"
              title="Pruébate prendas de forma hiperrealista"
            >
              <Shirt className="w-4 h-4 text-[#FF7AA6]" />
              <span className="hidden md:inline">Vestidor Virtual IA</span>
              <span className="md:hidden">Vestidor</span>
            </button>
            <button
              onClick={handleDownloadPublicPDF}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#FF7AA6] hover:bg-pink-600 text-white font-extrabold text-xs rounded-xl transition-all duration-200 active:scale-95 shadow-sm disabled:opacity-50"
            >
              {downloadingPdf ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span className="hidden sm:inline">Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Descargar Catálogo PDF</span>
                  <span className="sm:hidden">PDF</span>
                </>
              )}
            </button>
            <button
              onClick={handleShareCatalog}
              className="hidden sm:flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all duration-200 active:scale-95 border border-gray-200"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
              {copied ? '¡Copiado!' : 'Compartir'}
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2 bg-[#203180] hover:bg-indigo-900 text-white font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 active:scale-95 shadow-md shadow-[#203180]/15 animate-pulse"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Pedido ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#203180] to-[#121c4b] text-white py-14 sm:py-20 px-4 border-b-4 border-[#FF7AA6] shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,122,166,0.15),transparent_45%)]" />
        <div className="relative max-w-4xl mx-auto text-center space-y-5">
          <span className="inline-block bg-[#FF7AA6]/20 text-[#FF7AA6] font-black text-[10px] sm:text-xs px-4 py-1.5 rounded-full uppercase tracking-widest border border-[#FF7AA6]/40" translate="no">
            Experiencia Exclusiva KEINSHOP
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight uppercase" translate="no">
            BIENVENIDOS A LA EXPERIENCIA <span className="text-[#FF7AA6]" translate="no">KEINSHOP</span>
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-white/90 max-w-3xl mx-auto leading-relaxed font-medium">
            Diseños únicos que transmiten tu esencia.<br />
            En <span className="font-extrabold text-[#FF7AA6]" translate="no">KeinShop</span> encuentras prendas exclusivas y una experiencia que va más allá de la moda.<br />
            Aquí lo básico no existe.<br />
            Pedidos fáciles y atención personalizada en un solo clic.
          </p>
        </div>
      </section>

      {/* Search and Filters Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-[#AAAAAA]/15 shadow-sm">
          
          {/* Search Input */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Buscar prendas por nombre, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:border-[#203180] focus:ring-1 focus:ring-[#203180]"
              aria-label="Buscar productos en el catálogo"
            />
          </div>

          {/* Categories Horizontal Selector */}
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === cat 
                    ? 'bg-[#203180] text-white shadow-md shadow-[#203180]/15' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-250 hover:text-gray-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Item Count */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 font-medium">
          <p>Mostrando <span className="font-bold text-[#203180]">{filteredProducts.length}</span> de <span className="font-bold text-[#203180]">{visibleProducts.length}</span> productos disponibles</p>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#AAAAAA]/20 p-8 space-y-3">
            <Info className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-800">No encontramos resultados</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">Prueba buscando otra palabra clave o cambiando la categoría del filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-5">
            {filteredProducts.map((p) => (
              <div 
                key={p.sku} 
                onClick={() => { logCatalogInteraction(p.sku, 'click'); handleOpenProduct(p); }}
                className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-[#AAAAAA]/15 transition-all duration-300 hover:shadow-xl hover:border-[#203180]/30 cursor-pointer flex flex-col justify-between"
              >
                {/* Product Image Area */}
                <div className="relative aspect-square bg-gray-50 overflow-hidden">
                  <img 
                    src={getFreshImageUrl(p.imageUrl, p.version)} 
                    alt={p.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={handleImageError}
                  />
                  
                  {/* Category overlay */}
                  <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5">
                    <span className="bg-white/95 backdrop-blur text-[#203180] font-black text-[8px] sm:text-[10px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-gray-150 shadow-sm uppercase tracking-wider">
                      {p.category}
                    </span>
                  </div>

                  {/* Stock availability indicator */}
                  <div className="absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5">
                    <span className={`text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm text-white ${
                      p.stock > 0 ? 'bg-green-600/90' : 'bg-[#C80C0C]/90'
                    }`}>
                      {p.stock > 0 ? `${p.stock} u.` : 'Agotado'}
                    </span>
                  </div>
                </div>

                {/* Card Content details */}
                <div className="p-2 sm:p-3 md:p-4 space-y-1 sm:space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-[#203180] transition-colors text-xs sm:text-sm">{p.name}</h4>
                    <span className="text-xs sm:text-sm md:text-base font-black text-[#203180] font-mono block mt-0.5">
                      ${p.priceSell.toLocaleString('es-CO')}
                    </span>
                  </div>

                  {/* Action row */}
                  <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs text-gray-500 font-semibold">
                    <span className="text-[#203180] group-hover:underline flex items-center gap-0.5 font-bold">
                      Ver detalle →
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                      className="bg-[#203180] hover:bg-indigo-900 text-white font-bold p-1 sm:px-2.5 sm:py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                      title="Agregar al carrito"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span className="hidden sm:inline">+ Carrito</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-[#AAAAAA]/15 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <span className="text-xs font-black uppercase text-[#203180] tracking-widest flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Detalle de Prenda
              </span>
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="p-1 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-200 transition-all"
                aria-label="Cerrar modal de detalles"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="overflow-y-auto p-6 flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Side: Image Gallery */}
                <ProductImageGallery 
                  product={selectedProduct}
                  getFreshImageUrl={getFreshImageUrl}
                  handleImageError={handleImageError}
                />

                {/* Right Side: Information form */}
                <div className="flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <span className="bg-[#203180]/10 text-[#203180] font-black text-[9px] px-2.5 py-1 rounded uppercase tracking-wider">
                      {selectedProduct.category}
                    </span>
                    <h3 className="font-black text-xl text-gray-900 leading-snug">{selectedProduct.name}</h3>
                    
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Precio de Venta</span>
                      <span className="text-2xl font-black text-[#203180] font-mono">
                        ${selectedProduct.priceSell.toLocaleString('es-CO')} <span className="text-xs text-gray-400 font-sans font-medium">COP</span>
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed pt-2 border-t border-gray-100">
                      {selectedProduct.description || "Nuestra prenda exclusiva para KEINSHOP cuenta con materiales premium importados, costuras reforzadas de alta duración y un calce perfecto para la calle."}
                    </p>
                  </div>

                  {/* Size Selectors (interactive) */}
                  {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block">Seleccionar Talla:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProduct.sizes.map(size => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                              selectedSize === size
                                ? 'bg-[#203180] text-white shadow-md shadow-[#203180]/15'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color Selectors (interactive) */}
                  {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block">Seleccionar Color:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProduct.colors.map(color => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                              selectedColor === color
                                ? 'bg-[#203180] text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stock state */}
                  <div className="text-xs font-semibold text-gray-400">
                    Disponibilidad: <span className="text-green-600 font-bold">{selectedProduct.stock} unidades listas</span>
                  </div>

                </div>

              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap sm:flex-nowrap gap-2.5 justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setShowFittingRoom(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-[#203180] to-indigo-900 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
              >
                <Shirt className="w-4 h-4 text-[#FF7AA6]" /> Probar en Vestidor Virtual
              </button>

              <button
                onClick={() => handleShareProduct(selectedProduct)}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                {copiedProductLink ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4 text-gray-500" />}
                {copiedProductLink ? '¡Enlace copiado!' : 'Copiar enlace'}
              </button>

              <button
                onClick={() => {
                  handleAddToCart(selectedProduct, selectedSize, selectedColor);
                  setSelectedProduct(null);
                }}
                className="px-5 py-2.5 bg-[#203180] hover:bg-indigo-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#203180]/20"
              >
                <ShoppingBag className="w-4 h-4" /> Agregar al Carrito
              </button>

              <button
                onClick={() => handleOrderWhatsAppDirect(selectedProduct)}
                className="px-5 py-2.5 bg-[#FF7AA6] hover:bg-pink-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#FF7AA6]/20"
              >
                Solicitar Directo
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Shopping Cart Slider Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl relative">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#203180]" />
                <h3 className="font-black text-sm sm:text-base text-gray-900 uppercase tracking-wide">Tu Carrito de Compras</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-950 hover:bg-gray-150 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Items Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-gray-400 space-y-3">
                  <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto" />
                  <p className="text-sm font-bold text-gray-700">Tu carrito está vacío</p>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">Explora el catálogo y agrega tus prendas streetwear preferidas.</p>
                </div>
              ) : (
                cart.map((item, index) => {
                  const itemTotal = item.product.priceSell * item.quantity;
                  return (
                    <div key={index} className="flex gap-4 border-b border-gray-150 pb-4 last:border-0 last:pb-0">
                      
                      {/* Product Image */}
                      <img 
                        src={getFreshImageUrl(item.product.imageUrl, item.product.version)} 
                        alt={item.product.name} 
                        className="w-16 h-16 object-cover rounded-xl border border-gray-100 flex-shrink-0"
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                      />

                      {/* Info and Quantity selector */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-gray-950 truncate">{item.product.name}</h4>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {item.size && (
                              <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-bold uppercase">
                                Talla: {item.size}
                              </span>
                            )}
                            {item.color && (
                              <span className="text-[9px] bg-indigo-50 text-[#203180] px-1.5 py-0.2 rounded font-bold uppercase">
                                Color: {item.color}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-0.5">
                            <button 
                              onClick={() => handleUpdateQuantity(index, -1)}
                              className="px-2 py-0.5 hover:bg-white rounded font-black text-xs text-gray-500"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-bold text-gray-800 font-mono">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(index, 1)}
                              className="px-2 py-0.5 hover:bg-white rounded font-black text-xs text-gray-500"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-[#203180]">
                              ${itemTotal.toLocaleString('es-CO')}
                            </span>
                            <button
                              onClick={() => handleRemoveFromCart(index)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with Inputs & checkout button */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-gray-50 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tu Nombre Completo:</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Valentina Gómez"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-[#203180]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nota logística / Envío (Opcional):</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Coordinar entrega en Otavalo"
                      value={logisticNotes}
                      onChange={(e) => setLogisticNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-[#203180]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between items-center text-sm font-black text-gray-900">
                    <span>Total estimado:</span>
                    <span className="text-base font-mono text-[#203180]">
                      ${cart.reduce((sum, item) => sum + item.product.priceSell * item.quantity, 0).toLocaleString('es-CO')} COP
                    </span>
                  </div>

                  <button
                    onClick={handleCheckoutWhatsApp}
                    className="w-full py-3 bg-[#FF7AA6] hover:bg-pink-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#FF7AA6]/20"
                  >
                    <ShoppingBag className="w-4 h-4" /> Realizar Pedido por WhatsApp
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Accessible Footer */}
      <footer className="bg-white border-t border-[#AAAAAA]/15 py-12 text-center text-xs text-gray-400 mt-20 font-medium">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-bold text-[#203180]" translate="no">KEINSHOP © 2026. Catálogo Digital Interactivo.</p>
          <p className="text-[10px] text-gray-300">Medellín, Colombia. Envíos nacionales. Los cambios se reflejan automáticamente desde nuestro inventario.</p>
        </div>
      </footer>

      {/* Discrete Floating Social Links — Always Visible */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-300">
        <div className="bg-white/95 backdrop-blur-md shadow-lg hover:shadow-xl border border-gray-150 py-1.5 px-3 rounded-full flex items-center gap-2 text-xs font-bold transition-all">
          <span className="text-[9px] text-[#203180] tracking-wider uppercase font-black pl-1 mr-1">Redes:</span>
          <a 
            href="https://www.instagram.com/kein_shop_ec/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="p-1.5 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white rounded-full hover:scale-110 active:scale-95 transition-all shadow-sm"
            title="Instagram de KEINSHOP"
          >
            <Instagram className="w-3.5 h-3.5" />
          </a>
          <a 
            href="https://wa.me/593999106921" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="p-1.5 bg-[#25D366] text-white rounded-full hover:scale-110 active:scale-95 transition-all shadow-sm"
            title="WhatsApp de KEINSHOP"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>
          <a 
            href="https://www.facebook.com/profile.php?id=100069956384640" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="p-1.5 bg-[#1877F2] text-white rounded-full hover:scale-110 active:scale-95 transition-all shadow-sm"
            title="Facebook de KEINSHOP"
          >
            <Facebook className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Vestidor Virtual Modal */}
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
