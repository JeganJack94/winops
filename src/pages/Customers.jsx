import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Trash2, User, Phone, MapPin, 
  X, Save, Edit2, Filter, ChevronRight, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { customerService } from '../services/customerService';

const CATEGORIES = ['Regular', 'Priority', 'VIP', 'Wholesale', 'E-commerce'];
const ZONES = ['Main', 'East', 'West', 'North', 'South'];

export default function Customers() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    address: '',
    category: 'Regular',
    zone: 'Main'
  });

  useEffect(() => {
    const unsub = customerService.subscribeToCustomers((data) => {
      setCustomers(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name?.toLowerCase().includes(q) ||
      c.mobile?.includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      c.zone?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer.id, form);
        toast.success('Customer updated successfully');
      } else {
        await customerService.addCustomer(form);
        toast.success('Customer added successfully');
      }
      closeModal();
    } catch (error) {
      toast.error('Failed to save customer');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await customerService.deleteCustomer(id);
      toast.success('Customer deleted');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const openModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setForm({
        name: customer.name || '',
        mobile: customer.mobile || '',
        address: customer.address || '',
        category: customer.category || 'Regular',
        zone: customer.zone || 'Main'
      });
    } else {
      setEditingCustomer(null);
      setForm({
        name: '',
        mobile: '',
        address: '',
        category: 'Regular',
        zone: 'Main'
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <User className="text-primary" size={32} />
            Customer Directory
          </h1>
          <p className="mt-1 text-slate-500 font-medium">Manage your delivery database and contact records.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search name, mobile, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl w-full md:w-80 shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-primary hover:bg-primary/90 text-white p-3.5 rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-95 flex items-center gap-2 font-black"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Customer</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/50 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[32px] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-5 text-xs font-black uppercase text-gray-500 tracking-wider">Customer</th>
                <th className="px-6 py-5 text-xs font-black uppercase text-gray-500 tracking-wider">Contact & Zone</th>
                <th className="px-6 py-5 text-xs font-black uppercase text-gray-500 tracking-wider">Address</th>
                <th className="px-6 py-5 text-xs font-black uppercase text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredCustomers.map((customer) => (
                <motion.tr 
                  layout
                  key={customer.id} 
                  className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors group"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                        {customer.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-black text-gray-900 dark:text-white">{customer.name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Tag size={12} className="text-gray-400" />
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            customer.category === 'Priority' ? 'bg-amber-100 text-amber-600' :
                            customer.category === 'VIP' ? 'bg-purple-100 text-purple-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {customer.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400">
                        <Phone size={14} className="text-primary/60" />
                        {customer.mobile}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-tighter">
                        <MapPin size={14} className="text-blue-500/60" />
                        {customer.zone} Zone
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-xs line-clamp-2">
                      {customer.address}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openModal(customer)}
                        className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-primary hover:text-white transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(customer.id)}
                        className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filteredCustomers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="4" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search size={48} className="text-gray-200 dark:text-gray-700" />
                      <p className="text-gray-400 font-bold">No customers found matching your search</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={closeModal} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl overflow-hidden border border-white/10 dark:border-gray-800"
            >
              <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                    {editingCustomer ? 'Update Profile' : 'New Customer'}
                  </h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Contact Information</p>
                </div>
                <button 
                  onClick={closeModal} 
                  className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"
                >
                  <X size={20}/>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" size={18} />
                      <input 
                        type="text" 
                        required 
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        value={form.name}
                        onChange={(e) => setForm({...form, name: e.target.value})}
                        placeholder="e.g. Rahul Sharma"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" size={18} />
                        <input 
                          type="tel" 
                          required 
                          className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                          value={form.mobile}
                          onChange={(e) => setForm({...form, mobile: e.target.value})}
                          placeholder="9876543210"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">Zone</label>
                      <select 
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        value={form.zone}
                        onChange={(e) => setForm({...form, zone: e.target.value})}
                      >
                        {ZONES.map(z => <option key={z} value={z}>{z} Zone</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">Customer Category</label>
                    <div className="flex gap-2 flex-wrap">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setForm({...form, category: cat})}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            form.category === cat 
                            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">Delivery Address</label>
                    <textarea 
                      required 
                      rows="3"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold resize-none"
                      value={form.address}
                      onChange={(e) => setForm({...form, address: e.target.value})}
                      placeholder="Street name, landmark, etc..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {editingCustomer ? 'Save Changes' : 'Add Customer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
