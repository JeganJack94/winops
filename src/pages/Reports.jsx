import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Download, Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign, 
  Package, PieChart, FileText, Banknote, CheckCircle2, IndianRupee
} from 'lucide-react';
import { deliveryService } from '../services/deliveryService';
import { expenseService } from '../services/expenseService';
import { settingsService } from '../services/settingsService';
import { earningsService } from '../services/earningsService';
import { settlementService } from '../services/settlementService';
import { riderService } from '../services/riderService';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 }
};

export default function Reports() {
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState('This Week');
  const [allRecords, setAllRecords] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [settings, setSettings] = useState({ ratePerParcel: 18 });
  const [settlements, setSettlements] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [trendGranularity, setTrendGranularity] = useState('daily'); // daily, weekly, monthly
  const [activeTab, setActiveTab] = useState('analytics'); // analytics, settlements
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [riders, setRiders] = useState([]);

  useEffect(() => {
    const unsubRecords = deliveryService.subscribeToDailyRecords(setAllRecords, 1000);
    const unsubExpenses = expenseService.subscribeToExpenses(setExpenses, 1000);
    const unsubPayouts = earningsService.subscribeToPayouts(setPayouts);
    const unsubSettings = settingsService.subscribeToSettings(setSettings);
    const unsubSettlements = settlementService.subscribeToSettlements(setSettlements);
    const unsubRiders = riderService.subscribeToRiders(setRiders);
    return () => {
      unsubRecords();
      unsubExpenses();
      unsubPayouts();
      unsubSettings();
      unsubSettlements();
      unsubRiders();
    };
  }, []);

  const filteredData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate;
    let endDate = null;

    switch (dateRange) {
      case 'This Week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        break;
      case 'Last Week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay() - 7);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'This Month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'Last Month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'Current Fortnight':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() <= 15 ? 1 : 16);
        break;
      case 'Last Fortnight':
        if (today.getDate() <= 15) {
          // Last fortnight was H2 of previous month
          startDate = new Date(today.getFullYear(), today.getMonth() - 1, 16);
          endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        } else {
          // Last fortnight was H1 of current month
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth(), 15);
        }
        break;
      default:
        startDate = new Date(0); // All time
    }

    const recordsFilter = (e) => {
      const d = new Date(e.date);
      if (endDate) return d >= startDate && d <= endDate;
      return d >= startDate;
    };

    return {
      records: allRecords.filter(recordsFilter),
      expenses: expenses.filter(recordsFilter),
      payouts: payouts.filter(recordsFilter)
    };
  }, [dateRange, allRecords, expenses, payouts]);

  const metrics = useMemo(() => {
    const totalReceived = filteredData.records.reduce((acc, curr) => 
      acc + (Number(curr.receivedDelivery) || 0) + (Number(curr.receivedPickup) || 0), 0);
    const totalDelivered = filteredData.records.reduce((acc, curr) => acc + (Number(curr.totalCompleted) || 0), 0);
    const totalCollections = filteredData.records.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
    const totalGeneralExp = filteredData.expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalPayouts = filteredData.payouts.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalExp = totalGeneralExp + totalPayouts;
    
    // Revenue is based on parcels delivered
    const totalRevenue = totalDelivered * (Number(settings.ratePerParcel) || 18);
    const netProfit = totalRevenue - totalExp;

    return [
      { 
        label: 'Parcels Received', 
        value: totalReceived.toLocaleString(), 
        icon: Package, 
        color: 'indigo',
        gradient: 'from-indigo-500/10 to-blue-500/10'
      },
      { 
        label: 'Parcels Delivered', 
        value: totalDelivered.toLocaleString(), 
        icon: CheckCircle2, 
        color: 'emerald',
        gradient: 'from-emerald-500/10 to-teal-500/10'
      },
      { 
        label: 'Total Collections', 
        value: `₹${totalCollections.toLocaleString()}`, 
        icon: Banknote, 
        color: 'blue',
        gradient: 'from-blue-500/10 to-indigo-500/10'
      },
      { 
        label: 'Operational Revenue', 
        value: `₹${totalRevenue.toLocaleString()}`, 
        icon: IndianRupee, 
        color: 'emerald',
        gradient: 'from-teal-500/10 to-emerald-500/10'
      },
      { 
        label: 'Total Expenses', 
        value: `₹${totalExp.toLocaleString()}`, 
        icon: TrendingDown, 
        color: 'rose',
        gradient: 'from-rose-500/10 to-orange-500/10'
      },
      { 
        label: 'Net Profit', 
        value: `₹${netProfit.toLocaleString()}`, 
        icon: TrendingUp, 
        color: 'amber',
        gradient: 'from-amber-500/10 to-orange-500/10'
      },
    ];
  }, [filteredData, settings]);

  const trendData = useMemo(() => {
    const rate = Number(settings.ratePerParcel) || 18;
    const now = new Date();
    let lookbackDate = new Date();
    
    // Set appropriate lookback based on granularity to ensure enough data points
    if (trendGranularity === 'daily') {
      lookbackDate.setDate(now.getDate() - 15); // Show at least 15 days
    } else if (trendGranularity === 'weekly') {
      lookbackDate.setDate(now.getDate() - 70); // ~10 weeks
    } else if (trendGranularity === 'fortnightly') {
      lookbackDate.setMonth(now.getMonth() - 4); // ~4 months (8 fortnights)
    } else {
      lookbackDate.setFullYear(now.getFullYear() - 1); // 1 year
    }
    
    const getGroupKey = (dateStr) => {
      const date = new Date(dateStr);
      if (trendGranularity === 'monthly') {
        return {
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          label: date.toLocaleString('default', { month: 'short', year: '2-digit' })
        };
      }
      if (trendGranularity === 'fortnightly') {
        const isH1 = date.getDate() <= 15;
        return {
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${isH1 ? 'H1' : 'H2'}`,
          label: `${date.toLocaleString('default', { month: 'short' })} ${isH1 ? '1H' : '2H'}`
        };
      }
      if (trendGranularity === 'weekly') {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.getTime());
        monday.setDate(diff);
        return {
          key: monday.toISOString().split('T')[0],
          label: monday.toLocaleDateString('default', { day: '2-digit', month: 'short' })
        };
      }
      // Daily
      return {
        key: dateStr,
        label: dateStr.split('-').slice(1).join('/')
      };
    };

    const aggregated = {};
    
    // Filter and aggregate data based on lookback
    allRecords.forEach(curr => {
      if (new Date(curr.date) < lookbackDate) return;
      const { key, label } = getGroupKey(curr.date);
      if (!aggregated[key]) aggregated[key] = { label, revenue: 0, expenses: 0 };
      aggregated[key].revenue += (Number(curr.totalCompleted) || 0) * rate;
    });

    expenses.forEach(exp => {
      if (new Date(exp.date) < lookbackDate) return;
      const { key, label } = getGroupKey(exp.date);
      if (!aggregated[key]) aggregated[key] = { label, revenue: 0, expenses: 0 };
      aggregated[key].expenses += (Number(exp.amount) || 0);
    });

    payouts.forEach(p => {
      if (new Date(p.date) < lookbackDate) return;
      const { key, label } = getGroupKey(p.date);
      if (!aggregated[key]) aggregated[key] = { label, revenue: 0, expenses: 0 };
      aggregated[key].expenses += (Number(p.amount) || 0);
    });

    const sortedKeys = Object.keys(aggregated).sort();
    const labels = sortedKeys.map(k => aggregated[k].label);

    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [
        {
          label: 'Revenue',
          data: sortedKeys.map(k => aggregated[k].revenue),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          borderWidth: 3,
        },
        {
          label: 'Expenses',
          data: sortedKeys.map(k => aggregated[k].expenses),
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#f43f5e',
          borderWidth: 3,
        }
      ]
    };
  }, [allRecords, expenses, payouts, settings, trendGranularity]);

  const fortnightlyComparisonData = useMemo(() => {
    const rate = Number(settings.ratePerParcel) || 18;
    const now = new Date();
    const lookback = new Date();
    lookback.setMonth(now.getMonth() - 5); // 5 months

    const aggregated = {};
    allRecords.forEach(r => {
      const d = new Date(r.date);
      if (d < lookback) return;
      const isH1 = d.getDate() <= 15;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${isH1 ? 'H1' : 'H2'}`;
      const label = `${d.toLocaleString('default', { month: 'short' })} ${isH1 ? '1H' : '2H'}`;
      if (!aggregated[key]) aggregated[key] = { label, delivered: 0 };
      aggregated[key].delivered += (Number(r.totalCompleted) || 0);
    });

    const sortedKeys = Object.keys(aggregated).sort().slice(-8); // Last 8 fortnights
    
    return {
      labels: sortedKeys.map(k => aggregated[k].label),
      datasets: [{
        label: 'Parcels Delivered',
        data: sortedKeys.map(k => aggregated[k].delivered),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: '#8b5cf6',
        borderWidth: 3,
      }]
    };
  }, [allRecords, settings]);

  const settlementList = useMemo(() => {
    const rate = Number(settings.ratePerParcel) || 18;
    const groups = {};

    allRecords.forEach(record => {
      const date = new Date(record.date);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const isFirstHalf = date.getDate() <= 15;
      
      const monthName = date.toLocaleString('default', { month: 'long' });
      const periodKey = `${year}-${String(month + 1).padStart(2, '0')}-${isFirstHalf ? 'H1' : 'H2'}`;
      const periodLabel = `${monthName} ${isFirstHalf ? '1st half' : '2nd half'} ${year}`;

      if (!groups[periodKey]) {
        groups[periodKey] = {
          key: periodKey,
          label: periodLabel,
          assigned: 0,
          delivered: 0,
          amount: 0,
          year,
          month
        };
      }

      groups[periodKey].assigned += (Number(record.receivedDelivery) || 0) + (Number(record.receivedPickup) || 0);
      groups[periodKey].delivered += (Number(record.totalCompleted) || 0);
      groups[periodKey].amount += (Number(record.totalCompleted) || 0) * rate;
    });

    return Object.values(groups)
      .map(group => ({
        ...group,
        successRate: group.assigned > 0 ? Math.round((group.delivered / group.assigned) * 100) : 0
      }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [allRecords, settings]);

  const monthlyData = useMemo(() => {
    const rate = Number(settings.ratePerParcel) || 18;
    const months = {};

    // 1. Process all daily records (Revenue)
    allRecords.forEach(record => {
      if (!record.date) return;
      const monthKey = record.date.substring(0, 7); // 'YYYY-MM'
      if (!months[monthKey]) {
        const dateObj = new Date(record.date);
        const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        months[monthKey] = {
          monthKey,
          label,
          revenue: 0,
          expenses: 0,
          salaries: 0,
          rawExpenses: [],
          rawPayouts: []
        };
      }
      const completed = Number(record.totalCompleted) || 0;
      months[monthKey].revenue += completed * rate;
    });

    // 2. Process all expenses
    expenses.forEach(exp => {
      if (!exp.date) return;
      const monthKey = exp.date.substring(0, 7);
      if (!months[monthKey]) {
        const dateObj = new Date(exp.date);
        const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        months[monthKey] = {
          monthKey,
          label,
          revenue: 0,
          expenses: 0,
          salaries: 0,
          rawExpenses: [],
          rawPayouts: []
        };
      }
      const amt = Number(exp.amount) || 0;
      months[monthKey].expenses += amt;
      months[monthKey].rawExpenses.push(exp);
    });

    // 3. Process all payouts (Salaries)
    payouts.forEach(p => {
      if (!p.date) return;
      const monthKey = p.date.substring(0, 7);
      if (!months[monthKey]) {
        const dateObj = new Date(p.date);
        const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        months[monthKey] = {
          monthKey,
          label,
          revenue: 0,
          expenses: 0,
          salaries: 0,
          rawExpenses: [],
          rawPayouts: []
        };
      }
      const amt = Number(p.amount) || 0;
      months[monthKey].salaries += amt;
      
      const rider = riders.find(r => r.id === p.riderId);
      const riderName = rider ? rider.name : (p.riderName || 'N/A');
      months[monthKey].rawPayouts.push({
        ...p,
        riderName
      });
    });

    // 4. Calculate profit and sort months
    const list = Object.values(months).map(m => {
      m.rawExpenses.sort((a, b) => b.date.localeCompare(a.date));
      m.rawPayouts.sort((a, b) => b.date.localeCompare(a.date));
      return {
        ...m,
        profit: m.revenue - m.expenses - m.salaries
      };
    });

    return list.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [allRecords, expenses, payouts, settings, riders]);

  const monthlyChartData = useMemo(() => {
    const sortedChronological = [...monthlyData].reverse();
    const labels = sortedChronological.map(m => m.label);

    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [
        {
          label: 'Revenue',
          data: sortedChronological.map(m => m.revenue),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 6,
        },
        {
          label: 'Expenses',
          data: sortedChronological.map(m => m.expenses),
          backgroundColor: 'rgba(244, 63, 94, 0.7)',
          borderColor: '#f43f5e',
          borderWidth: 1.5,
          borderRadius: 6,
        },
        {
          label: 'Salaries',
          data: sortedChronological.map(m => m.salaries),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: '#3b82f6',
          borderWidth: 1.5,
          borderRadius: 6,
        },
        {
          label: 'Net Profit',
          data: sortedChronological.map(m => m.profit),
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          borderRadius: 6,
        }
      ]
    };
  }, [monthlyData]);

  const handleUpdateReceived = async (periodKey, amount) => {
    try {
      await settlementService.saveSettlement(periodKey, amount);
    } catch (error) {
      console.error('Failed to update settlement:', error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text('Financial Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
      doc.text(`Timeline: ${dateRange}`, 14, 33);
      
      // Summary Box
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 40, pageWidth - 28, 45, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text('Report Summary', 20, 48);
      
      doc.setFontSize(10);
      metrics.forEach((m, i) => {
        const xPos = 20 + (i % 2) * (pageWidth / 2 - 20);
        const yPos = 56 + Math.floor(i / 2) * 8; // Tighter spacing for 6 metrics
        doc.text(`${m.label}: ${m.value}`, xPos, yPos);
      });

      // Income Details Table
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Performance Details (Rider Breakdown)', 14, 95);
      
      const riderRows = [];
      filteredData.records.forEach(record => {
        (record.riders || []).forEach(r => {
          const completed = (Number(r.completedDelivery) || 0) + (Number(r.completedPickup) || 0);
          const revenue = completed * (Number(settings.ratePerParcel) || 18);
          riderRows.push([
            record.date,
            r.riderName || 'Unknown',
            completed,
            `₹${revenue.toLocaleString()}`,
            `₹${(Number(r.amountCollected) || 0).toLocaleString()}`
          ]);
        });
      });

      autoTable(doc, {
        startY: 100,
        head: [['Date', 'Rider', 'Completed', 'Revenue (P×Rate)', 'Collection']],
        body: riderRows,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 }
      });

      // Expenses Details Table
      const finalY = (doc.lastAutoTable?.finalY || 100) + 15;
      doc.setFontSize(14);
      doc.text('Expense Details', 14, finalY);
      
      const expenseRows = filteredData.expenses.map(e => [
        e.date,
        e.type || 'N/A',
        e.notes || '-',
        `₹${(e.amount || 0).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Date', 'Category', 'Note', 'Amount']],
        body: expenseRows,
        theme: 'striped',
        headStyles: { fillColor: [244, 63, 94] },
        styles: { fontSize: 9 }
      });

      // Salary Advances Detail Table
      const payoutY = (doc.lastAutoTable?.finalY || finalY + 20) + 15;
      doc.setFontSize(14);
      doc.text('Salary Advances / Payouts', 14, payoutY);
      
      const payoutRows = filteredData.payouts.map(p => [
        p.date,
        p.riderName || 'N/A',
        p.type || 'Salary Advance',
        `₹${(p.amount || 0).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: payoutY + 5,
        head: [['Date', 'Rider', 'Type', 'Amount']],
        body: payoutRows,
        theme: 'striped',
        headStyles: { fillColor: [14, 165, 233] },
        styles: { fontSize: 9 }
      });

      doc.save(`WinExpress_Report_${dateRange.replace(' ', '_')}.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMonthlyReport = async (mdata) => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text(`Monthly Financial Report`, 14, 22);
      
      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139);
      doc.text(`${mdata.label}`, 14, 28);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 34);
      
      // Summary Box
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 40, pageWidth - 28, 35, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text('Financial Summary', 20, 48);
      
      doc.setFontSize(10);
      doc.text(`Revenue: ₹${mdata.revenue.toLocaleString()}`, 20, 56);
      doc.text(`Expenses: ₹${mdata.expenses.toLocaleString()}`, 20, 64);
      doc.text(`Salaries/Payouts: ₹${mdata.salaries.toLocaleString()}`, pageWidth / 2 + 10, 56);
      doc.text(`Net Profit: ₹${mdata.profit.toLocaleString()}`, pageWidth / 2 + 10, 64);
      
      // Expenses Table
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Expenses Breakdown', 14, 90);
      
      const expenseRows = mdata.rawExpenses.map(e => [
        e.date,
        e.type || 'N/A',
        e.notes || '-',
        `₹${(e.amount || 0).toLocaleString()}`
      ]);
      
      autoTable(doc, {
        startY: 95,
        head: [['Date', 'Category', 'Note', 'Amount']],
        body: expenseRows,
        theme: 'striped',
        headStyles: { fillColor: [244, 63, 94] },
        styles: { fontSize: 9 }
      });
      
      // Salaries Table
      const finalY = (doc.lastAutoTable?.finalY || 100) + 15;
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Salaries/Payouts Breakdown', 14, finalY);
      
      const payoutRows = mdata.rawPayouts.map(p => [
        p.date,
        p.riderName || 'N/A',
        p.type || 'Salary Advance',
        `₹${(p.amount || 0).toLocaleString()}`
      ]);
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Date', 'Rider', 'Type', 'Amount']],
        body: payoutRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 }
      });
      
      doc.save(`Monthly_Report_${mdata.monthKey}.pdf`);
    } catch (error) {
      console.error('Monthly export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Financial Analytics
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Comprehensive overview of your business performance.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm font-medium text-slate-700 dark:text-slate-200 appearance-none min-w-[160px]"
            >
              <option>This Week</option>
              <option>Last Week</option>
              <option>Current Fortnight</option>
              <option>Last Fortnight</option>
              <option>This Month</option>
              <option>Last Month</option>
              <option>All Time</option>
            </select>
          </div>
          
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 active:scale-95 transition-all h-10 px-6 rounded-xl font-semibold flex items-center gap-2"
          >
            {isExporting ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? 'Exporting...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'analytics' 
              ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'settlements' 
              ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Settlements
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'monthly' 
              ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Monthly Report
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'analytics' ? (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Stats Grid - 3x2 on large screens */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {metrics.map((metric, i) => (
                <motion.div key={i} variants={itemVariants}>
                  <Card className={`relative overflow-hidden border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 group hover:translate-y-[-4px] transition-all duration-300`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${metric.gradient} rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500`} />
                    
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-start justify-between relative z-10">
                        <div className={`p-2.5 rounded-xl bg-slate-500/10 mb-4`}>
                          <metric.icon className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                        </div>
                      </div>
                      
                      <div className="space-y-1 relative z-10">
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {metric.label}
                        </p>
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                          {metric.value}
                        </h3>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            {/* Performance Trends Chart Section */}
            <motion.div variants={itemVariants}>
              <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 overflow-hidden">
                <CardHeader className="border-b border-slate-50 dark:border-slate-700/50 p-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                      Performance Trends
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Visualizing cash flow over the selected period
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                    {['daily', 'weekly', 'fortnightly', 'monthly'].map(g => (
                      <button 
                        key={g}
                        onClick={() => setTrendGranularity(g)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${trendGranularity === g ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-slate-500'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[350px] w-full">
                    <Line 
                      key={`trend-${trendData.labels.join(',')}`}
                      data={trendData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                          mode: 'index',
                          intersect: false,
                        },
                        scales: {
                          x: { 
                            grid: { display: false },
                            ticks: { 
                              color: theme === 'dark' ? '#94a3b8' : '#64748b',
                              font: { family: 'Inter', size: 11 }
                            }
                          },
                          y: { 
                            grid: { 
                              color: theme === 'dark' ? 'rgba(71, 85, 105, 0.1)' : 'rgba(226, 232, 240, 0.8)',
                              drawBorder: false
                            },
                            ticks: { 
                              color: theme === 'dark' ? '#94a3b8' : '#64748b',
                              font: { family: 'Inter', size: 11 },
                              callback: (val) => `₹${val.toLocaleString()}`
                            }
                          }
                        },
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                            titleColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
                            bodyColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
                            borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 12,
                            displayColors: true,
                            usePointStyle: true,
                            boxPadding: 6,
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Fortnightly Volume Chart Section */}
            <motion.div variants={itemVariants}>
              <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 overflow-hidden">
                <CardHeader className="border-b border-slate-50 dark:border-slate-700/50 p-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Package className="h-5 w-5 text-violet-500" />
                      Fortnightly Delivery Volume
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Tracking parcel volume for 1st and 2nd half of each month
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[250px] w-full">
                    <Line 
                      key={`fortnightly-${fortnightlyComparisonData.labels.join(',')}`}
                      data={fortnightlyComparisonData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                            titleColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
                            bodyColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
                            borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 12,
                          }
                        },
                        scales: {
                          x: { 
                            grid: { display: false },
                            ticks: { 
                              color: theme === 'dark' ? '#94a3b8' : '#64748b',
                              font: { family: 'Inter', size: 11 }
                            }
                          },
                          y: { 
                            beginAtZero: true,
                            grid: { color: theme === 'dark' ? 'rgba(71, 85, 105, 0.1)' : 'rgba(226, 232, 240, 0.8)' },
                            ticks: { 
                              color: theme === 'dark' ? '#94a3b8' : '#64748b',
                              font: { family: 'Inter', size: 11 }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Additional Quick Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1 border-none bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-6 rounded-3xl shadow-lg shadow-indigo-600/20">
                <div className="flex flex-col h-full justify-between">
                  <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                    <PieChart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-indigo-100 text-sm font-medium mb-1">Current Focus</h4>
                    <p className="text-xl font-bold leading-tight">Optimizing delivery routes and reducing fuel costs.</p>
                  </div>
                </div>
              </Card>
              
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Busiest Day</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Monday</p>
                    </div>
                 </div>
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Top Area</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Central Hub</p>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'settlements' ? (
          <motion.div
            key="settlements"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-50 dark:border-slate-700/50">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-orange-500" />
                  Bi-Monthly Settlements
                </CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Track payments received from the company for each half-month period.
                </p>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50">
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Period</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Assigned</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Delivered</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Success %</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Amount (Global Rate: ₹{settings.ratePerParcel})</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Received</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {settlementList.map((item) => {
                      const received = settlements[item.key]?.received || 0;
                      const balance = item.amount - received;
                      
                      return (
                        <tr key={item.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-200">{item.label}</td>
                          <td className="px-6 py-5 font-bold text-slate-600 dark:text-slate-400">{item.assigned}</td>
                          <td className="px-6 py-5 font-bold text-emerald-600 dark:text-emerald-400">{item.delivered}</td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden min-w-[60px]">
                                <div 
                                  className={`h-full rounded-full ${item.successRate >= 80 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                  style={{ width: `${item.successRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-500">{item.successRate}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-bold text-slate-900 dark:text-white">₹{item.amount.toLocaleString()}</td>
                          <td className="px-6 py-5">
                            <div className="relative max-w-[150px]">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                              <input 
                                type="number"
                                defaultValue={received || ''}
                                onBlur={(e) => handleUpdateReceived(item.key, e.target.value)}
                                placeholder="0"
                                className="w-full pl-7 pr-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl border-none outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-slate-900 dark:text-white"
                              />
                            </div>
                          </td>
                          <td className={`px-6 py-5 font-black ${balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {balance === 0 ? (
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                Settled
                              </span>
                            ) : balance < 0 ? (
                              `+₹${Math.abs(balance).toLocaleString()}`
                            ) : (
                              `₹${balance.toLocaleString()}`
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {settlementList.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                          No historical data found for settlements
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeTab === 'monthly' ? (
          <motion.div
            key="monthly"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Monthly Variations Chart Card */}
            <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-50 dark:border-slate-700/50">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  Monthly Financial Variations
                </CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Comparing Revenue, Expenses, Salaries, and Net Profit.
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[320px] w-full">
                  <Bar 
                    data={monthlyChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { 
                          position: 'top',
                          labels: { 
                            color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                            font: { family: 'Inter', size: 12, weight: 'bold' }
                          }
                        },
                        tooltip: {
                          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                          titleColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
                          bodyColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
                          borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                          borderWidth: 1,
                          padding: 12,
                          cornerRadius: 12,
                          callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString()}`
                          }
                        }
                      },
                      scales: {
                        x: { 
                          grid: { display: false },
                          ticks: { 
                            color: theme === 'dark' ? '#94a3b8' : '#64748b',
                            font: { family: 'Inter', size: 11, weight: '500' }
                          }
                        },
                        y: { 
                          grid: { color: theme === 'dark' ? 'rgba(71, 85, 105, 0.1)' : 'rgba(226, 232, 240, 0.8)' },
                          ticks: { 
                            color: theme === 'dark' ? '#94a3b8' : '#64748b',
                            font: { family: 'Inter', size: 11 },
                            callback: (val) => `₹${val.toLocaleString()}`
                          }
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Monthly Report Table Card */}
            <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-50 dark:border-slate-700/50">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <PieChart className="h-5 w-5 text-orange-500" />
                  Monthly Report
                </CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Summary of Revenue, Expenses, Salaries, and Net Profit.
                </p>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50">
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Month</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Revenue (A)</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Expenses (B)</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Salaries (C)</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Net Profit (A - B - C)</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {monthlyData.map((item) => {
                      const isSelected = selectedMonth === item.monthKey;
                      return (
                        <tr 
                          key={item.monthKey} 
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer ${
                            isSelected ? 'bg-orange-50/40 dark:bg-orange-500/10' : ''
                          }`}
                          onClick={() => setSelectedMonth(isSelected ? null : item.monthKey)}
                        >
                          <td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-200">
                            {item.label}
                          </td>
                          <td className="px-6 py-5 font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{item.revenue.toLocaleString()}
                          </td>
                          <td className="px-6 py-5 font-bold text-rose-500">
                            ₹{item.expenses.toLocaleString()}
                          </td>
                          <td className="px-6 py-5 font-bold text-blue-500">
                            ₹{item.salaries.toLocaleString()}
                          </td>
                          <td className={`px-6 py-5 font-black text-base ${
                            item.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                          }`}>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              item.profit >= 0 
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'
                            }`}>
                              ₹{item.profit.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                  isSelected 
                                    ? 'bg-orange-600 text-white' 
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-950 hover:text-orange-600'
                                }`}
                                onClick={() => setSelectedMonth(isSelected ? null : item.monthKey)}
                              >
                                {isSelected ? 'Hide Details' : 'View Details'}
                              </button>
                              <button
                                className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-orange-600 hover:text-white text-slate-600 dark:text-slate-200 rounded-xl transition-all shadow-sm active:scale-95"
                                onClick={() => handleExportMonthlyReport(item)}
                                title="Download PDF Report"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {monthlyData.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                          No historical data found for monthly reports
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Selected Month Breakdown Section */}
            <AnimatePresence mode="wait">
              {selectedMonth && (() => {
                const activeMonthData = monthlyData.find(m => m.monthKey === selectedMonth);
                if (!activeMonthData) return null;
                return (
                  <motion.div
                    key={selectedMonth}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                  >
                    {/* Expenses Detail Card */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 overflow-hidden">
                      <CardHeader className="p-6 border-b border-slate-50 dark:border-slate-700/50">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          <TrendingDown className="h-5 w-5 text-rose-500" />
                          Expenses Breakdown ({activeMonthData.label})
                        </CardTitle>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Total Expenses: ₹{activeMonthData.expenses.toLocaleString()}
                        </p>
                      </CardHeader>
                      <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700/50">
                              <th className="px-4 py-3 text-xs font-bold text-slate-400">Date</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-400">Category</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-400">Note</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-400 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {activeMonthData.rawExpenses.map((exp) => (
                              <tr key={exp.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                                  {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 uppercase">
                                    {exp.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                                  {exp.notes || '-'}
                                </td>
                                <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white text-right">
                                  ₹{exp.amount.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                            {activeMonthData.rawExpenses.length === 0 && (
                              <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-xs text-slate-400">
                                  No expenses recorded this month
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>

                    {/* Salaries Detail Card */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 overflow-hidden">
                      <CardHeader className="p-6 border-b border-slate-50 dark:border-slate-700/50">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          <DollarSign className="h-5 w-5 text-blue-500" />
                          Salaries Breakdown ({activeMonthData.label})
                        </CardTitle>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Total Salaries/Payouts: ₹{activeMonthData.salaries.toLocaleString()}
                        </p>
                      </CardHeader>
                      <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700/50">
                              <th className="px-4 py-3 text-xs font-bold text-slate-400">Date</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-400">Rider</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-400">Type</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-400 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {activeMonthData.rawPayouts.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                                  {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </td>
                                <td className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {p.riderName || 'N/A'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 uppercase">
                                    {p.type || 'Salary Advance'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white text-right">
                                  ₹{p.amount.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                            {activeMonthData.rawPayouts.length === 0 && (
                              <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-xs text-slate-400">
                                  No payouts/salaries recorded this month
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
