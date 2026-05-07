import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Truck, CheckCircle2, Clock, IndianRupee,
  PackageCheck, CalendarDays, TrendingUp, ArrowUpRight,
  Share2
} from 'lucide-react';
import { deliveryService } from '../services/deliveryService';
import { expenseService } from '../services/expenseService';
import { earningsService } from '../services/earningsService';
import { useTheme } from '../context/ThemeContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/* ────────────────────────────────────────────
   Animated stat card used for the 2×2 grid
───────────────────────────────────────────── */
const StatCard = ({ title, value, icon: Icon, gradient, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.45, delay, ease: 'easeOut' }}
    whileHover={{ y: -3, transition: { duration: 0.2 } }}
    className="relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between min-h-[110px] cursor-default select-none"
    style={{ background: gradient }}
  >
    {/* Decorative circle */}
    <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
    <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full bg-white/5" />

    <div className="relative z-10 p-2 w-fit rounded-xl bg-white/20 backdrop-blur-sm">
      <Icon className="w-5 h-5 text-white" />
    </div>

    <div className="relative z-10 mt-2">
      <p className="text-xs font-medium text-white/70 uppercase tracking-wider leading-none mb-1">
        {title}
      </p>
      <motion.p
        key={value}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white leading-none"
      >
        {value}
      </motion.p>
    </div>
  </motion.div>
);

/* ────────────────────────────────────────────
   Wide summary card used for the top 2 cards
───────────────────────────────────────────── */
const SummaryCard = ({ title, subtitle, value, icon: Icon, accent, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
    className="relative overflow-hidden rounded-2xl p-5 flex items-center justify-between gap-4 cursor-default select-none dark:bg-[#161b2e] bg-white border border-gray-100 dark:border-white/10 shadow-sm"
  >
    {/* Glow */}
    <div
      className="absolute inset-0 opacity-10 blur-2xl rounded-2xl"
      style={{ background: accent }}
    />

    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="p-2 rounded-xl"
          style={{ background: `${accent}22` }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {title}
        </span>
      </div>
      <motion.p
        key={value}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-3xl font-extrabold text-gray-900 dark:text-white leading-none mt-2"
      >
        {value}
      </motion.p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>

    <div className="relative z-10 flex flex-col items-end gap-1">
      <div
        className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
        style={{ background: `${accent}22`, color: accent }}
      >
        <ArrowUpRight className="w-3 h-3" />
        Live
      </div>
    </div>
  </motion.div>
);

/* ────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function Dashboard() {
  const { theme } = useTheme();
  const [allRecords, setAllRecords] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payouts, setPayouts] = useState([]);

  useEffect(() => {
    // Single subscription to daily_records instead of multiple legacy ones
    const unsubRecords = deliveryService.subscribeToDailyRecords(setAllRecords, 100);
    const unsubExpenses = expenseService.subscribeToExpenses(setExpenses);
    const unsubPayouts = earningsService.subscribeToPayouts(setPayouts);

    return () => {
      unsubRecords();
      unsubExpenses();
      unsubPayouts();
    };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7); // "YYYY-MM"

  /* ──── Summary cards (overall + monthly) ──── */
  const summaryStats = useMemo(() => {
    const overallReceived = allRecords.reduce(
      (acc, e) => acc + (Number(e.receivedDelivery) || 0) + (Number(e.receivedPickup) || 0), 0
    );
    const overallDelivered = allRecords.reduce(
      (acc, e) => acc + (Number(e.totalCompleted) || 0), 0
    );

    const monthlyRecords = allRecords.filter(e => e.date && e.date.startsWith(currentMonth));
    const monthlyReceived = monthlyRecords.reduce(
      (acc, e) => acc + (Number(e.receivedDelivery) || 0) + (Number(e.receivedPickup) || 0), 0
    );
    const monthlyDelivered = monthlyRecords.reduce(
      (acc, e) => acc + (Number(e.totalCompleted) || 0), 0
    );

    return { overallReceived, overallDelivered, monthlyReceived, monthlyDelivered };
  }, [allRecords, currentMonth]);

  /* ──── 2×2 stat cards ──── */
  const stats = useMemo(() => {
    const todayRecord = allRecords.find(r => r.date === today);

    const monthlyExpenses = expenses
      .filter(e => e.date && e.date.startsWith(currentMonth))
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const monthlyPayouts = payouts
      .filter(p => p.date && p.date.startsWith(currentMonth))
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const totalOutflow = monthlyExpenses + monthlyPayouts;

    const received = todayRecord ? (Number(todayRecord.receivedDelivery) || 0) + (Number(todayRecord.receivedPickup) || 0) : 0;
    const delivered = todayRecord ? (Number(todayRecord.totalCompleted) || 0) : 0;
    const pending = todayRecord ? (Number(todayRecord.totalPending) || 0) : 0;

    // P&L Calculation (Approximate)
    // Revenue = Total Delivered * 35 (Assume ₹35 per parcel revenue)
    const monthlyDelivered = allRecords
      .filter(e => e.date && e.date.startsWith(currentMonth))
      .reduce((acc, e) => acc + (Number(e.totalCompleted) || 0), 0);
    const estimatedRevenue = monthlyDelivered * 35;
    const netProfit = estimatedRevenue - totalOutflow;

    return [
      {
        title: 'Today Received',
        value: received.toString(),
        icon: Truck,
        gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
      },
      {
        title: 'Today Delivered',
        value: delivered.toString(),
        icon: CheckCircle2,
        gradient: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
      },
      {
        title: 'Net Profit (Est.)',
        value: `₹${netProfit.toLocaleString('en-IN')}`,
        icon: TrendingUp,
        gradient: netProfit >= 0 
          ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' 
          : 'linear-gradient(135deg, #9f1239 0%, #f43f5e 100%)',
      },
      {
        title: 'Monthly Spending',
        value: `₹${totalOutflow.toLocaleString('en-IN')}`,
        icon: IndianRupee,
        gradient: 'linear-gradient(135deg, #4b5563 0%, #1f2937 100%)',
      },
    ];
  }, [allRecords, expenses, payouts, today, currentMonth]);

  /* ──── Leaderboard logic ──── */
  const leaderboard = useMemo(() => {
    const monthlyRecords = allRecords.filter(r => r.date && r.date.startsWith(currentMonth));
    const riderStats = {};

    monthlyRecords.forEach(record => {
      (record.riders || []).forEach(r => {
        if (!riderStats[r.riderName]) {
          riderStats[r.riderName] = { name: r.riderName, completed: 0, assigned: 0 };
        }
        riderStats[r.riderName].completed += (Number(r.completedDelivery) || 0) + (Number(r.completedPickup) || 0);
        riderStats[r.riderName].assigned += (Number(r.assignedDelivery) || 0) + (Number(r.assignedPickup) || 0);
      });
    });

    return Object.values(riderStats)
      .map(r => ({
        ...r,
        successRate: r.assigned > 0 ? Math.round((r.completed / r.assigned) * 100) : 0
      }))
      .sort((a, b) => b.successRate - a.successRate || b.completed - a.completed)
      .slice(0, 5);
  }, [allRecords, currentMonth]);

  /* ──── Chart data ──── */
  const performanceData = useMemo(() => {
    const todayRecord = allRecords.find(r => r.date === today);
    const riders = todayRecord?.riders || [];

    const labels = riders.map(r => r.riderName || 'Unknown');
    const delivered = riders.map(r => (Number(r.completedDelivery) || 0) + (Number(r.completedPickup) || 0));
    
    return {
      labels: labels.length > 0 ? labels : ['No Activity'],
      datasets: [
        {
          label: 'Delivered',
          data: delivered.length > 0 ? delivered : [0],
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderRadius: 6,
        }
      ],
    };
  }, [allRecords, today]);

  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);

  const shareRiderPerformance = () => {
    const todayRecord = allRecords.find(r => r.date === today);
    if (!todayRecord || !todayRecord.riders || todayRecord.riders.length === 0) {
      alert("No performance data available for today yet.");
      return;
    }

    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const riderLines = todayRecord.riders.map(r => {
      return `• ${r.riderName}: ${r.successRate}%`;
    }).join('\n');

    const text = `*Win Express – Rider Performance*\nDate: ${dateStr}\n\n${riderLines}\n\n*Overall Success Rate: ${todayRecord.successRate || 0}%*`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Operations Hub</h2>
          <p className="text-gray-500 dark:text-gray-400">Monitoring performance and financial health.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Current Date</p>
              <p className="text-sm font-black text-gray-700 dark:text-gray-300">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
           </div>
        </div>
      </motion.div>

      {/* ── Top 2 summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard
          title="Total Deliveries"
          subtitle="Cumulative volume across all time"
          value={summaryStats.overallDelivered.toLocaleString('en-IN')}
          icon={PackageCheck}
          accent="#6366f1"
          delay={0.05}
        />
        <SummaryCard
          title="Revenue (Est. Month)"
          subtitle={`Based on ₹35/parcel for ${new Date().toLocaleDateString('en-US', { month: 'long' })}`}
          value={`₹${(monthlyDelivered * 35).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          accent="#0ea5e9"
          delay={0.1}
        />
      </div>

      {/* ── 2×2 stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <StatCard
            key={i}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            gradient={stat.gradient}
            delay={0.15 + i * 0.07}
          />
        ))}
      </div>

      {/* ── Chart + Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/2">
            <div>
              <CardTitle>Today's Performance Breakdown</CardTitle>
              <p className="text-xs text-gray-400 mt-1">Real-time rider delivery status</p>
            </div>
            <button
               onClick={shareRiderPerformance}
               className="p-2.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all active:scale-95"
               title="Share Performance via WhatsApp"
            >
              <Share2 size={18} />
            </button>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full mt-6">
              <Bar
                data={performanceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280', font: { weight: '600' } },
                    },
                    y: {
                      border: { display: false },
                      grid: {
                        color: theme === 'dark'
                          ? 'rgba(75,85,99,0.1)'
                          : 'rgba(229,231,235,0.4)',
                      },
                      ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' },
                    },
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                       backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                       titleColor: theme === 'dark' ? '#ffffff' : '#1e293b',
                       bodyColor: theme === 'dark' ? '#9ca3af' : '#64748b',
                       borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                       borderWidth: 1,
                       padding: 12,
                       boxPadding: 6,
                       usePointStyle: true,
                    }
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 🏆 Leaderboard Card */}
        <Card className="overflow-hidden border-none shadow-xl shadow-indigo-500/5">
          <CardHeader className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white pb-6">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                 <TrendingUp size={20} />
               </div>
               <div>
                 <CardTitle className="text-white">Top Performers</CardTitle>
                 <p className="text-xs text-indigo-100 mt-0.5">Ranked by Success Rate</p>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 -mt-4 bg-white dark:bg-[#1e253c] rounded-t-3xl relative z-10">
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {leaderboard.map((r, i) => (
                <div
                  key={r.name}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/2 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      i === 0 ? 'bg-yellow-100 text-yellow-600' :
                      i === 1 ? 'bg-slate-100 text-slate-500' :
                      i === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {r.name}
                        {r.successRate >= 95 && (
                          <span className="px-1.5 py-0.5 bg-emerald-500 text-[8px] text-white rounded font-black uppercase">Elite</span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        {r.completed} Completed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black font-mono ${
                      r.successRate >= 90 ? 'text-emerald-500' : 
                      r.successRate >= 80 ? 'text-blue-500' : 
                      'text-rose-500'
                    }`}>
                      {r.successRate}%
                    </p>
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="p-12 text-center">
                  <PackageCheck size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm font-medium">No performance data yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Expenses ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Outflow</CardTitle>
            <p className="text-xs text-gray-400 mt-1">Expenses and Payouts</p>
          </div>
          <CalendarDays className="text-gray-300" size={20} />
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5">
            {recentExpenses.map((expense) => (
              <div
                key={expense.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/2 transition-colors"
              >
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{expense.type}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[150px]">{expense.notes || 'No description'}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-rose-500 dark:text-rose-400 font-mono">₹{expense.amount}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{expense.date}</p>
                </div>
              </div>
            ))}
            {recentExpenses.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm col-span-full">No recent outflow recorded.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
