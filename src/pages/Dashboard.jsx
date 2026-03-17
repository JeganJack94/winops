import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Truck, CheckCircle2, Clock, IndianRupee } from 'lucide-react';
import { deliveryService } from '../services/deliveryService';
import { expenseService } from '../services/expenseService';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <Card>
    <CardContent className="p-6 flex items-center justify-between">
      <div>
        <p className="text-sm border-gray-100 font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className={`w-6 h-6`} />
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [hubEntries, setHubEntries] = useState([]);
  const [riderEntries, setRiderEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const unsubHub = deliveryService.subscribeToHubEntries(setHubEntries);
    const unsubRider = deliveryService.subscribeToRiderEntries(setRiderEntries);
    const unsubExpenses = expenseService.subscribeToExpenses(setExpenses);

    return () => {
      unsubHub();
      unsubRider();
      unsubExpenses();
    };
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const todayHub = hubEntries.filter(e => e.date === today);
    const todayRiders = riderEntries.filter(e => e.date === today);
    const todayExpenses = expenses.filter(e => e.date === today);

    const received = todayHub.reduce((acc, curr) => acc + (Number(curr.totalReceived) || 0), 0);
    const delivered = todayRiders.reduce((acc, curr) => acc + (Number(curr.delivered) || 0), 0);
    const expenseTotal = todayExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return [
      { title: 'Today Received', value: received.toString(), icon: Truck, color: 'text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/20' },
      { title: 'Delivered', value: delivered.toString(), icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/20' },
      { title: 'Pending', value: (received - delivered).toString(), icon: Clock, color: 'text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20' },
      { title: 'Expenses (Today)', value: `₹${expenseTotal}`, icon: IndianRupee, color: 'text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-500/20' },
    ];
  }, [hubEntries, riderEntries, expenses, today]);

  const performanceData = useMemo(() => {
    const performance = riderEntries
      .filter(e => e.date === today)
      .reduce((acc, curr) => {
        const name = curr.riderName || 'Unknown';
        if (!acc[name]) acc[name] = { delivered: 0, pending: 0 };
        acc[name].delivered += (Number(curr.delivered) || 0);
        acc[name].pending += (Number(curr.pending) || 0);
        return acc;
      }, {});

    const labels = Object.keys(performance);
    const delivered = labels.map(l => performance[l].delivered);
    const pending = labels.map(l => performance[l].pending);

    return {
      labels: labels.length > 0 ? labels : ['No Activity'],
      datasets: [
        {
          label: 'Delivered',
          data: delivered.length > 0 ? delivered : [0],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderRadius: 4,
        },
        {
          label: 'Pending',
          data: pending.length > 0 ? pending : [0],
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderRadius: 4,
        }
      ]
    };
  }, [riderEntries, today]);

  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
          <p className="text-gray-500 dark:text-gray-400">Welcome back, here's what's happening today.</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={i} title={stat.title} value={stat.value} icon={stat.icon} colorClass={stat.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Rider Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <Bar 
                data={performanceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, border: { display: false } }
                  },
                  plugins: {
                    legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } }
                  }
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
                <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
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
