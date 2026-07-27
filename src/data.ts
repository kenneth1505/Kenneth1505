import { Product, Client, SpecialOrder, Transaction, Publication, AuditLog, AIRecommendation } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    sku: "KS-V-001",
    name: "Camiseta Oversize Heavyweight KEIN",
    category: "Vestuario",
    stock: 45,
    minStock: 10,
    priceBuy: 12.50,
    priceSell: 29.99,
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=60",
    visible: true,
    description: "Nuestra clásica camiseta de corte extra relajado (oversized), fabricada con algodón de 240g de alta densidad. Suave al tacto y sumamente resistente al lavado regular.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Negro", "Blanco", "Gris Ácido"]
  },
  {
    sku: "KS-A-002",
    name: "Gorra Trucker Retro Kein Blue",
    category: "Accesorios",
    stock: 8,
    minStock: 12, // Low stock alert!
    priceBuy: 6.00,
    priceSell: 15.00,
    imageUrl: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&auto=format&fit=crop&q=60",
    visible: true,
    description: "Gorra de malla estilo camionero vintage con el logo KEIN bordado en relieve 3D en la parte frontal. Visera semicurvada y broche de presión ajustable.",
    sizes: ["Estándar"],
    colors: ["Azul Real", "Blanco/Azul"]
  },
  {
    sku: "KS-C-003",
    name: "Sneakers Urban Streetwear Max",
    category: "Calzado",
    stock: 22,
    minStock: 5,
    priceBuy: 35.00,
    priceSell: 85.00,
    imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&auto=format&fit=crop&q=60",
    visible: true,
    description: "Tenis de plataforma urbana diseñados con gamuza sintética duradera y malla transpirable. Suela de caucho vulcanizado de máxima tracción y plantilla acolchada de memory foam.",
    sizes: ["38", "39", "40", "41", "42"],
    colors: ["Blanco Puro", "Gris/Negro"]
  },
  {
    sku: "KS-V-004",
    name: "Hoodie Kein Logo Bordado Negro",
    category: "Vestuario",
    stock: 50,
    minStock: 15,
    priceBuy: 18.00,
    priceSell: 45.00,
    imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300&auto=format&fit=crop&q=60",
    visible: true,
    description: "Sudadera premium con capucha forrada, bolsillo tipo canguro y cordón de ajuste con puntas metálicas. Confeccionada con algodón afelpado ideal para climas fríos.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Negro Carbón", "Gris Melange"]
  },
  {
    sku: "KS-A-005",
    name: "Morral Impermeable Urbano",
    category: "Accesorios",
    stock: 3,
    minStock: 5, // Low stock!
    priceBuy: 15.00,
    priceSell: 38.00,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&auto=format&fit=crop&q=60",
    visible: false, // Hidden from catalog initially
    description: "Morral de diseño minimalista con compartimento acolchado para laptop de hasta 16 pulgadas. Fabricado con tela oxford impermeable de alta gama y cierres herméticos.",
    sizes: ["Mediano"],
    colors: ["Negro Matte", "Verde Militar"]
  },
  {
    sku: "KS-V-006",
    name: "Pantalón Cargo Ajustable Beige",
    category: "Vestuario",
    stock: 14,
    minStock: 8,
    priceBuy: 14.50,
    priceSell: 34.99,
    imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&auto=format&fit=crop&q=60",
    visible: true,
    description: "Pantalón cargo de tela ripstop elástica y ultra resistente. Cuenta con seis bolsillos utilitarios y pretina elástica con cordón de ajuste interno para máxima comodidad urbana.",
    sizes: ["30", "32", "34", "36"],
    colors: ["Beige Arena", "Negro"]
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: "CL-001",
    name: "Mateo Rodríguez",
    phone: "+57 312 456 7890",
    email: "mateo@example.com",
    notes: "Prefiere envíos nacionales por Coordinadora. Talla L/XL."
  },
  {
    id: "CL-002",
    name: "Valentina Gómez",
    phone: "+57 300 765 4321",
    email: "vale.gomez@example.com",
    notes: "Cliente recurrente de pedidos Shein. Paga siempre puntual por Nequi."
  },
  {
    id: "CL-003",
    name: "Juan David Castro",
    phone: "+57 315 987 6543",
    email: "jd.castro@example.com",
    notes: "Le gustan los hoodies oversize y gorras trucker."
  },
  {
    id: "CL-004",
    name: "Camila Restrepo",
    phone: "+57 310 111 2222",
    email: "camila@example.com",
    notes: "Pedidos especiales Temu de maquillaje y decoración."
  }
];

export const INITIAL_SPECIAL_ORDERS: SpecialOrder[] = [
  {
    id: "PE-001",
    clientId: "CL-002",
    client_name: "Valentina Gómez",
    client_phone: "+57 300 765 4321",
    itemsText: "Vestido Shein Verano Floral (2x), Sandalias Shein Pink (1x)",
    weightLbs: 3.2,
    additional_lbs: 0.5,
    totalCost: 120000,
    paidAmount: 60000,
    status: "EN_TRANSITO",
    payment_status: "ABONADO",
    source: "WhatsApp",
    total_cost_usd: 24,
    created_by: "Ken Israel (Admin)",
    dateOrdered: "2026-06-20",
    dateEstArrival: "2026-07-05",
    costPerLb: 12000,
    notes: "Entregar preferiblemente en horario de la tarde.",
    photos: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400"
    ],
    items: [
      { sku: "SH-VES-01", description: "Vestido Shein Verano Floral", qty: 2, image_urls: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400"] },
      { sku: "SH-SAN-02", description: "Sandalias Shein Pink", qty: 1, image_urls: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400"] }
    ],
    timeline: [
      { status: "CREADO", timestamp: "2026-06-20T10:00:00Z", note: "Pedido registrado con abono del 50%. Procesado en Shein.", updated_by: "Ken Israel (Admin)" },
      { status: "EN_TRANSITO", timestamp: "2026-06-22T14:30:00Z", note: "El pedido ha salido del centro logístico internacional hacia Miami.", updated_by: "Ken Israel (Admin)" }
    ]
  },
  {
    id: "PE-002",
    clientId: "CL-004",
    client_name: "Camila Restrepo",
    client_phone: "+57 310 111 2222",
    itemsText: "Kit Brochas Maquillaje Temu, Luces LED Cuarto Temu",
    weightLbs: 1.5,
    additional_lbs: 0.2,
    totalCost: 75000,
    paidAmount: 75000,
    status: "DESPACHO_ADUANERO",
    payment_status: "PAGADO",
    source: "Instagram",
    total_cost_usd: 15,
    created_by: "Ken Israel (Admin)",
    dateOrdered: "2026-06-22",
    dateEstArrival: "2026-07-07",
    costPerLb: 12000,
    notes: "Viene en caja de regalo.",
    photos: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400"
    ],
    items: [
      { sku: "TM-BRU-09", description: "Kit Brochas Maquillaje Temu", qty: 1, image_urls: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400"] },
      { sku: "TM-LED-04", description: "Luces LED Cuarto Temu", qty: 1 }
    ],
    timeline: [
      { status: "CREADO", timestamp: "2026-06-22T09:00:00Z", note: "Pedido registrado con pago completo.", updated_by: "Ken Israel (Admin)" },
      { status: "EN_TRANSITO", timestamp: "2026-06-23T11:00:00Z", note: "Pedido consolidado y enviado por casillero aéreo.", updated_by: "Ken Israel (Admin)" },
      { status: "EN_ADUANA", timestamp: "2026-06-24T08:00:00Z", note: "Retenido temporalmente para inspección de aduanas.", updated_by: "Ken Israel (Admin)" },
      { status: "DESPACHO_ADUANERO", timestamp: "2026-06-24T12:00:00Z", note: "Aprobado el despacho de aduana, listo para entrega local.", updated_by: "Ken Israel (Admin)" }
    ]
  },
  {
    id: "PE-003",
    clientId: "CL-001",
    client_name: "Mateo Rodríguez",
    client_phone: "+57 312 456 7890",
    itemsText: "Jersey Streetwear Shein Oversized",
    weightLbs: 2.0,
    additional_lbs: 0.0,
    totalCost: 110000,
    paidAmount: 0,
    status: "CREADO",
    payment_status: "PENDIENTE",
    source: "WhatsApp",
    total_cost_usd: 21,
    created_by: "Ken Israel (Admin)",
    dateOrdered: "2026-06-24",
    dateEstArrival: "2026-07-10",
    costPerLb: 12000,
    notes: "Solicito envío por Coordinadora.",
    photos: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400"
    ],
    items: [
      { sku: "SH-JER-99", description: "Jersey Streetwear Shein Oversized", qty: 1, image_urls: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400"] }
    ],
    timeline: [
      { status: "CREADO", timestamp: "2026-06-24T14:00:00Z", note: "Pedido especial creado, en espera de abono inicial.", updated_by: "Ken Israel (Admin)" }
    ]
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "TX-001",
    date: "2026-06-20",
    type: "Ingreso",
    category: "Venta Directa",
    amount: 85000,
    description: "Venta de Sneakers KS-C-003 (Abono Mateo)"
  },
  {
    id: "TX-002",
    date: "2026-06-21",
    type: "Egreso",
    category: "Compra Inventario",
    amount: 150000,
    description: "Reabastecimiento de Camisetas Oversize (Proveedor Nacional)"
  },
  {
    id: "TX-003",
    date: "2026-06-22",
    type: "Ingreso",
    category: "Pedido Especial (Shein/Temu)",
    amount: 60000,
    description: "Abono 50% Pedido PE-001 - Valentina Gómez"
  },
  {
    id: "TX-004",
    date: "2026-06-22",
    type: "Ingreso",
    category: "Pedido Especial (Shein/Temu)",
    amount: 75000,
    description: "Pago Completo Pedido PE-002 - Camila Restrepo"
  },
  {
    id: "TX-005",
    date: "2026-06-23",
    type: "Egreso",
    category: "Marketing & Publicidad",
    amount: 45000,
    description: "Instagram Ads Campaña Colección Invierno"
  },
  {
    id: "TX-006",
    date: "2026-06-24",
    type: "Egreso",
    category: "Servicios/Suscripciones",
    amount: 25000,
    description: "Hosting & Dominio Keinshop"
  }
];

export const INITIAL_PUBLICATIONS: Publication[] = [
  {
    id: "PUB-001",
    title: "Lanzamiento Colección Invierno '26",
    date: "2026-06-26",
    time: "18:30",
    channel: "Instagram",
    copy: "Frío afuera, pero con el mejor streetwear urbano de KEINSHOP. Descubre nuestra nueva Hoodie Kein Logo Bordado. Unidades muy limitadas. Escríbenos al DM para reservar antes de que se agoten! ❄️🔥",
    imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&auto=format&fit=crop&q=60",
    hashtags: ["Keinshop", "Streetwearcolombia", "Oversizedhoodie", "Estilourbano", "Moda2026"],
    status: "Programado"
  },
  {
    id: "PUB-002",
    title: "TikTok Challenge: Outfit del Día",
    date: "2026-06-25",
    time: "17:00",
    channel: "TikTok",
    copy: "Cómo combinar nuestra Camiseta Oversize Heavyweight Kein con los nuevos pantalones Cargo Beige. Comenta cuál es tu talla ideal! ✌️⚡️",
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60",
    hashtags: ["streetwearstyle", "outfitinspo", "grwm", "modaurbana", "keinstyle"],
    status: "Borrador"
  },
  {
    id: "PUB-003",
    title: "Promo de Mitad de Año: Gorras Trucker",
    date: "2026-06-23",
    time: "12:00",
    channel: "Facebook",
    copy: "Llévate tu Gorra Trucker Kein Blue con 15% de descuento durante esta semana. Un toque retro indispensable para tu outfit diario.",
    imageUrl: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=60",
    hashtags: ["KeinCaps", "TruckerHat", "PromoKein", "ModaColombia"],
    status: "Publicado"
  }
];

export const INITIAL_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: "REC-001",
    type: "inventory",
    title: "Reabastecimiento Crítico: Gorras Trucker",
    text: "Alta demanda en categoría Accesorios. El stock actual de 'Gorra Trucker Retro Kein Blue' (8 unidades) está por debajo de su mínimo óptimo (12 unidades). Recomendamos adquirir un lote de 20 unidades antes del fin de semana.",
    status: "Pendiente",
    date: "2026-06-24",
    version: 1
  },
  {
    id: "REC-002",
    type: "marketing",
    title: "Campaña Reels: Sneakers Urban Streetwear",
    text: "El producto 'Sneakers Urban Streetwear Max' tiene el margen de ganancia más alto ($50.00 COP/USD). Sugerimos publicar un video corto en Instagram/TikTok mostrando detalles de costura y comodidad los viernes a las 6:30 PM.",
    status: "Pendiente",
    date: "2026-06-24",
    version: 1
  },
  {
    id: "REC-003",
    type: "finance",
    title: "Optimización de Costos de Envío por Libra",
    text: "Detectamos que estás pagando $12,000 COP por libra en envíos de Shein/Temu. Si agrupas los pedidos en consolidadores de más de 15 libras, el costo desciende a $9,500 por libra. Esto incrementaría tu rentabilidad neta en un 4.5%.",
    status: "Pendiente",
    date: "2026-06-23",
    version: 1
  },
  {
    id: "REC-004",
    type: "admin",
    title: "Seguimiento a Pagos Pendientes - Juan David Castro",
    text: "Juan David Castro tiene un pedido especial pendiente 'PE-003' con costo total de $110,000, sin abono registrado y fecha estimada de llegada 2026-07-10. Sugerimos enviarle un recordatorio automatizado por WhatsApp para solicitar un abono mínimo del 50%.",
    status: "Pendiente",
    date: "2026-06-24",
    version: 1
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "LOG-001",
    timestamp: "2026-06-24T10:15:30-07:00",
    user: "Ken Israel (Admin)",
    action: "Creación de producto: 'Camiseta Oversize Heavyweight KEIN'",
    module: "Inventario"
  },
  {
    id: "LOG-002",
    timestamp: "2026-06-24T11:02:15-07:00",
    user: "Mateo Content (Gestor)",
    action: "Cambió estado de publicación 'Lanzamiento Colección Invierno' a Programado",
    module: "Calendario"
  },
  {
    id: "LOG-003",
    timestamp: "2026-06-24T12:20:00-07:00",
    user: "Sonia Seller (Vendedor)",
    action: "Registró abono de $60.000 para Pedido Especial PE-001",
    module: "Pedidos"
  }
];
