import React, { useState, useEffect, useMemo } from 'react';
import { IndianRupee, Lock, Calendar, Edit2, Share2, Users, FileText, CheckCircle2, TrendingUp, User } from 'lucide-react';
import { deliveryService } from '../services/deliveryService';
import { riderService } from '../services/riderService';
import { earningsService } from '../services/earningsService';
import { settingsService } from '../services/settingsService';
import { useToast } from '../hooks/useToast';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

function KPICard({ title, value, icon: Icon, color, textColor }) {
  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br ${color} border border-gray-100 dark:border-gray-800 flex items-center gap-4`}>
      <div className={`p-3 rounded-xl bg-white/50 dark:bg-black/20 ${textColor}`}>
        <Icon size={24} />
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h4>
        <p className={`text-2xl font-black ${textColor} mt-1`}>{value}</p>
      </div>
    </div>
  );
}

export default function Earnings() {
  const toast = useToast();
  
  // Security
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // View State
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'monthly', 'individual'
  const [activeDate, setActiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeMonth, setActiveMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [indivMonth, setIndivMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // Data
  const [riders, setRiders] = useState([]);
  const [dailyRecords, setDailyRecords] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({ ratePerParcel: 12 });

  // Subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub1 = riderService.subscribeToRiders(setRiders);
    const unsub2 = deliveryService.subscribeToDailyRecords(setDailyRecords);
    const unsub3 = earningsService.subscribeToOverrides(setOverrides);
    const unsub4 = settingsService.subscribeToSettings(setGlobalSettings);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'Win9900') {
      setIsAuthenticated(true);
      toast.success('Access Granted');
    } else {
      toast.error('Incorrect Password');
      setPasswordInput('');
    }
  };

  // ─── DAILY EARNINGS DATA CALCULATION ───
  // We grab the existing delivery_record for activeDate, or build an empty frame.
  const dailyEarnings = useMemo(() => {
    const record = dailyRecords.find(r => r.date === activeDate);
    const allRiderEntries = record?.riders || [];
    const globalRate = Number(globalSettings.ratePerParcel) || 12;
    
    return riders.map(r => {
      const riderRate = r.ratePerParcel !== undefined ? Number(r.ratePerParcel) : globalRate;

      // Own entry: riderId matches AND no substitute OR substitute is self
      const ownEntry = allRiderEntries.find(dr =>
        dr.riderId === r.id && (!dr.actualRiderId || dr.actualRiderId === r.id)
      );
      // Entries where this rider was the actual deliverer for someone else's ID
      const subEntries = allRiderEntries.filter(dr =>
        dr.actualRiderId === r.id && dr.riderId !== r.id
      );
      // Entries where someone else used THIS rider's ID
      const delegatedEntries = allRiderEntries.filter(dr =>
        dr.riderId === r.id && dr.actualRiderId && dr.actualRiderId !== r.id
      );

      const ownDeliveries = ownEntry
        ? (Number(ownEntry.completedDelivery) || 0) + (Number(ownEntry.completedPickup) || 0)
        : 0;
      const subDeliveries = subEntries.reduce((sum, dr) =>
        sum + (Number(dr.completedDelivery) || 0) + (Number(dr.completedPickup) || 0), 0);

      const totalDelivered = ownDeliveries + subDeliveries;
      const autoPresent = totalDelivered > 0;
      const autoSalary = totalDelivered * riderRate;

      const overrideKey = `${activeDate}_${r.id}`;
      const hasOverride = overrides.find(o => o.id === overrideKey);

      return {
        riderId: r.id,
        riderName: r.name,
        deliveries: totalDelivered,
        ownDeliveries,
        subDeliveries,
        actedFor: subEntries.map(e => e.riderName), // I delivered using someone else's ID
        delegatedTo: delegatedEntries.map(e => e.actualRiderName), // someone used my ID
        riderRate,
        present: hasOverride && hasOverride.isPresent !== undefined ? hasOverride.isPresent : autoPresent,
        salary: hasOverride && hasOverride.customSalary !== undefined ? Number(hasOverride.customSalary) : autoSalary,
        isCustom: !!hasOverride
      };
    }).sort((a, b) => b.salary - a.salary);
  }, [activeDate, dailyRecords, riders, overrides, globalSettings]);

  const dailyTotalPayout = dailyEarnings.reduce((s, r) => s + r.salary, 0);

  // ─── OVERRIDE MODAL ───
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState(null);

  const openOverrideModal = (data) => {
    setOverrideForm({
      riderId: data.riderId,
      riderName: data.riderName,
      isPresent: data.present,
      customSalary: data.salary,
      originalDeliveries: data.deliveries
    });
    setShowOverrideModal(true);
  };

  const saveOverride = async (e) => {
    e.preventDefault();
    try {
      const overrideKey = `${activeDate}_${overrideForm.riderId}`;
      await earningsService.setOverride(overrideKey, {
        date: activeDate,
        riderId: overrideForm.riderId,
        customSalary: Number(overrideForm.customSalary),
        isPresent: overrideForm.isPresent
      });
      toast.success("Saved override for " + overrideForm.riderName);
      setShowOverrideModal(false);
    } catch {
      toast.error("Failed to save override");
    }
  };

  const resetOverride = async () => {
    try {
      const overrideKey = `${activeDate}_${overrideForm.riderId}`;
      await earningsService.deleteOverride(overrideKey);
      toast.success("Reset to automatic calculation.");
      setShowOverrideModal(false);
    } catch {
      toast.error("Failed to reset");
    }
  };


  // ─── MONTHLY SUMMARY DATA CALCULATION ───
  const monthlyEarnings = useMemo(() => {
    if (activeTab !== 'monthly') return [];
    const globalRate = Number(globalSettings.ratePerParcel) || 12;

    const summary = {};
    riders.forEach(r => summary[r.id] = {
      riderName: r.name,
      totalDays: 0,
      totalDeliveries: 0,
      totalSalary: 0,
      riderRate: r.ratePerParcel !== undefined ? Number(r.ratePerParcel) : globalRate
    });

    const [year, month] = activeMonth.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
      const dailyRecord = dailyRecords.find(dr => dr.date === dateStr);
      const allRiderEntries = dailyRecord?.riders || [];

      riders.forEach(r => {
        const riderRate = r.ratePerParcel !== undefined ? Number(r.ratePerParcel) : globalRate;

        // Own entry: riderId matches AND no substitute OR substitute is self
        const ownEntry = allRiderEntries.find(dr =>
          dr.riderId === r.id && (!dr.actualRiderId || dr.actualRiderId === r.id)
        );
        // Substitute entries: this rider actually delivered under someone else's ID
        const subEntries = allRiderEntries.filter(dr =>
          dr.actualRiderId === r.id && dr.riderId !== r.id
        );

        const ownDels = ownEntry
          ? (Number(ownEntry.completedDelivery) || 0) + (Number(ownEntry.completedPickup) || 0)
          : 0;
        const subDels = subEntries.reduce((sum, dr) =>
          sum + (Number(dr.completedDelivery) || 0) + (Number(dr.completedPickup) || 0), 0);
        const tDels = ownDels + subDels;

        let p = tDels > 0;
        let s = tDels * riderRate;

        const ov = overrides.find(o => o.id === `${dateStr}_${r.id}`);
        if (ov) {
          if (ov.isPresent !== undefined) p = ov.isPresent;
          if (ov.customSalary !== undefined) s = Number(ov.customSalary);
        }

        if (p) {
          summary[r.id].totalDays += 1;
          summary[r.id].totalDeliveries += tDels;
          summary[r.id].totalSalary += s;
        }
      });
    }

    return Object.values(summary).sort((a, b) => b.totalSalary - a.totalSalary);
  }, [activeMonth, dailyRecords, riders, overrides, activeTab, globalSettings]);

  const monthlyTotalPayout = monthlyEarnings.reduce((s, r) => s + r.totalSalary, 0);

  // ─── INDIVIDUAL RIDER DATA ───
  const individualData = useMemo(() => {
    if (!selectedRiderId) return null;
    const rider = riders.find(r => r.id === selectedRiderId);
    if (!rider) return null;
    const globalRate = Number(globalSettings.ratePerParcel) || 12;
    const riderRate = rider.ratePerParcel !== undefined ? Number(rider.ratePerParcel) : globalRate;

    const [year, month] = indivMonth.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];

    let totalDays = 0, totalAssigned = 0, totalDelivered = 0, totalSalary = 0, totalSuccess = 0, successCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${month}-${String(d).padStart(2, '0')}`;
      const rec = dailyRecords.find(r => r.date === dateStr);
      const entries = rec?.riders || [];

      // Own entry
      const ownEntry = entries.find(e => e.riderId === selectedRiderId && (!e.actualRiderId || e.actualRiderId === selectedRiderId));
      // Sub entries
      const subEntries = entries.filter(e => e.actualRiderId === selectedRiderId && e.riderId !== selectedRiderId);

      const assignedDel = (Number(ownEntry?.assignedDelivery) || 0) + subEntries.reduce((s, e) => s + (Number(e.assignedDelivery) || 0), 0);
      const assignedPick = (Number(ownEntry?.assignedPickup) || 0) + subEntries.reduce((s, e) => s + (Number(e.assignedPickup) || 0), 0);
      const compDel = (Number(ownEntry?.completedDelivery) || 0) + subEntries.reduce((s, e) => s + (Number(e.completedDelivery) || 0), 0);
      const compPick = (Number(ownEntry?.completedPickup) || 0) + subEntries.reduce((s, e) => s + (Number(e.completedPickup) || 0), 0);

      const assigned = assignedDel + assignedPick;
      const delivered = compDel + compPick;

      let salary = delivered * riderRate;
      let present = delivered > 0;

      const ov = overrides.find(o => o.id === `${dateStr}_${selectedRiderId}`);
      if (ov) {
        if (ov.isPresent !== undefined) present = ov.isPresent;
        if (ov.customSalary !== undefined) salary = Number(ov.customSalary);
      }

      const sr = assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;

      if (present) {
        totalDays++;
        totalAssigned += assigned;
        totalDelivered += delivered;
        totalSalary += salary;
        totalSuccess += sr;
        successCount++;
      }

      days.push({ dateStr, label: `${d}`, assigned, delivered, salary, sr, present });
    }

    const avgSR = successCount > 0 ? Math.round(totalSuccess / successCount) : 0;

    return {
      rider,
      riderRate,
      indivMonth,
      days,
      totalDays,
      totalAssigned,
      totalDelivered,
      totalSalary,
      avgSR
    };
  }, [selectedRiderId, indivMonth, dailyRecords, overrides, riders, globalSettings]);

  // ─── SHARE WHATSAPP ───
  const shareDailyWhatsApp = () => {
    const text = `*Win Express – Earnings Report*\n\nDate: ${activeDate}\n\n*Riders:*\n${dailyEarnings.filter(r => r.present).map(r => `${r.riderName} | Dels: ${r.deliveries} | Sal: ₹${r.salary}`).join('\n')}\n\n*Total Payout:* ₹${dailyTotalPayout}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareMonthlyWhatsApp = () => {
    const text = `*Win Express – Monthly Earnings Report*\n\nMonth: ${activeMonth}\n\n*Riders:*\n${monthlyEarnings.filter(r => r.totalDays > 0).map(r => `${r.riderName} | Days: ${r.totalDays} | Sal: ₹${r.totalSalary}`).join('\n')}\n\n*Total Payout for ${activeMonth}:* ₹${monthlyTotalPayout}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black mb-2 dark:text-white">Earnings Locked</h2>
          <p className="text-gray-500 mb-6 text-sm">Enter the security PIN to access the payroll portal.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="Enter PIN" 
              className="w-full text-center tracking-widest text-2xl font-mono bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-primary"
            />
            <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">
              Unlock Terminal
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <IndianRupee className="text-emerald-500" size={32}/> Operations Payroll
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Attendance and daily salary auto-sync active
          </p>
        </div>
        
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'daily' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
             Daily View
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'monthly' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
             Monthly View
          </button>
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'individual' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            <User size={14}/> Individual
          </button>
        </div>
      </div>

      {activeTab === 'daily' ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-gray-400 uppercase">Select Date</label>
              <input type="date" value={activeDate} onChange={(e) => setActiveDate(e.target.value)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 font-bold text-primary outline-none" />
            </div>
            <button onClick={shareDailyWhatsApp} className="flex gap-2 items-center bg-[#25D366] text-white px-4 py-2 font-bold rounded-xl shadow-lg shadow-[#25D366]/20 transition-transform active:scale-95">
              <Share2 size={16}/> Share Daily Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KPICard title="Total Daily Payout" value={`₹${dailyTotalPayout.toLocaleString()}`} icon={IndianRupee} color="from-emerald-50 to-white dark:from-emerald-900/30" textColor="text-emerald-600" />
            <KPICard title="Riders Present" value={dailyEarnings.filter(r => r.present).length} icon={Users} color="from-blue-50 to-white dark:from-blue-900/30" textColor="text-blue-600" />
            <KPICard title="Total Parsels Processed" value={dailyEarnings.reduce((s,r) => s + r.deliveries, 0)} icon={CheckCircle2} color="from-indigo-50 to-white dark:from-indigo-900/30" textColor="text-indigo-600" />
          </div>

          <div className="bg-white dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
             <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                 <tr>
                   <th className="px-6 py-4">Rider</th>
                   <th className="px-6 py-4 text-center">Status</th>
                   <th className="px-6 py-4 text-center">Deliveries</th>
                   <th className="px-6 py-4 text-center">Rate</th>
                   <th className="px-6 py-4 text-center">Salary</th>
                   <th className="px-6 py-4"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                 {dailyEarnings.map(r => (
                    <tr key={r.riderId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-6 py-4 font-bold dark:text-white">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-2">
                            {r.riderName}
                            {r.isCustom && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">Edited</span>}
                          </span>
                          {r.actedFor?.length > 0 && (
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold w-fit">
                              Sub for: {r.actedFor.join(', ')}
                            </span>
                          )}
                          {r.delegatedTo?.length > 0 && (
                            <span className="text-[10px] bg-rose-100 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold w-fit">
                              ID used by: {r.delegatedTo.join(', ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {r.present ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Present</span> : <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold">Absent</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{r.deliveries}</span>
                          {r.subDeliveries > 0 && (
                            <span className="text-[10px] text-blue-500 font-bold">{r.ownDeliveries} own + {r.subDeliveries} sub</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-black px-2 py-0.5 rounded">₹{r.riderRate}/px</span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-black text-emerald-600 dark:text-emerald-500">
                        ₹{r.salary.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 flex justify-end">
                        <button onClick={() => openOverrideModal(r)} className="p-2 bg-gray-50 hover:bg-primary/10 dark:bg-gray-800 hover:text-primary rounded-lg transition-colors text-gray-400">
                          <Edit2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>
        </>
      ) : activeTab === 'monthly' ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-gray-400 uppercase">Select Month</label>
              <input type="month" value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 font-bold text-primary outline-none" />
            </div>
            <button onClick={shareMonthlyWhatsApp} className="flex gap-2 items-center bg-[#25D366] text-white px-4 py-2 font-bold rounded-xl shadow-lg shadow-[#25D366]/20 transition-transform active:scale-95">
              <Share2 size={16}/> Share Month Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KPICard title="Total Month Payout" value={`₹${monthlyTotalPayout.toLocaleString()}`} icon={IndianRupee} color="from-emerald-50 to-white dark:from-emerald-900/30" textColor="text-emerald-600" />
            <KPICard title="Total Rider Days" value={monthlyEarnings.reduce((s,r) => s + r.totalDays, 0)} icon={Calendar} color="from-blue-50 to-white dark:from-blue-900/30" textColor="text-blue-600" />
            <KPICard title="Month Deliveries" value={monthlyEarnings.reduce((s,r) => s + r.totalDeliveries, 0)} icon={CheckCircle2} color="from-indigo-50 to-white dark:from-indigo-900/30" textColor="text-indigo-600" />
          </div>

          <div className="bg-white dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
             <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                 <tr>
                   <th className="px-6 py-4">Rider</th>
                   <th className="px-6 py-4 text-center">Days Present</th>
                   <th className="px-6 py-4 text-center">Month Deliveries</th>
                   <th className="px-6 py-4 text-center">Total Salary</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                 {monthlyEarnings.map(r => (
                   <tr key={r.riderId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                     <td className="px-6 py-4 font-bold dark:text-white">{r.riderName}</td>
                     <td className="px-6 py-4 text-center font-bold text-gray-700 dark:text-gray-300">{r.totalDays} Days</td>
                     <td className="px-6 py-4 text-center font-mono font-bold text-gray-700 dark:text-gray-300">{r.totalDeliveries}</td>
                     <td className="px-6 py-4 text-center font-mono font-black text-emerald-600 dark:text-emerald-500">₹{r.totalSalary.toLocaleString()}</td>
                   </tr>
                 ))}
                 {monthlyEarnings.length === 0 && (
                   <tr><td colSpan="4" className="p-8 text-center text-gray-500">No earnings data for this month.</td></tr>
                 )}
               </tbody>
             </table>
          </div>
        </>
      ) : (
        /* ─── INDIVIDUAL VIEW ─── */
        <>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-bold text-gray-400 uppercase">Rider</label>
              <select
                value={selectedRiderId}
                onChange={e => setSelectedRiderId(e.target.value)}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 font-bold text-gray-700 dark:text-gray-200 outline-none shadow-sm"
              >
                <option value="">-- Select Rider --</option>
                {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <label className="text-sm font-bold text-gray-400 uppercase">Month</label>
              <input type="month" value={indivMonth} onChange={e => setIndivMonth(e.target.value)}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 font-bold text-primary outline-none" />
            </div>
          </div>

          {!selectedRiderId ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-300 dark:text-gray-700">
              <User size={56} className="mb-4 opacity-30" />
              <p className="font-black uppercase tracking-widest text-sm">Select a rider to view their profile</p>
            </div>
          ) : individualData ? (
            <>
              {/* Rider Profile Header */}
              <div className="bg-gradient-to-br from-indigo-600 to-primary rounded-3xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black">
                    {individualData.rider.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">{individualData.rider.name}</h2>
                    <p className="text-indigo-200 text-sm mt-0.5">{individualData.rider.phone} &nbsp;·&nbsp; ₹{individualData.riderRate}/parcel</p>
                    <p className="text-indigo-200 text-xs mt-0.5">{indivMonth}</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-black">{individualData.totalDays}</p>
                    <p className="text-indigo-200 text-xs uppercase font-bold">Days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black">{individualData.avgSR}%</p>
                    <p className="text-indigo-200 text-xs uppercase font-bold">Avg SR</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black">₹{(individualData.totalSalary/1000).toFixed(1)}k</p>
                    <p className="text-indigo-200 text-xs uppercase font-bold">Earnings</p>
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Days Present"    value={individualData.totalDays}                               icon={Calendar}     color="from-blue-50 to-white dark:from-blue-900/30"    textColor="text-blue-600" />
                <KPICard title="Total Assigned"  value={individualData.totalAssigned}                           icon={FileText}     color="from-slate-50 to-white dark:from-slate-900/30"  textColor="text-slate-600" />
                <KPICard title="Total Delivered" value={individualData.totalDelivered}                          icon={CheckCircle2} color="from-emerald-50 to-white dark:from-emerald-900/30" textColor="text-emerald-600" />
                <KPICard title="Total Earnings"  value={`₹${individualData.totalSalary.toLocaleString()}`}     icon={IndianRupee}  color="from-amber-50 to-white dark:from-amber-900/30"   textColor="text-amber-600" />
              </div>

              {/* Performance Chart */}
              <div className="bg-white dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={18} className="text-primary" />
                  <h3 className="font-black text-gray-800 dark:text-white">Daily Performance</h3>
                  <span className="ml-auto text-[10px] font-bold text-gray-400 uppercase">Assigned vs Delivered</span>
                </div>
                <Bar
                  data={{
                    labels: individualData.days.map(d => d.label),
                    datasets: [
                      {
                        label: 'Assigned',
                        data: individualData.days.map(d => d.assigned),
                        backgroundColor: 'rgba(99,102,241,0.2)',
                        borderColor: 'rgba(99,102,241,0.8)',
                        borderWidth: 1.5,
                        borderRadius: 4,
                      },
                      {
                        label: 'Delivered',
                        data: individualData.days.map(d => d.delivered),
                        backgroundColor: 'rgba(16,185,129,0.7)',
                        borderColor: 'rgba(16,185,129,1)',
                        borderWidth: 1.5,
                        borderRadius: 4,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top', labels: { font: { weight: 'bold' }, padding: 16 } },
                      tooltip: {
                        callbacks: {
                          afterBody: (items) => {
                            const idx = items[0]?.dataIndex;
                            const d = individualData.days[idx];
                            return d ? [`Success Rate: ${d.sr}%`, `Salary: ₹${d.salary}`] : [];
                          }
                        }
                      }
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } }
                    }
                  }}
                />
              </div>

              {/* Daily Breakdown Table */}
              <div className="bg-white dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <h3 className="font-black text-gray-800 dark:text-white">Daily Breakdown — {indivMonth}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 text-center">Assigned</th>
                        <th className="px-6 py-3 text-center">Delivered</th>
                        <th className="px-6 py-3 text-center">Success %</th>
                        <th className="px-6 py-3 text-center">Salary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {individualData.days.filter(d => d.present || d.assigned > 0).map(d => (
                        <tr key={d.dateStr} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="px-6 py-3 font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Calendar size={12} className="text-primary"/>{d.dateStr}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {d.present
                              ? <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">Present</span>
                              : <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-xs font-bold">Absent</span>
                            }
                          </td>
                          <td className="px-6 py-3 text-center font-mono font-bold text-gray-600 dark:text-gray-400">{d.assigned}</td>
                          <td className="px-6 py-3 text-center font-mono font-bold text-emerald-600">{d.delivered}</td>
                          <td className="px-6 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ring-1 ring-inset ${
                              d.sr >= 90 ? 'ring-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10'
                              : d.sr >= 75 ? 'ring-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-500/10'
                              : 'ring-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-500/10'
                            }`}>{d.sr}%</span>
                          </td>
                          <td className="px-6 py-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-500">
                            ₹{d.salary.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {individualData.days.filter(d => d.present || d.assigned > 0).length === 0 && (
                        <tr><td colSpan="6" className="p-8 text-center text-gray-400 font-medium">No activity recorded for this month.</td></tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700">
                      <tr>
                        <td colSpan="2" className="px-6 py-3 font-black text-gray-600 dark:text-gray-300 uppercase text-xs">Total ({individualData.totalDays} days)</td>
                        <td className="px-6 py-3 text-center font-black font-mono text-gray-700 dark:text-gray-300">{individualData.totalAssigned}</td>
                        <td className="px-6 py-3 text-center font-black font-mono text-emerald-600">{individualData.totalDelivered}</td>
                        <td className="px-6 py-3 text-center font-black text-indigo-600">{individualData.avgSR}%</td>
                        <td className="px-6 py-3 text-center font-black font-mono text-emerald-600">₹{individualData.totalSalary.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* OVERRIDE MODAL */}
      {showOverrideModal && overrideForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOverrideModal(false)}/>
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[24px] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-xl font-black">Edit Rider Salary</h3>
              <p className="text-gray-500 text-sm mt-1">{overrideForm.riderName} — {activeDate}</p>
            </div>
            <form onSubmit={saveOverride} className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                 <span className="font-bold text-gray-600 dark:text-gray-300">Auto Deliveries:</span>
                 <span className="font-mono font-black">{overrideForm.originalDeliveries}</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-gray-500">Attendance Status</label>
                <select value={overrideForm.isPresent ? 'yes' : 'no'} onChange={(e) => setOverrideForm({...overrideForm, isPresent: e.target.value === 'yes'})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none font-bold">
                  <option value="yes">Present</option>
                  <option value="no">Absent</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-gray-500">Salary Payout (₹)</label>
                <input type="number" value={overrideForm.customSalary} onChange={e => setOverrideForm({...overrideForm, customSalary: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-primary/20 rounded-xl px-4 py-3 outline-none focus:border-primary font-mono font-bold text-lg" required />
              </div>
              
              <div className="pt-4 flex flex-col gap-2">
                <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">Save Override</button>
                <button type="button" onClick={resetOverride} className="w-full bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-600 font-bold py-3 rounded-xl transition-colors">Reset to Automatic</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
