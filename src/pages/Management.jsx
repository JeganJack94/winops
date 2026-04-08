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
import { expenseService } from '../services/expenseService';

const TABS = [
  { id: 'investments', name: 'Investments', icon: Landmark },
  { id: 'salaries', name: 'Salaries', icon: Users },
  { id: 'settlements', name: 'Settlements', icon: Receipt },
  { id: 'expenses', name: 'Expenses Settle', icon: Clock }
];

export default function Management() {
  const { theme } = useTheme();
  const toast = useToast();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('investments');
  
  const [investments, setInvestments] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'investment', 'salary', 'settlement'
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [form, setForm] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      const unsubInv = managementService.subscribeToInvestments(setInvestments);
      const unsubSal = managementService.subscribeToSalaries(setSalaries);
      const unsubSet = managementService.subscribeToSettlements(setSettlements);
      const unsubExp = expenseService.subscribeToExpenses(setExpenses);
      
      return () => {
        unsubInv();
        unsubSal();
        unsubSet();
        unsubExp();
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
      const data = { ...form, amount: Number(form.amount) };
      const isUpdate = !!form.id;

      if (modalType === 'investment') {
        if (isUpdate) await managementService.updateInvestment(form.id, data);
        else await managementService.addInvestment(data);
      } else if (modalType === 'salary') {
        if (isUpdate) await managementService.updateSalary(form.id, data);
        else await managementService.addSalary(data);
      } else if (modalType === 'settlement') {
        if (isUpdate) await managementService.updateSettlement(form.id, data);
        else await managementService.addSettlement(data);
      } else if (modalType === 'expense') {
        if (isUpdate) await expenseService.updateExpense(form.id, data);
        else await expenseService.addExpense(data);
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
      else if (type === 'salary') await managementService.deleteSalary(id);
      else if (type === 'settlement') await managementService.deleteSettlement(id);
      else if (type === 'expense') await expenseService.deleteExpense(id);
      
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
          <p className="text-gray-500 dark:text-gray-400">Track investments, settlements, and staff salaries.</p>
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
        {activeTab === 'salaries' && (
          <SalariesView 
            items={salaries} 
            onAdd={() => { setModalType('salary'); setForm({}); setShowModal(true); }} 
            onEdit={(item) => handleEdit('salary', item)}
            onDelete={(id) => handleDelete('salary', id)}
          />
        )}
        {activeTab === 'settlements' && (
          <SettlementsView 
            items={settlements} 
            onAdd={() => { setModalType('settlement'); setForm({}); setShowModal(true); }} 
            onEdit={(item) => handleEdit('settlement', item)}
            onDelete={(id) => handleDelete('settlement', id)}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesSettleView 
            items={expenses} 
            onEdit={(item) => handleEdit('expense', item)}
            onDelete={(id) => handleDelete('expense', id)}
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
                  <h3 className="text-xl font-black capitalize">{form.id ? 'Edit' : 'Add'} {modalType}</h3>
                  <div className="space-y-4">
                    <input 
                      type="date" 
                      required
                      value={form.date || new Date().toISOString().split('T')[0]}
                      onChange={e => setForm({...form, date: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none" 
                    />
                    <input 
                      type="text" 
                      placeholder={modalType === 'salary' ? 'Rider / Staff Name' : modalType === 'expense' ? 'Notes / Description' : 'Description / Source'} 
                      required
                      value={modalType === 'expense' ? (form.notes || '') : (form.description || '')}
                      onChange={e => setForm({...form, [modalType === 'expense' ? 'notes' : 'description']: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none" 
                    />
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
                    {modalType === 'salary' && (
                      <input 
                        type="text" 
                        placeholder="Month (e.g. April 2026)" 
                        required
                        value={form.month || ''}
                        onChange={e => setForm({...form, month: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none" 
                      />
                    )}
                    {modalType === 'expense' && (
                      <select 
                        required
                        value={form.type || 'Misc'}
                        onChange={e => setForm({...form, type: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none"
                      >
                        {['Fuel', 'Salary', 'Maintenance', 'Utilities', 'Rent', 'Misc'].map(t => (
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-3xl border border-blue-100 dark:border-blue-900/30">
          <p className="text-[10px] uppercase font-black text-blue-600 mb-1">Total Active</p>
          <p className="text-2xl font-black text-blue-900 dark:text-blue-100">₹{totalOpen.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
          <p className="text-[10px] uppercase font-black text-emerald-600 mb-1">Total Closed</p>
          <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">₹{totalClosed.toLocaleString()}</p>
        </div>
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
                      <p className="text-xs text-gray-500 font-medium">{item.date}</p>
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

function SalariesView({ items, onAdd, onEdit, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
        <h3 className="font-bold">Staff Salary Tracking</h3>
        <button onClick={onAdd} className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20 hover:bg-primary/20 transition-all"><Plus size={20}/></button>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {items.map(item => (
          <div key={item.id} className="p-4 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white capitalize">{item.description}</p>
                <p className="text-xs text-gray-500 font-medium">{item.month}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-black text-gray-900 dark:text-white">₹{item.amount.toLocaleString()}</p>
                <div className="flex items-center gap-1 justify-end text-[10px] font-black uppercase text-emerald-500">
                  <CheckCircle2 size={10} /> Paid
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onEdit(item)} 
                  className="p-2 border border-blue-100 dark:border-blue-900/30 rounded-lg text-primary hover:bg-primary/5 transition-all shadow-sm"
                >
                  <Pencil size={18} />
                </button>
                <button 
                  onClick={() => onDelete(item.id)} 
                  className="p-2 border border-rose-100 dark:border-rose-900/30 rounded-lg text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="p-12 text-center text-gray-400">No salary records.</div>}
      </div>
    </div>
  );
}

function SettlementsView({ items, onAdd, onEdit, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
        <h3 className="font-bold">Monthly Hub Settlements</h3>
        <button onClick={onAdd} className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20 hover:bg-primary/20 transition-all"><Plus size={20}/></button>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {items.map(item => (
          <div key={item.id} className="p-4 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
                <Landmark size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{item.description}</p>
                <p className="text-xs text-gray-500 font-medium">{item.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-black text-emerald-600">+₹{item.amount.toLocaleString()}</p>
                <p className="text-[10px] font-black uppercase text-gray-400">Settled</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onEdit(item)} 
                  className="p-2 border border-blue-100 dark:border-blue-900/30 rounded-lg text-primary hover:bg-primary/5 transition-all shadow-sm"
                >
                  <Pencil size={18} />
                </button>
                <button 
                  onClick={() => onDelete(item.id)} 
                  className="p-2 border border-rose-100 dark:border-rose-900/30 rounded-lg text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="p-12 text-center text-gray-400">No settlements recorded.</div>}
      </div>
    </div>
  );
}

function ExpensesSettleView({ items, onEdit, onDelete }) {
  const [filter, setFilter] = useState('all'); // all, pending, settled
  
  const filtered = items.filter(i => {
    if (filter === 'pending') return !i.settled;
    if (filter === 'settled') return i.settled;
    return true;
  });

  const toggleSettle = async (item) => {
    try {
      await expenseService.updateExpense(item.id, { settled: !item.settled });
    } catch (error) {
       console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', 'pending', 'settled'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${filter === f ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {filtered.map(item => (
            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => toggleSettle(item)}
                   className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${item.settled ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 dark:border-gray-700 text-transparent'}`}
                 >
                   <CheckCircle2 size={20} className={item.settled ? 'opacity-100' : 'opacity-0'} />
                 </button>
                 <div>
                   <p className="font-bold text-gray-900 dark:text-white capitalize">{item.type} - {item.notes || 'No notes'}</p>
                   <p className="text-xs text-gray-500 font-medium">{item.date}</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                   <p className="font-black text-rose-500">₹{item.amount.toLocaleString()}</p>
                   <p className={`text-[10px] font-black uppercase ${item.settled ? 'text-emerald-500' : 'text-gray-400'}`}>
                     {item.settled ? 'Settled' : 'Pending'}
                   </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }} 
                    className="p-2 border border-blue-100 dark:border-blue-900/30 rounded-lg text-primary hover:bg-primary/5 transition-all shadow-sm"
                    title="Edit Expense"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} 
                    className="p-2 border border-rose-100 dark:border-rose-900/30 rounded-lg text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
                    title="Delete Expense"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="p-12 text-center text-gray-400">No expenses found for this filter.</div>}
        </div>
      </div>
    </div>
  );
}
