import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Key, ShieldAlert, Plus, Check, Clipboard, Trash2, ShieldCheck, 
  RefreshCw, Calendar, Search, Filter, HelpCircle, Eye, FileText, 
  AlertCircle, Users, UserPlus, ToggleLeft, ToggleRight, Trash, 
  Send, UserCheck, Shield 
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
  created_by_name?: string;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: any;
  ip: string | null;
  request_id: string;
  created_at: string;
}

interface UserRecord {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  email: string;
  is_active: boolean;
  force_password_reset: boolean;
  created_at: string;
}

interface ApiKeysManagementProps {
  token: string;
  currentUser: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    email: string;
  };
}

export default function ApiKeysManagement({ token, currentUser }: ApiKeysManagementProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'apikeys' | 'users' | 'audit'>('apikeys');

  // Lists & Loaders
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // New Key Form State
  const [keyName, setKeyName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'inventory.read',
    'orders.read'
  ]);

  // Modal State for Newly Created Key
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // New Invitation Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Editing User State
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editRole, setEditRole] = useState('employee');
  const [editPhone, setEditPhone] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Filters and Searching
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const ALLOWED_ADMIN_EMAILS = ["kenisra156@gmail.com", "ingrithm.2110@gmail.com"];
  const isSuperAdmin = ALLOWED_ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim()) || !!(currentUser as any).is_superadmin;

  const availableScopes = [
    { value: 'inventory.read', label: 'Lectura de Inventario (inventory.read)' },
    { value: 'inventory.write', label: 'Escritura de Inventario (inventory.write)' },
    { value: 'orders.read', label: 'Lectura de Pedidos (orders.read)' },
    { value: 'orders.write', label: 'Escritura de Pedidos (orders.write)' },
    { value: 'clients.read', label: 'Lectura de Clientes (clients.read)' },
    { value: 'clients.write', label: 'Escritura de Clientes (clients.write)' },
    { value: 'accounting.read', label: 'Lectura Contable (accounting.read)' }
  ];

  const fetchKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Error al obtener llaves de acceso.');
      }
    } catch (e) {
      console.error('Error fetching API keys:', e);
    } finally {
      setLoadingKeys(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'No se pudieron cargar los registros de auditoría.');
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchUsers = async () => {
    if (currentUser.role !== 'admin') return;
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Error al obtener usuarios del sistema.');
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchKeys();
    fetchAuditLogs();
    fetchUsers();
  }, [token, currentUser]);

  const handleToggleScope = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(prev => prev.filter(s => s !== scope));
    } else {
      setSelectedScopes(prev => [...prev, scope]);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!keyName.trim()) {
      setErrorMsg('Debe proveer un nombre identificativo para la llave.');
      return;
    }

    if (selectedScopes.length === 0) {
      setErrorMsg('Debe seleccionar al menos un scope de permisos.');
      return;
    }

    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: keyName,
          scopes: selectedScopes,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo crear la llave de acceso.');
      }

      setCreatedKey(data.raw_key);
      setKeyName('');
      setExpiresAt('');
      fetchKeys();
      fetchAuditLogs();
      setSuccessMsg('Llave de acceso generada con éxito.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error del servidor.');
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea revocar esta llave de acceso de manera permanente? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo revocar la llave.');
      }

      setSuccessMsg('Llave de acceso revocada de inmediato.');
      fetchKeys();
      fetchAuditLogs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al revocar.');
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isSuperAdmin) {
      setErrorMsg('Acceso denegado. Solo Kenneth o Ingrith pueden emitir invitaciones.');
      return;
    }

    if (!inviteEmail.trim()) {
      setErrorMsg('El correo electrónico de destino es obligatorio.');
      return;
    }

    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          phone: invitePhone,
          name: inviteName
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo generar la invitación.');
      }

      setCreatedInviteUrl(data.invite_url);
      setInviteEmail('');
      setInvitePhone('');
      setInviteName('');
      setInviteRole('employee');
      fetchAuditLogs();
      setSuccessMsg('Invitación creada exitosamente.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la invitación.');
    }
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: editFirstName,
          last_name: editLastName,
          role: editRole,
          phone: editPhone,
          is_active: editIsActive
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al actualizar usuario.');
      }

      setSuccessMsg('Usuario actualizado correctamente.');
      setEditingUser(null);
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar usuario.');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de que desea ELIMINAR permanentemente la cuenta de ${name}? Esta acción purgará sus registros de acceso.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al eliminar usuario.');
      }

      setSuccessMsg('Usuario eliminado del CRM.');
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar usuario.');
    }
  };

  const handleCopyToClipboard = (text: string, type: 'key' | 'invite') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  // Filter logs based on search query
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.target_type && log.target_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.ip && log.ip.includes(searchQuery)) ||
      (log.request_id && log.request_id.includes(searchQuery)) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter ? log.action === actionFilter : true;

    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(auditLogs.map(l => l.action)));

  return (
    <div className="space-y-6 pb-12 font-sans bg-white text-[#050507]">
      
      {/* Tab Header with CRM corporate branding */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#050507]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-rose-50 text-[#FF7AA6] border border-rose-100">
              Módulo de Control y Seguridad
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 text-[#203180] border border-indigo-100">
              Sesión: {currentUser.first_name} ({currentUser.role})
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#203180] tracking-tight">
            Llaves, Accesos y Auditoría
          </h1>
          <p className="text-xs text-[#050507]/60 mt-1">
            Gestión centralizada de credenciales de API externas, control de invitaciones de personal y auditoría forense de transacciones.
          </p>
        </div>
        
        {/* Sync trigger / Reload data */}
        <div>
          <button
            onClick={() => {
              fetchKeys();
              fetchAuditLogs();
              fetchUsers();
              setSuccessMsg('Datos actualizados de forma segura.');
            }}
            className="btn-secondary px-4 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar Todo</span>
          </button>
        </div>
      </div>

      {/* Banner Notifications */}
      {errorMsg && (
        <div className="p-4 bg-[#C80C0C]/5 border border-[#C80C0C]/20 text-[#C80C0C] rounded-xl text-xs flex items-center gap-2.5 font-medium">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-[#FF7AA6]/5 border border-[#FF7AA6]/20 text-[#FF7AA6] rounded-xl text-xs flex items-center gap-2.5 font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#FF7AA6]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Corporate Tab Selector */}
      <div className="flex border-b border-[#050507]/10">
        <button
          onClick={() => setActiveTab('apikeys')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'apikeys'
              ? 'border-[#FF7AA6] text-[#FF7AA6]'
              : 'border-transparent text-gray-500 hover:text-[#203180]'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>API Keys</span>
        </button>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'border-[#FF7AA6] text-[#FF7AA6]'
                : 'border-transparent text-gray-500 hover:text-[#203180]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Invitaciones y Usuarios</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'border-[#FF7AA6] text-[#FF7AA6]'
              : 'border-transparent text-gray-500 hover:text-[#203180]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Bitácora de Auditoría</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div>
        {/* TAB 1: API KEYS TAB */}
        {activeTab === 'apikeys' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Generate Key (Left Column - Span 5) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-[#050507]/10 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[#203180]">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#203180]">Generar Llave Segura</h3>
                    <p className="text-[10px] text-gray-400">Credenciales robustas para consultas externas</p>
                  </div>
                </div>

                <form onSubmit={handleCreateKey} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                      Nombre de la Llave
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: ERP Externo, Integración Shopify"
                      value={keyName}
                      onChange={e => setKeyName(e.target.value)}
                      className="w-full bg-white border border-[#050507]/10 rounded-lg p-3 text-xs text-[#050507] focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                      Fecha de Expiración (Opcional)
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={expiresAt}
                        onChange={e => setExpiresAt(e.target.value)}
                        className="w-full bg-white border border-[#050507]/10 rounded-lg py-2.5 pl-9 pr-3 text-xs text-[#050507] focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-wider">
                      Permisos Otorgados (Scopes)
                    </label>
                    <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100 max-h-[160px] overflow-y-auto">
                      {availableScopes.map(scope => {
                        const isChecked = selectedScopes.includes(scope.value);
                        return (
                          <button
                            type="button"
                            key={scope.value}
                            onClick={() => handleToggleScope(scope.value)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-[11px] transition-all cursor-pointer ${
                              isChecked 
                                ? 'bg-[#FF7AA6]/5 text-[#FF7AA6] border border-[#FF7AA6]/20 font-bold' 
                                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                            }`}
                          >
                            <span>{scope.label}</span>
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                              isChecked ? 'bg-[#FF7AA6] border-[#FF7AA6] text-white' : 'border-gray-300'
                            }`}>
                              {isChecked && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingKeys}
                    className="w-full btn-primary py-3 text-xs tracking-wider uppercase font-bold shadow-md shadow-[#FF7AA6]/10 cursor-pointer"
                  >
                    Generar Credencial API
                  </button>
                </form>
              </div>

              {/* Usage Guide Block */}
              <div className="bg-[#203180] text-white rounded-2xl p-6 shadow-sm border border-transparent">
                <h4 className="font-extrabold text-sm mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF7AA6]" />
                  Instrucciones de Uso Seguro
                </h4>
                <p className="text-[11px] text-gray-200 leading-relaxed mb-4">
                  Envíe el encabezado <code className="bg-[#050507]/40 px-1 rounded font-mono text-[#FF7AA6]">x-api-key</code> en sus peticiones HTTP REST.
                </p>

                <div className="bg-[#050507]/35 p-3 rounded-lg font-mono text-[9px] text-[#FF7AA6] overflow-x-auto">
                  <div># Consultar inventario vía terminal:</div>
                  <div className="text-white mt-1">curl -X GET \</div>
                  <div className="text-white">  -H "x-api-key: <span className="text-[#FF7AA6]">SU_API_KEY</span>" \</div>
                  <div className="text-white">  https://crm.keinshop.com/api/inventory</div>
                </div>
              </div>
            </div>

            {/* List Active Keys (Right Column - Span 7) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl p-6 border border-[#050507]/10 shadow-sm h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[#203180]">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#203180]">Credenciales API Registradas</h3>
                      <p className="text-[10px] text-gray-400">Pares de llaves vigentes en la base de datos</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#FF7AA6] bg-[#FF7AA6]/5 border border-[#FF7AA6]/10 px-2.5 py-1 rounded-full">
                    {keys.length} Activas
                  </span>
                </div>

                {loadingKeys ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-[#203180] rounded-full animate-spin" />
                    <span className="text-xs">Cargando llaves...</span>
                  </div>
                ) : keys.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-100 rounded-xl">
                    <ShieldAlert className="w-8 h-8 text-gray-300 mb-2" />
                    <h4 className="font-bold text-xs text-gray-500">No se han emitido llaves</h4>
                    <p className="text-[10px] text-gray-400 mt-1">Utilice el panel izquierdo para generar su primera llave.</p>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px] pr-1">
                    {keys.map(key => (
                      <div 
                        key={key.id}
                        className={`p-4 rounded-xl border transition-all ${
                          key.is_active 
                            ? 'bg-gray-50/50 border-[#050507]/5 hover:border-[#FF7AA6]/30' 
                            : 'bg-red-50/30 border-red-100/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-gray-950">{key.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                key.is_active 
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                  : 'bg-red-100 text-red-600 border border-red-200'
                              }`}>
                                {key.is_active ? 'Activa' : 'Revocada'}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 flex flex-wrap gap-x-2">
                              <span>Creada: {new Date(key.created_at).toLocaleDateString()}</span>
                              {key.expires_at ? (
                                <span className="text-amber-600 font-semibold">Vence: {new Date(key.expires_at).toLocaleDateString()}</span>
                              ) : (
                                <span className="text-gray-400">Permanente (Sin Expiración)</span>
                              )}
                            </div>
                          </div>

                          {key.is_active && (
                            <button
                              onClick={() => handleRevokeKey(key.id)}
                              className="p-2 rounded-lg text-[#C80C0C] hover:bg-red-50 transition-colors cursor-pointer"
                              title="Revocar permanentemente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* List Scopes */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {key.scopes.map(sc => (
                            <span 
                              key={sc}
                              className="px-2 py-0.5 rounded bg-indigo-50/50 border border-indigo-100 text-[9px] font-mono text-[#203180] font-bold"
                            >
                              {sc}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVITATIONS & USERS TAB */}
        {activeTab === 'users' && currentUser.role === 'admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
            {/* Invite Panel (Left Column - Span 5) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-[#050507]/10 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[#203180]">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#203180]">Invitar Nuevo Miembro</h3>
                    <p className="text-[10px] text-gray-400">Emita un pase de registro seguro y exclusivo</p>
                  </div>
                </div>

                {!isSuperAdmin ? (
                  <div className="p-3.5 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-xs leading-relaxed font-semibold">
                    ⚠️ Restricción de Seguridad: Solo Kenneth (<span className="font-mono">kenisra156@gmail.com</span>) e Ingrith (<span className="font-mono">ingrithm.2110@gmail.com</span>) tienen permisos criptográficos para emitir invitaciones en producción.
                  </div>
                ) : (
                  <form onSubmit={handleCreateInvite} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                        Correo de Destino
                      </label>
                      <input
                        type="email"
                        placeholder="empleado@keinshop.com"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        className="w-full bg-white border border-[#050507]/10 rounded-lg p-3 text-xs text-[#050507] focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                          Nombre (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Juan"
                          value={inviteName}
                          onChange={e => setInviteName(e.target.value)}
                          className="w-full bg-white border border-[#050507]/10 rounded-lg p-3 text-xs text-[#050507] focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                          Teléfono (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="099123456"
                          value={invitePhone}
                          onChange={e => setInvitePhone(e.target.value)}
                          className="w-full bg-white border border-[#050507]/10 rounded-lg p-3 text-xs text-[#050507] focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                        Rol a Asignar
                      </label>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value)}
                        className="w-full bg-white border border-[#050507]/10 rounded-lg p-3 text-xs text-[#050507] focus:outline-none focus:border-[#FF7AA6] transition-all min-h-[44px]"
                      >
                        <option value="employee">Vendedor / Empleado (employee)</option>
                        <option value="manager">Gestor / Supervisor (manager)</option>
                        <option value="viewer">Visualizador de Reportes (viewer)</option>
                        <option value="admin">Administrador del Sistema (admin)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full btn-primary py-3 text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer"
                    >
                      Generar Invitación Criptográfica
                    </button>
                  </form>
                )}

                {/* Secure Invite Url Reveal Box */}
                {createdInviteUrl && (
                  <div className="mt-5 p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2.5">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#203180] block">⚡ ENLACE DE INVITACIÓN GENERADO:</span>
                    <p className="text-[10px] text-[#050507]/75 leading-relaxed">
                      Este link expira en un plazo riguroso de 7 días. Cópielo y envíeselo al usuario.
                    </p>
                    <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-indigo-100 relative overflow-hidden">
                      <span className="text-[10px] font-mono text-[#203180] truncate block flex-1 max-w-[200px]">
                        {createdInviteUrl}
                      </span>
                      <button
                        onClick={() => handleCopyToClipboard(createdInviteUrl, 'invite')}
                        className="p-1.5 bg-indigo-50 text-[#203180] rounded hover:bg-[#203180] hover:text-white transition-all cursor-pointer flex items-center justify-center"
                        title="Copiar Enlace"
                      >
                        {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {copiedInvite && (
                      <span className="text-[9px] text-[#FF7AA6] font-bold block">✓ Enlace copiado al portapapeles</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* List Existing CRM Users (Right Column - Span 7) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl p-6 border border-[#050507]/10 shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[#203180]">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#203180]">Cuentas de Usuarios CRM</h3>
                      <p className="text-[10px] text-gray-400">Personal con credenciales activas o pendientes</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                    {users.length} Registrados
                  </span>
                </div>

                {loadingUsers ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-[#203180] rounded-full animate-spin" />
                    <span className="text-xs">Cargando usuarios...</span>
                  </div>
                ) : (
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#050507]/5 text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">
                          <th className="py-2.5">Usuario</th>
                          <th className="py-2.5">Rol</th>
                          <th className="py-2.5">Teléfono</th>
                          <th className="py-2.5">Estado</th>
                          <th className="py-2.5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#050507]/5 text-xs text-[#050507]/80">
                        {users.map(u => {
                          const isSeedAdmin = ["kenisra156@gmail.com", "ingrithm.2110@gmail.com"].includes(u.email.toLowerCase().trim());
                          return (
                            <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-3 pr-2">
                                <div className="font-bold text-gray-950">{u.first_name} {u.last_name}</div>
                                <div className="text-[10px] text-gray-400 font-mono leading-none mt-0.5">{u.email}</div>
                              </td>
                              <td className="py-3 font-mono text-[10px] uppercase font-bold text-[#203180]">
                                {u.role}
                              </td>
                              <td className="py-3 text-gray-500 font-mono text-[10px]">
                                {u.phone || '-'}
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                  u.is_active 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                    : 'bg-red-50 text-red-600 border border-red-200'
                                }`}>
                                  {u.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    if (!isSuperAdmin) {
                                      setErrorMsg('Solo Kenneth o Ingrith pueden editar otros usuarios.');
                                      return;
                                    }
                                    setEditingUser(u);
                                    setEditFirstName(u.first_name);
                                    setEditLastName(u.last_name);
                                    setEditRole(u.role);
                                    setEditPhone(u.phone || '');
                                    setEditIsActive(u.is_active);
                                  }}
                                  className="text-xs text-[#203180] hover:underline font-bold cursor-pointer inline-block"
                                  title="Editar parámetros"
                                >
                                  Editar
                                </button>
                                
                                {!isSeedAdmin && u.id !== currentUser.id && (
                                  <button
                                    onClick={() => {
                                      if (!isSuperAdmin) {
                                        setErrorMsg('Solo Kenneth o Ingrith pueden eliminar otros usuarios.');
                                        return;
                                      }
                                      handleDeleteUser(u.id, `${u.first_name} ${u.last_name}`);
                                    }}
                                    className="text-xs text-[#C80C0C] hover:underline font-bold cursor-pointer inline-block ml-2"
                                    title="Eliminar usuario"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT LOGS BITACORA TAB */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl p-6 border border-[#050507]/10 shadow-sm animate-in fade-in duration-200">
            {/* Filter and search bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#050507]/5">
              <div>
                <h3 className="font-extrabold text-sm text-[#203180]">Bitácora Cronológica de Operaciones</h3>
                <p className="text-[10px] text-gray-400">Historial inviolable de transacciones, accesos y logs de seguridad</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Selector */}
                <select
                  value={actionFilter}
                  onChange={e => setActionFilter(e.target.value)}
                  className="bg-white border border-[#050507]/10 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-600 focus:outline-none focus:border-[#FF7AA6] transition-all min-h-[38px]"
                >
                  <option value="">Todas las Acciones</option>
                  {uniqueActions.map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>

                {/* Input query */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar IP, ID, etc..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-white border border-[#050507]/10 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-[#050507] focus:outline-none focus:border-[#FF7AA6] transition-all min-h-[38px] w-48"
                  />
                </div>
              </div>
            </div>

            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <div className="w-6 h-6 border-2 border-indigo-200 border-t-[#203180] rounded-full animate-spin" />
                <span className="text-xs">Cargando bitácora de auditoría...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-100 rounded-xl">
                <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
                <h4 className="font-bold text-xs text-gray-500">Ningún registro coincide con la búsqueda</h4>
                <p className="text-[10px] text-gray-400 mt-1">Remueva los filtros aplicados para listar todos los logs.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#050507]/5 text-[9px] uppercase tracking-widest text-gray-400 font-extrabold">
                      <th className="py-2.5 px-2">Fecha y Hora</th>
                      <th className="py-2.5 px-2">Acción de Seguridad</th>
                      <th className="py-2.5 px-2">Módulo y Recurso</th>
                      <th className="py-2.5 px-2">IP de Origen</th>
                      <th className="py-2.5 px-2">ID Solicitud</th>
                      <th className="py-2.5 px-2 text-right">Metadata Adjunta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#050507]/5 text-xs text-[#050507]/80">
                    {filteredLogs.map(log => {
                      let badgeStyle = "bg-gray-100 text-gray-600";
                      if (log.action.includes("success") || log.action.includes("create") || log.action.includes("accept")) {
                        badgeStyle = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                      }
                      if (log.action.includes("failed") || log.action.includes("revoke") || log.action.includes("delete")) {
                        badgeStyle = "bg-red-50 text-red-600 border border-red-100";
                      }

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="py-2.5 px-2 text-[10px] text-gray-500 font-mono whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 font-semibold">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${badgeStyle}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-gray-600 font-mono text-[10px]">
                            {log.target_type ? `${log.target_type}:${log.target_id?.substring(0, 8)}` : 'global'}
                          </td>
                          <td className="py-2.5 px-2 text-gray-500 font-mono text-[10px]">
                            {log.ip}
                          </td>
                          <td className="py-2.5 px-2 text-gray-400 font-mono text-[9px]" title={log.request_id}>
                            {log.request_id?.substring(0, 13)}...
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-50 px-1.5 py-1 rounded border border-slate-100 max-w-[240px] inline-block truncate" title={JSON.stringify(log.metadata)}>
                              {JSON.stringify(log.metadata)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: newly generated API KEY (shown only once) */}
      <AnimatePresence>
        {createdKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507]/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-white border border-[#050507]/10 rounded-3xl p-6 shadow-xl relative"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-[#FF7AA6]/10 border border-[#FF7AA6]/20 text-[#FF7AA6] rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-[#203180] uppercase">Guarde su Llave Segura</h3>
                  <p className="text-xs text-[#050507]/60 leading-relaxed">
                    Por regulaciones criptográficas y de privacidad, esta llave se mostrará <span className="text-[#C80C0C] font-extrabold underline">SOLO UNA VEZ</span>. Si la pierde, deberá revocarla y generar otra.
                  </p>
                </div>

                {/* Key block */}
                <div className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 relative">
                  <div className="font-mono text-xs text-[#FF7AA6] break-all text-left select-all pr-8">
                    {createdKey}
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(createdKey, 'key')}
                    className="absolute right-3 top-3 p-1.5 rounded-lg bg-white border border-gray-200 text-[#203180] hover:bg-gray-50 transition-all cursor-pointer"
                    title="Copiar Llave"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Clipboard className="w-4 h-4" />}
                  </button>
                </div>

                {copiedKey && (
                  <span className="text-[10px] text-emerald-500 font-bold">✓ Copiado al portapapeles</span>
                )}

                <div className="w-full pt-4 border-t border-[#050507]/5">
                  <button
                    onClick={() => {
                      setCreatedKey(null);
                      setCopiedKey(false);
                    }}
                    className="w-full btn-primary py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Entendido, la he guardado de forma segura
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Edit CRM User */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507]/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-white border border-[#050507]/10 rounded-2xl p-6 shadow-xl relative"
            >
              <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                <UserCheck className="w-5 h-5 text-[#203180]" />
                <h3 className="font-extrabold text-sm text-[#203180]">Editar Configuración de Usuario</h3>
              </div>

              <form onSubmit={handleUpdateUserSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={e => setEditFirstName(e.target.value)}
                      className="w-full bg-white border border-[#050507]/10 rounded-lg p-2.5 text-xs text-[#050507] focus:outline-none focus:border-[#FF7AA6]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Apellido</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={e => setEditLastName(e.target.value)}
                      className="w-full bg-white border border-[#050507]/10 rounded-lg p-2.5 text-xs text-[#050507] focus:outline-none focus:border-[#FF7AA6]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full bg-white border border-[#050507]/10 rounded-lg p-2.5 text-xs text-[#050507] focus:outline-none focus:border-[#FF7AA6]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Rol CRM</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="w-full bg-white border border-[#050507]/10 rounded-lg p-2.5 text-xs text-[#050507] focus:outline-none focus:border-[#FF7AA6]"
                  >
                    <option value="employee">Vendedor / Empleado (employee)</option>
                    <option value="manager">Gestor / Supervisor (manager)</option>
                    <option value="viewer">Visualizador de Reportes (viewer)</option>
                    <option value="admin">Administrador del Sistema (admin)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <span className="text-xs font-bold text-gray-700">Estado de la cuenta</span>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(!editIsActive)}
                    className="text-[#203180] hover:text-[#FF7AA6] transition-colors cursor-pointer"
                  >
                    {editIsActive ? (
                      <div className="flex items-center gap-1.5 font-bold text-emerald-600 text-xs">
                        <ToggleRight className="w-6 h-6 text-emerald-500" />
                        <span>Activo (Con Acceso)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-bold text-red-500 text-xs">
                        <ToggleLeft className="w-6 h-6 text-gray-300" />
                        <span>Inactivo (Bloqueado)</span>
                      </div>
                    )}
                  </button>
                </div>

                <div className="flex gap-2.5 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 btn-secondary py-2.5 text-xs font-bold uppercase cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-2.5 text-xs font-bold uppercase cursor-pointer text-center text-white"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
