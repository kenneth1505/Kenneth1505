import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  User, 
  Phone, 
  Share2, 
  DollarSign, 
  Camera, 
  MapPin, 
  TrendingUp, 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  Check, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  HelpCircle,
  TrendingDown,
  Info
} from 'lucide-react';
import { SpecialOrder, TimelineEvent } from '../types';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

const DEFAULT_FALLBACK_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 24 24' fill='none' stroke='%23CCCCCC' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' style='background:%23F3F4F6;'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";

export default function PublicTracking() {
  const [orderId, setOrderId] = useState<string>('');
  const [order, setOrder] = useState<SpecialOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchId, setSearchId] = useState<string>('');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Parse order ID from URL query parameters (or pathnames, hashes, etc.)
  useEffect(() => {
    // 1. Check query parameters
    const urlParams = new URLSearchParams(window.location.search);
    let idParam = urlParams.get('id') || urlParams.get('token') || '';

    // 2. If empty, check hash query parameters
    if (!idParam && window.location.hash) {
      const hashQuery = window.location.hash.split('?')[1];
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        idParam = hashParams.get('id') || hashParams.get('token') || '';
      }
    }

    // 3. If still empty, check path segments (e.g., /seguimiento/PE-01 or /pedido/PE-01)
    if (!idParam) {
      const paths = window.location.pathname.split('/').filter(Boolean);
      if (paths.length >= 2) {
        const lastSegment = paths[paths.length - 1];
        // Ensure last segment is not a keywords segment itself
        if (lastSegment && !['seguimiento', 'pedido', 'orders', 'special', 'special-order', 'track'].includes(lastSegment.toLowerCase())) {
          idParam = lastSegment;
        }
      }
    }

    // 4. Fallback: check if the query string itself is the ID
    if (!idParam && window.location.search) {
      const cleanSearch = window.location.search.replace('?', '').trim();
      if (cleanSearch && !cleanSearch.includes('=')) {
        idParam = cleanSearch;
      }
    }

    if (idParam) {
      const cleanId = idParam.trim().toUpperCase();
      setOrderId(cleanId);
      fetchOrder(cleanId);
    } else {
      setLoading(false);
    }
  }, []);

  const formatBrandText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(KEINSHOP)/gi);
    return parts.map((part, i) => 
      part.toUpperCase() === 'KEINSHOP' 
        ? <span key={i} translate="no" className="notranslate font-bold">{part}</span> 
        : part
    );
  };

  const fetchOrder = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const cleanId = id.trim().toUpperCase();
      console.log(`[PublicTracking] Fetching order for ID/Token: ${cleanId}`);

      let orderData: SpecialOrder | null = null;

      // Helper to parse firestore doc
      const parseFirestoreDoc = (docData: any): SpecialOrder => {
        let parsedRaw: any = null;
        if (docData && docData._raw) {
          try {
            parsedRaw = typeof docData._raw === 'string' ? JSON.parse(docData._raw) : docData._raw;
          } catch (e) {
            console.error("Failed to parse doc _raw JSON:", e);
          }
        }

        const merged = { ...docData, ...(parsedRaw || {}) };

        const clientName = merged.client_name || merged.clientName || merged.client || '';
        const clientPhone = merged.client_phone || merged.clientPhone || merged.client_whatsapp || '';
        const clientWhatsapp = merged.client_whatsapp || merged.client_phone || merged.clientPhone || '';
        const source = merged.source || merged.origin_channel || 'WhatsApp';

        return {
          ...merged,
          id: merged.id || merged.order_id || docData.id || '',
          tracking_token: merged.tracking_token || merged.trackingToken || '',
          clientName: clientName,
          clientPhone: clientPhone,
          client_name: clientName,
          client_phone: clientPhone,
          client_whatsapp: clientWhatsapp,
          origin_channel: source,
          source: source,
          status: merged.status || 'PEDIDO_REGISTRADO',
          origin_category: merged.origin_category || merged.originCategory || '',
          totalCost: typeof merged.totalCost === 'number' ? merged.totalCost : (Number(merged.totalCost) || Number(merged.total_cost_usd) || 0),
          paidAmount: typeof merged.paidAmount === 'number' ? merged.paidAmount : (Number(merged.paidAmount) || Number(merged.paid_amount) || 0),
          weightLbs: typeof merged.weightLbs === 'number' ? merged.weightLbs : (Number(merged.weight_lbs) || 0),
          additional_lbs: typeof merged.additional_lbs === 'number' ? merged.additional_lbs : (Number(merged.additionalLbs) || 0),
          costPerLb: typeof merged.costPerLb === 'number' ? merged.costPerLb : (Number(merged.price_per_lb) || 0),
          items: merged.items || [],
          itemsText: merged.itemsText || merged.items_text || '',
          photos: merged.photos || [],
          timeline: merged.timeline || [],
          notes: merged.notes || merged.logistics_notes || '',
          createdAt: merged.createdAt || merged.created_at || '',
          updatedAt: merged.updatedAt || merged.updated_at || '',
          version: merged.version || 1
        } as unknown as SpecialOrder;
      };

      // 1. First attempt: Primary API server endpoint for real-time order status from SQLite/JSON
      try {
        const response = await fetch(`/api/public/special-orders/${cleanId}`);
        if (response.ok) {
          const apiDoc = await response.json();
          orderData = parseFirestoreDoc(apiDoc);
          console.log("[PublicTracking] Successfully found order via Primary API:", orderData);
        }
      } catch (apiErr) {
        console.warn("[PublicTracking] Primary API fetch failed/offline, checking Firestore fallback:", apiErr);
      }

      // 2. Second attempt: Direct Lookup in Firestore collections if API did not return order
      if (!orderData) {
        const targetCollections = ['special_orders', 'specialOrders'];

        // Direct Lookup by Document ID
        for (const collName of targetCollections) {
          if (orderData) break;
          try {
            const docRef = doc(db, collName, cleanId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data) {
                orderData = parseFirestoreDoc(data);
                console.log(`[PublicTracking] Found order in '${collName}' by Document ID direct fetch:`, orderData);
              }
            }
          } catch (docErr) {
            console.error(`Direct document fetch error in '${collName}':`, docErr);
          }
        }

        // Query by tracking_token field
        if (!orderData) {
          for (const collName of targetCollections) {
            if (orderData) break;
            try {
              const q = query(
                collection(db, collName),
                where('tracking_token', '==', cleanId),
                limit(1)
              );
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const docData = querySnapshot.docs[0].data();
                if (docData) {
                  orderData = parseFirestoreDoc(docData);
                  console.log(`[PublicTracking] Found order in '${collName}' by tracking_token query:`, orderData);
                }
              }
            } catch (queryErr) {
              console.error(`Query tracking token error in '${collName}':`, queryErr);
            }
          }
        }
      }

      if (orderData) {
        setOrder(orderData);
        setError('');
      } else {
        setOrder(null);
        setError('No pudimos encontrar ningún pedido con el código ingresado. Por favor, verifica el código e inténtalo de nuevo.');
      }
    } catch (err) {
      console.error("Error fetching order:", err);
      setError('Hubo un problema de conexión al buscar tu pedido. Por favor, inténtalo de nuevo.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      const cleanId = searchId.trim().toUpperCase();
      // Update URL query param without refreshing page
      const newUrl = `${window.location.origin}${window.location.pathname}?id=${cleanId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      setOrderId(cleanId);
      fetchOrder(cleanId);
    }
  };

  // Map database status to active step index (0 to 5)
  const getTimelineStepIndex = (status: string) => {
    const norm = (status || '').toUpperCase();
    if (norm === 'ENTREGADO') return 5;
    if (norm === 'DESPACHO_ADUANERO' || norm === 'DESPACHO_A_DOMICILIO' || norm === 'DESPACHO' || norm === 'EN_TRANSITO_A_ENTREGA') return 4;
    if (norm === 'EN_ADUANA' || norm === 'INGRESO_AL_PAIS' || norm === 'ADUANA') return 3;
    if (norm === 'EN_TRANSITO_AL_PAIS' || norm === 'EN_TRANSITO' || norm === 'TRANSITO') return 2;
    if (norm === 'PEDIDO_ENVIADO' || norm === 'ENVIADO') return 1;
    return 0; // Default: 'PEDIDO_REGISTRADO' or 'CREADO' or 'REGISTRADO'
  };

  const steps = [
    { label: 'Pedido registrado', description: 'Tu pedido ha sido recibido y cargado en el sistema de KEINSHOP.' },
    { label: 'Pedido enviado', description: 'Tu compra ha sido procesada y despachada desde el proveedor.' },
    { label: 'En tránsito', description: 'Tus productos viajan hacia el país de destino en carga logística.' },
    { label: 'En aduana', description: 'El paquete se encuentra en el proceso de nacionalización y aforos.' },
    { label: 'Despacho', description: 'Aprobado de aduana y preparado para entrega local o envío nacional.' },
    { label: 'Entregado', description: '¡Tu pedido ha llegado a tus manos de manera exitosa!' }
  ];

  const activeStep = order ? getTimelineStepIndex(order.status) : 0;

  // Defensive helpers to parse timeline, photos, and items safely
  const parsedTimeline = order ? (
    Array.isArray(order.timeline)
      ? order.timeline
      : typeof order.timeline === 'string'
        ? (() => { try { return JSON.parse(order.timeline); } catch(e) { return []; } })()
        : []
  ) : [];

  const parsedPhotos = order ? (
    Array.isArray(order.photos)
      ? order.photos
      : typeof order.photos === 'string'
        ? (() => { try { return JSON.parse(order.photos); } catch(e) { return []; } })()
        : []
  ) : [];

  const parsedItems = order ? (
    Array.isArray(order.items)
      ? order.items
      : typeof order.items === 'string'
        ? (() => { try { return JSON.parse(order.items); } catch(e) { return []; } })()
        : []
  ) : [];

  // Helpers to calculate economic values
  const totalCost = order?.totalCost || 0;
  const paidAmount = order?.paidAmount || 0;
  const pendingAmount = Math.max(0, totalCost - paidAmount);
  const percentPaid = totalCost > 0 ? Math.min(100, Math.round((paidAmount / totalCost) * 100)) : 0;

  // Logistics calculations
  const weight = order?.weightLbs || 0;
  const extraLbs = order?.additional_lbs || 0;
  const totalLbs = weight + extraLbs;
  const rate = order?.costPerLb || 0;
  const poundCostUsd = Number((totalLbs * rate).toFixed(2));

  // Smooth scroll helper
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans antialiased selection:bg-[#FF7AA6]/30 selection:text-[#203180] relative pb-16 overflow-x-hidden">
      
      {/* Upper header section with custom blended blurry gradient background (Pink and Blue) */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-slate-50 via-white to-transparent pointer-events-none -z-10" />
      
      {/* Blurry gradient auras */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 h-32 bg-gradient-to-r from-[#203180] via-[#FF7AA6] to-[#203180] rounded-full blur-3xl opacity-15 pointer-events-none -z-10" />

      {/* Top Brand Logo Container */}
      <header className="w-full max-w-4xl mx-auto px-4 pt-10 pb-4 text-center flex flex-col items-center">
        <div className="relative group mb-3 cursor-pointer" onClick={() => {
          setOrder(null);
          setOrderId('');
          setSearchId('');
          const cleanUrl = `${window.location.origin}${window.location.pathname}`;
          window.history.pushState({ path: cleanUrl }, '', cleanUrl);
        }}>
          {/* Subtle colored glow ring surrounding the logo */}
          <div className="absolute -inset-2 bg-gradient-to-r from-[#203180] to-[#FF7AA6] rounded-2xl blur-md opacity-30 transition-all duration-700 group-hover:opacity-55" />
          
          <div className="relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 notranslate" translate="no">
            <div className="w-13 h-13 rounded-xl bg-gradient-to-tr from-[#203180] to-[#FF7AA6] flex items-center justify-center">
              <span className="font-black text-white text-xl tracking-tighter">KS</span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-widest text-[#203180] uppercase flex items-center gap-1 notranslate" translate="no">
          KEIN<span className="text-[#FF7AA6]">SHOP</span>
        </h1>
        <div className="h-0.5 w-16 bg-gradient-to-r from-[#203180] to-[#FF7AA6] rounded-full mt-1.5" />
        
        {/* Welcome Call to Action - Formal and Elegant pairing */}
        <div className="max-w-xl mx-auto mt-6 px-4">
          <p className="text-sm md:text-base text-slate-600 font-medium italic leading-relaxed text-center font-serif">
            “¡Bienvenido al seguimiento inteligente de <span translate="no" className="notranslate font-black">KEINSHOP</span>! Consulta aquí el estado de tu pedido en tiempo real.”
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 relative z-10">
        
        {/* Error Handling Wrapper: Tracking ID not found / Connection Error */}
        {error && !order && !loading && (
          <div className="max-w-md mx-auto py-8">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl shadow-slate-100/80 text-center space-y-6"
            >
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500 border border-rose-100/60 shadow-sm">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Pedido no encontrado</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  No pudimos localizar ningún pedido registrado bajo el código <strong className="font-mono text-rose-500 bg-rose-50/50 px-2 py-0.5 rounded border border-rose-100">{orderId || searchId || "ingresado"}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 space-y-3">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#FF7AA6] block">Recomendaciones:</span>
                <ul className="text-[11px] text-slate-600 space-y-2 font-medium list-disc pl-4 leading-normal">
                  <li>Verifica que hayas escrito el código exactamente como te lo envió tu asesor (Ej. <code className="font-mono bg-white px-1 py-0.2 rounded border text-[#203180] font-bold">PE-01</code>).</li>
                  <li>Si el pedido fue creado hace poco, es posible que tarde unos minutos en sincronizarse con la base de datos central.</li>
                  <li>Consulta con tu asesor si el pedido sigue activo o si se te asignó un código diferente.</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={() => {
                    setError('');
                    setOrderId('');
                    setSearchId('');
                    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
                    window.history.pushState({ path: cleanUrl }, '', cleanUrl);
                  }}
                  className="w-full bg-[#203180] hover:bg-[#1a286a] text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Intentar con otro código
                </button>
                
                <a
                  href={`https://api.whatsapp.com/send?phone=593999106921&text=${encodeURIComponent(`Hola KEINSHOP, tengo problemas para rastrear mi pedido especial con el código "${orderId || searchId}". ¿Podrían ayudarme a verificarlo?`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white font-extrabold text-xs py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Phone className="w-4 h-4 fill-white text-white" />
                  Contactar a Soporte por WhatsApp
                </a>
              </div>
            </motion.div>
          </div>
        )}

        {/* State 1: Enter tracking code / Search Bar if order is NOT loaded and no errors are present */}
        {!order && !loading && !error && (
          <div className="max-w-md mx-auto py-8">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl shadow-slate-100/80 text-center space-y-6"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-[#203180]">
                <Package className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-[#203180] tracking-tight">Consultar Pedido Especial</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Por favor introduce el código único de seguimiento generado por tu asesor para visualizar el estado físico, fotos y montos.
                </p>
              </div>

              <form onSubmit={handleSearchSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="trackingId" className="block text-[10px] font-extrabold uppercase tracking-widest text-[#FF7AA6] text-left mb-1.5 ml-1">
                    Código de Pedido (ID)
                  </label>
                  <input
                    type="text"
                    id="trackingId"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    placeholder="Ej: PE-01"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black tracking-widest uppercase placeholder:text-slate-400 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-[#203180] focus:ring-1 focus:ring-[#203180] transition-all text-center text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#203180] hover:bg-[#1a286a] text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  Buscar Pedido 
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100 flex justify-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Coherente</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> En Tiempo Real</span>
              </div>
            </motion.div>
          </div>
        )}

        {/* State 2: Loading Indicator */}
        {loading && (
          <div className="py-20 text-center space-y-4">
            <div className="relative w-12 h-12 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#FF7AA6] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
              Consultando flete y logística <span translate="no" className="notranslate">KEINSHOP</span>...
            </p>
          </div>
        )}

        {/* State 3: Active Tracking Display */}
        {order && !loading && (
          <div className="space-y-6">
            
            {/* Mobile optimized Hero Widget showing active tracking item */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden"
            >
              {/* Colored ambient glow backdrop */}
              <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 w-48 h-48 bg-gradient-to-tr from-indigo-50 to-pink-50 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-1.5 relative z-10">
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white px-2.5 py-1 bg-[#FF7AA6] rounded-full shadow-sm">
                    Seguimiento Activo
                  </span>
                  
                  {/* Origin Brand indicator badge (Shein or Temu) */}
                  {order.origin_category && (
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm ${
                      order.origin_category.toUpperCase() === 'SHEIN'
                        ? 'bg-black text-white'
                        : 'bg-[#FF5500] text-white'
                    }`}>
                      Origen: {order.origin_category}
                    </span>
                  )}
                </div>
                
                <h2 className="text-2xl font-black text-[#203180] tracking-tight flex items-center gap-2 mt-2">
                  ID de Pedido: <span className="font-mono text-slate-800 bg-slate-50 px-3 py-0.5 rounded-xl border border-slate-100">{order.id}</span>
                </h2>
                
                <p className="text-xs text-slate-400">
                  Última sincronización: <span className="font-bold text-slate-600">{order.last_update ? new Date(order.last_update).toLocaleString('es-CO') : new Date().toLocaleDateString('es-CO')}</span>
                </p>
              </div>

              {/* Mobile well-defined quick action navigation buttons */}
              <div className="flex gap-2 relative z-10 w-full md:w-auto mt-2 md:mt-0">
                <button
                  onClick={() => scrollToId('order-timeline')}
                  className="flex-1 md:flex-none bg-[#203180] hover:bg-[#1a286a] text-white font-extrabold text-xs px-4 py-3.5 rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" /> Estado de Envío
                </button>
                <button
                  onClick={() => scrollToId('order-photos')}
                  className="flex-1 md:flex-none bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold text-xs px-4 py-3.5 rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" /> Ver Fotos
                </button>
              </div>
            </motion.div>

            {/* SECCIÓN 1: ENCABEZADO SUPERIOR (Datos del Cliente, Canal y Artículos) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-100/40 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-xs font-black text-[#203180] uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4 text-[#FF7AA6]" /> 1. Datos del Cliente y Origen
                </h3>
                
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Canal: {order.source || order.origin_channel || 'WhatsApp'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Client Contact Info Card */}
                <div className="space-y-4 bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF7AA6]">Información del Comprador</h4>
                  
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-[#203180] shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Nombre del Cliente</span>
                        <span className="text-sm font-extrabold text-slate-800 leading-tight">{order.client_name || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600 shrink-0 mt-0.5">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Contacto Directo</span>
                        <span className="text-sm font-extrabold text-slate-800 font-mono leading-tight">
                          {order.client_whatsapp || order.client_phone || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center text-[#FF7AA6] shrink-0 mt-0.5">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Canal de Registro</span>
                        <span className="text-sm font-extrabold text-slate-800 leading-tight">{order.source || order.origin_channel || 'WhatsApp'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items and Purchase text detail */}
                <div className="space-y-4 bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF7AA6]">Artículos en Importación</h4>
                    
                    <div className="max-h-40 overflow-y-auto pr-1 space-y-2 text-xs text-slate-700 leading-relaxed scrollbar-thin scrollbar-thumb-slate-200">
                      {parsedItems && parsedItems.length > 0 ? (
                        <div className="space-y-2">
                          {parsedItems.map((it: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100">
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 h-5 bg-[#FF7AA6]/10 text-[#FF7AA6] rounded flex items-center justify-center text-[10px] font-black shrink-0">
                                  {it.qty}x
                                </span>
                                <span className="font-extrabold text-slate-800 line-clamp-1">{it.description}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono shrink-0 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                {it.sku || 'ITEM'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="bg-white p-3 rounded-xl text-slate-500 italic border border-slate-100">
                          {order.itemsText || 'Detalle no especificado.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mt-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] text-[#203180] leading-relaxed">
                      <span className="font-extrabold uppercase text-[9px] text-[#FF7AA6] block mb-0.5">Notas logísticas:</span>
                      {order.notes}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>

            {/* SECCIÓN 2: CENTRO DE LA PÁGINA (Valores Económicos y Detalles Logísticos) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Values Card */}
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-100/40 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xs font-black text-[#203180] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> 2. Valores Económicos
                  </h3>
                  
                  <div className="mt-5 space-y-3.5">
                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-bold">Costo Total Productos</span>
                      <span className="text-sm font-black text-slate-800">${totalCost.toLocaleString('es-CO')} USD</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-bold">Abono Realizado</span>
                      <span className="text-sm font-black text-emerald-600">${paidAmount.toLocaleString('es-CO')} USD</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-bold">Saldo Pendiente</span>
                      <span className={`text-base font-black ${pendingAmount > 0 ? 'text-[#FF7AA6]' : 'text-emerald-600'}`}>
                        ${pendingAmount.toLocaleString('es-CO')} USD
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar and Payment Status Badge */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mt-5 space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-extrabold uppercase tracking-wider">Estado de Pago</span>
                    <span className={`font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                      percentPaid === 100 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : percentPaid > 0 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {percentPaid === 100 ? 'COMPLETADO' : percentPaid > 0 ? 'ABONADO' : 'PENDIENTE'}
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#203180] to-[#FF7AA6] h-full rounded-full transition-all duration-700" 
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>{percentPaid}% Cancelado</span>
                    <span>Restante: ${pendingAmount} USD</span>
                  </div>
                </div>
              </motion.div>

              {/* Logistics Card */}
              <motion.div 
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-100/40 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xs font-black text-[#203180] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4">
                    <TrendingUp className="w-4 h-4 text-[#FF7AA6]" /> 3. Detalles Logísticos
                  </h3>
                  
                  <div className="mt-5 space-y-3.5">
                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-bold">Peso base</span>
                      <span className="text-sm font-extrabold text-slate-800 font-mono">{weight} Lbs</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-bold">Libras Extras</span>
                      <span className="text-sm font-extrabold text-slate-800 font-mono">+{extraLbs} Lbs</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-bold">Tarifa por Libra</span>
                      <span className="text-sm font-extrabold text-[#203180] font-mono">${rate} USD</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-bold">Costo de Libras</span>
                      <span className="text-sm font-black text-[#FF7AA6] font-mono">${poundCostUsd} USD</span>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex gap-2.5 items-start mt-5">
                  <Info className="w-4 h-4 text-[#203180] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-[#203180] leading-normal font-medium">
                    El peso total reflejado ({totalLbs} Lbs) se calcula una vez que tu artículo arriba a nuestras bodegas en Miami y es pesado en báscula oficial.
                  </p>
                </div>
              </motion.div>

            </div>

            {/* SECCIÓN 3: PARTE INFERIOR (Timeline de Seguimiento e Historial Logístico) */}
            <motion.div 
              id="order-timeline"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-100/40 space-y-6 scroll-mt-24"
            >
              <h3 className="text-xs font-black text-[#203180] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4">
                <MapPin className="w-4 h-4 text-[#FF7AA6]" /> 4. Timeline del Estado del Pedido
              </h3>

              {/* Progress bar and timeline stages */}
              <div className="py-4">
                
                {/* Horizontal progress tracker - Desktop & Tablet */}
                <div className="hidden md:block relative pb-4">
                  {/* Gray background line for pending */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full" />
                  {/* Dynamic color-coded progress connector line */}
                  <div 
                    className="absolute top-1/2 left-0 h-1 bg-[#203180] -translate-y-1/2 z-0 transition-all duration-1000 ease-out rounded-full" 
                    style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
                  />

                  {/* Nodes list */}
                  <div className="relative z-10 flex justify-between">
                    {steps.map((st, idx) => {
                      const isCompleted = idx < activeStep;
                      const isCurrent = idx === activeStep;
                      
                      // Theme Colors selection
                      // completed: Corporate Blue (#203180)
                      // active: Corporate Pink (#FF7AA6)
                      // pending: Gray
                      let nodeStyle = '';
                      if (isCompleted) {
                        nodeStyle = 'bg-[#203180] border-[#203180] text-white shadow-md shadow-[#203180]/20';
                      } else if (isCurrent) {
                        nodeStyle = 'bg-[#FF7AA6] border-[#FF7AA6] text-white scale-115 ring-4 ring-[#FF7AA6]/20 shadow-lg';
                      } else {
                        nodeStyle = 'bg-slate-100 border-slate-200 text-slate-400';
                      }

                      return (
                        <div key={idx} className="flex flex-col items-center text-center w-28">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${nodeStyle}`}>
                            {isCompleted ? (
                              <Check className="w-4 h-4 font-black" />
                            ) : (
                              <span className="text-[10px] font-black">{idx + 1}</span>
                            )}
                          </div>
                          
                          <span className={`text-[9.5px] font-black mt-3.5 uppercase tracking-wider block ${
                            isCurrent ? 'text-[#FF7AA6]' : isCompleted ? 'text-[#203180]' : 'text-slate-400'
                          }`}>
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vertical progress tracker - Mobile screens */}
                <div className="md:hidden relative space-y-7 pl-7">
                  {/* Vertical gray line */}
                  <div className="absolute top-3 bottom-3 left-[11px] w-0.5 bg-slate-100 z-0" />
                  
                  {/* Dynamic vertical connector line */}
                  <div 
                    className="absolute top-3 left-[11px] w-0.5 bg-[#203180] z-0 transition-all duration-1000 ease-out" 
                    style={{ height: `${(activeStep / (steps.length - 1)) * 88}%` }}
                  />

                  {steps.map((st, idx) => {
                    const isCompleted = idx < activeStep;
                    const isCurrent = idx === activeStep;
                    
                    let nodeStyle = '';
                    if (isCompleted) {
                      nodeStyle = 'bg-[#203180] border-[#203180] text-white shadow-md';
                    } else if (isCurrent) {
                      nodeStyle = 'bg-[#FF7AA6] border-[#FF7AA6] text-white scale-110 ring-4 ring-[#FF7AA6]/15 shadow-md';
                    } else {
                      nodeStyle = 'bg-slate-100 border-slate-200 text-slate-400';
                    }

                    return (
                      <div key={idx} className="relative flex gap-3.5 items-start">
                        {/* Step Circle node */}
                        <div className={`absolute -left-[23px] w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 ${nodeStyle}`}>
                          {isCompleted ? (
                            <Check className="w-3 h-3 font-black" />
                          ) : (
                            <span className="text-[9px] font-black">{idx + 1}</span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h4 className={`text-xs font-black uppercase tracking-wider ${
                            isCurrent ? 'text-[#FF7AA6]' : isCompleted ? 'text-[#203180]' : 'text-slate-400'
                          }`}>
                            {st.label}
                          </h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{formatBrandText(st.description)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Real Audit logs / status events if present */}
              {parsedTimeline && parsedTimeline.length > 0 && (
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF7AA6] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Bitácora de Novedades del Pedido
                  </h4>

                  <div className="space-y-3">
                    {parsedTimeline.map((ev: any, idx: number) => (
                      <div key={idx} className="flex gap-4 items-start p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#203180] shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="text-xs font-black text-[#203180] uppercase tracking-wider">{ev.status ? ev.status.replace(/_/g, ' ') : ''}</span>
                            <span className="text-[9.5px] text-slate-400 font-mono">
                              {ev.timestamp ? new Date(ev.timestamp).toLocaleString('es-CO') : 'Recientemente'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{formatBrandText(ev.note)}</p>
                          <span className="text-[9px] font-bold text-slate-400 block mt-0.5">Asesor: {formatBrandText(ev.updated_by || 'KEINSHOP Operations')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* SECCIÓN 3.5: PARTE INFERIOR (Fotografías Reales de la prenda o artículo) */}
            <motion.div 
              id="order-photos"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-100/40 space-y-6 scroll-mt-24"
            >
              <h3 className="text-xs font-black text-[#203180] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4">
                <Camera className="w-4 h-4 text-[#FF7AA6]" /> 5. Fotografías Reales de las Prendas
              </h3>

              {parsedPhotos && parsedPhotos.length > 0 && parsedPhotos.some(p => p && p !== '') ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {parsedPhotos.map((photo, pIdx) => {
                    if (!photo) return null;
                    return (
                      <div 
                        key={pIdx} 
                        onClick={() => setLightboxImg(photo)}
                        className="group aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 hover:border-[#FF7AA6]/40 cursor-zoom-in transition-all relative"
                      >
                        <img 
                          src={photo} 
                          alt={`Prenda física del pedido ${order.id} - Foto ${pIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-white/95 text-slate-800 font-extrabold text-[10px] uppercase px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1 shadow-sm">
                            Ampliar <ExternalLink className="w-3 h-3 text-[#203180]" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50/50 p-10 text-center rounded-2xl border border-slate-100 text-slate-400 space-y-2">
                  <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-600">Fotos pendientes de carga</h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Aún no se han cargado fotografías físicas de tus artículos. Tan pronto como arriben a nuestro centro de despacho, subiremos las imágenes para tu revisión.
                  </p>
                </div>
              )}
            </motion.div>

            {/* Footer Support Banner */}
            <div className="text-center py-6 space-y-4">
              <p className="text-xs text-slate-400 font-medium">
                ¿Tienes alguna inquietud o quieres reportar un cambio sobre tu pedido?
              </p>
              
              <div className="flex justify-center gap-3">
                <a
                  href={`https://api.whatsapp.com/send?phone=593999106921&text=${encodeURIComponent(`Hola KEINSHOP, tengo una duda sobre mi pedido especial ${order.id} registrado a nombre de ${order.client_name}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#25D366] hover:bg-[#25D366]/90 text-white font-extrabold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Phone className="w-4 h-4 fill-white text-white" /> Soporte WhatsApp <span translate="no" className="notranslate">KEINSHOP</span>
                </a>
              </div>
              
              <div className="pt-6 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                  © {new Date().getFullYear()} <span translate="no" className="notranslate">KEINSHOP</span> CRM. Todos los derechos reservados.
                </p>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImg(null)}
            className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={lightboxImg} 
                alt="Prenda Ampliada" 
                className="w-full h-auto max-h-[75vh] object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-4 inset-x-0 flex justify-center">
                <button 
                  onClick={() => setLightboxImg(null)}
                  className="bg-[#203180] hover:bg-[#1a286a] text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-md border border-[#203180]/20"
                >
                  Cerrar Visualizador
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
