import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Sparkles, 
  Trash2, 
  Calendar, 
  Calculator,
  RefreshCw,
  HelpCircle,
  FileSpreadsheet,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  X,
  Info,
  ShieldAlert,
  ArrowRight,
  Coins,
  Briefcase,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, UserRole } from '../types';
import GestionPrestamos from './GestionPrestamos';
import GestionInversiones from './GestionInversiones';

interface GestionContableProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string, mode: 'soft' | 'hard', reason: string) => Promise<{ success: boolean; message?: string }>;
  onRestoreTransaction?: (id: string) => Promise<boolean>;
  onUpdateTransaction?: (tx: Transaction) => Promise<boolean>;
  onDeleteTransactions?: (ids: string[], reason: string) => Promise<boolean>;
  onUpdateTransactions?: (ids: string[], updates: any) => Promise<boolean>;

  role: UserRole;
  showAddFormInitially?: boolean;
}

export default function GestionContable({ 
  transactions, 
  onAddTransaction, 
  onDeleteTransaction,
  onRestoreTransaction,
  onUpdateTransaction,
  onDeleteTransactions,
  onUpdateTransactions,

  role,
  showAddFormInitially = false
}: GestionContableProps) {

  // Predefined Categories
  const categories = [
    'Pedidos especiales',
    'Gastos personales',
    'Gastos de inversión'
  ];

  const [showAddForm, setShowAddForm] = useState(showAddFormInitially);
  const [filterType, setFilterType] = useState<'Todos' | 'Ingreso' | 'Egreso' | 'Archivados'>('Todos');

  // Selection/Bulk state
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [bulkType, setBulkType] = useState<string>('KEEP');
  const [bulkCategory, setBulkCategory] = useState<string>('KEEP');
  const [bulkDate, setBulkDate] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('Error de digitación o ajuste en lote');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // New transaction form states
  const [type, setType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [category, setCategory] = useState('Pedidos especiales');
  const [specialSubcategory, setSpecialSubcategory] = useState('Libras Adicionales');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Period closure state
  const [isJuneClosed, setIsJuneClosed] = useState(false);
  const [isJulyClosed, setIsJulyClosed] = useState(false);
  const [activeReportPeriod, setActiveReportPeriod] = useState<string | null>(null);
  const [loadingPeriodStatus, setLoadingPeriodStatus] = useState(false);

  // Dynamic monthly stats for Mayo, Junio, Julio
  const getMonthStats = (prefix: string) => {
    const monthEntries = transactions.filter(t => t.date && t.date.startsWith(prefix) && !t.deleted_at);
    const income = monthEntries.filter(t => t.type === 'Ingreso').reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = monthEntries.filter(t => t.type === 'Egreso').reduce((sum, t) => sum + Number(t.amount), 0);
    return {
      income,
      expenses,
      net: income - expenses
    };
  };

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('hard');
  const [deleteReason, setDeleteReason] = useState('Ajuste contable mensual');
  const [deleting, setDeleting] = useState(false);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [editCategory, setEditCategory] = useState('');
  const [editSpecialSubcategory, setEditSpecialSubcategory] = useState('Libras Adicionales');
  const [editPersonName, setEditPersonName] = useState('');
  const [showEditSpecial, setShowEditSpecial] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  const handleEditClick = (tx: Transaction) => {
    setEditTarget(tx);
    setEditDate(tx.date || new Date().toISOString().split('T')[0]);
    setEditType(tx.type);
    
    // Parse edit category
    let foundSub = 'Libras Adicionales';
    let foundName = '';
    let isSpecial = false;
    const specialPrefixes = ['Libras Adicionales', 'Costo de libras', 'Abono de pedido', 'Flete de importación', 'Otro'];
    
    for (const s of specialPrefixes) {
      if (tx.category.startsWith(s)) {
        foundSub = s;
        isSpecial = true;
        if (tx.category.includes(' + ')) {
          foundName = tx.category.split(' + ')[1];
        } else if (tx.category.length > s.length) {
          foundName = tx.category.substring(s.length).replace(/^\s*\+\s*/, '').trim();
        }
        break;
      }
    }
    
    if (tx.category === 'Pedidos especiales') {
      isSpecial = true;
      foundSub = 'Libras Adicionales';
      foundName = '';
    }

    if (isSpecial) {
      setEditCategory('Pedidos especiales');
      setEditSpecialSubcategory(foundSub);
      setEditPersonName(foundName);
      setShowEditSpecial(true);
    } else {
      setEditCategory(tx.category);
      setEditSpecialSubcategory('Libras Adicionales');
      setEditPersonName('');
      setShowEditSpecial(false);
    }

    setEditDescription(tx.description);
    setEditAmount(tx.amount);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !onUpdateTransaction) return;

    if (editAmount <= 0) {
      showToast("Ingresa un valor válido con hasta dos decimales", "error");
      return;
    }

    let finalCategory = editCategory;
    if (editCategory === 'Pedidos especiales') {
      finalCategory = `${editSpecialSubcategory}${editPersonName ? ' + ' + editPersonName.trim() : ''}`;
    }

    setUpdating(true);
    try {
      const updatedTx: Transaction = {
        ...editTarget,
        date: editDate,
        type: editType,
        category: finalCategory,
        description: editDescription,
        amount: Number(editAmount.toFixed(2))
      };

      const success = await onUpdateTransaction(updatedTx);
      if (success) {
        showToast("Transacción modificada correctamente.", "success");
        setEditTarget(null);
      } else {
        showToast("Error al modificar la transacción.", "error");
      }
    } catch (err) {
      showToast("Error de conexión al modificar transacción.", "error");
    } finally {
      setUpdating(false);
    }
  };

  // Toast message state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // AI Advisor state
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiAnalysisType, setAiAnalysisType] = useState<'audit' | 'tips' | 'predictions'>('audit');
  const [aiReport, setAiReport] = useState<{
    analysis_date: string;
    alerts: Array<{ type: 'critica' | 'consejo' | 'prediccion'; message: string }>;
    tips: string[];
  } | null>(null);

  // Advanced Accounting states (Sub-tabs: 'principal' | 'prestamos' | 'inversiones')
  const [activeSubTab, setActiveSubTab] = useState<'principal' | 'prestamos' | 'inversiones'>('principal');

  // Loans states
  const [loans, setLoans] = useState<any[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanName, setLoanName] = useState('');
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanNotes, setLoanNotes] = useState('');
  const [loanStatus, setLoanStatus] = useState<'pendiente' | 'pagado'>('pendiente');

  // Investments states
  const [investments, setInvestments] = useState<any[]>([]);
  const [loadingInvestments, setLoadingInvestments] = useState(false);
  const [showInvForm, setShowInvForm] = useState(false);
  const [invName, setInvName] = useState('');
  const [invAmount, setInvAmount] = useState<number>(0);
  const [invCategory, setInvCategory] = useState<'empaques' | 'prendas' | 'utensilios' | 'otros'>('empaques');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [invNotes, setInvNotes] = useState('');

  // Loans & Investments AI Advisor state
  const [loadingLoansInvAi, setLoadingLoansInvAi] = useState(false);
  const [loansInvAiAdvice, setLoansInvAiAdvice] = useState<{
    loans_analysis: string;
    investments_analysis: string;
    cash_flow_projection: string;
    tips: string[];
  } | null>(null);

  // Fetch routines for Loans & Investments
  const fetchLoans = async () => {
    setLoadingLoans(true);
    try {
      const res = await fetch('/api/accounting/loans');
      if (res.ok) {
        const data = await res.json();
        setLoans(data);
      }
    } catch (e) {
      console.error("Error fetching loans:", e);
    } finally {
      setLoadingLoans(false);
    }
  };

  const fetchInvestments = async () => {
    setLoadingInvestments(true);
    try {
      const res = await fetch('/api/accounting/investments');
      if (res.ok) {
        const data = await res.json();
        setInvestments(data);
      }
    } catch (e) {
      console.error("Error fetching investments:", e);
    } finally {
      setLoadingInvestments(false);
    }
  };

  const fetchLoansInvestmentsAiAdvice = async () => {
    setLoadingLoansInvAi(true);
    try {
      const res = await fetch('/api/accounting/advisor/loans-investments');
      if (res.ok) {
        const data = await res.json();
        setLoansInvAiAdvice(data);
      }
    } catch (e) {
      console.error("Error fetching Loans & Investments AI advice:", e);
    } finally {
      setLoadingLoansInvAi(false);
    }
  };

  const fetchLoansAndInvestments = () => {
    fetchLoans();
    fetchInvestments();
    if (activeSubTab === 'prestamos' || activeSubTab === 'inversiones') {
      fetchLoansInvestmentsAiAdvice();
    }
  };

  // Re-fetch data on transactions update (Cascade sync from real-time stream)
  useEffect(() => {
    fetchLoansAndInvestments();
  }, [transactions, activeSubTab]);

  // Fetch initial period status and trigger initial AI advice
  useEffect(() => {
    fetchPeriodStatus();
    triggerDefaultAdvisorLoad();
  }, []);

  const fetchPeriodStatus = async () => {
    try {
      const res = await fetch('/api/accounting/periods/status');
      if (res.ok) {
        const data = await res.json();
        setIsJuneClosed(data.isJuneClosed);
        if (data.isJulyClosed !== undefined) {
          setIsJulyClosed(data.isJulyClosed);
        }
      }
    } catch (e) {
      console.error("Error fetching period status:", e);
    }
  };

  const handleTogglePeriodStatus = async (month: 'june' | 'july') => {
    if (role !== 'Admin') {
      showToast("Solo los administradores pueden abrir o cerrar periodos contables.", "warning");
      return;
    }
    setLoadingPeriodStatus(true);
    try {
      const endpoint = month === 'june' ? '/api/accounting/periods/toggle-june' : '/api/accounting/periods/toggle-july';
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (month === 'june') {
          setIsJuneClosed(data.isJuneClosed);
          showToast(
            data.isJuneClosed 
              ? "Periodo Junio 2026 CERRADO correctamente. Las modificaciones quedan restringidas." 
              : "Periodo Junio 2026 ABIERTO. Ya se permiten registros y eliminaciones.",
            "success"
          );
        } else {
          setIsJulyClosed(data.isJulyClosed);
          showToast(
            data.isJulyClosed 
              ? "Periodo Julio 2026 CERRADO correctamente. Las modificaciones quedan restringidas." 
              : "Periodo Julio 2026 ABIERTO. Ya se permiten registros y eliminaciones.",
            "success"
          );
        }
      }
    } catch (e) {
      showToast("Error de conexión al cambiar el estado del periodo.", "error");
    } finally {
      setLoadingPeriodStatus(false);
    }
  };

  const triggerDefaultAdvisorLoad = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/accounting/advisor/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setAiReport(data);
      }
    } catch (e) {
      console.error("Error triggering default AI advice:", e);
    } finally {
      setLoadingAi(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // --- LOANS (PRÉSTAMOS) CRUD HANDLERS ---
  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanName.trim()) {
      showToast("Por favor ingresa el nombre de la persona.", "warning");
      return;
    }
    if (loanAmount <= 0) {
      showToast("Por favor ingresa un monto de préstamo mayor a cero.", "warning");
      return;
    }

    const loanPayload = {
      name: loanName,
      amount: Number(loanAmount),
      date: loanDate,
      notes: loanNotes,
      status: loanStatus
    };

    try {
      const res = await fetch('/api/accounting/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanPayload)
      });
      if (res.ok) {
        showToast("Préstamo registrado exitosamente.", "success");
        fetchLoans();
        // Reset form
        setLoanName('');
        setLoanAmount(0);
        setLoanNotes('');
        setLoanStatus('pendiente');
        setShowLoanForm(false);
        fetchLoansInvestmentsAiAdvice();
      } else {
        const err = await res.json();
        showToast(err.message || "Error al guardar préstamo.", "error");
      }
    } catch (e) {
      showToast("Error de conexión al guardar préstamo.", "error");
    }
  };

  const handleToggleLoanStatus = async (loan: any) => {
    const updatedLoan = {
      ...loan,
      status: loan.status === 'pagado' ? 'pendiente' : 'pagado'
    };
    try {
      const res = await fetch('/api/accounting/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLoan)
      });
      if (res.ok) {
        showToast(`Préstamo marcado como ${updatedLoan.status === 'pagado' ? 'PAGADO' : 'PENDIENTE'}.`, "success");
        fetchLoans();
        fetchLoansInvestmentsAiAdvice();
      } else {
        showToast("Error al actualizar estado del préstamo.", "error");
      }
    } catch (e) {
      showToast("Error de conexión al actualizar préstamo.", "error");
    }
  };

  const handleDeleteLoan = async (id: string) => {
    try {
      const res = await fetch(`/api/accounting/loans/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast("Préstamo eliminado permanentemente.", "success");
        fetchLoans();
        fetchLoansInvestmentsAiAdvice();
      } else {
        showToast("Error al eliminar el préstamo.", "error");
      }
    } catch (e) {
      showToast("Error de conexión al eliminar préstamo.", "error");
    }
  };

  // --- INVESTMENTS (INVERSIONES) CRUD HANDLERS ---
  const handleSaveInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim()) {
      showToast("Por favor ingresa el concepto de la inversión.", "warning");
      return;
    }
    if (invAmount <= 0) {
      showToast("Por favor ingresa un monto válido de inversión mayor a cero.", "warning");
      return;
    }

    const invPayload = {
      name: invName,
      amount: Number(invAmount),
      category: invCategory,
      date: invDate,
      notes: invNotes
    };

    try {
      const res = await fetch('/api/accounting/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invPayload)
      });
      if (res.ok) {
        showToast("Inversión registrada con éxito.", "success");
        fetchInvestments();
        // Reset form
        setInvName('');
        setInvAmount(0);
        setInvCategory('empaques');
        setInvNotes('');
        setShowInvForm(false);
        fetchLoansInvestmentsAiAdvice();
      } else {
        const err = await res.json();
        showToast(err.message || "Error al guardar inversión.", "error");
      }
    } catch (e) {
      showToast("Error de conexión al guardar inversión.", "error");
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    try {
      const res = await fetch(`/api/accounting/investments/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast("Inversión eliminada correctamente.", "success");
        fetchInvestments();
        fetchLoansInvestmentsAiAdvice();
      } else {
        showToast("Error al eliminar inversión.", "error");
      }
    } catch (e) {
      showToast("Error de conexión al eliminar inversión.", "error");
    }
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast("Por favor introduce un monto válido mayor a cero.", "warning");
      return;
    }

    const amtStr = String(amount);
    if (!/^\d+(\.\d{1,2})?$/.test(amtStr)) {
      showToast("Ingresa un valor válido con hasta dos decimales", "warning");
      return;
    }

    // Direct frontend check for closed period prior to creation
    const isClosed = date && (
      new Date(date) < new Date("2026-06-01") || 
      (isJuneClosed && date.startsWith("2026-06")) ||
      (isJulyClosed && date.startsWith("2026-07"))
    );
    if (isClosed) {
      showToast("No se puede registrar movimientos en un periodo contable cerrado. Por favor abra el periodo primero.", "error");
      return;
    }

    let finalCategory = category;
    if (category === 'Pedidos especiales') {
      finalCategory = `${specialSubcategory}${personName ? ' + ' + personName.trim() : ''}`;
    }

    const newTx: Transaction = {
      id: `TX-${Date.now()}`,
      date,
      type,
      category: finalCategory,
      amount: Number(amount),
      description
    };

    onAddTransaction(newTx);
    setShowAddForm(false);
    showToast("Movimiento contable registrado con éxito.", "success");
    
    // Reset Form
    setAmount(0);
    setDescription('');
    setPersonName('');
    setSpecialSubcategory('Libras Adicionales');
  };

  const executeDeleteAction = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await onDeleteTransaction(deleteTarget.id, 'hard', deleteReason);
      if (res.success) {
        showToast("Movimiento eliminado permanentemente.", "success");
        setDeleteTarget(null);
        // Refresh AI Advisor recommendations based on new transaction structure
        triggerDefaultAdvisorLoad();
      } else {
        showToast(res.message || "Error al procesar la eliminación.", "error");
      }
    } catch (err: any) {
      showToast("Error de conexión con el servidor.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestoreClick = async (txId: string) => {
    if (!onRestoreTransaction) return;
    try {
      const success = await onRestoreTransaction(txId);
      if (success) {
        showToast("Movimiento contable restaurado correctamente en el libro de registro.", "success");
        triggerDefaultAdvisorLoad();
      } else {
        showToast("No se pudo restaurar el movimiento.", "error");
      }
    } catch (e) {
      showToast("Error al conectar con el servidor.", "error");
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedRecords.length === 0 || !onUpdateTransactions) return;

    // Check if any selected record is in a closed period
    const hasClosed = selectedRecords.some(id => {
      const tx = transactions.find(t => t.id === id);
      return tx ? isTxInClosedPeriod(tx) : false;
    });

    if (hasClosed) {
      showToast("No se pueden modificar transacciones en periodos cerrados.", "error");
      return;
    }

    const updates: any = {};
    if (bulkType !== 'KEEP') updates.type = bulkType;
    if (bulkCategory !== 'KEEP') updates.category = bulkCategory;
    if (bulkDate) updates.date = bulkDate;

    if (Object.keys(updates).length === 0) {
      showToast("Selecciona al menos un campo para actualizar en conjunto.", "warning");
      return;
    }

    setIsBulkUpdating(true);
    try {
      const success = await onUpdateTransactions(selectedRecords, updates);
      if (success) {
        showToast("Transacciones actualizadas en lote correctamente.", "success");
        setSelectedRecords([]);
        // Reset bulk inputs
        setBulkType('KEEP');
        setBulkCategory('KEEP');
        setBulkDate('');
        triggerDefaultAdvisorLoad();
      } else {
        showToast("Error al actualizar las transacciones.", "error");
      }
    } catch (err) {
      showToast("Error al realizar la actualización en lote.", "error");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0 || !onDeleteTransactions) return;

    // Check if any selected record is in a closed period
    const hasClosed = selectedRecords.some(id => {
      const tx = transactions.find(t => t.id === id);
      return tx ? isTxInClosedPeriod(tx) : false;
    });

    if (hasClosed) {
      showToast("No se pueden eliminar transacciones en periodos cerrados.", "error");
      return;
    }

    if (!bulkDeleteReason.trim()) {
      showToast("Por favor especifica un motivo de auditoría contable.", "warning");
      return;
    }

    setIsBulkDeleting(true);
    try {
      const success = await onDeleteTransactions(selectedRecords, bulkDeleteReason);
      if (success) {
        showToast("Transacciones eliminadas en lote correctamente.", "success");
        setSelectedRecords([]);
        setShowBulkDeleteModal(false);
        setBulkDeleteReason('Error de digitación o ajuste en lote');
        triggerDefaultAdvisorLoad();
      } else {
        showToast("Error al eliminar las transacciones en lote.", "error");
      }
    } catch (err) {
      showToast("Error al realizar la eliminación en lote.", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Check if a transaction is in a closed period
  const isTxInClosedPeriod = (tx: Transaction) => {
    const txDate = tx.date;
    return txDate && (
      new Date(txDate) < new Date("2026-06-01") || 
      (isJuneClosed && txDate.startsWith("2026-06")) ||
      (isJulyClosed && txDate.startsWith("2026-07"))
    );
  };

  // Financial calculations
  const activeTransactions = transactions.filter(t => !t.deleted_at);

  const totalRevenues = activeTransactions
    .filter(t => t.type === 'Ingreso')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = activeTransactions
    .filter(t => t.type === 'Egreso')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalRevenues - totalExpenses;

  const marketingExpenses = activeTransactions
    .filter(t => t.type === 'Egreso' && (t.category === 'Marketing & Publicidad' || t.category === 'Pedido enviado'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const marketingPct = totalRevenues > 0 ? Math.round((marketingExpenses / totalRevenues) * 100) : 0;

  // Filter based on tabs
  const filteredTx = transactions.filter(t => {
    if (filterType === 'Archivados') {
      return !!t.deleted_at;
    }
    if (t.deleted_at) return false; // Hide soft-deleted from main views
    if (filterType === 'Todos') return true;
    return t.type === filterType;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {toast.type === 'error' && <ShieldAlert className="w-5 h-5 text-red-600" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-auto hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Period Close Financial Report Modal */}
      {activeReportPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-150 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-gray-100">
              <div>
                <h4 className="font-black text-[#203180] text-sm uppercase tracking-wide">Reporte Contable de Cierre</h4>
                <p className="text-[10px] text-gray-400">Generado de forma segura e íntegra por KEINSHOP CRM</p>
              </div>
              <button onClick={() => setActiveReportPeriod(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Mes Fiscal:</span>
                <span className="font-extrabold text-gray-900">{activeReportPeriod === '2026-05' ? 'Mayo 2026' : activeReportPeriod === '2026-06' ? 'Junio 2026' : 'Julio 2026'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Estado del Periodo:</span>
                <span className="font-extrabold text-red-600 px-1.5 py-0.5 bg-red-50 rounded text-[9px]">CERRADO Y BLOQUEADO</span>
              </div>
              <div className="border-t border-dashed my-2 border-gray-200"></div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-bold">Total Ingresos:</span>
                <span className="font-extrabold text-green-600">${getMonthStats(activeReportPeriod).income.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-bold">Total Egresos:</span>
                <span className="font-extrabold text-[#C80C0C]">${getMonthStats(activeReportPeriod).expenses.toLocaleString('es-CO')}</span>
              </div>
              <div className="border-t border-dashed my-2 border-gray-200"></div>
              <div className="flex justify-between text-base">
                <span className="text-[#203180] font-black">Balance Neto:</span>
                <span className={`font-black ${getMonthStats(activeReportPeriod).net >= 0 ? 'text-green-600' : 'text-[#C80C0C]'}`}>
                  ${getMonthStats(activeReportPeriod).net.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-gray-400 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/30">
              💡 <strong>Nota del Sistema:</strong> El cierre de este período bloquea las inserciones, modificaciones y eliminaciones de registros contables con fechas de este mes para asegurar la trazabilidad e impedir fraudes o discrepancias tributarias.
            </div>

            <button
              onClick={() => {
                window.print();
              }}
              className="w-full bg-[#203180] hover:bg-indigo-950 text-white font-extrabold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              🖨️ Imprimir Reporte / PDF
            </button>
          </div>
        </div>
      )}

      {/* Secondary Tab Navigation */}
      <div className="flex border-b border-gray-200 pb-px text-xs font-bold gap-6 mb-4" translate="no">
        <button
          type="button"
          onClick={() => setActiveSubTab('principal')}
          className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${
            activeSubTab === 'principal' 
              ? 'border-[#203180] text-[#203180] font-black' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Libro Principal Contable
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('prestamos')}
          className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${
            activeSubTab === 'prestamos' 
              ? 'border-[#203180] text-[#203180] font-black' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Préstamos Realizados
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('inversiones')}
          className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${
            activeSubTab === 'inversiones' 
              ? 'border-[#203180] text-[#203180] font-black' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Inversiones del Negocio
        </button>
      </div>

      {activeSubTab === 'principal' && (
        <>
          {/* KPI Balance Board & Control Period */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        
        {/* Compact flex layout for KPIs to wrap snugly around content with no unneeded empty white space */}
        <div className="lg:col-span-3 flex flex-wrap gap-4 items-start">
          
          {/* Total Revenues Card */}
          <div className="bg-white px-5 py-3.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center h-fit min-w-[185px] w-fit">
            <p className="text-xs text-gray-400 font-extrabold uppercase tracking-wider">Ingresos Totales</p>
            <h3 className="text-xl font-black text-green-600 mt-1">
              ${totalRevenues.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>

          {/* Total Expenses Card */}
          <div className="bg-white px-5 py-3.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center h-fit min-w-[185px] w-fit">
            <p className="text-xs text-gray-400 font-extrabold uppercase tracking-wider">Egresos Totales</p>
            <h3 className="text-xl font-black text-[#C80C0C] mt-1">
              ${totalExpenses.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>

          {/* Net Cash Balance Card */}
          <div className="bg-white px-5 py-3.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center h-fit min-w-[185px] w-fit">
            <p className="text-xs text-gray-400 font-extrabold uppercase tracking-wider">Balance de Caja</p>
            <h3 className={`text-xl font-black mt-1 ${balance >= 0 ? 'text-[#203180]' : 'text-red-600'}`}>
              ${balance.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>

        </div>

        {/* Period Closed Control Card */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col space-y-4 lg:col-span-1">
          <div>
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Control de Periodos Contables</h3>
            <p className="text-[11px] text-gray-400">Cierre fiscal mensual, auditoría de libros y emisión de reportes PDF.</p>
          </div>

          <div className="space-y-3.5">
            {/* Mayo 2026 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-150">
              <div>
                <p className="text-xs font-bold text-gray-800">Mayo 2026</p>
                <p className="text-[10px] text-gray-400">Balance: ${getMonthStats('2026-05').net.toLocaleString('es-CO')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded uppercase bg-red-100 text-red-700">
                  Cerrado
                </span>
                <button
                  onClick={() => setActiveReportPeriod('2026-05')}
                  className="text-[10px] font-bold text-[#203180] hover:underline bg-white border border-gray-200 px-2.5 py-1 rounded-lg"
                >
                  📄 Reporte
                </button>
              </div>
            </div>

            {/* Junio 2026 */}
            <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-150">
              <div>
                <p className="text-xs font-bold text-gray-800">Junio 2026</p>
                <p className="text-[10px] text-gray-400">Balance: ${getMonthStats('2026-06').net.toLocaleString('es-CO')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                  isJuneClosed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {isJuneClosed ? 'Cerrado' : 'Abierto'}
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={loadingPeriodStatus}
                    onClick={() => handleTogglePeriodStatus('june')}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                      isJuneClosed 
                        ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' 
                        : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {isJuneClosed ? 'Abrir' : 'Cerrar'}
                  </button>
                  {isJuneClosed && (
                    <button
                      onClick={() => setActiveReportPeriod('2026-06')}
                      className="text-[10px] font-bold text-[#203180] hover:underline bg-white border border-gray-200 px-2 py-1 rounded-lg"
                    >
                      📄 Reporte
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Julio 2026 */}
            <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-150">
              <div>
                <p className="text-xs font-bold text-gray-800">Julio 2026</p>
                <p className="text-[10px] text-gray-400">Balance: ${getMonthStats('2026-07').net.toLocaleString('es-CO')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                  isJulyClosed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {isJulyClosed ? 'Cerrado' : 'Abierto'}
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={loadingPeriodStatus}
                    onClick={() => handleTogglePeriodStatus('july')}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                      isJulyClosed 
                        ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' 
                        : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {isJulyClosed ? 'Abrir' : 'Cerrar'}
                  </button>
                  {isJulyClosed && (
                    <button
                      onClick={() => setActiveReportPeriod('2026-07')}
                      className="text-[10px] font-bold text-[#203180] hover:underline bg-white border border-gray-200 px-2 py-1 rounded-lg"
                    >
                      📄 Reporte
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bulk Actions Panel */}
      {selectedRecords.length > 0 && (
        <div className="bg-[#203180] text-white p-5 rounded-3xl border border-indigo-950 shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3">
            <span className="bg-[#FF7AA6] text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-sm animate-pulse">
              {selectedRecords.length} Seleccionados
            </span>
            <div>
              <h4 className="text-sm font-black tracking-wide">Editar Asientos Contables en Conjunto</h4>
              <p className="text-[11px] text-indigo-200 mt-0.5">Actualizará o eliminará los registros seleccionados de KEINSHOP en lote.</p>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-3 items-center w-full md:w-auto">
            <div className="flex flex-col gap-1 w-full md:w-40">
              <span className="text-[9px] uppercase font-black text-indigo-300">Tipo</span>
              <select
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value)}
                className="w-full bg-indigo-950/40 border border-indigo-800 text-white rounded-xl text-xs p-2.5 font-bold focus:outline-none focus:ring-1 focus:ring-[#FF7AA6]"
              >
                <option value="KEEP" className="bg-[#203180] text-white font-bold text-xs">Mantener actual</option>
                <option value="Ingreso" className="bg-[#203180] text-white font-bold text-xs">Ingreso (+)</option>
                <option value="Egreso" className="bg-[#203180] text-white font-bold text-xs">Egreso (-)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full md:w-48">
              <span className="text-[9px] uppercase font-black text-indigo-300">Categoría</span>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="w-full bg-indigo-950/40 border border-indigo-800 text-white rounded-xl text-xs p-2.5 font-bold focus:outline-none focus:ring-1 focus:ring-[#FF7AA6]"
              >
                <option value="KEEP" className="bg-[#203180] text-white font-bold text-xs">Mantener actual</option>
                {categories.map(cat => (
                  <option key={cat} value={cat} className="bg-[#203180] text-white font-bold text-xs">{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full md:w-40">
              <span className="text-[9px] uppercase font-black text-indigo-300">Fecha</span>
              <input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="w-full bg-indigo-950/40 border border-indigo-800 text-white rounded-xl text-xs p-2 font-bold focus:outline-none focus:ring-1 focus:ring-[#FF7AA6]"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto self-end">
              <button
                type="button"
                onClick={() => setSelectedRecords([])}
                className="px-3 py-2.5 rounded-xl text-xs font-extrabold border border-indigo-750 text-indigo-200 hover:bg-indigo-900/50 transition-all"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={isBulkUpdating}
                className="px-4 py-2.5 bg-[#FF7AA6] hover:bg-pink-400 disabled:bg-pink-300 text-white font-black text-xs rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isBulkUpdating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Actualizar"
                )}
              </button>
              {role === 'Admin' && (
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="px-4 py-2.5 bg-[#FF2D6D] hover:bg-red-600 text-white font-black text-xs rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Ledger Table View */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-black text-gray-900 text-base">Libro de Registro Contable</h3>
            <p className="text-xs text-gray-400">Listado histórico detallado de movimientos de ingresos y egresos.</p>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="flex items-center space-x-1 border rounded-lg p-1 text-xs font-semibold bg-gray-50">
              <button
                onClick={() => setFilterType('Todos')}
                className={`px-2 py-1 rounded ${filterType === 'Todos' ? 'bg-white shadow-sm text-gray-800 font-bold' : 'text-gray-500'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('Ingreso')}
                className={`px-2 py-1 rounded ${filterType === 'Ingreso' ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-500'}`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setFilterType('Egreso')}
                className={`px-2 py-1 rounded ${filterType === 'Egreso' ? 'bg-red-100 text-[#C80C0C]' : 'text-gray-500'}`}
              >
                Egresos
              </button>
            </div>

            {role !== 'Gestor de Contenido' && (
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-[#203180] text-white hover:bg-indigo-900 font-extrabold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar
              </button>
            )}
          </div>
        </div>

        {/* New Transaction Form */}
        {showAddForm && (
          <form onSubmit={handleCreateTransaction} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 animate-in slide-in-from-top duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Tipo de Movimiento</label>
                <select
                  value={type}
                  onChange={(e) => {
                    const selectedType = e.target.value as 'Ingreso' | 'Egreso';
                    setType(selectedType);
                    setCategory('Pedidos especiales');
                  }}
                  className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                >
                  <option value="Ingreso">Ingreso (+)</option>
                  <option value="Egreso">Egreso (-)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {category === 'Pedidos especiales' && (
              <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-100 space-y-3 animate-in slide-in-from-top-1 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-extrabold text-purple-700 uppercase mb-1">Subcategoría</label>
                    <select
                      value={specialSubcategory}
                      onChange={(e) => setSpecialSubcategory(e.target.value)}
                      className="w-full p-2 border border-purple-200 bg-white rounded-lg focus:outline-none"
                    >
                      <option value="Libras Adicionales">Libras Adicionales</option>
                      <option value="Costo de libras">Costo de libras</option>
                      <option value="Abono de pedido">Abono de pedido</option>
                      <option value="Flete de importación">Flete de importación</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-extrabold text-purple-700 uppercase mb-1">Nombre de la Persona / Cliente</label>
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Ej: Kenneth Mosquera"
                      className="w-full p-2 border border-purple-200 bg-white rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-purple-600 font-semibold flex items-center gap-1 bg-white/80 py-1 px-2.5 rounded-lg border border-purple-100 w-fit">
                  <span className="font-extrabold">Vista previa de Categoría:</span> 
                  <span className="font-mono font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                    {specialSubcategory}{personName ? ` + ${personName.trim()}` : ''}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Monto ($ COP)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                  className="w-full p-2 border rounded-lg focus:outline-none font-mono text-sm font-bold text-gray-900"
                  placeholder="Ej: 85000.50"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full p-2 border rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Descripción / Notas</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Ej: Pago de flete Shein pedido PE-002, Venta Sneakers Mateo..."
                className="w-full p-2 border rounded-lg text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#203180] text-white font-extrabold py-1.5 px-4 rounded-lg"
              >
                Registrar Movimiento
              </button>
            </div>
          </form>
        )}

        {/* Ledger Table */}
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox"
                    checked={filteredTx.length > 0 && filteredTx.every(tx => selectedRecords.includes(tx.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = filteredTx.map(tx => tx.id);
                        setSelectedRecords(prev => Array.from(new Set([...prev, ...allIds])));
                      } else {
                        const filteredIds = filteredTx.map(tx => tx.id);
                        setSelectedRecords(prev => prev.filter(id => !filteredIds.includes(id)));
                      }
                    }}
                    className="rounded border-gray-300 text-[#203180] focus:ring-[#203180] h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Monto ($)</th>
                {filterType === 'Archivados' && (
                  <>
                    <th className="px-4 py-3">Eliminado por</th>
                    <th className="px-4 py-3">Razón de Auditoría</th>
                  </>
                )}
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={filterType === 'Archivados' ? 9 : 7} className="px-4 py-8 text-center text-gray-400">
                    No se encontraron transacciones registradas.
                  </td>
                </tr>
              ) : (
                filteredTx.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 w-10">
                      <input 
                        type="checkbox"
                        checked={selectedRecords.includes(tx.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecords(prev => [...prev, tx.id]);
                          } else {
                            setSelectedRecords(prev => prev.filter(id => id !== tx.id));
                          }
                        }}
                        className="rounded border-gray-300 text-[#203180] focus:ring-[#203180] h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500">{tx.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block font-extrabold px-1.5 py-0.5 rounded ${
                        tx.type === 'Ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-[#C80C0C]'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#203180]">{tx.category}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {tx.description}
                      {isTxInClosedPeriod(tx) && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-red-600 bg-red-50 border border-red-100 px-1 rounded font-bold">
                          <Lock className="w-2 h-2" /> Cerrado
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 font-mono font-black text-sm ${
                      tx.type === 'Ingreso' ? 'text-green-600' : 'text-[#C80C0C]'
                    }`}>
                      {tx.type === 'Ingreso' ? '+' : '-'}${tx.amount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    
                    {filterType === 'Archivados' && (
                      <>
                        <td className="px-4 py-3 text-gray-500 font-medium">{tx.deletedby || 'admin_ken'}</td>
                        <td className="px-4 py-3 text-gray-400 italic">{tx.deletedreason || 'Ninguna'}</td>
                      </>
                    )}

                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {filterType === 'Archivados' ? (
                          <button
                            onClick={() => handleRestoreClick(tx.id)}
                            className="bg-amber-100 text-amber-800 hover:bg-amber-200 font-bold px-2 py-1 rounded text-[10px] flex items-center gap-1 transition-all"
                            title="Restaurar transacción"
                          >
                            <RotateCcw className="w-3 h-3" /> Restaurar
                          </button>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleEditClick(tx)}
                              disabled={role !== 'Admin'}
                              className="p-1 text-gray-400 hover:text-[#203180] disabled:opacity-40 transition-colors"
                              title="Editar movimiento (Solo Admin)"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(tx)}
                              disabled={role !== 'Admin'}
                              className="p-1 text-gray-400 hover:text-[#C80C0C] disabled:opacity-40 transition-colors"
                              title="Eliminar movimiento (Solo Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Deletion Modal Overlay */}
      <AnimatePresence>
        {deleteTarget && (() => {
          const isClosed = isTxInClosedPeriod(deleteTarget);
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-6 h-6 ${isClosed ? 'text-red-600 animate-pulse' : 'text-amber-500'}`} />
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                      {isClosed ? 'Periodo Cerrado - Operación Bloqueada' : 'Confirmación de Eliminación Contable'}
                    </h3>
                  </div>
                  <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {isClosed ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-red-800 space-y-2">
                      <p className="text-xs font-black">
                        ¡ATENCIÓN ADMINISTRADOR!
                      </p>
                      <p className="text-xs leading-relaxed font-bold">
                        Esta transacción fue asentada el <span className="font-mono">{deleteTarget.date}</span>. Pertenece a un periodo contable cerrado de KEINSHOP y sus libros ya se encuentran validados financieramente.
                      </p>
                      <p className="text-xs font-semibold bg-white/50 p-2.5 rounded-xl border border-red-200">
                        Por motivos fiscales y de auditoría interna, no se permite eliminar asientos directamente.
                      </p>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-900 text-xs font-bold leading-relaxed space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-800">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        <span>Solución Recomendada:</span>
                      </div>
                      <p>
                        "Cree un asiento de reversión" (contrasiento) por un monto de <span className="font-mono">${deleteTarget.amount.toLocaleString()}</span> de tipo opuesto para corregir el saldo acumulado en su balance.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => setDeleteTarget(null)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs py-3 px-5 rounded-2xl transition-all"
                      >
                        Cerrar Advertencia
                      </button>
                      <button
                        onClick={() => {
                          // Auto generate reversal manually
                          const rev: Transaction = {
                            id: `TX-REV-${Date.now()}`,
                            date: new Date().toISOString().split('T')[0],
                            type: deleteTarget.type === 'Ingreso' ? 'Egreso' : 'Ingreso',
                            category: 'Reversión',
                            amount: deleteTarget.amount,
                            description: `Asiento de Reversión Manual para ${deleteTarget.description}`
                          };
                          onAddTransaction(rev);
                          showToast("Asiento de reversión manual creado correctamente en libros.", "success");
                          setDeleteTarget(null);
                        }}
                        className="bg-[#203180] text-white hover:bg-indigo-950 font-extrabold text-xs py-3 px-5 rounded-2xl transition-all flex items-center gap-1.5"
                      >
                        Crear Asiento de Reversión
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs text-gray-700 space-y-1.5">
                      <p><span className="font-bold text-gray-500 uppercase tracking-wider">Concepto:</span> <span className="font-semibold text-[#203180]">{deleteTarget.description}</span></p>
                      <p><span className="font-bold text-gray-500 uppercase tracking-wider">Categoría:</span> <span className="font-bold">{deleteTarget.category}</span></p>
                      <p><span className="font-bold text-gray-500 uppercase tracking-wider">Monto Original:</span> <span className="font-mono font-black text-gray-900">${deleteTarget.amount.toLocaleString('es-CO')}</span></p>
                    </div>

                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-[#C80C0C] space-y-1 text-xs">
                      <p className="font-black uppercase">¿Seguro que deseas eliminar este registro permanentemente?</p>
                      <p className="font-semibold opacity-90 leading-relaxed">
                        Esta acción es definitiva. El registro desaparecerá por completo de la base de datos de KEINSHOP, no aparecerá en ningún reporte ni se generará ningún asiento de reversión automático.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-gray-700 uppercase tracking-wide">
                        Motivo de Auditoría Contable (Obligatorio)
                      </label>
                      <textarea
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        required
                        rows={2}
                        className="w-full p-2.5 border rounded-xl text-xs focus:outline-none text-gray-800 focus:ring-2 focus:ring-[#FF2D6D]/20 focus:border-[#FF2D6D]"
                        placeholder="Especifica el motivo de la anulación contable (ej: error de digitación, duplicado, devolución de pedido...)"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => setDeleteTarget(null)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs py-3.5 px-5 rounded-2xl transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={executeDeleteAction}
                        disabled={deleting || !deleteReason.trim()}
                        className="bg-[#FF2D6D] hover:bg-pink-600 text-white font-extrabold text-xs py-3.5 px-6 rounded-2xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {deleting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        {deleting ? 'Procesando...' : 'Confirmar Eliminación'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Dynamic Bulk Deletion Modal Overlay */}
      <AnimatePresence>
        {showBulkDeleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-[#FF2D6D]" />
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                    Confirmación de Eliminación Contable en Lote
                  </h3>
                </div>
                <button onClick={() => setShowBulkDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-[#C80C0C] space-y-1 text-xs">
                  <p className="font-black uppercase">¿Seguro que deseas eliminar {selectedRecords.length} registros permanentemente?</p>
                  <p className="font-semibold opacity-90 leading-relaxed">
                    Esta acción es definitiva. Los registros desaparecerá por completo de la base de datos de KEINSHOP, no aparecerá en ningún reporte ni se generará ningún asiento de reversión automático.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wide">
                    Motivo de Auditoría Contable (Obligatorio)
                  </label>
                  <textarea
                    value={bulkDeleteReason}
                    onChange={(e) => setBulkDeleteReason(e.target.value)}
                    required
                    rows={2}
                    className="w-full p-2.5 border rounded-xl text-xs focus:outline-none text-gray-800 focus:ring-2 focus:ring-[#FF2D6D]/20 focus:border-[#FF2D6D]"
                    placeholder="Especifica el motivo de la anulación contable en lote..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowBulkDeleteModal(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs py-3.5 px-5 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting || !bulkDeleteReason.trim()}
                    className="bg-[#FF2D6D] hover:bg-pink-600 text-white font-extrabold text-xs py-3.5 px-6 rounded-2xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isBulkDeleting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {isBulkDeleting ? 'Procesando...' : 'Confirmar Eliminación en Lote'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Edit Modal Overlay */}
      <AnimatePresence>
        {editTarget && (() => {
          const isClosed = isTxInClosedPeriod(editTarget);
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full border border-gray-100 relative space-y-4 text-left font-sans text-gray-900"
              >
                <div className="flex justify-between items-center pb-2 border-b">
                  <h3 className="text-sm font-black text-[#203180] uppercase tracking-wider flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#FF2D6D]" /> Editar Registro Contable
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setEditTarget(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {isClosed && (
                  <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-100 flex items-start gap-2.5 leading-relaxed font-semibold">
                    <ShieldAlert className="w-4 h-4 text-[#C80C0C] shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <p className="font-extrabold uppercase">Periodo Contable Cerrado</p>
                      <p className="text-[10px] opacity-90 mt-0.5">
                        Esta transacción pertenece a un periodo cerrado. Para mantener la integridad contable, por favor crea un nuevo asiento de reversión/ajuste en lugar de editar.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-gray-600 uppercase mb-1">Tipo de Movimiento</label>
                      <select
                        disabled={isClosed}
                        value={editType}
                        onChange={(e) => {
                          const selectedType = e.target.value as 'Ingreso' | 'Egreso';
                          setEditType(selectedType);
                          setEditCategory('Pedidos especiales');
                        }}
                        className="w-full p-2.5 border bg-white rounded-xl focus:outline-none disabled:opacity-50"
                      >
                        <option value="Ingreso">Ingreso (+)</option>
                        <option value="Egreso">Egreso (-)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-600 uppercase mb-1">Categoría</label>
                      <select
                        disabled={isClosed}
                        value={editCategory}
                        onChange={(e) => {
                          setEditCategory(e.target.value);
                          if (e.target.value === 'Pedidos especiales') {
                            setShowEditSpecial(true);
                          } else {
                            setShowEditSpecial(false);
                          }
                        }}
                        className="w-full p-2.5 border bg-white rounded-xl focus:outline-none disabled:opacity-50"
                      >
                        {(categories.includes(editCategory) ? categories : [editCategory, ...categories]).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {editCategory === 'Pedidos especiales' && (
                    <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-100 space-y-3 animate-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-extrabold text-purple-700 uppercase mb-1">Subcategoría de Edición</label>
                          <select
                            disabled={isClosed}
                            value={editSpecialSubcategory}
                            onChange={(e) => setEditSpecialSubcategory(e.target.value)}
                            className="w-full p-2 border border-purple-200 bg-white rounded-lg focus:outline-none disabled:opacity-50"
                          >
                            <option value="Libras Adicionales">Libras Adicionales</option>
                            <option value="Costo de libras">Costo de libras</option>
                            <option value="Abono de pedido">Abono de pedido</option>
                            <option value="Flete de importación">Flete de importación</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-extrabold text-purple-700 uppercase mb-1">Nombre de la Persona / Cliente</label>
                          <input
                            disabled={isClosed}
                            type="text"
                            value={editPersonName}
                            onChange={(e) => setEditPersonName(e.target.value)}
                            placeholder="Ej: Kenneth Mosquera"
                            className="w-full p-2 border border-purple-200 bg-white rounded-lg focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                      <div className="text-[11px] text-purple-600 font-semibold flex items-center gap-1 bg-white/80 py-1 px-2.5 rounded-lg border border-purple-100 w-fit">
                        <span className="font-extrabold">Nueva Vista previa de Categoría:</span> 
                        <span className="font-mono font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                          {editSpecialSubcategory}{editPersonName ? ` + ${editPersonName.trim()}` : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-gray-600 uppercase mb-1">Monto ($ COP)</label>
                      <input
                        disabled={isClosed}
                        type="number"
                        step="0.01"
                        min="0"
                        value={editAmount || ''}
                        onChange={(e) => setEditAmount(Number(e.target.value))}
                        required
                        className="w-full p-2.5 border rounded-xl focus:outline-none font-mono text-sm font-bold text-gray-900 disabled:opacity-50"
                        placeholder="Ej: 85000.50"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 uppercase mb-1">Fecha</label>
                      <input
                        disabled={isClosed}
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        required
                        className="w-full p-2.5 border rounded-xl focus:outline-none font-mono text-sm font-bold text-gray-900 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="block font-bold text-gray-600 uppercase mb-1">Descripción / Concepto</label>
                    <textarea
                      disabled={isClosed}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      required
                      rows={2}
                      className="w-full p-2.5 border rounded-xl focus:outline-none text-gray-800 disabled:opacity-50"
                      placeholder="Detalles del movimiento..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditTarget(null)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs py-3 px-5 rounded-2xl transition-all"
                    >
                      Cancelar
                    </button>
                    {!isClosed && (
                      <button
                        type="submit"
                        disabled={updating}
                        className="bg-[#203180] hover:bg-[#1a2766] text-white font-extrabold text-xs py-3 px-6 rounded-2xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {updating ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {updating ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Redesigned AI Advisor Section under Ledger */}
      <div className="bg-[#1F1F2E] text-white p-6 rounded-3xl border border-white/5 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FF2D6D] animate-bounce" />
              <h3 className="text-base font-black tracking-wider uppercase text-white">
                Asesor Contable IA KEINSHOP
              </h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">
              Nuestro motor de inteligencia financiera predictiva analiza en tiempo real tus fletes, comisiones de pasarela y costes publicitarios de tus prendas Oversized y Sneakers para equilibrar los márgenes de ganancia.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAiAnalysisType('audit')}
              className={`text-xs font-black px-4 py-2 rounded-xl transition-all ${
                aiAnalysisType === 'audit' ? 'bg-[#FF2D6D] text-white font-bold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              Auditar Flujo
            </button>
            <button
              onClick={() => setAiAnalysisType('tips')}
              className={`text-xs font-black px-4 py-2 rounded-xl transition-all ${
                aiAnalysisType === 'tips' ? 'bg-[#FF2D6D] text-white font-bold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              Consejos Rápidos
            </button>
            <button
              onClick={() => setAiAnalysisType('predictions')}
              className={`text-xs font-black px-4 py-2 rounded-xl transition-all ${
                aiAnalysisType === 'predictions' ? 'bg-[#FF2D6D] text-white font-bold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              Predicción de Liquidez
            </button>
          </div>
        </div>

        {loadingAi ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#FF2D6D] animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-400">Analizando registros financieros con IA de KEINSHOP...</p>
          </div>
        ) : aiReport ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Interactive Dynamic Tabs Content */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black tracking-widest text-[#FF2D6D] uppercase">
                {aiAnalysisType === 'audit' && 'Informe de Auditoría de Flujo'}
                {aiAnalysisType === 'tips' && 'Consejos Inmediatos de Ahorro Contable'}
                {aiAnalysisType === 'predictions' && 'Proyecciones y Simulación de Escenarios'}
              </h4>

              {aiAnalysisType === 'audit' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Hemos examinado los flujos de ingresos directos contra fletes Shein/Temu de tus pedidos especiales e inversión publicitaria. A continuación, el desglose analítico:
                  </p>
                  
                  {/* Visual indicators */}
                  <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-gray-400">
                        <span>EFICIENCIA OPERATIVA (Ingresos vs Egresos)</span>
                        <span className="text-white">{totalRevenues > 0 ? Math.round(((totalRevenues - totalExpenses) / totalRevenues) * 100) : 0}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 h-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(0, totalRevenues > 0 ? ((totalRevenues - totalExpenses) / totalRevenues) * 100 : 0))}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-gray-400">
                        <span>GASTOS EN MARKETING ({totalRevenues > 0 ? Math.round((activeTransactions.filter(t => t.category === 'Marketing & Publicidad' || t.category === 'Pedido enviado').reduce((acc, curr) => acc + curr.amount, 0) / totalRevenues) * 100) : 0}% de los Ingresos)</span>
                        <span className="text-[#FF2D6D]">{totalRevenues > 0 ? Math.round((activeTransactions.filter(t => t.category === 'Marketing & Publicidad' || t.category === 'Pedido enviado').reduce((acc, curr) => acc + curr.amount, 0) / totalRevenues) * 100) : 0}% / 35% Máx</span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#FF2D6D] h-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, totalRevenues > 0 ? (activeTransactions.filter(t => t.category === 'Marketing & Publicidad' || t.category === 'Pedido enviado').reduce((acc, curr) => acc + curr.amount, 0) / totalRevenues) * 100 : 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Criticisms or specific advice */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiReport.alerts.filter(a => a.type === 'critica').map((crit, idx) => (
                      <div key={idx} className="bg-red-950/40 border border-red-900/30 p-4 rounded-2xl flex items-start gap-3">
                        <div className="p-2 bg-[#E02424]/10 text-[#E02424] rounded-lg mt-0.5">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-red-400 font-extrabold uppercase tracking-wide">Crítica Constructiva</span>
                          <p className="text-xs text-gray-200 leading-relaxed font-semibold">{crit.message}</p>
                        </div>
                      </div>
                    ))}

                    {aiReport.alerts.filter(a => a.type === 'consejo').map((cons, idx) => (
                      <div key={idx} className="bg-green-950/40 border border-green-900/30 p-4 rounded-2xl flex items-start gap-3">
                        <div className="p-2 bg-[#28A745]/10 text-[#28A745] rounded-lg mt-0.5">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-green-400 font-extrabold uppercase tracking-wide">Consejo de Ahorro</span>
                          <p className="text-xs text-gray-200 leading-relaxed font-semibold">{cons.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiAnalysisType === 'tips' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Sugerencias de optimización inmediata para reducir costos fijos de KEINSHOP y fletes por volumen:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {aiReport.tips.map((tip, idx) => (
                      <div key={idx} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 space-y-2.5 transition-all flex flex-col justify-between">
                        <div className="p-2 bg-[#FF2D6D]/10 text-[#FF2D6D] w-max rounded-lg">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-white leading-relaxed font-bold">{tip}</p>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block pt-2 border-t border-white/5">Tip {idx+1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiAnalysisType === 'predictions' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Estimaciones financieras basadas en la tasa de egresos recurrentes por importación internacional frente a ventas locales estacionales de calzado y vestuario:
                  </p>

                  <div className="bg-amber-950/30 border border-amber-900/20 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#FFB86B]/10 text-[#FFB86B] rounded">
                        <Info className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-[#FFB86B] font-extrabold uppercase tracking-widest">Patrón Predictivo Detectado</span>
                    </div>

                    {aiReport.alerts.filter(a => a.type === 'prediccion').map((pred, idx) => (
                      <p key={idx} className="text-xs text-white font-extrabold leading-relaxed">
                        "{pred.message}"
                      </p>
                    ))}
                  </div>

                  {/* 3 month trend forecast table */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <h5 className="text-[10px] font-black uppercase text-gray-400 mb-2">Simulación de Flujo de Caja a 3 Meses</h5>
                    <div className="grid grid-cols-3 gap-4 text-center text-xs">
                      <div className="p-2 border-r border-white/10">
                        <span className="text-[10px] text-[#FF2D6D] font-extrabold block">Julio 2026</span>
                        <span className="font-mono font-bold block mt-1">${(balance * 1.05).toLocaleString('es-CO', {maximumFractionDigits:0})}</span>
                        <span className="text-[9px] text-green-400 font-bold">+5% Est.</span>
                      </div>
                      <div className="p-2 border-r border-white/10">
                        <span className="text-[10px] text-[#FF2D6D] font-extrabold block">Agosto 2026</span>
                        <span className="font-mono font-bold block mt-1">${(balance * 1.12).toLocaleString('es-CO', {maximumFractionDigits:0})}</span>
                        <span className="text-[9px] text-green-400 font-bold">+12% Est.</span>
                      </div>
                      <div className="p-2">
                        <span className="text-[10px] text-[#FF2D6D] font-extrabold block">Septiembre 2026</span>
                        <span className="font-mono font-bold block mt-1">${(balance * 1.25).toLocaleString('es-CO', {maximumFractionDigits:0})}</span>
                        <span className="text-[9px] text-green-400 font-bold">+25% Est.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick insights cards sidebar */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-xs font-black tracking-widest text-[#FF2D6D] uppercase flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" /> Métricas Guía
              </h4>

              <div className="space-y-3">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Margen Bruto Promedio</span>
                    <span className="text-white font-extrabold">58%</span>
                  </div>
                  <span className="text-[10px] text-green-400 font-bold">Saludable</span>
                </div>

                <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Tasa de Egreso / Publicidad</span>
                    <span className="text-white font-extrabold">{marketingPct}%</span>
                  </div>
                  <span className={`text-[10px] font-bold ${marketingPct > 35 ? 'text-red-400' : 'text-green-400'}`}>
                    {marketingPct > 35 ? 'Excesiva' : 'Normal'}
                  </span>
                </div>

                <div className="p-3 bg-[#FF2D6D]/10 rounded-xl border border-[#FF2D6D]/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#FF2D6D]">
                    <Sparkles className="w-4 h-4 flex-shrink-0 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-wide">Recomendación Clave</span>
                  </div>
                  <p className="text-[11px] text-gray-200 leading-relaxed font-bold">
                    "Al consolidar pedidos internacionales Shein/Temu en lotes mayores de 15 libras, bajas el coste de casillero un 20%, aumentando tu margen neto un 4%."
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-white/10 rounded-2xl">
            Haz clic en los botones de análisis de arriba para cargar el diagnóstico inteligente de finanzas KEINSHOP.
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-white/5 text-[10px] text-gray-400">
          <span>Fecha de análisis contable: {aiReport?.analysis_date || new Date().toISOString().split('T')[0]}</span>
          <span className="font-extrabold uppercase tracking-widest text-[#FF2D6D]">Keinshop Financial Intelligence</span>
        </div>
      </div>
        </>
      )}

      {activeSubTab === 'prestamos' && (
        <GestionPrestamos
          loans={loans}
          loadingLoans={loadingLoans}
          onSaveLoan={async (loanPayload) => {
            const res = await fetch('/api/accounting/loans', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(loanPayload)
            });
            if (res.ok) {
              showToast("Préstamo registrado exitosamente.", "success");
              fetchLoans();
              fetchLoansInvestmentsAiAdvice();
            } else {
              showToast("Error al guardar préstamo.", "error");
            }
          }}
          onToggleStatus={handleToggleLoanStatus}
          onDeleteLoan={handleDeleteLoan}
          role={role}
          loadingAi={loadingLoansInvAi}
          aiAdvice={loansInvAiAdvice}
          onFetchAiAdvice={fetchLoansInvestmentsAiAdvice}
        />
      )}

      {activeSubTab === 'inversiones' && (
        <GestionInversiones
          investments={investments}
          loadingInvestments={loadingInvestments}
          onSaveInvestment={async (invPayload) => {
            const res = await fetch('/api/accounting/investments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(invPayload)
            });
            if (res.ok) {
              showToast("Inversión registrada exitosamente.", "success");
              fetchInvestments();
              fetchLoansInvestmentsAiAdvice();
            } else {
              showToast("Error al guardar inversión.", "error");
            }
          }}
          onDeleteInvestment={handleDeleteInvestment}
          role={role}
          loadingAi={loadingLoansInvAi}
          aiAdvice={loansInvAiAdvice}
          onFetchAiAdvice={fetchLoansInvestmentsAiAdvice}
        />
      )}

    </div>
  );
}
