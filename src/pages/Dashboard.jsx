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

  useEffect(() => {
    // Single subscription to daily_records instead of multiple legacy ones
    const unsubRecords = deliveryService.subscribeToDailyRecords(setAllRecords, 100);
    const unsubExpenses = expenseService.subscribeToExpenses(setExpenses);

    return () => {
      unsubRecords();
      unsubExpenses();
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

    const received = todayRecord ? (Number(todayRecord.receivedDelivery) || 0) + (Number(todayRecord.receivedPickup) || 0) : 0;
    const delivered = todayRecord ? (Number(todayRecord.totalCompleted) || 0) : 0;
    const pending = todayRecord ? (Number(todayRecord.totalPending) || 0) : 0;

    return [
      {
        title: 'Today Received',
        value: received.toString(),
        icon: Truck,
        gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
      },
      {
        title: 'Delivered',
        value: delivered.toString(),
        icon: CheckCircle2,
        gradient: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
      },
      {
        title: 'Pending',
        value: Math.max(0, pending).toString(),
        icon: Clock,
        gradient: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)',
      },
      {
        title: 'Monthly Expenses',
        value: `₹${monthlyExpenses.toLocaleString('en-IN')}`,
        icon: IndianRupee,
        gradient: 'linear-gradient(135deg, #9f1239 0%, #f43f5e 100%)',
      },
    ];
  }, [allRecords, expenses, today, currentMonth]);

  /* ──── Chart data ──── */
  const performanceData = useMemo(() => {
    const todayRecord = allRecords.find(r => r.date === today);
    const riders = todayRecord?.riders || [];

    const labels = riders.map(r => r.riderName || 'Unknown');
    const delivered = riders.map(r => (Number(r.completedDelivery) || 0) + (Number(r.completedPickup) || 0));
    const pending = riders.map(r => {
      const totalAssigned = (Number(r.assignedDelivery) || 0) + (Number(r.assignedPickup) || 0);
      const totalCompleted = (Number(r.completedDelivery) || 0) + (Number(r.completedPickup) || 0);
      return Math.max(0, totalAssigned - totalCompleted);
    });

    return {
      labels: labels.length > 0 ? labels : ['No Activity'],
      datasets: [
        {
          label: 'Delivered',
          data: delivered.length > 0 ? delivered : [0],
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderRadius: 6,
        },
        {
          label: 'Pending',
          data: pending.length > 0 ? pending : [0],
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderRadius: 6,
        },
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
          <p className="text-gray-500 dark:text-gray-400">Welcome back, here's what's happening today.</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </motion.div>

      {/* ── Top 2 summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard
          title="Overall Received / Delivered"
          subtitle="Total volume since the beginning"
          value={`${summaryStats.overallReceived.toLocaleString('en-IN')} / ${summaryStats.overallDelivered.toLocaleString('en-IN')}`}
          icon={PackageCheck}
          accent="#6366f1"
          delay={0.05}
        />
        <SummaryCard
          title="Monthly Received / Delivered"
          subtitle={`Volume this month (${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`}
          value={`${summaryStats.monthlyReceived.toLocaleString('en-IN')} / ${summaryStats.monthlyDelivered.toLocaleString('en-IN')}`}
          icon={CalendarDays}
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

      {/* ── Chart + Recent Expenses ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Today's Rider Performance</CardTitle>
            <button
               onClick={shareRiderPerformance}
               className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors cursor-pointer"
               title="Share Performance via WhatsApp"
            >
              <Share2 size={18} />
            </button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <Bar
                data={performanceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      stacked: true,
                      grid: { display: false },
                      ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' },
                    },
                    y: {
                      stacked: true,
                      border: { display: false },
                      grid: {
                        color: theme === 'dark'
                          ? 'rgba(75,85,99,0.2)'
                          : 'rgba(229,231,235,0.5)',
                      },
                      ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' },
                    },
                  },
                  plugins: {
                    legend: {
                      position: 'top',
                      align: 'end',
                      labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        color: theme === 'dark' ? '#d1d5db' : '#374151',
                      },
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{expense.type}</p>
                    <p className="text-sm text-gray-500">{expense.notes}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-rose-500 dark:text-rose-400">₹{expense.amount}</p>
                    <p className="text-xs text-gray-400">{expense.date}</p>
                  </div>
                </div>
              ))}
              {recentExpenses.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">No expenses recorded yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
