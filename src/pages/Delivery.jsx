import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Trash2, MapPin, User, Calendar, Edit2, 
  Truck, CheckCircle2, AlertCircle, X, ChevronRight, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { deliveryService } from '../services/deliveryService';
import { riderService } from '../services/riderService';
import { settingsService } from '../services/settingsService';
import { useTheme } from '../context/ThemeContext';

export default function Delivery() {
  const { theme } = useTheme();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('hub');
  const [hubSearch, setHubSearch] = useState('');
  const [riderSearch, setRiderSearch] = useState('');
  
  const [riders, setRiders] = useState([]);
  const [hubEntries, setHubEntries] = useState([]);
  const [riderEntries, setRiderEntries] = useState([]);
  const [rate, setRate] = useState(18);

  // Modal States
  const [showHubModal, setShowHubModal] = useState(false);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [editingHubId, setEditingHubId] = useState(null);
  const [editingRiderId, setEditingRiderId] = useState(null);

  // Form States
  const [hubForm, setHubForm] = useState({
    date: new Date().toISOString().split('T')[0],
    received: ''
  });

  const [riderForm, setRiderForm] = useState({
    riderId: '',
    riderName: '',
    date: new Date().toISOString().split('T')[0],
    area: '',
    assigned: '',
    delivered: '',
    notes: ''
  });

  useEffect(() => {
    const unsubRiders = riderService.subscribeToRiders(setRiders);
    const unsubHub = deliveryService.subscribeToHubEntries(setHubEntries);
    const unsubRiderEntries = deliveryService.subscribeToRiderEntries(setRiderEntries);
    const unsubSettings = settingsService.subscribeToSettings((s) => setRate(s.ratePerParcel));

    return () => {
      unsubRiders();
      unsubHub();
      unsubRiderEntries();
      unsubSettings();
    };
  }, []);

  const handleHubSubmit = async (e) => {
    e.preventDefault();
    const received = Number(hubForm.received);
    try {
      if (editingHubId) {
        await deliveryService.updateHubEntry(editingHubId, {
          date: hubForm.date,
          totalReceived: received
        });
      } else {
        await deliveryService.addHubEntry({
          date: hubForm.date,
          totalReceived: received
        });
      }
      resetHubForm();
      console.log('Hub entry added, closing modal');
      setTimeout(() => {
        toast.success(editingHubId ? 'Hub entry updated' : 'Hub entry added');
      }, 0);
    } catch (error) {
      console.error('Error saving hub entry:', error);
      toast.error('Failed to save hub entry');
    }
  };

  const handleRiderSubmit = async (e) => {
    e.preventDefault();
    const assigned = Number(riderForm.assigned);
    const delivered = Number(riderForm.delivered);
    const income = delivered * rate;
    
    try {
      const entryData = {
        ...riderForm,
        assigned,
        delivered,
        pending: assigned - delivered,
        income
      };

      if (editingRiderId) {
        await deliveryService.updateRiderEntry(editingRiderId, entryData);
      } else {
        await deliveryService.addRiderEntry(entryData);
      }
      resetRiderForm();
      console.log('Rider entry added, closing modal');
      setTimeout(() => {
        toast.success(editingRiderId ? 'Rider entry updated' : 'Rider entry added');
      }, 0);
    } catch (error) {
      console.error('Error saving rider entry:', error);
      toast.error('Failed to save rider entry');
    }
  };

  const resetHubForm = () => {
    setHubForm({
      date: new Date().toISOString().split('T')[0],
      received: ''
    });
    setEditingHubId(null);
    setShowHubModal(false);
  };

  const resetRiderForm = () => {
    setRiderForm({
      riderId: '',
      riderName: '',
      date: new Date().toISOString().split('T')[0],
      area: '',
      assigned: '',
      delivered: '',
      notes: ''
    });
    setEditingRiderId(null);
    setShowRiderModal(false);
  };

  const onRiderChange = (e) => {
    const rider = riders.find(r => r.id === e.target.value);
    setRiderForm({
      ...riderForm,
      riderId: e.target.value,
      riderName: rider?.name || ''
    });
  };

  const handleEditHub = (entry) => {
    setHubForm({
      date: entry.date,
      received: entry.totalReceived
    });
    setEditingHubId(entry.id);
    setShowHubModal(true);
  };

  const handleEditRider = (entry) => {
    setRiderForm({
      riderId: entry.riderId,
      riderName: entry.riderName,
      date: entry.date,
      area: entry.area,
      assigned: entry.assigned,
      delivered: entry.delivered,
      notes: entry.notes || ''
    });
    setEditingRiderId(entry.id);
    setShowRiderModal(true);
  };

  const handleDeleteHub = async (id) => {
    if (window.confirm('Delete this hub entry?')) {
      try {
        await deliveryService.deleteHubEntry(id);
        toast.success('Hub entry deleted');
      } catch (error) {
        console.error('Error deleting hub entry:', error);
        toast.error('Failed to delete hub entry');
      }
    }
  };

  const handleDeleteRider = async (id) => {
    if (window.confirm('Delete this rider entry?')) {
      try {
        await deliveryService.deleteRiderEntry(id);
        toast.success('Rider entry deleted');
      } catch (error) {
        console.error('Error deleting rider entry:', error);
        toast.error('Failed to delete rider entry');
      }
    }
  };

  // Calculations
  const calculatedHubEntries = useMemo(() => {
    return hubEntries.map(hub => {
      const relatedRiders = riderEntries.filter(re => re.date === hub.date);
      const totalDelivered = relatedRiders.reduce((sum, re) => sum + Number(re.delivered), 0);
      return {
        ...hub,
        delivered: totalDelivered,
        pending: Number(hub.totalReceived) - totalDelivered
      };
    });
  }, [hubEntries, riderEntries]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayHub = calculatedHubEntries.filter(e => e.date === today);
    const todayRiders = riderEntries.filter(e => e.date === today);
    
    const received = todayHub.reduce((sum, e) => sum + Number(e.totalReceived), 0);
    const delivered = todayRiders.reduce((sum, e) => sum + Number(e.delivered), 0);
    
    return {
      received,
      delivered,
      pending: received - delivered
    };
  }, [calculatedHubEntries, riderEntries]);

  const filteredHubEntries = calculatedHubEntries.filter(entry => 
    entry.date?.includes(hubSearch)
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredRiderEntries = riderEntries.filter(entry => 
    entry.riderName?.toLowerCase().includes(riderSearch.toLowerCase()) ||
    entry.area?.toLowerCase().includes(riderSearch.toLowerCase())
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Delivery Operations
          </h2>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-md">
            Monitor hub intake and track rider performance across all delivery zones.
          </p>
        </div>
        
        {/* Tab Switcher - Premium Style */}
        <div className="flex p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-2xl shadow-inner border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md self-start md:self-center">
          <button
            onClick={() => setActiveTab('hub')}
            className={`relative px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              activeTab === 'hub'
                ? 'text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {activeTab === 'hub' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-primary rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">Hub Entry</span>
          </button>
          <button
            onClick={() => setActiveTab('rider')}
            className={`relative px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              activeTab === 'rider'
                ? 'text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {activeTab === 'rider' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-primary rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">Rider Entry</span>
          </button>
        </div>
      </div>

      {/* ─── Today's Pulse ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PulseCard 
          icon={<Truck size={22} />}
          label="Today Received"
          value={stats.received}
          color="blue"
          theme={theme}
        />
        <PulseCard 
          icon={<CheckCircle2 size={22} />}
          label="Today Delivered"
          value={stats.delivered}
          color="emerald"
          theme={theme}
        />
        <PulseCard 
          icon={<AlertCircle size={22} />}
          label="Pending Dispatch"
          value={stats.pending}
          color="amber"
          theme={theme}
        />
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="bg-white dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
        
        {/* Actions Bar */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative group flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder={activeTab === 'hub' ? "Search date (YYYY-MM-DD)..." : "Search rider or area..."}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-gray-900 dark:text-white"
              value={activeTab === 'hub' ? hubSearch : riderSearch}
              onChange={(e) => activeTab === 'hub' ? setHubSearch(e.target.value) : setRiderSearch(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => activeTab === 'hub' ? setShowHubModal(true) : setShowRiderModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold shadow-lg shadow-primary/25 transition-all active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            Add {activeTab === 'hub' ? 'Hub Entry' : 'Rider Entry'}
          </button>
        </div>

        {/* Dynamic Table / Card List */}
        <div className="overflow-x-auto min-h-[400px]">
          {activeTab === 'hub' ? (
            <HubTable 
              entries={filteredHubEntries} 
              onEdit={handleEditHub} 
              onDelete={handleDeleteHub}
              theme={theme}
            />
          ) : (
            <RiderTable 
              entries={filteredRiderEntries} 
              onEdit={handleEditRider} 
              onDelete={handleDeleteRider}
              theme={theme}
            />
          )}
        </div>
      </div>

      {/* ─── Modals ─── */}
      <AnimatePresence>
        {showHubModal && (
          <Modal title={editingHubId ? "Edit Hub Entry" : "New Hub Entry"} onClose={resetHubForm} theme={theme}>
            <form onSubmit={handleHubSubmit} className="space-y-5">
              <FormField label="Arrival Date" icon={<Calendar size={14}/>} theme={theme}>
                <input 
                  type="date" 
                  value={hubForm.date}
                  onChange={(e) => setHubForm({ ...hubForm, date: e.target.value })}
                  className={inputClasses(theme)}
                  required
                />
              </FormField>
              <FormField label="Total Parcles Received" icon={<Truck size={14}/>} theme={theme}>
                <input 
                  type="number" 
                  placeholder="e.g. 150" 
                  value={hubForm.received}
                  onChange={(e) => setHubForm({ ...hubForm, received: e.target.value })}
                  className={inputClasses(theme)}
                  required
                />
              </FormField>
              <button type="submit" className={submitClasses}>
                {editingHubId ? 'Update Record' : 'Log Arrival'}
              </button>
            </form>
          </Modal>
        )}

        {showRiderModal && (
          <Modal title={editingRiderId ? "Edit Delivery" : "New Delivery Entry"} onClose={resetRiderForm} theme={theme}>
            <form onSubmit={handleRiderSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <FormField label="Rider" icon={<User size={14}/>} theme={theme}>
                   <select 
                     className={inputClasses(theme)}
                     value={riderForm.riderId}
                     onChange={onRiderChange}
                     required
                   >
                     <option value="">Select Rider</option>
                     {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                   </select>
                 </FormField>
                 <FormField label="Date" icon={<Calendar size={14}/>} theme={theme}>
                   <input 
                     type="date" 
                     className={inputClasses(theme)}
                     value={riderForm.date}
                     onChange={(e) => setRiderForm({ ...riderForm, date: e.target.value })}
                     required
                   />
                 </FormField>
              </div>
              
              <FormField label="Delivery Area" icon={<MapPin size={14}/>} theme={theme}>
                <input 
                  placeholder="e.g. Downtown / North Block" 
                  className={inputClasses(theme)}
                  value={riderForm.area}
                  onChange={(e) => setRiderForm({ ...riderForm, area: e.target.value })}
                  required
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Assigned" theme={theme}>
                  <input 
                    type="number" 
                    placeholder="0" 
                    className={inputClasses(theme)}
                    value={riderForm.assigned}
                    onChange={(e) => setRiderForm({ ...riderForm, assigned: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Delivered" theme={theme}>
                  <input 
                    type="number" 
                    placeholder="0" 
                    className={inputClasses(theme)}
                    value={riderForm.delivered}
                    onChange={(e) => setRiderForm({ ...riderForm, delivered: e.target.value })}
                    required
                  />
                </FormField>
              </div>

              <FormField label="Special Notes" theme={theme}>
                <textarea 
                  rows={2}
                  placeholder="Optional delivery details..." 
                  className={inputClasses(theme)}
                  value={riderForm.notes}
                  onChange={(e) => setRiderForm({ ...riderForm, notes: e.target.value })}
                />
              </FormField>

              <button type="submit" className={submitClasses}>
                {editingRiderId ? 'Update Delivery' : 'Assign Delivery'}
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── UI Components ─── */

function PulseCard({ icon, label, value, color, theme }) {
  const colors = {
    blue: "from-blue-500/20 to-blue-600/5 text-blue-600 border-blue-200 dark:border-blue-800",
    emerald: "from-emerald-500/20 to-emerald-600/5 text-emerald-600 border-emerald-200 dark:border-emerald-800",
    amber: "from-amber-500/20 to-amber-600/5 text-amber-600 border-amber-200 dark:border-amber-800",
  };

  return (
    <div className={`p-5 rounded-3xl bg-gradient-to-br ${colors[color]} border shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-black/5">
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
            {label}
          </p>
          <p className="text-2xl font-black tabular-nums">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function HubTable({ entries, onEdit, onDelete, theme }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-50/50 dark:bg-gray-800/20 text-[11px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
          <th className="px-6 py-4 text-left">Date</th>
          <th className="px-6 py-4 text-left">Received</th>
          <th className="px-6 py-4 text-left">Success</th>
          <th className="px-6 py-4 text-left">Pending</th>
          <th className="px-6 py-4 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {entries.map(e => (
          <tr key={e.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
            <td className="px-6 py-5">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Calendar size={14}/>
                 </div>
                 <span className="font-semibold text-gray-900 dark:text-gray-200">{e.date}</span>
               </div>
            </td>
            <td className="px-6 py-5 font-mono text-gray-700 dark:text-gray-300">{e.totalReceived}</td>
            <td className="px-6 py-5">
               <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                 <CheckCircle2 size={14}/>
                 {e.delivered}
               </div>
            </td>
            <td className="px-6 py-5">
               <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                 e.pending <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
               }`}>
                 {e.pending} left
               </span>
            </td>
            <td className="px-6 py-5 text-right">
               <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => onEdit(e)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                   <Edit2 size={16}/>
                 </button>
                 <button onClick={() => onDelete(e.id)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                   <Trash2 size={16}/>
                 </button>
               </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RiderTable({ entries, onEdit, onDelete, theme }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-50/50 dark:bg-gray-800/20 text-[11px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
          <th className="px-6 py-4 text-left">Rider & Area</th>
          <th className="px-6 py-4 text-left">Date</th>
          <th className="px-6 py-4 text-left">Assigned</th>
          <th className="px-6 py-4 text-left">Delivered</th>
          <th className="px-6 py-4 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {entries.map(e => (
          <tr key={e.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
            <td className="px-6 py-5">
               <div className="flex flex-col">
                 <span className="font-bold text-gray-900 dark:text-gray-100">{e.riderName}</span>
                 <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                   <MapPin size={10}/>
                   {e.area}
                 </div>
               </div>
            </td>
            <td className="px-6 py-5 text-sm text-gray-600 dark:text-gray-400">{e.date}</td>
            <td className="px-6 py-5 font-mono font-medium text-blue-600 dark:text-blue-400">{e.assigned}</td>
            <td className="px-6 py-5">
               <div className="flex items-center gap-1.5">
                 <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden min-w-[60px]">
                   <div 
                     className="h-full bg-emerald-500 rounded-full" 
                     style={{ width: `${Math.min(100, (e.delivered / (e.assigned || 1)) * 100)}%` }}
                   />
                 </div>
                 <span className="text-xs font-bold text-emerald-600">{e.delivered}</span>
               </div>
            </td>
            <td className="px-6 py-5 text-right">
               <div className="flex justify-end gap-1">
                 <button onClick={() => onEdit(e)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                   <Edit2 size={16}/>
                 </button>
                 <button onClick={() => onDelete(e.id)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-100/50 rounded-lg transition-colors">
                   <Trash2 size={16}/>
                 </button>
               </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Modal({ title, onClose, children, theme }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl border border-white/20 dark:border-gray-800 overflow-hidden"
      >
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X size={20}/>
          </button>
        </div>
        <div className="px-8 pb-10">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function FormField({ label, icon, children, theme }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClasses = (theme) => `
  w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 
  rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary 
  transition-all text-gray-900 dark:text-white placeholder:text-gray-400
`;

const submitClasses = `
  w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black 
  shadow-xl shadow-primary/30 transition-all active:scale-[0.98] mt-4
`;
