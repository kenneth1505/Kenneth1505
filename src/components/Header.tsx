import React, { useState, useRef, useEffect } from 'react';
import { Shield, RefreshCw, Layers, Bell, Search, History, Check, X, Package, Users, ShoppingBag, Calendar, DollarSign } from 'lucide-react';
import { UserRole, AuditLog, Product, Client, SpecialOrder, Publication, Transaction } from '../types';
import Brand from './Brand';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  auditLogs: AuditLog[];
  onClearLogs?: () => void;
  loggedInUser?: { id: string; first_name: string; last_name: string; role: string; email: string } | null;
  onLogout?: () => void;
  onlineAdmins?: string[];
  
  // Search data sources
  products?: Product[];
  clients?: Client[];
  orders?: SpecialOrder[];
  publications?: Publication[];
  transactions?: Transaction[];
  onNavigateToTab?: (tabId: string) => void;
}

export default function Header({ 
  currentRole, 
  onRoleChange, 
  auditLogs, 
  onClearLogs, 
  loggedInUser, 
  onLogout, 
  onlineAdmins = [],
  products = [],
  clients = [],
  orders = [],
  publications = [],
  transactions = [],
  onNavigateToTab
}: HeaderProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTime, setSyncTime] = useState<string>("Hace 1 min");

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search overlay if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      const now = new Date();
      setSyncTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
    }, 1500);
  };

  // Search matching logic
  const query = searchQuery.trim().toLowerCase();
  const hasQuery = query.length > 0;

  const matchedProducts = hasQuery ? products.filter(p => 
    p.name?.toLowerCase().includes(query) || 
    p.sku?.toLowerCase().includes(query) ||
    p.category?.toLowerCase().includes(query)
  ).slice(0, 5) : [];

  const matchedClients = hasQuery ? clients.filter(c => 
    c.name?.toLowerCase().includes(query) || 
    c.phone?.includes(query) ||
    c.email?.toLowerCase().includes(query)
  ).slice(0, 5) : [];

  const matchedOrders = hasQuery ? orders.filter(o => 
    o.id?.toLowerCase().includes(query) || 
    o.client_name?.toLowerCase().includes(query) || 
    o.status?.toLowerCase().includes(query) ||
    (Array.isArray(o.items) && o.items.some(item => item.description?.toLowerCase().includes(query)))
  ).slice(0, 5) : [];

  const matchedPublications = hasQuery ? publications.filter(pub => 
    pub.title?.toLowerCase().includes(query) || 
    pub.copy?.toLowerCase().includes(query) || 
    pub.channel?.toLowerCase().includes(query)
  ).slice(0, 5) : [];

  const matchedTransactions = hasQuery ? transactions.filter(t => 
    t.description?.toLowerCase().includes(query) || 
    t.category?.toLowerCase().includes(query) || 
    String(t.amount).includes(query)
  ).slice(0, 5) : [];

  const totalResults = matchedProducts.length + matchedClients.length + matchedOrders.length + matchedPublications.length + matchedTransactions.length;

  const handleSelectResult = (tabId: string) => {
    setSearchQuery('');
    setSearchFocused(false);
    if (onNavigateToTab) {
      onNavigateToTab(tabId);
    }
  };

  return (
    <header className="bg-white text-[#050507] border-b border-[#AAAAAA]/30 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3 relative header-brand flex-shrink-0">
          <div className="hidden md:flex items-center space-x-2.5">
            <Brand />
          </div>
          <div className="flex md:hidden items-center justify-center">
            <Brand />
          </div>
          <div className="hidden lg:block text-xs font-bold tracking-widest text-[#FF7AA6] uppercase bg-[#FF7AA6]/10 px-2.5 py-1 rounded flex-shrink-0">
            CRM Inteligente
          </div>
        </div>

        {/* Global Search Bar (CRM - Buscador Global) */}
        <div ref={searchContainerRef} className="flex-1 max-w-md relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              onFocus={() => setSearchFocused(true)}
              placeholder="Buscar SKU, cliente, pedido, publicación..."
              className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF7AA6]/40 focus:border-[#FF7AA6] transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Floating Search Results Panel */}
          {searchFocused && hasQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-[480px] flex flex-col animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="p-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>Resultados de búsqueda ({totalResults})</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono">Búsqueda Global</span>
              </div>
              
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {totalResults === 0 && (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No se encontraron coincidencias para "{searchQuery}"
                  </div>
                )}

                {/* matched Products */}
                {matchedProducts.length > 0 && (
                  <div className="p-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                      <Package className="w-3 h-3 text-[#FF7AA6]" /> Inventario
                    </div>
                    {matchedProducts.map(p => (
                      <button
                        key={p.sku}
                        onClick={() => handleSelectResult('inventario')}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between text-xs group"
                      >
                        <div>
                          <p className="font-semibold text-gray-800 group-hover:text-[#FF7AA6]">{p.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">SKU: {p.sku} • {p.category}</p>
                        </div>
                        <span className="text-[10px] bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded font-mono">
                          Stock: {p.stock}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* matched Clients */}
                {matchedClients.length > 0 && (
                  <div className="p-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                      <Users className="w-3 h-3 text-indigo-500" /> Clientes y Agenda
                    </div>
                    {matchedClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectResult('clientes')}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors flex flex-col text-xs group"
                      >
                        <p className="font-semibold text-gray-800 group-hover:text-indigo-600">{c.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">Cel: {c.phone || 'N/A'} • {c.email || 'Sin correo'}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* matched Orders */}
                {matchedOrders.length > 0 && (
                  <div className="p-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-amber-500" /> Pedidos Especiales
                    </div>
                    {matchedOrders.map(o => (
                      <button
                        key={o.id}
                        onClick={() => handleSelectResult('pedidos')}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between text-xs group"
                      >
                        <div>
                          <p className="font-semibold text-gray-800 group-hover:text-amber-600">{o.id} • {o.client_name}</p>
                          <p className="text-[10px] text-gray-400">Total: ${o.totalCost?.toLocaleString() || '0'}</p>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                          {o.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* matched Publications */}
                {matchedPublications.length > 0 && (
                  <div className="p-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#FF7AA6]" /> Calendario
                    </div>
                    {matchedPublications.map(pub => (
                      <button
                        key={pub.id}
                        onClick={() => handleSelectResult('calendario')}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between text-xs group"
                      >
                        <div>
                          <p className="font-semibold text-gray-800 group-hover:text-[#FF7AA6]">{pub.title}</p>
                          <p className="text-[10px] text-gray-400">{pub.channel} • {pub.date}</p>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pink-50 text-pink-700">
                          {pub.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* matched Transactions */}
                {matchedTransactions.length > 0 && (
                  <div className="p-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-green-500" /> Contabilidad
                    </div>
                    {matchedTransactions.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleSelectResult('contabilidad')}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between text-xs group"
                      >
                        <div>
                          <p className="font-semibold text-gray-800 group-hover:text-green-600">{t.description}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{t.category} • {t.date}</p>
                        </div>
                        <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${t.type === 'Ingreso' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {t.type === 'Ingreso' ? '+' : '-'}${t.amount?.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sync Status and Right Actions */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          
          {/* Sync status */}
          <div className="hidden md:flex items-center space-x-2 text-[11px] bg-[#F3F4F6] py-1 px-2.5 rounded-full border border-[#AAAAAA]/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-gray-500 font-mono font-bold">Nube Sincronizada</span>
          </div>

          {loggedInUser ? (
            /* Authenticated User Actions */
            <>
              {/* Other Administrator Presence Indicator */}
              {(() => {
                const otherAdminName = loggedInUser.first_name.toLowerCase().includes('kenneth') || loggedInUser.email.includes('kenisra156')
                  ? 'Ingrith'
                  : 'Kenneth';

                const isOtherAdminOnline = onlineAdmins.some(name => 
                  name.toLowerCase().includes(otherAdminName.toLowerCase())
                );

                return (
                  <div 
                    className="hidden sm:flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-2xl border border-[#AAAAAA]/15 transition-all" 
                    title={`${otherAdminName} está ${isOtherAdminOnline ? 'Online' : 'Offline'}`}
                  >
                    <span className="relative flex h-2 w-2">
                      {isOtherAdminOnline && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isOtherAdminOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    </span>
                    <span className="text-xs font-bold text-gray-600">
                      {otherAdminName}: <span className={isOtherAdminOnline ? 'text-green-600 font-extrabold' : 'text-gray-400'}>{isOtherAdminOnline ? 'Online' : 'Offline'}</span>
                    </span>
                  </div>
                );
              })()}

              {/* Logged in User Indicator & Logout */}
              <div className="flex items-center space-x-3 bg-gray-50 px-3.5 py-1.5 rounded-2xl border border-[#AAAAAA]/15">
                <div className="flex flex-col items-end text-right">
                  <span className="text-xs font-black text-[#203180] tracking-tight">
                    {loggedInUser.first_name} {loggedInUser.last_name}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#FF7AA6] font-mono">
                    {loggedInUser.role}
                  </span>
                </div>
                
                <div className="h-6 w-px bg-[#AAAAAA]/30" />

                <button
                  onClick={onLogout}
                  className="text-xs font-extrabold text-[#C80C0C] hover:text-[#e01414] hover:underline px-1 py-0.5 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </>
          ) : (
            /* Legacy / Sandbox Fallback Actions */
            <>
              {/* Role selector */}
              <div className="flex items-center space-x-1.5 bg-[#F3F4F6] p-1 rounded-lg border border-[#AAAAAA]/20">
                <Shield className="w-3.5 h-3.5 text-[#FF7AA6] ml-1.5" />
                <select
                  id="role-selector"
                  value={currentRole}
                  onChange={(e) => onRoleChange(e.target.value as UserRole)}
                  className="bg-transparent text-[#203180] text-xs font-bold focus:outline-none pr-1 cursor-pointer"
                >
                  <option value="Admin" className="bg-white text-[#203180]">Admin (Full)</option>
                  <option value="Vendedor" className="bg-white text-[#203180]">Vendedor</option>
                  <option value="Gestor de Contenido" className="bg-white text-[#203180]">Gestor de Contenido</option>
                </select>
              </div>
            </>
          )}

          {/* Audit Logs Trigger */}
          <button
            id="btn-show-audit-logs"
            onClick={() => setShowLogs(true)}
            className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#203180] hover:text-[#FF7AA6] relative transition-all"
            title="Historial de Auditoría"
          >
            <History className="w-5 h-5" />
            {auditLogs.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#C80C0C] text-white font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {auditLogs.length}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* Audit Logs Sidebar Slide-Over */}
      {showLogs && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowLogs(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white text-[#050507] shadow-xl flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="p-4 bg-[#203180] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-[#FF7AA6]" />
                <h3 className="font-bold text-lg">Registro de Auditoría (Logs)</h3>
              </div>
              <button 
                onClick={() => setShowLogs(false)} 
                className="p-1 hover:bg-indigo-900 rounded-full text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-xs">
              <span className="text-gray-500 font-mono">Modificaciones en tiempo real</span>
              {onClearLogs && (
                <button 
                  onClick={onClearLogs}
                  className="text-xs text-[#C80C0C] hover:underline font-semibold"
                >
                  Limpiar registro
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Layers className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No se han registrado acciones aún.</p>
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs shadow-sm hover:border-[#FF7AA6] transition-all">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[#203180] bg-indigo-50 px-2 py-0.5 rounded">
                        {log.module}
                      </span>
                      <span className="text-gray-400 font-mono text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-700 font-medium my-1">{log.action}</p>
                    <div className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>Por: {log.user}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
              <p className="text-[11px] text-gray-400 font-medium">
                Conforme a los requisitos de seguridad e integridad KEINSHOP AA.
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
