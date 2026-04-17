import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download, Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign, Package, PieChart, FileText, Banknote, CheckCircle2, IndianRupee } from 'lucide-react';
import { deliveryService } from '../services/deliveryService';
import { expenseService } from '../services/expenseService';
import { settingsService } from '../services/settingsService';
import { earningsService } from '../services/earningsService';
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
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  const [isExporting, setIsExporting] = useState(false);
  const [trendGranularity, setTrendGranularity] = useState('daily'); // daily, weekly, monthly

  useEffect(() => {
    const unsubRecords = deliveryService.subscribeToDailyRecords(setAllRecords);
    const unsubExpenses = expenseService.subscribeToExpenses(setExpenses);
    const unsubPayouts = earningsService.subscribeToPayouts(setPayouts);
    const unsubSettings = settingsService.subscribeToSettings(setSettings);
    return () => {
      unsubRecords();
      unsubExpenses();
      unsubPayouts();
      unsubSettings();
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
    
    // Grouping helper
    const getGroupKey = (dateStr) => {
      const date = new Date(dateStr);
      if (trendGranularity === 'monthly') {
        return date.toLocaleString('default', { month: 'short', year: '2-digit' });
      }
      if (trendGranularity === 'weekly') {
        // Simple week grouping: find the Monday of that week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        return monday.toLocaleDateString('default', { day: '2-digit', month: 'short' });
      }
      return dateStr.split('-').slice(1).join('/'); // MM/DD
    };

    const aggregated = filteredData.records.reduce((acc, curr) => {
      const key = getGroupKey(curr.date);
      if (!acc[key]) acc[key] = { revenue: 0, expenses: 0 };
      acc[key].revenue += (Number(curr.totalCompleted) || 0) * rate;
      return acc;
    }, {});

    filteredData.expenses.forEach(exp => {
      const key = getGroupKey(exp.date);
      if (!aggregated[key]) aggregated[key] = { revenue: 0, expenses: 0 };
      aggregated[key].expenses += (Number(exp.amount) || 0);
    });

    filteredData.payouts.forEach(p => {
      const key = getGroupKey(p.date);
      if (!aggregated[key]) aggregated[key] = { revenue: 0, expenses: 0 };
      aggregated[key].expenses += (Number(p.amount) || 0);
    });

    const labels = Object.keys(aggregated).sort((a, b) => {
      if (trendGranularity === 'daily') return a.localeCompare(b);
      return 0; // Maintain insertion order or better sort if needed
    });

    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [
        {
          label: 'Revenue',
          data: labels.map(l => aggregated[l].revenue),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
        },
        {
          label: 'Expenses',
          data: labels.map(l => aggregated[l].expenses),
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#f43f5e',
        }
      ]
    };
  }, [filteredData, settings, trendGranularity]);

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

      {/* Chart Section */}
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
              {['daily', 'weekly', 'monthly'].map(g => (
                <button 
                  key={g}
                  onClick={() => setTrendGranularity(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${trendGranularity === g ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-slate-500'}`}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                Revenue
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                Expenses
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[350px] w-full">
              <Line 
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
  );
}
