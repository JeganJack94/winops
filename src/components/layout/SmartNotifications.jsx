import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertCircle, CheckCircle2, Clock, X, Award, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { deliveryService } from '../../services/deliveryService';

export default function SmartNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Determine "today" string in local format YYYY-MM-DD
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    const unsubscribe = deliveryService.subscribeToDailyRecords((records) => {
      const todayRecord = records.find(r => r.date === todayStr);
      const newNotifs = [];

      if (!todayRecord) {
        newNotifs.push({
          id: 'no-data',
          type: 'info',
          title: 'Daily Systems Offline',
          message: 'No delivery records have been initialized for today yet.',
          icon: Clock,
          color: 'text-blue-500',
          bg: 'bg-blue-100 dark:bg-blue-900/30'
        });
      } else {
        const sr = todayRecord.successRate || 0;
        const pending = todayRecord.totalPending || 0;
        
        // 1. Overall Success Rate Alerts
        if (sr >= 80) {
          newNotifs.push({
            id: 'high-sr',
            type: 'success',
            title: 'Outstanding Performance!',
            message: `Overall success rate is hitting ${sr}%. Keep it up!`,
            icon: Award,
            color: 'text-emerald-500',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30'
          });
        } else if (sr < 75 && todayRecord.totalAssigned > 0) {
          newNotifs.push({
            id: 'low-sr',
            type: 'warning',
            title: 'Productivity Alert',
            message: `Overall success rate has dropped to ${sr}%. Action may be required.`,
            icon: TrendingDown,
            color: 'text-rose-500',
            bg: 'bg-rose-100 dark:bg-rose-900/30'
          });
        }

        // 2. Pending Work load
        if (pending > 30) {
          newNotifs.push({
            id: 'high-pending',
            type: 'pending',
            title: 'High Pending Queue',
            message: `There are ${pending} parcels still pending delivery today.`,
            icon: Clock,
            color: 'text-amber-500',
            bg: 'bg-amber-100 dark:bg-amber-900/30'
          });
        }

        // 3. Rider-specific alerts
        if (todayRecord.riders && todayRecord.riders.length > 0) {
          const lowRiders = todayRecord.riders.filter(r => r.successRate < 70 && (r.assignedDelivery + r.assignedPickup) > 10);
          if (lowRiders.length > 0) {
             const names = lowRiders.map(r => r.riderName).join(', ');
             newNotifs.push({
                id: 'rider-alert',
                type: 'warning',
                title: 'Rider Warning',
                message: `${names} ${lowRiders.length > 1 ? 'are' : 'is'} struggling today (SR < 70%).`,
                icon: AlertCircle,
                color: 'text-rose-500',
                bg: 'bg-rose-100 dark:bg-rose-900/30'
             });
          }
        }
      }

      setNotifications(newNotifs);
      if (newNotifs.length > 0) setHasUnread(true);
    });

    return () => unsubscribe();
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearNotification = (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notifications.length <= 1) setHasUnread(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => { setIsOpen(!isOpen); setHasUnread(false); }}
        className="relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95"
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-rose-500 border-2 border-white dark:border-gray-900 shadow-sm"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-[1000]"
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell size={18} className="text-primary" /> Notifications
              </h3>
              {notifications.length > 0 && (
                <span className="text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                  {notifications.length}
                </span>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto p-2 no-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
                   <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                     <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                   </div>
                   <p className="text-sm font-medium">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notif) => {
                    const Icon = notif.icon;
                    return (
                      <div key={notif.id} className="p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-4 group">
                        <div className={`mt-1 h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center ${notif.bg} ${notif.color}`}>
                          <Icon size={20} />
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-start">
                             <h4 className="font-bold text-sm text-gray-900 dark:text-white capitalize">{notif.title}</h4>
                             <button onClick={(e) => clearNotification(e, notif.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all">
                               <X size={14} />
                             </button>
                           </div>
                           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pb-1 leading-relaxed">{notif.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
