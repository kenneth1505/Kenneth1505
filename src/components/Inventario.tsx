import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Sparkles, 
  Search, 
  Filter, 
  AlertCircle, 
  Check, 
  TrendingUp, 
  ChevronRight, 
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  ArrowUpDown,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  ShoppingCart,
  Printer,
  Share2,
  PlusCircle,
  MinusCircle,
  FileText,
  User,
  X,
  Download
} from 'lucide-react';
import { Product, UserRole, ProductImage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FallbackImage } from './FallbackImage';
import { compressAndResizeImage } from '../utils/imageCompressor';

const DEFAULT_FALLBACK_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 24 24' fill='none' stroke='%23CCCCCC' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' style='background:%23F3F4F6;'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";

const getFreshImageUrl = (url: string, version?: number) => {
  if (!url) return DEFAULT_FALLBACK_IMAGE;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (!version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${version}`;
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.onerror = null; // Prevent infinite loops
  const src = e.currentTarget.src;
  // If image loading fails, first attempt a quick reload with a cache-buster query parameter to force server re-fetching
  if (src && !src.includes("retry=") && !src.startsWith("data:")) {
    const separator = src.includes("?") ? "&" : "?";
    e.currentTarget.src = `${src}${separator}retry=${Date.now()}`;
  } else {
    e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
  }
};

// Helper functions to convert oklch colors to rgb/rgba for html2canvas compatibility
function oklchToRgb(oklchStr: string): string {
  try {
    const match = oklchStr.match(/oklch\(\s*([^/)]+)\s*(?:\/\s*([^)]+))?\)/i);
    if (!match) return oklchStr;

    const parts = match[1].trim().split(/[\s,]+/);
    if (parts.length < 3) return oklchStr;

    let L = parseFloat(parts[0]);
    if (parts[0].endsWith('%')) L = L / 100;

    let C = parseFloat(parts[1]);
    if (parts[1].endsWith('%')) C = C / 100;

    let H = parseFloat(parts[2]);
    if (parts[2].endsWith('deg')) {
      H = parseFloat(parts[2]);
    } else if (parts[2].endsWith('rad')) {
      H = parseFloat(parts[2]) * (180 / Math.PI);
    } else {
      H = parseFloat(parts[2]);
    }
    if (isNaN(H)) H = 0;

    let alpha = 1;
    const alphaPart = match[2] || parts[3];
    if (alphaPart) {
      let aVal = alphaPart.trim();
      if (aVal.endsWith('%')) {
        alpha = parseFloat(aVal) / 100;
      } else {
        alpha = parseFloat(aVal);
      }
    }

    // Convert OKLCH to RGB
    const hRad = (H * Math.PI) / 180;
    const oklabA = C * Math.cos(hRad);
    const oklabB = C * Math.sin(hRad);

    const l_ = L + 0.3963377774 * oklabA + 0.2158037573 * oklabB;
    const m_ = L - 0.1055613458 * oklabA - 0.0638541728 * oklabB;
    const s_ = L - 0.0894841775 * oklabA - 1.2914855480 * oklabB;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    let rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const gamma = (c: number) => {
      return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    };

    const r = Math.max(0, Math.min(255, Math.round(gamma(rLin) * 255)));
    const g = Math.max(0, Math.min(255, Math.round(gamma(gLin) * 255)));
    const b = Math.max(0, Math.min(255, Math.round(gamma(bLin) * 255)));

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (err) {
    console.error("Failed to convert oklch to rgb:", oklchStr, err);
    return oklchStr;
  }
}

function replaceOklchInString(str: string): string {
  if (!str || !str.includes('oklch')) return str;
  return str.replace(/oklch\([^)]+\)/gi, (match) => {
    try {
      return oklchToRgb(match);
    } catch (e) {
      return 'rgba(255, 255, 255, 1)';
    }
  });
}

async function sanitizeStylesheets(): Promise<() => void> {
  const restoredStyleEls: Array<{ element: HTMLStyleElement, originalText: string }> = [];
  const restoredLinks: Array<{ element: HTMLLinkElement, originalDisabled: boolean }> = [];
  const tempStyleEls: HTMLStyleElement[] = [];

  try {
    // 1. Sanitize <style> tags
    const styleElements = Array.from(document.querySelectorAll('style'));
    styleElements.forEach((styleEl) => {
      const text = styleEl.textContent || '';
      if (text.includes('oklch') || text.includes('oklab')) {
        restoredStyleEls.push({
          element: styleEl,
          originalText: text
        });
        
        let sanitizedText = text;
        sanitizedText = sanitizedText.replace(/oklch\([^)]+\)/gi, (match) => {
          try {
            return oklchToRgb(match);
          } catch (e) {
            return 'rgb(79, 70, 229)';
          }
        });
        sanitizedText = sanitizedText.replace(/oklab\([^)]+\)/gi, 'rgb(120, 120, 120)');
        styleEl.textContent = sanitizedText;
      }
    });

    // 2. Handle <link rel="stylesheet"> tags
    const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    for (const linkEl of linkElements) {
      try {
        let cssText = '';
        // Try reading directly from sheet first (if same-origin cached rules exist)
        if (linkEl.sheet) {
          try {
            const rules = Array.from(linkEl.sheet.cssRules);
            cssText = rules.map(r => r.cssText).join('\n');
          } catch (sheetErr) {
            // CORS or not loaded yet
          }
        }
        
        // If not retrieved, try fetching it
        if (!cssText && linkEl.href) {
          const res = await fetch(linkEl.href);
          if (res.ok) {
            cssText = await res.text();
          }
        }

        if (cssText && (cssText.includes('oklch') || cssText.includes('oklab'))) {
          // Keep track of the original link
          restoredLinks.push({
            element: linkEl,
            originalDisabled: linkEl.disabled
          });

          // Sanitize the CSS text
          let sanitizedCss = cssText;
          sanitizedCss = sanitizedCss.replace(/oklch\([^)]+\)/gi, (match) => {
            try {
              return oklchToRgb(match);
            } catch (e) {
              return 'rgb(79, 70, 229)';
            }
          });
          sanitizedCss = sanitizedCss.replace(/oklab\([^)]+\)/gi, 'rgb(120, 120, 120)');

          // Create temporary style element
          const tempStyle = document.createElement('style');
          tempStyle.setAttribute('data-temp-sanitized', 'true');
          tempStyle.textContent = sanitizedCss;
          document.head.appendChild(tempStyle);
          tempStyleEls.push(tempStyle);

          // Disable original link
          linkEl.disabled = true;
        }
      } catch (linkErr) {
        console.error("Failed to sanitize link stylesheet:", linkEl.href, linkErr);
      }
    }
  } catch (err) {
    console.error("Error sanitizing stylesheets:", err);
  }

  // Return restore function
  return () => {
    // Restore original <style> text
    restoredStyleEls.forEach(({ element, originalText }) => {
      try {
        element.textContent = originalText;
      } catch (err) {
        console.error("Error restoring stylesheet:", err);
      }
    });
    // Restore original <link> tags
    restoredLinks.forEach(({ element, originalDisabled }) => {
      try {
        element.disabled = originalDisabled;
      } catch (err) {
        console.error("Error restoring link stylesheet:", err);
      }
    });
    // Remove temporary style elements
    tempStyleEls.forEach((el) => {
      try {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      } catch (err) {
        console.error("Error removing temp stylesheet:", err);
      }
    });
  };
}

const generateUniqueSku = (products: Product[], category: string) => {
  const catChar = category ? category.charAt(0).toUpperCase() : 'M';
  const prefix = `KS-${catChar}-`;
  
  let maxNum = 0;
  products.forEach(p => {
    if (p.sku) {
      const match = p.sku.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  });
  
  const nextNum = maxNum + 1;
  const paddedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
  return `${prefix}${paddedNum}`;
};

interface InventarioProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (sku: string, mode: 'soft' | 'hard', reason?: string) => void;
  onRestoreProduct?: (sku: string) => void;
  onReorderProducts?: (products: Product[]) => void;
  role: UserRole;
  showAddFormInitially?: boolean;
}

export default function Inventario({ 
  products, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct, 
  onRestoreProduct,
  onReorderProducts,
  role,
  showAddFormInitially = false
}: InventarioProps) {

  // Dynamic viewport height and input focus scroll helpers for mobile
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    setVh();

    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  // View and Order States
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
  const [orderMode, setOrderMode] = useState<'price_desc' | 'price_asc' | 'recent' | 'old'>('recent');
  const [draggedSku, setDraggedSku] = useState<string | null>(null);

  // Internal visual notification toast
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [showModal, setShowModal] = useState(showAddFormInitially);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll active elements into view on focus with small delay
  useEffect(() => {
    if (!showModal) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target && 
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, [showModal]);

  // Delete modal & filters state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft');
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeletedFilter, setShowDeletedFilter] = useState<'all' | 'active' | 'deleted'>('active');

  // Synchronization simulation states
  const [autoSync, setAutoSync] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'success' | 'failed' | 'idle'>('success');
  const [simulateError, setSimulateError] = useState(false);
  const [showSyncToast, setShowSyncToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Sales & Invoicing Sub-Tab States
  const [subTab, setSubTab] = useState<'stock' | 'ventas_registro' | 'ventas_historial'>('stock');
  const [salesList, setSalesList] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState<boolean>(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  
  // Cart State for registering new sale
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number; priceSell: number }>>([]);
  const [selectedClient, setSelectedClient] = useState<{ id?: string; name: string; phone: string; address: string }>({
    name: '',
    phone: '',
    address: ''
  });
  const [saleNotes, setSaleNotes] = useState('');
  const [searchSaleTerm, setSearchSaleTerm] = useState('');
  const [downloadingPng, setDownloadingPng] = useState<boolean>(false);

  // Delete individual sale/invoice and restore stock
  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la factura/venta ${saleId}? Esto devolverá los productos vendidos al inventario y actualizará las cuentas de ingresos.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showNotification(`Venta ${saleId} eliminada correctamente y stock devuelto.`, 'success');
        fetchSales();
        // Dispatch global sync event to update product stock and transactions on other screens
        window.dispatchEvent(new Event('sync-all-data'));
        if (selectedSale && selectedSale.id === saleId) {
          setSelectedSale(null);
        }
      } else {
        const errData = await res.json();
        showNotification(errData.error || `Error al eliminar la venta ${saleId}.`, 'error');
      }
    } catch (err) {
      console.error("Error deleting sale:", err);
      showNotification("Error de conexión al eliminar la venta.", "error");
    }
  };

  // Manual download helper for Invoice PNG
  const downloadInvoicePng = async () => {
    if (!selectedSale) return;
    setDownloadingPng(true);
    const restoreStyles = await sanitizeStylesheets();
    try {
      const element = document.getElementById('printable-invoice-area');
      if (!element) {
        showNotification("No se encontró el área de la factura.", "error");
        setDownloadingPng(false);
        restoreStyles();
        return;
      }

      // Render area to canvas with high resolution
      const canvas = await html2canvas(element, {
        scale: 2.5, // Crisp PNG look
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            
            // Process inline style attribute if any
            const inlineStyle = el.getAttribute('style');
            if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab'))) {
              el.setAttribute('style', replaceOklchInString(inlineStyle).replace(/oklab\([^)]+\)/gi, 'rgb(120, 120, 120)'));
            }
            
            // Process computed style colors that html2canvas will parse
            try {
              const computed = window.getComputedStyle(el);
              const propsToFix = [
                'backgroundColor',
                'color',
                'borderColor',
                'borderTopColor',
                'borderRightColor',
                'borderBottomColor',
                'borderLeftColor'
              ];
              propsToFix.forEach((prop) => {
                const val = (computed as any)[prop];
                if (val && (val.includes('oklch') || val.includes('oklab'))) {
                  const rgbVal = replaceOklchInString(val).replace(/oklab\([^)]+\)/gi, 'rgb(120, 120, 120)');
                  el.style[prop as any] = rgbVal;
                }
              });
            } catch (styleErr) {
              // Ignore styles that cannot be parsed/computed
            }
          }
        }
      });

      // Download the PNG file
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `FACTURA-${selectedSale.id || 'venta'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification("✅ ¡Factura PNG descargada correctamente!", "success");
    } catch (err) {
      console.error("Error al descargar PNG:", err);
      showNotification("Error al generar la factura en PNG.", "error");
    } finally {
      restoreStyles();
      setDownloadingPng(false);
    }
  };

  // Fetch sales list
  const fetchSales = async () => {
    setLoadingSales(true);
    try {
      const res = await fetch('/api/sales');
      if (res.ok) {
        const data = await res.json();
        setSalesList(data);
      }
    } catch (err) {
      console.error("Error loading sales list:", err);
    } finally {
      setLoadingSales(false);
    }
  };

  // Load sales on mount or when sub-tab is changed to history
  useEffect(() => {
    if (subTab === 'ventas_historial') {
      fetchSales();
    }
  }, [subTab]);

  const [clients, setClients] = useState<any[]>([]);
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients');
        if (res.ok) {
          const data = await res.json();
          setClients(data);
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };
    fetchClients();
  }, []);

  // Cart & Checkout Helper Methods
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showNotification(`El producto ${product.name} está agotado.`, 'error');
      return;
    }
    const existing = cart.find(item => item.product.sku === product.sku);
    if (existing) {
      if (existing.quantity >= product.stock) {
        showNotification(`No puedes agregar más unidades. Stock disponible: ${product.stock}`, 'error');
        return;
      }
      setCart(cart.map(item => 
        item.product.sku === product.sku 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, priceSell: product.priceSell }]);
    }
    showNotification(`Agregado al carrito: ${product.name}`, 'success');
  };

  const updateCartQuantity = (sku: string, increment: boolean) => {
    const item = cart.find(i => i.product.sku === sku);
    if (!item) return;

    if (increment) {
      if (item.quantity >= item.product.stock) {
        showNotification(`No puedes superar el stock de ${item.product.stock} unidades.`, 'error');
        return;
      }
      setCart(cart.map(i => i.product.sku === sku ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      if (item.quantity <= 1) {
        setCart(cart.filter(i => i.product.sku !== sku));
      } else {
        setCart(cart.map(i => i.product.sku === sku ? { ...i, quantity: i.quantity - 1 } : i));
      }
    }
  };

  const cartTotal = Number(cart.reduce((acc, item) => acc + (item.priceSell * item.quantity), 0).toFixed(2));
  const cartSubtotal = Number((cartTotal / 1.15).toFixed(2));
  const cartTax = Number((cartTotal - cartSubtotal).toFixed(2));

  const [registeringSale, setRegisteringSale] = useState(false);
  const [sharingPng, setSharingPng] = useState(false);
  const [autoShareOnLoad, setAutoShareOnLoad] = useState<boolean>(false);

  const triggerShareWhatsApp = async (saleToShare: any) => {
    if (!saleToShare) return;
    const phone = saleToShare.client?.phone || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const textMsg = `¡MUCHAS GRACIAS POR TU COMPRA! 🛍️✨`;
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone ? (cleanPhone.startsWith("+") ? cleanPhone : "+" + cleanPhone) : ""}&text=${encodeURIComponent(textMsg)}`;
    
    // Open WhatsApp
    const waWindow = window.open(waUrl, "_blank");
    if (!waWindow) {
      showNotification("⚠️ El navegador bloqueó la ventana emergente de WhatsApp. Por favor, permite ventanas emergentes.", "info");
    }

    setSharingPng(true);
    const restoreStyles = await sanitizeStylesheets();
    try {
      // Wait to make sure modal content has fully rendered and initialized in DOM
      await new Promise(resolve => setTimeout(resolve, 450));
      const element = document.getElementById('printable-invoice-area');
      if (!element) {
        showNotification("No se encontró el área de la factura.", "error");
        setSharingPng(false);
        restoreStyles();
        return;
      }

      // Render area to canvas with high resolution
      const canvas = await html2canvas(element, {
        scale: 2.5, // Crisp PNG look
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            
            // Process inline style attribute if any
            const inlineStyle = el.getAttribute('style');
            if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab'))) {
              el.setAttribute('style', replaceOklchInString(inlineStyle).replace(/oklab\([^)]+\)/gi, 'rgb(120, 120, 120)'));
            }
            
            // Process computed style colors that html2canvas will parse
            try {
              const computed = window.getComputedStyle(el);
              const propsToFix = [
                'backgroundColor',
                'color',
                'borderColor',
                'borderTopColor',
                'borderRightColor',
                'borderBottomColor',
                'borderLeftColor'
              ];
              propsToFix.forEach((prop) => {
                const val = (computed as any)[prop];
                if (val && (val.includes('oklch') || val.includes('oklab'))) {
                  const rgbVal = replaceOklchInString(val).replace(/oklab\([^)]+\)/gi, 'rgb(120, 120, 120)');
                  el.style[prop as any] = rgbVal;
                }
              });
            } catch (styleErr) {
              // Ignore styles that cannot be parsed/computed
            }
          }
        }
      });

      // Try Web Share API first (crucial for direct sharing of image on mobile)
      let sharedSuccessfully = false;
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const file = new File([blob], `FACTURA-${saleToShare.id || 'venta'}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `Factura ${saleToShare.id}`,
                text: textMsg
              });
              sharedSuccessfully = true;
              showNotification("✅ ¡Factura compartida con éxito!", "success");
            }
          }
        } catch (shareErr) {
          console.warn("Web Share API failed, falling back to download and copy:", shareErr);
        }
      }

      if (!sharedSuccessfully) {
        // 1. Download the PNG file
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `FACTURA-${saleToShare.id || 'venta'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 2. Try copying the PNG image blob to clipboard so the user can easily paste it in WhatsApp
        let copiedToClipboard = false;
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob && navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
              new ClipboardItem({
                [blob.type]: blob
              })
            ]);
            copiedToClipboard = true;
          }
        } catch (clipErr) {
          console.warn("Clipboard copy fallback applied:", clipErr);
        }

        if (copiedToClipboard) {
          showNotification("✅ ¡Factura PNG descargada y COPIADA al portapapeles! En WhatsApp, presiona Ctrl+V para pegar la factura.", "success");
        } else {
          showNotification("✅ ¡Factura PNG descargada! Adjunta la imagen en la pestaña de WhatsApp abierta.", "success");
        }
      }
    } catch (err) {
      console.error("Error al generar PNG:", err);
      showNotification("Error al generar la factura en PNG.", "error");
    } finally {
      restoreStyles();
      setSharingPng(false);
    }
  };

  useEffect(() => {
    if (selectedSale && autoShareOnLoad) {
      setAutoShareOnLoad(false);
      triggerShareWhatsApp(selectedSale);
    }
  }, [selectedSale, autoShareOnLoad]);

  const registerSale = async () => {
    if (cart.length === 0) {
      showNotification("El carrito está vacío.", "error");
      return;
    }
    if (!selectedClient.name.trim()) {
      showNotification("Por favor, ingresa el nombre del cliente.", "error");
      return;
    }

    setRegisteringSale(true);
    try {
      const saleData = {
        client: selectedClient,
        items: cart.map(item => ({
          sku: item.product.sku,
          name: item.product.name,
          price: item.priceSell,
          quantity: item.quantity
        })),
        subtotal: cartSubtotal,
        tax: cartTax,
        total: cartTotal,
        notes: saleNotes,
        created_by: 'Admin'
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      });

      if (res.ok) {
        const result = await res.json();
        showNotification("¡Venta registrada con éxito!", "success");
        setCart([]);
        setSaleNotes('');
        setSelectedClient({ name: '', phone: '', address: '' });
        
        // Refresh sales list in the background
        fetchSales();
        
        // Open the invoice popup immediately
        setSelectedSale(result.sale);
      } else {
        const errData = await res.json();
        showNotification(errData.error || "Error al registrar la venta.", "error");
      }
    } catch (err) {
      console.error("Error registering sale:", err);
      showNotification("Error de conexión al servidor.", "error");
    } finally {
      setRegisteringSale(false);
    }
  };




  // Form states
  interface UploadedImageState {
    id: string;
    file?: File;
    url: string;
    order: number;
    isprimary: boolean;
  }

  const [localImages, setLocalImages] = useState<UploadedImageState[]>([]);
  const [enhancingImages, setEnhancingImages] = useState<boolean>(false);
  const [enhancingStep, setEnhancingStep] = useState<string>('');

  const handleImageFilesSelect = async (files: FileList) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const maxFilesCount = 10;

    // Simulate AI enhancement as a non-blocking background indicator
    setEnhancingImages(true);
    setEnhancingStep('Comprimiendo y optimizando imágenes para carga ultra rápida...');

    const newImages = [...localImages];
    
    // Add selected images to state immediately so they are fully registered and visible instantly
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (newImages.length >= maxFilesCount) {
        alert(`Error: El límite máximo de imágenes por producto es de ${maxFilesCount}.`);
        break;
      }

      if (!allowedTypes.includes(file.type)) {
        alert(`Error: El archivo "${file.name}" no tiene un formato válido (solo PNG, JPG, JPEG, WEBP).`);
        continue;
      }

      try {
        const compressedResult = await compressAndResizeImage(file);
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        newImages.push({
          id: tempId,
          file: compressedResult.file,
          url: compressedResult.dataUrl,
          order: newImages.length,
          isprimary: newImages.length === 0
        });
      } catch (err) {
        console.error("Compression failed, using original file:", err);
        const objectUrl = URL.createObjectURL(file);
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        newImages.push({
          id: tempId,
          file: file,
          url: objectUrl,
          order: newImages.length,
          isprimary: newImages.length === 0
        });
      }
    }

    setLocalImages(newImages);

    setEnhancingStep('Analizando textura, colorimetría y costuras de la prenda...');

    setTimeout(() => {
      setEnhancingStep('Reescalando imagen a resolución ultra nítida HD/4K sin alterar detalles originales...');
      
      setTimeout(() => {
        setEnhancementStepIfPossible('Optimizando luminancia natural y eliminando ruido fotográfico residual...');
        
        setTimeout(() => {
          setEnhancingImages(false);
          setEnhancingStep('');
        }, 800);
      }, 800);
    }, 800);
  };

  // Helper helper to support conditional set if needed
  const setEnhancementStepIfPossible = (step: string) => {
    setEnhancingStep(step);
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const updated = [...localImages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;

    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const final = updated.map((img, idx) => ({
      ...img,
      order: idx
    }));

    setLocalImages(final);
  };

  const handleDeleteLocalImage = (id: string) => {
    const filtered = localImages.filter(img => img.id !== id);
    let updated = filtered.map((img, idx) => ({
      ...img,
      order: idx
    }));

    if (updated.length > 0 && !updated.some(img => img.isprimary)) {
      updated[0].isprimary = true;
    }

    setLocalImages(updated);
  };

  const handleSetPrimaryImage = (id: string) => {
    const updated = localImages.map(img => ({
      ...img,
      isprimary: img.id === id
    }));
    setLocalImages(updated);
  };

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Mujer');
  const [stock, setStock] = useState(10);
  const [minStock, setMinStock] = useState(5);
  const [priceBuy, setPriceBuy] = useState(0);
  const [priceSell, setPriceSell] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [visible, setVisible] = useState(true);
  const [description, setDescription] = useState('');
  const [sizes, setSizes] = useState('');
  const [colors, setColors] = useState('');

  // Automatically sync primary image to imageUrl
  useEffect(() => {
    const primary = localImages.find(img => img.isprimary);
    if (primary) {
      setImageUrl(primary.url);
    }
  }, [localImages]);

  // AI Prediction states
  const [loadingAi, setLoadingAi] = useState(false);
  const [selectedAiProduct, setSelectedAiProduct] = useState<Product | null>(null);
  const [aiPrediction, setAiPrediction] = useState<any | null>(null);

  // Description generator state and function
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const handleGenerateDescriptionAi = async () => {
    const primaryImg = localImages.find(img => img.isprimary) || localImages[0];

    setGeneratingDesc(true);
    try {
      let imageBase64 = "";

      if (primaryImg) {
        if (primaryImg.file) {
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(primaryImg.file as File);
          });
        } else if (primaryImg.url) {
          imageBase64 = primaryImg.url;
        }
      }

      const response = await fetch("/api/gemini/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          category,
          name: name || "Prenda KEIN",
          colors,
          sizes,
          priceSell
        })
      });

      if (!response.ok) {
        throw new Error("Error al llamar al servicio de descripción por IA");
      }

      const data = await response.json();
      if (data.status === "success" && data.description) {
        setDescription(data.description);
        showNotification("✨ Descripción automática personalizada generada por IA con éxito", "success");
      } else {
        throw new Error(data.error || "No se pudo generar la descripción");
      }
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo generar la descripción por IA: ${err.message || err}`);
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    const defaultCategory = 'Mujer';
    setCategory(defaultCategory);
    setSku(generateUniqueSku(products, defaultCategory));
    setName('');
    setStock(15);
    setMinStock(5);
    setPriceBuy(10);
    setPriceSell(25);
    setImageUrl('');
    setLocalImages([]);
    setVisible(true);
    setDescription('');
    setSizes('S, M, L, XL');
    setColors('Negro, Blanco, Beige');
    setShowModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setStock(p.stock);
    setMinStock(p.minStock);
    setPriceBuy(p.priceBuy);
    setPriceSell(p.priceSell);
    setImageUrl(p.imageUrl);
    if (p.images && p.images.length > 0) {
      setLocalImages(p.images.map(img => ({
        id: img.storage_key || img.url,
        url: img.url,
        order: img.order,
        isprimary: !!img.isprimary
      })));
    } else if (p.imageUrl) {
      setLocalImages([{
        id: p.imageUrl,
        url: p.imageUrl,
        order: 0,
        isprimary: true
      }]);
    } else {
      setLocalImages([]);
    }
    setVisible(p.visible);
    setDescription(p.description || '');
    setSizes(p.sizes?.join(', ') || '');
    setColors(p.colors?.join(', ') || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (priceSell < 0) {
      alert("Error: El precio de venta debe ser mayor o igual a 0.");
      return;
    }
    if (stock < 0) {
      alert("Error: El stock disponible no puede ser negativo.");
      return;
    }

    const sizeList = sizes.split(',').map(s => s.trim()).filter(Boolean);
    if ((category === 'Mujer' || category === 'Hombre' || category === 'Unisex') && sizeList.length === 0) {
      alert("Error: Para productos de vestuario (ropa), las tallas son requeridas y no pueden estar vacías.");
      return;
    }

    // Prepare images metadata and files
    const finalImages: ProductImage[] = localImages.map(img => ({
      url: img.url || "", // Keep preview url/dataUrl as fallback
      order: img.order,
      isprimary: img.isprimary,
      storage_key: img.file ? img.file.name : img.id,
      file_name: img.file ? img.file.name : undefined
    }));

    const filesToUpload = localImages
      .filter(img => img.file !== undefined)
      .map(img => img.file as File);

    const productData: Product & { files?: File[] } = {
      sku,
      name,
      category,
      stock: Number(stock),
      minStock: Number(minStock),
      priceBuy: Number(priceBuy),
      priceSell: Number(priceSell),
      imageUrl: imageUrl || "",
      visible,
      description,
      sizes: sizeList,
      colors: colors.split(',').map(c => c.trim()).filter(Boolean),
      images: finalImages,
      files: filesToUpload
    };

    // Event-driven sync simulation & Rollback
    if (autoSync) {
      if (simulateError) {
        setSyncStatus('failed');
        setToastMessage(`❌ Error de sincronización para ${sku}. Publicación fallida. Se aplicó Rollback de seguridad.`);
        setShowSyncToast(true);
        setTimeout(() => setShowSyncToast(false), 5000);
        // Do not close the modal, keep editing so they can retry
        return;
      } else {
        setSyncStatus('success');
        setToastMessage(`⚡ Evento emitido: product.${editingProduct ? 'updated' : 'created'}. Sincronizado en CDN en 0.1s.`);
        setShowSyncToast(true);
        setTimeout(() => setShowSyncToast(false), 4000);
      }
    } else {
      setSyncStatus('idle');
    }

    if (editingProduct) {
      onUpdateProduct(productData);
      showNotification(`¡Producto ${productData.sku} (${productData.name}) actualizado con éxito!`, 'success');
    } else {
      onAddProduct(productData);
      showNotification(`¡Nuevo producto ${productData.sku} (${productData.name}) registrado con éxito!`, 'success');
    }
    setShowModal(false);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteMode('soft');
    setDeleteReason('');
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!productToDelete) return;

    if (deleteMode === 'hard' && !deleteReason.trim()) {
      showNotification('Por favor, indica el motivo de la eliminación permanente (requerido para eliminación definitiva).', 'error');
      return;
    }

    onDeleteProduct(productToDelete.sku, deleteMode, deleteReason);
    showNotification(
      `¡Producto ${productToDelete.sku} ${
        deleteMode === 'hard' ? 'eliminado permanentemente' : 'inactivado correctamente'
      }!`,
      deleteMode === 'hard' ? 'error' : 'success'
    );
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  // Hit predictive AI endpoint
  const getAiPrediction = async (product: Product) => {
    setSelectedAiProduct(product);
    setLoadingAi(true);
    setAiPrediction(null);
    try {
      const response = await fetch('/api/ai/predict-demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSku: product.sku,
          productName: product.name,
          category: product.category,
          currentStock: product.stock,
          priceSell: product.priceSell
        })
      });
      const data = await response.json();
      setAiPrediction(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  const categories = ['Todas', 'Mujer', 'Accesorios', 'Hombre', 'Unisex', 'Otros'];

  // Global AI alerts for products
  const lowStockAlerts = products.filter(p => p.stock <= p.minStock);
  const excessStockAlerts = products.filter(p => p.stock > 35);

  // Filter products first
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todas' || p.category === categoryFilter;
    
    // Status and soft delete check
    const isDeleted = p.deleted_at || p.status === 'inactive';
    
    if (showDeletedFilter === 'active') {
      return matchesSearch && matchesCategory && !isDeleted;
    } else if (showDeletedFilter === 'deleted') {
      return matchesSearch && matchesCategory && isDeleted;
    }
    return matchesSearch && matchesCategory; // 'all'
  });

  // Sort products based on selected sorting mode
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (orderMode === 'price_desc') {
      return b.priceSell - a.priceSell;
    } else if (orderMode === 'price_asc') {
      return a.priceSell - b.priceSell;
    } else if (orderMode === 'recent') {
      return products.indexOf(a) - products.indexOf(b);
    } else if (orderMode === 'old') {
      return products.indexOf(b) - products.indexOf(a);
    }
    return 0;
  });

  // Drag and drop handlers for gallery mode
  const handleDragStart = (e: React.DragEvent, sku: string) => {
    e.dataTransfer.setData('text/plain', sku);
    setDraggedSku(sku);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetSku: string) => {
    e.preventDefault();
    const sourceSku = e.dataTransfer.getData('text/plain') || draggedSku;
    if (!sourceSku || sourceSku === targetSku) return;

    const sourceIndex = products.findIndex(p => p.sku === sourceSku);
    const targetIndex = products.findIndex(p => p.sku === targetSku);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const reordered = [...products];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    if (onReorderProducts) {
      onReorderProducts(reordered);
    }
    setDraggedSku(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Sub-Tabs Selector Bar */}
      <div className="flex border-b border-gray-200 bg-white p-1 rounded-xl shadow-sm gap-1">
        <button
          onClick={() => setSubTab('stock')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            subTab === 'stock'
              ? 'bg-[#203180] text-white shadow-md shadow-indigo-900/10'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          📦 Stock & Catálogo
        </button>
        <button
          onClick={() => setSubTab('ventas_registro')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            subTab === 'ventas_registro'
              ? 'bg-[#203180] text-white shadow-md shadow-indigo-900/10'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          💰 Registrar Venta
        </button>
        <button
          onClick={() => setSubTab('ventas_historial')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            subTab === 'ventas_historial'
              ? 'bg-[#203180] text-white shadow-md shadow-indigo-900/10'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          📜 Historial & Facturas
        </button>
      </div>

      {subTab === 'stock' && (
        <>
          {/* AI Global Insights Panel */}
      {(lowStockAlerts.length > 0 || excessStockAlerts.length > 0) && (
        <div id="ai-insights-panel" className="bg-gradient-to-r from-indigo-900/95 to-indigo-950 p-4 rounded-xl border border-indigo-800 text-white shadow-md">
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="w-5 h-5 text-[#FF7AA6]" />
            <h4 className="font-extrabold text-sm tracking-wide uppercase">Recomendaciones del Asistente IA KEINSHOP</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lowStockAlerts.length > 0 && (
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-lg flex flex-col gap-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block">Sugerencia de Reabastecimiento - Stock Crítico</span>
                    <p className="text-xs text-gray-200 mt-0.5 leading-relaxed font-semibold">
                      Hay {lowStockAlerts.length} productos con stock crítico (bajo mínimo). AI sugiere reordenar para evitar quiebre de stock.
                    </p>
                  </div>
                </div>

                {/* Interactive critical products list */}
                <div className="mt-1 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {lowStockAlerts.slice(0, 5).map(prod => (
                    <div key={prod.sku} className="flex items-center justify-between bg-black/30 p-2 rounded-lg border border-white/5 text-[11px] gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></span>
                        <span className="font-extrabold text-white truncate">{prod.name}</span>
                        <span className="text-gray-400 font-mono text-[9px] flex-shrink-0">({prod.sku})</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-amber-300 font-bold font-mono">S: {prod.stock} / Mín: {prod.minStock}</span>
                        <button
                          onClick={() => {
                            const val = Math.max(0, prod.minStock - 1);
                            onUpdateProduct({ ...prod, minStock: val });
                            showNotification(`Límite reducido a ${val} para ${prod.name}`, 'info');
                          }}
                          className="bg-white/10 hover:bg-white/20 hover:text-red-300 text-white font-extrabold px-1.5 py-0.5 rounded text-[9px] transition-all"
                          title="Reducir stock mínimo sugerido"
                        >
                          - Mín
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {excessStockAlerts.length > 0 && (
              <div className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-start gap-2.5">
                <TrendingDown className="w-4 h-4 text-[#FF7AA6] mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-[#FF7AA6] block">Optimización de Rotación</span>
                  <p className="text-xs text-gray-200 mt-0.5 leading-relaxed font-semibold">
                    Hay {excessStockAlerts.length} productos con exceso de stock (&gt;35 u.). AI sugiere pautar en Reels o lanzar un descuento flash del 15% para liberar espacio.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Internal Notification Alerts */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-3.5 rounded-xl text-xs font-bold border flex items-center justify-between shadow-sm z-30 ${
              notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600 font-extrabold text-sm ml-4">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern sticky-feel search, sorting, view switcher and action bar */}
      <div id="inventory-toolbar" className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex-1 flex flex-col md:flex-row gap-3 items-stretch md:items-center w-full">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por SKU o Nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#203180]"
            />
          </div>

          {/* Category Filter */}
          <div className="relative md:w-44">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#203180] appearance-none cursor-pointer font-medium"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          {/* Sorting Dropdown */}
          <div className="relative md:w-52">
            <select
              value={orderMode}
              onChange={(e) => setOrderMode(e.target.value as any)}
              className="w-full pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#203180] appearance-none cursor-pointer font-medium"
            >
              <option value="recent">Recientemente agregados</option>
              <option value="old">Más antiguos</option>
              <option value="price_desc">Precio: Alto a Bajo</option>
              <option value="price_asc">Precio: Bajo a Alto</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
          {/* View Mode Toggle Buttons */}
          <div className="flex border border-gray-200 rounded-lg p-1 bg-gray-50 flex-shrink-0">
            <button
              id="btn-mode-gallery"
              onClick={() => setViewMode('gallery')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'gallery' ? 'bg-white text-[#203180] shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Formato Galería"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              id="btn-mode-list"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white text-[#203180] shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Formato Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {role !== 'Gestor de Contenido' && (
            <button
              id="btn-add-product"
              onClick={handleOpenAdd}
              className="bg-[#203180] text-white hover:bg-indigo-950 font-extrabold text-xs py-2.5 px-4 rounded-lg flex items-center gap-2 tracking-wide shadow-md active:scale-95 transition-all flex-1 md:flex-none justify-center"
            >
              <Plus className="w-4 h-4" /> Añadir Producto
            </button>
          )}
        </div>
      </div>

      {/* Tabs de Filtro de Estado (Activos, Papelera, Todos) & discreet counter badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200 inline-flex shadow-sm">
          <button
            onClick={() => setShowDeletedFilter('active')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              showDeletedFilter === 'active'
                ? 'bg-[#203180] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📦 Activos
          </button>
          <button
            onClick={() => setShowDeletedFilter('deleted')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              showDeletedFilter === 'deleted'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-red-600'
            }`}
          >
            🗑️ Papelera de Reciclaje
            {products.filter(p => p.deleted_at || p.status === 'inactive').length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                showDeletedFilter === 'deleted' ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'
              }`}>
                {products.filter(p => p.deleted_at || p.status === 'inactive').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowDeletedFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              showDeletedFilter === 'all'
                ? 'bg-gray-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📂 Mostrar Todo
          </button>
        </div>

        {/* Discreet added products counter badge in corner */}
        <div className="text-[11px] text-gray-400 font-medium px-2.5 py-1 bg-white border border-gray-200/80 rounded-lg inline-flex items-center gap-1.5 shadow-2xs cursor-default">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-gray-700 font-bold">{products.filter(p => !p.deleted_at && p.status !== 'inactive').length}</span>
          <span>productos añadidos</span>
        </div>
      </div>

      {/* Drag & Drop Reorder Tip (Only visible in gallery mode with recent sorting) */}
      {viewMode === 'gallery' && orderMode === 'recent' && sortedProducts.length > 1 && (
        <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 px-1 animate-pulse">
          <Layers className="w-3 h-3 text-[#203180]" />
          <span>¡Tip interactivo! Puedes arrastrar y soltar (drag &amp; drop) las tarjetas en la galería para reordenarlas libremente.</span>
        </p>
      )}

      {/* MAIN PRODUCTS CONTAINER (Gallery vs List view mode with animations) */}
      <AnimatePresence mode="wait">
        {viewMode === 'gallery' ? (
          <motion.div
            key="gallery-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            id="products-gallery"
            className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-5"
          >
            {sortedProducts.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
                No se encontraron productos en el inventario.
              </div>
            ) : (
              sortedProducts.map((product) => {
                const isLow = product.stock <= product.minStock;
                const isDragged = draggedSku === product.sku;
                return (
                  <div
                    key={product.sku}
                    id={`product-card-${product.sku}`}
                    draggable={orderMode === 'recent' && !(product.deleted_at || product.status === 'inactive')}
                    onDragStart={(e) => handleDragStart(e, product.sku)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, product.sku)}
                    onDragEnd={() => setDraggedSku(null)}
                    className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col cursor-grab active:cursor-grabbing relative group ${
                      product.deleted_at || product.status === 'inactive'
                        ? 'opacity-85 border-red-200 bg-red-50/5'
                        : 'border-gray-200'
                    } ${
                      isDragged ? 'opacity-40 border-dashed border-[#203180] scale-95' : ''
                    }`}
                  >
                    {/* Image frame (Clicking photo opens product editor) */}
                    <div 
                      onClick={() => handleOpenEdit(product)}
                      className="aspect-square relative w-full overflow-hidden bg-gray-50 border-b border-gray-100 cursor-pointer"
                      title="Haz clic para editar el producto"
                    >
                      <FallbackImage 
                        src={getFreshImageUrl(product.imageUrl, product.version)} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Interactive edit badge indicator on hover */}
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 text-[#203180] font-black text-[10px] px-2 py-1 rounded-lg shadow flex items-center gap-1.5">
                          <Edit className="w-3 h-3" /> Editar Producto
                        </span>
                      </div>

                      {/* Stock Badge Overlay */}
                      <div className="absolute top-2 left-2">
                        <span className={`font-black text-[10px] px-2 py-0.5 rounded-md shadow-sm ${
                          isLow ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-800'
                        }`}>
                          Stock: {product.stock}
                        </span>
                      </div>

                      {/* Low Stock Warning Overlay */}
                      {isLow && !(product.deleted_at || product.status === 'inactive') && (
                        <div className="absolute top-2 right-2">
                          <span title="Stock por debajo del mínimo">
                            <AlertCircle className="w-5 h-5 text-red-600 bg-white rounded-full p-0.5 shadow-sm" />
                          </span>
                        </div>
                      )}

                      {/* Deleted Badge Overlay */}
                      {(product.deleted_at || product.status === 'inactive') && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-red-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider flex items-center gap-1">
                            <Trash2 className="w-2.5 h-2.5" /> Eliminado
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Body - ONLY photo, priceBuy, priceSell and stock as requested */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h4 className="font-bold text-gray-800 text-xs tracking-tight line-clamp-1 group-hover:text-[#203180] transition-colors">
                          {product.name}
                        </h4>
                        <span className="font-mono text-[9px] block text-gray-400 mt-0.5">{product.sku} | {product.category}</span>
                        {(product.deleted_at || product.status === 'inactive') && product.deleted_reason && (
                          <span className="text-[10px] text-red-600 block italic mt-1 bg-red-50 p-1 rounded border border-red-100 line-clamp-2" title={product.deleted_reason}>
                            Motivo: {product.deleted_reason}
                          </span>
                        )}
                      </div>

                      {/* Prices Section (Costo / Compra vs Venta) */}
                      <div className="grid grid-cols-2 gap-1 border-t border-gray-100 pt-1.5">
                        <div>
                          <span className="text-[9px] text-gray-400 font-extrabold uppercase block">Costo</span>
                          <span className="font-mono text-[10px] font-semibold text-gray-500">
                            ${product.priceBuy.toLocaleString('es-CO')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-indigo-400 font-extrabold uppercase block">Venta</span>
                          <span className="font-mono text-xs font-black text-indigo-950">
                            ${product.priceSell.toLocaleString('es-CO')}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Manual Adjustment of minStock */}
                      <div className="flex items-center justify-between bg-gray-50 p-1.5 rounded-lg border border-gray-150 text-[10px]" onClick={(e) => e.stopPropagation()}>
                        <span className="font-bold text-gray-500">Stock Mínimo:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newVal = Math.max(0, product.minStock - 1);
                              onUpdateProduct({ ...product, minStock: newVal });
                              showNotification(`Stock mínimo ajustado a ${newVal} para ${product.name}`, 'info');
                            }}
                            className="bg-white hover:bg-gray-100 text-gray-600 font-black h-4.5 w-4.5 rounded border border-gray-200 flex items-center justify-center text-xs shadow-sm transition-all active:scale-90"
                          >
                            -
                          </button>
                          <span className="font-mono font-black text-gray-800 w-6 text-center">{product.minStock}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newVal = product.minStock + 1;
                              onUpdateProduct({ ...product, minStock: newVal });
                              showNotification(`Stock mínimo ajustado a ${newVal} para ${product.name}`, 'info');
                            }}
                            className="bg-white hover:bg-gray-100 text-gray-600 font-black h-4.5 w-4.5 rounded border border-gray-200 flex items-center justify-center text-xs shadow-sm transition-all active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Action buttons (Row footer inside card) */}
                      <div className="flex gap-1.5 pt-1 border-t border-gray-50">
                        {product.deleted_at || product.status === 'inactive' ? (
                          <button
                            onClick={() => {
                              if (onRestoreProduct) {
                                onRestoreProduct(product.sku);
                                showNotification(`¡Producto ${product.sku} restaurado correctamente!`, 'success');
                              }
                            }}
                            className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 font-extrabold text-[10px] py-1.5 px-1 rounded-md flex items-center justify-center gap-1 transition-colors"
                            title="Restaurar Producto"
                          >
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} /> Restaurar Producto
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => getAiPrediction(product)}
                              className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-[#203180] font-bold text-[9px] py-1 px-1 rounded-md flex items-center justify-center gap-0.5 transition-colors"
                              title="Predictor IA"
                            >
                              <Sparkles className="w-3 h-3 text-[#FF7AA6]" /> Predictor IA
                            </button>
                            {role === 'Admin' && (
                              <button
                                onClick={() => handleDeleteClick(product)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 p-1 rounded-md transition-colors"
                                title="Eliminar producto"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            id="products-list-table"
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">SKU / Cat</th>
                    <th className="px-6 py-4">Stock actual</th>
                    <th className="px-6 py-4">Precios (Compra/Venta)</th>
                    <th className="px-6 py-4">Estado Catálogo</th>
                    <th className="px-6 py-4">Inteligencia IA</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        No se encontraron productos en el inventario.
                      </td>
                    </tr>
                  ) : (
                    sortedProducts.map((product) => {
                      const isLow = product.stock <= product.minStock;
                      return (
                        <tr key={product.sku} className={`transition-colors ${
                          product.deleted_at || product.status === 'inactive'
                            ? 'bg-red-50/10 hover:bg-red-50/20 opacity-80'
                            : 'hover:bg-gray-50'
                        }`}>
                          <td className="px-6 py-4 flex items-center space-x-3">
                            <FallbackImage 
                              src={getFreshImageUrl(product.imageUrl, product.version)} 
                              alt={product.name} 
                              className="w-11 h-11 rounded-lg object-cover border border-gray-200 bg-gray-50 flex-shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900">{product.name}</h4>
                                {(product.deleted_at || product.status === 'inactive') && (
                                  <span className="bg-red-100 text-red-800 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                    Eliminado
                                  </span>
                                )}
                              </div>
                              
                              {/* Interactive Manual Adjustment of minStock in List View */}
                              <div className="flex items-center gap-1.5 mt-1 bg-gray-50 p-1 rounded border border-gray-200 w-max text-[10px]" onClick={(e) => e.stopPropagation()}>
                                <span className="font-bold text-gray-500">Stock Mín:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newVal = Math.max(0, product.minStock - 1);
                                    onUpdateProduct({ ...product, minStock: newVal });
                                    showNotification(`Stock mínimo ajustado a ${newVal} para ${product.name}`, 'info');
                                  }}
                                  className="bg-white hover:bg-gray-100 text-gray-600 font-black h-4.5 w-4.5 rounded border border-gray-200 flex items-center justify-center text-xs"
                                >
                                  -
                                </button>
                                <span className="font-mono font-black text-gray-800 w-5 text-center">{product.minStock}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newVal = product.minStock + 1;
                                    onUpdateProduct({ ...product, minStock: newVal });
                                    showNotification(`Stock mínimo ajustado a ${newVal} para ${product.name}`, 'info');
                                  }}
                                  className="bg-white hover:bg-gray-100 text-gray-600 font-black h-4.5 w-4.5 rounded border border-gray-200 flex items-center justify-center text-xs"
                                >
                                  +
                                </button>
                              </div>

                              {(product.deleted_at || product.status === 'inactive') && product.deleted_reason && (
                                <span className="text-[10px] text-red-600 block italic mt-0.5 max-w-xs" title={product.deleted_reason}>
                                  Motivo: {product.deleted_reason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs block text-gray-600 font-bold">{product.sku}</span>
                            <span className="text-xs text-[#203180] font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">{product.category}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <span className={`font-black text-sm px-2.5 py-1 rounded-md ${
                                isLow ? 'bg-red-100 text-[#C80C0C]' : 'bg-green-100 text-green-800'
                              }`}>
                                {product.stock}
                              </span>
                              {isLow && !(product.deleted_at || product.status === 'inactive') && (
                                <span title="Stock por debajo del mínimo">
                                  <AlertCircle className="w-4 h-4 text-[#C80C0C]" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            <div className="text-gray-500">C: ${product.priceBuy.toLocaleString('es-CO')}</div>
                            <div className="text-gray-900 font-bold">V: ${product.priceSell.toLocaleString('es-CO')}</div>
                          </td>
                          <td className="px-6 py-4">
                            {product.deleted_at || product.status === 'inactive' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                                <Trash2 className="w-3.5 h-3.5" /> Inactivo
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                product.visible ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                              }`}>
                                {product.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                {product.visible ? 'Visible' : 'Oculto'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {!(product.deleted_at || product.status === 'inactive') && (
                              <button
                                onClick={() => getAiPrediction(product)}
                                className="bg-indigo-50 text-[#203180] hover:bg-indigo-100 font-extrabold text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1 border border-indigo-100 transition-all active:scale-95 shadow-sm"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[#FF7AA6]" /> Predictor IA
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {product.deleted_at || product.status === 'inactive' ? (
                              <button
                                onClick={() => {
                                  if (onRestoreProduct) {
                                    onRestoreProduct(product.sku);
                                    showNotification(`¡Producto ${product.sku} restaurado correctamente!`, 'success');
                                  }
                                }}
                                className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 transition-colors"
                                title="Restaurar Producto"
                              >
                                <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(product)}
                                  disabled={role === 'Gestor de Contenido'}
                                  className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-50 transition-colors"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(product)}
                                  disabled={role !== 'Admin'}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-[#C80C0C] disabled:opacity-50 transition-colors"
                                  title="Eliminar (Solo Admin)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Prediction Modal Panel */}
      {selectedAiProduct && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-[#050507] rounded-2xl w-full max-w-xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-5 bg-gradient-to-r from-indigo-950 to-[#203180] text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-[#FF7AA6]" />
                <h3 className="font-extrabold text-base">Demanda Predictiva IA KEINSHOP</h3>
              </div>
              <button 
                onClick={() => setSelectedAiProduct(null)} 
                className="text-gray-300 hover:text-white text-sm font-bold bg-white/10 px-2 py-1 rounded"
              >
                Cerrar
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-3.5 pb-4 border-b border-gray-100">
                <FallbackImage 
                  src={getFreshImageUrl(selectedAiProduct.imageUrl, selectedAiProduct.version)} 
                  alt={selectedAiProduct.name} 
                  className="w-14 h-14 rounded-xl object-cover border border-gray-200 shadow-sm"
                />
                <div>
                  <h4 className="font-black text-gray-900 text-base">{selectedAiProduct.name}</h4>
                  <p className="text-xs text-gray-500 font-mono">SKU: {selectedAiProduct.sku} | Stock Actual: {selectedAiProduct.stock} u.</p>
                </div>
              </div>

              {loadingAi ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#FF7AA6] animate-spin" />
                  <span className="text-xs text-gray-500 font-bold">Analizando ventas históricas y tendencias de mercado...</span>
                </div>
              ) : aiPrediction ? (
                <div className="space-y-4">
                  
                  {/* Confidence and demand indicators */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-center">
                      <span className="text-[10px] text-indigo-500 font-bold uppercase block">Demanda</span>
                      <span className={`text-sm font-black uppercase ${
                        aiPrediction.demandLevel === 'Alta' ? 'text-red-600' : 'text-orange-500'
                      }`}>
                        {aiPrediction.demandLevel}
                      </span>
                    </div>
                    <div className="bg-pink-50 p-3 rounded-xl border border-pink-100 text-center">
                      <span className="text-[10px] text-pink-500 font-bold uppercase block">Sugerido Compra</span>
                      <span className="text-sm font-black text-pink-700">+{aiPrediction.recommendedPurchaseQuantity} u.</span>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                      <span className="text-[10px] text-green-600 font-bold uppercase block">Confianza</span>
                      <span className="text-sm font-black text-green-700">{aiPrediction.confidenceScore}%</span>
                    </div>
                  </div>

                  {/* ACTIONABLE FIELD 1: Predictor IA (Sugerir stock mínimo) */}
                  {aiPrediction.suggestedMinStock !== undefined && (
                    <div className="bg-pink-50/50 p-3.5 rounded-xl border border-pink-100 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-pink-600 font-bold uppercase tracking-wider block">Predictor IA: Stock Mínimo</span>
                        <div className="text-xs text-gray-700">
                          Sugerido: <span className="font-mono font-black text-pink-700">{aiPrediction.suggestedMinStock} u.</span>
                          <span className="text-gray-400 font-medium"> (Actual: {selectedAiProduct.minStock} u.)</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateProduct({ ...selectedAiProduct, minStock: Number(aiPrediction.suggestedMinStock) });
                          showNotification(`¡Stock Mínimo de ${selectedAiProduct.sku} actualizado a ${aiPrediction.suggestedMinStock} u.!`, 'success');
                          setSelectedAiProduct(null);
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Aplicar Stock IA
                      </button>
                    </div>
                  )}

                  {/* ACTIONABLE FIELD 2: Asesor IA (Sugerir precio óptimo) */}
                  {aiPrediction.suggestedPrice !== undefined && (
                    <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-150 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Asesor IA: Precio Óptimo</span>
                        <div className="text-xs text-gray-700">
                          Sugerido: <span className="font-mono font-black text-emerald-700">${Number(aiPrediction.suggestedPrice).toLocaleString('es-CO')} COP</span>
                          <span className="text-gray-400 font-medium"> (Actual: ${selectedAiProduct.priceSell.toLocaleString('es-CO')})</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateProduct({ ...selectedAiProduct, priceSell: Number(aiPrediction.suggestedPrice) });
                          showNotification(`¡Precio de venta de ${selectedAiProduct.sku} actualizado a $${Number(aiPrediction.suggestedPrice).toLocaleString('es-CO')} COP!`, 'success');
                          setSelectedAiProduct(null);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Aplicar Precio IA
                      </button>
                    </div>
                  )}

                  {/* ACTIONABLE FIELD 3: Recomendaciones IA (Alerta de rotación o stock) */}
                  {aiPrediction.rotationAlert && (
                    <div className={`p-4 rounded-xl border flex gap-3 ${
                      selectedAiProduct.stock <= selectedAiProduct.minStock 
                        ? 'bg-red-50 border-red-200 text-red-900' 
                        : selectedAiProduct.stock > 35 
                          ? 'bg-amber-50 border-amber-200 text-amber-900' 
                          : 'bg-green-50 border-green-200 text-green-900'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        selectedAiProduct.stock <= selectedAiProduct.minStock ? 'text-red-600' : 'text-amber-500'
                      }`} />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block">Alerta de Rotación / Stock</span>
                        <p className="text-xs font-semibold leading-relaxed mt-1">{aiPrediction.rotationAlert}</p>
                      </div>
                    </div>
                  )}

                  {/* Drivers explaining */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h5 className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">Factores clave (Explicabilidad)</h5>
                    <ul className="space-y-2">
                      {aiPrediction.drivers?.map((driver: string, idx: number) => (
                        <li key={idx} className="text-xs text-gray-700 flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{driver}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Estimation next month */}
                  <div className="flex justify-between items-center p-3 bg-indigo-900 text-white rounded-xl text-xs">
                    <span className="font-semibold">Ventas Estimadas Próximas 4 Semanas:</span>
                    <span className="font-mono font-black text-base bg-white/25 px-2.5 py-0.5 rounded-md">
                      {aiPrediction.estimatedSalesNextMonth} unidades
                    </span>
                  </div>

                </div>
              ) : (
                <p className="text-xs text-red-500">Error cargando predicciones de IA. Por favor, intenta de nuevo.</p>
              )}

            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* --- SUB-TAB: REGISTRAR VENTA --- */}
      {subTab === 'ventas_registro' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Product Selector */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#203180]" />
                  Seleccionar Productos del Catálogo
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Busca y añade prendas al carrito de venta directa</p>
              </div>
              <span className="bg-indigo-50 text-[#203180] text-[10px] uppercase font-black px-2 py-0.5 rounded-full">
                {products.filter(p => p.stock > 0 && !p.deleted_at).length} Disponibles
              </span>
            </div>

            {/* Product Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar prenda por SKU, nombre, etc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#203180]"
              />
            </div>

            {/* Products List Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {products
                .filter(p => !p.deleted_at && p.status !== 'inactive')
                .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(prod => {
                  const outOfStock = prod.stock <= 0;
                  const itemInCart = cart.find(i => i.product.sku === prod.sku);
                  const remainingStock = prod.stock - (itemInCart?.quantity || 0);

                  return (
                    <div 
                      key={prod.sku} 
                      className={`p-3 rounded-xl border flex gap-3 transition-all ${
                        outOfStock 
                          ? 'bg-gray-50 border-gray-150 opacity-60' 
                          : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 relative">
                        <FallbackImage 
                          src={getFreshImageUrl(prod.imageUrl || (prod.images && prod.images.length > 0 ? (prod.images.find(img => img.isprimary)?.url || prod.images[0].url) : ""), prod.version)} 
                          alt={prod.name} 
                          className="w-full h-full object-cover"
                        />
                        {outOfStock && (
                          <span className="absolute inset-0 bg-red-950/40 flex items-center justify-center text-[9px] text-white font-black uppercase">AGOTADO</span>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <span className="text-[10px] font-mono text-gray-400 font-bold block">{prod.sku}</span>
                          <h4 className="font-bold text-xs text-gray-900 truncate leading-snug">{prod.name}</h4>
                          <span className="text-[11px] text-gray-500 block font-semibold">{prod.category}</span>
                        </div>

                        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-gray-100">
                          <span className="font-mono font-black text-[#203180] text-xs">${prod.priceSell} USD</span>
                          <button
                            onClick={() => addToCart(prod)}
                            disabled={outOfStock || remainingStock <= 0}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                              outOfStock || remainingStock <= 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-[#203180] hover:bg-indigo-950 text-white shadow-sm'
                            }`}
                          >
                            {remainingStock <= 0 ? 'Límite' : '+ Añadir'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right Column: Checkout Cart & Client Selection */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Shopping Cart Panel */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  Carrito de Venta
                </h3>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-black px-2.5 py-0.5 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-400">El carrito de ventas está vacío</p>
                  <p className="text-[11px] text-gray-400">Haz clic en "+ Añadir" en el catálogo para registrar una prenda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cart Items List */}
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {cart.map(item => (
                      <div key={item.product.sku} className="p-2.5 bg-gray-50 rounded-xl border border-gray-150 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-mono text-gray-400 block">{item.product.sku}</span>
                          <h4 className="font-bold text-gray-900 truncate">{item.product.name}</h4>
                          <span className="font-mono text-[11px] text-indigo-950 font-semibold block">${item.priceSell} USD c/u</span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => updateCartQuantity(item.product.sku, false)}
                            className="text-gray-500 hover:text-red-600 transition-colors p-0.5"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <span className="font-mono font-black text-xs text-gray-800 w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.product.sku, true)}
                            className="text-gray-500 hover:text-emerald-600 transition-colors p-0.5"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Summary Block */}
                  <div className="pt-3 border-t border-gray-150 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600 font-semibold">
                      <span>Subtotal (Base Gravable)</span>
                      <span className="font-mono font-bold">${cartSubtotal.toFixed(2)} USD</span>
                    </div>

                    <div className="flex justify-between text-gray-600 font-semibold">
                      <span>Impuesto (15% IVA Incluido)</span>
                      <span className="font-mono font-bold text-gray-700">${cartTax.toFixed(2)} USD</span>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-gray-200 text-sm font-black text-gray-900">
                      <span>TOTAL DE COMPRA</span>
                      <span className="font-mono text-base text-[#203180] bg-indigo-50/50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        ${cartTotal.toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Client Registration / Association Panel */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-[#203180]" />
                  Información del Cliente
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Asocia un cliente de la agenda o registra uno nuevo</p>
              </div>

              {/* Client Autocomplete Selection */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Nombre / Razon Social *</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Escribe el nombre del cliente..."
                      value={selectedClient.name}
                      onChange={(e) => {
                        setSelectedClient(prev => ({ ...prev, name: e.target.value }));
                      }}
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#203180]"
                    />
                    
                    {/* Autocomplete suggestions dropdown from clients agenda */}
                    {selectedClient.name && !selectedClient.id && clients.filter(c => c.name.toLowerCase().includes(selectedClient.name.toLowerCase())).length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-40 max-h-40 overflow-y-auto">
                        {clients
                          .filter(c => c.name.toLowerCase().includes(selectedClient.name.toLowerCase()))
                          .map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedClient({
                                  id: c.id,
                                  name: c.name,
                                  phone: c.phone || '',
                                  address: c.direccion || c.address || ''
                                });
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b border-gray-100 transition-colors text-xs font-semibold flex items-center justify-between"
                            >
                              <div>
                                <span className="block text-gray-800">{c.name}</span>
                                <span className="text-[10px] text-gray-400 block">{c.phone || 'Sin Teléfono'}</span>
                              </div>
                              <span className="bg-gray-100 text-gray-600 text-[8px] font-black uppercase px-2 py-0.5 rounded">Asociar</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">WhatsApp / Teléfono</label>
                    <input
                      type="text"
                      placeholder="Ej: +573001234567"
                      value={selectedClient.phone}
                      onChange={(e) => setSelectedClient(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#203180]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Dirección del Cliente</label>
                    <input
                      type="text"
                      placeholder="Ej: Calle 45 #23-12, Bucaramanga"
                      value={selectedClient.address}
                      onChange={(e) => setSelectedClient(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#203180]"
                    />
                  </div>
                </div>

                {/* Notes area */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Notas / Observaciones de Factura</label>
                  <textarea
                    rows={2}
                    placeholder="Escribe comentarios de envío o despacho..."
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#203180] leading-normal"
                  />
                </div>

                {/* Process Button */}
                <button
                  type="button"
                  onClick={registerSale}
                  disabled={cart.length === 0 || !selectedClient.name.trim() || registeringSale}
                  className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider transition-all shadow-md mt-2 flex items-center justify-center gap-2 ${
                    cart.length === 0 || !selectedClient.name.trim() || registeringSale
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:from-emerald-700 hover:to-teal-800'
                  }`}
                >
                  <Check className="w-4 h-4 animate-bounce" />
                  {registeringSale ? 'Registrando Venta...' : 'Registrar Venta & Generar Factura'}
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- SUB-TAB: HISTORIAL DE VENTAS & FACTURAS --- */}
      {subTab === 'ventas_historial' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#203180]" />
                Historial de Ventas & Facturación de Catálogo
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Control de todas las facturas generadas y stock reducido</p>
            </div>
            <button 
              onClick={fetchSales}
              className="text-[#203180] hover:text-[#203180]/80 p-2 hover:bg-gray-50 rounded-lg transition-all"
              title="Actualizar Ventas"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Search Historical Invoices */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar factura por ID de Factura, Nombre de Cliente o SKU de producto..."
              value={searchSaleTerm}
              onChange={(e) => setSearchSaleTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#203180]"
            />
          </div>

          {/* History List Table */}
          {loadingSales ? (
            <div className="py-12 text-center text-xs font-bold text-gray-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#203180]" /> Cargando historial de facturas...
            </div>
          ) : salesList.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-gray-400">No se han registrado ventas aún</p>
              <p className="text-[11px] text-gray-400">Haz clic en la pestaña "Registrar Venta" para crear tu primera factura</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-150">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-150 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Nº Factura</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Fecha de Emisión</th>
                    <th className="p-3">Productos</th>
                    <th className="p-3">Total</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {salesList
                    .filter(sale => {
                      const clientName = sale.client?.name || "";
                      const invoiceId = sale.id || "";
                      const matchesSearch = clientName.toLowerCase().includes(searchSaleTerm.toLowerCase()) || 
                                            invoiceId.toLowerCase().includes(searchSaleTerm.toLowerCase());
                      return matchesSearch;
                    })
                    .map(sale => (
                      <tr key={sale.id} className="hover:bg-indigo-50/20 transition-all text-gray-800">
                        <td className="p-3 font-mono font-black text-gray-900">{sale.id}</td>
                        <td className="p-3">
                          <span className="font-extrabold text-gray-900 block">{sale.client?.name || 'Cliente General'}</span>
                          <span className="text-[10px] text-gray-400 block">{sale.client?.phone || 'Sin Teléfono'}</span>
                        </td>
                        <td className="p-3 text-gray-500">{new Date(sale.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className="bg-indigo-50 text-[#203180] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {sale.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0} prendas
                          </span>
                        </td>
                        <td className="p-3 font-mono font-extrabold text-[#203180]">${sale.total?.toFixed(2)} USD</td>
                        <td className="p-3 flex justify-center gap-1.5 items-center">
                          <button
                            onClick={() => setSelectedSale(sale)}
                            className="bg-[#203180] hover:bg-indigo-950 text-white font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] transition-all flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Factura
                          </button>
                          
                          {sale.client?.phone && (
                            <button
                              onClick={() => {
                                setSelectedSale(sale);
                                setAutoShareOnLoad(true);
                              }}
                              className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] transition-all flex items-center gap-1"
                            >
                              <Share2 className="w-3.5 h-3.5" /> WhatsApp
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteSale(sale.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] transition-all flex items-center gap-1 border border-red-200"
                            title="Eliminar Venta"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- INVOICE PRINT & DETAIL POPUP MODAL --- */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Controls Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-150 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Comprobante de Venta Electrónico</h3>
              <div className="flex items-center gap-2">
                {/* Send PNG Button */}
                <button
                  type="button"
                  disabled={sharingPng}
                  onClick={async () => {
                    const phone = selectedSale.client?.phone || "";
                    const cleanPhone = phone.replace(/[^0-9]/g, "");
                    const textMsg = `¡MUCHAS GRACIAS POR TU COMPRA! 🛍️✨`;
                    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone ? (cleanPhone.startsWith("+") ? cleanPhone : "+" + cleanPhone) : ""}&text=${encodeURIComponent(textMsg)}`;
                    
                    // Open WhatsApp IMMEDIATELY to bypass all browser popup blockers
                    const waWindow = window.open(waUrl, "_blank");
                    if (!waWindow) {
                      showNotification("⚠️ El navegador bloqueó la ventana emergente de WhatsApp. Por favor, permite ventanas emergentes.", "info");
                    }

                    setSharingPng(true);
                    const restoreStyles = await sanitizeStylesheets();
                    try {
                      const element = document.getElementById('printable-invoice-area');
                      if (!element) {
                        showNotification("No se encontró el área de la factura.", "error");
                        setSharingPng(false);
                        restoreStyles();
                        return;
                      }

                      // Render area to canvas with high resolution
                      const canvas = await html2canvas(element, {
                        scale: 2.5, // Crisp PNG look
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff',
                        onclone: (clonedDoc) => {
                          const allElements = clonedDoc.getElementsByTagName('*');
                          for (let i = 0; i < allElements.length; i++) {
                            const el = allElements[i] as HTMLElement;
                            
                            // Process inline style attribute if any
                            const inlineStyle = el.getAttribute('style');
                            if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab'))) {
                              el.setAttribute('style', replaceOklchInString(inlineStyle).replace(/oklab\([^)]+\)/gi, 'rgb(120, 120, 120)'));
                            }
                            
                            // Process computed style colors that html2canvas will parse
                            try {
                              const computed = window.getComputedStyle(el);
                              const propsToFix = [
                                'backgroundColor',
                                'color',
                                'borderColor',
                                'borderTopColor',
                                'borderRightColor',
                                'borderBottomColor',
                                'borderLeftColor'
                              ];
                              propsToFix.forEach((prop) => {
                                const val = (computed as any)[prop];
                                if (val && (val.includes('oklch') || val.includes('oklab'))) {
                                  const rgbVal = replaceOklchInString(val).replace(/oklab\([^)]+\)/gi, 'rgb(120, 120, 120)');
                                  el.style[prop as any] = rgbVal;
                                }
                              });
                            } catch (styleErr) {
                              // Ignore styles that cannot be parsed/computed
                            }
                          }
                        }
                      });

                      // 1. Download the PNG file
                      const imgData = canvas.toDataURL('image/png');
                      const link = document.createElement('a');
                      link.href = imgData;
                      link.download = `FACTURA-${selectedSale.id || 'venta'}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      // 2. Try copying the PNG image blob to clipboard so the user can easily paste it in WhatsApp
                      let copiedToClipboard = false;
                      try {
                        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
                        if (blob && navigator.clipboard && navigator.clipboard.write) {
                          await navigator.clipboard.write([
                            new ClipboardItem({
                              [blob.type]: blob
                            })
                          ]);
                          copiedToClipboard = true;
                        }
                      } catch (clipErr) {
                        console.warn("Clipboard copy fallback applied:", clipErr);
                      }

                      if (copiedToClipboard) {
                        showNotification("✅ ¡Factura PNG descargada y COPIADA al portapapeles! En WhatsApp, presiona Ctrl+V para pegar la factura.", "success");
                      } else {
                        // Fallback: Copy message text to clipboard
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          await navigator.clipboard.writeText(textMsg);
                        }
                        showNotification("✅ ¡Factura PNG descargada! Adjunta la imagen en la pestaña de WhatsApp abierta.", "success");
                      }
                    } catch (err) {
                      console.error("Error al generar PNG:", err);
                      showNotification("Error al generar la factura en PNG.", "error");
                    } finally {
                      restoreStyles();
                      setSharingPng(false);
                    }
                  }}
                  className="bg-[#25D366] hover:bg-[#20ba5a] disabled:bg-[#25D366]/60 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all select-none"
                >
                  {sharingPng ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Generando PNG...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" /> Enviar por WhatsApp
                    </>
                  )}
                </button>
                
                {/* Download PNG Button */}
                <button
                  type="button"
                  disabled={downloadingPng}
                  onClick={downloadInvoicePng}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/60 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all select-none"
                >
                  {downloadingPng ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" /> Descargar PNG
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById('printable-invoice-area')?.innerHTML;
                    if (printContents) {
                      const originalContents = document.body.innerHTML;
                      document.body.innerHTML = printContents;
                      window.print();
                      document.body.innerHTML = originalContents;
                      window.location.reload(); // Restore react bindings safely
                    }
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-extrabold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>

                {/* Delete Sale/Invoice Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteSale(selectedSale.id)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors border border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-extrabold p-1.5 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Gray desktop sheet table background view */}
            <div className="flex-1 overflow-y-auto max-h-[70vh] p-6 bg-gray-100/70">
              
              {/* Paper Document wrapper */}
              <div 
                id="printable-invoice-area" 
                className="p-8 space-y-6 text-xs text-gray-700 bg-white shadow-xl rounded-xl border border-gray-150 font-sans leading-relaxed max-w-[210mm] mx-auto print:shadow-none print:border-none print:p-0"
              >
                
                {/* Centered Logo block */}
                <div className="flex flex-col items-center justify-center pb-2 text-center select-none">
                  <div className="flex items-center gap-2.5">
                    {/* Rounded Square KS Logo (Lilac/pinkish-purple to deep purple gradient) */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#3b429f] to-[#dd579b] flex items-center justify-center text-white font-black text-lg shadow-sm border border-white/10 shrink-0">
                      KS
                    </div>
                    <div className="flex items-center text-xl tracking-tighter font-black">
                      <span className="text-[#203180]">KEIN</span>
                      <span className="text-[#E91E63]">SHOP</span>
                    </div>
                  </div>
                </div>

                {/* Corporate Divider Line */}
                <div className="border-b border-gray-200 w-full mb-1"></div>

                {/* Corporate Info Block (Left Aligned) */}
                <div className="text-left space-y-0.5 text-gray-600 font-medium text-[11px]">
                  <p className="text-gray-900 text-xs font-semibold">
                    Comercialización de <span className="font-extrabold text-[#203180]">Moda</span> & Importaciones
                  </p>
                  <p>Otavalo, Imbabura, Ecuador</p>
                  <p>Sector Plaza de Ponchos, Ricaurte y Quiroga</p>
                  <p>Tel: 0999106921</p>
                  <p>keinshop.1102@gmail.com</p>
                </div>

                {/* Dark Blue Full Width Banner */}
                <div className="bg-[#203180] text-white text-center py-2 px-4 font-bold uppercase text-[11px] tracking-widest rounded-md">
                  FACTURA DE VENTA
                </div>

                {/* Invoice Number & Date / Time Block */}
                <div className="text-center py-1.5 text-[11px] font-bold text-gray-700 flex justify-center items-center gap-4">
                  <span className="text-sm font-black text-[#203180] tracking-wide">{selectedSale.id}</span>
                  <span className="text-gray-300">|</span>
                  <span>Fecha: {new Date(selectedSale.created_at).toLocaleDateString()}</span>
                  <span className="text-gray-300">|</span>
                  <span>Hora: {new Date(selectedSale.created_at).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit", hour12: true})}</span>
                </div>

                {/* Divider Line */}
                <div className="border-b border-gray-200 w-full"></div>

                {/* Cliente Block */}
                <div className="space-y-2">
                  <div className="relative">
                    <h3 className="font-black text-[#203180] text-[11px] uppercase tracking-wide">CLIENTE:</h3>
                    <div className="border-b border-gray-200 w-full mt-1"></div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-800 leading-relaxed">
                    <div>
                      <span className="text-gray-500 font-medium inline-block w-20">Nombre:</span> 
                      <span className="font-extrabold text-gray-900">{selectedSale.client?.name || "Consumidor Final"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium inline-block w-20">Teléfono:</span> 
                      <span className="font-extrabold text-gray-900">{selectedSale.client?.phone || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium inline-block w-20">Dirección:</span> 
                      <span className="font-extrabold text-gray-900">{selectedSale.client?.address || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Divider Line */}
                <div className="border-b border-gray-200 w-full"></div>

                {/* Detalle de Productos Block */}
                <div className="space-y-2">
                  <h3 className="font-black text-[#203180] text-[11px] uppercase tracking-wide">DETALLE DE PRODUCTOS</h3>
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 font-extrabold text-[10px] uppercase tracking-wider border-b border-gray-200">
                          <th className="p-2">Descripción</th>
                          <th className="p-2 text-center w-16">Cant.</th>
                          <th className="p-2 text-right w-28">Precio Unitario</th>
                          <th className="p-2 text-right w-28">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 font-medium text-gray-800">
                        {selectedSale.items?.map((item: any, idx: number) => (
                          <tr key={item.sku || idx} className="hover:bg-gray-50/30">
                            <td className="p-2 font-bold text-gray-900">
                              {item.sku ? <span className="font-mono text-[9px] text-[#203180] mr-2 font-bold bg-indigo-50/70 px-1 py-0.5 rounded border border-indigo-100/50">{item.sku}</span> : null}
                              {item.name}
                            </td>
                            <td className="p-2 text-center font-extrabold text-gray-800">{item.quantity}</td>
                            <td className="p-2 text-right font-mono text-gray-600">${item.price?.toFixed(2)}</td>
                            <td className="p-2 text-right font-mono font-extrabold text-gray-900">${(item.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals Block */}
                <div className="flex flex-col items-end pt-1">
                  <div className="w-60 space-y-1.5 text-xs font-semibold">
                    <div className="flex justify-between text-gray-600 pt-2 border-t border-gray-150">
                      <span>Subtotal :</span>
                      <span className="font-mono text-gray-900">${selectedSale.subtotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>IVA (15%) :</span>
                      <span className="font-mono text-gray-900">${selectedSale.tax?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-black text-[#203180] pt-2 border-t border-gray-300">
                      <span className="tracking-wide">TOTAL:</span>
                      <span className="font-mono text-base">${selectedSale.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes Block */}
                {selectedSale.notes && (
                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/80 text-xs">
                    <span className="font-black text-amber-800 text-[9px] uppercase block mb-0.5">Observaciones:</span>
                    <p className="text-amber-900 leading-normal font-semibold italic">"{selectedSale.notes}"</p>
                  </div>
                )}

                {/* Bottom Invoice Header Line Divider */}
                <div className="border-t border-gray-200 pt-2.5">
                  <p className="text-center font-bold text-gray-600 text-[10px]">
                    Método de Facturación: Descuento Directo de Inventario
                  </p>
                </div>

                {/* Underline matching the footer boundary */}
                <div className="border-b border-gray-200"></div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div 
            style={isMobile ? { height: 'calc(var(--vh, 1vh) * 100)' } : undefined}
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 h-full sm:h-auto max-h-[100vh] sm:max-h-[90vh]"
          >
            <div className="p-4 bg-[#203180] text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold">{editingProduct ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h3>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-gray-200 font-bold p-1 min-w-[44px] min-h-[44px] flex items-center justify-center">X</button>
            </div>

            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden h-full">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-28">
                {role !== 'Admin' && (
                  <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2.5 text-xs font-semibold">
                    ⚠️ Algunos campos del producto (nombre, descripción, imagen, costo y precio de venta) son editables únicamente por el Administrador.
                  </div>
                )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                    disabled={true}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setCategory(newCat);
                      if (!editingProduct) {
                        setSku(generateUniqueSku(products, newCat));
                      }
                    }}
                    disabled={role !== 'Admin'}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-50 focus:outline-none"
                  >
                    <option value="Mujer">Mujer</option>
                    <option value="Accesorios">Accesorios</option>
                    <option value="Hombre">Hombre</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={role !== 'Admin'}
                  placeholder="Ej: Camiseta Oversize Heavyweight KEIN"
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 focus:outline-none focus:border-[#203180]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase">Descripción Detallada</label>
                  {role === 'Admin' && (
                    <button
                      type="button"
                      onClick={handleGenerateDescriptionAi}
                      disabled={generatingDesc}
                      className="text-[10px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all uppercase shadow-sm border border-indigo-100 active:scale-95"
                    >
                      {generatingDesc ? (
                        <>
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5" />
                          Generar descripción automática con IA
                        </>
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={role !== 'Admin'}
                  placeholder="Detalles del producto, composición, etc."
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 focus:outline-none focus:border-[#203180]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tallas (Separadas por coma)</label>
                  <input
                    type="text"
                    value={sizes}
                    onChange={(e) => setSizes(e.target.value)}
                    placeholder="Ej: S, M, L, XL"
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#203180]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Colores (Separados por coma)</label>
                  <input
                    type="text"
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    placeholder="Ej: Negro, Blanco, Beige"
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#203180]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Stock Disponible</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    required
                    min={0}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    required
                    min={0}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Precio Compra / Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceBuy}
                    onChange={(e) => setPriceBuy(Number(e.target.value))}
                    required
                    min={0}
                    disabled={role !== 'Admin'}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceSell}
                    onChange={(e) => setPriceSell(Number(e.target.value))}
                    required
                    min={0}
                    disabled={role !== 'Admin'}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Fotos del Producto (Múltiple, Máx 10, PNG/JPG/WEBP)</label>
                
                {/* Drag-and-drop zone */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) {
                      handleImageFilesSelect(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => {
                    if (!enhancingImages) {
                      document.getElementById('file-upload-input')?.click();
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition-colors flex flex-col items-center justify-center space-y-1.5 ${
                    enhancingImages 
                      ? 'border-indigo-300 bg-indigo-50/10 cursor-not-allowed' 
                      : 'border-gray-200 hover:border-[#203180] bg-gray-50/50 hover:bg-[#203180]/5 cursor-pointer'
                  }`}
                >
                  <Layers className={`w-8 h-8 ${enhancingImages ? 'text-indigo-400 animate-bounce' : 'text-gray-400'}`} />
                  <p className="text-xs font-bold text-gray-600">
                    {enhancingImages ? 'Procesando mejora con IA de KEINSHOP...' : 'Arrastra aquí tus fotos o haz clic para seleccionarlas'}
                  </p>
                  <p className="text-[10px] text-gray-400">Formatos: PNG, JPG, JPEG, WEBP • Hasta 5 MB por archivo</p>
                  <input 
                    type="file" 
                    id="file-upload-input" 
                    multiple 
                    disabled={enhancingImages}
                    accept="image/png, image/jpeg, image/jpg, image/webp" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files) {
                        handleImageFilesSelect(e.target.files);
                      }
                    }}
                  />
                </div>

                {/* AI image enhancement loading / badge */}
                {enhancingImages ? (
                  <div className="mt-3 bg-indigo-50 border border-indigo-150 p-3.5 rounded-xl flex items-center gap-3">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                    </span>
                    <div className="text-left w-full">
                      <p className="text-xs font-black text-indigo-900 uppercase tracking-wide">Mejora de Imagen con IA en Curso...</p>
                      <p className="text-[10px] text-indigo-700 font-extrabold mt-0.5 animate-pulse">
                        ⌛ {enhancingStep || 'Inicializando optimización de imagen...'}
                      </p>
                      <p className="text-[9px] text-gray-500 font-medium mt-1">Garantiza claridad premium en alta definición HD/4K preservando colores y texturas originales.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 bg-gray-50 border border-gray-150 px-3 py-2 rounded-xl flex items-center justify-between text-[10px] text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5 text-gray-600 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      Mejora Automática IA Activa (HD/4K)
                    </span>
                    <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider">Aspecto 100% Natural</span>
                  </div>
                )}

                {/* Thumbnails grid */}
                {localImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2.5 mt-3 p-3 bg-gray-50 rounded-xl border border-gray-150 max-h-56 overflow-y-auto">
                    {localImages.map((img, index) => (
                      <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white aspect-square shadow-sm">
                        <FallbackImage 
                          src={getFreshImageUrl(img.url)} 
                          alt="preview" 
                          className="w-full h-full object-cover" 
                        />
                        {/* Primary Badge */}
                        {img.isprimary && (
                          <span className="absolute top-1 left-1 bg-[#203180] text-[8px] font-black uppercase text-white px-1.5 py-0.5 rounded-md shadow">
                            Principal
                          </span>
                        )}
                        {/* Overlay with Reorder / Set Primary / Delete actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-1.5 transition-opacity">
                          <div className="flex justify-between items-center w-full">
                            <div className="flex gap-0.5">
                              {index > 0 && (
                                <button 
                                  type="button" 
                                  onClick={() => handleMoveImage(index, 'up')}
                                  className="p-1 bg-white/20 hover:bg-white/40 text-white rounded text-[9px] font-black"
                                  title="Mover Izquierda"
                                >
                                  ←
                                </button>
                              )}
                              {index < localImages.length - 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => handleMoveImage(index, 'down')}
                                  className="p-1 bg-white/20 hover:bg-white/40 text-white rounded text-[9px] font-black"
                                  title="Mover Derecha"
                                >
                                  →
                                </button>
                              )}
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteLocalImage(img.id)}
                              className="p-1 bg-red-600 hover:bg-red-700 text-white rounded text-[9px]"
                              title="Eliminar Foto"
                            >
                              ✕
                            </button>
                          </div>
                          
                          {!img.isprimary && (
                            <button 
                              type="button" 
                              onClick={() => handleSetPrimaryImage(img.id)}
                              className="w-full py-0.5 bg-[#203180] hover:bg-[#203180]/90 text-white font-bold text-[8px] rounded uppercase tracking-wider"
                            >
                              Hacer Principal
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="visible-check"
                  checked={visible}
                  onChange={(e) => setVisible(e.target.checked)}
                  className="rounded border-gray-300 text-[#203180]"
                />
                <label htmlFor="visible-check" className="text-xs font-bold text-gray-600 uppercase">Visible en Catálogo Público</label>
              </div>

              {/* Event-driven Synchronization UI Section */}
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-2.5 border border-gray-150">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Sincronización Event-Driven (Real-time)</span>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="auto-sync-check"
                    checked={autoSync}
                    onChange={(e) => {
                      setAutoSync(e.target.checked);
                      if (e.target.checked) {
                        setSyncStatus('success');
                      } else {
                        setSyncStatus('idle');
                      }
                    }}
                    className="rounded border-gray-300 text-[#203180]"
                  />
                  <label htmlFor="auto-sync-check" className="text-xs font-bold text-gray-700">Sincronizar automáticamente con catálogo (Recomendado)</label>
                </div>

                {!autoSync && (
                  <button
                    type="button"
                    onClick={() => {
                      setSyncStatus('success');
                      setToastMessage(`⚡ Publicación manual exitosa para ${sku}. Catálogo actualizado!`);
                      setShowSyncToast(true);
                      setTimeout(() => setShowSyncToast(false), 3000);
                    }}
                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-[#203180] border border-indigo-200 font-extrabold text-[10px] py-1.5 rounded-lg transition-all"
                  >
                    🚀 Publicar en catálogo ahora
                  </button>
                )}

                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1.5 border-t border-gray-200">
                  <span>Estado de Publicación:</span>
                  <span className={`font-bold flex items-center gap-1 ${
                    syncStatus === 'success' ? 'text-green-600' : syncStatus === 'failed' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${syncStatus === 'success' ? 'bg-green-500' : syncStatus === 'failed' ? 'bg-red-500' : 'bg-gray-400'}`} />
                    {syncStatus === 'success' ? 'Sincronizado (product.updated)' : syncStatus === 'failed' ? 'Fallo de publicación' : 'No sincronizado (Offline)'}
                  </span>
                </div>

                {/* Error simulator for rollback validation */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="simulate-error-check"
                    checked={simulateError}
                    onChange={(e) => setSimulateError(e.target.checked)}
                    className="rounded border-gray-300 text-red-600"
                  />
                  <label htmlFor="simulate-error-check" className="text-[10px] font-bold text-red-500">Simular falla de conexión (probar rollback y reintento)</label>
                </div>

                {syncStatus === 'failed' && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] text-red-600 font-medium">⚠️ Error de red detectado. No se publicaron los cambios en el catálogo público.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSimulateError(false);
                        setSyncStatus('success');
                        setToastMessage(`⚡ Reintento exitoso para ${sku}. Evento reenviado a la cola!`);
                        setShowSyncToast(true);
                        setTimeout(() => setShowSyncToast(false), 4000);
                      }}
                      className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-extrabold text-[10px] py-2 rounded-lg transition-all"
                    >
                      🔄 Reintentar sincronización
                    </button>
                  </div>
                )}
              </div>
              
              </div> {/* Close scrollable form-content container */}

              {/* Action bar - Sticky at the bottom */}
              <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-end space-x-2 shrink-0 z-20 shadow-[0_-6px_18px_rgba(0,0,0,0.06)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2.5 px-4 rounded-lg min-h-[44px] min-w-[100px] flex items-center justify-center transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#203180] text-white hover:bg-indigo-950 font-extrabold text-xs py-2.5 px-5 rounded-lg min-h-[44px] flex items-center justify-center shadow-md transition-colors"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Synchronization Alert Notification */}
      {showSyncToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#050507] text-white p-4 rounded-2xl border border-gray-800 shadow-2xl flex items-center gap-3 animate-bounce max-w-sm">
          <div className="bg-green-500/20 text-green-400 p-2 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF7AA6] block">Mensajería Event-Driven</span>
            <p className="text-xs text-gray-200 leading-relaxed font-bold">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN PERSONALIZADO (Soft/Hard Delete con Auditoría) */}
      <AnimatePresence>
        {showDeleteModal && productToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden"
            >
              <div className="bg-red-50 border-b border-red-100 p-5 flex items-center gap-3">
                <div className="bg-red-100 text-red-600 p-2.5 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Eliminar Producto</h3>
                  <p className="text-xs text-red-700 font-medium">Control de ciclo de vida del inventario</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-150 text-xs space-y-1">
                  <div className="text-gray-500 font-bold">PRODUCTO SELECCIONADO:</div>
                  <div className="font-mono text-gray-900 font-black">{productToDelete.sku}</div>
                  <div className="text-gray-800 font-semibold">{productToDelete.name}</div>
                  <div className="text-gray-500 mt-1">Precio: ${productToDelete.priceSell.toLocaleString('es-CO')} | Stock: {productToDelete.stock} u.</div>
                </div>

                <div className="space-y-2.5">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">Tipo de Eliminación</label>
                  
                  <div className="space-y-2">
                    {/* Opción Soft Delete */}
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      deleteMode === 'soft'
                        ? 'border-[#203180] bg-indigo-50/20 shadow-sm'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="delete-type"
                        checked={deleteMode === 'soft'}
                        onChange={() => setDeleteMode('soft')}
                        className="mt-1 text-[#203180] focus:ring-[#203180]"
                      />
                      <div className="text-xs">
                        <span className="font-extrabold text-gray-900 block">Eliminar Temporal (Inactivar / Soft Delete)</span>
                        <span className="text-gray-500 leading-relaxed">Marca el producto como inactivo y lo oculta del catálogo, pero conserva su historial y datos de auditoría. Es completamente restaurable.</span>
                      </div>
                    </label>

                    {/* Opción Hard Delete */}
                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      role !== 'Admin'
                        ? 'border-gray-150 bg-gray-50 opacity-60 cursor-not-allowed'
                        : deleteMode === 'hard'
                        ? 'border-red-600 bg-red-50/10 shadow-sm'
                        : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                    }`}>
                      <input
                        type="radio"
                        name="delete-type"
                        checked={deleteMode === 'hard'}
                        onChange={() => {
                          if (role === 'Admin') {
                            setDeleteMode('hard');
                          }
                        }}
                        disabled={role !== 'Admin'}
                        className="mt-1 text-red-600 focus:ring-red-600"
                      />
                      <div className="text-xs">
                        <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                          Eliminar Permanente (Definitivo / Hard Delete)
                          {role !== 'Admin' && (
                            <span className="bg-gray-200 text-gray-700 font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase">Solo Admin</span>
                          )}
                        </span>
                        <span className="text-gray-500 leading-relaxed">Elimina permanentemente el registro de la base de datos de KEINSHOP. Esta operación es irreversible.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">
                    Motivo de la Eliminación {deleteMode === 'hard' && <span className="text-red-600">*Requerido</span>}
                  </label>
                  <textarea
                    rows={2.5}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Escribe el motivo del descarte o baja de producto para el registro de auditoría..."
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#203180] leading-normal"
                  />
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-extrabold text-xs py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteMode === 'hard' && !deleteReason.trim()}
                  className={`font-extrabold text-xs py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5 ${
                    deleteMode === 'hard'
                      ? 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300'
                      : 'bg-[#203180] hover:bg-indigo-950 text-white'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleteMode === 'hard' ? 'Confirmar Borrado Definitivo' : 'Confirmar Inactivación'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



    </div>
  );
}
