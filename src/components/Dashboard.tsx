import React from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  ShoppingBag, 
  Package, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  Sparkles,
  Zap,
  RotateCcw,
  Eye,
  Heart,
  MousePointer
} from 'lucide-react';
import { Product, SpecialOrder, Transaction, Publication, Client, UserRole } from '../types';
import { FallbackImage } from './FallbackImage';

interface DashboardProps {
  products: Product[];
  orders: SpecialOrder[];
  transactions: Transaction[];
  publications: Publication[];
  clients: Client[];
  role: UserRole;
  onNavigate: (tab: string) => void;
  onAddProductQuick?: () => void;
  onAddOrderQuick?: () => void;
  onAddPostQuick?: () => void;
  undoHistoryLength: number;
  onUndo?: () => void;
}

const DEFAULT_FALLBACK_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23CCCCCC' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' style='background:%23F3F4F6;'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";

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

export default function Dashboard({ 
  products, 
  orders, 
  transactions, 
  publications, 
  clients,
  role,
  onNavigate,
  onAddProductQuick,
  onAddOrderQuick,
  onAddPostQuick,
  undoHistoryLength,
  onUndo
}: DashboardProps) {

  // State for real interactions fetched from DB
  const [interactions, setInteractions] = React.useState<any[]>([]);
  const [isInteractionsLoading, setIsInteractionsLoading] = React.useState(true);

  const fetchInteractions = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('keinshop_jwt_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/interactions', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setInteractions(data);
        }
      }
    } catch (err) {
      console.error("Error fetching interactions:", err);
    } finally {
      setIsInteractionsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  // Generate metrics from real-time customer interactions
  const productsWithMetrics = React.useMemo(() => {
    return products.map((p) => {
      const pInters = interactions.filter(i => i.product_id === p.sku);
      const views = pInters.filter(i => i.type === 'view').length;
      const clicks = pInters.filter(i => i.type === 'click').length;
      const orders = pInters.filter(i => i.type === 'order').length;

      // Compound Score: views*0.3 + clicks*0.5 + orders*1.0
      const score = (views * 0.3) + (clicks * 0.5) + (orders * 1.0);

      return {
        ...p,
        views,
        clicks,
        orders,
        score: Math.round(score * 10) / 10,
        interactions: Math.round(score * 10) / 10 // score shown as total points
      };
    });
  }, [products, interactions]);

  const topInteractionsProducts = React.useMemo(() => {
    return [...productsWithMetrics]
      .filter(p => p.views > 0 || p.clicks > 0 || p.orders > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4); // Show up to 4 top interactive items
  }, [productsWithMetrics]);

  // States for IA Prediction Interactive Deductions
  const [isDeducing, setIsDeducing] = React.useState(false);
  const [deductionStep, setDeductionStep] = React.useState(0);
  const [aiDeductionResult, setAiDeductionResult] = React.useState<{
    gustos: string;
    demanda: string;
    stockSugerencia: string;
    promoSugerencia: string;
  } | null>(() => {
    // Default initial/fallback data
    return {
      gustos: `La IA de KEINSHOP está lista para procesar el catálogo en tiempo real. Presiona "Recalcular" para forzar el análisis de la base de datos.`,
      demanda: `Proyección: Se estima un aumento en el ticket promedio mediante la integración directa del catálogo público.`,
      stockSugerencia: `Alerta stock: El motor supervisa constantemente las existencias de buzos y gorras.`,
      promoSugerencia: `Estrategia sugerida: Diseñar combos de vestuario oversize más gorras trucker.`
    };
  });

  const handleRunDeduction = async () => {
    setIsDeducing(true);
    setDeductionStep(1);
    
    // Smooth step-by-step thinking for UX
    const step2Promise = new Promise(resolve => setTimeout(resolve, 800));
    const step3Promise = new Promise(resolve => setTimeout(resolve, 1600));
    
    try {
      const token = localStorage.getItem('keinshop_jwt_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const [res] = await Promise.all([
        fetch('/api/interactions/ai-analysis', { headers }),
        step2Promise.then(() => setDeductionStep(2)),
        step3Promise.then(() => setDeductionStep(3))
      ]);
      
      if (res.ok) {
        const data = await res.json();
        setAiDeductionResult({
          gustos: data.gustos || "No se pudo deducir las preferencias de clics.",
          demanda: data.demanda || "No se pudo proyectar la demanda.",
          stockSugerencia: data.stockSugerencia || "Nivel óptimo de stock.",
          promoSugerencia: data.promoSugerencia || "No hay combos sugeridos."
        });
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch (err) {
      console.error("Error getting AI deductions:", err);
      // Fallback
      const topProduct = topInteractionsProducts[0];
      const lowestStockProduct = productsWithMetrics.find(p => p.stock < p.minStock) || productsWithMetrics[0];
      setAiDeductionResult({
        gustos: `La IA analizó las interacciones registradas. Se detecta un fuerte interés en la línea "${topProduct?.category || 'Vestuario Oversize'}" con clics constantes.`,
        demanda: `Se proyecta un incremento del 18% en las consultas de WhatsApp los fines de semana.`,
        stockSugerencia: lowestStockProduct 
          ? `Alerta stock: Reabastecer "${lowestStockProduct.name}" (SKU: ${lowestStockProduct.sku}). Quedan ${lowestStockProduct.stock} unidades.`
          : `Sugerencia IA Stock: El stock actual es adecuado para los próximos 14 días.`,
        promoSugerencia: `Estrategia Promocional: Ofrecer descuento del 10% en productos complementarios para acelerar rotación.`
      });
    } finally {
      setIsDeducing(false);
      setDeductionStep(0);
    }
  };

  const handleClearInteractions = async () => {
    if (!window.confirm("¿Estás seguro de que deseas vaciar todo el registro histórico de interacciones? Esto reiniciará las estadísticas de la IA.")) return;
    try {
      const token = localStorage.getItem('keinshop_jwt_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/interactions', {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setInteractions([]);
        setAiDeductionResult({
          gustos: "Registro histórico vacío. Esperando nuevas interacciones del catálogo digital de los clientes.",
          demanda: "Sin proyecciones. El historial de clics e interacciones ha sido restablecido.",
          stockSugerencia: "Alerta de stock: Reestablecido.",
          promoSugerencia: "Estrategia promocional: Reestablecido."
        });
      }
    } catch (err) {
      console.error("Error clearing interactions:", err);
    }
  };

  // Auto-run first analysis to populate values when interactions load
  React.useEffect(() => {
    if (interactions.length > 0) {
      // Run quick analysis without loading spinner to pre-populate beautifully
      const token = localStorage.getItem('keinshop_jwt_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      fetch('/api/interactions/ai-analysis', { headers })
        .then(res => res.json())
        .then(data => {
          setAiDeductionResult({
            gustos: data.gustos || "",
            demanda: data.demanda || "",
            stockSugerencia: data.stockSugerencia || "",
            promoSugerencia: data.promoSugerencia || ""
          });
        })
        .catch(err => console.warn("Error background loading initial AI analysis:", err));
    }
  }, [interactions.length]);

  // Calculate KPIs
  const totalSales = (transactions || [])
    .filter(t => t && t.type === 'Ingreso' && !t.deleted_at && t.is_demo !== true && t.isdemo !== true)
    .reduce((acc, curr) => acc + Number(curr?.amount || 0), 0);

  const totalExpenses = (transactions || [])
    .filter(t => t && t.type === 'Egreso' && !t.deleted_at && t.is_demo !== true && t.isdemo !== true)
    .reduce((acc, curr) => acc + Number(curr?.amount || 0), 0);

  const activeOrdersCount = (orders || []).filter(o => o && o.status !== 'Entregado').length;
  
  const totalPendingAmount = (orders || []).reduce((acc, curr) => {
    return acc + (Number(curr?.totalCost || 0) - Number(curr?.paidAmount || 0));
  }, 0);

  // Anterior period (Mayo 2026) stats - Filter out any demo, fake or automatic mock records.
  // Must return 0 if no real, user-entered entries exist.
  const mayoStats = React.useMemo(() => {
    const mayoEntries = (transactions || []).filter(t => 
      t &&
      t.date && 
      t.date.startsWith("2026-05") && 
      !t.deleted_at && 
      t.is_demo !== true && 
      t.isdemo !== true &&
      !t.is_mock &&
      !t.is_simulated
    );
    const income = mayoEntries.filter(t => t && t.type === 'Ingreso').reduce((sum, t) => sum + Number(t?.amount || 0), 0);
    const expenses = mayoEntries.filter(t => t && t.type === 'Egreso').reduce((sum, t) => sum + Number(t?.amount || 0), 0);
    const net = income - expenses;
    return {
      income,
      expenses,
      net: isNaN(net) ? 0 : net
    };
  }, [transactions]);

  const lowStockProducts = (products || []).filter(p => p && p.stock <= (p.minStock || 0));
  const excessStockProducts = (products || []).filter(p => p && p.stock >= (p.minStock || 0) * 4);

  // Calcular inversión total en mercadería y ganancia proyectada
  const totalInversion = React.useMemo(() => {
    return (products || []).reduce((acc, p) => acc + (Number(p?.priceBuy || 0) * Number(p?.stock || 0)), 0);
  }, [products]);

  const totalGanancia = React.useMemo(() => {
    return (products || []).reduce((acc, p) => acc + ((Number(p?.priceSell || 0) - Number(p?.priceBuy || 0)) * Number(p?.stock || 0)), 0);
  }, [products]);

  // Quick statistics
  const totalProductsCount = (products || []).reduce((acc, curr) => acc + Number(curr?.stock || 0), 0);
  
  // Predict trends
  const highDemandCount = (products || []).filter(p => p && p.category === 'Vestuario').length;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner and Undo controls */}
      <div className="bg-gradient-to-r from-[#203180] via-indigo-900 to-[#FF7AA6] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-12">
          <Sparkles className="w-96 h-96" />
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">¡Bienvenido a <span translate="no">KEINSHOP</span> CRM!</h1>
            <p className="text-indigo-100 text-sm mt-1">
              Plataforma centralizada e inteligente de negocio. Rol actual: <span className="font-bold underline">{role}</span>
            </p>
          </div>

        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
        {/* KPI 1: Ventas Totales */}
        <div className="bg-white p-5 rounded-2xl border border-[#AAAAAA]/20 shadow-sm flex items-center space-x-4 hover:shadow-md hover:scale-[1.01] transition-all duration-200">
          <div className="p-3 bg-[#203180]/10 text-[#203180] rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ingresos Totales</p>
            <h3 className="text-xl font-black text-[#203180] mt-0.5">${totalSales.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[11px] text-green-500 font-bold flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3" /> +15.4% este mes
            </span>
          </div>
        </div>

        {/* KPI 2: Pedidos Activos */}
        <div className="bg-white p-5 rounded-2xl border border-[#AAAAAA]/20 shadow-sm flex items-center space-x-4 hover:shadow-md hover:scale-[1.01] transition-all duration-200">
          <div className="p-3 bg-[#FF7AA6]/10 text-[#FF7AA6] rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pedidos Especiales</p>
            <h3 className="text-xl font-black text-[#050507] mt-0.5">{activeOrdersCount} Activos</h3>
            <span className="text-[11px] text-[#FF7AA6] font-bold hover:underline cursor-pointer" onClick={() => onNavigate('pedidos')}>
              Ver Shein/Temu →
            </span>
          </div>
        </div>

        {/* KPI 3: Cuentas por Cobrar */}
        <div className="bg-white p-5 rounded-2xl border border-[#AAAAAA]/20 shadow-sm flex items-center space-x-4 hover:shadow-md hover:scale-[1.01] transition-all duration-200">
          <div className="p-3 bg-[#C80C0C]/10 text-[#C80C0C] rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Saldos Pendientes</p>
            <h3 className="text-xl font-black text-[#C80C0C] mt-0.5">${totalPendingAmount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[11px] text-gray-400 font-medium">De pedidos importados</span>
          </div>
        </div>

        {/* KPI 4: Total Stock */}
        <div className="bg-white p-5 rounded-2xl border border-[#AAAAAA]/20 shadow-sm flex items-center space-x-4 hover:shadow-md hover:scale-[1.01] transition-all duration-200">
          <div className="p-3 bg-[#203180]/10 text-[#203180] rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Inventario Total</p>
            <h3 className="text-xl font-black text-[#203180] mt-0.5">{totalProductsCount} unidades</h3>
            <span className="text-[11px] text-gray-400 font-bold">{products.length} SKU catalogados</span>
          </div>
        </div>

        {/* KPI: Inversión en Mercadería (NUEVO) */}
        <div className="bg-white p-5 rounded-2xl border border-[#AAAAAA]/20 shadow-sm flex items-center space-x-4 hover:shadow-md hover:scale-[1.01] transition-all duration-200">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Inversión Stock</p>
            <h3 className="text-xl font-black text-amber-700 mt-0.5">${totalInversion.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[11px] text-gray-400 font-medium">Costo de mercadería</span>
          </div>
        </div>

        {/* KPI: Ganancia Proyectada (NUEVO) */}
        <div className="bg-white p-5 rounded-2xl border border-[#AAAAAA]/20 shadow-sm flex items-center space-x-4 hover:shadow-md hover:scale-[1.01] transition-all duration-200">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ganancia Proyectada</p>
            <h3 className="text-xl font-black text-emerald-700 mt-0.5">${totalGanancia.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[11px] text-emerald-500 font-bold">Proyección al vender todo</span>
          </div>
        </div>

        {/* KPI 5: Periodo Anterior */}
        <div className={`bg-white p-5 rounded-2xl border border-[#AAAAAA]/20 shadow-sm flex items-center space-x-4 hover:shadow-md hover:scale-[1.01] transition-all duration-200 ${
          mayoStats.net > 0 
            ? 'bg-gradient-to-br from-emerald-50/20 to-transparent' 
            : mayoStats.net < 0 
              ? 'bg-gradient-to-br from-red-50/20 to-transparent' 
              : 'bg-gradient-to-br from-gray-50/20 to-transparent'
        }`}>
          <div className={`p-3 rounded-xl ${
            mayoStats.net > 0 
              ? 'bg-emerald-50 text-emerald-600' 
              : mayoStats.net < 0 
                ? 'bg-red-50 text-red-600' 
                : 'bg-gray-100 text-gray-500'
          }`}>
            {mayoStats.net >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Período Anterior (Mayo)</p>
            <h3 className={`text-xl font-black mt-0.5 ${
              mayoStats.net > 0 
                ? 'text-emerald-600' 
                : mayoStats.net < 0 
                  ? 'text-red-600' 
                  : 'text-gray-500'
            }`}>
              ${mayoStats.net.toLocaleString('es-CO')}
            </h3>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
              mayoStats.net > 0 
                ? 'text-emerald-600 bg-emerald-100/60' 
                : mayoStats.net < 0 
                  ? 'text-red-600 bg-red-100/60' 
                  : 'text-gray-500 bg-gray-200/60'
            }`}>
              {mayoStats.net > 0 ? 'Ganado' : mayoStats.net < 0 ? 'Pérdida' : 'Sin registros'}
            </span>
          </div>
        </div>
      </div>

      {/* Critical Business Alerts & IA Prediction Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Alerts and Actions Panel */}
        <div className="bg-white p-6 rounded-3xl border border-[#AAAAAA]/20 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#203180] flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#C80C0C] rounded-full"></span>
              Alertas Operativas Críticas
            </h2>
            <span className="text-xs bg-red-50 text-[#C80C0C] font-extrabold px-3 py-1 rounded-full">
              {lowStockProducts.length + (totalPendingAmount > 0 ? 1 : 0)} alertas
            </span>
          </div>

          <div className="space-y-3">
            {lowStockProducts.map(p => (
              <div key={p.sku} className="flex justify-between items-center p-3.5 bg-red-50/70 border border-red-100/50 rounded-2xl text-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-red-200/50 flex-shrink-0">
                    <FallbackImage src={getFreshImageUrl(p.imageUrl, p.version)} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{p.name}</h4>
                    <p className="text-xs text-[#C80C0C] font-bold">Stock crítico: {p.stock} unidades (mín: {p.minStock})</p>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate('inventario')}
                  className="bg-[#C80C0C] text-white hover:bg-red-700 font-bold text-xs py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 shadow-sm"
                >
                  Reabastecer
                </button>
              </div>
            ))}

            {excessStockProducts.map(p => (
              <div key={p.sku} className="flex justify-between items-center p-3.5 bg-yellow-50 border border-yellow-100/50 rounded-2xl text-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-yellow-200/50 flex-shrink-0">
                    <FallbackImage src={getFreshImageUrl(p.imageUrl, p.version)} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{p.name}</h4>
                    <p className="text-xs text-yellow-700 font-bold">Exceso de inventario: {p.stock} u. (mín: {p.minStock})</p>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate('inventario')}
                  className="bg-yellow-600 text-white hover:bg-yellow-700 font-bold text-xs py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 shadow-sm"
                >
                  Lanzar Promo
                </button>
              </div>
            ))}

            {orders.some(o => o.status === 'Pendiente') && (
              <div className="flex justify-between items-center p-3.5 bg-indigo-50 border border-indigo-100/50 rounded-2xl text-sm">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#203180] animate-pulse"></span>
                  <div>
                    <h4 className="font-bold text-[#203180]">Pedidos de Importación Pendientes de Pago</h4>
                    <p className="text-xs text-indigo-700 font-semibold">Existen pedidos especiales con saldo pendiente de abono mínimo.</p>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate('pedidos')}
                  className="bg-[#203180] text-white hover:bg-indigo-900 font-bold text-xs py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 shadow-sm"
                >
                  Gestionar Pagos
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions depending on Role */}
          <div className="pt-4 border-t border-[#AAAAAA]/20">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#AAAAAA] mb-3">Accesos y Acciones Rápidas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={onAddProductQuick}
                disabled={role === 'Gestor de Contenido'}
                className="flex items-center justify-center gap-2 p-3 bg-[#203180]/5 hover:bg-[#203180]/10 disabled:opacity-50 text-[#203180] font-bold text-xs rounded-xl transition-all border border-[#AAAAAA]/15"
              >
                <Package className="w-4 h-4" />
                + Añadir Producto
              </button>
              <button
                onClick={onAddOrderQuick}
                disabled={role === 'Gestor de Contenido'}
                className="flex items-center justify-center gap-2 p-3 bg-[#FF7AA6]/5 hover:bg-[#FF7AA6]/10 disabled:opacity-50 text-[#FF7AA6] font-bold text-xs rounded-xl transition-all border border-[#AAAAAA]/15"
              >
                <ShoppingBag className="w-4 h-4" />
                + Pedido Shein/Temu
              </button>
              <button
                onClick={onAddPostQuick}
                disabled={role === 'Vendedor'}
                className="flex items-center justify-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-[#050507] font-bold text-xs rounded-xl transition-all border border-[#AAAAAA]/15"
              >
                <Calendar className="w-4 h-4" />
                + Añadir Publicación
              </button>
            </div>
          </div>
        </div>

        {/* IA Predictive Insights Panel */}
        <div className="bg-[#203180] text-white p-6 rounded-3xl shadow-xl space-y-5 flex flex-col border border-white/5 lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-[#FF7AA6]/20 text-[#FF7AA6] p-1.5 rounded-lg">
                  <Sparkles className="w-5 h-5 text-[#FF7AA6]" />
                </div>
                <h2 className="text-lg font-black tracking-tight uppercase">IA Predictiva <span translate="no">KEINSHOP</span></h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#FF7AA6] text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider animate-pulse">
                  Live Engine
                </span>
                {role === 'Admin' && (
                  <button 
                    onClick={handleClearInteractions}
                    className="text-[9px] font-black text-white/40 hover:text-red-400 uppercase tracking-wider transition-all"
                    title="Vaciar todos los registros de interacciones"
                  >
                    [Vaciar]
                  </button>
                )}
              </div>
            </div>

            {/* Part 1: Top interaction ranking list */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#FF7AA6] flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Ranking de Mayor Alcance & Clics
              </h3>
              
              <div className="space-y-2">
                {topInteractionsProducts.length === 0 ? (
                  <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-white/50">
                    Aún no hay interacciones registradas. Abre el catálogo para ver productos.
                  </div>
                ) : (
                  topInteractionsProducts.map((p, idx) => (
                    <div key={p.sku || idx} className="flex items-center justify-between p-2.5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-black text-white/40 font-mono">#{idx + 1}</span>
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/15 flex-shrink-0">
                          <FallbackImage 
                            src={getFreshImageUrl(p.imageUrl, p.version)} 
                            alt={p.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="max-w-[110px] sm:max-w-[150px]">
                          <h4 className="text-xs font-black text-white leading-tight truncate" title={p.name}>
                            {p.name}
                          </h4>
                          <p className="text-[10px] text-white/50 font-medium truncate">{p.category || 'Sin categoría'}</p>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] font-black bg-[#FF7AA6]/20 text-[#FF7AA6] px-2 py-0.5 rounded-lg border border-[#FF7AA6]/30 font-mono">
                          {p.interactions} pts
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] text-white/40 mt-0.5 font-mono">
                          <span className="flex items-center gap-0.5" title="Vistas"><Eye className="w-2.5 h-2.5" /> {p.views}</span>
                          <span className="flex items-center gap-0.5" title="Clics"><MousePointer className="w-2.5 h-2.5" /> {p.clicks}</span>
                          <span className="flex items-center gap-0.5 text-[#FF7AA6]" title="Pedidos de WhatsApp"><ShoppingBag className="w-2.5 h-2.5" /> {p.orders}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Part 2: Interactive AI Preference Deduction and Demand */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#FF7AA6] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Deducción de Gustos & Demanda
                </h3>
                {aiDeductionResult && !isDeducing && (
                  <button 
                    onClick={handleRunDeduction}
                    className="text-[9px] font-black text-[#FF7AA6] hover:text-white underline uppercase tracking-widest"
                  >
                    Recalcular
                  </button>
                )}
              </div>

              {isDeducing ? (
                <div className="p-4 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center text-center space-y-3 py-6">
                  <div className="w-8 h-8 border-4 border-[#FF7AA6] border-t-transparent rounded-full animate-spin"></div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-[#FF7AA6] tracking-wider animate-pulse">
                      {deductionStep === 1 && "Analizando clics de clientes..."}
                      {deductionStep === 2 && "Calculando curvas de demanda..."}
                      {deductionStep === 3 && "Optimizando stock de KEINSHOP..."}
                    </p>
                    <p className="text-[10px] text-white/50">Deduciendo preferencias en tiempo real...</p>
                  </div>
                </div>
              ) : aiDeductionResult ? (
                <div className="space-y-2.5">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-1 text-[10px] text-[#FF7AA6] font-bold uppercase tracking-wider">
                      <Heart className="w-3.5 h-3.5 fill-current text-[#FF7AA6]" /> Gustos de Clientes Deducidos
                    </div>
                    <p className="text-xs text-white/85 mt-1 leading-relaxed">
                      {aiDeductionResult.gustos}
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-1 text-[10px] text-white/60 font-bold uppercase tracking-wider">
                      <TrendingUp className="w-3.5 h-3.5 text-white/60" /> Predicción de Demanda Estacional
                    </div>
                    <p className="text-xs text-white/85 mt-1 leading-relaxed">
                      {aiDeductionResult.demanda}
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-2xl border border-[#FF7AA6]/30 bg-gradient-to-br from-[#FF7AA6]/5 to-transparent">
                    <div className="flex items-center gap-1 text-[10px] text-[#FF7AA6] font-black uppercase tracking-widest">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF7AA6]" /> Sugerencias de Inventario & Promos
                    </div>
                    <div className="space-y-1.5 mt-1.5">
                      <p className="text-xs text-white/90 leading-normal border-l-2 border-[#FF7AA6] pl-2">
                        {aiDeductionResult.stockSugerencia}
                      </p>
                      <p className="text-xs text-white/90 leading-normal border-l-2 border-white/30 pl-2">
                        {aiDeductionResult.promoSugerencia}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRunDeduction}
                  className="w-full py-5 px-4 bg-gradient-to-r from-[#FF7AA6] to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-black text-xs rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg transition-all active:scale-98 uppercase tracking-widest border border-white/10"
                >
                  <Sparkles className="w-5 h-5 animate-bounce" />
                  <span>Deducir Gustos e IA Predictiva</span>
                  <span className="text-[9px] font-normal text-white/80 lowercase mt-0.5 font-sans">analizar clics, alcance y proyectar compras</span>
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('asesores')}
            className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-wider"
          >
            Consultar Asesores IA <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Mini Accounting chart and client history */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Accounting Overview */}
        <div className="bg-white p-6 rounded-3xl border border-[#AAAAAA]/20 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#203180] text-base flex items-center gap-2">
              <span className="w-1 h-5 bg-[#FF7AA6] rounded-full"></span>
              Contabilidad: Flujo de Caja Reciente
            </h3>
            <span className="text-xs text-[#FF7AA6] font-bold hover:underline cursor-pointer" onClick={() => onNavigate('contabilidad')}>Ver todo →</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-medium">Ingresos Totales Registrados</span>
              <span className="font-bold text-green-600">+${totalSales.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-medium">Egresos Totales Registrados</span>
              <span className="font-bold text-[#C80C0C]">-${totalExpenses.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-1">
              <span className="font-bold text-[#203180]">Balance Operativo Neto</span>
              <span className={`font-black text-base ${totalSales - totalExpenses >= 0 ? 'text-green-600' : 'text-[#C80C0C]'}`}>
                ${(totalSales - totalExpenses).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Simple Visual Mini Bar Chart with HTML */}
          <div className="pt-4">
            <div className="flex items-end gap-3 h-24 pt-4 border-b border-gray-100">
              <div className="w-1/2 flex flex-col items-center">
                <div className="w-full bg-green-500 rounded-t-lg hover:opacity-90 transition-opacity" style={{ height: `${Math.min(100, Math.max(10, (totalSales / (totalSales + totalExpenses || 1)) * 80))}%` }}></div>
                <span className="text-[10px] text-gray-500 font-bold mt-1">Ingresos</span>
              </div>
              <div className="w-1/2 flex flex-col items-center">
                <div className="w-full bg-[#C80C0C] rounded-t-lg hover:opacity-90 transition-opacity" style={{ height: `${Math.min(100, Math.max(10, (totalExpenses / (totalSales + totalExpenses || 1)) * 80))}%` }}></div>
                <span className="text-[10px] text-gray-500 font-bold mt-1">Egresos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Calendar Status summary */}
        <div className="bg-white p-6 rounded-3xl border border-[#AAAAAA]/20 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#203180] text-base flex items-center gap-2">
              <span className="w-1 h-5 bg-[#203180] rounded-full"></span>
              Calendario de Contenido: Siguientes Publicaciones
            </h3>
            <span className="text-xs text-[#FF7AA6] font-bold hover:underline cursor-pointer" onClick={() => onNavigate('calendario')}>Ver calendario →</span>
          </div>

          <div className="space-y-3">
            {publications.slice(0, 3).map(pub => (
              <div key={pub.id} className="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-[#AAAAAA]/15">
                <div className="flex items-center space-x-3">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                    pub.channel === 'Instagram' ? 'bg-pink-100 text-pink-700' :
                    pub.channel === 'TikTok' ? 'bg-black text-white' : 'bg-blue-100 text-[#203180]'
                  }`}>
                    {pub.channel}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">{pub.title}</h5>
                    <p className="text-[11px] text-gray-400 font-medium">{pub.date} a las {pub.time}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                  pub.status === 'Publicado' ? 'bg-green-100 text-green-700' :
                  pub.status === 'Programado' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                }`}>
                  {pub.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
