import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, X, Calendar, Tag, DollarSign, FileText, TrendingDown, Edit2, Download, History, LayoutDashboard, Users } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { expenseService } from '../services/expenseService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Doughnut, Line } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';
import { riderService } from '../services/riderService';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Filler
);

const EXPENSE_TYPES = [
  'Fuel', 'Salary', 'Maintenance', 'Utilities', 'Rent', 
  'Tea & Snacks', 'Food', 'Recharge', 'Stationery', 'Infrastructure', 'Misc'
];

const TYPE_CONFIG = {
  Fuel:           { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  text: '#f97316' },
  Salary:         { color: '#1e3a8a', bg: 'rgba(30,58,138,0.12)',   text: '#3b82f6' },
  Maintenance:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  text: '#10b981' },
  Utilities:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  text: '#8b5cf6' },
  Rent:           { color: '#ec4899', bg: 'rgba(236,72,153,0.12)',  text: '#ec4899' },
  'Tea & Snacks': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b' },
  Food:           { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  text: '#fb923c' },
  Recharge:       { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   text: '#06b6d4' },
  Stationery:     { color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  text: '#6366f1' },
  Infrastructure: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   text: '#ef4444' },
  Misc:           { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', text: '#9ca3af' },
};

export default function Expenses() {
  const { theme } = useTheme();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeframe, setTimeframe] = useState('weekly'); 
  const [editingId, setEditingId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [riders, setRiders] = useState([]);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Fuel',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    const unsubExp = expenseService.subscribeToExpenses(setExpenses, 1000);
    const unsubRid = riderService.subscribeToRiders(setRiders);
    return () => {
      unsubExp();
      unsubRid();
    };
  }, []);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const expenseData = {
        ...form,
        amount: Number(form.amount)
      };

      if (editingId) {
        await expenseService.updateExpense(editingId, expenseData);
        toast.success('Expense updated successfully');
      } else {
        await expenseService.addExpense(expenseData);
        toast.success('Expense added successfully');
      }

      setForm({
        date: new Date().toISOString().split('T')[0],
        type: 'Fuel',
        amount: '',
        notes: ''
      });
      setEditingId(null);
      setShowModal(false);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (expense) => {
    setForm({
      date: expense.date,
      type: expense.type,
      amount: expense.amount,
      notes: expense.notes || ''
    });
    setEditingId(expense.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await expenseService.deleteExpense(id);
        toast.success('Expense deleted successfully');
      } catch (error) {
        console.error('Error deleting expense:', error);
        toast.error('Failed to delete expense');
      }
    }
  };

  const totalExpenses = useMemo(() =>
    expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [expenses]);

  const trendData = useMemo(() => {
    if (expenses.length === 0) return { labels: [], data: [] };

    const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));
    const now = new Date();
    let startDate = new Date();
    let labels = [];
    let dataMap = {};

    if (timeframe === 'daily') {
      startDate.setDate(now.getDate() - 14);
      for (let i = 0; i < 15; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const key = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
        dataMap[key] = 0;
      }
    } else if (timeframe === 'weekly') {
      startDate.setDate(now.getDate() - 56);
      for (let i = 0; i < 9; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + (i * 7));
        const key = `W${i+1}`;
        labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
        dataMap[d.toISOString().split('T')[0]] = 0;
      }
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      for (let i = 0; i < 12; i++) {
        const d = new Date(startDate.getFullYear(), i, 1);
        const key = d.toLocaleDateString('en-IN', { month: 'short' });
        labels.push(key);
        dataMap[key] = 0;
      }
    }

    sortedExpenses.forEach(exp => {
      const expDate = new Date(exp.date);
      if (expDate >= startDate) {
        let key;
        if (timeframe === 'daily') {
          key = exp.date;
        } else if (timeframe === 'weekly') {
          const weekStarts = Object.keys(dataMap).sort();
          key = weekStarts.find((ws, idx) => {
             const nextWs = weekStarts[idx+1];
             return expDate >= new Date(ws) && (!nextWs || expDate < new Date(nextWs));
          });
        } else {
          key = expDate.toLocaleDateString('en-IN', { month: 'short' });
        }
        if (key && dataMap[key] !== undefined) {
          dataMap[key] += Number(exp.amount) || 0;
        }
      }
    });

    return {
      labels,
      data: labels.map((_, i) => Object.values(dataMap)[i])
    };
  }, [expenses, timeframe]);

  const lineChartData = {
    labels: trendData.labels,
    datasets: [{
      label: 'Expenses',
      data: trendData.data,
      borderColor: '#f97316',
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#f97316',
      borderWidth: 3,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (ctx) => ` ₹${ctx.parsed.y.toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
        ticks: { 
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          callback: (value) => '₹' + value.toLocaleString()
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
      }
    }
  };

  const donutChartData = useMemo(() => {
    const totals = expenses.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + (Number(curr.amount) || 0);
      return acc;
    }, {});

    const labels = Object.keys(totals);
    const data = Object.values(totals);

    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        data: data.length > 0 ? data : [1],
        backgroundColor: labels.length > 0
          ? labels.map(l => TYPE_CONFIG[l]?.color || '#9ca3af')
          : ['#374151'],
        borderWidth: 3,
        borderColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        hoverOffset: 6,
      }],
    };
  }, [expenses, theme]);

  const filteredExpenses = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return expenses.filter(exp =>
      exp.notes?.toLowerCase().includes(query) ||
      exp.type?.toLowerCase().includes(query) ||
      exp.date?.includes(query)
    );
  }, [expenses, searchTerm]);

  const todaysExpenses = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return expenses.filter(exp => exp.date === today);
  }, [expenses]);

  const todaysTotal = useMemo(() => 
    todaysExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [todaysExpenses]);

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text('Expense Audit Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
      
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 35, pageWidth - 28, 20, 'F');
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(`Total Lifetime Expenses: INR ${totalExpenses.toLocaleString()}`, 20, 48);

      const tableData = filteredExpenses.map(e => [
        e.date,
        e.type,
        e.notes || '-',
        `INR ${Number(e.amount).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 60,
        head: [['Date', 'Category', 'Notes', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22] },
        styles: { fontSize: 9 }
      });

      doc.save('WinExpress_Expenses_History.pdf');
      toast.success('PDF Downloaded');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Expenses
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">
            Track and manage your operational costs
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            {['daily', 'weekly', 'monthly'].map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black capitalize transition-all ${
                  timeframe === t 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setEditingId(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-hover text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-primary/25 active:scale-95 transition-all outline-none"
          >
            <Plus size={16} strokeWidth={3} />
            Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
        
        <div className="lg:col-span-3 flex flex-col gap-4">
          <SummaryCard
            icon={<TrendingDown size={20} />}
            label="Total Expenses"
            value={`₹${totalExpenses.toLocaleString()}`}
            accent="#f97316"
            theme={theme}
          />
          <SummaryCard
            icon={<FileText size={20} />}
            label="Total Entries"
            value={expenses.length}
            accent="#8b5cf6"
            theme={theme}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-6 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Expense Wave
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Spending trends over time</p>
            </div>
            <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 mt-auto rounded-full uppercase tracking-tighter">
              {timeframe}
            </span>
          </div>
          <div className="h-[200px] w-full">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        <div className="md:col-span-1 lg:col-span-3 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-6">
            Breakdown
          </h3>
          <div className="h-[200px] w-full flex items-center justify-center">
            <Doughnut
              data={donutChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    padding: 12,
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                    titleColor: theme === 'dark' ? '#fff' : '#1e293b',
                    bodyColor: theme === 'dark' ? '#94a3b8' : '#64748b',
                    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    callbacks: {
                      label: ctx => ` ₹${Number(ctx.parsed).toLocaleString()}`
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-50 dark:border-slate-700/50 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Today's Expenses</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-500/10 px-6 py-3 rounded-2xl border border-rose-100 dark:border-rose-500/20 text-center sm:text-right">
             <p className="text-[10px] font-black text-rose-400 dark:text-rose-400 uppercase tracking-widest mb-0.5">Today's Total</p>
             <p className="text-2xl font-black text-rose-600 dark:text-rose-500 tracking-tight">₹{todaysTotal.toLocaleString()}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                {['Category', 'Notes', 'Amount', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-6 py-4 text-left text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] ${i === 2 || i === 3 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todaysExpenses.map((expense) => {
                const cfg = TYPE_CONFIG[expense.type] || TYPE_CONFIG.Misc;
                return (
                  <tr key={expense.id} className="border-t border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider`} style={{ background: cfg.bg, color: cfg.text }}>
                        {expense.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {expense.notes || <span className="text-slate-300 dark:text-slate-700">No notes recorded</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-base font-black text-rose-600 dark:text-rose-500 tracking-tight">₹{Number(expense.amount).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(expense)} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-400 hover:text-blue-500 transition-all">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(expense.id)} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {todaysExpenses.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <TrendingDown size={32} className="mb-2" />
                      <p className="text-sm font-bold uppercase tracking-widest">No expenses recorded today</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-slate-50 dark:border-slate-700/50 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Expense History</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full audit log of all entries</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input 
                placeholder="Search history..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none w-full sm:w-64 transition-all"
              />
            </div>
            <button 
              onClick={handleDownloadPDF} 
              disabled={isExporting}
              className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-white text-slate-500 dark:text-slate-300 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                {['Date', 'Category', 'Notes', 'Amount', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-6 py-4 text-left text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] ${i === 3 || i === 4 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => {
                const cfg = TYPE_CONFIG[expense.type] || TYPE_CONFIG.Misc;
                return (
                  <tr key={expense.id} className="border-t border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider`} style={{ background: cfg.bg, color: cfg.text }}>
                        {expense.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                      {expense.notes || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-slate-900 dark:text-white">₹{Number(expense.amount).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        <button onClick={() => handleEdit(expense)} className="hover:text-blue-500 transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(expense.id)} className="hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      </div>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: theme === 'dark' ? '#1f2937' : '#fff',
              borderRadius: '20px', width: '100%', maxWidth: '460px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
              border: `1px solid ${theme === 'dark' ? '#374151' : '#f0f0f0'}`,
              animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#f3f4f6'}`,
              background: theme === 'dark' ? '#111827' : '#fafafa',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: theme === 'dark' ? '#f9fafb' : '#111827' }}>
                  {editingId ? 'Edit Expense' : 'New Expense'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: theme === 'dark' ? '#6b7280' : '#9ca3af' }}>
                  {editingId ? 'Modify currently selected record' : 'Fill in the details below'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: theme === 'dark' ? '#374151' : '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? '#4b5563' : '#e5e7eb'}
                onMouseLeave={e => e.currentTarget.style.background = theme === 'dark' ? '#374151' : '#f3f4f6'}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <ModalField label="Date" icon={<Calendar size={14} />} theme={theme}>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    required
                    style={inputStyle(theme)}
                  />
                </ModalField>

                <ModalField label="Category" icon={<Tag size={14} />} theme={theme}>
                  <div className="flex flex-col gap-3">
                    <select
                      value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                      style={inputStyle(theme)}
                    >
                      {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    {form.type === 'Salary' && (
                      <div className="flex items-center gap-2 mt-1">
                        <Users size={14} className="text-gray-400" />
                        <select
                          value={form.riderId || ''}
                          onChange={e => setForm({ ...form, riderId: e.target.value })}
                          className="flex-1 bg-transparent dark:bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none text-xs font-bold py-1"
                        >
                          <option value="">-- Link to Rider (Optional) --</option>
                          {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </ModalField>
              </div>

              <ModalField label="Amount (₹)" icon={<DollarSign size={14} />} theme={theme}>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  style={inputStyle(theme)}
                />
              </ModalField>

              <ModalField label="Notes" icon={<FileText size={14} />} theme={theme}>
                <input
                  type="text"
                  placeholder="Optional note…"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  style={inputStyle(theme)}
                />
              </ModalField>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1, padding: '11px', borderRadius: '10px', cursor: 'pointer',
                    background: theme === 'dark' ? '#374151' : '#f3f4f6',
                    border: 'none', fontWeight: 600, fontSize: '14px',
                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                    transition: 'background 0.15s',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 2, padding: '11px', borderRadius: '10px', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    border: 'none', fontWeight: 700, fontSize: '14px', color: '#fff',
                    boxShadow: '0 4px 12px rgba(249,115,22,0.35)',
                    opacity: isSubmitting ? 0.7 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {isSubmitting ? 'Saving...' : (editingId ? 'Update Expense' : 'Save Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

/* ─── Sub-components ─── */

function SummaryCard({ icon, label, value, accent, theme }) {
  return (
    <div style={{
      background: theme === 'dark' ? '#1f2937' : '#fff',
      borderRadius: '14px', padding: '18px 20px',
      border: `1px solid ${theme === 'dark' ? '#374151' : '#f0f0f0'}`,
      boxShadow: theme === 'dark' ? '0 4px 16px rgba(0,0,0,0.25)' : '0 4px 16px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: `${accent}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent, marginBottom: '12px',
      }}>
        {icon}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: theme === 'dark' ? '#f9fafb' : '#111827', lineHeight: 1.2 }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: theme === 'dark' ? '#6b7280' : '#9ca3af', marginTop: '4px', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

function ModalField({ label, icon, children, theme }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em',
        color: theme === 'dark' ? '#9ca3af' : '#6b7280', textTransform: 'uppercase',
      }}>
        <span style={{ color: theme === 'dark' ? '#6b7280' : '#9ca3af' }}>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

function inputStyle(theme) {
  return {
    width: '100%', padding: '10px 12px', borderRadius: '10px', outline: 'none',
    border: `1.5px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    background: theme === 'dark' ? '#111827' : '#f9fafb',
    color: theme === 'dark' ? '#f9fafb' : '#111827',
    fontSize: '14px', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };
}
