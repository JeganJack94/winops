import { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Plus, User, CreditCard, MapPin, 
  Cake, Calendar, Pencil, Trash2, X, Shield, Eye, EyeOff, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { profileService } from '../services/profileService';
import { useTheme } from '../context/ThemeContext';

export default function Profiles() {
  const { theme } = useTheme();
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAadhar, setShowAadhar] = useState({}); // To toggle masking per card

  const [form, setForm] = useState({
    name: '',
    phone: '',
    aadhar: '',
    address: '',
    dob: '',
    joiningDate: ''
  });

  useEffect(() => {
    const unsub = profileService.subscribeToProfiles(setProfiles);
    return () => unsub();
  }, []);

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.aadhar?.includes(searchTerm) ||
      p.phone?.includes(searchTerm)
    );
  }, [profiles, searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (form.id) {
        const { id, ...updateData } = form; // Clean payload
        await profileService.updateProfile(id, updateData);
        toast.success('Profile updated successfully');
      } else {
        await profileService.addProfile(form);
        toast.success('Profile added successfully');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this profile? All data will be lost.')) {
      try {
        await profileService.deleteProfile(id);
        toast.success('Profile deleted');
      } catch (error) {
         toast.error('Failed to delete profile');
      }
    }
  };

  const handleEdit = (profile) => {
    setForm(profile);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ name: '', phone: '', aadhar: '', address: '', dob: '', joiningDate: '' });
  };

  const toggleAadhar = (id) => {
    setShowAadhar(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <Users className="text-primary" size={40} />
            <span className="bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              Employee Profiles
            </span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">Manage personnel records and identification</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by name or Aadhar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-3 outline-none focus:ring-2 ring-primary/20 transition-all font-medium text-sm"
            />
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary-dark text-white p-3 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 font-bold px-6"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Profile</span>
          </button>
        </div>
      </div>

      {/* Grid Section */}
      {filteredProfiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-gray-900/30 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
           <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
             <Users size={32} />
           </div>
           <p className="text-gray-500 font-bold">No profiles found</p>
           <p className="text-gray-400 text-sm mt-1">Try a different search or add a new record</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProfiles.map((p, index) => (
              <motion.div
                layout
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group relative bg-white dark:bg-gray-900/80 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all cursor-default overflow-hidden"
              >
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[4rem] group-hover:bg-primary/10 transition-colors pointer-events-none" />
                
                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-2 transition-all z-10">
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleEdit(p); }} 
                    className="p-2.5 bg-white/90 dark:bg-gray-800/90 rounded-xl text-primary hover:text-primary-dark transition-colors border border-gray-100 dark:border-gray-700 backdrop-blur-sm shadow-md"
                    title="Edit Profile"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} 
                    className="p-2.5 bg-white/90 dark:bg-gray-800/90 rounded-xl text-rose-500 hover:text-rose-700 transition-colors border border-gray-100 dark:border-gray-700 backdrop-blur-sm shadow-md"
                    title="Delete Profile"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-5 relative">
                  {/* Name & Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                      <User size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{p.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary mt-0.5 bg-primary/10 px-2 py-0.5 rounded-full w-fit">
                        <Shield size={12} />
                        Active Staff
                      </div>
                    </div>
                  </div>

                  {/* Info Divider */}
                  <div className="h-px bg-gray-100 dark:bg-gray-800" />

                  {/* Details List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between group/aadhar">
                      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                        <CreditCard size={18} />
                        <span className="text-sm font-bold">Aadhar Card</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-sm font-black dark:text-white group-hover:text-primary transition-colors tracking-widest">
                           {showAadhar[p.id] ? p.aadhar : `•••• •••• ${p.aadhar?.slice(-4)}`}
                         </span>
                         <button onClick={() => toggleAadhar(p.id)} className="text-gray-400 hover:text-primary">
                           {showAadhar[p.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                         </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-gray-500 dark:text-gray-400">
                      <Phone size={18} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs uppercase font-black text-gray-400">Mobile</span>
                        <a href={`tel:${p.phone}`} className="text-sm font-black text-primary hover:underline block mt-0.5">{p.phone}</a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-gray-500 dark:text-gray-400">
                      <MapPin size={18} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs uppercase font-black text-gray-400">Address</span>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug mt-0.5">{p.address}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 flex items-center gap-2">
                        <Cake size={16} className="text-orange-400" />
                        <div>
                          <span className="text-[10px] uppercase font-black text-gray-400 block -mb-1">DOB</span>
                          <span className="text-xs font-black dark:text-gray-200">{p.dob}</span>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <Calendar size={16} className="text-emerald-500" />
                        <div>
                          <span className="text-[10px] uppercase font-black text-gray-400 block -mb-1">Joined</span>
                          <span className="text-xs font-black dark:text-gray-200">{p.joiningDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Profile Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={handleCloseModal} 
              className="fixed inset-0 bg-black/80 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
            >
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <h3 className="text-2xl font-black">{form.id ? 'Edit' : 'New'} Profile</h3>
                  </div>
                  <button type="button" onClick={handleCloseModal} className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. John Doe"
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 ring-primary/20 transition-all font-black text-gray-900 dark:text-white" 
                      />
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="tel" 
                        required
                        placeholder="10 digit mobile number"
                        value={form.phone}
                        onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g, '')})}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 ring-primary/20 transition-all font-black text-gray-900 dark:text-white" 
                      />
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Aadhar Number</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        required
                        maxLength={12}
                        pattern="\d{12}"
                        placeholder="12 digit aadhar number"
                        value={form.aadhar}
                        onChange={e => setForm({...form, aadhar: e.target.value.replace(/\D/g, '')})}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 ring-primary/20 transition-all font-black text-gray-900 dark:text-white" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Date of Birth</label>
                    <div className="relative">
                      <Cake className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="date" 
                        required
                        value={form.dob}
                        onChange={e => setForm({...form, dob: e.target.value})}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 ring-primary/20 transition-all font-black text-gray-900 dark:text-white" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Joining Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="date" 
                        required
                        value={form.joiningDate}
                        onChange={e => setForm({...form, joiningDate: e.target.value})}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 ring-primary/20 transition-all font-black text-gray-900 dark:text-white" 
                      />
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 text-gray-400" size={18} />
                      <textarea 
                        required
                        rows={3}
                        placeholder="House No, Street, City, State, PIN"
                        value={form.address}
                        onChange={e => setForm({...form, address: e.target.value})}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 ring-primary/20 transition-all font-black text-gray-900 dark:text-white resize-none" 
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={handleCloseModal}
                    className="flex-1 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : form.id ? 'Save Changes' : 'Create Profile'}
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
