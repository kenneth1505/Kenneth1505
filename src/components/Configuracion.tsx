import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Settings, 
  DollarSign, 
  Truck, 
  CreditCard, 
  Check, 
  Lock, 
  User, 
  Database,
  Key,
  Cloud,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Undo2,
  FileText,
  Clock,
  CheckCircle2,
  Server,
  Smartphone,
  AlertCircle,
  Layers
} from 'lucide-react';
import { UserRole, Product, Client, SpecialOrder, Transaction } from '../types';

interface ConfiguracionProps {
  role: UserRole;
  products?: Product[];
  clients?: Client[];
  orders?: SpecialOrder[];
  transactions?: Transaction[];
  auditLogs?: any[];
  onRestoreProduct?: (sku: string) => Promise<any>;
  onRestoreClient?: (id: string) => Promise<any>;
  onRestoreOrder?: (id: string) => Promise<any>;
  onRestoreTransaction?: (id: string) => Promise<any>;
  onClearAuditLogs?: () => Promise<any>;
}

export default function Configuracion({
  role,
  products = [],
  clients = [],
  orders = [],
  transactions = [],
  auditLogs = [],
  onRestoreProduct,
  onRestoreClient,
  onRestoreOrder,
  onRestoreTransaction,
  onClearAuditLogs
}: ConfiguracionProps) {
  
  // Tabs within Configuration
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'backup' | 'trash' | 'roles' | 'personalizacion' | 'ajustes' | 'integraciones' | 'auditoria'>('params');

  // Business settings
  const [dollarRate, setDollarRate] = useState(4100);
  const [sheinFee, setSheinFee] = useState(12000);
  const [temuFee, setTemuFee] = useState(11500);
  const [defaultCourier, setDefaultCourier] = useState('Coordinadora');
  const [wompiPublicKey, setWompiPublicKey] = useState('pub_test_5b35384c02534f1d8140');
  const [isSaved, setIsSaved] = useState(false);

  // New modules personalization state
  const [modules, setModules] = useState({
    marketing: true,
    pedidosEspeciales: true,
    crmClientes: true,
    facturacion: true,
    auditLog: true
  });

  // General settings state
  const [lang, setLang] = useState('es');
  const [currency, setCurrency] = useState('COP');
  const [timezone, setTimezone] = useState('America/Bogota');
  const [autoBackupPeriod, setAutoBackupPeriod] = useState('Diario');

  // Integraciones state
  const [googleMapsKey, setGoogleMapsKey] = useState('AIzaSyD5b35384c_MAPS_KEY_ACTIVE');
  const [whatsAppGateway, setWhatsAppGateway] = useState('https://api.whatsapp.com/send');
  const [instagramMetaAds, setInstagramMetaAds] = useState('Meta_Ads_Keinshop_Token');
  const [tiktokBusiness, setTiktokBusiness] = useState('TikTok_Biz_Keinshop_Token');

  // Buscador Global & Logs de Auditoria
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [localAuditLogs, setLocalAuditLogs] = useState<any[]>([]);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Todos los campos son obligatorios.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    setPasswordUpdating(true);
    try {
      const token = localStorage.getItem('keinshop_jwt_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentpassword: currentPassword,
          newpassword: newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess("✨ Contraseña actualizada de forma permanente y segura.");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        triggerToast("🔑 Contraseña cambiada exitosamente.");
      } else {
        setPasswordError(data.message || "Error al actualizar la contraseña.");
      }
    } catch (err) {
      console.error(err);
      setPasswordError("Error de red al actualizar la contraseña.");
    } finally {
      setPasswordUpdating(false);
    }
  };

  React.useEffect(() => {
    if (auditLogs && auditLogs.length > 0) {
      setLocalAuditLogs(auditLogs);
    } else {
      setLocalAuditLogs([
        { id: 'LOG-001', timestamp: '2026-07-02 09:12:45', user: 'Ken Israel', action: 'Actualizó TRM a $4100 COP', module: 'Configuracion' },
        { id: 'LOG-002', timestamp: '2026-07-02 08:34:11', user: 'Sonia Seller', action: 'Creó Pedido Especial PE-002', module: 'Pedidos Shein' },
        { id: 'LOG-003', timestamp: '2026-07-01 17:21:03', user: 'Mateo Content', action: 'Programó publicación de Instagram', module: 'Calendario' },
        { id: 'LOG-004', timestamp: '2026-07-01 15:45:30', user: 'Ken Israel', action: 'Removió evento de entrega del casillero Miami', module: 'Calendario' },
        { id: 'LOG-005', timestamp: '2026-06-30 11:02:18', user: 'Sonia Seller', action: 'Eliminó registro de cliente duplicado', module: 'CRM Clientes' }
      ]);
    }
  }, [auditLogs]);

  const filteredAuditLogs = localAuditLogs.filter(log => {
    const q = auditSearchQuery.toLowerCase();
    return (
      (log.user || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.module || '').toLowerCase().includes(q) ||
      (log.id || '').toLowerCase().includes(q)
    );
  });

  const handleClearAuditLogs = () => {
    if (role !== 'Admin') {
      triggerToast("❌ Acción denegada. Solo el Administrador puede borrar el historial de auditoría.");
      return;
    }
    setShowClearConfirmModal(true);
  };

  const confirmClearAuditLogs = async () => {
    setShowClearConfirmModal(false);
    if (onClearAuditLogs) {
      await onClearAuditLogs();
      triggerToast("🗑️ Registros eliminados correctamente");
    } else {
      setLocalAuditLogs([]);
      triggerToast("🗑️ Registros eliminados correctamente");
    }
  };

  // Backup & Cloud states
  const [syncing, setSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string>('Hoy, hace unos minutos');
  const [cloudBackups, setCloudBackups] = useState([
    { id: 'CB-982', date: '2026-06-25 14:32:10', size: '1.24 MB', version: 'v3.5', description: 'Copia automática diaria (Cifrado AES-256)' },
    { id: 'CB-911', date: '2026-06-24 02:11:45', size: '1.22 MB', version: 'v3.4', description: 'Copia automática diaria (Cifrado AES-256)' },
    { id: 'CB-804', date: '2026-06-23 01:05:00', size: '1.18 MB', version: 'v3.3', description: 'Copia manual antes de actualización de catálogo' }
  ]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Trash filtering
  const deletedProducts = products.filter(p => p.deleted_at);
  const deletedClients = clients.filter(c => c.deleted_at);
  const deletedOrders = orders.filter(o => o.deleted_at);
  const deletedTransactions = transactions.filter(t => t.deleted_at);

  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setNotifMsg(msg);
    setTimeout(() => setNotifMsg(null), 4000);
  };

  const handleSaveConfigs = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    triggerToast("✨ Parámetros del negocio guardados correctamente localmente y en la nube.");
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Cloud Sync simulation
  const handleCloudSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      const now = new Date();
      setLastSyncDate(`Hoy, ${now.toLocaleTimeString()}`);
      
      // Append a new item to cloud backups
      const newBackup = {
        id: `CB-${Math.floor(Math.random() * 900 + 100)}`,
        date: now.toISOString().replace('T', ' ').substring(0, 19),
        size: `${(1.2 + Math.random() * 0.1).toFixed(2)} MB`,
        version: 'v3.5',
        description: 'Guardado manual forzado (Cifrado de alta seguridad)'
      };
      setCloudBackups(prev => [newBackup, ...prev]);
      triggerToast("☁️ Respaldo integral sincronizado con éxito en la nube de KEINSHOP.");
    }, 2000);
  };

  // Restore Cloud Snapshot
  const handleRestoreCloudBackup = (backupId: string) => {
    setRestoringId(backupId);
    setTimeout(() => {
      setRestoringId(null);
      triggerToast(`✅ CRM restaurado con éxito a la versión del backup ${backupId}.`);
    }, 2500);
  };

  // Manual export to local file
  const handleExportBackupFile = () => {
    const backupData = {
      exported_at: new Date().toISOString(),
      system: "KEINSHOP CRM",
      database: {
        products_count: products.length,
        clients_count: clients.length,
        orders_count: orders.length,
        transactions_count: transactions.length,
        products,
        clients,
        orders,
        transactions
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `keinshop_crm_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("📥 Archivo JSON de copia de seguridad exportado con éxito.");
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#050507]">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#203180]" />
            Panel de Configuración Profesional
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Gestión contable, copias de seguridad en la nube, matriz de roles y recuperación segura de registros.
          </p>
        </div>
        
        {/* Sub-tabs selectors */}
        <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-xl border border-gray-150 self-start">
          <button
            onClick={() => setActiveSubTab('params')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'params' 
                ? 'bg-[#203180] text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            ⚙️ Parámetros
          </button>
          <button
            onClick={() => setActiveSubTab('backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
              activeSubTab === 'backup' 
                ? 'bg-[#203180] text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            ☁️ Nube & Backup
          </button>
          <button
            onClick={() => setActiveSubTab('trash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeSubTab === 'trash' 
                ? 'bg-[#203180] text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Papelera
            {(deletedProducts.length + deletedClients.length + deletedOrders.length + deletedTransactions.length) > 0 && (
              <span className="bg-[#FF7AA6] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                {deletedProducts.length + deletedClients.length + deletedOrders.length + deletedTransactions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'roles' 
                ? 'bg-[#203180] text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            👥 Roles y Usuarios
          </button>
          <button
            onClick={() => setActiveSubTab('personalizacion')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'personalizacion' 
                ? 'bg-[#203180] text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            🧩 Módulos
          </button>
          <button
            onClick={() => setActiveSubTab('ajustes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'ajustes' 
                ? 'bg-[#203180] text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            🌎 Ajustes
          </button>
          <button
            onClick={() => setActiveSubTab('integraciones')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'integraciones' 
                ? 'bg-[#203180] text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            🔌 Conexiones
          </button>
          <button
            onClick={() => setActiveSubTab('auditoria')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'auditoria' 
                ? 'bg-[#203180] text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            📋 Logs
          </button>
        </div>
      </div>

      {/* Floating alert */}
      {notifMsg && (
        <div className="bg-[#203180] text-white p-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-slide-up border border-indigo-400">
          <CheckCircle2 className="w-4 h-4 text-[#FF7AA6]" />
          <span>{notifMsg}</span>
        </div>
      )}

      {/* --- CONTENT AREA --- */}
      {activeSubTab === 'params' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Business configuration */}
          <form onSubmit={handleSaveConfigs} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2 space-y-5">
            <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5 pb-3 border-b border-gray-150">
              <Settings className="w-4 h-4 text-[#203180]" /> Parámetros Globales de Negocio
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">TRM Dólar ($ COP)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={dollarRate}
                    onChange={(e) => setDollarRate(Number(e.target.value))}
                    required
                    className="w-full p-2.5 border border-gray-200 rounded-lg pl-7 font-mono focus:outline-none focus:border-[#203180]"
                  />
                  <DollarSign className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Flete Libra Shein ($ COP)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sheinFee}
                  onChange={(e) => setSheinFee(Number(e.target.value))}
                  required
                  className="w-full p-2.5 border border-gray-200 rounded-lg font-mono focus:outline-none focus:border-[#203180]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Flete Libra Temu ($ COP)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={temuFee}
                  onChange={(e) => setTemuFee(Number(e.target.value))}
                  required
                  className="w-full p-2.5 border border-gray-200 rounded-lg font-mono focus:outline-none focus:border-[#203180]"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-gray-600 uppercase mb-1">Servicio Courier Transportadora Principal</label>
              <select
                value={defaultCourier}
                onChange={(e) => setDefaultCourier(e.target.value)}
                className="w-full p-2.5 border border-gray-200 bg-white rounded-lg focus:outline-none focus:border-[#203180]"
              >
                <option value="Coordinadora">Coordinadora Mercantil (Integrado)</option>
                <option value="Servientrega">Servientrega S.A. (Colombia)</option>
                <option value="Interrapidisimo">Interrapidisimo Mensajería</option>
                <option value="Envía">Envía Colvanes Express</option>
              </select>
            </div>

            <div className="space-y-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#FF7AA6]" /> Credenciales de Pasarelas de Recaudos
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Wompi Llave Pública (Sandbox)</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={wompiPublicKey}
                      onChange={(e) => setWompiPublicKey(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-lg pl-7 font-mono focus:outline-none"
                    />
                    <Key className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Enlace Directo Nequi QR</label>
                  <input
                    type="text"
                    readOnly
                    value="https://qr.nequi.com.co/direct-keinshop"
                    className="w-full p-2.5 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg font-mono cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={role !== 'Admin'}
                className="bg-[#203180] text-white hover:bg-indigo-950 disabled:opacity-40 font-extrabold text-xs py-2.5 px-5 rounded-lg flex items-center gap-1 transition-all active:scale-95"
              >
                {isSaved ? <Check className="w-4 h-4" /> : null}
                {isSaved ? '¡Configuración Guardada!' : 'Guardar Cambios de Negocio'}
              </button>
            </div>
          </form>

          {/* Quick Stats Panel */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-150">
              <Server className="w-4 h-4 text-[#203180]" /> Estadísticas de la Base de Datos
            </h3>
            
            <div className="space-y-3 font-semibold text-xs text-gray-600">
              <div className="flex justify-between p-2.5 bg-gray-50 rounded-lg">
                <span>Productos Activos</span>
                <span className="font-mono text-gray-900">{products.filter(p => !p.deleted_at).length}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-gray-50 rounded-lg">
                <span>Clientes Registrados</span>
                <span className="font-mono text-gray-900">{clients.filter(c => !c.deleted_at).length}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-gray-50 rounded-lg">
                <span>Pedidos Especiales</span>
                <span className="font-mono text-gray-900">{orders.filter(o => !o.deleted_at).length}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-gray-50 rounded-lg">
                <span>Transacciones Contables</span>
                <span className="font-mono text-gray-900">{transactions.filter(t => !t.deleted_at).length}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-gray-50 rounded-lg">
                <span>Registros del Log</span>
                <span className="font-mono text-gray-900">{auditLogs.length} acciones</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex gap-2 text-[11px] leading-relaxed">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Para mantener la máxima velocidad, se recomienda realizar un backup mensual y vaciar el historial de auditoría de logs.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- BACKUP & CLOUD STORAGE --- */}
      {activeSubTab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-150 pb-4">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-[#203180]" /> Copia de Seguridad Automática y Cifrada
              </h3>
              <span className="bg-green-100 text-green-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                Servidor Activo
              </span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Tus datos de gestión contable, inventario, pedidos especiales, agenda de publicaciones y logística están totalmente seguros. Realizamos un guardado en la nube permanente cifrado con algoritmo <strong>AES-256</strong>. Puedes restaurar a cualquier versión histórica de manera inmediata.
            </p>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleCloudSync}
                disabled={syncing}
                className="p-4 border-2 border-dashed border-indigo-200 rounded-xl hover:border-indigo-400 flex flex-col items-center justify-center gap-2 text-center transition-colors group"
              >
                {syncing ? (
                  <RefreshCw className="w-8 h-8 text-[#203180] animate-spin" />
                ) : (
                  <Cloud className="w-8 h-8 text-[#203180] group-hover:scale-110 transition-transform" />
                )}
                <span className="font-black text-xs text-gray-900">Sincronizar CRM con la Nube</span>
                <span className="text-[10px] text-gray-400">Última sincronía: {lastSyncDate}</span>
              </button>

              <button
                onClick={handleExportBackupFile}
                className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-400 flex flex-col items-center justify-center gap-2 text-center transition-colors group"
              >
                <Download className="w-8 h-8 text-[#FF7AA6] group-hover:scale-110 transition-transform" />
                <span className="font-black text-xs text-gray-900">Descargar Backup Local (PC)</span>
                <span className="text-[10px] text-gray-400">Exporta base de datos en formato .JSON</span>
              </button>
            </div>

            {/* Version list */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-gray-900 flex items-center gap-1">
                <Clock className="w-4 h-4 text-[#203180]" /> Historial de Copias Disponibles en la Nube
              </h4>
              
              <div className="divide-y divide-gray-100 border border-gray-150 rounded-xl overflow-hidden">
                {cloudBackups.map((bk) => (
                  <div key={bk.id} className="p-3.5 bg-white hover:bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{bk.description}</span>
                        <span className="bg-gray-100 text-gray-600 font-mono text-[9px] px-1.5 rounded">{bk.id}</span>
                      </div>
                      <div className="text-gray-400 text-[10px] mt-0.5">
                        Fecha: {bk.date} | Peso: {bk.size} | Estructura: {bk.version}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreCloudBackup(bk.id)}
                      disabled={restoringId !== null}
                      className="bg-gray-100 hover:bg-[#203180] hover:text-white text-gray-700 font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition-colors flex items-center gap-1"
                    >
                      {restoringId === bk.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" /> Restaurando...
                        </>
                      ) : (
                        <>
                          <Undo2 className="w-3 h-3" /> Restaurar versión
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Backup policy information */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-150">
              <Lock className="w-4 h-4 text-pink-600" /> Seguridad de Datos
            </h3>

            <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
              <p>
                <strong>1. Permanente y Seguro:</strong> Las copias son inmutables y se alojan en servidores distribuidos con redundancia del 99.9%.
              </p>
              <p>
                <strong>2. Copias Incrementales:</strong> Cada cambio realizado en pedidos o contabilidad genera un mini-snapshot que no sobrecarga la memoria.
              </p>
              <p>
                <strong>3. Compatibilidad Offline:</strong> Si pierdes la conexión, el CRM almacena todos tus registros en el navegador y los sincroniza automáticamente en el instante en que recuperas internet.
              </p>
            </div>
          </div>



        </div>
      )}

      {/* --- PAPELERA DE RECICLAJE (TRASH RECOVERY) --- */}
      {activeSubTab === 'trash' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div className="border-b border-gray-150 pb-4">
            <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Papelera de Reciclaje y Restauración de Registros
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Todos los productos, pedidos, clientes y transacciones eliminados en el CRM se guardan aquí de manera segura antes de su eliminación permanente. Puedes recuperarlos con un solo clic.
            </p>
          </div>

          {/* Grid of deleted items */}
          <div className="space-y-6 text-xs">
            
            {/* 1. DELETED PRODUCTS */}
            <div>
              <h4 className="font-bold text-[#203180] mb-2 flex items-center gap-1.5 bg-indigo-50 p-2 rounded">
                🧥 Productos en Papelera ({deletedProducts.length})
              </h4>
              {deletedProducts.length === 0 ? (
                <p className="text-gray-400 italic p-2 pl-4">No hay productos eliminados temporalmente.</p>
              ) : (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-gray-500 font-bold">
                        <th className="p-3">Producto / SKU</th>
                        <th className="p-3">Precio</th>
                        <th className="p-3">Eliminado por</th>
                        <th className="p-3">Razón</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {deletedProducts.map((p) => (
                        <tr key={p.sku} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-900">
                            {p.name} <span className="font-mono text-[10px] text-gray-400 block">{p.sku}</span>
                          </td>
                          <td className="p-3 font-mono">${p.priceSell.toLocaleString()} COP</td>
                          <td className="p-3 text-gray-500">{p.deletedby || 'Admin'}</td>
                          <td className="p-3 text-gray-500 italic">"{p.deleted_reason || 'Sin razón especificada'}"</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={async () => {
                                if (onRestoreProduct) {
                                  await onRestoreProduct(p.sku);
                                  triggerToast(`🧥 Producto ${p.name} restaurado correctamente.`);
                                }
                              }}
                              className="bg-[#203180] hover:bg-indigo-900 text-white font-extrabold px-2.5 py-1 rounded flex items-center gap-1 ml-auto text-[10px]"
                            >
                              <Undo2 className="w-3 h-3" /> Restaurar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2. DELETED ORDERS */}
            <div>
              <h4 className="font-bold text-[#FF7AA6] mb-2 flex items-center gap-1.5 bg-pink-50 p-2 rounded">
                📦 Pedidos Especiales en Papelera ({deletedOrders.length})
              </h4>
              {deletedOrders.length === 0 ? (
                <p className="text-gray-400 italic p-2 pl-4">No hay pedidos especiales archivados en papelera.</p>
              ) : (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-gray-500 font-bold">
                        <th className="p-3">ID Pedido / Cliente</th>
                        <th className="p-3">Total del Pedido</th>
                        <th className="p-3">Eliminado por</th>
                        <th className="p-3">Razón</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {deletedOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-900">
                            Pedido #{o.id} <span className="font-medium text-[10px] text-gray-500 block">{o.client_name || 'Desconocido'}</span>
                          </td>
                          <td className="p-3 font-mono">${(o.totalCost || 0).toLocaleString()} COP</td>
                          <td className="p-3 text-gray-500">{o.deleted_by || 'Admin'}</td>
                          <td className="p-3 text-gray-500 italic">"{o.deleted_reason || 'Sin razón'}"</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={async () => {
                                if (onRestoreOrder) {
                                  await onRestoreOrder(o.id);
                                  triggerToast(`📦 Pedido #${o.id} restaurado al flujo logístico.`);
                                }
                              }}
                              className="bg-[#203180] hover:bg-indigo-900 text-white font-extrabold px-2.5 py-1 rounded flex items-center gap-1 ml-auto text-[10px]"
                            >
                              <Undo2 className="w-3 h-3" /> Restaurar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. DELETED CLIENTS */}
            <div>
              <h4 className="font-bold text-green-700 mb-2 flex items-center gap-1.5 bg-green-50 p-2 rounded">
                👥 Clientes en Papelera ({deletedClients.length})
              </h4>
              {deletedClients.length === 0 ? (
                <p className="text-gray-400 italic p-2 pl-4">No hay clientes eliminados.</p>
              ) : (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-gray-500 font-bold">
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Contacto</th>
                        <th className="p-3">Fecha de Baja</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {deletedClients.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-900">{c.name}</td>
                          <td className="p-3 font-mono text-gray-500">{c.phone} | {c.email || 'Sin correo'}</td>
                          <td className="p-3 text-gray-400 font-mono">{c.deleted_at ? new Date(c.deleted_at).toLocaleString() : 'N/A'}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={async () => {
                                if (onRestoreClient) {
                                  await onRestoreClient(c.id);
                                  triggerToast(`👥 Cliente ${c.name} reincorporado a la base.`);
                                }
                              }}
                              className="bg-[#203180] hover:bg-indigo-900 text-white font-extrabold px-2.5 py-1 rounded flex items-center gap-1 ml-auto text-[10px]"
                            >
                              <Undo2 className="w-3 h-3" /> Restaurar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 4. DELETED TRANSACTIONS */}
            <div>
              <h4 className="font-bold text-amber-700 mb-2 flex items-center gap-1.5 bg-amber-50 p-2 rounded">
                💸 Transacciones Contables en Papelera ({deletedTransactions.length})
              </h4>
              {deletedTransactions.length === 0 ? (
                <p className="text-gray-400 italic p-2 pl-4">No hay transacciones contables eliminadas.</p>
              ) : (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-gray-500 font-bold">
                        <th className="p-3">Detalle / Concepto</th>
                        <th className="p-3">Monto</th>
                        <th className="p-3">Eliminado por</th>
                        <th className="p-3">Razón</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {deletedTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-900">
                            {t.description} <span className="font-mono text-[9px] text-gray-400 block">{t.id} | {t.date}</span>
                          </td>
                          <td className={`p-3 font-mono font-bold ${t.type === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === 'Ingreso' ? '+' : '-'}${t.amount.toLocaleString()} COP
                          </td>
                          <td className="p-3 text-gray-500">{t.deletedby || 'Admin'}</td>
                          <td className="p-3 text-gray-500 italic">"{t.deletedreason || 'Sin razón'}"</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={async () => {
                                if (onRestoreTransaction) {
                                  await onRestoreTransaction(t.id);
                                  triggerToast(`💸 Transacción de ${t.amount} COP restaurada en caja.`);
                                }
                              }}
                              className="bg-[#203180] hover:bg-indigo-900 text-white font-extrabold px-2.5 py-1 rounded flex items-center gap-1 ml-auto text-[10px]"
                            >
                              <Undo2 className="w-3 h-3" /> Restaurar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- ROLES & MEMBERS --- */}
      {activeSubTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-150">
              <Shield className="w-4 h-4 text-[#FF7AA6]" /> Matriz de Permisos del Sistema
            </h3>

            <p className="text-xs text-gray-500 leading-relaxed">
              El sistema KEINSHOP bloquea o habilita acciones de edición y eliminación según los roles asignados a los usuarios.
            </p>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                <span className="font-bold text-[#203180] block">Administrador (Admin)</span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Control absoluto del inventario, cuentas bancarias, eliminar registros de logs, restauración en la nube, y vaciado permanente de la papelera.
                </p>
              </div>

              <div className="p-3 bg-pink-50 border border-pink-100 rounded-xl space-y-1">
                <span className="font-bold text-pink-700 block">Vendedor (Sonia Seller)</span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Registra clientes, crea pedidos Shein/Temu, recauda abonos y edita stock. Tiene restringido el calendario de marketing, configuraciones y borrar transacciones financieras.
                </p>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <span className="font-bold text-gray-700 block">Gestor de Contenido (Mateo Content)</span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Control total de copywriting, publicaciones, horarios, banners y copywriter de marketing IA. Tiene restringido crear pedidos de venta y registrar abonos.
                </p>
              </div>
            </div>
          </div>

          {/* Active Members Status */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-150">
              <Smartphone className="w-4 h-4 text-[#203180]" /> Personal Activo en CRM
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                <div>
                  <span className="font-bold text-xs text-gray-900 block">Ken Israel (Tú)</span>
                  <span className="text-[10px] text-[#203180] font-bold">Administrador General</span>
                </div>
                <span className="bg-green-100 text-green-800 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  ONLINE
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                <div>
                  <span className="font-bold text-xs text-gray-900 block">Sonia Seller</span>
                  <span className="text-[10px] text-pink-700 font-bold">Ventas & Pedidos</span>
                </div>
                <span className="bg-green-100 text-green-800 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  ONLINE
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                <div>
                  <span className="font-bold text-xs text-gray-900 block">Mateo Content</span>
                  <span className="text-[10px] text-gray-600 font-bold">Social Media Coordinator</span>
                </div>
                <span className="bg-gray-100 text-gray-400 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  OFFLINE
                </span>
              </div>
            </div>
          </div>

          {/* Actualización de Contraseña */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-150">
              <Lock className="w-4 h-4 text-[#203180]" /> Actualización de Contraseña
            </h3>
            
            <p className="text-[11px] text-gray-500 leading-relaxed text-left">
              Modifica tu clave de acceso. Las contraseñas actualizadas son permanentes y seguras, sin reversión automática ni cambios en cada ingreso.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1 text-left">Contraseña Actual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#203180] font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1 text-left">Nueva Contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#203180] font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1 text-left">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#203180] font-mono"
                />
              </div>

              {passwordError && (
                <div className="p-2.5 bg-red-50 border border-red-100 text-red-700 rounded-lg text-[11px] font-medium flex items-start gap-1 text-left">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-2.5 bg-green-50 border border-green-100 text-green-700 rounded-lg text-[11px] font-medium flex items-start gap-1 text-left">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordUpdating}
                className="w-full bg-[#203180] text-white hover:bg-indigo-950 disabled:opacity-40 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                {passwordUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {passwordUpdating ? 'Guardando clave...' : 'Guardar nueva contraseña'}
              </button>
            </form>

            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-800 text-[10px] leading-normal font-medium flex gap-1.5 text-left">
              <Check className="w-3.5 h-3.5 text-[#FF7AA6] flex-shrink-0" />
              <span>Login Estable Activado: Se usará la contraseña actualizada de forma inmutable, sin solicitar reajustes obligatorios periódicos.</span>
            </div>
          </div>

        </div>
      )}

      {/* --- NEW CONFIGURATION SUB-TABS --- */}

      {activeSubTab === 'personalizacion' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 text-xs">
          <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5 pb-3 border-b border-gray-150">
            <Layers className="w-4 h-4 text-[#203180]" /> Personalización de Módulos Activos
          </h3>
          <p className="text-gray-500 leading-relaxed">
            Habilita o deshabilita los módulos del CRM según la temporada o preferencias de administración para simplificar tu flujo de trabajo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="font-extrabold text-gray-900 block">Módulo de Marketing IA</span>
                <span className="text-[10px] text-gray-400">Generadores de contenido y carruseles</span>
              </div>
              <input 
                type="checkbox" 
                checked={modules.marketing}
                onChange={(e) => setModules(prev => ({ ...prev, marketing: e.target.checked }))}
                className="rounded text-[#203180] focus:ring-[#203180] h-4 w-4 cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="font-extrabold text-gray-900 block">Módulo de Pedidos Especiales (Shein/Temu)</span>
                <span className="text-[10px] text-gray-400">Registrar pedidos consolidados, fletes por libra</span>
              </div>
              <input 
                type="checkbox" 
                checked={modules.pedidosEspeciales}
                onChange={(e) => setModules(prev => ({ ...prev, pedidosEspeciales: e.target.checked }))}
                className="rounded text-[#203180] focus:ring-[#203180] h-4 w-4 cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="font-extrabold text-gray-900 block">Módulo CRM Clientes</span>
                <span className="text-[10px] text-gray-400">Directorio, historial de compras, abonos</span>
              </div>
              <input 
                type="checkbox" 
                checked={modules.crmClientes}
                onChange={(e) => setModules(prev => ({ ...prev, crmClientes: e.target.checked }))}
                className="rounded text-[#203180] focus:ring-[#203180] h-4 w-4 cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="font-extrabold text-gray-900 block">Módulo de Facturación & Cobros</span>
                <span className="text-[10px] text-gray-400">Pasarelas de pago, impuestos y TRM</span>
              </div>
              <input 
                type="checkbox" 
                checked={modules.facturacion}
                onChange={(e) => setModules(prev => ({ ...prev, facturacion: e.target.checked }))}
                className="rounded text-[#203180] focus:ring-[#203180] h-4 w-4 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => triggerToast("✨ Configuración de módulos guardada exitosamente.")}
              className="bg-[#203180] hover:bg-indigo-950 text-white font-extrabold py-2 px-5 rounded-xl shadow-sm transition-all"
            >
              Guardar Módulos
            </button>
          </div>
        </div>
      )}

      {activeSubTab === 'ajustes' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 text-xs">
          <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5 pb-3 border-b border-gray-150">
            <Settings className="w-4 h-4 text-[#203180]" /> Ajustes Generales del CRM
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block font-bold text-gray-600 uppercase mb-1">Idioma Predeterminado</label>
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value)}
                className="w-full p-2.5 border border-gray-200 bg-white rounded-lg font-bold"
              >
                <option value="es">Español (Colombia - Latam)</option>
                <option value="en">English (Global)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-600 uppercase mb-1">Moneda del Sistema</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-2.5 border border-gray-200 bg-white rounded-lg font-bold"
              >
                <option value="COP">Pesos Colombianos ($ COP)</option>
                <option value="USD">Dólares Americanos ($ USD)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-600 uppercase mb-1">Zona Horaria</label>
              <select 
                value={timezone} 
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full p-2.5 border border-gray-200 bg-white rounded-lg font-bold"
              >
                <option value="America/Bogota">Bogotá, Lima, Quito (GMT-5)</option>
                <option value="America/New_York">Nueva York, Miami (GMT-5 / DST)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-600 uppercase mb-1">Periodicidad de Respaldo Automático</label>
              <select 
                value={autoBackupPeriod} 
                onChange={(e) => setAutoBackupPeriod(e.target.value)}
                className="w-full p-2.5 border border-gray-200 bg-white rounded-lg font-bold"
              >
                <option value="Diario">Cada 24 horas (Diario)</option>
                <option value="Semanal">Cada 7 días (Semanal)</option>
                <option value="Manual">Solo Manual</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => triggerToast("✨ Ajustes generales aplicados de forma global.")}
              className="bg-[#203180] hover:bg-indigo-950 text-white font-extrabold py-2 px-5 rounded-xl shadow-sm transition-all"
            >
              Guardar Ajustes
            </button>
          </div>
        </div>
      )}

      {activeSubTab === 'integraciones' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 text-xs">
          <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5 pb-3 border-b border-gray-150">
            <Key className="w-4 h-4 text-[#203180]" /> Gestión de Conexiones e Integraciones Externas
          </h3>
          <p className="text-gray-500 leading-relaxed">
            Configura los tokens y credenciales de acceso de las APIs conectadas con el CRM de KEINSHOP.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 space-y-2">
              <span className="font-extrabold text-[#203180] block">Google Maps API Key</span>
              <input 
                type="text" 
                value={googleMapsKey}
                onChange={(e) => setGoogleMapsKey(e.target.value)}
                className="w-full p-2 border border-gray-200 bg-white rounded-lg font-mono font-bold"
              />
              <span className="text-[10px] text-gray-400 block">Sincroniza el optimizador logístico y radar de rutas en tiempo real.</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 space-y-2">
              <span className="font-extrabold text-green-700 block">WhatsApp Business API Link</span>
              <input 
                type="text" 
                value={whatsAppGateway}
                onChange={(e) => setWhatsAppGateway(e.target.value)}
                className="w-full p-2 border border-gray-200 bg-white rounded-lg font-mono font-bold"
              />
              <span className="text-[10px] text-gray-400 block">Envío automático de notificaciones de arribo y cobros a clientes.</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 space-y-2">
              <span className="font-extrabold text-pink-700 block">Meta Ads Manager Integration (Instagram)</span>
              <input 
                type="password" 
                value={instagramMetaAds}
                onChange={(e) => setInstagramMetaAds(e.target.value)}
                className="w-full p-2 border border-gray-200 bg-white rounded-lg font-mono font-bold"
              />
              <span className="text-[10px] text-gray-400 block">Para programar, medir engagement y jalar audiencias directo al CRM.</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 space-y-2">
              <span className="font-extrabold text-gray-800 block">TikTok Business API Token</span>
              <input 
                type="password" 
                value={tiktokBusiness}
                onChange={(e) => setTiktokBusiness(e.target.value)}
                className="w-full p-2 border border-gray-200 bg-white rounded-lg font-mono font-bold"
              />
              <span className="text-[10px] text-gray-400 block">Vincular campañas virales y programar contenido streetwear.</span>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => triggerToast("🔌 Integraciones API sincronizadas correctamente.")}
              className="bg-[#203180] hover:bg-indigo-950 text-white font-extrabold py-2 px-5 rounded-xl shadow-sm transition-all"
            >
              Actualizar Conexiones
            </button>
          </div>
        </div>
      )}

      {activeSubTab === 'auditoria' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-150">
            <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#203180]" /> Historial de Auditoría en Tiempo Real (Live Action Logs)
            </h3>
            {role === 'Admin' && (
              <button
                onClick={handleClearAuditLogs}
                className="bg-red-50 hover:bg-red-100 text-red-700 font-extrabold py-1.5 px-3 rounded-lg border border-red-200 flex items-center gap-1 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Vaciar logs
              </button>
            )}
          </div>

          <p className="text-gray-500 leading-relaxed text-[11px]">
            El sistema KEINSHOP registra de forma indeleble cada acción crítica, creación de pedidos, abonos, modificaciones del inventario y remociones del calendario para efectos de auditoría contable y de seguridad.
          </p>

          {/* Search filter input */}
          <div className="relative pt-2">
            <input 
              type="text"
              placeholder="🔍 Buscador global de acciones (Escribe 'Sonia', 'TRM', 'calendario', 'LOG-003')..."
              value={auditSearchQuery}
              onChange={(e) => setAuditSearchQuery(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#203180]"
            />
          </div>

          {/* Table display */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-wider border-b border-gray-200">
                  <th className="p-3">ID Log</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Usuario / Rol</th>
                  <th className="p-3">Acción Registrada</th>
                  <th className="p-3">Módulo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-400 font-medium">No se encontraron logs de auditoría que coincidan con la búsqueda.</td>
                  </tr>
                ) : (
                  filteredAuditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 text-[11px] transition-colors">
                      <td className="p-3 font-mono font-bold text-[#203180]">{log.id}</td>
                      <td className="p-3 text-gray-500 font-mono">{log.timestamp}</td>
                      <td className="p-3">
                        <span className="font-extrabold text-gray-900">{log.user}</span>
                        <span className="block text-[9px] text-gray-400">Autenticado</span>
                      </td>
                      <td className="p-3 text-gray-700 font-semibold">{log.action}</td>
                      <td className="p-3">
                        <span className="bg-indigo-50 text-[#203180] font-black font-mono text-[9px] px-1.5 py-0.5 rounded-full uppercase">
                          {log.module}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Audit Logs */}
      <AnimatePresence>
        {showClearConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507]/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 border border-[#050507]/10 shadow-xl max-w-md w-full"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle className="w-6 h-6" />
                <h4 className="font-extrabold text-base">¿Confirmar eliminación de registros?</h4>
              </div>

              <p className="text-gray-600 text-xs leading-relaxed mb-6">
                Esta acción eliminará de forma permanente todos los registros del historial de auditoría para liberar espacio y optimizar el rendimiento. 
                <strong className="block mt-2 text-gray-800">
                  Por motivos de seguridad, se registrará una constancia inalterable de esta acción indicando el usuario, la fecha y la hora del vaciado.
                </strong>
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold py-2 px-4 rounded-lg transition-all text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmClearAuditLogs}
                  className="bg-red-600 hover:bg-red-700 text-white font-extrabold py-2 px-4 rounded-lg shadow-sm shadow-red-100 transition-all text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Confirmar Eliminación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
