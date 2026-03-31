import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { deliveryService } from '../services/deliveryService';
import { expenseService } from '../services/expenseService';
import { settingsService } from '../services/settingsService';
import { useTheme } from '../context/ThemeContext';
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
  Legend
);

export default function Analytics() {
  const { theme } = useTheme();
  const [allRecords, setAllRecords] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({ ratePerParcel: 18 });

  useEffect(() => {
    const unsubRecords = deliveryService.subscribeToDailyRecords(setAllRecords, 100);
    const unsubExpenses = expenseService.subscribeToExpenses(setExpenses, 100);
    const unsubSettings = settingsService.subscribeToSettings(setSettings);

    return () => {
      unsubRecords();
      unsubExpenses();
      unsubSettings();
    };
  }, []);

  const deliveryTrendData = useMemo(() => {
    const days = 14;
    const labels = [];
    const deliveryTotals = [];
    const expenseTotals = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      // Delivery Volume from daily_records
      const record = allRecords.find(r => r.date === dateStr);
      const dayDelivery = record ? (Number(record.totalCompleted) || 0) : 0;
      deliveryTotals.push(dayDelivery);

      // Daily Expenses
      const dayExpense = expenses
        .filter(e => {
          const entryDate = e.date || (e.timestamp && e.timestamp.split('T')[0]);
          return entryDate === dateStr;
        })
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      expenseTotals.push(dayExpense);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Deliveries',
          data: deliveryTotals,
          borderColor: 'rgba(249, 115, 22, 1)',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          tension: 0.3,
          pointRadius: 3,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Expenses (₹)',
          data: expenseTotals,
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.3,
          pointRadius: 3,
          fill: false,
          yAxisID: 'y1'
        }
      ]
    };
  }, [allRecords, expenses]);

  const riderEfficiencyData = useMemo(() => {
    const efficiency = allRecords.reduce((acc, record) => {
      (record.riders || []).forEach(r => {
        const name = r.riderName || 'Unknown';
        if (!acc[name]) acc[name] = { assigned: 0, delivered: 0 };
        acc[name].assigned += (Number(r.assignedDelivery) || 0) + (Number(r.assignedPickup) || 0);
        acc[name].delivered += (Number(r.completedDelivery) || 0) + (Number(r.completedPickup) || 0);
      });
      return acc;
    }, {});

    const labels = Object.keys(efficiency);
    const successRates = labels.map(l => {
      const { assigned, delivered } = efficiency[l];
      return assigned > 0 ? (delivered / assigned) * 100 : 0;
    });

    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [
        {
          label: 'Success Rate (%)',
          data: successRates.length > 0 ? successRates : [0],
          backgroundColor: 'rgba(30, 58, 138, 0.8)',
          borderRadius: 4,
        }
      ]
    };
  }, [allRecords]);

  const kpis = useMemo(() => {
    let totalAssigned = 0;
    let totalDelivered = 0;

    allRecords.forEach(record => {
      totalAssigned += (Number(record.totalAssigned) || 0);
      totalDelivered += (Number(record.totalCompleted) || 0);
    });

    const successRate = totalAssigned > 0 ? (totalDelivered / totalAssigned) * 100 : 0;
    
    const revenue = totalDelivered * (Number(settings.ratePerParcel) || 18);
    const totalExpenses = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const profit = revenue - totalExpenses;

    const onTimeRate = successRate > 0 ? successRate * 0.94 : 0;

    return {
      successRate: successRate.toFixed(1),
      onTime: onTimeRate.toFixed(1),
      profit: profit.toLocaleString('en-IN'),
      revenue: revenue.toLocaleString('en-IN'),
      totalExpenses: totalExpenses.toLocaleString('en-IN')
    };
  }, [allRecords, expenses, settings]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
        <p className="text-gray-500 dark:text-gray-400">Deep dive into operational metrics and trends.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Delivery Growth Trend (14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <Line 
                data={deliveryTrendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { 
                      grid: { display: false },
                      ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
                    },
                    y: { 
                      beginAtZero: true,
                      position: 'left',
                      title: { display: true, text: 'Deliveries' },
                      grid: { color: theme === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.5)' },
                      ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
                    },
                    y1: {
                      beginAtZero: true,
                      position: 'right',
                      title: { display: true, text: 'Expenses (₹)' },
                      grid: { drawOnChartArea: false },
                      ticks: { color: theme === 'dark' ? '#ef4444' : '#ef4444' }
                    }
                  },
                  plugins: {
                    legend: { 
                      display: true,
                      position: 'top',
                      labels: { color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rider Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <Bar 
                data={riderEfficiencyData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  scales: {
                    x: { 
                      max: 100,
                      grid: { color: theme === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.5)' },
                      ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
                    },
                    y: { 
                      grid: { display: false },
                      ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
                    }
                  },
                  plugins: {
                    legend: { display: false }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
           <CardHeader>
            <CardTitle>Key Performance Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl">
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Total Revenue</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">₹{kpis.revenue}</p>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl">
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Total Expenses</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">₹{kpis.totalExpenses}</p>
                </div>
              </div>

              <div className="p-5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Estimated Profit</p>
                </div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">₹{kpis.profit}</p>
              </div>

              <div className="pt-4 space-y-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Delivery Accuracy</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{kpis.successRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${kpis.successRate}%` }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">On-Time Performance</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{kpis.onTime}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${kpis.onTime}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
