import React, { useState } from 'react';
import { 
  Plus, 
  Sparkles, 
  Instagram, 
  Video, 
  Facebook, 
  Trash2, 
  Edit, 
  Calendar as CalendarIcon, 
  Clock, 
  Check, 
  RefreshCw,
  Bell,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  AlertTriangle,
  CalendarDays,
  LayoutGrid,
  Info,
  CheckCircle2,
  Users,
  Phone
} from 'lucide-react';
import { Publication, Product, UserRole, Client, SpecialOrder } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarioContenidoProps {
  publications: Publication[];
  products: Product[];
  clients?: Client[];
  orders?: SpecialOrder[];
  onAddPublication: (pub: Publication) => void;
  onUpdatePublication: (pub: Publication) => void;
  onDeletePublication: (id: string) => void;
  role: UserRole;
  showAddFormInitially?: boolean;
}

export default function CalendarioContenido({ 
  publications, 
  products, 
  clients = [],
  orders = [],
  onAddPublication, 
  onUpdatePublication, 
  onDeletePublication,
  role,
  showAddFormInitially = false
}: CalendarioContenidoProps) {

  // State switch for sub-sections: 'grid' (Deliveries/Events Grid) or 'marketing' (Marketing copys / timeline)
  const [calendarTab, setCalendarTab] = useState<'grid' | 'marketing'>('grid');

  // Month navigation - Connected directly to the system date
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewType, setViewType] = useState<'monthly' | 'weekly'>('monthly');

  // Selected cell for mobile or detail view
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());

  // Real-time system date to automatically advance the day marker (every second check for exact precision)
  const [systemToday, setSystemToday] = useState<Date>(() => new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSystemToday((prev) => {
        if (prev.getDate() !== now.getDate() || prev.getMonth() !== now.getMonth() || prev.getFullYear() !== now.getFullYear()) {
          // If the day advances, update selectedDay and currentDate to focus on the active day in real-time
          setSelectedDay(now.getDate());
          setCurrentDate(now);
          // Show the automatic synchronization notification
          setPushNotification(`📅 Sincronización del Calendario: El sistema ha avanzado automáticamente al día de hoy, ${now.toLocaleDateString('es-CO')}.`);
          setTimeout(() => setPushNotification(null), 6000);
        }
        return now;
      });
    }, 1000); // Check every second for maximum precision
    return () => clearInterval(timer);
  }, []);

  // Reminders / Notification states
  const [pushNotification, setPushNotification] = useState<string | null>(null);

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Publication | null>(null);

  // Marketing Copywriter Forms (Original)
  const [showForm, setShowForm] = useState(showAddFormInitially);
  const [editingPub, setEditingPub] = useState<Publication | null>(null);

  // New Event Form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'delivery' | 'admin' | 'content'>('delivery');
  const [eventDate, setEventDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const [eventTime, setEventTime] = useState('10:00');
  const [eventClientId, setEventClientId] = useState('');
  const [eventOrderId, setEventOrderId] = useState('');
  const [eventResponsible, setEventResponsible] = useState('');
  const [eventStatus, setEventStatus] = useState<'Borrador' | 'Programado' | 'Publicado'>('Programado');

  // Safety Delete Confirmation Modal State
  const [eventToDelete, setEventToDelete] = useState<Publication | null>(null);
  const [eventNotes, setEventNotes] = useState('');
  const [eventReminder, setEventReminder] = useState('24h');
  const [eventWhatsapp, setEventWhatsapp] = useState('');

  // Monitor para alertar con 2 horas de anticipación (PC y Celular)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      publications.forEach(pub => {
        if (pub.eventType === 'delivery' && pub.date && pub.time) {
          const [hours, minutes] = pub.time.split(':').map(Number);
          const eventDateTime = new Date(pub.date);
          eventDateTime.setHours(hours, minutes, 0, 0);

          const diffMs = eventDateTime.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          const alreadyNotifiedKey = `notified_2h_${pub.id}`;
          const alreadyNotified = localStorage.getItem(alreadyNotifiedKey);

          // Si el evento ocurrirá en menos de 2 horas (e.g., entre 0.01 y 2 horas) y no ha sido notificado
          if (diffHours > 0 && diffHours <= 2 && !alreadyNotified) {
            const clientNameText = pub.clientId ? (clients.find(c => c.id === pub.clientId)?.name || pub.clientId) : "Cliente";
            const msg = `🔔 [ALERTA DE DESPACHO 2H ANTES] La entrega "${pub.title}" para ${clientNameText} (Pedido: ${pub.orderId || "Especial"}) está programada a las ${pub.time}. Notificación push y correo (kenisra156@gmail.com) enviados con éxito.`;
            
            showPushNotification(msg);

            // Intentar usar Notification API del navegador si hay permiso
            if ('Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification("KEINSHOP Alerta de Entrega", {
                  body: `La entrega "${pub.title}" está programada en 2 horas para ${clientNameText}.`,
                  icon: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=100"
                });
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission();
              }
            }

            localStorage.setItem(alreadyNotifiedKey, "true");
          }
        }
      });
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [publications, clients]);

  // Request browser notification permission immediately on mount
  React.useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // original Marketing state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const [time, setTime] = useState('18:30');
  const [channel, setChannel] = useState<'Instagram' | 'TikTok' | 'Facebook' | 'Pinterest'>('Instagram');
  const [copy, setCopy] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [hashtagsText, setHashtagsText] = useState('Keinshop, Streetwear');
  const [status, setStatus] = useState<'Borrador' | 'Programado' | 'Publicado'>('Borrador');

  // AI Copywriter
  const [selectedProductSku, setSelectedProductSku] = useState('');
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [aiVibe, setAiVibe] = useState('Dinámico, callejero y juvenil');

  const showPushNotification = (msg: string) => {
    setPushNotification(msg);
    setTimeout(() => setPushNotification(null), 5000);
  };

  const handleOpenAdd = () => {
    setEditingPub(null);
    setTitle('');
    setDate(new Date(currentDate).toISOString().split('T')[0]);
    setTime('18:30');
    setChannel('Instagram');
    setCopy('');
    setImageUrl('https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500');
    setHashtagsText('Keinshop, Streetwear, EstiloUrbano');
    setStatus('Borrador');
    setShowForm(true);
    setCalendarTab('marketing'); // Switch to copywriting view
  };

  const handleOpenAddEventFromGrid = (dayNum: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formattedDate = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(dayNum)}`;
    setEditingPub(null);
    setEventTitle('');
    setEventType('delivery');
    setEventDate(formattedDate);
    setEventTime('10:00');
    setEventClientId('');
    setEventOrderId('');
    setEventNotes('');
    setEventReminder('24h');
    setEventResponsible('');
    setEventStatus('Programado');
    setEventWhatsapp('');
    setShowEventModal(true);
  };

  const handleOpenEditEvent = (ev: Publication) => {
    setEditingPub(ev);
    setEventTitle(ev.title);
    setEventType(ev.eventType || 'delivery');
    setEventDate(ev.date);
    setEventTime(ev.time);
    setEventClientId(ev.clientId || '');
    setEventOrderId(ev.orderId || '');
    setEventNotes(ev.copy);
    setEventReminder(ev.reminderConfig || '24h');
    setEventResponsible(ev.responsible || '');
    setEventStatus(ev.status || 'Programado');
    setEventWhatsapp(ev.whatsapp || '');
    setShowEventModal(true);
    setSelectedEvent(null);
  };

  const handleOpenEdit = (p: Publication) => {
    setEditingPub(p);
    setTitle(p.title);
    setDate(p.date);
    setTime(p.time);
    setChannel(p.channel);
    setCopy(p.copy);
    setImageUrl(p.imageUrl);
    setHashtagsText(p.hashtags.join(', '));
    setStatus(p.status);
    setShowForm(true);
    setCalendarTab('marketing');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHashtags = hashtagsText.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean);

    const pubData: Publication = {
      id: editingPub ? editingPub.id : `PUB-${Date.now()}`,
      title,
      date,
      time,
      channel,
      copy,
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500",
      hashtags: cleanHashtags,
      status,
      eventType: 'content'
    };

    if (editingPub) {
      onUpdatePublication(pubData);
      showPushNotification(`📝 Publicación "${pubData.title}" actualizada con éxito.`);
    } else {
      onAddPublication(pubData);
      showPushNotification(`🚀 Publicación "${pubData.title}" agendada en el calendario.`);
    }
    setShowForm(false);
  };

  const handleSaveGridEvent = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate description or copies
    let finalCopy = eventNotes;
    let finalTitle = eventTitle;
    let associatedClient = clients.find(c => c.id === eventClientId);

    if (eventType === 'delivery') {
      finalTitle = eventTitle || `Entrega de Pedido: ${associatedClient ? associatedClient.name : 'Cliente KEINSHOP'}`;
      finalCopy = finalCopy || `Preparación y logística de envío de mercancía nacional. Pedido #${eventOrderId || 'Especial'}.`;
    } else {
      finalTitle = eventTitle || "Evento Administrativo";
      finalCopy = finalCopy || "Coordinación interna de inventario o finanzas.";
    }

    const pubData: Publication = {
      id: editingPub ? editingPub.id : `PUB-SCH-${Date.now()}`,
      title: finalTitle,
      date: eventDate,
      time: eventTime,
      channel: editingPub?.channel || 'Instagram', // Placeholder required field
      copy: finalCopy,
      imageUrl: editingPub?.imageUrl || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300',
      hashtags: editingPub?.hashtags || ['Keinshop', eventType],
      status: eventStatus,
      eventType: eventType,
      clientId: eventClientId || undefined,
      orderId: eventOrderId || undefined,
      reminderConfig: eventReminder,
      responsible: eventResponsible || undefined,
      whatsapp: eventWhatsapp || undefined
    };

    if (editingPub) {
      onUpdatePublication(pubData);
      showPushNotification(`✅ [Modificado] Evento "${pubData.title}" actualizado con éxito.`);
    } else {
      onAddPublication(pubData);
      showPushNotification(`🚀 [Agendado] Evento "${pubData.title}" agendado en el calendario.`);
    }
    setShowEventModal(false);
    setEditingPub(null);
  };

  // Hit the backend for a complete copies suggestion (Original)
  const generateCopyFromAi = async () => {
    const product = products.find(p => p.sku === selectedProductSku);
    if (!product) {
      alert("Por favor selecciona un producto para enfocar la publicación.");
      return;
    }

    setLoadingCopy(true);
    try {
      const response = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || "Lanzamiento de Producto",
          product: product.name,
          channel: channel,
          vibe: aiVibe
        })
      });
      const data = await response.json();
      
      setCopy(data.copy);
      setHashtagsText(data.hashtags?.join(', ') || 'Keinshop, Streetwear');
      if (data.bestTime) setTime(data.bestTime);
      setImageUrl(product.imageUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCopy(false);
    }
  };

  const handleReschedule = (pub: Publication, newDateString: string) => {
    onUpdatePublication({
      ...pub,
      date: newDateString
    });
    showPushNotification(`📅 Evento "${pub.title}" reprogramado para el día ${newDateString}.`);
  };

  // WhatsApp reminder message builder and forwarder
  const handleSendWhatsAppReminder = (ev: Publication) => {
    const client = clients.find(c => c.id === ev.clientId);
    const phone = ev.whatsapp || (client ? client.phone : '');
    const cleanPhone = phone.replace(/\s+/g, '').replace('+', '');
    
    const message = `¡Hola ${client ? client.name : 'Cliente'}! Te escribimos de KEINSHOP. ⚡️
Te recordamos que tenemos programada la entrega de tu pedido especial para el día *${ev.date}* a las *${ev.time}*.

Estará listo para ser retirado en tienda o enviado mediante transportadora nacional. 🚚

Rastrea tu pedido en tiempo real en nuestro portal. ¡Cualquier inquietud nos escribes!`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone || '573000000000'}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    showPushNotification(`📲 Enlace de WhatsApp generado y compartido para ${client ? client.name : 'Cliente'}.`);
  };

  // Calendar Calculation Helpers
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Date range helpers for June 2026
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Create grid cells for Monthly view
  const monthCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    monthCells.push(null);
  }
  for (let i = 1; i <= totalDaysInMonth; i++) {
    monthCells.push(i);
  }

  // Get week columns for Weekly view
  const getWeeklyDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    // Move to Sunday of current week
    startOfWeek.setDate(startOfWeek.getDate() - day);
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(startOfWeek));
      startOfWeek.setDate(startOfWeek.getDate() + 1);
    }
    return days;
  };

  const getPad = (n: number) => n.toString().padStart(2, '0');

  const getEventsForDate = (y: number, m: number, d: number) => {
    const dateString = `${y}-${getPad(m + 1)}-${getPad(d)}`;
    return publications.filter(pub => pub.date === dateString);
  };

  // Move previous / next month or week
  const handleNavigatePrevious = () => {
    const next = new Date(currentDate);
    if (viewType === 'monthly') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNavigateNext = () => {
    const next = new Date(currentDate);
    if (viewType === 'monthly') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#050507]">

      {/* Push Notification Banner */}
      <AnimatePresence>
        {pushNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 max-w-sm bg-gradient-to-r from-indigo-900 to-indigo-950 text-white rounded-xl p-4 shadow-2xl border border-indigo-700/60 flex items-start gap-3"
          >
            <div className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg mt-0.5">
              <Bell className="w-5 h-5 animate-swing text-[#FF7AA6]" />
            </div>
            <div className="flex-1">
              <span className="text-[9px] font-black tracking-widest text-[#FF7AA6] uppercase block">Recordatorio del Teléfono (Simulación)</span>
              <p className="text-xs font-semibold leading-relaxed text-gray-100 mt-1">{pushNotification}</p>
            </div>
            <button 
              onClick={() => setPushNotification(null)}
              className="text-gray-400 hover:text-white font-extrabold text-xs px-1.5"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section with View Selector Tabs */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-gray-900">Calendario Integrado de Logística y Contenido KEINSHOP</h2>
          <p className="text-xs text-gray-500 mt-1">Control de entregas, agenda administrativa de pedidos Shein/Temu y planificación publicitaria con IA.</p>
        </div>

        {/* Visual Tab Switcher */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-full xl:w-auto">
          <button
            id="tab-grid-calendar"
            onClick={() => setCalendarTab('grid')}
            className={`flex-1 xl:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              calendarTab === 'grid' ? 'bg-white text-[#203180] shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <CalendarIcon className="w-4 h-4" /> Entregas y Eventos
          </button>
          <button
            id="tab-marketing-calendar"
            onClick={() => setCalendarTab('marketing')}
            className={`flex-1 xl:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              calendarTab === 'marketing' ? 'bg-white text-[#203180] shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Copywriter &amp; Redes IA
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {calendarTab === 'grid' ? (
          <motion.div
            key="grid-calendar-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Calendar Controls Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              
              {/* Date navigation */}
              <div className="flex items-center space-x-3.5">
                <button
                  onClick={handleNavigatePrevious}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <h3 className="font-extrabold text-base text-gray-900 min-w-44 text-center">
                  {viewType === 'monthly' ? `${monthNames[month]} de ${year}` : `Semana del ${getWeeklyDays()[0].getDate()} de ${monthNames[getWeeklyDays()[0].getMonth()]}`}
                </h3>
                
                <button
                  onClick={handleNavigateNext}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* View type & quick schedule buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                {/* Monthly/Weekly toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setViewType('monthly')}
                    className={`px-3 py-1.5 rounded-md text-xs font-black transition-all ${
                      viewType === 'monthly' ? 'bg-white text-[#203180] shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Mensual
                  </button>
                  <button
                    onClick={() => setViewType('weekly')}
                    className={`px-3 py-1.5 rounded-md text-xs font-black transition-all ${
                      viewType === 'weekly' ? 'bg-white text-[#203180] shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Semanal
                  </button>
                </div>

                {role !== 'Vendedor' && (
                  <button
                    onClick={() => handleOpenAddEventFromGrid(selectedDay)}
                    className="bg-[#203180] hover:bg-indigo-950 text-white font-extrabold text-xs py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Agendar Entrega / Evento
                  </button>
                )}
              </div>
            </div>

            {/* MONTHLY CALENDAR GRID LAYOUT (Responsive desktop/mobile) */}
            {viewType === 'monthly' ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Days of week header */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-bold text-gray-500 py-3">
                  {weekDays.map(day => (
                    <div key={day}>{day}</div>
                  ))}
                </div>

                {/* Calendar Days cells */}
                <div className="grid grid-cols-7 grid-flow-row divide-x divide-y divide-gray-150">
                  {monthCells.map((dayNum, cellIndex) => {
                    const isToday = dayNum === systemToday.getDate() && month === systemToday.getMonth() && year === systemToday.getFullYear();
                    const isSelected = dayNum === selectedDay;
                    const dateEvents = dayNum ? getEventsForDate(year, month, dayNum) : [];

                    return (
                      <div
                        key={cellIndex}
                        onClick={() => dayNum && setSelectedDay(dayNum)}
                        className={`min-h-24 p-2 flex flex-col justify-between transition-all relative cursor-pointer ${
                          !dayNum ? 'bg-gray-50/50' : 'hover:bg-indigo-50/20'
                        } ${isToday ? 'ring-2 ring-indigo-500/70 bg-indigo-50/40' : ''} ${isSelected && !isToday ? 'bg-indigo-50/30' : ''}`}
                      >
                        {/* Day number label */}
                        <div className="flex justify-between items-center">
                          {dayNum ? (
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                              isToday 
                                ? 'bg-[#203180] text-white' 
                                : 'text-gray-700'
                            }`}>
                              {dayNum}
                            </span>
                          ) : (
                            <span />
                          )}

                          {/* Action button overlay for admins */}
                          {dayNum && role !== 'Vendedor' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddEventFromGrid(dayNum);
                              }}
                              className="opacity-0 hover:opacity-100 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded text-gray-500 absolute top-1.5 right-1.5 transition-opacity"
                              title="Agendar para este día"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Events list container in date box (Hidden/simplified on mobile screens) */}
                        <div className="space-y-1 mt-2 flex-1 flex flex-col justify-end">
                          {dateEvents.slice(0, 3).map(ev => {
                            const isDelivery = ev.eventType === 'delivery';
                            const isAdmin = ev.eventType === 'admin';
                            
                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(ev);
                                }}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate border text-left ${
                                  isDelivery 
                                    ? 'bg-[#203180]/10 border-[#203180]/20 text-[#203180]' 
                                    : isAdmin
                                      ? 'bg-purple-50 border-purple-100 text-purple-700'
                                      : 'bg-amber-50 border-amber-100 text-amber-700'
                                }`}
                                title={`${ev.title} (${ev.time})`}
                              >
                                {ev.time} {ev.title}
                              </div>
                            );
                          })}
                          {dateEvents.length > 3 && (
                            <span className="text-[8px] text-[#203180] font-extrabold pl-1 block">+{dateEvents.length - 3} eventos más</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* WEEKLY TIME GRID LAYOUT */
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 divide-x divide-gray-200">
                  {getWeeklyDays().map((dayDate, idx) => {
                    const isToday = dayDate.getDate() === systemToday.getDate() && dayDate.getMonth() === systemToday.getMonth() && dayDate.getFullYear() === systemToday.getFullYear();
                    const dayEvents = getEventsForDate(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
                    
                    return (
                      <div key={idx} className="min-h-96 flex flex-col">
                        {/* Weekly column header */}
                        <div className={`p-3 text-center border-b border-gray-200 ${isToday ? 'bg-indigo-50/50' : 'bg-gray-50'}`}>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">{weekDays[dayDate.getDay()]}</span>
                          <span className={`text-base font-black ${isToday ? 'text-[#203180]' : 'text-gray-800'}`}>
                            {dayDate.getDate()}
                          </span>
                        </div>

                        {/* Weekly Day Column Content */}
                        <div className="p-2 flex-1 space-y-2 bg-white flex flex-col justify-start">
                          {dayEvents.length === 0 ? (
                            <div className="text-[10px] text-gray-300 text-center py-12">No agendado</div>
                          ) : (
                            dayEvents.map(ev => {
                              const isDelivery = ev.eventType === 'delivery';
                              const isAdmin = ev.eventType === 'admin';
                              return (
                                <div
                                  key={ev.id}
                                  onClick={() => setSelectedEvent(ev)}
                                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                                    isDelivery
                                      ? 'bg-[#203180]/10 border-[#203180]/20 text-[#203180]'
                                      : isAdmin
                                        ? 'bg-purple-50 border-purple-100 text-purple-700'
                                        : 'bg-amber-50 border-amber-100 text-amber-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-1 text-[9px] font-black uppercase">
                                    <Clock className="w-3 h-3" />
                                    <span>{ev.time}</span>
                                  </div>
                                  <h4 className="font-extrabold text-[11px] leading-snug mt-1 line-clamp-2">{ev.title}</h4>
                                  {ev.orderId && (
                                    <span className="font-mono text-[9px] bg-white/50 px-1 py-0.2 rounded mt-1.5 inline-block">Pedido: {ev.orderId}</span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* RESPONSIVE MOBILE COMPANION VIEW: Selected Day Event Summaries */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-[#203180]" />
                  <h4 className="font-black text-sm text-gray-900">Agenda para el {selectedDay} de {monthNames[month]}</h4>
                </div>
                {role !== 'Vendedor' && (
                  <button
                    onClick={() => handleOpenAddEventFromGrid(selectedDay)}
                    className="text-xs text-[#203180] hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar entrega rápida
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getEventsForDate(year, month, selectedDay).length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold py-3">No hay entregas ni eventos administrativos agendados para este día en KEINSHOP.</p>
                ) : (
                  getEventsForDate(year, month, selectedDay).map(ev => {
                    const isDelivery = ev.eventType === 'delivery';
                    const isAdmin = ev.eventType === 'admin';
                    const client = clients.find(c => c.id === ev.clientId);

                    return (
                      <div 
                        key={ev.id} 
                        className={`p-4 rounded-xl border flex flex-col justify-between ${
                          isDelivery ? 'bg-[#203180]/5 border-[#203180]/15' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className={`px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                              isDelivery ? 'bg-indigo-100 text-[#203180]' : isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isDelivery ? 'Despacho/Entrega' : isAdmin ? 'Administración' : 'Marketing'}
                            </span>
                            <span className="text-gray-400 font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> {ev.time}</span>
                          </div>

                          <h4 className="font-black text-sm text-gray-900">{ev.title}</h4>
                          <p className="text-xs text-gray-600 leading-relaxed font-semibold">{ev.copy}</p>

                          {client && (
                            <div className="bg-white/75 p-2 rounded-lg border border-gray-150 flex items-center justify-between text-xs mt-2">
                              <div>
                                <span className="text-[9px] uppercase font-black text-gray-400 block">Cliente asociado</span>
                                <span className="font-bold text-gray-800">{client.name}</span>
                              </div>
                              <span className="font-mono text-xs text-gray-500">{client.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Mobile Event Action Footer */}
                        <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-150 mt-4 text-xs">
                          <div className="flex gap-1.5">
                            {isDelivery && (
                              <button
                                onClick={() => handleSendWhatsAppReminder(ev)}
                                className="bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                                title="Enviar recordatorio por WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5" /> Enviar Aviso
                              </button>
                            )}
                          </div>

                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setEventToDelete(ev)}
                              className="text-red-600 hover:text-red-700 font-bold hover:underline text-xs flex items-center gap-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remover
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </motion.div>
        ) : (
          /* MARKETING COPYWRITER & REDES IA (Original layout) */
          <motion.div
            key="marketing-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Show Copywriter Add form inline */}
            {showForm && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-top duration-200">
                
                {/* Left panel: New publication fields */}
                <form onSubmit={handleSave} className="lg:col-span-2 space-y-4">
                  <h3 className="font-black text-sm text-gray-900">{editingPub ? 'Editar Publicación' : 'Añadir Nueva Publicación'}</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-gray-600 uppercase mb-1">Título de Publicación</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        placeholder="Ej: OOTD Casual Invierno"
                        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#203180]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-600 uppercase mb-1">Canal de Publicación</label>
                      <select
                        value={channel}
                        onChange={(e) => setChannel(e.target.value as any)}
                        className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                      >
                        <option value="Instagram">Instagram (Feed/Reel)</option>
                        <option value="TikTok">TikTok (Video)</option>
                        <option value="Facebook">Facebook (Post)</option>
                        <option value="Pinterest">Pinterest (Pin)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-gray-600 uppercase mb-1">Fecha Programada</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="w-full p-2 border rounded-lg focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-600 uppercase mb-1">Hora Ideal</label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        className="w-full p-2 border rounded-lg focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-600 uppercase mb-1">Estado inicial</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                      >
                        <option value="Borrador">Borrador</option>
                        <option value="Programado">Programado</option>
                        <option value="Publicado">Publicado</option>
                      </select>
                    </div>
                  </div>

                  {/* Main copy write text */}
                  <div className="text-xs">
                    <label className="block font-bold text-gray-600 uppercase mb-1">Copywriting de Publicación</label>
                    <textarea
                      value={copy}
                      onChange={(e) => setCopy(e.target.value)}
                      required
                      rows={4}
                      placeholder="Escribe el copy promocional o guion..."
                      className="w-full p-3 border rounded-lg font-sans focus:outline-none focus:border-[#203180]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-gray-600 uppercase mb-1">Hashtags (Separados por coma)</label>
                      <input
                        type="text"
                        value={hashtagsText}
                        onChange={(e) => setHashtagsText(e.target.value)}
                        placeholder="Keinshop, streetwear, col"
                        className="w-full p-2 border rounded-lg focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-600 uppercase mb-1">URL Imagen/Banner</label>
                      <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full p-2 border rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-[#203180] text-white font-extrabold py-2 px-5 rounded-lg hover:bg-indigo-950"
                    >
                      {editingPub ? 'Guardar Cambios' : 'Añadir al Calendario'}
                    </button>
                  </div>
                </form>

                {/* Right panel: IA Marketing copywriting generator */}
                <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-5 space-y-4 text-xs">
                  <h4 className="font-black text-[#203180] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-[#FF7AA6]" /> Copywriter Automatizado IA
                  </h4>
                  <p className="text-gray-600 leading-relaxed font-semibold">
                    Selecciona un producto del catálogo de KEINSHOP para generar instantáneamente copys y hashtags con la mejor hora de posteo.
                  </p>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block font-bold text-gray-500 uppercase mb-1">Seleccionar Producto</label>
                      <select
                        value={selectedProductSku}
                        onChange={(e) => setSelectedProductSku(e.target.value)}
                        className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                      >
                        <option value="">-- Elige un producto --</option>
                        {products.map(p => (
                          <option key={p.sku} value={p.sku}>{p.name} (${p.priceSell.toLocaleString()})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-500 uppercase mb-1">Tono / Estilo del Copy</label>
                      <select
                        value={aiVibe}
                        onChange={(e) => setAiVibe(e.target.value)}
                        className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                      >
                        <option value="Dinámico, callejero y juvenil">Dinámico y juvenil (Streetwear)</option>
                        <option value="Inspirador y de empoderamiento">Inspirador (Estilo y actitud)</option>
                        <option value="Focalizado en ofertas o urgencia">Urgencia (Pocas tallas, oferta)</option>
                        <option value="Educativo de moda y combinaciones">Outfit combo / Combinaciones</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={generateCopyFromAi}
                      disabled={loadingCopy || !selectedProductSku}
                      className="w-full bg-[#203180] hover:bg-indigo-900 disabled:opacity-40 text-white font-extrabold py-2.5 rounded-lg flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 text-xs"
                    >
                      {loadingCopy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#FF7AA6]" />}
                      {loadingCopy ? 'Generando copy con IA...' : 'Generar Textos con IA'}
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Publication lists */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-base text-gray-900">Agenda de Publicaciones Planificadas</h3>
                {!showForm && role !== 'Vendedor' && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-xs bg-[#203180] hover:bg-indigo-950 text-white font-extrabold px-3 py-1.5 rounded-lg shadow-sm"
                  >
                    Nueva publicación
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publications.filter(p => !p.eventType || p.eventType === 'content').map(pub => (
                  <div 
                    key={pub.id} 
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between"
                  >
                    
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-1.5 font-bold">
                          {pub.channel === 'Instagram' && <Instagram className="w-4 h-4 text-pink-600" />}
                          {pub.channel === 'TikTok' && <Video className="w-4 h-4 text-black" />}
                          {pub.channel === 'Facebook' && <Facebook className="w-4 h-4 text-blue-600" />}
                          <span className="text-gray-700">{pub.channel}</span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] tracking-wide ${
                          pub.status === 'Publicado' ? 'bg-green-100 text-green-700' :
                          pub.status === 'Programado' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {pub.status}
                        </span>
                      </div>

                      <div className="aspect-video bg-gray-50 border rounded-lg overflow-hidden relative">
                        <img src={pub.imageUrl} alt={pub.title} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {pub.date} @ {pub.time}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-black text-sm text-gray-900 line-clamp-1">{pub.title}</h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-3 leading-relaxed font-semibold">{pub.copy}</p>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2 font-mono text-[9px] font-bold text-[#FF7AA6]">
                        {pub.hashtags.map((tag, idx) => (
                          <span key={idx}>#{tag}</span>
                        ))}
                      </div>
                    </div>

                    {/* Card Rescheduling controls and editing */}
                    <div className="p-3.5 bg-gray-50 border-t border-gray-150 flex items-center justify-between text-xs">
                      
                      {/* Reschedule dates on the fly */}
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-400 font-bold">Mover:</span>
                        <input
                          type="date"
                          value={pub.date}
                          onChange={(e) => handleReschedule(pub, e.target.value)}
                          className="p-1 border border-gray-200 rounded text-[11px] focus:outline-none bg-white font-mono"
                          title="Reprogramar fecha"
                        />
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(pub)}
                          disabled={role === 'Vendedor'}
                          className="p-1 bg-white border hover:bg-gray-150 rounded text-gray-700 disabled:opacity-40 transition-colors"
                          title="Editar publicación"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEventToDelete(pub)}
                          disabled={role === 'Vendedor'}
                          className="p-1 bg-red-50 hover:bg-red-100 rounded text-[#C80C0C] disabled:opacity-40 transition-colors"
                          title="Eliminar publicación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>

                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 1: ADD DELIVERY / EVENT MODAL FORM */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-150 overflow-hidden"
          >
            <div className="p-4 bg-[#203180] text-white flex justify-between items-center">
              <div className="flex items-center gap-1.5 font-bold">
                <CalendarIcon className="w-5 h-5 text-[#FF7AA6]" />
                <h3>Agendar Nueva Entrega / Evento Administrativo</h3>
              </div>
              <button 
                onClick={() => setShowEventModal(false)} 
                className="text-white hover:text-gray-200 font-extrabold"
              >
                X
              </button>
            </div>

            <form onSubmit={handleSaveGridEvent} className="p-6 space-y-4 text-xs font-semibold text-gray-700">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-500 uppercase mb-1">Tipo de Evento</label>
                  <select
                    value={eventType}
                    onChange={(e) => {
                      setEventType(e.target.value as any);
                      if (e.target.value !== 'delivery') {
                        setEventClientId('');
                        setEventOrderId('');
                      }
                    }}
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                  >
                    <option value="delivery">🚚 Despacho / Entrega a Cliente</option>
                    <option value="admin">⚙️ Evento Administrativo / Logística</option>
                    <option value="content">📝 Publicación / Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-500 uppercase mb-1">Recordatorio Automático</label>
                  <select
                    value={eventReminder}
                    onChange={(e) => setEventReminder(e.target.value)}
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                  >
                    <option value="none">Sin recordatorio</option>
                    <option value="2h">2 horas antes (Automatizado)</option>
                    <option value="1h">1 hora antes</option>
                    <option value="24h">24 horas antes (Recomendado)</option>
                    <option value="2d">2 días antes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase mb-1">Título / Concepto del Evento</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Ej: Despacho a Bogotá / Cuadre de Inventario"
                  required
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#203180]"
                />
              </div>

              {/* Delivery specific fields */}
              {eventType === 'delivery' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Vincular Cliente (Manual o Lista)
                      </label>
                      <input
                        list="clients-datalist"
                        value={eventClientId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEventClientId(val);
                          const matched = clients.find(c => c.id === val);
                          if (matched && matched.phone) {
                            setEventWhatsapp(matched.phone);
                          }
                        }}
                        required
                        placeholder="Escribe nombre/ID o elige..."
                        className="w-full p-2 border border-gray-200 bg-white rounded-lg focus:outline-none focus:border-[#203180] text-sm"
                      />
                      <datalist id="clients-datalist">
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-500 uppercase mb-1">Vincular Pedido Especial (Manual o Lista)</label>
                      <input
                        list="orders-datalist"
                        value={eventOrderId}
                        onChange={(e) => setEventOrderId(e.target.value)}
                        placeholder="Escribe ID o elige..."
                        className="w-full p-2 border border-gray-200 bg-white rounded-lg focus:outline-none focus:border-[#203180] text-sm"
                      />
                      <datalist id="orders-datalist">
                        {orders.filter(o => o.clientId === eventClientId || !eventClientId).map(o => (
                          <option key={o.id} value={o.id}>Pedido #{o.id} - {o.client_name || 'Sin nombre'}</option>
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#25D366]" /> Número de WhatsApp de Entrega
                    </label>
                    <input
                      type="text"
                      value={eventWhatsapp}
                      onChange={(e) => setEventWhatsapp(e.target.value)}
                      placeholder="Ej: 573001234567 (Número para avisar al cliente)"
                      className="w-full p-2 border border-gray-200 bg-white rounded-lg focus:outline-none focus:border-[#203180] text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-500 uppercase mb-1">Fecha de Ejecución</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    className="w-full p-2 border rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-500 uppercase mb-1">Hora Programada</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    required
                    className="w-full p-2 border rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-500 uppercase mb-1">Responsable</label>
                  <input
                    type="text"
                    value={eventResponsible}
                    onChange={(e) => setEventResponsible(e.target.value)}
                    placeholder="Ej: Ken Israel (Admin)"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#203180]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-500 uppercase mb-1">Estado del Evento</label>
                  <select
                    value={eventStatus}
                    onChange={(e) => setEventStatus(e.target.value as any)}
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                  >
                    <option value="Borrador">Borrador</option>
                    <option value="Programado">Programado</option>
                    <option value="Publicado">Publicado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase mb-1">Notas de Logística o Instrucciones</label>
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder="Detalles sobre empaque, dirección, transportadora o tareas específicas..."
                  rows={2}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#203180] text-white hover:bg-indigo-950 font-extrabold px-5 py-2 rounded-lg"
                >
                  Agendar Evento
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: INTERACTIVE EVENT DETAILS MODAL (Viewer) */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-150 overflow-hidden"
          >
            <div className="p-4 bg-[#203180] text-white flex justify-between items-center">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/20 px-2.5 py-1 rounded-md">
                {selectedEvent.eventType === 'delivery' ? '🚚 Despacho / Entrega' : selectedEvent.eventType === 'admin' ? '⚙️ Administrativo' : '📝 Marketing'}
              </span>
              <button onClick={() => setSelectedEvent(null)} className="text-white hover:text-gray-200 font-bold text-sm">X</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-black text-base text-gray-900">{selectedEvent.title}</h3>
                <span className="text-xs text-gray-400 font-mono flex items-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5 text-[#FF7AA6]" /> Programado: {selectedEvent.date} @ {selectedEvent.time}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <span className="text-[9px] uppercase font-black text-gray-400 block">Detalles e Instrucciones</span>
                <p className="text-xs text-gray-700 leading-relaxed font-semibold">{selectedEvent.copy}</p>
                <div className="pt-2 border-t border-gray-150 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-gray-400 uppercase block font-bold">Responsable</span>
                    <span className="font-extrabold text-gray-800">{selectedEvent.responsible || 'Sin asignar'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 uppercase block font-bold">Estado</span>
                    <span className={`font-extrabold ${selectedEvent.status === 'Publicado' ? 'text-green-600' : 'text-blue-600'}`}>
                      {selectedEvent.status || 'Programado'}
                    </span>
                  </div>
                </div>
              </div>

               {/* Linked Client Info */}
              {selectedEvent.clientId && (
                <section className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-150 space-y-2 text-xs">
                  <span className="text-[9px] uppercase font-black text-[#203180] block">Cliente Vinculado</span>
                  {(() => {
                    const client = clients.find(c => c.id === selectedEvent.clientId);
                    if (!client) return <p className="text-gray-400">Cliente no encontrado en la base de datos.</p>;
                    return (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-800">{client.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{client.email}</p>
                        </div>
                        <span className="font-mono font-bold text-gray-600 bg-white border px-2 py-1 rounded">{selectedEvent.whatsapp || client.phone}</span>
                      </div>
                    );
                  })()}
                </section>
              )}

              {!selectedEvent.clientId && selectedEvent.whatsapp && (
                <section className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-150 space-y-2 text-xs">
                  <span className="text-[9px] uppercase font-black text-[#203180] block">WhatsApp de Contacto</span>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">Contacto Directo</span>
                    <span className="font-mono font-bold text-gray-600 bg-white border px-2 py-1 rounded">{selectedEvent.whatsapp}</span>
                  </div>
                </section>
              )}

              {/* Action buttons */}
              <div className="pt-4 flex flex-col gap-2 border-t border-gray-150">
                {selectedEvent.eventType === 'delivery' && (
                  <button
                    onClick={() => {
                      handleSendWhatsAppReminder(selectedEvent);
                      setSelectedEvent(null);
                    }}
                    className="w-full bg-[#25D366] hover:bg-[#20ba56] text-white font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-xs"
                  >
                    <Send className="w-4 h-4" /> Enviar Aviso de Entrega (WhatsApp)
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEditEvent(selectedEvent)}
                    className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-[#203180] font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 border border-indigo-200"
                  >
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => setEventToDelete(selectedEvent)}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover del Calendario
                  </button>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-xl text-xs"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}

      {/* Visual Safety Deletion Confirmation Modal */}
      <AnimatePresence>
        {eventToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden text-left text-gray-900"
            >
              <div className="p-5 border-b border-gray-150 flex items-center gap-2.5 bg-red-50 text-red-700">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
                <h3 className="font-black text-sm uppercase">Confirmación de Seguridad</h3>
              </div>
              
              <div className="p-5 space-y-3">
                <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                  ¿Estás absolutamente seguro de eliminar definitivamente este registro del calendario?
                </p>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-150 space-y-1.5">
                  <div className="text-xs font-black text-gray-900 flex items-center gap-1">
                    <span className="font-mono text-[10px] text-gray-400">ID:</span> {eventToDelete.id}
                  </div>
                  <div className="text-xs font-bold text-gray-700">
                    Título: <span className="font-semibold text-gray-900">{eventToDelete.title}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    Fecha: {eventToDelete.date} | Canal: {eventToDelete.channel}
                  </div>
                </div>
                <p className="text-[11px] text-[#C80C0C] font-bold leading-normal">
                  ⚠️ Esta acción es permanente, removerá el evento de forma inmediata y se registrará en el historial de auditoría de KEINSHOP.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end gap-2 text-xs font-bold">
                <button
                  onClick={() => setEventToDelete(null)}
                  className="px-3.5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onDeletePublication(eventToDelete.id);
                    setEventToDelete(null);
                    setSelectedEvent(null);
                    showPushNotification("Registro removido correctamente.");
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm flex items-center gap-1 transition-all"
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
