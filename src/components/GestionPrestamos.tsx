import React, { useState } from 'react';
import { 
  Plus, 
  Coins, 
  Trash2, 
  Calendar, 
  RefreshCw, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Info,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Loan {
  id: string;
  name: string;
  amount: number;
  date: string;
  notes: string;
  status: 'pendiente' | 'pagado';
  type?: 'otorgado' | 'recibido';
}

interface GestionPrestamosProps {
  loans: Loan[];
  loadingLoans: boolean;
  onSaveLoan: (loanPayload: { id?: string; name: string; amount: number; date: string; notes: string; status: 'pendiente' | 'pagado'; type?: 'otorgado' | 'recibido' }) => Promise<void>;
  onToggleStatus: (loan: Loan) => Promise<void>;
  onDeleteLoan: (id: string) => Promise<void>;
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

export default function GestionPrestamos({
  loans,
  loadingLoans,
  onSaveLoan,
  onToggleStatus,
  onDeleteLoan,
  role,
  loadingAi,
  aiAdvice,
  onFetchAiAdvice
}: GestionPrestamosProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pendiente' | 'pagado'>('pendiente');
  const [type, setType] = useState<'otorgado' | 'recibido'>('otorgado');
  const [saving, setSaving] = useState(false);

  // Financial Metrics - Otorgados
  const totalLoaned = loans.filter(l => !l.type || l.type === 'otorgado').reduce((sum, l) => sum + l.amount, 0);
  const pendingAmount = loans.filter(l => (!l.type || l.type === 'otorgado') && l.status === 'pendiente').reduce((sum, l) => sum + l.amount, 0);
  const paidAmount = loans.filter(l => (!l.type || l.type === 'otorgado') && l.status === 'pagado').reduce((sum, l) => sum + l.amount, 0);

  // Financial Metrics - Recibidos
  const totalReceived = loans.filter(l => l.type === 'recibido').reduce((sum, l) => sum + l.amount, 0);
  const pendingReceived = loans.filter(l => l.type === 'recibido' && l.status === 'pendiente').reduce((sum, l) => sum + l.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (amount <= 0) return;

    setSaving(true);
    try {
      await onSaveLoan({
        id: editingLoan ? editingLoan.id : undefined,
        name,
        amount: Number(amount),
        date,
        notes,
        status,
        type
      });
      // Reset form
      setName('');
      setAmount(0);
      setNotes('');
      setStatus('pendiente');
      setType('otorgado');
      setEditingLoan(null);
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* KPI Cards in snug flex-wrap layout */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-white px-5 py-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-5 w-fit min-w-[200px]">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cartera de Préstamos</p>
              <h3 className="text-xl font-black text-gray-900 mt-0.5">
                ${totalLoaned.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-black px-2 py-1 rounded">
            Total
          </span>
        </div>

        <div className="bg-white px-5 py-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-5 w-fit min-w-[200px]">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-red-50 text-[#C80C0C] rounded-xl">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Por Cobrar (Pendiente)</p>
              <h3 className="text-xl font-black text-gray-900 mt-0.5">
                ${pendingAmount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <span className="text-xs bg-red-100 text-[#C80C0C] font-black px-2 py-1 rounded">
            Activo
          </span>
        </div>

        <div className="bg-white px-5 py-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-5 w-fit min-w-[200px]">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Capital Recuperado</p>
              <h3 className="text-xl font-black text-gray-900 mt-0.5">
                ${paidAmount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <span className="text-xs bg-green-100 text-green-700 font-black px-2 py-1 rounded">
            Pagado
          </span>
        </div>

        <div className="bg-white px-5 py-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-5 w-fit min-w-[200px]">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Préstamos Recibidos</p>
              <h3 className="text-xl font-black text-gray-900 mt-0.5">
                ${totalReceived.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-gray-500 font-bold mt-0.5">Pendiente: ${pendingReceived.toLocaleString('es-CO')}</p>
            </div>
          </div>
          <span className="text-xs bg-amber-100 text-amber-700 font-black px-2 py-1 rounded">
            Pasivo
          </span>
        </div>
      </div>

      {/* Main Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-black text-gray-900 text-base" translate="no">Control de Préstamos Externos</h3>
            <p className="text-xs text-gray-400">Control estricto de dinero prestado a personal o colaboradores externos.</p>
          </div>
          {role !== 'Gestor de Contenido' && (
            <button
              onClick={() => {
                if (showAddForm) {
                  setEditingLoan(null);
                  setName('');
                  setAmount(0);
                  setNotes('');
                  setStatus('pendiente');
                }
                setShowAddForm(!showAddForm);
              }}
              className="bg-[#203180] text-white hover:bg-indigo-900 font-extrabold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1 transition-all active:scale-95"
            >
              {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showAddForm ? 'Cancelar' : 'Registrar Préstamo'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Nombre del Deudor (Editable)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ej: Juan Pérez"
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
                    placeholder="Ej: 150000"
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Fecha de Préstamo</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Tipo de Préstamo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'otorgado' | 'recibido')}
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none font-bold"
                  >
                    <option value="otorgado">Otorgado (Prestamos dinero)</option>
                    <option value="recibido">Recibido (Nos prestan dinero)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Estado Inicial / Actual</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'pendiente' | 'pagado')}
                    className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-gray-600 uppercase mb-1">Notas / Propósito</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Adelanto de nómina, flete de emergencia, etc."
                  className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                />
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
                  {saving ? 'Guardando...' : editingLoan ? 'Actualizar Préstamo' : 'Registrar Préstamo'}
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
                <th className="px-4 py-3">Persona</th>
                <th className="px-4 py-3">Notas</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {loadingLoans ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                    Cargando listado de préstamos...
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No hay registros de préstamos realizados.
                  </td>
                </tr>
              ) : (
                loans.map(loan => (
                  <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">{loan.date}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{loan.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          loan.type === 'recibido' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {loan.type === 'recibido' ? 'Recibido' : 'Otorgado'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{loan.notes || '-'}</td>
                    <td className="px-4 py-3 font-mono font-black text-sm text-gray-900">
                      ${loan.amount.toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onToggleStatus(loan)}
                        disabled={role === 'Gestor de Contenido'}
                        className={`inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded cursor-pointer transition-all active:scale-95 disabled:opacity-50 ${
                          loan.status === 'pagado' 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-[#C80C0C] hover:bg-red-200'
                        }`}
                        title="Cambiar estado"
                      >
                        {loan.status === 'pagado' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {loan.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingLoan(loan);
                          setName(loan.name);
                          setAmount(loan.amount);
                          setDate(loan.date);
                          setNotes(loan.notes);
                          setStatus(loan.status);
                          setType(loan.type || 'otorgado');
                          setShowAddForm(true);
                        }}
                        className="p-1 text-gray-400 hover:text-[#203180] transition-colors"
                        title="Editar préstamo / deudor"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {role === 'Admin' && (
                        <button
                          onClick={() => onDeleteLoan(loan.id)}
                          className="p-1 text-gray-400 hover:text-[#C80C0C] transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
            <h4 className="text-sm font-black tracking-wider uppercase text-white" translate="no">IA Predictiva: Análisis de Crédito y Liquidez</h4>
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
            <p className="text-xs text-gray-400">Consultando predicciones de inversión y liquidez...</p>
          </div>
        ) : aiAdvice ? (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest block">Análisis de Préstamos</span>
                <p className="text-gray-200 font-medium">{aiAdvice.loans_analysis}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest block">Proyección Flujo de Caja</span>
                <p className="text-gray-200 font-medium">{aiAdvice.cash_flow_projection}</p>
              </div>
            </div>

            <div className="bg-[#FF2D6D]/10 p-4 rounded-2xl border border-[#FF2D6D]/20 space-y-2">
              <span className="text-[10px] text-[#FF2D6D] uppercase font-black tracking-widest block">Recomendaciones Estratégicas</span>
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
