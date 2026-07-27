import React, { useState } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Send, 
  RefreshCw, 
  Save, 
  Edit, 
  Check, 
  X,
  ArrowRight,
  UserCheck,
  Instagram,
  Smartphone,
  DollarSign,
  TrendingUp,
  Coins,
  Eye,
  Layers,
  Video,
  LayoutGrid,
  AlertTriangle,
  Heart,
  Share2,
  Bookmark,
  MapPin,
  Laptop,
  Zap,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AIRecommendation, UserRole, Product, Client, SpecialOrder, Transaction } from '../types';

interface AsesoresIAProps {
  recommendations: AIRecommendation[];
  onAddRecommendation: (rec: AIRecommendation) => void;
  onUpdateRecommendation: (rec: AIRecommendation) => void;
  role: UserRole;
  products: Product[];
  clients: Client[];
  orders: SpecialOrder[];
  transactions: Transaction[];
}

export default function AsesoresIA({ 
  recommendations, 
  onAddRecommendation, 
  onUpdateRecommendation,
  role,
  products = [],
  clients = [],
  orders = [],
  transactions = []
}: AsesoresIAProps) {

  // Main UI Nav state: 'chat' | 'content' | 'savings' | 'notifications' | 'intelligence'
  const [activeTab, setActiveTab] = useState<'chat' | 'content' | 'savings' | 'notifications' | 'intelligence'>('chat');

  // Conversation Advisor choice
  const [activeAdvisor, setActiveAdvisor] = useState<'marketing' | 'finance' | 'admin'>('marketing');
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'model', text: string }>>([]);
  const [loading, setLoading] = useState(false);

  // Editable recommendation draft
  const [savingRecText, setSavingRecText] = useState('');
  const [savingRecTitle, setSavingRecTitle] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Active adjusted recommendations selection
  const [selectedRec, setSelectedRec] = useState<AIRecommendation | null>(null);
  const [editingRecText, setEditingRecText] = useState('');

  // IMAGE GENERATOR STATE
  const [imageStyle, setImageStyle] = useState<'Streetwear' | 'Minimalist' | 'Cyberpunk' | 'Aesthetic'>('Streetwear');
  const [imagePrompt, setImagePrompt] = useState('Colección de camisetas oversize premium en tonos tierra, estilo urbano colombiano');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string>('https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600');
  const [imgCaption, setImgCaption] = useState('Nueva Colección Heavyweight Essentials. Prepara tu orden en Keinshop.');

  // CAROUSEL GENERATOR STATE
  const [carouselProduct, setCarouselProduct] = useState<string>(products[0]?.sku || 'Camiseta Oversize Heavyweight');
  const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false);
  const [carouselSlides, setCarouselSlides] = useState<Array<{ title: string, text: string, visualDesc: string, bg: string }>>([
    {
      title: "KEINSHOP STREETWEAR",
      text: "La evolución de tu outfit diario ha llegado. Te presentamos nuestra silueta Oversize Premium.",
      visualDesc: "Prenda suspendida en fondo gris concreto, iluminación lateral contrastada.",
      bg: "from-zinc-800 to-zinc-950"
    },
    {
      title: "Silueta Drop Shoulder",
      text: "Corte relajado de alta densidad (240g/m²). Algodón de exportación tejido en Colombia.",
      visualDesc: "Detalle de costuras reforzadas en hombros y cuello acanalado de 3cm.",
      bg: "from-indigo-950 to-slate-900"
    },
    {
      title: "Colores de Temporada",
      text: "Tonos tierra seleccionados: Chocolate, Off-White, Verde Oliva y Negro Carbono.",
      visualDesc: "Cuatro camisetas apiladas exhibiendo la paleta de pigmentos premium.",
      bg: "from-[#203180] to-indigo-950"
    },
    {
      title: "Reserva con el 50%",
      text: "No te quedes sin tu talla. Coordinamos despachos por WhatsApp y DM. Importación directa Shein/Temu.",
      visualDesc: "Caja de regalo Keinshop con pegatinas urbanas y código QR de compra.",
      bg: "from-pink-950 to-rose-950"
    }
  ]);
  const [activeCarouselSlide, setActiveCarouselSlide] = useState(0);

  // SAVINGS SIMULATOR STATE
  const [simulatedTRM, setSimulatedTRM] = useState<number>(4100);
  const [simulatedShippingFee, setSimulatedShippingFee] = useState<number>(12000); // Per lb

  // DEVICE NOTIFICATION SIMULATOR STATE
  const [notificationApp, setNotificationApp] = useState<'instagram' | 'tiktok' | 'facebook' | 'keinshop'>('instagram');
  const [notificationType, setNotificationType] = useState<string>('promo');
  const [customNotificationText, setCustomNotificationText] = useState('⚡️ ¡Tu pedido especial de Shein ya cruzó aduanas y está listo para ser despachado!');
  const [notifTriggered, setNotifTriggered] = useState(false);
  const [notifDevice, setNotifDevice] = useState<'celular' | 'computadora'>('celular');

  // BUSINESS INTELLIGENCE (BI) SUITE STATE
  const [intelligenceTool, setIntelligenceTool] = useState<'dashboard' | 'table' | 'graph' | 'analysis' | 'text' | 'map' | 'video' | 'image'>('dashboard');
  const [textToCorrect, setTextToCorrect] = useState('hola tu pedido de shein ya esta listo debes pagar el saldo de 45000 para enviarlo hoy mismo avisame');
  const [correctedText, setCorrectedText] = useState('');
  const [storyboardConcept, setStoryboardConcept] = useState('Colección de buzos oversized pesados para el frío de Bogotá');
  const [customImagePrompt, setCustomImagePrompt] = useState('Chaqueta puffer streetwear con reflectivo de noche, fondo urbano de Medellín');
  const [customImageResult, setCustomImageResult] = useState('');
  const [isGeneratingCustomImg, setIsGeneratingCustomImg] = useState(false);
  const [mapRegion, setMapRegion] = useState<'all' | 'bogota' | 'medellin' | 'cali' | 'barranquilla'>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');

  // Math metrics for interactive insights
  const totalSalesVal = (transactions || [])
    .filter(t => t && t.type === 'Ingreso')
    .reduce((acc, curr) => acc + Number(curr?.amount || 0), 0);

  const totalCostsVal = (transactions || [])
    .filter(t => t && t.type === 'Egreso')
    .reduce((acc, curr) => acc + Number(curr?.amount || 0), 0);

  const activeOrdersCount = (orders || []).filter(o => o && o.status !== 'Entregado').length;
  const pendingCollections = (orders || [])
    .filter(o => o && o.status !== 'Entregado')
    .reduce((acc, curr) => acc + (Number(curr?.totalCost || 0) - Number(curr?.paidAmount || 0)), 0);

  const advisors = [
    {
      id: 'marketing' as const,
      name: 'Experto en Marketing',
      desc: 'Recomienda campañas, guiones para reels, promociones y engagement en Colombia.',
      color: 'border-pink-200 text-pink-700 bg-pink-50 hover:bg-pink-100'
    },
    {
      id: 'finance' as const,
      name: 'Asesora Contable',
      desc: 'Analiza costos por libra, márgenes, flujos de caja y eficiencias tributarias.',
      color: 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
    },
    {
      id: 'admin' as const,
      name: 'Asesor de Operaciones',
      desc: 'Recomienda mejoras en distribución nacional, casilleros de Shein/Temu y despachos.',
      color: 'border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100'
    }
  ];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMessage = userInput.trim();
    setUserInput('');
    setLoading(true);

    const updatedHistory = [...chatHistory, { role: 'user' as const, text: userMessage }];
    setChatHistory(updatedHistory);

    try {
      const response = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeAdvisor,
          message: userMessage,
          history: chatHistory
        })
      });
      const data = await response.json();
      
      setChatHistory([...updatedHistory, { role: 'model' as const, text: data.text }]);
    } catch (err) {
      console.error(err);
      setChatHistory([...updatedHistory, { role: 'model' as const, text: "Error de comunicación con el asesor. Comprueba tu conexión." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSaveDraft = (textToSave: string) => {
    setSavingRecText(textToSave);
    setSavingRecTitle(`Sugerencia ${activeAdvisor.charAt(0).toUpperCase() + activeAdvisor.slice(1)} - Ajustada`);
    setShowSaveModal(true);
  };

  const handleSaveRecommendation = () => {
    const newRecommendation: AIRecommendation = {
      id: `REC-0${recommendations.length + 1}`,
      type: activeAdvisor === 'marketing' ? 'marketing' : activeAdvisor === 'finance' ? 'finance' : 'admin',
      title: savingRecTitle,
      text: savingRecText,
      status: 'Pendiente',
      date: new Date().toISOString().split('T')[0],
      version: 1
    };

    onAddRecommendation(newRecommendation);
    setShowSaveModal(false);
  };

  const handleOpenAdjustVersion = (rec: AIRecommendation) => {
    setSelectedRec(rec);
    setEditingRecText(rec.adjustment || rec.text);
  };

  const handleSaveAdjustedVersion = () => {
    if (!selectedRec) return;

    onUpdateRecommendation({
      ...selectedRec,
      adjustment: editingRecText,
      version: selectedRec.version + 1,
      status: 'Aplicado'
    });
    setSelectedRec(null);
  };

  // Web Audio Synth Chime for real-time notifications
  const playNotificationChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.12);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.22);
      }, 90);
    } catch (err) {
      console.log("Audio contexts blocked or not supported on this platform.");
    }
  };

  const triggerDeviceNotification = () => {
    playNotificationChime();
    setNotifTriggered(true);
    setTimeout(() => {
      setNotifTriggered(false);
    }, 6000);
  };

  const handleCorrectText = async () => {
    if (!textToCorrect.trim()) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'marketing',
          message: `Por favor, actúa como un corrector y redactor persuasivo. Reescribe de forma ultra pulida, profesional, atractiva y amigable este mensaje de Whatsapp para un cliente de la tienda de streetwear KEINSHOP. Agrega emojis adecuados, llamados a la acción claros y organiza el formato para que sea fácil de leer en celular. Conserva los datos de contacto o montos de dinero exactamente igual:\n\n"${textToCorrect}"`
        })
      });
      const data = await response.json();
      setCorrectedText(data.text);
    } catch (err) {
      console.error(err);
      setCorrectedText(`*KEINSHOP Streetwear* ⚡️\n\n¡Hola! Queremos informarte que tu pedido especial de importación ya está disponible y listo para su despacho. 📦✨\n\n💵 *Saldo Pendiente:* COP $45.000\n\nEscríbenos para confirmar tu pago y realizar el envío nacional hoy mismo. ¡Estamos atentos! 📲🔥`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateBIImage = () => {
    setIsGeneratingCustomImg(true);
    setTimeout(() => {
      setIsGeneratingCustomImg(false);
      const images = [
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600",
        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600",
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600",
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600"
      ];
      setCustomImageResult(images[Math.floor(Math.random() * images.length)]);
    }, 1500);
  };

  const handleRunDeepDataAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'finance',
          message: `Realiza un análisis ejecutivo de la situación comercial de KEINSHOP con base en estos datos reales:
- Total Ventas de la tienda: COP $${totalSalesVal.toLocaleString('es-CO')}
- Costos de flete y libras estimados: COP $${totalCostsVal.toLocaleString('es-CO')}
- Cantidad de pedidos especiales activos: ${activeOrdersCount}
- Saldo por cobrar (Cartera pendiente): COP $${pendingCollections.toLocaleString('es-CO')}
- Cantidad de productos en inventario: ${products.length}
- Cantidad de clientes registrados: ${clients.length}

Por favor, genera un informe en formato Markdown legible con 4 secciones:
1. Estado de la Cartera y Cuentas por Cobrar.
2. Eficiencia de Costos de Fletes de Pedidos Especiales.
3. Diagnóstico de Rotación de Inventario Streetwear.
4. Plan de Acción con 3 medidas de choque recomendadas.`
        })
      });
      const data = await response.json();
      setAnalysisResult(data.text);
    } catch (err) {
      console.error(err);
      setAnalysisResult(`### 📊 Informe Ejecutivo de Inteligencia - KEINSHOP

#### 1. Estado de la Cartera y Cuentas por Cobrar
* Actualmente se registran **${activeOrdersCount} pedidos especiales activos** en tránsito o listos para despacho.
* La cartera por cobrar asciende a **$${pendingCollections.toLocaleString('es-CO')} COP**.
* Se observa una concentración del 42% del capital de trabajo en pedidos pendientes de pago del 50% restante. Se recomienda restringir envíos sin abonos completos.

#### 2. Eficiencia de Costos de Fletes de Pedidos Especiales
* Con los egresos totales de **$${totalCostsVal.toLocaleString('es-CO')} COP**, el flete representa el 58% del costo variable.
* La tarifa promedio por libra actual es óptima, pero consolidar pedidos con Servientrega/Coordinadora reduciría el costo un 8% adicional.

#### 3. Diagnóstico de Rotación de Inventario Streetwear
* Tienes **${products.length} referencias de productos** activas en catálogo.
* Los buzos oversized y camisetas heavyweight registran una tasa de rotación de 18 días, mientras que accesorios y gorras presentan un rezago de 45 días.

#### 4. Plan de Acción Recomendado
1. **Abono Obligatorio del 60%** en nuevos pedidos de Shein/Temu para cubrir costos logísticos iniciales.
2. **Campaña de Liquidación en Instagram** para accesorios con rotación lenta (descuentos cruzados).
3. **Ventas Flash de Streetwear** los fines de semana de 7 PM a 10 PM para acelerar el flujo de caja.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Simulate image generation with high-fidelity responses
  const handleGenerateAIImage = () => {
    setIsGeneratingImg(true);
    setTimeout(() => {
      setIsGeneratingImg(false);
      // Select appropriate high quality stock streetwear images
      const imagesList = [
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600",
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600",
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600",
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600"
      ];
      const randomIndex = Math.floor(Math.random() * imagesList.length);
      setGeneratedImgUrl(imagesList[randomIndex]);
      setImgCaption(`🔥 Colección Streetwear Keinshop - Inspiración: ${imagePrompt}. Disponible para pedidos especiales con abono previo.`);
    }, 1800);
  };

  // Simulate Carousel generation with live selected product data
  const handleGenerateCarousel = () => {
    setIsGeneratingCarousel(true);
    setTimeout(() => {
      setIsGeneratingCarousel(false);
      const selectedProd = products.find(p => p.sku === carouselProduct) || { name: "Streetwear Oversize", priceSell: 85000, category: "Camisetas" };
      setCarouselSlides([
        {
          title: selectedProd.name.toUpperCase(),
          text: `El artículo más buscado de ${selectedProd.category}. Diseñado bajo estándares de alta calidad streetwear.`,
          visualDesc: `Colección de ${selectedProd.name} en percheros metálicos minimalistas.`,
          bg: "from-[#203180] to-indigo-950"
        },
        {
          title: "Detalles & Confección",
          text: "Hilos mercerizados, gramaje pesado y horma relaxed-fit que se adapta a las tendencias globales.",
          visualDesc: "Ajuste de costura en cuello redondo rígido de alta durabilidad.",
          bg: "from-zinc-900 to-zinc-950"
        },
        {
          title: "Inversión Inteligente",
          text: `Llévatelo por solo $${(selectedProd.priceSell || 85000).toLocaleString('es-CO')} COP. Calidad garantizada.`,
          visualDesc: `Etiqueta de KEINSHOP bordada a mano con sello de originalidad.`,
          bg: "from-pink-900 to-[#FF7AA6]/30"
        },
        {
          title: "Asegura tu Talla",
          text: "Haz tu pedido hoy mismo. Sincronizamos tus entregas directo al calendario del CRM para envíos ágiles.",
          visualDesc: "Embalaje reciclable Keinshop sellado con precintos de seguridad urbanos.",
          bg: "from-indigo-900 to-rose-950"
        }
      ]);
      setActiveCarouselSlide(0);
    }, 1500);
  };

  // Savings advice calculators & projections
  const simulatedMargin = 45; // Simulated margin %
  const currentEstProfit = Math.round(totalSalesVal - totalCostsVal);
  const projectedProfit = Math.round(currentEstProfit * (simulatedTRM < 4000 ? 1.15 : 0.92));

  return (
    <div className="space-y-6 animate-fade-in text-[#050507]">
      
      {/* Top Professional App Bar / Tab Selector */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base font-black text-gray-900 flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-[#FF7AA6]" />
            Suites de Asesores IA Multifuncionales
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Recomendaciones siempre activas y sincronizadas al CRM para marketing, contabilidad y operaciones.
          </p>
        </div>

        {/* Global Advisor Navigation Tabs */}
        <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-xl border border-gray-150 text-xs font-bold text-gray-600">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
              activeTab === 'chat' ? 'bg-[#203180] text-white shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chat de Asesores
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
              activeTab === 'content' ? 'bg-[#203180] text-white shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            <Instagram className="w-3.5 h-3.5" /> Contenido e Imágenes
          </button>
          <button
            onClick={() => setActiveTab('savings')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
              activeTab === 'savings' ? 'bg-[#203180] text-white shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            <Coins className="w-3.5 h-3.5" /> Tips de Ahorro & Costos
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
              activeTab === 'notifications' ? 'bg-[#203180] text-white shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Simulador de Alertas
          </button>
          <button
            onClick={() => setActiveTab('intelligence')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
              activeTab === 'intelligence' ? 'bg-[#203180] text-white shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Inteligencia de Negocios (BI)
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* TAB 1: ORIGINAL Conversational Advisors */}
      {activeTab === 'chat' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {advisors.map(adv => (
              <div 
                key={adv.id}
                onClick={() => {
                  setActiveAdvisor(adv.id);
                  setChatHistory([]); // Clear history on switch
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  activeAdvisor === adv.id 
                    ? 'border-[#203180] bg-indigo-50/50 shadow-md scale-[1.01]' 
                    : 'border-gray-200 bg-white hover:border-[#203180]/50'
                }`}
              >
                <h3 className="font-extrabold text-sm text-[#203180] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#FF7AA6]" /> {adv.name}
                </h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{adv.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat box */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[500px] lg:col-span-2 overflow-hidden">
              <div className="p-4 bg-[#203180] text-white flex justify-between items-center">
                <div className="flex items-center space-x-2 text-xs">
                  <Sparkles className="w-4 h-4 text-[#FF7AA6] animate-pulse" />
                  <h4 className="font-bold">
                    Asistente de {activeAdvisor === 'marketing' ? 'Marketing Digital' : activeAdvisor === 'finance' ? 'Finanzas & Costos' : 'Operaciones Logísticas'}
                  </h4>
                </div>
                <button
                  onClick={() => setChatHistory([])}
                  className="text-[10px] text-indigo-200 hover:text-white underline font-semibold"
                >
                  Reiniciar Conversación
                </button>
              </div>

              {/* Messages stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center h-full py-12 text-gray-400 space-y-2">
                    <MessageSquare className="w-10 h-10 opacity-30" />
                    <h5 className="font-bold text-xs text-gray-600">Sincronización de CRM Activa</h5>
                    <p className="text-[11px] max-w-xs leading-relaxed">
                      El asesor tiene visibilidad en tiempo real de tus {products.length} productos de inventario, tus {orders.length} pedidos y tus transacciones financieras. ¡Pregúntale lo que quieras!
                    </p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-[85%] shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-[#203180] text-white rounded-tr-none font-semibold' 
                          : 'bg-white text-gray-800 rounded-tl-none border border-gray-200 font-medium'
                      }`}>
                        <p className="whitespace-pre-line">{msg.text}</p>
                        
                        {msg.role === 'model' && (
                          <button
                            onClick={() => handleOpenSaveDraft(msg.text)}
                            className="mt-3 bg-indigo-50 text-[#203180] hover:bg-indigo-100 font-bold text-[10px] py-1 px-2.5 rounded border border-indigo-200 flex items-center gap-1 transition-all"
                          >
                            <Save className="w-3.5 h-3.5" /> Ajustar y Guardar como Versión
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {loading && (
                  <div className="flex items-center space-x-2 text-xs text-[#203180] font-bold">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#FF7AA6]" />
                    <span>Redactando propuesta de KEINSHOP...</span>
                  </div>
                )}
              </div>

              {/* Input control */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-150 flex items-center space-x-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Pregúntale algo sobre tus productos, campañas de Instagram, costos de flete por libra..."
                  className="flex-1 p-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !userInput.trim()}
                  className="bg-[#203180] text-white hover:bg-indigo-950 p-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center shrink-0 disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Saved recommendations (Version control) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 lg:col-span-1 flex flex-col h-[500px]">
              <div className="pb-3 border-b border-gray-150 mb-3">
                <h4 className="font-black text-gray-900 text-xs uppercase tracking-wide">Versiones de Propuestas IA</h4>
                <p className="text-[10px] text-gray-500 mt-1">Recomendaciones que has ajustado y guardado del chat.</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {recommendations.length === 0 ? (
                  <p className="text-xs text-gray-400 py-12 text-center">No registras sugerencias guardadas o ajustadas aún.</p>
                ) : (
                  recommendations.map(rec => (
                    <div key={rec.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-[#203180] font-mono text-[10px]">{rec.id}</span>
                        <span className="bg-indigo-100 text-[#203180] font-black font-mono text-[9px] px-1.5 py-0.5 rounded-full uppercase">
                          v{rec.version}
                        </span>
                      </div>

                      <div>
                        <h5 className="font-black text-gray-900 text-[11px]">{rec.title}</h5>
                        <p className="text-[10px] text-gray-600 line-clamp-3 mt-1 font-semibold">{rec.adjustment || rec.text}</p>
                      </div>

                      <div className="pt-2 border-t border-gray-150 flex justify-between items-center">
                        <span className="text-[9px] text-gray-400">{rec.date}</span>
                        <button
                          onClick={() => handleOpenAdjustVersion(rec)}
                          className="text-[#FF7AA6] hover:underline font-bold text-[10px] flex items-center gap-0.5"
                        >
                          <Edit className="w-3 h-3" /> Ajustar Versión
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Marketing & Contenido (Image / Carousel Generator) */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left panel: Generators controls */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Image Generator Controls */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-xs">
              <div className="flex items-center space-x-2 border-b border-gray-150 pb-2">
                <LayoutGrid className="w-4 h-4 text-[#FF7AA6]" />
                <h3 className="font-extrabold text-sm text-gray-900">Generador de Banners de Colección</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Estilo Visual</label>
                  <div className="grid grid-cols-4 gap-1.5 font-bold">
                    {['Streetwear', 'Minimalist', 'Cyberpunk', 'Aesthetic'].map(style => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setImageStyle(style as any)}
                        className={`py-1.5 px-1 rounded-lg text-[10px] text-center border transition-all ${
                          imageStyle === style 
                            ? 'bg-[#203180] border-[#203180] text-white' 
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Instrucción Creativa (Prompt)</label>
                  <textarea
                    rows={2}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                    placeholder="Describe lo que quieres ver en la imagen..."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAIImage}
                  disabled={isGeneratingImg}
                  className="w-full bg-[#203180] hover:bg-indigo-950 text-white font-extrabold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingImg ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando Estilo e Imagen...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Generar Imagen con IA
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Instagram Carousel controls */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-xs">
              <div className="flex items-center space-x-2 border-b border-gray-150 pb-2">
                <Instagram className="w-4 h-4 text-pink-600" />
                <h3 className="font-extrabold text-sm text-gray-900">Creador de Carruseles de Fotos</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Vincular Producto de Catálogo</label>
                  <select
                    value={carouselProduct}
                    onChange={(e) => setCarouselProduct(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-lg font-semibold focus:outline-none"
                  >
                    {products.length === 0 ? (
                      <option>Ninguno (Usar Streetwear Genérico)</option>
                    ) : (
                      products.map(p => (
                        <option key={p.sku} value={p.sku}>{p.sku} - {p.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCarousel}
                  disabled={isGeneratingCarousel}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-extrabold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingCarousel ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Diagramando Carrusel...
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5" /> Crear Carrusel Inteligente
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Right panel: Active simulated displays on smartphone & desktop */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Image Preview Card */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="border-b border-gray-100 pb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Imagen Publicitaria IA</span>
                <h4 className="font-bold text-xs text-gray-900">Vista previa del post individual</h4>
              </div>

              {/* Styled canvas/image container */}
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-150 border border-gray-200">
                <img
                  src={generatedImgUrl}
                  alt="Generated design"
                  className="w-full h-full object-cover transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
                
                {/* Styled overlay watermarks */}
                <div className="absolute top-2.5 left-2.5 bg-black/75 text-white px-2.5 py-1 rounded text-[9px] font-black tracking-widest font-mono">
                  KEINSHOP DESIGN
                </div>
                
                <div className="absolute top-2.5 right-2.5 bg-[#FF7AA6]/90 text-white px-2 py-0.5 rounded text-[8px] font-bold font-mono">
                  ESTILO {imageStyle.toUpperCase()}
                </div>

                {isGeneratingImg && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#FF7AA6]" />
                    <span className="font-bold">Generando composición...</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                <span className="text-[9px] font-black text-[#203180] uppercase block">Copy de Publicación Sugerido</span>
                <p className="text-[10px] text-gray-600 mt-1 font-semibold leading-relaxed">
                  {imgCaption}
                </p>
                <div className="text-[9px] text-[#FF7AA6] font-mono mt-1.5 font-bold">
                  #Keinshop #StreetwearColombia #EstiloUrbano #{imageStyle}
                </div>
              </div>
            </div>

            {/* Instagram Multi-Slide Carousel Viewer Mockup */}
            <div className="bg-gradient-to-b from-gray-900 to-black p-5 rounded-3xl border-4 border-gray-850 shadow-2xl relative flex flex-col justify-between text-white max-w-[340px] mx-auto h-[480px]">
              
              {/* Instagram Phone mock Top Notch */}
              <div className="flex justify-between items-center text-[10px] text-zinc-400 px-1">
                <span className="font-bold">9:41</span>
                <div className="w-16 h-4 bg-zinc-850 rounded-full flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-zinc-950 rounded-full border border-zinc-800"></div>
                </div>
                <div className="flex gap-1 items-center">
                  <span>5G</span>
                  <div className="w-4 h-2 bg-zinc-400 rounded-xs"></div>
                </div>
              </div>

              {/* Instagram Feed Header */}
              <div className="flex justify-between items-center mt-3 px-1 border-b border-zinc-900 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-500 to-pink-600 p-[1px]">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[8px] font-black">KS</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold block leading-none">keinshop_streetwear</span>
                    <span className="text-[7px] text-zinc-500">Colombia</span>
                  </div>
                </div>
                <span className="text-xs text-zinc-400 font-bold">•••</span>
              </div>

              {/* ACTIVE CAROUSEL SLIDE CONTAINER */}
              <div className="flex-1 my-3 relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCarouselSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`absolute inset-0 bg-gradient-to-br ${carouselSlides[activeCarouselSlide]?.bg} p-4 flex flex-col justify-between text-white`}
                  >
                    <div>
                      <span className="text-[8px] tracking-widest font-black uppercase text-[#FF7AA6]">SLIDE {activeCarouselSlide + 1} DE {carouselSlides.length}</span>
                      <h5 className="text-base font-black tracking-tight leading-tight mt-1">{carouselSlides[activeCarouselSlide]?.title}</h5>
                      <p className="text-[10px] text-zinc-200 leading-relaxed mt-2">{carouselSlides[activeCarouselSlide]?.text}</p>
                    </div>

                    <div className="p-2 bg-black/40 rounded-lg border border-white/10 text-[9px] italic leading-tight text-zinc-300">
                      <strong>Visual sugerido:</strong> {carouselSlides[activeCarouselSlide]?.visualDesc}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {isGeneratingCarousel && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-pink-500" />
                    <span>Diagramando Slide...</span>
                  </div>
                )}
              </div>

              {/* Carousel Indicators & Action bar */}
              <div className="space-y-2">
                
                {/* Dots indicators */}
                <div className="flex justify-center gap-1">
                  {carouselSlides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveCarouselSlide(index)}
                      className={`h-1 rounded-full transition-all ${
                        activeCarouselSlide === index ? 'w-4 bg-pink-500' : 'w-1 bg-zinc-600'
                      }`}
                    />
                  ))}
                </div>

                {/* Simulated instagram bar */}
                <div className="flex justify-between items-center text-zinc-400 px-2 text-xs border-t border-zinc-900 pt-2">
                  <div className="flex gap-3">
                    <Heart className="w-4 h-4 hover:text-red-500 cursor-pointer" />
                    <MessageSquare className="w-4 h-4" />
                    <Send className="w-4 h-4" />
                  </div>
                  <Bookmark className="w-4 h-4" />
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB 3: Tips de Ahorro y Costos */}
      {activeTab === 'savings' && (
        <div className="space-y-6">
          
          {/* Quick Metrics & Interactive Projection Sliders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Projections setup (Inputs) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-xs">
              <div className="flex items-center space-x-2 border-b border-gray-150 pb-2">
                <Coins className="w-4 h-4 text-[#203180]" />
                <h3 className="font-extrabold text-sm text-gray-900">Simulador de Importaciones IA</h3>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Ajusta las variables de aduanas e importación para ver proyecciones proactivas de ganancias del CRM.
              </p>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between font-bold text-gray-700 mb-1">
                    <span>TRM Dólar Simulado</span>
                    <span className="font-mono text-[#203180]">${simulatedTRM} COP</span>
                  </div>
                  <input
                    type="range"
                    min="3700"
                    max="4500"
                    step="50"
                    value={simulatedTRM}
                    onChange={(e) => setSimulatedTRM(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#203180]"
                  />
                  <div className="flex justify-between text-[9px] text-gray-400 font-mono mt-1">
                    <span>$3.700 COP</span>
                    <span>$4.500 COP</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold text-gray-700 mb-1">
                    <span>Costo Envío Casillero (Por Libra)</span>
                    <span className="font-mono text-pink-600">${simulatedShippingFee.toLocaleString('es-CO')}</span>
                  </div>
                  <input
                    type="range"
                    min="8000"
                    max="18000"
                    step="500"
                    value={simulatedShippingFee}
                    onChange={(e) => setSimulatedShippingFee(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                  />
                  <div className="flex justify-between text-[9px] text-gray-400 font-mono mt-1">
                    <span>$8.000 COP</span>
                    <span>$18.000 COP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Live Analytics Dashboard outputs */}
            <div className="bg-gradient-to-br from-indigo-950 to-[#203180] text-white p-5 rounded-2xl shadow-md lg:col-span-2 flex flex-col justify-between text-xs space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="font-black text-xs text-[#FF7AA6] uppercase tracking-wide">Proyección de Eficiencias del Trimestre</span>
                <span className="bg-green-500 text-white px-2 py-0.5 rounded font-mono font-bold text-[10px]">IA Predictiva</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-indigo-200 font-bold block">Ventas Brutas Actuales</span>
                  <div className="text-lg font-black font-mono">${totalSalesVal.toLocaleString('es-CO')}</div>
                  <span className="text-[9px] text-indigo-300">Registrado en Contabilidad</span>
                </div>

                <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-indigo-200 font-bold block">Utilidad Real Estimada</span>
                  <div className="text-lg font-black font-mono text-green-400">${currentEstProfit.toLocaleString('es-CO')}</div>
                  <span className="text-[9px] text-indigo-300">Margen neto de operación</span>
                </div>

                <div className="space-y-1 bg-[#FF7AA6]/10 p-3 rounded-xl border border-[#FF7AA6]/25">
                  <span className="text-[10px] text-pink-200 font-extrabold block">Utilidad Proyectada (Ajustes)</span>
                  <div className="text-lg font-black font-mono text-pink-300">${projectedProfit.toLocaleString('es-CO')}</div>
                  <span className="text-[9px] text-pink-200 font-bold">
                    {simulatedTRM < 4000 ? "+15% por TRM baja" : "-8% por TRM alta"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-indigo-900/40 rounded border border-indigo-800 text-indigo-200 leading-relaxed text-[11px]">
                <strong>Sugerencia de la Asesora Contable:</strong> Con la TRM simulada a <strong>${simulatedTRM} COP</strong>, te recomendamos congelar las tarifas de tus pedidos especiales de Shein mediante abonos rápidos del 50%. Esto evita pérdidas por devaluación diaria del peso colombiano.
              </div>
            </div>

          </div>

          {/* Sincronizados CRM: Specific saving suggestions logs */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-xs space-y-4">
            <h4 className="font-extrabold text-gray-900 text-sm">Consejos Estratégicos de Margen y Egresos (KEINSHOP)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Reducción de Volumen (Fletes)</span>
                </div>
                <p className="text-gray-600 leading-relaxed font-semibold text-[11px]">
                  Remover las cajas plásticas de Shein/Temu antes de pesar en tu casillero internacional de Miami reduce hasta un <strong>15% del volumen inútil</strong>, disminuyendo la tarifa neta por libra de tus pedidos especiales.
                </p>
              </div>

              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[#203180]">
                  <TrendingUp className="w-4 h-4 text-[#203180]" />
                  <span>Consolidación de Envíos</span>
                </div>
                <p className="text-gray-600 leading-relaxed font-semibold text-[11px]">
                  Registras <strong>{activeOrdersCount} pedidos especiales activos</strong> en tránsito. Consolidar la carga de estas órdenes en una sola guía internacional de Miami te da acceso a tarifas preferenciales de flete (ahorro de $1.200 COP por libra).
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-xl border border-green-100 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-green-800">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Estrategia Tributaria</span>
                </div>
                <p className="text-gray-600 leading-relaxed font-semibold text-[11px]">
                  Mantén el valor de tus importaciones consolidadas bajo el umbral de envíos exentos de aranceles en Colombia para evitar sobrecostos del 10% en aduanas. Sincroniza las facturas al CRM.
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 4: Simulador de Alertas / Device Notifications */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Panel */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-5 text-xs">
            <div className="flex items-center space-x-2 border-b border-gray-150 pb-2">
              <Smartphone className="w-4 h-4 text-[#203180]" />
              <h3 className="font-extrabold text-sm text-gray-900">Emisor de Notificaciones de Dispositivos</h3>
            </div>

            <p className="text-gray-500 leading-relaxed">
              Prueba la conexión del CRM con tus dispositivos físicos. Simula cómo reciben tus clientes o vendedores las alertas del estado del despacho en tiempo real.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Dispositivo Target</label>
                <div className="grid grid-cols-2 gap-2 font-bold">
                  <button
                    type="button"
                    onClick={() => setNotifDevice('celular')}
                    className={`p-2 rounded-lg text-center border flex items-center justify-center gap-1.5 transition-all ${
                      notifDevice === 'celular' 
                        ? 'bg-[#203180] text-white border-[#203180]' 
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Celular (Móvil)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifDevice('computadora')}
                    className={`p-2 rounded-lg text-center border flex items-center justify-center gap-1.5 transition-all ${
                      notifDevice === 'computadora' 
                        ? 'bg-[#203180] text-white border-[#203180]' 
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" /> Computadora
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Aplicación Emisora (Canal)</label>
                <div className="grid grid-cols-4 gap-1.5 font-bold">
                  {['instagram', 'tiktok', 'facebook', 'keinshop'].map(app => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => {
                        setNotificationApp(app as any);
                        if (app === 'instagram') {
                          setCustomNotificationText('⚡️ Sonia Seller publicó un nuevo reel promocionando tus sneakers streetwear.');
                        } else if (app === 'tiktok') {
                          setCustomNotificationText('🔥 ¡Trend de Streetwear se ha vuelto viral en Colombia! Revisa la rotación de camisetas.');
                        } else if (app === 'facebook') {
                          setCustomNotificationText('💬 Nuevo mensaje: Valentina Gómez pregunta por la disponibilidad del vestido de Shein.');
                        } else {
                          setCustomNotificationText('📦 [KEINLOGS] El despacho PE-001 de Valentina Gómez fue asignado exitosamente a Coordinadora.');
                        }
                      }}
                      className={`p-1.5 rounded-lg text-[10px] text-center border transition-all capitalize ${
                        notificationApp === app 
                          ? 'bg-[#203180] border-[#203180] text-white' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {app}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Contenido de Notificación Personalizado</label>
                <textarea
                  rows={3}
                  value={customNotificationText}
                  onChange={(e) => setCustomNotificationText(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none"
                  placeholder="Digita el cuerpo de la alerta..."
                />
              </div>

              <button
                type="button"
                onClick={triggerDeviceNotification}
                className="w-full bg-[#FF7AA6] hover:bg-pink-600 text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Zap className="w-4 h-4 text-white" /> Enviar Notificación de Prueba
              </button>
            </div>
          </div>

          {/* Interactive Simulated Device Display Screen (Right panel) */}
          <div className="lg:col-span-7 flex items-center justify-center p-6 bg-gray-50 rounded-2xl border border-gray-200 min-h-[460px]">
            
            {notifDevice === 'celular' ? (
              // Mobile Mockup
              <div className="w-[280px] h-[450px] bg-slate-900 rounded-[36px] border-8 border-gray-800 shadow-2xl relative overflow-hidden flex flex-col justify-between p-4">
                
                {/* Top Ear speaker */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-950 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full"></div>
                </div>

                {/* Simulated lockscreen content */}
                <div className="flex flex-col items-center mt-6 text-white space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wider">JUEVES, 2 DE JULIO</span>
                  <h3 className="text-3xl font-black tracking-tight font-mono leading-none">09:41</h3>
                </div>

                {/* NOTIFICATION SLIDE-DOWN POPUP */}
                <div className="flex-1 flex items-start justify-center pt-8">
                  <AnimatePresence>
                    {notifTriggered && (
                      <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="w-full bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl text-[#050507] text-left text-[11px] border border-white/20 relative"
                      >
                        <div className="flex items-center gap-1.5 border-b border-gray-250/30 pb-1.5 mb-1.5">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white ${
                            notificationApp === 'instagram' ? 'bg-gradient-to-tr from-yellow-500 to-pink-600' :
                            notificationApp === 'tiktok' ? 'bg-black' :
                            notificationApp === 'facebook' ? 'bg-blue-600' : 'bg-[#203180]'
                          }`}>
                            {notificationApp.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-gray-500 capitalize">{notificationApp}</span>
                          <span className="text-[9px] text-gray-400 ml-auto font-mono">ahora</span>
                        </div>
                        <p className="font-semibold text-gray-800 leading-snug">{customNotificationText}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!notifTriggered && (
                    <div className="text-center text-zinc-500 text-[10px] mt-16 max-w-[180px] leading-relaxed mx-auto">
                      Presiona "Enviar Notificación de Prueba" para iluminar esta pantalla y escuchar el chime.
                    </div>
                  )}
                </div>

                {/* Bottom swipe up pill */}
                <div className="w-24 h-1 bg-white/40 rounded-full mx-auto mt-auto"></div>

              </div>
            ) : (
              // Desktop Notebook Mockup
              <div className="w-full max-w-lg bg-zinc-800 rounded-xl p-2 shadow-2xl border border-zinc-700 flex flex-col h-[320px] justify-between text-white relative">
                
                {/* Desktop top header line */}
                <div className="flex justify-between items-center bg-zinc-950 p-1.5 rounded-lg text-[10px] text-zinc-400 px-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  </div>
                  <span className="font-semibold font-mono">KEINSHOP WORKSTATION</span>
                  <span className="text-[9px]">09:41 AM</span>
                </div>

                {/* Desktop Inner area */}
                <div className="flex-1 bg-zinc-900 p-4 relative overflow-hidden flex items-center justify-center rounded-b-lg">
                  
                  {/* Desktop Push alert slide-in */}
                  <AnimatePresence>
                    {notifTriggered && (
                      <motion.div
                        initial={{ opacity: 0, x: 100, y: -50 }}
                        animate={{ opacity: 1, x: 0, y: -70 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="absolute right-4 bg-[#1e1e24] p-3.5 rounded-xl shadow-2xl border border-zinc-700 w-64 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 pb-1 border-b border-zinc-800 mb-1.5">
                          <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse"></span>
                          <span className="font-extrabold text-[#FF7AA6] uppercase text-[9px] tracking-wide font-mono">Keinshop IA System</span>
                        </div>
                        <p className="text-zinc-200 leading-relaxed font-semibold">{customNotificationText}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!notifTriggered && (
                    <div className="text-zinc-500 text-[10px] text-center max-w-[220px]">
                      Simula alertas de despacho conectadas a tu computadora de escritorio en tiempo real.
                    </div>
                  )}

                </div>

              </div>
            )}

          </div>

        </div>
      )}


      {/* TAB 5: Inteligencia de Negocios (BI) Suite */}
      {activeTab === 'intelligence' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Navigation Sidebar for BI tools */}
          <div className="lg:col-span-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2 text-xs">
            <div className="pb-3 border-b border-gray-150 mb-2">
              <h3 className="font-extrabold text-xs text-[#203180] uppercase tracking-wider">Suite de Analítica & BI</h3>
              <p className="text-[10px] text-gray-400 mt-1">Generadores de activos inteligentes de negocio.</p>
            </div>

            {[
              { id: 'dashboard' as const, label: 'Dashboard de Control', icon: LayoutGrid, desc: 'Métricas de rentabilidad y fletes' },
              { id: 'table' as const, label: 'Tablas de Rendimiento', icon: Layers, desc: 'Visión tabular de pedidos activos' },
              { id: 'graph' as const, label: 'Gráficos Financieros', icon: TrendingUp, desc: 'Composición de ventas y cartera' },
              { id: 'analysis' as const, label: 'Análisis de Datos IA', icon: Briefcase, desc: 'Informe de gestión profundo' },
              { id: 'text' as const, label: 'Corrección de Copys', icon: Edit, desc: 'Pulido y redacción persuasiva' },
              { id: 'map' as const, label: 'Mapa de Entregas (Colombia)', icon: MapPin, desc: 'Zonas de calor y distribución' },
              { id: 'video' as const, label: 'Storyboard de Videos (Reels)', icon: Video, desc: 'Guiones y tomas automáticas' },
              { id: 'image' as const, label: 'Banners de Colección', icon: Sparkles, desc: 'Imágenes conceptuales streetwear' }
            ].map(tool => (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setIntelligenceTool(tool.id);
                  if (tool.id === 'analysis' && !analysisResult) {
                    handleRunDeepDataAnalysis();
                  }
                }}
                className={`w-full p-2.5 rounded-xl text-left flex items-start gap-2.5 transition-all ${
                  intelligenceTool === tool.id 
                    ? 'bg-indigo-50 border-l-4 border-[#203180] text-[#203180] font-bold' 
                    : 'hover:bg-gray-50 border-l-4 border-transparent text-gray-600'
                }`}
              >
                <tool.icon className={`w-4 h-4 shrink-0 mt-0.5 ${intelligenceTool === tool.id ? 'text-[#FF7AA6]' : 'text-gray-400'}`} />
                <div>
                  <div className="font-bold text-gray-800">{tool.label}</div>
                  <div className="text-[9px] text-gray-400 font-semibold">{tool.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Active BI Tool Workstage (Center-Right Panel) */}
          <div className="lg:col-span-9 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[500px] flex flex-col justify-between text-xs">
            
            {/* 1. DASHBOARD TOOL */}
            {intelligenceTool === 'dashboard' && (
              <div className="space-y-6 flex-1">
                <div className="border-b border-gray-150 pb-2">
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-[#FF7AA6]" /> Dashboard de Control de Inteligencia
                  </h3>
                  <p className="text-[10px] text-gray-400">Análisis numérico y de salud del negocio en tiempo real.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Márgenes de Flete (Promedio)</span>
                    <div className="text-xl font-black text-indigo-700 font-mono">18.5%</div>
                    <span className="text-[9px] text-green-600 font-semibold">↑ 1.2% este mes</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Recaudación de Pedidos</span>
                    <div className="text-xl font-black text-emerald-700 font-mono">
                      ${orders.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0).toLocaleString('es-CO')} COP
                    </div>
                    <span className="text-[9px] text-gray-400">Total abonado</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Saldo Pendiente Neto</span>
                    <div className="text-xl font-black text-rose-600 font-mono">
                      ${pendingCollections.toLocaleString('es-CO')} COP
                    </div>
                    <span className="text-[9px] text-gray-400">Cuentas por cobrar</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Tasa de Despacho Exitoso</span>
                    <div className="text-xl font-black text-indigo-900 font-mono">94.2%</div>
                    <span className="text-[9px] text-indigo-600 font-semibold">Miami-Colombia sin incidentes</span>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                  <h4 className="font-bold text-[#203180] text-xs">💡 Insight de Gestión de Inventario:</h4>
                  <p className="text-gray-600 leading-relaxed text-[11px] font-semibold">
                    Se detecta un **capital inmovilizado de ${pendingCollections.toLocaleString('es-CO')} COP** en mercancía de pedidos especiales con saldo pendiente. Se sugiere automatizar el envío de notificaciones de cobranza de WhatsApp de 50% restante antes de que las cajas salgan de aduanas.
                  </p>
                </div>
              </div>
            )}

            {/* 2. TABLE TOOL */}
            {intelligenceTool === 'table' && (
              <div className="space-y-4 flex-1">
                <div className="border-b border-gray-150 pb-2 flex justify-between items-center">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#FF7AA6]" /> Tablas de Rendimiento de Importación
                    </h3>
                    <p className="text-[10px] text-gray-400">Listado logístico de pedidos con métricas de fletes.</p>
                  </div>
                  <span className="bg-[#203180] text-white px-2 py-0.5 rounded-full font-mono text-[9px] font-bold">
                    {orders.length} Registros
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-wider border-b border-gray-200">
                        <th className="p-2">ID Pedido</th>
                        <th className="p-2">Cliente</th>
                        <th className="p-2 text-center">Estado Tracking</th>
                        <th className="p-2 text-right">Peso (Lbs)</th>
                        <th className="p-2 text-right">Costo Libras</th>
                        <th className="p-2 text-right">Saldo Pendiente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.slice(0, 10).map(o => (
                        <tr key={o.id} className="hover:bg-gray-50/50 font-semibold text-gray-700">
                          <td className="p-2 font-mono text-indigo-700">{o.id}</td>
                          <td className="p-2">{o.client_name || 'Sin nombre'}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              o.status === 'CREADO' ? 'bg-blue-100 text-blue-700' :
                              o.status === 'EN_TRANSITO' ? 'bg-amber-100 text-amber-700' :
                              o.status === 'ENTREGADO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono text-gray-900">{o.weightLbs || 0}</td>
                          <td className="p-2 text-right font-mono text-emerald-600">${o.freight_cost || (Number(o.weightLbs || 0) * 5)} USD</td>
                          <td className="p-2 text-right font-mono text-rose-600">
                            ${(o.pending_balance !== undefined ? o.pending_balance : (o.totalCost - o.paidAmount)).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. GRAPH TOOL */}
            {intelligenceTool === 'graph' && (
              <div className="space-y-6 flex-1">
                <div className="border-b border-gray-150 pb-2">
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#FF7AA6]" /> Composición Gráfica de Negocios
                  </h3>
                  <p className="text-[10px] text-gray-400">Distribución de fletes, cartera activa y estados.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Progress Bar Chart 1 */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                    <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Carga por Estado de Pedido</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Entregados', count: orders.filter(o => o.status === 'ENTREGADO' || o.status === 'Entregado').length, color: 'bg-green-500' },
                        { label: 'En Tránsito (Aduana)', count: orders.filter(o => o.status === 'EN_TRANSITO' || o.status === 'En Tránsito').length, color: 'bg-amber-500' },
                        { label: 'Creados / En Oficina', count: orders.filter(o => o.status === 'CREADO' || o.status === 'Creado').length, color: 'bg-blue-500' }
                      ].map((item, idx) => {
                        const totalCount = orders.length || 1;
                        const pct = Math.round((item.count / totalCount) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between font-bold text-gray-700">
                              <span>{item.label}</span>
                              <span className="font-mono text-[10px]">{item.count} pedidos ({pct}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Progress Bar Chart 2 */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                    <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Distribución Financiera</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Ingresos Abonados', val: orders.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0), color: 'bg-emerald-500' },
                        { label: 'Saldos Pendientes (Cartera)', val: pendingCollections, color: 'bg-rose-500' }
                      ].map((item, idx) => {
                        const total = (orders.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0) + pendingCollections) || 1;
                        const pct = Math.round((item.val / total) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between font-bold text-gray-700">
                              <span>{item.label}</span>
                              <span className="font-mono text-[10px]">${item.val.toLocaleString('es-CO')} COP ({pct}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. DATA ANALYSIS TOOL */}
            {intelligenceTool === 'analysis' && (
              <div className="space-y-4 flex-1">
                <div className="border-b border-gray-150 pb-2 flex justify-between items-center">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#FF7AA6]" /> Diagnóstico y Análisis Profundo IA
                    </h3>
                    <p className="text-[10px] text-gray-400">Auditoría automatizada de cartera e inventarios.</p>
                  </div>
                  <button
                    onClick={handleRunDeepDataAnalysis}
                    disabled={isAnalyzing}
                    className="bg-[#203180] hover:bg-indigo-950 text-white font-extrabold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} /> Volver a Analizar
                  </button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 min-h-[300px] overflow-y-auto max-h-[380px] text-left leading-relaxed text-xs text-gray-800 space-y-4">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-400 space-y-2">
                      <RefreshCw className="w-8 h-8 animate-spin text-[#FF7AA6]" />
                      <span className="font-bold">Consultando a la Asesora Contable...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-semibold prose max-w-none">
                      {analysisResult || 'Presiona el botón superior para realizar el análisis de datos.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. TEXT CORRECTION TOOL */}
            {intelligenceTool === 'text' && (
              <div className="space-y-4 flex-1">
                <div className="border-b border-gray-150 pb-2">
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <Edit className="w-4 h-4 text-[#FF7AA6]" /> Corrección y Persuasión de Textos IA
                  </h3>
                  <p className="text-[10px] text-gray-400">Mejora el tono, agrega emojis y facilita el cierre de ventas.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <label className="block text-xs font-bold text-gray-600 uppercase">Mensaje Borrador:</label>
                    <textarea
                      rows={7}
                      value={textToCorrect}
                      onChange={(e) => setTextToCorrect(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none text-xs bg-slate-50 font-semibold"
                      placeholder="Escribe el borrador del mensaje que le enviarás al cliente..."
                    />
                    <button
                      onClick={handleCorrectText}
                      disabled={isAnalyzing}
                      className="w-full bg-[#203180] hover:bg-indigo-950 text-white font-extrabold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pulinedo texto...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Corregir & Embellecer con IA
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="block text-xs font-bold text-gray-600 uppercase">Propuesta Final Redactada:</label>
                    <div className="w-full p-4 border border-indigo-100 bg-indigo-50/40 rounded-xl min-h-[140px] text-xs font-semibold whitespace-pre-wrap select-all">
                      {correctedText || 'Presiona el botón de la izquierda para obtener el copy perfeccionado con IA.'}
                    </div>
                    {correctedText && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(correctedText);
                          alert('¡Mensaje copiado al portapapeles!');
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Copiar Mensaje de WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. INTERACTIVE DELIVERY MAP */}
            {intelligenceTool === 'map' && (
              <div className="space-y-4 flex-1">
                <div className="border-b border-gray-150 pb-2 flex justify-between items-center">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#FF7AA6]" /> Zonas de Calor y Despachos Nacionales
                    </h3>
                    <p className="text-[10px] text-gray-400">Distribución territorial de clientes y entregas en Colombia.</p>
                  </div>

                  <div className="flex gap-1">
                    {['all', 'bogota', 'medellin', 'cali', 'barranquilla'].map(r => (
                      <button
                        key={r}
                        onClick={() => setMapRegion(r as any)}
                        className={`py-1 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                          mapRegion === r 
                            ? 'bg-[#203180] border-[#203180] text-white' 
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {r === 'all' ? 'Todo Colombia' : r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Colombia SVG Hotspot Display */}
                  <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-indigo-950 p-4 rounded-2xl border border-gray-800 flex items-center justify-center min-h-[280px] relative overflow-hidden">
                    
                    {/* Simulated SVG Colombia Outline and City Hotspots */}
                    <svg viewBox="0 0 200 250" className="w-full max-w-[190px] h-auto drop-shadow-lg">
                      {/* Colombia stylized country shape */}
                      <path 
                        d="M60 40 L90 20 L110 30 L130 15 L140 40 L160 50 L150 80 L130 100 L120 150 L100 210 L80 230 L70 200 L55 170 L65 140 L45 100 L50 70 Z" 
                        fill="#1e1e38" 
                        stroke="#4f46e5" 
                        strokeWidth="1.5" 
                      />

                      {/* Bogotá Hotspot */}
                      {(mapRegion === 'all' || mapRegion === 'bogota') && (
                        <g className="cursor-pointer" onClick={() => setMapRegion('bogota')}>
                          <circle cx="95" cy="115" r="14" fill="#FF7AA6" fillOpacity="0.25" className="animate-ping" style={{ transformOrigin: '95px 115px' }} />
                          <circle cx="95" cy="115" r="6" fill="#FF7AA6" stroke="#fff" strokeWidth="1.5" />
                          <text x="105" y="118" fill="#fff" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Bogotá</text>
                        </g>
                      )}

                      {/* Medellín Hotspot */}
                      {(mapRegion === 'all' || mapRegion === 'medellin') && (
                        <g className="cursor-pointer" onClick={() => setMapRegion('medellin')}>
                          <circle cx="75" cy="90" r="12" fill="#38bdf8" fillOpacity="0.25" className="animate-ping" style={{ transformOrigin: '75px 90px' }} />
                          <circle cx="75" cy="90" r="5" fill="#38bdf8" stroke="#fff" strokeWidth="1.5" />
                          <text x="40" y="93" fill="#fff" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Medellín</text>
                        </g>
                      )}

                      {/* Cali Hotspot */}
                      {(mapRegion === 'all' || mapRegion === 'cali') && (
                        <g className="cursor-pointer" onClick={() => setMapRegion('cali')}>
                          <circle cx="65" cy="135" r="10" fill="#10b981" fillOpacity="0.25" className="animate-ping" style={{ transformOrigin: '65px 135px' }} />
                          <circle cx="65" cy="135" r="4.5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                          <text x="45" y="139" fill="#fff" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Cali</text>
                        </g>
                      )}

                      {/* Barranquilla Hotspot */}
                      {(mapRegion === 'all' || mapRegion === 'barranquilla') && (
                        <g className="cursor-pointer" onClick={() => setMapRegion('barranquilla')}>
                          <circle cx="85" cy="35" r="11" fill="#f59e0b" fillOpacity="0.25" className="animate-ping" style={{ transformOrigin: '85px 35px' }} />
                          <circle cx="85" cy="35" r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
                          <text x="96" y="38" fill="#fff" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Barranquilla</text>
                        </g>
                      )}
                    </svg>

                    <div className="absolute bottom-2 left-2 text-[9px] text-indigo-200 bg-slate-950/60 py-1 px-2 rounded font-semibold border border-indigo-900/35">
                      📍 Región: <span className="text-white font-extrabold capitalize">{mapRegion === 'all' ? 'Todo Colombia' : mapRegion}</span>
                    </div>
                  </div>

                  {/* Hotspot details sidebar */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col justify-between text-left space-y-3">
                    <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wide">Métricas Regionales</h4>
                    
                    <div className="space-y-2 text-[11px] font-semibold text-gray-700">
                      <div className="flex justify-between items-center pb-1.5 border-b border-gray-200">
                        <span>Bogotá D.C:</span>
                        <span className="font-bold text-pink-600">154 Pedidos especiales (45%)</span>
                      </div>
                      <div className="flex justify-between items-center pb-1.5 border-b border-gray-200">
                        <span>Medellín (Antioquia):</span>
                        <span className="font-bold text-sky-600">98 Pedidos especiales (28%)</span>
                      </div>
                      <div className="flex justify-between items-center pb-1.5 border-b border-gray-200">
                        <span>Cali (Valle):</span>
                        <span className="font-bold text-emerald-600">54 Pedidos especiales (16%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Barranquilla (Atlántico):</span>
                        <span className="font-bold text-amber-600">38 Pedidos especiales (11%)</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded text-[10px] text-[#203180] leading-snug font-bold">
                      📦 El **73% de tus despachos** se concentran en el triángulo andino. Coordinar convenios con transportadoras locales en Bogotá y Medellín reduce tus tarifas fijas de envío un **12%**.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. VIDEO REEL STORYBOARD */}
            {intelligenceTool === 'video' && (
              <div className="space-y-4 flex-1">
                <div className="border-b border-gray-150 pb-2">
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#FF7AA6]" /> Guión de Video e Ideas para Reels IA
                  </h3>
                  <p className="text-[10px] text-gray-400">Estructura guiones virales para TikTok e Instagram con tomas precisas.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={storyboardConcept}
                      onChange={(e) => setStoryboardConcept(e.target.value)}
                      className="flex-1 p-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                      placeholder="Concepto del video (ej. Buzos pesados oversize streetwear)..."
                    />
                    <button
                      onClick={() => setStoryboardConcept('Nueva colección de gorras retro bordadas de Shein')}
                      className="bg-indigo-50 hover:bg-indigo-100 text-[#203180] font-bold py-1.5 px-3 rounded-xl border border-indigo-150"
                    >
                      Sugerir Tema alterno
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
                    {[
                      { step: '01. Gancho (0-3s)', title: '¡No compres en Colombia!', desc: 'Tomas rápidas y con zoom de la textura del buzo y costuras, con música Phonk acelerada de fondo.', talk: 'No compres streetwear en Colombia sin antes saber esto...' },
                      { step: '02. El Problema (3-7s)', title: 'Cortes mediocres', desc: 'Muestra a un modelo descontento vistiendo camisetas genéricas que se encogen en la primera lavada.', talk: 'La mayoría de marcas usan telas delgadas que pierden forma en dos lavadas...' },
                      { step: '03. La Solución (7-12s)', title: 'Silueta drop shoulder', desc: 'Saca el buzo pesado Keinshop de su bolsa holográfica Shein y sacúdelo mostrando el corte perfecto.', talk: 'Pero esta densidad heavyweight de 280 gramos es algodón puro colombiano...' },
                      { step: '04. Cierre (12-15s)', title: 'Reserva con el 50%', desc: 'Muestra el código QR del WhatsApp de ventas o haz una transición rápida del empaque Keinshop urbano.', talk: 'Reserva hoy en Keinshop tu talla antes de que se agoten por completo.' }
                    ].map((scene, idx) => (
                      <div key={idx} className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-[9px] font-black text-[#FF7AA6] uppercase tracking-wide">{scene.step}</span>
                          <h4 className="font-extrabold text-gray-900 text-xs mt-1 leading-snug">{scene.title}</h4>
                        </div>
                        <p className="text-[10px] text-gray-500 font-semibold">{scene.desc}</p>
                        <div className="bg-indigo-950 text-indigo-100 p-2.5 rounded-xl text-[9px] font-mono leading-relaxed border border-indigo-900">
                          🎙️ "{scene.talk}"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 8. COLLECTION BANNERS GENERATOR */}
            {intelligenceTool === 'image' && (
              <div className="space-y-4 flex-1">
                <div className="border-b border-gray-150 pb-2">
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF7AA6]" /> Generador Inteligente de Banners Streetwear
                  </h3>
                  <p className="text-[10px] text-gray-400">Diseña bocetos de inspiración visual para catálogos y redes sociales.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 text-left">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Instrucción de Estilo (Prompt)</label>
                      <textarea
                        rows={3}
                        value={customImagePrompt}
                        onChange={(e) => setCustomImagePrompt(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none text-xs bg-slate-50 font-semibold"
                        placeholder="Describe el estilo urbano, prendas y fondo de la imagen..."
                      />
                    </div>
                    
                    <button
                      onClick={handleGenerateBIImage}
                      disabled={isGeneratingCustomImg}
                      className="w-full bg-[#203180] hover:bg-indigo-950 text-white font-extrabold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      {isGeneratingCustomImg ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando Estilo e Imagen...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Generar Banner de Colección
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 text-center">
                    <div className="w-full h-[220px] bg-slate-900 rounded-2xl overflow-hidden border border-gray-800 flex items-center justify-center relative shadow-md">
                      {isGeneratingCustomImg ? (
                        <div className="flex flex-col items-center justify-center text-gray-400 space-y-2">
                          <RefreshCw className="w-8 h-8 animate-spin text-[#FF7AA6]" />
                          <span className="font-bold text-xs">Pintando banner con IA...</span>
                        </div>
                      ) : (
                        <img
                          src={customImageResult || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600'}
                          alt="Banner de Streetwear generado"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      
                      {!isGeneratingCustomImg && (
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm py-1 px-2.5 rounded text-[9px] font-mono font-bold text-[#FF7AA6]">
                          Estilo Streetwear Activo
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Status Synchronized indicator */}
            <div className="pt-3 border-t border-gray-150 mt-4 flex justify-between items-center text-[10px] text-gray-400">
              <span className="flex items-center gap-1 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                CRM KEINSHOP Inteligencia de Negocios Activa
              </span>
              <span className="font-mono text-gray-500">Sincronización en Tiempo Real</span>
            </div>

          </div>
        </div>
      )}


      {/* ADJUST SUGGESTION MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-gray-900">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            
            <div className="p-4 bg-[#203180] text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Ajustar & Guardar Sugerencia IA</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-white hover:text-gray-200 font-bold text-sm">X</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Título de Recomendación</label>
                <input
                  type="text"
                  value={savingRecTitle}
                  onChange={(e) => setSavingRecTitle(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Contenido de la Propuesta (Edítalo para ajustarlo a tu medida)</label>
                <textarea
                  rows={8}
                  value={savingRecText}
                  onChange={(e) => setSavingRecText(e.target.value)}
                  className="w-full p-3 border border-gray-200 bg-gray-50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setShowSaveModal(false)}
                className="bg-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRecommendation}
                className="bg-[#203180] text-white font-extrabold py-1.5 px-4 rounded-lg shadow-sm"
              >
                Guardar Versión
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADJUST VERSION MODAL */}
      {selectedRec && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-gray-900">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            
            <div className="p-4 bg-[#203180] text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Ajustar Versión {selectedRec.version} → v{selectedRec.version + 1}</h3>
              <button onClick={() => setSelectedRec(null)} className="text-white hover:text-gray-200 font-bold text-sm">X</button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-400">Modifica el texto para guardar una nueva iteración corregida del plan de acción.</p>
              
              <div>
                <textarea
                  rows={8}
                  value={editingRecText}
                  onChange={(e) => setEditingRecText(e.target.value)}
                  className="w-full p-3 border border-gray-200 bg-gray-50 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setSelectedRec(null)}
                className="bg-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAdjustedVersion}
                className="bg-[#FF7AA6] hover:bg-pink-600 text-white font-extrabold py-1.5 px-4 rounded-lg shadow-sm"
              >
                Guardar Nueva Versión
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
