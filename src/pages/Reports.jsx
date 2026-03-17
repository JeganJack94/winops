import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import { deliveryService } from '../services/deliveryService';
import { expenseService } from '../services/expenseService';
import { useTheme } from '../context/ThemeContext';
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

export default function Reports() {
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState('This Week');
  const [riderEntries, setRiderEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const unsubRider = deliveryService.subscribeToRiderEntries(setRiderEntries);
    const unsubExpenses = expenseService.subscribeToExpenses(setExpenses);
    return () => {
      unsubRider();
      unsubExpenses();
    };
  }, []);

  const metrics = useMemo(() => {
    // Filter logic based on dateRange could be implemented here
    // For now, let's use all data or last 7 days as 'This Week'
    const totalParcels = riderEntries.reduce((acc, curr) => acc + (Number(curr.delivered) || 0), 0);
    const totalIncome = riderEntries.reduce((acc, curr) => acc + (Number(curr.income) || 0), 0);
    const totalExp = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const netProfit = totalIncome - totalExp;

    return [
      { label: 'Total Parcels', value: totalParcels.toLocaleString(), trend: '+0%', isPositive: true },
      { label: 'Total Income', value: `₹${totalIncome.toLocaleString()}`, trend: '+0%', isPositive: true },
      { label: 'Total Expenses', value: `₹${totalExp.toLocaleString()}`, trend: '-0%', isPositive: true },
      { label: 'Net Profit', value: `₹${netProfit.toLocaleString()}`, trend: '+0%', isPositive: true },
    ];
  }, [riderEntries, expenses]);

  const trendData = useMemo(() => {
    // Aggregate by date
    const incomeByDate = riderEntries.reduce((acc, curr) => {
      acc[curr.date] = (acc[curr.date] || 0) + (Number(curr.income) || 0);
      return acc;
    }, {});

    const expensesByDate = expenses.reduce((acc, curr) => {
      acc[curr.date] = (acc[curr.date] || 0) + (Number(curr.amount) || 0);
      return acc;
    }, {});

    const allDates = Array.from(new Set([...Object.keys(incomeByDate), ...Object.keys(expensesByDate)])).sort();
    const labels = allDates.map(d => d.split('-').slice(1).join('/')); // MM/DD

    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [
        {
          label: 'Income',
          data: allDates.map(d => incomeByDate[d] || 0),
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Expenses',
          data: allDates.map(d => expensesByDate[d] || 0),
          borderColor: 'rgba(244, 63, 94, 1)',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ]
    };
  }, [riderEntries, expenses]);

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Reports</h2>
          <p className="text-gray-500 dark:text-gray-400">Analyze your income and expenses.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option>All Time</option>
            <option>This Week</option>
            <option>Last Week</option>
            <option>This Month</option>
            <option>Last Month</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{metric.label}</p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</h3>
                <span className={`text-sm font-medium ${metric.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {metric.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
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
                    ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
                  },
                  y: { 
                    grid: { color: theme === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.5)' },
                    ticks: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
                  }
                },
                plugins: {
                  legend: { 
                    position: 'top', 
                    align: 'end', 
                    labels: { 
                      usePointStyle: true,
                      color: theme === 'dark' ? '#d1d5db' : '#374151'
                    } 
                  }
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
