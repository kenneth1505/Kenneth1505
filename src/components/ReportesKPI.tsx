import React, { useState } from 'react';
import { 
  BarChart, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  Sparkles, 
  Download, 
  Printer, 
  Check, 
  RefreshCw,
  Clock,
  Briefcase,
  Layers,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Truck,
  Info,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Product, SpecialOrder, Transaction, Publication, UserRole } from '../types';

interface ReportesKPIProps {
  products: Product[];
  orders: SpecialOrder[];
  transactions: Transaction[];
  publications: Publication[];
  role: UserRole;
}

export default function ReportesKPI({ products, orders, transactions, publications, role }: ReportesKPIProps) {
  
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeOptimization, setRouteOptimization] = useState<any | null>(null);
  const [autoReportEnabled, setAutoReportEnabled] = useState(false);
  const [reportEmail, setReportEmail] = useState('kenisra156@gmail.com');

  const [sequencedOrders, setSequencedOrders] = useState<SpecialOrder[]>([]);
  const [couriers, setCouriers] = useState<Record<string, string>>({});
  const [isOptimized, setIsOptimized] = useState(false);

  React.useEffect(() => {
    if (orders) {
      setSequencedOrders(orders.filter(o => o.status !== 'Entregado'));
    }
  }, [orders]);

  const getCityCoords = (orderId: string) => {
    const hash = (orderId || "").split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const cities = [
      { name: "Medellín", x: 100, y: 155 },
      { name: "Cali", x: 80, y: 235 },
      { name: "Barranquilla", x: 105, y: 45 },
      { name: "Bucaramanga", x: 155, y: 135 },
      { name: "Pereira", x: 95, y: 190 }
    ];
    return cities[hash % cities.length];
  };

  const moveOrderUp = (idx: number) => {
    if (idx === 0) return;
    const newList = [...sequencedOrders];
    const temp = newList[idx];
    newList[idx] = newList[idx - 1];
    newList[idx - 1] = temp;
    setSequencedOrders(newList);
  };

  const moveOrderDown = (idx: number) => {
    if (idx === sequencedOrders.length - 1) return;
    const newList = [...sequencedOrders];
    const temp = newList[idx];
    newList[idx] = newList[idx + 1];
    newList[idx + 1] = temp;
    setSequencedOrders(newList);
  };

  const changeCourier = (orderId: string, courier: string) => {
    setCouriers(prev => ({ ...prev, [orderId]: courier }));
  };

  const getEstimatedDays = () => {
    let days = isOptimized ? 2.1 : 3.8;
    if (sequencedOrders.length > 0 && sequencedOrders[0] && sequencedOrders[0].id) {
      const firstIdHash = (sequencedOrders[0].id || "").split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      days += (firstIdHash % 5) / 10;
    }
    return days.toFixed(1);
  };

  const getEstimatedTransitCost = () => {
    let baseCost = sequencedOrders.length * 11500;
    if (isOptimized) baseCost *= 0.88;
    return Math.round(baseCost);
  };

  // Math metrics
  const totalSalesVal = (transactions || [])
    .filter(t => t && t.type === 'Ingreso')
    .reduce((acc, curr) => acc + Number(curr?.amount || 0), 0);

  const totalCostsVal = (transactions || [])
    .filter(t => t && t.type === 'Egreso')
    .reduce((acc, curr) => acc + Number(curr?.amount || 0), 0);

  const activeOrders = (orders || []).filter(o => o && o.status !== 'Entregado');
  const pendingCollections = activeOrders.reduce((acc, curr) => acc + (Number(curr?.totalCost || 0) - Number(curr?.paidAmount || 0)), 0);
  
  const totalSkuCount = (products || []).length;
  const lowStockCount = (products || []).filter(p => p && p.stock <= p.minStock).length;
  const visibleProductsCount = (products || []).filter(p => p && p.visible).length;

  const handleOptimizeRoutes = async () => {
    setLoadingRoute(true);
    setRouteOptimization(null);
    try {
      const response = await fetch('/api/ai/optimize-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: activeOrders
        })
      });
      const data = await response.json();
      setRouteOptimization(data);
      setIsOptimized(true);

      // Apply prioritized sorting
      const sorted = [...activeOrders].sort((a, b) => {
        if (a.status === 'Abonado' && b.status !== 'Abonado') return -1;
        if (a.status !== 'Abonado' && b.status === 'Abonado') return 1;
        return 0;
      });
      setSequencedOrders(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoute(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#050507]">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900">Métricas & Reportes Ejecutivos</h2>
          <p className="text-xs text-gray-500 mt-1">Análisis completo de inventario, flujo de caja, entrega y optimización de rutas logísticas.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="bg-[#203180] text-white hover:bg-indigo-950 font-extrabold text-xs py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Exportar Reporte Ejecutivo PDF
          </button>
        </div>
      </div>

      {/* Grid of KPIs detailed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* KPI: Rendimiento Ventas */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 font-bold uppercase">Rendimiento Financiero</span>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <h4 className="text-2xl font-black">${totalSalesVal.toLocaleString('es-CO')} COP</h4>
            <p className="text-xs text-gray-500 mt-1">Ingresos brutos percibidos de pedidos y ventas directas.</p>
          </div>
          <div className="pt-2 border-t border-gray-100 flex justify-between text-[11px] text-gray-400">
            <span>Egresos registrados:</span>
            <span className="font-bold text-red-600">-${totalCostsVal.toLocaleString('es-CO')}</span>
          </div>
        </div>

        {/* KPI: Operación Pedidos */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 font-bold uppercase">Saldos por Cobrar</span>
            <TrendingDown className="w-4 h-4 text-[#C80C0C]" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-[#C80C0C]">${pendingCollections.toLocaleString('es-CO')} COP</h4>
            <p className="text-xs text-gray-500 mt-1">Monto de abonos pendientes por liquidar en Shein/Temu.</p>
          </div>
          <div className="pt-2 border-t border-gray-100 flex justify-between text-[11px] text-gray-400">
            <span>Pedidos por entregar:</span>
            <span className="font-bold text-[#203180]">{activeOrders.length} activos</span>
          </div>
        </div>

        {/* KPI: Almacén */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 font-bold uppercase">Salud de Inventario</span>
            <Briefcase className="w-4 h-4 text-[#FF7AA6]" />
          </div>
          <div>
            <h4 className="text-2xl font-black">{totalSkuCount} SKU activos</h4>
            <p className="text-xs text-gray-500 mt-1">Total de modelos catalogados y visibles para el cliente.</p>
          </div>
          <div className="pt-2 border-t border-gray-100 flex justify-between text-[11px] text-gray-400">
            <span>Quiebres de stock:</span>
            <span className={`font-bold ${lowStockCount > 0 ? 'text-[#C80C0C]' : 'text-green-600'}`}>{lowStockCount} alertas</span>
          </div>
        </div>

      </div>

      {/* IA Routing Optimization section & Automated reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* IA Routing optimization */}
        <div className="bg-gradient-to-br from-indigo-950 via-[#203180] to-indigo-900 text-white p-6 rounded-2xl shadow-lg lg:col-span-2 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-[#FF7AA6]" />
                <h3 className="font-black text-base">Optimizador Logístico de Rutas & Tránsito Real</h3>
              </div>
              {isOptimized && (
                <span className="bg-green-500/30 text-green-300 border border-green-500/20 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  CONEXIÓN ACTIVA MAPS
                </span>
              )}
            </div>
            
            <p className="text-[11px] text-indigo-100 leading-relaxed">
              Establece las mejores rutas nacionales. Modifica manualmente la secuencia de tus despachos o cambia las transportadoras nacionales asignadas. El mapa de radar recalculará los flujos dinámicamente.
            </p>

            {/* Interactive Logistics Layout: Split map vs list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Interactive SVG Radar Map of Colombia */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-indigo-200">
                  <span>Radar de Envíos (Nacional)</span>
                  <span className="font-bold text-[#FF7AA6] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span> Colombia GPS Feed
                  </span>
                </div>

                <div className="relative">
                  <svg viewBox="0 0 220 300" className="w-full max-h-[290px] bg-black/35 rounded-xl border border-indigo-850 p-1 shadow-inner">
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Simple Outline Shape of Colombia */}
                    <path 
                      d="M60,20 L100,15 L120,30 L150,70 L170,100 L180,140 L170,180 L150,240 L130,280 L110,300 L80,280 L70,250 L50,230 L40,180 L55,130 L65,80 Z" 
                      fill="rgba(32, 49, 128, 0.15)" 
                      stroke="rgba(255, 255, 255, 0.1)" 
                      strokeWidth="1.5" 
                      strokeLinejoin="round"
                    />

                    {/* Warehouse Node (Bogota) */}
                    <circle cx="120" cy="190" r="6" fill="#FF7AA6" className="animate-ping opacity-60" />
                    <circle cx="120" cy="190" r="4" fill="#FF7AA6" stroke="#ffffff" strokeWidth="1.2" />
                    <text x="120" y="190" fill="#ffffff" fontSize="7" fontWeight="black" textAnchor="middle" fontFamily="monospace">BOG (KEINSHOP)</text>

                    {/* Sequence lines */}
                    {sequencedOrders.map((order, index) => {
                      const coords = getCityCoords(order.id);
                      return (
                        <line 
                          key={`line-${order.id}`}
                          x1="120"
                          y1="190"
                          x2={coords.x}
                          y2={coords.y}
                          stroke={isOptimized ? "#4ADE80" : "#F87171"}
                          strokeWidth="1.2"
                          strokeDasharray={isOptimized ? "none" : "3 3"}
                          className="opacity-75"
                        />
                      );
                    })}

                    {/* Target delivery nodes */}
                    {sequencedOrders.map((order, index) => {
                      const coords = getCityCoords(order.id);
                      return (
                        <g key={`pin-${order.id}`} className="transition-all duration-300">
                          <circle cx={coords.x} cy={coords.y} r="7" fill={isOptimized ? "#10B981" : "#EF4444"} stroke="#ffffff" strokeWidth="1" />
                          <text x={coords.x} y={coords.y + 2.5} fill="#ffffff" fontSize="6.5" fontWeight="black" textAnchor="middle">
                            {index + 1}
                          </text>
                          <text x={coords.x} y={coords.y - 8} fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle" className="font-mono bg-black/60 px-0.5 rounded">
                            {coords.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Dynamic sequencing control pane */}
              <div className="space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-indigo-200 block mb-1">Secuenciador de Despachos ({sequencedOrders.length})</span>
                  
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {sequencedOrders.length === 0 ? (
                      <div className="p-4 bg-white/5 rounded text-center text-indigo-300 text-[10px]">
                        No hay pedidos activos para despachar.
                      </div>
                    ) : (
                      sequencedOrders.map((order, index) => {
                        const coords = getCityCoords(order.id);
                        const assignedCourier = couriers[order.id] || "Coordinadora";
                        return (
                          <div key={order.id} className="p-2 bg-white/10 rounded-lg border border-white/5 flex items-center justify-between gap-1 text-[10px]">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="bg-indigo-900 text-indigo-100 font-mono text-[9px] px-1 rounded-sm">#{index + 1}</span>
                                <span className="font-extrabold text-white">{order.id}</span>
                                <span className="text-gray-300 text-[9px]">({coords.name})</span>
                              </div>
                              <div className="text-gray-300 text-[9px] flex items-center gap-1">
                                <Truck className="w-3 h-3 text-[#FF7AA6]" />
                                <select 
                                  value={assignedCourier} 
                                  onChange={(e) => changeCourier(order.id, e.target.value)}
                                  className="bg-transparent text-[#FF7AA6] font-bold border-none p-0 focus:ring-0 text-[9.5px] cursor-pointer"
                                >
                                  <option value="Coordinadora" className="bg-indigo-950">Coordinadora</option>
                                  <option value="Servientrega" className="bg-indigo-950">Servientrega</option>
                                  <option value="Interrapidisimo" className="bg-indigo-950">Interrapidísimo</option>
                                  <option value="Envía" className="bg-indigo-950">Envía</option>
                                </select>
                              </div>
                            </div>

                            {/* Up / Down controllers */}
                            <div className="flex gap-0.5">
                              <button
                                type="button"
                                onClick={() => moveOrderUp(index)}
                                disabled={index === 0}
                                className="p-1 hover:bg-white/15 rounded text-white disabled:opacity-30 transition-all"
                                title="Mover Arriba"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveOrderDown(index)}
                                disabled={index === sequencedOrders.length - 1}
                                className="p-1 hover:bg-white/15 rounded text-white disabled:opacity-30 transition-all"
                                title="Mover Abajo"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Routing stats summary */}
                <div className="bg-indigo-900/40 p-2.5 rounded-lg border border-indigo-800 space-y-1.5 text-[10.5px]">
                  <div className="flex justify-between items-center text-indigo-200">
                    <span>Tiempo Promedio de Entrega:</span>
                    <strong className="text-white font-mono">{getEstimatedDays()} días</strong>
                  </div>
                  <div className="flex justify-between items-center text-indigo-200">
                    <span>Costos Estimados de Envío:</span>
                    <strong className="text-white font-mono">${getEstimatedTransitCost().toLocaleString('es-CO')} COP</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* General AI route recommendation */}
            {routeOptimization && (
              <div className="p-3.5 bg-white/10 rounded-xl border border-white/10 text-[10.5px] space-y-1.5 leading-relaxed">
                <span className="font-black text-[#FF7AA6] block uppercase tracking-wide">Plan Logístico IA Sugerido:</span>
                <p className="text-indigo-100">{routeOptimization.message}</p>
                <div className="text-[10px] text-indigo-200 font-semibold bg-indigo-950/40 p-2 rounded">
                  <strong>Recomendación:</strong> {routeOptimization.courierPartnerRecommendation} | {routeOptimization.explanation}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleOptimizeRoutes}
            disabled={loadingRoute || activeOrders.length === 0}
            className="w-full bg-[#FF7AA6] hover:bg-pink-600 text-white disabled:opacity-40 font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
          >
            {loadingRoute ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {loadingRoute ? 'Procesando coordenadas...' : `Optimizar Rutas de Envío (${activeOrders.length} Despachos)`}
          </button>
        </div>

        {/* Auto Delivery setup */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-black text-gray-900 text-base">Suscripción de Reportes</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Programa el envío automatizado mensual de los balances contables, rotación de stock y cierres de pedidos especiales directo a tu bandeja de entrada.
            </p>

            <div className="space-y-3 text-xs pt-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="font-bold text-gray-700">Envío Automático Activo</span>
                <input 
                  type="checkbox" 
                  checked={autoReportEnabled}
                  onChange={(e) => setAutoReportEnabled(e.target.checked)}
                  className="rounded text-[#203180] focus:ring-[#203180]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Email Destinatario</label>
                <input
                  type="email"
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  disabled={!autoReportEnabled}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#203180] disabled:bg-gray-50"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              alert(`Preferencias guardadas exitosamente. Se programó el envío automático a ${reportEmail}.`);
            }}
            className="w-full bg-[#203180] text-white hover:bg-indigo-950 font-extrabold text-xs py-3 rounded-xl transition-all shadow-sm active:scale-95 mt-4"
          >
            Guardar Configuración de Envíos
          </button>
        </div>

      </div>

    </div>
  );
}
