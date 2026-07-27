import React, { useState } from 'react';
import { 
  Plus, 
  Briefcase, 
  Trash2, 
  Calendar, 
  RefreshCw, 
  X, 
  Sparkles, 
  Wrench, 
  Gift, 
  Shirt, 
  TrendingUp, 
  Info,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Investment {
  id: string;
  name: string;
  amount: number;
  category: 'empaques' | 'prendas' | 'utensilios' | 'otros';
  date: string;
  notes: string;
}

interface GestionInversionesProps {
  investments: Investment[];
  loadingInvestments: boolean;
  onSaveInvestment: (invPayload: { id?: string; name: string; amount: number; category: 'empaques' | 'prendas' | 'utensilios' | 'otros'; date: string; notes: string }) => Promise<void>;
  onDeleteInvestment: (id: string) => Promise<void>;
  role: string;
  loadingAi: boolean;
  aiAdvice: {
    loans_analysis: string;
    investments_analysis: string;
    cash_flow_projection: string;
    tips: string[];
  } | null;
  onFetchAiAdvice: () => void;
}

export default function GestionInversiones({
  investments,
  loadingInvestments,
  onSaveInvestment,
  onDeleteInvestment,
  role,
  loadingAi,
  aiAdvice,
  onFetchAiAdvice
}: GestionInversionesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<'empaques' | 'prendas' | 'utensilios' | 'otros'>('empaques');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Financial Metrics
  const totalInverted = investments.reduce((sum, i) => sum + i.amount, 0);
  const packingAmount = investments.filter(i => i.category === 'empaques').reduce((sum, i) => sum + i.amount, 0);
  const garmentsAmount = investments.filter(i => i.category === 'prendas').reduce((sum, i) => sum + i.amount, 0);
  const toolsAmount = investments.filter(i => i.category === 'utensilios').reduce((sum, i) => sum + i.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (amount <= 0) return;

    setSaving(true);
    try {
      await onSaveInvestment({
        id: editingInvestment?.id,
        name,
        amount: Number(amount),
        category,
        date,
        notes
      });
      // Reset form
      setName('');
      setAmount(0);
      setCategory('empaques');
      setNotes('');
      setEditingInvestment(null);
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'empaques':
        return <Gift className="w-3.5 h-3.5 text-pink-600" />;
      case 'prendas':
        return <Shirt className="w-3.5 h-3.5 text-blue-600" />;
      case 'utensilios':
        return <Wrench className="w-3.5 h-3.5 text-green-600" />;
      default:
        return <Briefcase className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'empaques':
        return 'Empaques / Branding';
      case 'prendas':
        return 'Prendas / Muestrarios';
      case 'utensilios':
        return 'Utensilios / Máquinas';
      default:
        return 'Otros Activos';
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'empaques':
        return 'bg-pink-50 border-pink-100 text-pink-700';
      case 'prendas':
        return 'bg-blue-50 border-blue-100 text-blue-700';
      case 'utensilios':
        return 'bg-green-50 border-green-100 text-green-700';
      default:
        return 'bg-gray-50 border-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* KPI Cards in snug flex-wrap layout */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-white px-5 py-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-5 w-fit min-w-[200px]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Inversión Total</p>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">
                ${totalInverted.toLocaleString('es-CO')}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white px-5 py-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-5 w-fit min-w-[200px]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-pink-50 text-pink-600 rounded-xl">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Empaques / Branding</p>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">
                ${packingAmount.toLocaleString('es-CO')}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white px-5 py-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-5 w-fit min-w-[200px]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Prendas y Modelos</p>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">
                ${garmentsAmount.toLocaleString('es-CO')}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white px-5 py-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-5 w-fit min-w-[200px]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Utensilios / Equipos</p>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">
                ${toolsAmount.toLocaleString('es-CO')}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-black text-gray-900 text-base" translate="no">Inversiones de Capital de Trabajo</h3>
            <p className="text-xs text-gray-400">Control de gastos permanentes orientados a revalorizar la imagen de KEINSHOP, empaques, equipo y stock de muestras.</p>
          </div>
          {role !== 'Gestor de Contenido' && (
            <button
              onClick={() => {
                if (showAddForm) {
                  setShowAddForm(false);
                  setEditingInvestment(null);
                  setName('');
                  setAmount(0);
                  setCategory('empaques');
                  setNotes('');
                } else {
                  setShowAddForm(true);
                }
              }}
              className="bg-[#203180] text-white hover:bg-indigo-900 font-extrabold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1 transition-all active:scale-95"
            >
              {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showAddForm ? (editingInvestment ? 'Cancelar Edición' : 'Cancelar') : 'Registrar Inversión'}
            </button>
          )}
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit} 
              className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Concepto / Nombre</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ej: Cajas personalizadas de cartón corrugado"
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Monto ($ COP)</label>
                  <input
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    placeholder="Ej: 850000"
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none font-bold"
                  >
                    <option value="empaques">Empaques / Branding</option>
                    <option value="prendas">Prendas / Muestras / Catálogo</option>
                    <option value="utensilios">Utensilios / Máquinas / Herramientas</option>
                    <option value="otros">Otros Activos / Adecuación</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Fecha de Compra</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Notas / Detalles adicionales</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Adquirido con distribuidor local, incluye IVA"
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#203180] text-white font-extrabold py-1.5 px-4 rounded-lg flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Guardando...' : editingInvestment ? 'Actualizar Inversión' : 'Registrar Inversión'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Table List */}
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Notas</th>
                <th className="px-4 py-3">Inversión</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {loadingInvestments ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                    Cargando listado de inversiones...
                  </td>
                </tr>
              ) : investments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No hay registros de inversiones de capital realizadas.
                  </td>
                </tr>
              ) : (
                investments.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">{inv.date}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{inv.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded border text-[10px] ${getCategoryBadgeClass(inv.category)}`}>
                        {getCategoryIcon(inv.category)}
                        {getCategoryLabel(inv.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{inv.notes || '-'}</td>
                    <td className="px-4 py-3 font-mono font-black text-sm text-gray-900">
                      ${inv.amount.toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-1.5">
                      {role === 'Admin' && (
                        <>
                          <button
                            onClick={() => {
                              setEditingInvestment(inv);
                              setName(inv.name);
                              setAmount(inv.amount);
                              setCategory(inv.category);
                              setDate(inv.date);
                              setNotes(inv.notes || '');
                              setShowAddForm(true);
                            }}
                            className="p-1 text-gray-400 hover:text-[#203180] transition-colors"
                            title="Editar inversión"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteInvestment(inv.id)}
                            className="p-1 text-gray-400 hover:text-[#C80C0C] transition-colors"
                            title="Eliminar inversión"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* IA Predictor Box */}
      <div className="bg-[#1F1F2E] text-white p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FF2D6D] animate-bounce" />
            <h4 className="text-sm font-black tracking-wider uppercase text-white" translate="no">IA Predictiva: Retorno y Proyecciones de Inversión</h4>
          </div>
          <button
            onClick={onFetchAiAdvice}
            disabled={loadingAi}
            className="text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${loadingAi ? 'animate-spin' : ''}`} />
            Actualizar Diagnóstico
          </button>
        </div>

        {loadingAi ? (
          <div className="py-6 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-[#FF2D6D] animate-spin mx-auto animate-spin" />
            <p className="text-xs text-gray-400">Consultando predicciones de inversión y retorno...</p>
          </div>
        ) : aiAdvice ? (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest block">Análisis de Inversiones</span>
                <p className="text-gray-200 font-medium">{aiAdvice.investments_analysis}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest block">Proyección Flujo de Caja</span>
                <p className="text-gray-200 font-medium">{aiAdvice.cash_flow_projection}</p>
              </div>
            </div>

            <div className="bg-[#FF2D6D]/10 p-4 rounded-2xl border border-[#FF2D6D]/20 space-y-2">
              <span className="text-[10px] text-[#FF2D6D] uppercase font-black tracking-widest block">Estrategia de Optimización IA</span>
              <ul className="list-disc pl-4 space-y-1 text-gray-200 font-semibold">
                {aiAdvice.tips?.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <button
              onClick={onFetchAiAdvice}
              className="bg-[#FF2D6D] hover:bg-pink-600 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition-all"
            >
              Cargar Recomendaciones de IA
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
