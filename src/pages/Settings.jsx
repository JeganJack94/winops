import React, { useState, useEffect } from 'react';
import { User, Users, Sun, Moon, LogOut, IndianRupee, Trash2, Plus, X, Phone, Building, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { riderService } from '../services/riderService';
import { settingsService } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { Loader2 } from 'lucide-react';

const Modal = ({ onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "auto";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

const FormField = ({ label, icon: Icon, children }) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-orange-500" />}
      {label}
    </label>
    {children}
  </div>
);

export default function Settings() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [riders, setRiders] = useState([]);
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderPhone, setNewRiderPhone] = useState('');
  const [showAddRider, setShowAddRider] = useState(false);
  const [isAddingRider, setIsAddingRider] = useState(false);
  const [settings, setSettings] = useState({
    ratePerParcel: 18,
    companyName: 'Win Express',
    email: 'winexpress630551@gmail.com'
  });



  useEffect(() => {
    const unsubscribeRiders = riderService.subscribeToRiders(setRiders);
    const unsubscribeSettings = settingsService.subscribeToSettings(setSettings);
    return () => {
      unsubscribeRiders();
      unsubscribeSettings();
    };
  }, []);

  const handleSaveRate = async () => {
    try {
      await settingsService.updateSettings({ ratePerParcel: Number(settings.ratePerParcel) });
      toast.success('Payment rate updated');
    } catch (error) {
      console.error('Error updating rate:', error);
      toast.error('Failed to update rate');
    }
  };

  const handleCloseAddRider = () => {
    if (isAddingRider) return;
    setNewRiderName('');
    setNewRiderPhone('');
    setShowAddRider(false);
  };

  const handleAddRider = async (e) => {
    e.preventDefault();

    if (!newRiderName.trim() || !newRiderPhone.trim()) {
      toast.error('All fields are required');
      return;
    }

    console.log('Attempting to add rider:', { name: newRiderName.trim(), phone: newRiderPhone.trim() });
    setIsAddingRider(true);
    try {
      const result = await riderService.addRider({
        name: newRiderName.trim(),
        phone: newRiderPhone.trim(),
        status: 'Active',
        joinedAt: new Date().toISOString()
      });
      console.log('Rider added successfully, doc ID:', result?.id);

      handleCloseAddRider();
      toast.success('Rider added successfully');
    } catch (error) {
      console.error('CRITICAL: Error adding rider to Firebase:', error);
      toast.error(`Database Error: ${error.message || 'Check connection'}`);
    } finally {
      setIsAddingRider(false);
    }
  };

  const handleDeleteRider = async (id) => {
    if (window.confirm('Are you sure you want to delete this rider?')) {
      try {
        await riderService.deleteRider(id);
        toast.success('Rider removed from directory');
      } catch (error) {
        console.error('Error deleting rider:', error);
        toast.error('Failed to remove rider');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-8 space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your business and team settings</p>
        </div>
        <Button
          variant="ghost"
          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 font-bold flex items-center gap-2 w-fit"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Small Profile & App Prefs */}
        <div className="space-y-6">
          {/* Profile Card - Small & Simple */}
          <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center p-3 border border-orange-500/20 shadow-inner">
                  <img src="/logo.png" alt="Win Express" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{settings.companyName}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <Mail className="w-3 h-3" />
                    {settings.email}
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-6 h-10 rounded-xl border-slate-200 dark:border-slate-700 font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Update Profile
              </Button>
            </CardContent>
          </Card>

          {/* App Preferences */}
          <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider opacity-60">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Theme</p>
                    <p className="text-xs text-slate-500 font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none bg-slate-200 dark:bg-orange-600"
                >
                  <span className={`${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </button>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Payment Rate</p>
                    <p className="text-xs text-slate-500 font-medium">Default per parcel</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.ratePerParcel}
                    onChange={(e) => setSettings({ ...settings, ratePerParcel: e.target.value })}
                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-none text-sm font-bold"
                  />
                  <Button onClick={handleSaveRate} className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-all">
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Rider Management */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 overflow-hidden h-full">
            <CardHeader className="p-6 border-b border-slate-50 dark:border-slate-700/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  Rider Directory
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{riders.length} active team members</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddRider(true)}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 font-bold h-9 px-4 rounded-lg flex items-center gap-2 active:scale-95 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add Rider
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-700/30">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Phone</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {riders.map((rider) => (
                      <tr key={rider.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 text-xs">
                              {rider.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{rider.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                          {rider.phone}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${rider.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${rider.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {rider.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteRider(rider.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {riders.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-2 opacity-40">
                            <Users className="w-10 h-10" />
                            <p className="text-sm font-bold">No riders in the directory</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Rider Modal */}
      <AnimatePresence>
        {showAddRider && (
          <Modal
            onClose={handleCloseAddRider}
            title="New Rider"
          >
            <form onSubmit={handleAddRider} className="space-y-6">
              <FormField label="Full Name" icon={User}>
                <Input
                  placeholder="e.g. Jack"
                  value={newRiderName}
                  onChange={(e) => setNewRiderName(e.target.value)}
                  required
                  autoFocus
                  className="h-12 rounded-xl border-slate-200 dark:border-slate-700 text-sm focus:ring-orange-500"
                />
              </FormField>

              <FormField label="Phone Number" icon={Phone}>
                <Input
                  placeholder="e.g. +91 9843630571"
                  value={newRiderPhone}
                  onChange={(e) => setNewRiderPhone(e.target.value)}
                  required
                  className="h-12 rounded-xl border-slate-200 dark:border-slate-700 text-sm focus:ring-orange-500"
                />
              </FormField>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-bold text-slate-600"
                  onClick={handleCloseAddRider}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isAddingRider}
                  disabled={isAddingRider}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-orange-600/20"
                >
                  {isAddingRider ? "Adding..." : "Add Rider"}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
