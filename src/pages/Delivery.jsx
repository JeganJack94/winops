import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Trash2, MapPin, User, Calendar, Edit2, 
  Truck, CheckCircle2, AlertCircle, X, Save, Share2, History, LayoutDashboard
} from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { deliveryService } from '../services/deliveryService';
import { riderService } from '../services/riderService';

export default function Delivery() {
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'history'
  const [activeDate, setActiveDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [riders, setRiders] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  
  // Local state for the daily summary inputs
  const [hubForm, setHubForm] = useState({ 
    carryForwardDelivery: 0, 
    carryForwardPickup: 0, 
    receivedDelivery: 0, 
    receivedPickup: 0,
    rtoDelivery: 0,
    cancelDelivery: 0
  });

  // Modal States
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [editingRiderIndex, setEditingRiderIndex] = useState(null);
  const [riderForm, setRiderForm] = useState({
    riderId: '',
    riderName: '',
    assignedDelivery: 0,
    assignedPickup: 0,
    completedDelivery: 0,
    completedPickup: 0,
    amountCollected: 0,
    cashAmount: 0,
    upiAmount: 0
  });

  useEffect(() => {
    const unsubRiders = riderService.subscribeToRiders(setRiders);
    const unsubRecords = deliveryService.subscribeToDailyRecords(setAllRecords);

    return () => {
      unsubRiders();
      unsubRecords();
    };
  }, []);

  // Compute Active Record
  const activeRecord = useMemo(() => {
    return allRecords.find(r => r.date === activeDate);
  }, [allRecords, activeDate]);

  // Sync hub form when active record changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeRecord) {
      setHubForm({
        carryForwardDelivery: activeRecord.carryForwardDelivery ?? activeRecord.carryForward ?? 0,
        carryForwardPickup: activeRecord.carryForwardPickup ?? 0,
        receivedDelivery: activeRecord.receivedDelivery ?? activeRecord.received ?? 0,
        receivedPickup: activeRecord.receivedPickup ?? 0,
        rtoDelivery: activeRecord.rtoDelivery ?? 0,
        cancelDelivery: activeRecord.cancelDelivery ?? 0
      });
    } else {
      // Auto carry forward logic from yesterday
      const yesterday = new Date(new Date(activeDate).getTime() - 86400000).toISOString().split('T')[0];
      const yesterdayRecord = allRecords.find(r => r.date === yesterday);
      setHubForm({
        carryForwardDelivery: yesterdayRecord ? (yesterdayRecord.totalPendingDelivery ?? yesterdayRecord.totalPending ?? 0) : 0,
        carryForwardPickup: yesterdayRecord ? (yesterdayRecord.totalPendingPickup ?? 0) : 0,
        receivedDelivery: 0,
        receivedPickup: 0,
        rtoDelivery: 0,
        cancelDelivery: 0
      });
    }
  }, [activeRecord, activeDate, allRecords]);

  // Calculations for KPIs
  const last7Days = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return allRecords
      .filter(r => r.date < todayStr)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 7);
  }, [allRecords]);

  const avgReceived = useMemo(() => {
    if (last7Days.length === 0) return 0;
    const total = last7Days.reduce((sum, r) => {
      const recDel = r.receivedDelivery ?? r.received ?? 0;
      const recPick = r.receivedPickup ?? 0;
      return sum + (Number(recDel) + Number(recPick));
    }, 0);
    return Math.round(total / last7Days.length);
  }, [last7Days]);

  const avgSuccess = useMemo(() => {
    if (last7Days.length === 0) return 0;
    const totalAssigned = last7Days.reduce((sum, r) => sum + (r.totalAssigned || 0), 0);
    const totalCompleted = last7Days.reduce((sum, r) => sum + (r.totalCompleted || 0), 0);
    if (totalAssigned === 0) return 0;
    return Math.round((totalCompleted / totalAssigned) * 100);
  }, [last7Days]);

  const totalParcelsDelivery = Math.max(0, (Number(hubForm.carryForwardDelivery) || 0) + (Number(hubForm.receivedDelivery) || 0) - (Number(hubForm.rtoDelivery) || 0) - (Number(hubForm.cancelDelivery) || 0));
  const totalParcelsPickup = (Number(hubForm.carryForwardPickup) || 0) + (Number(hubForm.receivedPickup) || 0);
  const totalParcels = totalParcelsDelivery + totalParcelsPickup;

  // Active Record Calculated Overalls
  const currentRiders = activeRecord?.riders || [];
  
  const totalAssignedDelivery = currentRiders.reduce((sum, r) => sum + Number(r.assignedDelivery), 0);
  const totalAssignedPickup = currentRiders.reduce((sum, r) => sum + Number(r.assignedPickup), 0);
  const totalAssigned = totalAssignedDelivery + totalAssignedPickup;

  const totalCompletedDelivery = currentRiders.reduce((sum, r) => sum + Number(r.completedDelivery), 0);
  const totalCompletedPickup = currentRiders.reduce((sum, r) => sum + Number(r.completedPickup), 0);
  const totalCompleted = totalCompletedDelivery + totalCompletedPickup;

  const totalAmountCollected = currentRiders.reduce((sum, r) => sum + Number(r.amountCollected || 0), 0);
  const totalCashCollected = currentRiders.reduce((sum, r) => sum + Number(r.cashAmount || 0), 0);
  const totalUpiCollected = currentRiders.reduce((sum, r) => sum + Number(r.upiAmount || 0), 0);
  const overallSuccessRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
  
  // Also calculate total pending parcels including the ones NOT assigned
  const pendingDelivery = totalParcelsDelivery - totalCompletedDelivery;
  const pendingPickup = totalParcelsPickup - totalCompletedPickup;
  const overallCalculatedPending = pendingDelivery + pendingPickup;

  // Handlers
  const handleSaveHub = async () => {
    const data = {
      date: activeDate,
      carryForwardDelivery: Number(hubForm.carryForwardDelivery),
      carryForwardPickup: Number(hubForm.carryForwardPickup),
      rtoDelivery: Number(hubForm.rtoDelivery),
      cancelDelivery: Number(hubForm.cancelDelivery),
      receivedDelivery: Number(hubForm.receivedDelivery),
      receivedPickup: Number(hubForm.receivedPickup),
      totalDelivery: totalParcelsDelivery,
      totalPickup: totalParcelsPickup,
      total: totalParcels,
      totalAssigned,
      totalPending: overallCalculatedPending,
      totalAmount: totalAmountCollected,
      totalCash: totalCashCollected,
      totalUpi: totalUpiCollected,
      successRate: overallSuccessRate,
      riders: currentRiders
    };

    try {
      if (activeRecord) {
        await deliveryService.updateDailyRecord(activeRecord.id, data);
        toast.success("Daily Hub updated!");
      } else {
        await deliveryService.addDailyRecord(data);
        toast.success("Daily Hub saved!");
      }
    } catch {
      toast.error("Failed to save.");
    }
  };

  const handleRiderSubmit = async (e) => {
    e.preventDefault();
    const assignedDel = Number(riderForm.assignedDelivery);
    const assignedPick = Number(riderForm.assignedPickup);
    const compDel = Number(riderForm.completedDelivery);
    const compPick = Number(riderForm.completedPickup);
    const totalAss = assignedDel + assignedPick;
    const totalComp = compDel + compPick;
    const cash = Number(riderForm.cashAmount || 0);
    const upi = Number(riderForm.upiAmount || 0);
    const totalColl = cash + upi;
    
    const riderEntry = {
      ...riderForm,
      assignedDelivery: assignedDel,
      assignedPickup: assignedPick,
      completedDelivery: compDel,
      completedPickup: compPick,
      cashAmount: cash,
      upiAmount: upi,
      amountCollected: totalColl,
      failed: Math.max(0, totalAss - totalComp),
      successRate: totalAss > 0 ? Math.round((totalComp / totalAss) * 100) : 0
    };

    let updatedRiders = [...currentRiders];
    if (editingRiderIndex !== null) {
      updatedRiders[editingRiderIndex] = riderEntry;
    } else {
      updatedRiders.push(riderEntry);
    }

    // Calc new totals
    const newAssigned = updatedRiders.reduce((sum, r) => sum + r.assignedDelivery + r.assignedPickup, 0);
    const newCompleted = updatedRiders.reduce((sum, r) => sum + r.completedDelivery + r.completedPickup, 0);
    const newAmount = updatedRiders.reduce((sum, r) => sum + r.amountCollected, 0);

    const recordData = {
      date: activeDate,
      carryForwardDelivery: Number(hubForm.carryForwardDelivery),
      carryForwardPickup: Number(hubForm.carryForwardPickup),
      receivedDelivery: Number(hubForm.receivedDelivery),
      receivedPickup: Number(hubForm.receivedPickup),
      totalDelivery: totalParcelsDelivery,
      totalPickup: totalParcelsPickup,
      total: totalParcels,
      totalAssigned: newAssigned,
      totalCompleted: newCompleted,
      totalPendingDelivery: totalParcelsDelivery - updatedRiders.reduce((s, r)=>s+r.completedDelivery, 0),
      totalPendingPickup: totalParcelsPickup - updatedRiders.reduce((s, r)=>s+r.completedPickup, 0),
      totalPending: totalParcels - newCompleted,
      totalAmount: newAmount,
      successRate: newAssigned > 0 ? Math.round((newCompleted / newAssigned) * 100) : 0,
      riders: updatedRiders
    };

    try {
      if (activeRecord) {
        await deliveryService.updateDailyRecord(activeRecord.id, recordData);
      } else {
        await deliveryService.addDailyRecord(recordData);
      }
      toast.success(editingRiderIndex !== null ? "Rider updated" : "Rider assigned");
      closeRiderModal();
    } catch (err) {
      console.error("Firestore Error:", err);
      toast.error(`Failed to save rider entry: ${err.message || "Unknown error"}`);
    }
  };

  const deleteRider = async (index) => {
    if (!window.confirm("Remove this rider entry?")) return;
    let updatedRiders = [...currentRiders];
    updatedRiders.splice(index, 1);
    
    const newAssigned = updatedRiders.reduce((sum, r) => sum + r.assignedDelivery + r.assignedPickup, 0);
    const newCompleted = updatedRiders.reduce((sum, r) => sum + r.completedDelivery + r.completedPickup, 0);
    const newAmount = updatedRiders.reduce((sum, r) => sum + r.amountCollected, 0);

    const recordData = {
      ...activeRecord,
      totalAssigned: newAssigned,
      totalCompleted: newCompleted,
      totalPendingDelivery: totalParcelsDelivery - updatedRiders.reduce((s, r)=>s+r.completedDelivery, 0),
      totalPendingPickup: totalParcelsPickup - updatedRiders.reduce((s, r)=>s+r.completedPickup, 0),
      totalPending: totalParcels - newCompleted,
      totalAmount: newAmount,
      successRate: newAssigned > 0 ? Math.round((newCompleted / newAssigned) * 100) : 0,
      riders: updatedRiders
    };

    try {
      await deliveryService.updateDailyRecord(activeRecord.id, recordData);
      toast.success("Rider entry removed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove rider");
    }
  };

  const editRider = (rider, index) => {
    setRiderForm({ ...rider });
    setEditingRiderIndex(index);
    setShowRiderModal(true);
  };

  const closeRiderModal = () => {
    setRiderForm({
      riderId: '',
      riderName: '',
      completedPickup: 0,
      amountCollected: 0,
      cashAmount: 0,
      upiAmount: 0
    });
    setEditingRiderIndex(null);
    setShowRiderModal(false);
  };

  const shareWhatsApp = () => {
    const dateStr = new Date(activeDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const totalAssignedValue = (Number(totalAssignedDelivery) || 0) + (Number(totalAssignedPickup) || 0);
    const totalCompletedValue = (Number(totalCompletedDelivery) || 0) + (Number(totalCompletedPickup) || 0);
    const totalPending = (Number(pendingDelivery) || 0) + (Number(pendingPickup) || 0);

    // Format riders into a clean table
    const tableHeader = `*RIDER*      | *ASS* | *CMP* | *SR%*`;
    const separator = `----------------------------`;
    
    const ridersList = currentRiders.map(r => {
      const assigned = (Number(r.assignedDelivery) || 0) + (Number(r.assignedPickup) || 0);
      const completed = (Number(r.completedDelivery) || 0) + (Number(r.completedPickup) || 0);
      
      // Pad name for semi-alignment (works best on most common fonts)
      const name = r.riderName.length > 10 ? r.riderName.substring(0, 9) + '.' : r.riderName.padEnd(10);
      return `${name} | ${String(assigned).padStart(3)} | ${String(completed).padStart(3)} | ${r.successRate}%`;
    }).join('\n');

    // Hub Header
    const header = `*Win Express – Daily Report*\nDate: ${dateStr}\n`;
    
    // Performance Summary
    const summary = `----------------------------\n*OVERALL SUMMARY*:\n----------------------------\n📦 Total Assigned: ${totalAssignedValue}\n✅ Total Completed: ${totalCompletedValue}\n⏳ Total Pending: ${totalPending}\n💰 Cash: ₹${totalCashCollected.toLocaleString()}\n💳 UPI: ₹${totalUpiCollected.toLocaleString()}\n💎 Total Collection: ₹${totalAmountCollected.toLocaleString()}\n🎯 Success Rate: ${overallSuccessRate}%\n----------------------------`;

    const text = `${header}\n${tableHeader}\n${separator}\n${ridersList}\n\n${summary}`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Delivery Operations
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            Control Dashboard for <input type="date" value={activeDate} onChange={(e) => {setActiveDate(e.target.value); setActiveTab('daily');}} className="bg-transparent border-b border-gray-300 dark:border-gray-700 outline-none font-bold text-primary cursor-pointer"/>
          </p>
        </div>
        
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'daily' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'history' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            <History size={16} /> History
          </button>
        </div>
      </div>

      {activeTab === 'daily' ? (
        <>
          {/* 1. KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KPICard title="Total Parcels" value={totalParcels} color="from-indigo-50 to-white dark:from-indigo-900/30 dark:to-transparent" textColor="text-indigo-600 dark:text-indigo-400" />
            <KPICard title="Carry Forward" value={(Number(hubForm.carryForwardDelivery)||0) + (Number(hubForm.carryForwardPickup)||0)} color="from-rose-50 to-white dark:from-rose-900/30 dark:to-transparent" textColor="text-rose-600 dark:text-rose-400" />
            <KPICard title="Received Today" value={(Number(hubForm.receivedDelivery)||0) + (Number(hubForm.receivedPickup)||0)} color="from-emerald-50 to-white dark:from-emerald-900/30 dark:to-transparent" textColor="text-emerald-600 dark:text-emerald-400" />
            <KPICard title="Avg Received (7d)" value={avgReceived} color="from-blue-50 to-white dark:from-blue-900/30 dark:to-transparent" textColor="text-blue-600 dark:text-blue-400" />
            <KPICard title="Avg Success % (7d)" value={`${avgSuccess}%`} color="from-amber-50 to-white dark:from-amber-900/30 dark:to-transparent" textColor="text-amber-600 dark:text-amber-400" />
          </div>

          {/* 2. DAILY HUB SUMMARY (Small compact layout) */}
          <div className="bg-white dark:bg-gray-900/40 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col xl:flex-row gap-4 xl:items-end justify-between">
            <div className="flex flex-wrap gap-4 items-center flex-1">
              <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap min-w-[140px]">
                <Calendar size={16} className="text-primary"/> Hub Input
              </h3>
              
              <div className="flex flex-wrap gap-4">
                <InputColumn label="CF (Del)" val={hubForm.carryForwardDelivery} onChange={v => setHubForm({...hubForm, carryForwardDelivery: v})} />
                <InputColumn label="RTO" val={hubForm.rtoDelivery} onChange={v => setHubForm({...hubForm, rtoDelivery: v})} />
                <InputColumn label="Cancel" val={hubForm.cancelDelivery} onChange={v => setHubForm({...hubForm, cancelDelivery: v})} />
                <InputColumn label="Rec (Del)" val={hubForm.receivedDelivery} onChange={v => setHubForm({...hubForm, receivedDelivery: v})} />
                <InputColumn label="CF (Pick)" val={hubForm.carryForwardPickup} onChange={v => setHubForm({...hubForm, carryForwardPickup: v})} />
                <InputColumn label="Rec (Pick)" val={hubForm.receivedPickup} onChange={v => setHubForm({...hubForm, receivedPickup: v})} />
              </div>

              <div className="flex gap-4 items-center ml-2 border-l border-gray-200 dark:border-gray-700 pl-4">
                <FooterStat label="Total Del" value={totalParcelsDelivery} valueColor="text-gray-700 dark:text-gray-300" />
                <FooterStat label="Total Pick" value={totalParcelsPickup} valueColor="text-gray-700 dark:text-gray-300" />
              </div>
            </div>

            <div className="flex gap-2 min-w-max">
              <button onClick={handleSaveHub} className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 xl:py-2 rounded-xl font-bold transition-all active:scale-[0.98] shadow-sm text-sm">
                 <Save size={16}/> Save Hub
              </button>
              {activeRecord && currentRiders.length > 0 && (
                 <button onClick={shareWhatsApp} className="flex-none flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white px-4 py-2.5 xl:py-2 rounded-xl font-bold transition-all active:scale-[0.98] shadow-sm text-sm">
                    <Share2 size={16}/> 
                 </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            
            {/* 4. RIDER PERFORMANCE & 5. OVERALL SUMMARY */}
            <div className="bg-white dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden flex flex-col">
              
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="font-black text-gray-900 dark:text-white">Rider PerformanceMetrics</h3>
                <button onClick={() => setShowRiderModal(true)} className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg font-bold transition-all text-sm">
                  <Plus size={16}/> Add Rider Role
                </button>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500">
                      <th className="px-5 py-4">Rider</th>
                      <th className="px-5 py-4 text-center">Assigned (D/P)</th>
                      <th className="px-5 py-4 text-center">Completed (D/P)</th>
                      <th className="px-5 py-4 text-center">Failed</th>
                      <th className="px-5 py-4 text-center">Collection</th>
                      <th className="px-5 py-4 text-center">Ratio</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {currentRiders.length === 0 ? (
                       <tr><td colSpan="6" className="py-12 text-center text-gray-400 font-medium">No riders assigned for this date.</td></tr>
                    ) : currentRiders.map((r, i) => {
                      const tAssigned = Number(r.assignedDelivery) + Number(r.assignedPickup);
                      const tCompleted = Number(r.completedDelivery) + Number(r.completedPickup);
                      const tFailed = r.failed;
                      const ratio = r.successRate;
                      let ringColor = 'ring-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-500/10';
                      if (ratio >= 90) ringColor = 'ring-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10';
                      else if (ratio >= 80) ringColor = 'ring-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-500/10';

                      return (
                        <tr key={i} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">{r.riderName}</td>
                          <td className="px-5 py-4 text-center font-mono font-medium">
                            {r.assignedDelivery} <span className="text-gray-300 dark:text-gray-600">/</span> {r.assignedPickup}
                          </td>
                          <td className="px-5 py-4 text-center font-mono font-bold text-emerald-600">
                            {r.completedDelivery} <span className="text-emerald-300 dark:text-emerald-800">/</span> {r.completedPickup}
                          </td>
                          <td className="px-5 py-4 text-center font-mono font-bold text-rose-500">{tFailed}</td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-mono font-black text-emerald-600">₹{r.amountCollected || 0}</span>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[9px] font-bold text-gray-400 capitalize">C: {r.cashAmount || 0}</span>
                                <span className="text-[9px] font-bold text-gray-400 capitalize">U: {r.upiAmount || 0}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2 py-1 rounded-md text-[11px] font-black ring-1 ring-inset ${ringColor}`}>
                              {ratio}%
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => editRider(r, i)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg">
                                <Edit2 size={14}/>
                              </button>
                              <button onClick={() => deleteRider(i)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                                <Trash2 size={14}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* OVERALL SUMMARY FOOTER */}
              <div className="bg-gray-100 dark:bg-gray-800 p-5 mt-auto grid grid-cols-2 md:grid-cols-5 gap-4">
                <FooterStat label="Assignments (D/P)" value={`${totalAssignedDelivery}/${totalAssignedPickup}`} />
                <FooterStat label="Completed (D/P)" value={`${totalCompletedDelivery}/${totalCompletedPickup}`} />
                <FooterStat label="Pending (D/P)" value={`${pendingDelivery}/${pendingPickup}`} />
                <div className="flex flex-col justify-center border-l border-gray-200 dark:border-gray-800 pl-4">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Collection</p>
                  <p className="text-lg font-black text-emerald-600 tabular-nums">₹{totalAmountCollected.toLocaleString()}</p>
                  <div className="flex gap-2 text-[9px] font-bold text-gray-500">
                    <span>C: ₹{totalCashCollected.toLocaleString()}</span>
                    <span>U: ₹{totalUpiCollected.toLocaleString()}</span>
                  </div>
                </div>
                <FooterStat label="Success %" value={`${overallSuccessRate}%`} valueColor={overallSuccessRate >= 90 ? 'text-emerald-600' : overallSuccessRate >= 80 ? 'text-amber-500' : 'text-rose-500'} />
              </div>

            </div>
          </div>
        </>
      ) : (
        /* 6. HISTORY VIEW */
        <div className="bg-white dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full border-collapse text-sm">
               <thead>
                 <tr className="bg-gray-50 dark:bg-gray-800 uppercase text-[11px] tracking-wider text-gray-500 font-bold border-b border-gray-200 dark:border-gray-700 text-left">
                   <th className="px-6 py-4">Date</th>
                   <th className="px-6 py-4">Assigned</th>
                   <th className="px-6 py-4">Completed</th>
                   <th className="px-6 py-4">Pending</th>
                   <th className="px-6 py-4">Collection</th>
                   <th className="px-6 py-4">Success Rate</th>
                   <th className="px-6 py-4"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                 {allRecords.map(r => (
                   <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                     <td className="px-6 py-4 font-bold flex items-center gap-2">
                       <Calendar size={14} className="text-primary"/> {r.date}
                     </td>
                     <td className="px-6 py-4 font-mono font-medium">{r.totalAssigned || 0}</td>
                     <td className="px-6 py-4 font-mono font-bold text-emerald-600">{r.totalCompleted || 0}</td>
                     <td className="px-6 py-4 font-mono font-bold text-rose-500">{r.totalPending || 0}</td>
                     <td className="px-6 py-4 font-bold text-primary">₹{(r.totalAmount || 0).toLocaleString()}</td>
                     <td className="px-6 py-4 font-bold text-blue-600">{r.successRate || 0}%</td>
                     <td className="px-6 py-4 text-right">
                       <button onClick={() => { setActiveDate(r.date); setActiveTab('daily'); }} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20">
                         View Details
                       </button>
                     </td>
                   </tr>
                 ))}
                 {allRecords.length === 0 && (
                   <tr><td colSpan="7" className="p-8 text-center text-gray-400">No records found.</td></tr>
                 )}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* 3. RIDER MODAL */}
      <AnimatePresence>
        {showRiderModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeRiderModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[24px] shadow-2xl overflow-hidden border border-white/10 dark:border-gray-800">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="text-xl font-black">{editingRiderIndex !== null ? 'Update Rider' : 'Assign Rider'}</h3>
                <button onClick={closeRiderModal} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"><X size={16}/></button>
              </div>
              <form onSubmit={handleRiderSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-500">Select Rider</label>
                  <select 
                     className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none"
                     required
                     value={riderForm.riderId}
                     onChange={(e) => {
                       const sel = riders.find(r => r.id === e.target.value);
                       setRiderForm({...riderForm, riderId: e.target.value, riderName: sel?.name || ''});
                     }}
                  >
                    <option value="">-- Choose Rider --</option>
                    {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <h4 className="text-xs font-black text-blue-800 dark:text-blue-400 mb-3 uppercase flex items-center gap-1"><Truck size={12}/> Assigned</h4>
                    <div className="space-y-3">
                       <InputRow label="Delivery" val={riderForm.assignedDelivery} onChange={v => setRiderForm({...riderForm, assignedDelivery: v})} />
                       <InputRow label="Pickup" val={riderForm.assignedPickup} onChange={v => setRiderForm({...riderForm, assignedPickup: v})} />
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400 mb-3 uppercase flex items-center gap-1"><CheckCircle2 size={12}/> Completed</h4>
                    <div className="space-y-3">
                       <InputRow label="Delivery" val={riderForm.completedDelivery} onChange={v => setRiderForm({...riderForm, completedDelivery: v})} />
                       <InputRow label="Pickup" val={riderForm.completedPickup} onChange={v => setRiderForm({...riderForm, completedPickup: v})} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-500">Cash Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                      <input 
                        type="number" 
                        value={riderForm.cashAmount}
                        onChange={e => setRiderForm({...riderForm, cashAmount: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-6 pr-3 py-2.5 outline-none font-mono font-bold text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-500">UPI Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                      <input 
                        type="number" 
                        value={riderForm.upiAmount}
                        onChange={e => setRiderForm({...riderForm, upiAmount: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-6 pr-3 py-2.5 outline-none font-mono font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center mt-2">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Total to Collect:</span>
                  <span className="text-xl font-black text-emerald-600 tabular-nums">
                    ₹{(Number(riderForm.cashAmount || 0) + Number(riderForm.upiAmount || 0)).toLocaleString()}
                  </span>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex items-center justify-between mt-4">
                  <span className="text-xs font-bold text-gray-500">Auto Calc Failed:</span>
                  <span className="font-mono font-black text-rose-500">
                    {Math.max(0, (Number(riderForm.assignedDelivery) + Number(riderForm.assignedPickup)) - (Number(riderForm.completedDelivery) + Number(riderForm.completedPickup)))}
                  </span>
                </div>

                <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-black mt-4 shadow-lg shadow-primary/30 transition-all active:scale-[0.98]">
                  {editingRiderIndex !== null ? 'Save Changes' : 'Assign Rider'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

/* ─── Helpert UI Components ─── */
function KPICard({ title, value, color, textColor }) {
  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${color} border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className={`text-2xl font-black ${textColor} tabular-nums`}>{value}</p>
    </div>
  );
}

function InputRow({ label, val, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{label}</span>
      <input 
        type="number" 
        value={val} 
        onChange={e => onChange(e.target.value)} 
        className="w-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-center font-mono text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function FooterStat({ label, value, valueColor = 'text-gray-900 dark:text-white' }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">{label}</p>
      <p className={`text-xl font-black tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}

function InputColumn({ label, val, onChange }) {
  return (
    <div className="flex flex-col gap-1 w-[70px]">
      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">{label}</label>
      <input 
        type="number" 
        value={val} 
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 outline-none focus:border-primary font-mono font-bold text-sm text-center shadow-inner"
      />
    </div>
  );
}
