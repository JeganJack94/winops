import { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Lock, Landmark, Users, Receipt, 
  Plus, CheckCircle2, Clock, Calendar, Search, Trash2, Pencil,
  ChevronRight, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../context/ThemeContext';
import { managementService } from '../services/managementService';
import { riderService } from '../services/riderService';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const TABS = [
  { id: 'investments', name: 'Investments', icon: Landmark },
  { id: 'pocket_settlements', name: 'Pocket Settlements', icon: Receipt }
];

export default function Management() {
  const { theme } = useTheme();
  const toast = useToast();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('investments');
  
  const [investments, setInvestments] = useState([]);
  const [pocketSettlements, setPocketSettlements] = useState([]);
  const [riders, setRiders] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'investment', 'salary', 'settlement'
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [form, setForm] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      const unsubInv = managementService.subscribeToInvestments(setInvestments);
      const unsubExp = managementService.subscribeToPocketSettlements(setPocketSettlements);
      const unsubRid = riderService.subscribeToRiders(setRiders);
      
      return () => {
        unsubInv();
        unsubExp();
        unsubRid();
      };
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'Meoww') {
      setIsAuthenticated(true);
      toast.success('Access Granted');
    } else {
      toast.error('Incorrect Password');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { 
        ...form, 
        amount: Number(form.amount),
        date: form.date || new Date().toISOString().split('T')[0],
        ...(modalType === 'pocket_settlement' && { type: form.type || 'Debt' })
      };
      const isUpdate = !!form.id;

      if (modalType === 'investment') {
        if (isUpdate) await managementService.updateInvestment(form.id, data);
        else await managementService.addInvestment(data);
      } else if (modalType === 'pocket_settlement') {
        if (isUpdate) await managementService.updatePocketSettlement(form.id, data);
        else await managementService.addPocketSettlement(data);
      }
      
      setShowModal(false);
      setForm({});
      toast.success(isUpdate ? 'Entry updated' : 'Entry added');
    } catch (error) {
      toast.error('Failed to save entry');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      if (type === 'investment') await managementService.deleteInvestment(id);
      else if (type === 'pocket_settlement') await managementService.deletePocketSettlement(id);
      
      toast.success('Entry deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleEdit = (type, item) => {
    setModalType(type);
    setForm({ ...item });
    setShowModal(true);
  };

  const handleAddRecovery = async (e) => {
    e.preventDefault();
    if (!selectedInvestment || !recoveryAmount) return;

    try {
      const currentRecovered = Number(selectedInvestment.recoveredAmount) || 0;
      const addAmount = Number(recoveryAmount);
      const newTotalRecovered = currentRecovered + addAmount;
      const isFull = newTotalRecovered >= Number(selectedInvestment.amount);

      await managementService.updateInvestment(selectedInvestment.id, {
        recoveredAmount: newTotalRecovered,
        status: isFull ? 'Closed' : 'Open',
        closedAt: isFull ? new Date().toISOString() : null
      });

      setShowRecoveryModal(false);
      setRecoveryAmount('');
      toast.success(isFull ? 'Investment fully closed!' : 'Recovery added');
    } catch (error) {
      toast.error('Failed to add recovery');
    }
  };

  const toggleInvestmentStatus = async (item) => {
    const newStatus = item.status === 'Open' ? 'Closed' : 'Open';
    try {
      await managementService.updateInvestment(item.id, { 
        status: newStatus,
        closedAt: newStatus === 'Closed' ? new Date().toISOString() : null
      });
      toast.success(`Investment marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-gray-700 text-center"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="text-primary h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Protected Area</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Please enter the management password to continue.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-center font-bold tracking-widest"
              autoFocus
            />
            <button 
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 transition-all active:scale-[0.98]"
            >
              Verify Access
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3">
            <ShieldCheck className="text-primary" size={32} />
            Management
          </h2>
          <p className="text-gray-500 dark:text-gray-400">Track business investments and settle pending operational expenses.</p>
        </div>
        
        <div className="flex p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon size={16} />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {activeTab === 'investments' && (
          <InvestmentsView 
            items={investments} 
            onAdd={() => { setModalType('investment'); setForm({}); setShowModal(true); }} 
            onToggle={toggleInvestmentStatus}
            onAddRecovery={(item) => { setSelectedInvestment(item); setShowRecoveryModal(true); }}
            onEdit={(item) => handleEdit('investment', item)}
            onDelete={(id) => handleDelete('investment', id)}
          />
        )}

        {activeTab === 'pocket_settlements' && (
          <PocketSettlementsView 
            items={pocketSettlements} 
            onAdd={() => handleEdit('pocket_settlement', { type: 'Debt', date: new Date().toISOString().split('T')[0] })}
            onEdit={(item) => handleEdit('pocket_settlement', item)}
            onDelete={(id) => handleDelete('pocket_settlement', id)}
          />
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
               <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <h3 className="text-xl font-black capitalize">{form.id ? 'Edit' : 'Add'} {modalType === 'pocket_settlement' ? 'Pocket Settlement' : modalType}</h3>
                  <div className="space-y-4">
                    <input 
                      type="date" 
                      required
                      value={form.date || new Date().toISOString().split('T')[0]}
                      onChange={e => setForm({...form, date: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none" 
                    />
                    
                    {modalType === 'pocket_settlement' && (
                      <select 
                        required
                        value={form.type || 'Debt'}
                        onChange={e => setForm({...form, type: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-primary/20 rounded-xl px-4 py-3 outline-none font-bold"
                      >
                        <option value="Debt">Debt (Paid from Pocket / Invested)</option>
                        <option value="Credit">Credit (Taken from Business / Credited to pocket)</option>
                      </select>
                    )}

                    {modalType === 'salary' ? (
                      <select 
                        required
                        value={form.description || ''}
                        onChange={e => setForm({...form, description: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-primary/20 rounded-xl px-4 py-3 outline-none font-bold"
                      >
                        <option value="" disabled>-- Select Rider / Staff --</option>
                        {riders.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        placeholder={modalType === 'pocket_settlement' ? 'Why / Notes (e.g. Paid salary from pocket)' : 'Description / Source'} 
                        required
                        value={modalType === 'pocket_settlement' ? (form.notes || '') : (form.description || '')}
                        onChange={e => setForm({...form, [modalType === 'pocket_settlement' ? 'notes' : 'description']: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none" 
                      />
                    )}

                    {modalType === 'pocket_settlement' && (
                      <select 
                        required
                        value={form.category || ''}
                        onChange={e => setForm({...form, category: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none"
                      >
                        <option value="" disabled>Select Category</option>
                        {['Expenses', 'Salary', 'Infra', 'Utilities', 'Food', 'Income', 'Profit', 'Misc'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input 
                        type="number" 
                        placeholder="Amount" 
                        required
                        value={form.amount || ''}
                        onChange={e => setForm({...form, amount: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-4 py-3 outline-none font-bold" 
                      />
                    </div>

                    {modalType === 'investment' && (
                      <select 
                        required
                        value={form.category || 'Misc'}
                        onChange={e => setForm({...form, category: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none"
                      >
                        <option value="" disabled>Select Category</option>
                        {['Transport', 'Infrastructure', 'Stationery', 'Equipments', 'Deposits', 'Misc'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 py-3 rounded-xl font-bold">Cancel</button>
                    <button type="submit" className="flex-2 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20">Save Entry</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recovery Modal */}
      <AnimatePresence>
        {showRecoveryModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRecoveryModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-xl font-black mb-1">Add Recovery</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">Adding for: <span className="text-gray-900 dark:text-white font-bold">{selectedInvestment?.description}</span></p>
              
              <form onSubmit={handleAddRecovery} className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    placeholder="Amount to add" 
                    required
                    autoFocus
                    value={recoveryAmount}
                    onChange={e => setRecoveryAmount(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl pl-8 pr-4 py-4 outline-none font-black text-lg focus:ring-2 focus:ring-primary/20 transition-all" 
                  />
                </div>
                
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowRecoveryModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 py-3 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30">Add Amount</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InvestmentsView({ items, onAdd, onToggle, onAddRecovery, onEdit, onDelete }) {
  const totalOpen = items.filter(i => i.status === 'Open').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalClosed = items.filter(i => i.status === 'Closed').reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const categoriesData = useMemo(() => {
    const cats = { Transport: 0, Infrastructure: 0, Stationery: 0, Equipments: 0, Deposits: 0, Misc: 0 };
    items.forEach(i => {
      const c = i.category || 'Misc';
      if (cats[c] !== undefined) cats[c] += Number(i.amount) || 0;
      else cats['Misc'] += Number(i.amount) || 0;
    });
    return Object.keys(cats).map(k => ({ name: k, value: cats[k] })).filter(c => c.value > 0);
  }, [items]);

  const chartData = {
    labels: categoriesData.map(c => c.name),
    datasets: [
      {
        label: 'Invested',
        data: categoriesData.map(c => c.value),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'
        ],
        borderRadius: 4
      }
    ]
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex-1 flex flex-col justify-center">
            <p className="text-[10px] uppercase font-black text-blue-600 mb-1">Total Active</p>
            <p className="text-2xl font-black text-blue-900 dark:text-blue-100">₹{totalOpen.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 flex-1 flex flex-col justify-center">
            <p className="text-[10px] uppercase font-black text-emerald-600 mb-1">Total Closed</p>
            <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">₹{totalClosed.toLocaleString()}</p>
          </div>
        </div>

        {categoriesData.length > 0 ? (
          <div className="md:col-span-2 bg-white dark:bg-gray-800/50 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col">
            <h3 className="font-bold mb-2 self-start text-gray-500 uppercase tracking-widest text-xs">Categories Overview</h3>
            <div className="flex-1 w-full min-h-[160px]">
              <Bar 
                data={chartData} 
                options={{ 
                  plugins: { legend: { display: false } }, 
                  maintainAspectRatio: false,
                  scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                  }
                }} 
              />
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 bg-white dark:bg-gray-800/50 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center items-center text-gray-400">
            <p className="text-sm font-bold">No categorical data yet</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="font-bold">Invested Capital</h3>
          <button onClick={onAdd} className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20 hover:bg-primary/20 transition-all"><Plus size={20}/></button>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {items.map(item => {
            const recovered = Number(item.recoveredAmount) || 0;
            const total = Number(item.amount) || 0;
            const progress = Math.min((recovered / total) * 100, 100);
            
            return (
              <div key={item.id} className="p-4 flex flex-col gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === 'Open' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {item.status === 'Open' ? <Clock size={20} /> : <CheckCircle2 size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white capitalize">{item.description}</p>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-2 font-bold tracking-wide">{item.category || 'Misc'}</span>
                        {item.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="font-black text-gray-900 dark:text-white">₹{total.toLocaleString()}</p>
                      <p className={`text-[10px] font-black uppercase ${item.status === 'Open' ? 'text-amber-500' : 'text-emerald-500'}`}>{item.status}</p>
                    </div>
                    {item.status === 'Open' && (
                      <button 
                        onClick={() => onAddRecovery(item)}
                        className="bg-primary/10 text-primary p-2 rounded-lg border border-primary/20 hover:bg-primary/20 transition-all"
                        title="Add recovery amount"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-primary hover:border-primary/30 transition-all"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-rose-600 hover:border-rose-200 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => onToggle(item)}
                      className={`p-2 rounded-lg border transition-all ${item.status === 'Open' ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}`}
                      title={item.status === 'Open' ? 'Mark as Closed' : 'Reopen'}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-gray-400">Recovery Progress</span>
                    <span className={progress === 100 ? 'text-emerald-500' : 'text-primary'}>
                      ₹{recovered.toLocaleString()} / ₹{total.toLocaleString()} ({progress.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && <div className="p-12 text-center text-gray-400">No investments recorded.</div>}
        </div>
      </div>
    </div>
  );
}



function PocketSettlementsView({ items, onAdd, onEdit, onDelete }) {
  const [filter, setFilter] = useState('all'); // all, debt, credit
  
  const filtered = items.filter(i => {
    if (filter === 'debt') return i.type === 'Debt';
    if (filter === 'credit') return i.type === 'Credit';
    return true;
  });

  const totalDebt = items.filter(i => i.type === 'Debt').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalCredit = items.filter(i => i.type === 'Credit').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const netBalance = totalDebt - totalCredit;

  const CATEGORY_COLORS = {
    Expenses:  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
    Salary:    { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-300' },
    Infra:     { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
    Utilities: { bg: 'bg-cyan-100 dark:bg-cyan-900/30',   text: 'text-cyan-700 dark:text-cyan-300' },
    Food:      { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
    Income:    { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
    Profit:    { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
    Misc:      { bg: 'bg-gray-100 dark:bg-gray-700',      text: 'text-gray-600 dark:text-gray-300' },
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Debt = Red */}
        <div className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-3xl border border-rose-100 dark:border-rose-900/30 flex flex-col justify-center shadow-sm">
          <p className="text-[10px] uppercase font-black text-rose-600 mb-1">Total Debt (Paid from Pocket)</p>
          <p className="text-2xl font-black text-rose-900 dark:text-rose-100">₹{totalDebt.toLocaleString()}</p>
          <p className="text-[10px] text-rose-500 mt-1 font-medium">Business owes you this amount</p>
        </div>

        {/* Credit = Green */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-center shadow-sm">
          <p className="text-[10px] uppercase font-black text-emerald-600 mb-1">Total Credit (Taken from Business)</p>
          <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">₹{totalCredit.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-500 mt-1 font-medium">Reimbursed back to your pocket</p>
        </div>

        <div className={`p-5 rounded-3xl border flex flex-col justify-center shadow-sm transition-all ${
          netBalance > 0 
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'
            : netBalance < 0
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30'
            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800'
        }`}>
          <p className={`text-[10px] uppercase font-black mb-1 ${
            netBalance > 0 ? 'text-amber-600' : netBalance < 0 ? 'text-blue-600' : 'text-gray-500'
          }`}>
            Net Balance (Owed to Owner)
          </p>
          <p className={`text-2xl font-black ${
            netBalance > 0 ? 'text-amber-900 dark:text-amber-100' : netBalance < 0 ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'
          }`}>
            {netBalance < 0 ? `-₹${Math.abs(netBalance).toLocaleString()}` : `₹${netBalance.toLocaleString()}`}
          </p>
          <p className={`text-[10px] mt-1 font-medium ${
            netBalance > 0 ? 'text-amber-500' : netBalance < 0 ? 'text-blue-500' : 'text-gray-400'
          }`}>
            {netBalance > 0 
              ? 'Business owes you money 💰' 
              : netBalance < 0 
              ? 'You received more than paid' 
              : 'All settled! ✅'}
          </p>
        </div>
      </div>

      {/* Filter and Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/55 dark:bg-gray-800/20 p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
        <div className="flex gap-2 flex-wrap">
          {['all', 'debt', 'credit'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                filter === f 
                  ? f === 'debt'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-200'
                    : f === 'credit'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                    : 'bg-primary text-white border-primary shadow-lg shadow-primary/25' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
              }`}
            >
              {f === 'all' ? 'SHOW ALL' : f === 'debt' ? '🔴 DEBT (POCKET PAID)' : '🟢 CREDIT (RECEIVED)'}
            </button>
          ))}
        </div>

        <button 
          onClick={onAdd} 
          className="bg-primary/10 text-primary px-4 py-2.5 rounded-xl border border-primary/20 hover:bg-primary/20 transition-all font-bold text-xs flex items-center gap-2"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Pocket Transaction
        </button>
      </div>

      {/* History List */}
      <div className="bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30">
          <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">Pocket Settlements History</h3>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {filtered.map(item => {
            const isDebt = item.type === 'Debt';
            const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Misc;
            return (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                <div className="flex items-center gap-4">
                  {/* Color: Debt=Red, Credit=Green */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                    isDebt 
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30 text-rose-600' 
                      : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30 text-emerald-600'
                  }`}>
                    {isDebt ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-white capitalize">
                        {isDebt ? 'Pocket Paid' : 'Received from Business'}
                      </p>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isDebt 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}>
                        {item.type}
                      </span>
                      {item.category && (
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${catStyle.bg} ${catStyle.text}`}>
                          {item.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      {item.notes || 'No description'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                      {item.date}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {/* Debt=Red amount, Credit=Green amount */}
                    <p className={`font-black text-lg ${
                      isDebt ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isDebt ? '-' : '+'}₹{(item.amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => onEdit(item)} 
                      className="p-2 border border-blue-100 dark:border-blue-900/30 rounded-lg text-primary hover:bg-primary/5 transition-all shadow-sm"
                      title="Edit Settlement"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => onDelete(item.id)} 
                      className="p-2 border border-rose-100 dark:border-rose-900/30 rounded-lg text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
                      title="Delete Settlement"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-12 text-center text-gray-400 font-medium text-sm flex flex-col items-center gap-2">
              <Receipt className="w-8 h-8 opacity-30" />
              <span>No pocket settlements recorded.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
