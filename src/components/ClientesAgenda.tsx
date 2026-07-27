import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Mail, 
  Phone, 
  Calendar as CalendarIcon, 
  Search, 
  History, 
  Check, 
  Clock, 
  UserPlus, 
  Edit,
  Trash2,
  Bell,
  Copy,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  FileText,
  X,
  CheckCircle,
  XCircle,
  HelpCircle,
  UserCheck
} from 'lucide-react';
import { Client, SpecialOrder, UserRole } from '../types';

interface ClientesAgendaProps {
  clients: Client[];
  orders: SpecialOrder[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string, mode: 'soft' | 'hard', reason: string) => Promise<{ success: boolean; error?: string; message?: string; activeOrders?: SpecialOrder[] }>;
  onRestoreClient: (id: string) => Promise<{ success: boolean; error?: string }>;
  role: UserRole;
  showAddFormInitially?: boolean;
}

export default function ClientesAgenda({ 
  clients, 
  orders, 
  onAddClient, 
  onUpdateClient, 
  onDeleteClient,
  onRestoreClient,
  role,
  showAddFormInitially = false
}: ClientesAgendaProps) {

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(showAddFormInitially);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Tab/filter state: 'Activos' or 'Eliminados'
  const [activeFilter, setActiveFilter] = useState<'Activos' | 'Eliminados'>('Activos');

  // New Client Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState('');

  // Delete Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft');
  const [deleteReason, setDeleteReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Audit Logs states
  const [clientAuditLogs, setClientAuditLogs] = useState<any[]>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Toast states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | null>(null);

  // Reminder Modal state
  const [reminderClient, setReminderClient] = useState<Client | null>(null);
  const [reminderOrder, setReminderOrder] = useState<SpecialOrder | null>(null);
  const [reminderType, setReminderType] = useState<'pago' | 'entrega'>('pago');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [copiedReminder, setCopiedReminder] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
      setToastType(null);
    }, 4000);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      const updatedClient: Client = {
        id: editId,
        name,
        phone,
        email,
        notes
      };
      onUpdateClient(updatedClient);
      setIsEditing(false);
      setEditId('');
      showToast('Perfil de cliente actualizado correctamente', 'success');
      // update selected client to reflect changes
      if (selectedClient && selectedClient.id === editId) {
        setSelectedClient(updatedClient);
      }
    } else {
      const newClient: Client = {
        id: `CL-0${clients.length + 1}`,
        name,
        phone,
        email,
        notes
      };
      onAddClient(newClient);
      showToast('Nuevo perfil de cliente creado correctamente', 'success');
    }
    setShowAddForm(false);
    
    // Reset Form
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
  };

  const openDeleteModal = (client: Client) => {
    setDeletingClient(client);
    setDeleteMode('soft');
    setDeleteReason('');
    setErrorFeedback(null);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingClient) return;

    if (deleteMode === 'hard' && !deleteReason.trim()) {
      setErrorFeedback('Debes ingresar un motivo para la eliminación permanente.');
      return;
    }

    setIsProcessing(true);
    setErrorFeedback(null);

    try {
      const result = await onDeleteClient(deletingClient.id, deleteMode, deleteReason);
      if (result.success) {
        showToast(
          deleteMode === 'soft' 
            ? 'Cliente enviado a la papelera correctamente (Soft Delete)' 
            : 'Cliente eliminado permanentemente del sistema (Hard Delete)',
          'success'
        );
        setShowDeleteModal(false);
        setDeletingClient(null);
        setSelectedClient(null);
      } else {
        setErrorFeedback(result.message || 'Ocurrió un error al intentar eliminar el cliente.');
      }
    } catch (err: any) {
      setErrorFeedback('Error de comunicación con el servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async (id: string) => {
    setIsProcessing(true);
    try {
      const result = await onRestoreClient(id);
      if (result.success) {
        showToast('Cliente restaurado correctamente', 'success');
        // actualizar cliente seleccionado si corresponde
        if (selectedClient && selectedClient.id === id) {
          setSelectedClient({ ...selectedClient, deleted_at: undefined, deletedby: undefined, deleted_reason: undefined });
        }
      } else {
        showToast('Error al restaurar cliente', 'error');
      }
    } catch (err) {
      showToast('Error de red al restaurar', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchAuditLogs = async (clientId: string) => {
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/audit/clients/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setClientAuditLogs(data);
      }
    } catch (err) {
      console.error("Error loading client audit logs:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const openAuditModal = (clientId: string) => {
    fetchAuditLogs(clientId);
    setShowAuditModal(true);
  };

  const handleStartEdit = (client: Client) => {
    setEditId(client.id);
    setName(client.name);
    setPhone(client.phone);
    setEmail(client.email);
    setNotes(client.notes || '');
    setIsEditing(true);
    setShowAddForm(true);
  };

  const triggerReminder = (client: Client, order: SpecialOrder, type: 'pago' | 'entrega') => {
    setReminderClient(client);
    setReminderOrder(order);
    setReminderType(type);
    setShowReminderModal(true);
  };

  const getReminderTemplate = () => {
    if (!reminderClient || !reminderOrder) return "";
    const pending = reminderOrder.totalCost - reminderOrder.paidAmount;

    if (reminderType === 'pago') {
      return `¡Hola ${reminderClient.name}! Te saludamos del equipo de KEINSHOP ⚡️\n\nQueríamos recordarte que tu pedido especial Shein/Temu ya se encuentra registrado con nosotros. Actualmente presenta un saldo pendiente de *$${pending.toLocaleString('es-CO')} COP* (Abonado: $${reminderOrder.paidAmount.toLocaleString('es-CO')} COP).\n\n¿Nos confirmas si deseas realizar el pago mediante Nequi o Daviplata para agilizar tu despacho? ¡Muchas gracias! 🙌🔥`;
    } else {
      return `¡Hola ${reminderClient.name}! Te saludamos de KEINSHOP ⚡️\n\nTu pedido especial de: "${reminderOrder.itemsText}" tiene programada la fecha estimada de entrega para el *${reminderOrder.dateEstArrival}*.\n\nPor favor, confirma si estarás disponible para recibir el paquete o si prefieres coordinar retiro directo. ¡Que tengas un excelente día! 📦🚀`;
    }
  };

  const handleCopyReminder = () => {
    navigator.clipboard.writeText(getReminderTemplate());
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2000);
  };

  // Filtrar según Pestaña "Activos" o "Eliminados"
  const filteredClients = clients.filter(c => {
    const isDeleted = !!c.deleted_at;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.phone.includes(searchTerm) || 
                          c.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'Eliminados') {
      return isDeleted && matchesSearch;
    } else {
      return !isDeleted && matchesSearch;
    }
  });

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-2xl animate-bounce">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-[#050507]">Clientes & Agenda CRM</h2>
          <p className="text-xs text-gray-500 mt-1">Perfiles de clientes, historial de compras, saldos, gestión de bajas/papelera con auditoría y recordatorios automáticos.</p>
        </div>

        {role !== 'Gestor de Contenido' && (
          <button
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
                setIsEditing(false);
                setEditId('');
                setName('');
                setPhone('');
                setEmail('');
                setNotes('');
              } else {
                setShowAddForm(true);
              }
            }}
            className="bg-[#203180] text-white hover:bg-indigo-950 font-extrabold text-xs py-2.5 px-4 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95 w-full sm:w-auto justify-center"
          >
            <UserPlus className="w-4 h-4" /> Registrar Cliente
          </button>
        )}
      </div>

      {/* Inline register customer form */}
      {showAddForm && (
        <form onSubmit={handleCreateClient} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 animate-in slide-in-from-top duration-200">
          <h3 className="font-black text-gray-900 text-sm">{isEditing ? 'Editar Perfil de Cliente' : 'Registrar Nuevo Perfil de Cliente'}</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Mateo Rodríguez"
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Teléfono / Celular</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+57 312 456 7890"
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="mateo@example.com"
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Notas Administrativas / Tallas / Preferencias</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: Prefiere camisas holgadas talla XL, flete por Coordinadora..."
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setIsEditing(false);
                setEditId('');
                setName('');
                setPhone('');
                setEmail('');
                setNotes('');
              }}
              className="bg-gray-200 text-gray-700 font-bold text-xs py-2 px-4 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#203180] text-white font-extrabold text-xs py-2 px-5 rounded-lg hover:bg-indigo-950"
            >
              {isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
            </button>
          </div>
        </form>
      )}

      {/* Main clients grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: CRM list of clients */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-1 flex flex-col">
          
          {/* Sub-tabs filter (Activos vs Eliminados) */}
          <div className="flex border-b border-gray-100 bg-gray-50/50 p-1.5">
            <button
              onClick={() => {
                setActiveFilter('Activos');
                setSelectedClient(null);
              }}
              className={`flex-1 py-1.5 text-center font-extrabold text-[11px] rounded-md transition-all ${
                activeFilter === 'Activos' 
                  ? 'bg-white text-[#203180] shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Clientes Activos
            </button>
            <button
              onClick={() => {
                setActiveFilter('Eliminados');
                setSelectedClient(null);
              }}
              className={`flex-1 py-1.5 text-center font-extrabold text-[11px] rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeFilter === 'Eliminados' 
                  ? 'bg-red-50 text-red-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              Bajas / Papelera
            </button>
          </div>

          <div className="p-4 border-b border-gray-150">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={activeFilter === 'Eliminados' ? "Buscar en bajas..." : "Buscar clientes..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No se encontraron clientes {activeFilter === 'Eliminados' ? 'en papelera' : 'activos'}.
              </div>
            ) : (
              filteredClients.map(client => {
                const activeClientOrders = orders.filter(o => o.clientId === client.id);
                const pendingOrders = activeClientOrders.filter(o => o.status !== 'Entregado' && o.status !== 'Completado' && o.status !== 'Cancelado');
                
                return (
                  <div 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-start ${
                      selectedClient?.id === client.id 
                        ? activeFilter === 'Eliminados' 
                          ? 'bg-red-50/50 border-r-4 border-red-500' 
                          : 'bg-indigo-50/55 border-r-4 border-[#203180]'
                        : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-gray-900 text-sm">{client.name}</h4>
                        {client.deleted_at && (
                          <span className="bg-red-100 text-red-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">Baja</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#FF7AA6]" /> {client.phone}
                      </p>
                    </div>

                    {pendingOrders.length > 0 && !client.deleted_at && (
                      <span className="bg-red-100 text-[#C80C0C] font-extrabold font-mono text-[10px] px-2 py-0.5 rounded-full">
                        {pendingOrders.length} activos
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Client Details Sheet */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 lg:col-span-2 min-h-[300px]">
          {selectedClient ? (
            <div className="space-y-6 animate-fade-in">
              
              {/* Informative block for soft deleted clients */}
              {selectedClient.deleted_at && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-pulse">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs text-amber-900">
                      <p className="font-extrabold uppercase">Este perfil de cliente está inactivo (Baja Temporal)</p>
                      <p className="font-medium">Eliminado por <strong>{selectedClient.deletedby || 'admin_ken'}</strong> el {new Date(selectedClient.deleted_at).toLocaleString()}</p>
                      {selectedClient.deleted_reason && <p className="italic text-amber-800">"Motivo: {selectedClient.deleted_reason}"</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(selectedClient.id)}
                    className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg shadow-sm transition-all shrink-0 self-end sm:self-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restaurar Perfil
                  </button>
                </div>
              )}

              {/* Header profile details */}
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900">{selectedClient.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-[#AAAAAA] font-mono">ID CRM: {selectedClient.id}</p>
                    <button
                      onClick={() => openAuditModal(selectedClient.id)}
                      className="text-[#203180] hover:underline text-[10px] font-bold uppercase flex items-center gap-1"
                    >
                      <History className="w-3 h-3" /> Ver Auditoría
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[#203180]" /> {selectedClient.phone}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-[#203180]" /> {selectedClient.email}</span>
                  </div>
                </div>

                {!selectedClient.deleted_at && role !== 'Gestor de Contenido' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEdit(selectedClient)}
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-[#203180] rounded-lg transition-colors"
                      title="Editar cliente"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(selectedClient)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-[#C80C0C] rounded-lg transition-colors"
                      title="Eliminar cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Administrative Notes */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <h4 className="text-xs font-bold uppercase text-[#203180] tracking-wider mb-1.5">Tallas & Notas del Cliente</h4>
                <p className="text-xs text-gray-700 leading-relaxed font-semibold">
                  {selectedClient.notes || "Sin especificaciones especiales cargadas."}
                </p>
              </div>

              {/* Purchase and Special Orders History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Historial de Pedidos Especiales (Shein/Temu)</h4>
                
                {orders.filter(o => o.clientId === selectedClient.id).length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">Este cliente no registra pedidos importados.</p>
                ) : (
                  <div className="space-y-3">
                    {orders.filter(o => o.clientId === selectedClient.id).map(order => {
                      const isUnpaid = order.status !== 'Completado' && order.status !== 'Entregado';
                      
                      return (
                        <div key={order.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-[#203180]">{order.id}</span>
                              <span className="text-[10px] text-gray-400 font-mono">Agendado: {order.dateEstArrival}</span>
                            </div>
                            <p className="text-gray-800 font-medium">{order.itemsText}</p>
                            <div className="text-[10px] text-gray-500 font-mono">
                              Costo de venta: ${order.totalCost.toLocaleString('es-CO')} COP | Abonado: ${order.paidAmount.toLocaleString('es-CO')} COP
                            </div>
                          </div>

                          {/* Quick interactions */}
                          <div className="flex flex-row sm:flex-col items-end gap-2 shrink-0">
                            <span className={`px-2.5 py-1 rounded font-black text-[10px] tracking-wider uppercase block ${
                              order.status === 'Completado' || order.status === 'Entregado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-[#C80C0C]'
                            }`}>
                              {order.status}
                            </span>
                            
                            {isUnpaid && !selectedClient.deleted_at && (
                              <button
                                onClick={() => triggerReminder(selectedClient, order, 'pago')}
                                className="bg-[#FF7AA6]/20 hover:bg-[#FF7AA6]/35 text-[#FF7AA6] font-bold text-[10px] py-1 px-2.5 rounded border border-[#FF7AA6]/30 flex items-center gap-1 transition-all"
                              >
                                <MessageSquare className="w-3 h-3" /> Cobrar Nequi
                              </button>
                            )}

                            {!isUnpaid && !selectedClient.deleted_at && (
                              <button
                                onClick={() => triggerReminder(selectedClient, order, 'entrega')}
                                className="bg-indigo-50 hover:bg-indigo-100 text-[#203180] font-bold text-[10px] py-1 px-2.5 rounded border border-indigo-200 flex items-center gap-1 transition-all"
                              >
                                <MessageSquare className="w-3 h-3" /> Avisar Entrega
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full py-20 text-gray-400">
              <UserPlus className="w-14 h-14 opacity-20 mb-3" />
              <h4 className="font-bold text-gray-700">Explorador de Clientes CRM</h4>
              <p className="text-xs max-w-xs mt-1">Selecciona un perfil a la izquierda para visualizar notas de talle, preferencias, historial y disparar recordatorios de cobro o administrar el estado de baja del cliente.</p>
            </div>
          )}
        </div>

      </div>

      {/* Advanced Delete Modal */}
      {showDeleteModal && deletingClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 text-[#050507]">
            
            <div className="p-4 bg-red-600 text-white flex justify-between items-center">
              <h4 className="font-bold text-sm flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Desactivación / Eliminación de Perfil de Cliente
              </h4>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="text-white hover:text-gray-200 font-bold text-sm bg-white/15 px-2 py-0.5 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 border p-3 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {deletingClient.id}
                </div>
                <div>
                  <h5 className="font-black text-gray-900 text-sm">{deletingClient.name}</h5>
                  <p className="text-xs text-gray-400 font-mono">{deletingClient.phone} | {deletingClient.email}</p>
                </div>
              </div>

              {/* Dependencies Check block */}
              {(() => {
                const activeClientOrders = orders.filter(o => o.clientId === deletingClient.id);
                const pendingOrders = activeClientOrders.filter(o => o.status !== 'Entregado' && o.status !== 'Completado' && o.status !== 'Cancelado');
                const isHardBlock = deleteMode === 'hard' && pendingOrders.length > 0;
                
                return (
                  <div className="space-y-3">
                    <div className="border border-gray-150 rounded-lg p-3 bg-indigo-50/20 text-xs">
                      <p className="font-extrabold text-gray-700 flex items-center gap-1.5 mb-1.5">
                        <CalendarIcon className="w-4 h-4 text-[#203180]" /> Resumen de Dependencias
                      </p>
                      <ul className="space-y-1 font-medium text-gray-600">
                        <li className="flex justify-between">
                          <span>Pedidos especiales totales:</span>
                          <span className="font-bold">{activeClientOrders.length}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Pedidos activos pendientes de cobro:</span>
                          <span className={`font-bold ${pendingOrders.length > 0 ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>
                            {pendingOrders.length}
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* Mode Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase text-gray-500">Modo de Eliminación</label>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteMode('soft');
                            setErrorFeedback(null);
                          }}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            deleteMode === 'soft' 
                              ? 'border-[#203180] bg-indigo-50/30' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-bold text-[#203180] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Temporal (Soft)
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">Oculta de la lista activa, se puede restaurar. Conserva el historial.</p>
                        </button>

                        <button
                          type="button"
                          disabled={role !== 'Admin'}
                          onClick={() => setDeleteMode('hard')}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            role !== 'Admin' ? 'opacity-50 cursor-not-allowed' : ''
                          } ${
                            deleteMode === 'hard' 
                              ? 'border-red-600 bg-red-50/10' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          title={role !== 'Admin' ? "Solo administradores pueden realizar eliminación permanente." : ""}
                        >
                          <p className="font-bold text-red-600 flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> Permanente (Hard)
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">Elimina permanentemente. Solo administradores. Bloqueado si hay pedidos activos.</p>
                        </button>
                      </div>
                    </div>

                    {/* Blocking Alert if hard mode and has active orders */}
                    {isHardBlock && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-800 space-y-2">
                        <p className="font-black flex items-center gap-1">
                          <XCircle className="w-4 h-4 text-red-600" /> BLOQUEADO POR DEPENDENCIAS CRÍTICAS
                        </p>
                        <p className="font-semibold leading-relaxed">
                          Este cliente tiene {pendingOrders.length} pedidos activos pendientes. La eliminación permanente está prohibida bajo estas condiciones. Debe completar o cancelar los pedidos antes de ejecutar el borrado irreversible.
                        </p>
                        <div className="bg-white/80 p-2 rounded border border-red-100 max-h-24 overflow-y-auto space-y-1">
                          {pendingOrders.map(o => (
                            <div key={o.id} className="font-mono text-[9px] flex justify-between">
                              <span className="font-bold">{o.id}</span>
                              <span className="truncate max-w-[200px]">{o.itemsText}</span>
                              <span className="text-red-700 font-extrabold">{o.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reason input field */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-gray-500">
                        Motivo de eliminación {deleteMode === 'hard' ? '(Requerido)' : '(Opcional)'}
                      </label>
                      <input
                        type="text"
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        required={deleteMode === 'hard'}
                        placeholder={deleteMode === 'hard' ? "Ej: Perfil duplicado, datos erróneos..." : "No es cliente activo / baja voluntaria"}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                );
              })()}

              {errorFeedback && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{errorFeedback}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="bg-gray-200 text-gray-700 font-bold text-xs py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              
              {(() => {
                const activeClientOrders = orders.filter(o => o.clientId === deletingClient.id);
                const pendingOrders = activeClientOrders.filter(o => o.status !== 'Entregado' && o.status !== 'Completado' && o.status !== 'Cancelado');
                const isHardBlock = deleteMode === 'hard' && pendingOrders.length > 0;

                return (
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isProcessing || isHardBlock}
                    className={`font-extrabold text-xs py-2 px-5 rounded-lg flex items-center gap-1.5 transition-all text-white ${
                      isHardBlock 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : deleteMode === 'hard' 
                          ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                          : 'bg-[#203180] hover:bg-indigo-950'
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {isProcessing ? 'Procesando...' : deleteMode === 'hard' ? 'Eliminar Permanentemente' : 'Desactivar Temporalmente'}
                  </button>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 text-[#050507]">
            
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold text-sm flex items-center gap-1.5">
                <History className="w-4 h-4 text-green-400" /> Registro de Auditoría de Cliente
              </h4>
              <button 
                onClick={() => setShowAuditModal(false)}
                className="text-white hover:text-gray-200 font-bold text-sm bg-white/15 px-2 py-0.5 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              {loadingAudit ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-xs mt-2 font-bold">Cargando bitácora de auditoría...</p>
                </div>
              ) : clientAuditLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs font-semibold">
                  No se registran bitácoras de auditoría para este perfil de cliente.
                </div>
              ) : (
                <div className="space-y-4">
                  {clientAuditLogs.map((log: any) => (
                    <div key={log.log_id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-black uppercase text-[9px] px-1.5 py-0.5 rounded ${
                            log.action === 'create' ? 'bg-green-100 text-green-700' :
                            log.action === 'delete' ? 'bg-red-100 text-red-700' :
                            log.action === 'restore' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {log.action} {log.mode ? `(${log.mode})` : ''}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="font-bold text-gray-800">{log.reason}</p>
                        {log.metadata?.client_snapshot && (
                          <div className="mt-2 bg-white p-2 rounded border font-mono text-[9px] text-gray-600 max-h-20 overflow-y-auto">
                            <strong>Snapshot:</strong> {JSON.stringify(log.metadata.client_snapshot)}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-[10px] text-gray-500 font-mono">
                        Usuario: <strong>{log.user_id}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="bg-slate-900 text-white font-bold text-xs py-2 px-5 rounded-lg hover:bg-slate-800"
              >
                Cerrar Auditoría
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Reminder Text Template copy Modal */}
      {showReminderModal && reminderClient && reminderOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 text-[#050507]">
            
            <div className="p-4 bg-[#203180] text-white flex justify-between items-center">
              <h4 className="font-bold text-sm flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#FF7AA6]" /> Recordatorio Automático WhatsApp
              </h4>
              <button 
                onClick={() => setShowReminderModal(false)}
                className="text-white hover:text-gray-200 font-bold text-sm bg-white/15 px-2.5 py-0.5 rounded"
              >
                Cerrar
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center space-x-3 text-xs bg-gray-50 p-3 rounded-lg border">
                <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  WA
                </div>
                <div>
                  <h5 className="font-bold text-gray-900">{reminderClient.name}</h5>
                  <p className="text-[10px] text-gray-400 font-mono">Disparando recordatorio para pedido {reminderOrder.id}</p>
                </div>
              </div>

              {/* Selector template */}
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setReminderType('pago')}
                  className={`flex-1 py-2 rounded-lg font-bold border transition-all ${
                    reminderType === 'pago' ? 'bg-[#FF7AA6] text-white border-[#FF7AA6]' : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  Mensaje de Pago / Abono
                </button>
                <button
                  type="button"
                  onClick={() => setReminderType('entrega')}
                  className={`flex-1 py-2 rounded-lg font-bold border transition-all ${
                    reminderType === 'entrega' ? 'bg-[#203180] text-white border-[#203180]' : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  Mensaje de Entrega
                </button>
              </div>

              {/* Textarea template */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Vista Previa de Mensaje</span>
                <textarea
                  readOnly
                  rows={8}
                  value={getReminderTemplate()}
                  className="w-full p-3 bg-gray-50 rounded-lg text-xs font-mono text-gray-700 border border-gray-200 focus:outline-none focus:ring-0 leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end space-x-2">
              <button
                onClick={() => setShowReminderModal(false)}
                className="bg-gray-200 text-gray-700 font-bold text-xs py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Cerrar
              </button>
              <button
                onClick={handleCopyReminder}
                className="bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs py-2 px-5 rounded-lg flex items-center gap-1 transition-all"
              >
                {copiedReminder ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedReminder ? '¡Copiado!' : 'Copiar para WhatsApp'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
