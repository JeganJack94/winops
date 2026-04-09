import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, X, Calendar, Tag, DollarSign, FileText, TrendingDown } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { expenseService } from '../services/expenseService';
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
import { Doughnut, Line } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';

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

const EXPENSE_TYPES = ['Fuel', 'Salary', 'Maintenance', 'Utilities', 'Rent', 'Misc'];

const TYPE_CONFIG = {
  Fuel:        { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  text: '#f97316' },
  Salary:      { color: '#1e3a8a', bg: 'rgba(30,58,138,0.12)',   text: '#3b82f6' },
  Maintenance: { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  text: '#10b981' },
  Utilities:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  text: '#8b5cf6' },
  Rent:        { color: '#ec4899', bg: 'rgba(236,72,153,0.12)',  text: '#ec4899' },
  Misc:        { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', text: '#9ca3af' },
};

export default function Expenses() {
  const { theme } = useTheme();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeframe, setTimeframe] = useState('weekly'); // 'daily', 'weekly', 'monthly'

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Fuel',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    const unsub = expenseService.subscribeToExpenses(setExpenses);
    return () => unsub();
  }, []);

  // Lock body scroll when modal is open
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
      await expenseService.addExpense({
        ...form,
        amount: Number(form.amount)
      });
      setForm({
        date: new Date().toISOString().split('T')[0],
        type: 'Fuel',
        amount: '',
        notes: ''
      });
      setShowModal(false);
      console.log('Expense added, closing modal');
      setTimeout(() => {
        toast.success('Expense added successfully');
      }, 0);
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
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
      startDate.setDate(now.getDate() - 14); // Last 14 days
      for (let i = 0; i < 15; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const key = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
        dataMap[key] = 0;
      }
    } else if (timeframe === 'weekly') {
      startDate.setDate(now.getDate() - 56); // Last 8 weeks
      for (let i = 0; i < 9; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + (i * 7));
        const key = `W${i+1}`;
        labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
        // For simplicity, we'll map dates to the nearest week start
        dataMap[d.toISOString().split('T')[0]] = 0;
      }
    } else {
      // Monthly
      startDate = new Date(now.getFullYear(), 0, 1); // Current year
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
          // Find the latest week start that is <= expDate
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

  const filteredExpenses = expenses.filter(exp =>
    exp.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ─── Header ─── */}
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
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-hover text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-primary/25 active:scale-95 transition-all outline-none"
          >
            <Plus size={16} strokeWidth={3} />
            Add Expense
          </button>
        </div>
      </div>

      {/* ─── Dashboard Section ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Column 1: Summary Cards */}
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

        {/* Column 2: Wave Trend Chart */}
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

        {/* Column 3: Breakdown Chart */}
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

      {/* ─── Main Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

        {/* Expense Table */}
        <div style={{
          background: theme === 'dark' ? '#1f2937' : '#fff',
          borderRadius: '16px', border: `1px solid ${theme === 'dark' ? '#374151' : '#f0f0f0'}`,
          boxShadow: theme === 'dark' ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          {/* Table Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#f3f4f6'}`,
            gap: '12px', flexWrap: 'wrap',
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: theme === 'dark' ? '#f9fafb' : '#111827' }}>
              Recent Expenses
            </h3>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: theme === 'dark' ? '#374151' : '#f9fafb',
              borderRadius: '10px', padding: '8px 14px', border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
              flex: '0 0 auto', minWidth: '220px',
            }}>
              <Search size={14} color={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
              <input
                placeholder="Search expenses…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  fontSize: '13px', color: theme === 'dark' ? '#f9fafb' : '#111827',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: theme === 'dark' ? '#111827' : '#fafafa' }}>
                  {['Date', 'Category', 'Notes', 'Amount'].map((h, i) => (
                    <th key={h} style={{
                      padding: '11px 20px', textAlign: i === 3 ? 'right' : 'left',
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
                      color: theme === 'dark' ? '#6b7280' : '#9ca3af', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense, idx) => {
                  const cfg = TYPE_CONFIG[expense.type] || TYPE_CONFIG.Misc;
                  return (
                    <tr
                      key={expense.id}
                      style={{
                        borderTop: `1px solid ${theme === 'dark' ? '#374151' : '#f3f4f6'}`,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? '#374151' : '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: theme === 'dark' ? '#d1d5db' : '#374151', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={12} color={theme === 'dark' ? '#6b7280' : '#9ca3af'} />
                          {expense.date}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: 600,
                          background: cfg.bg, color: cfg.text,
                        }}>
                          {expense.type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: theme === 'dark' ? '#9ca3af' : '#6b7280', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {expense.notes || <span style={{ opacity: 0.4 }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#f43f5e' }}>
                            ₹{Number(expense.amount).toLocaleString()}
                          </span>
                          <button 
                            onClick={() => handleDelete(expense.id)}
                            style={{ 
                              padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent',
                              cursor: 'pointer', color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                              transition: 'color 0.15s, background 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'rgba(244,63,94,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = theme === 'dark' ? '#6b7280' : '#9ca3af'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '48px 20px', textAlign: 'center', color: theme === 'dark' ? '#4b5563' : '#d1d5db', fontSize: '14px' }}>
                      No expenses found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ─── Add Expense Modal ─── */}
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
            {/* Modal Top Bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#f3f4f6'}`,
              background: theme === 'dark' ? '#111827' : '#fafafa',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: theme === 'dark' ? '#f9fafb' : '#111827' }}>
                  New Expense
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: theme === 'dark' ? '#6b7280' : '#9ca3af' }}>
                  Fill in the details below
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

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Date & Category row */}
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
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    style={inputStyle(theme)}
                  >
                    {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </ModalField>
              </div>

              {/* Amount */}
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

              {/* Notes */}
              <ModalField label="Notes" icon={<FileText size={14} />} theme={theme}>
                <input
                  type="text"
                  placeholder="Optional note…"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  style={inputStyle(theme)}
                />
              </ModalField>

              {/* Actions */}
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
                  {isSubmitting ? 'Saving…' : 'Save Expense'}
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
