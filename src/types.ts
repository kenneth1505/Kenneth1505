export interface ProductImage {
  url: string;
  thumburl?: string;
  order: number;
  isprimary?: boolean;
  storage_key?: string;
  file_name?: string;
}

export interface Product {
  sku: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  priceBuy: number;
  priceSell: number;
  imageUrl: string;
  visible: boolean;
  description?: string;
  sizes?: string[];
  colors?: string[];
  deleted_at?: string;
  deletedby?: string;
  deleted_reason?: string;
  status?: 'active' | 'inactive';
  version?: number;
  updated_at?: string;
  images?: ProductImage[];
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  deletedby?: string;
  deleted_reason?: string;
  version?: number;
}

export interface OrderItem {
  sku: string;
  description: string;
  qty: number;
  image_urls?: string[];
}

export interface TimelineEvent {
  status: string;
  timestamp: string;
  note: string;
  updated_by: string;
}

export interface SpecialOrder {
  id: string;
  clientId: string;
  itemsText: string;
  weightLbs: number;
  totalCost: number;
  paidAmount: number;
  status: string;
  dateOrdered: string;
  dateEstArrival: string;
  costPerLb: number;
  client_name?: string;
  client_phone?: string;
  payment_status?: 'PENDIENTE' | 'ABONADO' | 'PAGADO';
  additional_lbs?: number;
  source?: 'Instagram' | 'WhatsApp' | 'Messenger' | 'Otro' | 'WhatsApp Ingrith' | 'WhatsApp Kenneth' | 'WhatsApp KeinShop' | string;
  origin_category?: 'Shein' | 'Temu' | string;
  items?: OrderItem[];
  photos?: string[];
  total_cost_usd?: number;
  created_by?: string;
  tracking_link_public?: string;
  last_update?: string;
  notes?: string;
  timeline?: TimelineEvent[];
  
  // Detailed tracking fields
  client_whatsapp?: string;
  origin_channel?: 'Instagram' | 'WhatsApp' | 'Messenger' | 'Otro';
  initial_products_cost?: number;
  initial_payment?: number;
  freight_cost?: number;
  publish_status?: 'draft' | 'publishing' | 'published' | 'failed';
  request_id?: string;
  tracking_token?: string;
  tracking_link?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deleted_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
  pending_balance?: number;
  comentariotimelinepublico?: string;
  audit_history?: {
    usuario: string;
    fecha: string;
    hora: string;
    campo_editado: string;
    valor_nuevo: string;
  }[];
}

export interface Transaction {
  id: string;
  date: string;
  type: 'Ingreso' | 'Egreso';
  category: string;
  amount: number;
  description: string;
  orderId?: string;
  deleted_at?: string;
  deletedby?: string;
  deletedreason?: string;
  version?: number;
  updated_at?: string;
  is_demo?: boolean;
  isdemo?: boolean;
  is_mock?: boolean;
  is_simulated?: boolean;
}

export interface Publication {
  id: string;
  title: string;
  date: string;
  time: string;
  channel: 'Instagram' | 'TikTok' | 'Facebook' | 'Pinterest';
  copy: string;
  imageUrl: string;
  hashtags: string[];
  status: 'Borrador' | 'Programado' | 'Publicado';
  eventType?: 'content' | 'delivery' | 'admin';
  clientId?: string;
  orderId?: string;
  reminderConfig?: string;
  responsible?: string;
  notificationConfig?: string;
  whatsapp?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
}

export interface AIRecommendation {
  id: string;
  type: 'marketing' | 'finance' | 'admin' | 'inventory';
  title: string;
  text: string;
  status: 'Pendiente' | 'Aplicado' | 'Descartado';
  date: string;
  version: number;
  adjustment?: string;
}

export type UserRole = 'Admin' | 'Vendedor' | 'Gestor de Contenido';
