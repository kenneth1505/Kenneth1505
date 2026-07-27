import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Share2, 
  Send, 
  Clock, 
  Truck, 
  Info, 
  Calendar, 
  DollarSign, 
  Upload, 
  Camera, 
  FileSpreadsheet, 
  Layers, 
  Search, 
  X, 
  Check, 
  Edit3, 
  AlertCircle, 
  Sparkles, 
  Calculator, 
  RefreshCw,
  Link,
  Star,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { SpecialOrder, Client, UserRole, OrderItem, TimelineEvent } from '../types';
import { getPublicOrigin } from '../lib/urlHelper';
import { FallbackImage } from './FallbackImage';
import { compressAndResizeImage } from '../utils/imageCompressor';

interface MultiImageUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

function MultiImageUploader({
  photos,
  onChange,
  maxFiles = 10,
  maxSizeMB = 5
}: MultiImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const processFiles = (files: FileList) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    Array.from(files).forEach(async (file, index) => {
      if (!allowedTypes.includes(file.type)) {
        alert(`Formato no permitido para "${file.name}". Solo se admiten PNG, JPG, JPEG, WEBP.`);
        return;
      }
      if (photos.length >= maxFiles) {
        alert(`Has alcanzado el límite máximo de ${maxFiles} imágenes.`);
        return;
      }

      const fileId = `${file.name}-${Date.now()}-${index}`;
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      let activeFile = file;
      try {
        const compressed = await compressAndResizeImage(file);
        activeFile = compressed.file;
      } catch (err) {
        console.error("Compression failed, using original file:", err);
      }

      const reader = new FileReader();
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        if (progress <= 90) {
          setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
        }
      }, 50);

      reader.onloadend = () => {
        clearInterval(interval);
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        if (typeof reader.result === 'string') {
          const base64 = reader.result;
          onChange([...photos, base64]);
          setTimeout(() => {
            setUploadProgress(prev => {
              const copy = { ...prev };
              delete copy[fileId];
              return copy;
            });
          }, 800);
        }
      };
      reader.readAsDataURL(activeFile);
    });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const makePrimary = (index: number) => {
    if (index === 0) return;
    const item = photos[index];
    const remaining = photos.filter((_, i) => i !== index);
    onChange([item, ...remaining]);
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    const newPhotos = [...photos];
    const temp = newPhotos[index - 1];
    newPhotos[index - 1] = newPhotos[index];
    newPhotos[index] = temp;
    onChange(newPhotos);
  };

  const moveRight = (index: number) => {
    if (index === photos.length - 1) return;
    const newPhotos = [...photos];
    const temp = newPhotos[index + 1];
    newPhotos[index + 1] = newPhotos[index];
    newPhotos[index] = temp;
    onChange(newPhotos);
  };

  const isUploading = Object.keys(uploadProgress).length > 0;

  return (
    <div className="space-y-3">
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${
          dragOver ? 'border-[#FF7AA6] bg-pink-50/20 scale-[1.01]' : 'border-gray-250 bg-gray-50/50 hover:bg-gray-50 hover:border-[#203180]'
        }`}
      >
        <input 
          type="file" 
          id={`image-uploader-input-${maxFiles}`}
          multiple 
          accept="image/png,image/jpeg,image/webp,image/jpg" 
          onChange={handleFileSelect} 
          className="hidden" 
        />
        <label htmlFor={`image-uploader-input-${maxFiles}`} className="cursor-pointer block space-y-1">
          <Upload className="w-7 h-7 text-gray-400 mx-auto animate-pulse" />
          <span className="text-xs font-extrabold text-[#203180] block">Subir Fotos Reales (PC/Celular)</span>
          <span className="text-[10px] text-gray-400 block">Soporta PNG, JPG, JPEG, WEBP • Max {maxSizeMB}MB • Límite {maxFiles} fotos</span>
        </label>
      </div>

      {isUploading && (
        <div className="space-y-1.5 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-indigo-700 font-bold">
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Procesando y validando imágenes...
            </span>
          </div>
          <div className="w-full bg-indigo-150 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(...(Object.values(uploadProgress) as number[]))}%` }}
            />
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-3 bg-gray-50 border border-gray-150 rounded-2xl">
          {photos.map((url, i) => {
            const isPrimary = i === 0;
            return (
              <div key={i} className="relative aspect-square bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
                <FallbackImage src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
                
                <div className="absolute left-1.5 top-1.5 bg-black/70 backdrop-blur-sm text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {i + 1}
                </div>

                {isPrimary && (
                  <div className="absolute right-1.5 top-1.5 bg-yellow-400 text-black p-0.5 rounded-md shadow-sm">
                    <Star className="w-3 h-3 fill-black text-black" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end gap-1">
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() => makePrimary(i)}
                        title="Marcar como principal"
                        className="p-1 bg-yellow-400 hover:bg-yellow-500 rounded-lg text-black transition-colors"
                      >
                        <Star className="w-3 h-3 fill-black" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      title="Eliminar"
                      className="p-1 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex justify-center gap-1.5">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveLeft(i)}
                      className="p-1 bg-white/20 hover:bg-white/40 disabled:opacity-30 disabled:hover:bg-white/20 rounded-lg text-white transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={i === photos.length - 1}
                      onClick={() => moveRight(i)}
                      className="p-1 bg-white/20 hover:bg-white/40 disabled:opacity-30 disabled:hover:bg-white/20 rounded-lg text-white transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PedidosEspecialesProps {
  orders: SpecialOrder[];
  clients: Client[];
  onAddOrder: (order: SpecialOrder) => any;
  onUpdateOrder: (order: SpecialOrder) => void;
  onUpdateOrderStatus?: (id: string, newStatus: string, requestId: string, reason: string) => Promise<boolean>;
  onDeleteOrder?: (id: string, mode: 'soft' | 'hard', reason: string) => void;
  role: UserRole;
  onScheduleInCalendar?: (order: SpecialOrder) => void;
  showAddFormInitially?: boolean;
}

export default function PedidosEspeciales({ 
  orders, 
  clients, 
  onAddOrder, 
  onUpdateOrder, 
  onUpdateOrderStatus,
  onDeleteOrder,
  role,
  onScheduleInCalendar,
  showAddFormInitially = false
}: PedidosEspecialesProps) {

  const [showAddForm, setShowAddForm] = useState(showAddFormInitially);
  const [showCalculator, setShowCalculator] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('TODOS');
  const [showArchived, setShowArchived] = useState(false);

  // Bulk update / selection states
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('PEDIDO_ENVIADO');
  const [bulkNote, setBulkNote] = useState('Actualización masiva de estado logístico');

  // Delete Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<SpecialOrder | null>(null);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft');
  const [deleteReason, setDeleteReason] = useState('Cliente canceló el pedido');
  const [customDeleteReason, setCustomDeleteReason] = useState('');

  // Modal / status updates
  const [editingOrder, setEditingOrder] = useState<SpecialOrder | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [newLogisticsStatus, setNewLogisticsStatus] = useState('EN_TRANSITO');
  const [statusChangeNote, setStatusChangeNote] = useState('');

  // Additional states for full admin editing capability of special orders
  const [editWeightLbs, setEditWeightLbs] = useState(0);
  const [editAdditionalLbs, setEditAdditionalLbs] = useState(0);
  const [editCostPerLb, setEditCostPerLb] = useState(0);
  const [editFreightCost, setEditFreightCost] = useState(0);
  const [editTotalCost, setEditTotalCost] = useState(0);
  const [editPaidAmount, setEditPaidAmount] = useState(0);
  const [editPendingBalance, setEditPendingBalance] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientWhatsapp, setEditClientWhatsapp] = useState('');
  const [editOriginCategory, setEditOriginCategory] = useState<string>('Shein');
  const [editDateEstArrival, setEditDateEstArrival] = useState('');
  const [editFormItems, setEditFormItems] = useState<{sku: string, description: string, qty: number, imgUrl?: string}[]>([]);

  // Form State for SpecialOrder
  const [clientId, setClientId] = useState('');
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [weightLbs, setWeightLbs] = useState(3.0);
  const [additionalLbs, setAdditionalLbs] = useState(0.0);
  const [precioInicialProductos, setPrecioInicialProductos] = useState(40);
  const [paidAmount, setPaidAmount] = useState(25);
  const [totalCost, setTotalCost] = useState(55);
  const [totalCostUsd, setTotalCostUsd] = useState(55);
  const [source, setSource] = useState<string>('WhatsApp');
  const [originCategory, setOriginCategory] = useState<'Shein' | 'Temu' | string>('Shein');
  const [notes, setNotes] = useState('');
  const [dateEstArrival, setDateEstArrival] = useState('');
  const [costPerLb, setCostPerLb] = useState(5);

  // Sub-items builder inside creation form
  const [formItems, setFormItems] = useState<OrderItem[]>([
    { sku: 'SH-ITEM-1', description: 'Vestido Shein Premium', qty: 1 }
  ]);
  const [newSku, setNewSku] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newImgUrl, setNewImgUrl] = useState('');

  // Uploaded photos state
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Copy/Share feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkingPublishId, setCheckingPublishId] = useState<string | null>(null);
  const [activeToast, setActiveToast] = useState<{ text: string; link?: string; id?: string; order?: SpecialOrder } | null>(null);

  // Publish states
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [orderToPublish, setOrderToPublish] = useState<SpecialOrder | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // IA Calculator states
  const [calcItems, setCalcItems] = useState('Hoodie Shein Streetwear con capota');
  const [calcWeight, setCalcWeight] = useState(2.2);
  const [calcUSD, setCalcUSD] = useState(15.9);
  const [calcExchangeRate, setCalcExchangeRate] = useState(4100);
  const [calcFeePerLb, setCalcFeePerLb] = useState(12000);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [calcResult, setCalcResult] = useState<any | null>(null);

  // Logistics statuses predefined (8 mandatory states)
  const LOGISTICS_STATUS_OPTIONS = [
    { value: 'PEDIDO_REGISTRADO', label: 'Pedido registrado' },
    { value: 'PEDIDO_ENVIADO', label: 'Pedido enviado' },
    { value: 'EN_TRANSITO_AL_PAIS', label: 'En tránsito al país' },
    { value: 'INGRESO_AL_PAIS', label: 'Ingreso al país' },
    { value: 'EN_ADUANA', label: 'En aduana' },
    { value: 'DESPACHO_ADUANERO', label: 'Despacho aduanero' },
    { value: 'EN_TRANSITO_A_ENTREGA', label: 'En tránsito a entrega' },
    { value: 'ENTREGADO', label: 'Entregado' }
  ];

  // Drag and Drop simulation + base64 converter
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (files: FileList) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    Array.from(files).forEach(async (file) => {
      if (!allowedTypes.includes(file.type)) {
        alert(`Formato no permitido para "${file.name}". Solo se admiten PNG, JPG, JPEG, WEBP.`);
        return;
      }
      if (uploadedPhotos.length >= 10) {
        alert(`Has alcanzado el límite máximo de 10 imágenes por pedido.`);
        return;
      }

      let activeFile = file;
      try {
        const compressed = await compressAndResizeImage(file);
        activeFile = compressed.file;
      } catch (err) {
        console.error("Compression failed, using original file:", err);
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setUploadedPhotos(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(activeFile);
    });
  };

  const removeUploadedPhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const [generatingAiTracking, setGeneratingAiTracking] = useState(false);

  const handleGenerateAiTracking = async () => {
    setGeneratingAiTracking(true);
    try {
      const res = await fetch('/api/admin/special-orders/generate-ai-tracking-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveToast({
          text: data.message || "¡Enlaces de seguimiento optimizados y regenerados correctamente con la IA de KEINSHOP!"
        });
        // Dispatch event to trigger app-wide data reload so the special orders are updated!
        window.dispatchEvent(new Event('sync-all-data'));
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error al regenerar los enlaces de seguimiento.");
      }
    } catch (err) {
      console.error("Error generating AI tracking links:", err);
      alert("Error de conexión al servidor.");
    } finally {
      setGeneratingAiTracking(false);
    }
  };

  // Sub-items list handlers
  const handleAddItemToForm = () => {
    if (!newDesc) return;
    const item: OrderItem = {
      sku: newSku || `SH-${Math.floor(Math.random() * 90000 + 10000)}`,
      description: newDesc,
      qty: Number(newQty),
      image_urls: newImgUrl ? [newImgUrl] : undefined
    };
    setFormItems(prev => [...prev, item]);
    setNewSku('');
    setNewDesc('');
    setNewQty(1);
    setNewImgUrl('');
  };

  const handleRemoveItemFromForm = (idx: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddItemToEditForm = () => {
    if (!newDesc) return;
    const item: OrderItem = {
      sku: newSku || `SH-${Math.floor(Math.random() * 90000 + 10000)}`,
      description: newDesc,
      qty: Number(newQty),
      image_urls: newImgUrl ? [newImgUrl] : undefined
    };
    setEditFormItems(prev => [...prev, item]);
    setNewSku('');
    setNewDesc('');
    setNewImgUrl('');
    setNewQty(1);
  };

  const handleRemoveItemFromEditForm = (idx: number) => {
    setEditFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingOrder(true);

    let clientNameFinal = manualClientName;
    let clientPhoneFinal = manualClientPhone;

    if (clientId) {
      const matchedClient = clients.find(c => c.id === clientId);
      if (matchedClient) {
        clientNameFinal = matchedClient.name;
        clientPhoneFinal = matchedClient.phone;
      }
    }

    // 1. INTEGRITY VALIDATION
    if (!clientNameFinal || !clientNameFinal.trim() || clientNameFinal.trim().length < 3) {
      alert("Por favor selecciona un cliente CRM o ingresa un nombre completo de cliente válido (mínimo 3 caracteres).");
      setIsCreatingOrder(false);
      return;
    }

    if (!clientPhoneFinal || !clientPhoneFinal.trim() || clientPhoneFinal.trim().length < 5) {
      alert("Por favor ingresa un número de celular o teléfono válido (mínimo 5 caracteres) para el cliente.");
      setIsCreatingOrder(false);
      return;
    }

    if (weightLbs === undefined || weightLbs === null || isNaN(Number(weightLbs)) || Number(weightLbs) < 0) {
      alert("Por favor ingresa un peso (Lbs) válido (mínimo 0).");
      setIsCreatingOrder(false);
      return;
    }

    if (costPerLb === undefined || costPerLb === null || isNaN(Number(costPerLb)) || Number(costPerLb) < 0) {
      alert("Por favor ingresa un precio por libra válido (mínimo 0).");
      setIsCreatingOrder(false);
      return;
    }

    if (precioInicialProductos === undefined || precioInicialProductos === null || isNaN(Number(precioInicialProductos)) || Number(precioInicialProductos) < 0) {
      alert("Por favor ingresa un costo total (COP) válido (mínimo 0).");
      setIsCreatingOrder(false);
      return;
    }

    if (!formItems || formItems.length === 0) {
      alert("Por favor añade al menos una prenda al listado de prendas (Constructor de Items) antes de registrar el pedido.");
      setIsCreatingOrder(false);
      return;
    }

    // Find highest numeric ID and increment it to prevent duplicate clashing
    let maxNum = 0;
    orders.forEach(o => {
      if (o && o.id && typeof o.id === 'string') {
        const match = o.id.match(/^PE-0*([1-9]\d*)$|^PE-0+$/);
        if (match) {
          const numPart = match[1] || "0";
          const num = parseInt(numPart, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
    const nextNum = maxNum + 1;
    const orderId = `PE-0${nextNum < 10 ? '0' + nextNum : nextNum}`;
    const calculatedFlete = Number(((Number(weightLbs) + Number(additionalLbs)) * Number(costPerLb)).toFixed(2));
    const calculatedTotal = Number(precioInicialProductos.toFixed(2));
    const calculatedSaldo = Number((calculatedTotal - paidAmount).toFixed(2));

    const calculatedPaymentStatus = paidAmount >= calculatedTotal ? 'PAGADO' : paidAmount > 0 ? 'ABONADO' : 'PENDIENTE';

    // Generate initial timeline
    const initialTimeline: TimelineEvent[] = [
      {
        status: 'CREADO',
        timestamp: new Date().toISOString(),
        note: `Pedido realizado para ${clientNameFinal}. Canal: ${source}. Abono de $${paidAmount} USD.`,
        updated_by: 'Ken Israel (Admin)'
      }
    ];

    const request_id = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));

    const newOrder: SpecialOrder = {
      id: orderId,
      clientId: clientId || 'MANUAL',
      client_name: clientNameFinal,
      client_phone: clientPhoneFinal,
      client_whatsapp: clientPhoneFinal,
      itemsText: itemsText || formItems.map(item => `${item.description} (${item.qty}x)`).join(', ') || `Importación especial ${source}`,
      weightLbs: Number(weightLbs),
      additional_lbs: Number(additionalLbs),
      totalCost: calculatedTotal,
      paidAmount: Number(paidAmount),
      status: 'CREADO',
      payment_status: calculatedPaymentStatus,
      source,
      origin_category: originCategory,
      items: formItems,
      photos: uploadedPhotos,
      total_cost_usd: calculatedTotal,
      created_by: 'Ken Israel (Admin)',
      last_update: new Date().toISOString(),
      notes,
      dateOrdered: new Date().toISOString().split('T')[0],
      dateEstArrival: dateEstArrival || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      costPerLb: Number(costPerLb),
      timeline: initialTimeline,
      request_id: request_id,
      initial_products_cost: Number((calculatedTotal - calculatedFlete).toFixed(2)),
      initial_payment: Number(paidAmount),
      freight_cost: calculatedFlete,
      pending_balance: calculatedSaldo
    };

    // Close form and reset fields immediately so the UI closes without getting stuck loading
    setShowAddForm(false);
    setIsCreatingOrder(false);

    // Reset Form
    setClientId('');
    setManualClientName('');
    setManualClientPhone('');
    setItemsText('');
    setWeightLbs(3.0);
    setAdditionalLbs(0.0);
    setPrecioInicialProductos(40);
    setPaidAmount(25);
    setNotes('');
    setFormItems([{ sku: 'SH-ITEM-1', description: 'Vestido Shein Premium', qty: 1 }]);
    setUploadedPhotos([]);

    const trackingLink = `${getPublicOrigin()}/track/${orderId}`;

    // Trigger the active toast
    setActiveToast({
      text: `El pedido especial ${orderId} para ${clientNameFinal} se ha registrado con éxito.`,
      link: trackingLink,
      id: orderId,
      order: newOrder
    });

    // Execute onAddOrder (which performs instant optimistic UI update + background server sync)
    try {
      Promise.resolve(onAddOrder(newOrder)).then((created: any) => {
        if (created?.id && created.id !== orderId) {
          const updatedTrackingLink = `${getPublicOrigin()}/track/${created.id}`;
          setActiveToast({
            text: `El pedido especial ${created.id} para ${clientNameFinal} se ha registrado con éxito.`,
            link: updatedTrackingLink,
            id: created.id,
            order: created
          });
        }
      }).catch((err) => {
        console.error("Error in background onAddOrder:", err);
      });
    } catch (err: any) {
      console.error("Error launching onAddOrder:", err);
    }
  };

  // Change logistics status with a timeline event
  const handleOpenStatusModal = (order: SpecialOrder) => {
    setEditingOrder(order);
    setNewLogisticsStatus(order.status || 'CREADO');
    setStatusChangeNote('');
    setEditWeightLbs(order.weightLbs || 0);
    setEditAdditionalLbs(order.additional_lbs || 0);
    setEditCostPerLb(order.costPerLb || 0);
    setEditFreightCost(order.freight_cost || Number(((Number(order.weightLbs || 0) + Number(order.additional_lbs || 0)) * Number(order.costPerLb || 5)).toFixed(2)));
    setEditTotalCost(order.totalCost || 0);
    setEditPaidAmount(order.paidAmount || 0);
    setEditPendingBalance(order.totalCost - order.paidAmount);
    setEditNotes(order.notes || '');
    setEditPhotos(order.photos || []);
    setNewPhotoUrl('');
    setEditClientName(order.client_name || '');
    setEditClientWhatsapp(order.client_whatsapp || order.client_phone || '');
    setEditOriginCategory(order.origin_category || 'Shein');
    setEditDateEstArrival(order.dateEstArrival || '');
    setEditFormItems(order.items ? [...order.items] : []);
    setShowStatusModal(true);
  };

  const hasPendingChanges = () => {
    if (!editingOrder) return false;
    const currentFreight = editingOrder.freight_cost || Number(((Number(editingOrder.weightLbs || 0) + Number(editingOrder.additional_lbs || 0)) * Number(editingOrder.costPerLb || 5)).toFixed(2));
    const currentPending = Number((editingOrder.totalCost - editingOrder.paidAmount).toFixed(2));
    return (
      newLogisticsStatus !== (editingOrder.status || 'CREADO') ||
      statusChangeNote !== '' ||
      editNotes !== (editingOrder.notes || '') ||
      Number(editWeightLbs) !== (editingOrder.weightLbs || 0) ||
      Number(editAdditionalLbs) !== (editingOrder.additional_lbs || 0) ||
      Number(editCostPerLb) !== (editingOrder.costPerLb || 0) ||
      Number(editFreightCost) !== currentFreight ||
      Number(editTotalCost) !== (editingOrder.totalCost || 0) ||
      Number(editPaidAmount) !== (editingOrder.paidAmount || 0) ||
      Number(editPendingBalance) !== currentPending ||
      editPhotos.join(',') !== (editingOrder.photos || []).join(',') ||
      editClientName !== (editingOrder.client_name || '') ||
      editClientWhatsapp !== (editingOrder.client_whatsapp || editingOrder.client_phone || '') ||
      editOriginCategory !== (editingOrder.origin_category || 'Shein') ||
      editDateEstArrival !== (editingOrder.dateEstArrival || '') ||
      JSON.stringify(editFormItems) !== JSON.stringify(editingOrder.items || [])
    );
  };

  const handleCloseStatusModal = () => {
    if (hasPendingChanges()) {
      setShowCancelConfirmModal(true);
    } else {
      setShowStatusModal(false);
      setEditingOrder(null);
    }
  };

  const handleSaveStatusUpdate = async () => {
    if (!editingOrder) return;

    // Calculate audit trail
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];
    const usuario = `Ken Israel (${role})`;

    const addedAudits: { usuario: string; fecha: string; hora: string; campo_editado: string; valor_nuevo: string }[] = [];

    if (editingOrder.status !== newLogisticsStatus) {
      addedAudits.push({ usuario, fecha, hora, campo_editado: 'estado_tracking', valor_nuevo: newLogisticsStatus });
    }
    if (statusChangeNote) {
      addedAudits.push({ usuario, fecha, hora, campo_editado: 'comentario_timeline_publico', valor_nuevo: statusChangeNote });
    }
    if (editingOrder.notes !== editNotes) {
      addedAudits.push({ usuario, fecha, hora, campo_editado: 'notas_internas_logisticas', valor_nuevo: editNotes });
    }
    if (editingOrder.weightLbs !== Number(editWeightLbs)) {
      addedAudits.push({ usuario, fecha, hora, campo_editado: 'peso_lbs', valor_nuevo: String(editWeightLbs) });
    }
    if (editingOrder.additional_lbs !== Number(editAdditionalLbs)) {
      addedAudits.push({ usuario, fecha, hora, campo_editado: 'lbs_extras', valor_nuevo: String(editAdditionalLbs) });
    }
    if (editingOrder.costPerLb !== Number(editCostPerLb)) {
      addedAudits.push({ usuario, fecha, hora, campo_editado: 'tarifa_por_lb', valor_nuevo: String(editCostPerLb) });
    }
    if (editingOrder.totalCost !== Number(editTotalCost)) {
      addedAudits.push({ usuario, fecha, hora, campo_editado: 'costo_total', valor_nuevo: String(editTotalCost) });
    }
    if (editingOrder.paidAmount !== Number(editPaidAmount)) {
      addedAudits.push({ usuario, fecha, hora, campo_editado: 'total_abonado', valor_nuevo: String(editPaidAmount) });
    }
    const currentFreight = editingOrder.freight_cost || Number(((Number(editingOrder.weightLbs || 0) + Number(editingOrder.additional_lbs || 0)) * Number(editingOrder.costPerLb || 5)).toFixed(2));
    if (currentFreight !== Number(editFreightCost)) {
      addedAudits.push({ usuario, fecha, hora, campo_editado: 'costo_libras', valor_nuevo: String(editFreightCost) });
    }
    const currentPending = Number((editingOrder.totalCost - editingOrder.paidAmount).toFixed(2));
    if (currentPending !== Number(editPendingBalance)) {
      addedAudits.push({ usuario, fecha, hora, campo_editado: 'saldo_pendiente', valor_nuevo: String(editPendingBalance) });
    }
    if ((editingOrder.photos || []).join(',') !== (editPhotos || []).join(',')) {
      addedAudits.push({ usuario, fecha, hora, campo_editado: 'fotos_producto', valor_nuevo: `${editPhotos.length} fotos` });
    }

    const currentAuditHistory = editingOrder.audit_history || [];
    const updatedAuditHistory = [...currentAuditHistory, ...addedAudits];

    let noteText = statusChangeNote;
    if (!noteText) {
      if (addedAudits.length > 0) {
        noteText = `Campos actualizados: ${addedAudits.map(a => `${a.campo_editado} (${a.valor_nuevo})`).join(', ')}`;
      } else {
        noteText = "Se actualizaron los datos del pedido sin cambios de estado.";
      }
    }

    const currentTimeline = editingOrder.timeline || [];
    const newEvent: TimelineEvent = {
      status: newLogisticsStatus,
      timestamp: now.toISOString(),
      note: noteText,
      updated_by: usuario
    };

    const nextPaidAmount = Number(editPaidAmount);

    const nextPaymentStatus = nextPaidAmount >= Number(editTotalCost) ? 'PAGADO' : nextPaidAmount > 0 ? 'ABONADO' : 'PENDIENTE';

    // Call status specific API if status has changed to validate transitions & write audit trail
    const statusHasChanged = editingOrder.status !== newLogisticsStatus;
    if (statusHasChanged && onUpdateOrderStatus) {
      const requestId = 'REQ-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const success = await onUpdateOrderStatus(editingOrder.id, newLogisticsStatus, requestId, noteText);
      if (!success) {
        // Validation failed, keep modal open to allow correcting
        return;
      }
    }

    const updatedOrder: SpecialOrder = {
      ...editingOrder,
      client_name: editClientName,
      client_phone: editClientWhatsapp,
      client_whatsapp: editClientWhatsapp,
      status: newLogisticsStatus,
      origin_category: editOriginCategory,
      dateEstArrival: editDateEstArrival,
      items: editFormItems,
      comentariotimelinepublico: statusChangeNote || editingOrder.comentariotimelinepublico || "",
      weightLbs: Number(editWeightLbs),
      additional_lbs: Number(editAdditionalLbs),
      costPerLb: Number(editCostPerLb),
      freight_cost: Number(editFreightCost),
      totalCost: Number(editTotalCost),
      paidAmount: nextPaidAmount,
      initial_payment: nextPaidAmount,
      pending_balance: Number(editPendingBalance),
      payment_status: nextPaymentStatus,
      notes: editNotes,
      photos: editPhotos,
      last_update: now.toISOString(),
      timeline: [...currentTimeline, newEvent],
      audit_history: updatedAuditHistory
    };

    onUpdateOrder(updatedOrder);
    setShowStatusModal(false);
    setEditingOrder(null);
  };

  // Quick helper to register financial payment updates
  const handleRegisterPayment = (order: SpecialOrder, amount: number) => {
    const updatedPaid = Math.min(order.totalCost, order.paidAmount + amount);
    const newPaymentStatus = updatedPaid >= order.totalCost ? 'PAGADO' : 'ABONADO';
    
    const currentTimeline = order.timeline || [];
    const paymentTimelineEvent: TimelineEvent = {
      status: order.status,
      timestamp: new Date().toISOString(),
      note: `Abono de pago registrado por $${amount.toLocaleString('es-CO')} COP. Abono acumulado: $${updatedPaid.toLocaleString('es-CO')} COP.`,
      updated_by: `Ken Israel (${role})`
    };

    onUpdateOrder({
      ...order,
      paidAmount: updatedPaid,
      payment_status: newPaymentStatus,
      timeline: [...currentTimeline, paymentTimelineEvent]
    });
  };

  // Bulk update handler for multiple selected orders
  const handleBulkUpdate = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!onUpdateOrderStatus) {
      alert("La función de actualizar estado no está disponible.");
      return;
    }

    setIsBulkUpdating(true);
    let successCount = 0;

    try {
      for (const orderId of selectedOrderIds) {
        const order = orders.find(o => o.id === orderId);
        if (!order) continue;

        // Skip if status is already the target status
        if (order.status === bulkStatus) {
          successCount++;
          continue;
        }

        const requestId = 'REQ-BULK-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const success = await onUpdateOrderStatus(orderId, bulkStatus, requestId, bulkNote || 'Actualización múltiple de estado');
        
        if (success) {
          successCount++;
          const currentTimeline = order.timeline || [];
          const newEvent: TimelineEvent = {
            status: bulkStatus,
            timestamp: new Date().toISOString(),
            note: bulkNote || `Actualización de estado en conjunto a: ${bulkStatus}`,
            updated_by: `Ken Israel (${role})`
          };

          onUpdateOrder({
            ...order,
            status: bulkStatus,
            comentariotimelinepublico: bulkNote || order.comentariotimelinepublico || "",
            last_update: new Date().toISOString(),
            timeline: [...currentTimeline, newEvent]
          });
        }
      }

      setSelectedOrderIds([]);
      alert(`Se actualizaron ${successCount} pedidos al estado: ${bulkStatus}`);
    } catch (error) {
      console.error("Error updating bulk orders:", error);
      alert("Hubo un error al realizar la actualización en conjunto.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Copy tracking link helper
  const handleCopyLink = (o: SpecialOrder) => {
    const link = `${getPublicOrigin()}/track/${o.id}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        setActiveToast({
          text: `¡Link copiado! El enlace único de seguimiento de ${o.client_name || 'Cliente'} se copió al portapapeles.`,
          link: link,
          id: o.id,
          order: o
        });
      })
      .catch(err => {
        console.error("No se pudo copiar el enlace:", err);
        setActiveToast({
          text: `Link copiado (error al portapapeles): ${link}`,
          link: link,
          id: o.id,
          order: o
        });
      });
  };

  // WhatsApp share web intent generator
  const handleSendWhatsAppUpdate = async (o: SpecialOrder) => {
    try {
      const response = await fetch(`/api/admin/special-orders/${o.id}/send-whatsapp`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.whatsapp_intent) {
          window.open(data.whatsapp_intent, '_blank', 'noopener,noreferrer');
          return;
        }
      }
    } catch (err) {
      console.error("Error generating WhatsApp intent via API:", err);
    }

    // Fallback in case of API failure or offline mode - NO public link included!
    const statusLabel = LOGISTICS_STATUS_OPTIONS.find(opt => opt.value === o.status)?.label || o.status;
    const defaultPhone = "593999106921";
    let rawPhone = o.client_whatsapp || o.client_phone || defaultPhone;
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "593" + cleanPhone.substring(1);
    }
    if (!cleanPhone) {
      cleanPhone = "593999106921";
    }

    const clientName = o.client_name || "Cliente";
    const total = o.totalCost || 0;
    const paid = o.paidAmount || 0;
    const pending = total - paid;
    const notesMsg = o.notes || "Ninguna";

    const message = `¡Hola ${clientName}! Tu pedido especial con ID ${o.id} ha sido registrado internamente en KEINSHOP.

Resumen de tu pedido:
📦 Artículos: ${o.itemsText || 'Detalle de importación'}
⚖️ Peso total: ${o.weightLbs + (o.additional_lbs || 0)} Lbs
💰 Total a pagar: $${total.toLocaleString('es-CO')}
💵 Abono realizado: $${paid.toLocaleString('es-CO')}
📉 Saldo pendiente: $${pending.toLocaleString('es-CO')}
⚠️ Estado actual: ${statusLabel}
📝 Notas: ${notesMsg}

¡Gracias por tu confianza!`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // CSV Exporter for special orders
  const handleExportCSV = () => {
    const headers = ['ID Pedido', 'Cliente', 'Celular', 'Estado Logistico', 'Estado Pago', 'Peso (Lbs)', 'Libras Adicionales', 'Total Venta (COP)', 'Abonado (COP)'];
    const rows = orders.map(o => [
      o.id,
      o.client_name || clients.find(c => c.id === o.clientId)?.name || 'N/A',
      o.client_phone || clients.find(c => c.id === o.clientId)?.phone || 'N/A',
      o.status,
      o.payment_status || (o.paidAmount >= o.totalCost ? 'PAGADO' : o.paidAmount > 0 ? 'ABONADO' : 'PENDIENTE'),
      o.weightLbs,
      o.additional_lbs || 0,
      o.totalCost,
      o.paidAmount
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pedidos_especiales_keinshop_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Run Gemini AI cost helper
  const runAiCostCalculator = async () => {
    setLoadingCalc(true);
    setCalcResult(null);
    try {
      const res = await fetch('/api/ai/calc-shein-temu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemsText: calcItems,
          weightLbs: calcWeight,
          baseCostUSD: calcUSD,
          feePerLb: calcFeePerLb,
          dollarExchangeRate: calcExchangeRate
        })
      });
      const data = await res.json();
      setCalcResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCalc(false);
    }
  };

  // Filters search matching
  const filteredOrders = orders.filter(o => {
    const isDeleted = o.deleted_at !== null && o.deleted_at !== undefined;
    if (!showArchived && isDeleted) return false;
    if (showArchived && !isDeleted) return false; // If viewing archives, only show deleted ones

    const clientName = (o.client_name || clients.find(c => c.id === o.clientId)?.name || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    const matchesSearch = o.id.toLowerCase().includes(query) || 
                          clientName.includes(query) || 
                          (o.itemsText && o.itemsText.toLowerCase().includes(query));
    
    const matchesStatus = selectedStatusFilter === 'TODOS' || o.status === selectedStatusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Sort descending by numeric part of ID (e.g. PE-003 > PE-002)
    const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    return numB - numA;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-[#050507]">Pedidos Especiales (Shein/Temu)</h2>
          <p className="text-xs text-gray-500 mt-1">Sube fotos, calcula fletes de importación, genera links y actualiza estados en tiempo real.</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Exportar CSV
          </button>

          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="bg-indigo-50 hover:bg-indigo-100 text-[#203180] font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 border border-indigo-150 transition-all active:scale-95"
          >
            <Calculator className="w-4 h-4" /> Calculadora Costo/Libra IA
          </button>
          
          {role !== 'Gestor de Contenido' && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-[#203180] text-white hover:bg-indigo-950 font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Registrar Importación
            </button>
          )}
        </div>
      </div>

      {/* AI Smart Cost calculator section */}
      {showCalculator && (
        <div className="bg-gradient-to-br from-[#203180] to-indigo-950 text-white p-6 rounded-3xl border border-indigo-900 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FF7AA6]" /> Calculadora Inteligente Shein/Temu
            </h3>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Calcula con total exactitud las libras, flete, TRM y aranceles aproximados recomendados por la IA.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-indigo-300 mb-1">Prendas a calcular</label>
                <input
                  type="text"
                  value={calcItems}
                  onChange={(e) => setCalcItems(e.target.value)}
                  className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-indigo-300 mb-1">Peso en Libras (Lbs)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(Number(e.target.value))}
                    className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-indigo-300 mb-1">Valor FOB USD ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={calcUSD}
                    onChange={(e) => setCalcUSD(Number(e.target.value))}
                    className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-indigo-300 mb-1">Tasa de Cambio (TRM)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={calcExchangeRate}
                    onChange={(e) => setCalcExchangeRate(Number(e.target.value))}
                    className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-indigo-300 mb-1">Tarifa Casillero / Libra</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={calcFeePerLb}
                    onChange={(e) => setCalcFeePerLb(Number(e.target.value))}
                    className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none font-mono"
                  />
                </div>
              </div>

              <button
                onClick={runAiCostCalculator}
                className="w-full bg-[#FF7AA6] hover:bg-pink-600 text-white font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                {loadingCalc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loadingCalc ? 'Calculando costos...' : 'Analizar Viabilidad IA'}
              </button>
            </div>
          </div>

          {/* Calculator Results Panel */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            {calcResult ? (
              <div className="space-y-4">
                <div className="border-b border-white/15 pb-3">
                  <span className="text-[10px] text-[#FF7AA6] font-bold block uppercase tracking-wider">Cálculo de Importación</span>
                  <h4 className="font-bold text-sm text-indigo-100">{calcResult.calculatedWeight} Libras x ${calcFeePerLb.toLocaleString('es-CO')} / Lb</h4>
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="text-gray-300">Flete Miami → Colombia:</span>
                    <span className="font-mono font-bold text-white">${calcResult.shippingCOP?.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-gray-300">Costo Base Artículos (TRM):</span>
                    <span className="font-mono text-white">${calcResult.itemCostCOP?.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-[#FF7AA6] mt-2 pt-2 border-t border-white/10">
                    <span>Costo Compra Total:</span>
                    <span>${calcResult.totalCostCOP?.toLocaleString('es-CO')} COP</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Precio Sugerido Venta:</span>
                    <span className="font-mono font-extrabold text-base text-green-400">${calcResult.suggestedPrice?.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Rango Comercial Recomendado:</span>
                    <span className="font-semibold text-white">{calcResult.recommendedPriceRange}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Margen Comercial Neto:</span>
                    <span className="font-bold text-green-400">~{calcResult.profitMarginPercentage}%</span>
                  </div>
                </div>

                <div className="p-3 bg-indigo-900/40 rounded-xl text-[11px] border border-indigo-800 leading-relaxed text-indigo-100">
                  <strong className="text-white block mb-0.5 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Consejo Logístico:
                  </strong>
                  {calcResult.logisticAdvice}
                </div>

                {role !== 'Gestor de Contenido' && (
                  <button
                    onClick={() => {
                      setItemsText(calcItems);
                      setWeightLbs(calcWeight);
                      setTotalCost(calcResult.suggestedPrice);
                      setPaidAmount(Math.round(calcResult.suggestedPrice * 0.5));
                      setCostPerLb(calcFeePerLb);
                      setTotalCostUsd(calcUSD);
                      setShowAddForm(true);
                    }}
                    className="w-full bg-white text-[#203180] hover:bg-gray-100 font-extrabold text-xs py-2 rounded-xl transition-all"
                  >
                    Cargar en Formulario
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full py-12 text-gray-300 space-y-2">
                <Calculator className="w-10 h-10 opacity-30" />
                <h4 className="font-bold text-sm text-white">Análisis de Viabilidad</h4>
                <p className="text-xs max-w-xs">Introduce el peso, el valor FOB en dólares y presiona "Analizar Viabilidad IA" para proyectar rentabilidades.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creation form with uploads & nested items */}
      {showAddForm && (
        <form onSubmit={handleCreateOrder} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6 animate-in slide-in-from-top duration-200">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <h3 className="font-black text-gray-900 text-sm">Registrar Pedido Especial de Importación</h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Column 1: Client & General data */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Datos del Cliente</h4>
              
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cliente en CRM (Opcional)</label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    const matched = clients.find(c => c.id === e.target.value);
                    if (matched) {
                      setManualClientName(matched.name);
                      setManualClientPhone(matched.phone);
                    }
                  }}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none"
                >
                  <option value="">-- No enlazado / Manual --</option>
                  {clients.map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.name} ({cl.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre Completo del Cliente *</label>
                <input
                  type="text"
                  value={manualClientName}
                  onChange={(e) => setManualClientName(e.target.value)}
                  required
                  placeholder="Ej: Valentina Gómez"
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Celular / Teléfono *</label>
                <input
                  type="text"
                  value={manualClientPhone}
                  onChange={(e) => setManualClientPhone(e.target.value)}
                  required
                  placeholder="Ej: +57 300 765 4321"
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Categoría de Origen</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOriginCategory('Shein')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        originCategory === 'Shein'
                          ? 'bg-black text-white border-black shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Shein
                    </button>
                    <button
                      type="button"
                      onClick={() => setOriginCategory('Temu')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        originCategory === 'Temu'
                          ? 'bg-[#FF5500] text-white border-[#FF5500] shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Temu
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Canal de Origen</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none"
                  >
                    <option value="WhatsApp Ingrith">WhatsApp Ingrith</option>
                    <option value="WhatsApp Kenneth">WhatsApp Kenneth</option>
                    <option value="WhatsApp KeinShop">WhatsApp KeinShop</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Messenger">Messenger</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Column 2: Items Builder & Photos */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Prendas & Fotos Reales</h4>
              
              {/* Nested Items builder */}
              <div className="border border-gray-150 rounded-2xl p-3 bg-gray-50 space-y-3">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Constructor de Items</span>
                
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="SKU" 
                      value={newSku} 
                      onChange={(e) => setNewSku(e.target.value)}
                      className="p-1.5 border border-gray-200 rounded bg-white text-xs"
                    />
                    <input 
                      type="number" 
                      placeholder="Cant" 
                      value={newQty} 
                      onChange={(e) => setNewQty(Number(e.target.value))}
                      className="p-1.5 border border-gray-200 rounded bg-white text-xs font-mono"
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Descripción (ej: Vestido Floral)" 
                    value={newDesc} 
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full p-1.5 border border-gray-200 rounded bg-white text-xs"
                  />
                  <input 
                    type="text" 
                    placeholder="Imagen URL (Opcional)" 
                    value={newImgUrl} 
                    onChange={(e) => setNewImgUrl(e.target.value)}
                    className="w-full p-1.5 border border-gray-200 rounded bg-white text-xs"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddItemToForm}
                    className="w-full bg-[#203180] text-white text-[10px] font-bold py-1.5 rounded hover:bg-indigo-900 transition-colors"
                  >
                    + Añadir Prenda al Listado
                  </button>
                </div>

                {/* Sub items rendered */}
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pt-2 border-t border-gray-200">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] bg-white p-1.5 rounded border border-gray-100">
                      <span className="font-medium truncate max-w-[150px]">{item.description} ({item.qty}x)</span>
                      <button type="button" onClick={() => handleRemoveItemFromForm(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <MultiImageUploader
                photos={uploadedPhotos}
                onChange={setUploadedPhotos}
                maxFiles={10}
                maxSizeMB={5}
              />

            </div>

            {/* Column 3: Logistics & Pricing */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Fletes & Precios (USD)</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Peso (Lbs) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={weightLbs}
                    onChange={(e) => setWeightLbs(Number(e.target.value))}
                    required
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Precio por Libra</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPerLb}
                    onChange={(e) => setCostPerLb(Number(e.target.value))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Costo Total (COP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioInicialProductos}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPrecioInicialProductos(val);
                    }}
                    className="w-full p-2 border border-gray-200 rounded-xl font-mono text-green-700 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Abono (COP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPaidAmount(val);
                    }}
                    className="w-full p-2 border border-gray-200 rounded-xl font-mono text-indigo-700 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Pendiente (COP)</label>
                  <input
                    type="number"
                    step="0.01"
                    readOnly
                    value={Number((precioInicialProductos - paidAmount).toFixed(2))}
                    className="w-full p-2 border border-gray-200 rounded-xl font-mono text-red-600 font-bold focus:outline-none bg-gray-50"
                  />
                </div>
              </div>

              {/* Automatic Calculation Preview Cards */}
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-[#203180] block tracking-wider">Cálculos Automáticos</span>
                <div className="flex justify-between">
                  <span className="text-gray-500">Costo Flete ({weightLbs} Lbs × ${costPerLb}):</span>
                  <span className="font-bold font-mono text-[#203180]">${(weightLbs * costPerLb).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Costo de los Productos:</span>
                  <span className="font-bold font-mono text-indigo-700">${(precioInicialProductos - (weightLbs * costPerLb)).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between border-t border-indigo-150 pt-2 text-gray-900 font-bold">
                  <span>Saldo Pendiente:</span>
                  <span className="font-mono text-[#FF7AA6]">${(precioInicialProductos - paidAmount).toFixed(2)} USD</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha Llegada Est.</label>
                  <input
                    type="date"
                    value={dateEstArrival}
                    onChange={(e) => setDateEstArrival(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lbs Extras / Vol.</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={additionalLbs}
                    onChange={(e) => setAdditionalLbs(Number(e.target.value))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Notas logísticas o de entrega</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej: Avisar por WhatsApp un día antes."
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

            </div>

          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-100 text-gray-700 font-bold text-xs py-2 px-4 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreatingOrder}
              className="bg-[#203180] text-white font-extrabold text-xs py-2 px-6 rounded-xl hover:bg-indigo-950 shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isCreatingOrder ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Creando y Publicando...
                </>
              ) : "Registrar en Seguimiento Logístico"}
            </button>
          </div>
        </form>
      )}

      {/* List Filters panel */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-gray-200 shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input 
            type="text" 
            placeholder="Buscar por ID, Cliente o prendas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-100 rounded-xl text-xs focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none items-center">
          {['TODOS', 'CREADO', 'EN_TRANSITO', 'EN_ADUANA', 'DESPACHO_ADUANERO', 'ENTREGADO'].map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                selectedStatusFilter === st 
                  ? 'bg-[#203180] text-white shadow' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st === 'TODOS' ? 'Todos' : st.replace('_', ' ')}
            </button>
          ))}
          <div className="h-6 w-[1px] bg-gray-250 mx-1 shrink-0"></div>
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
              showArchived 
                ? 'bg-[#FF7AA6] text-white shadow' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showArchived ? 'Ver Activos 📦' : 'Ver Archivados 🗄️'}
          </button>
        </div>
      </div>

      {/* Panel de Actualización en Conjunto (Bulk Actions) */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-[#203180] text-white p-5 rounded-3xl border border-indigo-950 shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between mb-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3">
            <span className="bg-[#FF7AA6] text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-sm">
              {selectedOrderIds.length} Seleccionados
            </span>
            <div>
              <h4 className="text-sm font-black tracking-wide">Editar Estado de Seguimiento en Conjunto</h4>
              <p className="text-[11px] text-indigo-200 mt-0.5">Actualizará el estado de los pedidos seleccionados en tiempo real.</p>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-3 items-center w-full md:w-auto">
            <div className="flex flex-col gap-1 w-full md:w-48">
              <span className="text-[9px] uppercase font-black text-indigo-300">Nuevo Estado</span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="w-full bg-indigo-950/40 border border-indigo-800 text-white rounded-xl text-xs p-2.5 font-bold focus:outline-none focus:ring-1 focus:ring-[#FF7AA6]"
              >
                {LOGISTICS_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-[#203180] text-white font-bold text-xs">{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full md:w-64">
              <span className="text-[9px] uppercase font-black text-indigo-300">Comentario del Timeline</span>
              <input
                type="text"
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="Ej. Despachado en lote desde Bogotá"
                className="w-full bg-indigo-950/40 border border-indigo-800 text-white placeholder-indigo-300 rounded-xl text-xs p-2.5 font-bold focus:outline-none focus:ring-1 focus:ring-[#FF7AA6]"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto self-end">
              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className="px-4 py-2.5 rounded-xl text-xs font-extrabold border border-indigo-750 text-indigo-200 hover:bg-indigo-900/50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={isBulkUpdating}
                className="px-6 py-2.5 bg-[#FF7AA6] hover:bg-pink-400 disabled:bg-pink-300 text-white font-black text-xs rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isBulkUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Aplicar a Todos"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders List / Tracking Dashboard Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-4 w-10 text-center">
                  <input
                    type="checkbox"
                    className="rounded text-[#203180] focus:ring-[#203180] h-4 w-4 border-gray-300 cursor-pointer"
                    checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrderIds(prev => {
                          const newIds = filteredOrders.map(o => o.id);
                          return Array.from(new Set([...prev, ...newIds]));
                        });
                      } else {
                        setSelectedOrderIds(prev => prev.filter(id => !filteredOrders.some(o => o.id === id)));
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-4">ID Pedido / Fecha</th>
                <th className="px-6 py-4">Cliente / Contacto</th>
                <th className="px-6 py-4">Detalles Prenda Shein/Temu</th>
                <th className="px-6 py-4">Libras / Flete</th>
                <th className="px-6 py-4">Costo Total</th>
                <th className="px-6 py-4">Estado Pago</th>
                <th className="px-6 py-4">Estado Logístico</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                    No se encontraron pedidos especiales con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const clientName = order.client_name || clients.find(c => c.id === order.clientId)?.name || 'Cliente';
                  const clientPhone = order.client_phone || clients.find(c => c.id === order.clientId)?.phone || 'N/A';
                  const pending = order.totalCost - order.paidAmount;
                  const paymentStatus = order.paidAmount >= order.totalCost ? 'PAGADO' : order.paidAmount > 0 ? 'ABONADO' : 'PENDIENTE';
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 w-10 text-center">
                        <input
                          type="checkbox"
                          className="rounded text-[#203180] focus:ring-[#203180] h-4 w-4 border-gray-300 cursor-pointer"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds(prev => [...prev, order.id]);
                            } else {
                              setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs block text-gray-900 font-extrabold">{order.id}</span>
                        <span className="text-[10px] text-gray-400 block font-mono">Ped: {order.dateOrdered}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900 block">{clientName}</span>
                        <span className="text-[10px] text-gray-400 block font-mono">{clientPhone}</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="text-[9px] uppercase font-black text-[#FF7AA6] tracking-wider">{order.source}</span>
                          {order.origin_category && (
                            <span className="text-[9px] uppercase font-black text-white bg-[#203180] px-1.5 py-0.5 rounded tracking-wide">
                              {order.origin_category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="font-medium text-gray-800 line-clamp-2 leading-relaxed">{order.itemsText}</p>
                        {order.notes && <p className="text-[10px] text-gray-400 italic truncate mt-0.5">Nota: "{order.notes}"</p>}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">
                        <div>{order.weightLbs} Lbs</div>
                        {order.additional_lbs ? <div className="text-orange-600 text-[10px] font-bold">+{order.additional_lbs} Lbs Vol.</div> : null}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-black text-gray-900">
                        <div>${order.totalCost.toLocaleString('es-CO')}</div>
                        {order.total_cost_usd ? <div className="text-[10px] text-gray-400">${order.total_cost_usd} USD</div> : null}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full ${
                          paymentStatus === 'PAGADO' ? 'bg-green-100 text-green-700' :
                          paymentStatus === 'ABONADO' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {paymentStatus}
                        </span>
                        <div className="text-[10px] text-gray-500 mt-1">Abono: ${order.paidAmount.toLocaleString('es-CO')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-150 text-[#203180] uppercase">
                          {order.status}
                        </span>
                        <div className="text-[9px] text-gray-400 mt-0.5">Actualizado: {order.last_update ? new Date(order.last_update).toLocaleDateString() : 'N/A'}</div>
                        <div className="mt-1">
                          {order.publish_status === 'published' ? (
                            <span className="inline-flex items-center text-[8px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">Público ✅</span>
                          ) : order.publish_status === 'failed' ? (
                            <span className="inline-flex items-center text-[8px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">Error publicación ⚠️</span>
                          ) : (
                            <span className="inline-flex items-center text-[8px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">Borrador 📝</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 items-end justify-end">
                          
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleOpenStatusModal(order)}
                              className="bg-[#203180]/5 hover:bg-[#203180]/15 text-[#203180] font-black text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                              title="Actualizar estado logístico"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Estado
                            </button>

                            <button
                              onClick={() => {
                                const amt = Number(prompt(`Monto a abonar/pagar ($): (Pendiente: $${pending.toLocaleString('es-CO')})`, pending.toString()));
                                if (amt && !isNaN(amt)) {
                                  handleRegisterPayment(order, amt);
                                }
                              }}
                              className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all"
                              title="Registrar Abono"
                            >
                              $ Abono
                            </button>
                          </div>

                          <div className="flex gap-1">
                            <button
                              onClick={() => handleCopyLink(order)}
                              className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all justify-center cursor-pointer"
                              title="Copiar enlace de seguimiento"
                            >
                              <Copy className="w-3.5 h-3.5" /> Copiar Link
                            </button>
                          </div>

                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSendWhatsAppUpdate(order)}
                              className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-black text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all flex-1 justify-center cursor-pointer"
                              title="Enviar por WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" /> Enviar por WhatsApp
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOrderToDelete(order);
                                setDeleteMode('soft');
                                setDeleteReason('Cliente canceló el pedido');
                                setCustomDeleteReason('');
                                setShowDeleteModal(true);
                              }}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-extrabold text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                              title="Eliminar Pedido"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Eliminar
                            </button>
                          </div>



                          {onScheduleInCalendar && (
                            <button
                              onClick={() => onScheduleInCalendar(order)}
                              className="text-gray-400 hover:text-[#203180] font-bold text-[9px] hover:underline"
                            >
                              Agendar entrega en calendario
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update logistics status and info edit modal */}
      {showStatusModal && editingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-[#203180]" /> Editar Pedido Especial
              </h3>
              <button onClick={handleCloseStatusModal} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[75vh] space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Column 1: Core Logistics & Status */}
                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-gray-500" /> Estado & Timeline
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-2xl space-y-1">
                    <div>
                      <span className="font-bold text-gray-500">ID de Pedido:</span> <span className="font-mono font-black text-gray-900">{editingOrder.id}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre Cliente</label>
                      <input
                        type="text"
                        value={editClientName}
                        onChange={(e) => setEditClientName(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">WhatsApp Cliente</label>
                      <input
                        type="text"
                        value={editClientWhatsapp}
                        onChange={(e) => setEditClientWhatsapp(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Categoría de Origen</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditOriginCategory('Shein')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          editOriginCategory === 'Shein'
                            ? 'bg-black text-white border-black shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Shein
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditOriginCategory('Temu')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          editOriginCategory === 'Temu'
                            ? 'bg-[#FF5500] text-white border-[#FF5500] shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Temu
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Estado Logístico *</label>
                    <select
                      value={newLogisticsStatus}
                      onChange={(e) => setNewLogisticsStatus(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:outline-none"
                    >
                      {LOGISTICS_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Comentario para el Timeline Público</label>
                    <textarea
                      value={statusChangeNote}
                      onChange={(e) => setStatusChangeNote(e.target.value)}
                      rows={2}
                      placeholder="Ej: Llegó al país, proceso de internación aduanera listo."
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Notas Internas Logísticas</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      placeholder="Notas del pedido o logística..."
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha Llegada Est.</label>
                    <input
                      type="date"
                      value={editDateEstArrival}
                      onChange={(e) => setEditDateEstArrival(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Column 2: Dimensions, Finances, & Photos */}
                <div className="space-y-4">
                  
                  {/* Items builder */}
                  <div className="border border-gray-150 rounded-2xl p-3 bg-gray-50 space-y-3">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Constructor de Items</span>
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder="SKU" 
                          value={newSku} 
                          onChange={(e) => setNewSku(e.target.value)}
                          className="p-1.5 border border-gray-200 rounded bg-white text-xs"
                        />
                        <input 
                          type="number" 
                          placeholder="Cant" 
                          value={newQty} 
                          onChange={(e) => setNewQty(Number(e.target.value))}
                          className="p-1.5 border border-gray-200 rounded bg-white text-xs font-mono"
                        />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Descripción (ej: Vestido Floral)" 
                        value={newDesc} 
                        onChange={(e) => setNewDesc(e.target.value)}
                        className="w-full p-1.5 border border-gray-200 rounded bg-white text-xs"
                      />
                      <input 
                        type="text" 
                        placeholder="Imagen URL (Opcional)" 
                        value={newImgUrl} 
                        onChange={(e) => setNewImgUrl(e.target.value)}
                        className="w-full p-1.5 border border-gray-200 rounded bg-white text-xs"
                      />
                      <button 
                        type="button" 
                        onClick={handleAddItemToEditForm}
                        className="w-full bg-[#203180] text-white text-[10px] font-bold py-1.5 rounded hover:bg-indigo-900 transition-colors"
                      >
                        + Añadir Prenda al Listado
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pt-2 border-t border-gray-200">
                      {editFormItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] bg-white p-1.5 rounded border border-gray-100">
                          <span className="font-medium truncate max-w-[150px]">{item.description} ({item.qty}x)</span>
                          <button type="button" onClick={() => handleRemoveItemFromEditForm(idx)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {editFormItems.length === 0 && (
                        <div className="text-center text-gray-400 py-2 text-[10px]">Sin prendas individuales</div>
                      )}
                    </div>
                  </div>

                  <h4 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-gray-500" /> Fletes, Valores & Fotos
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Peso (Lbs)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editWeightLbs}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditWeightLbs(val);
                          setEditFreightCost(Number(((val + editAdditionalLbs) * editCostPerLb).toFixed(2)));
                        }}
                        className="w-full p-2 border border-gray-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lbs Extras</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editAdditionalLbs}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditAdditionalLbs(val);
                          setEditFreightCost(Number(((editWeightLbs + val) * editCostPerLb).toFixed(2)));
                        }}
                        className="w-full p-2 border border-gray-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tarifa por Lb</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editCostPerLb}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditCostPerLb(val);
                          setEditFreightCost(Number(((editWeightLbs + editAdditionalLbs) * val).toFixed(2)));
                        }}
                        className="w-full p-2 border border-gray-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Costo de Libras (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editFreightCost}
                        onChange={(e) => setEditFreightCost(Number(e.target.value))}
                        className="w-full p-2 border border-gray-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Costo Total (COP)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editTotalCost}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditTotalCost(val);
                          setEditPendingBalance(Number((val - editPaidAmount).toFixed(2)));
                        }}
                        className="w-full p-2 border border-gray-200 rounded-xl font-mono text-green-700 font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Abono (COP)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editPaidAmount}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditPaidAmount(val);
                          setEditPendingBalance(Number((editTotalCost - val).toFixed(2)));
                        }}
                        className="w-full p-2 border border-gray-200 rounded-xl font-mono text-indigo-700 font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Pendiente (COP)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editPendingBalance}
                        onChange={(e) => setEditPendingBalance(Number(e.target.value))}
                        className="w-full p-2 border border-gray-200 rounded-xl font-mono text-red-600 font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Fotos del Producto</label>
                    <MultiImageUploader
                      photos={editPhotos}
                      onChange={setEditPhotos}
                      maxFiles={10}
                      maxSizeMB={5}
                    />
                  </div>
                </div>

              </div>

              <div className="bg-indigo-50 border border-indigo-100 text-[#203180] p-3 rounded-2xl flex gap-1.5 leading-relaxed text-[10px]">
                <Info className="w-4 h-4 shrink-0" />
                <span>Esta información se sincronizará de forma instantánea en la base de datos interna de KEINSHOP.</span>
              </div>

              {editingOrder.audit_history && editingOrder.audit_history.length > 0 && (
                <div className="bg-gray-50 border border-gray-150 p-3.5 rounded-2xl space-y-2">
                  <h5 className="font-extrabold text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-gray-500" /> Historial de Auditoría Interna (Registro de Cambios)
                  </h5>
                  <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
                    {editingOrder.audit_history.slice().reverse().map((audit, idx) => (
                      <div key={idx} className="flex justify-between items-start text-[10px] border-b border-gray-100 pb-1.5 last:border-b-0 last:pb-0 font-mono">
                        <div className="space-y-0.5">
                          <span className="font-bold text-gray-700 uppercase bg-gray-200 px-1.5 py-0.5 rounded text-[8px] mr-1.5">{audit.campo_editado}</span>
                          <span className="text-gray-600">Nuevo valor: <span className="text-[#203180] font-bold">{audit.valor_nuevo}</span></span>
                        </div>
                        <div className="text-right text-gray-400 text-[9px] shrink-0">
                          <div className="font-semibold text-gray-500">{audit.usuario}</div>
                          <div>{audit.fecha} {audit.hora}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={handleCloseStatusModal}
                className="bg-white border border-gray-200 text-gray-700 font-bold text-xs py-2 px-4 rounded-xl hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (hasPendingChanges()) {
                    setShowSaveConfirmModal(true);
                  } else {
                    handleSaveStatusUpdate();
                  }
                }}
                className="bg-[#203180] text-white font-extrabold text-xs py-2 px-5 rounded-xl hover:bg-indigo-900 shadow-md transition-all active:scale-95"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Modal */}
      {showSaveConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-50 text-[#203180] rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Check className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-sm text-gray-900">¿Guardar Cambios del Pedido?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Esta acción actualizará la base de datos de forma inmediata y permanente. Se registrará un historial de auditoría de los campos modificados.
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowSaveConfirmModal(false)}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Regresar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSaveStatusUpdate();
                    setShowSaveConfirmModal(false);
                  }}
                  className="flex-1 bg-[#203180] text-white font-extrabold py-2 px-4 rounded-xl hover:bg-indigo-900 shadow-md transition-all active:scale-95"
                >
                  Confirmar y Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-sm text-gray-900">¿Descartar Cambios?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Hay modificaciones sin guardar en el pedido especial. Si cancelas ahora, todos los cambios se perderán de forma permanente.
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirmModal(false)}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Continuar Editando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelConfirmModal(false);
                    setShowStatusModal(false);
                    setEditingOrder(null);
                  }}
                  className="flex-1 bg-red-600 text-white font-extrabold py-2.5 px-4 rounded-xl hover:bg-red-700 shadow-md transition-all active:scale-95"
                >
                  Sí, Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notificación para Registro / Publicación de Pedido */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 bg-[#050507] text-white p-4 rounded-2xl shadow-2xl border border-white/10 z-50 flex flex-col gap-2.5 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex gap-3 items-center justify-between">
            <div className="space-y-1 pr-4">
              <p className="text-xs font-extrabold text-[#25D366] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> ¡Link copiado!
              </p>
              <p className="text-[11px] text-gray-300 leading-tight">
                {activeToast.text}
              </p>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-gray-400 hover:text-white text-xs px-1.5 font-bold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
          {activeToast.order && (
            <div className="flex flex-col gap-2 border-t border-white/5 pt-2">
              <button
                onClick={() => {
                  handleSendWhatsAppUpdate(activeToast.order!);
                }}
                className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-black text-xs font-extrabold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Enviar enlace por WhatsApp al cliente"
              >
                <Send className="w-3.5 h-3.5 fill-black" /> Enviar por WhatsApp
              </button>
              
              {activeToast.link && (
                <div className="flex gap-1.5 justify-between">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeToast.link!);
                      alert("¡Enlace de seguimiento vuelto a copiar!");
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold py-1 rounded-lg border border-white/10 transition-all cursor-pointer"
                  >
                    Volver a Copiar
                  </button>
                  <button
                    onClick={() => window.open(activeToast.link, '_blank')}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold py-1 rounded-lg border border-white/10 transition-all cursor-pointer"
                  >
                    Ver Vista Previa
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmación de Eliminación (Soft / Hard) */}
      {showDeleteModal && orderToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
              <h3 className="font-black text-sm text-red-700 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-red-600" /> Confirmar Eliminación de Pedido
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-150">
                <p className="font-bold text-gray-700">Pedido: <span className="font-mono text-indigo-700">{orderToDelete.id}</span></p>
                <p className="font-bold text-gray-700 mt-1">Cliente: <span className="text-gray-900">{orderToDelete.client_name || 'Cliente'}</span></p>
                <p className="text-gray-400 text-[10px] mt-2 line-clamp-2 italic">Prendas: {orderToDelete.itemsText}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-600 uppercase">Tipo de Eliminación</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteMode('soft')}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      deleteMode === 'soft'
                        ? 'border-red-200 bg-red-50/50 text-red-700 font-extrabold shadow-sm'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <span className="text-xs font-black">Archivar (Soft Delete)</span>
                    <span className="text-[9px] font-normal text-gray-400">Mantiene historial interno, desactiva enlace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteMode('hard')}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      deleteMode === 'hard'
                        ? 'border-red-600 bg-red-100/30 text-red-800 font-extrabold shadow-sm'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <span className="text-xs text-red-600 font-black">Eliminar Permanente</span>
                    <span className="text-[9px] font-normal text-gray-400">Borra permanentemente de la base de datos</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-600 uppercase">Motivo de Eliminación</label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none"
                >
                  <option value="Cliente canceló el pedido">Cliente canceló el pedido</option>
                  <option value="Error en digitación o registro duplicado">Error en digitación o registro duplicado</option>
                  <option value="Falta de pago o abono del saldo">Falta de pago o abono del saldo</option>
                  <option value="Otro motivo">Otro motivo</option>
                </select>
              </div>

              {deleteReason === 'Otro motivo' && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Especificar Motivo</label>
                  <textarea
                    value={customDeleteReason}
                    onChange={(e) => setCustomDeleteReason(e.target.value)}
                    rows={2}
                    placeholder="Escribe el motivo detallado de la eliminación..."
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-2xl flex gap-1.5 leading-relaxed text-[10px]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {deleteMode === 'soft'
                    ? 'Esta acción archivará de forma inmediata el pedido en la sección de "Archivados".'
                    : '¡CUIDADO! Esta acción es irreversible y eliminará de forma permanente el registro del pedido de la base de datos.'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="bg-white border border-gray-200 text-gray-700 font-bold text-xs py-2 px-4 rounded-xl hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteOrder && orderToDelete) {
                    const finalReason = deleteReason === 'Otro motivo' ? (customDeleteReason || 'Otro motivo') : deleteReason;
                    onDeleteOrder(orderToDelete.id, deleteMode, finalReason);
                  }
                  setShowDeleteModal(false);
                  setOrderToDelete(null);
                }}
                className="bg-red-600 text-white font-extrabold text-xs py-2 px-5 rounded-xl hover:bg-red-700 shadow-md transition-all active:scale-95"
              >
                {deleteMode === 'soft' ? 'Archivar Pedido' : 'Eliminar Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
