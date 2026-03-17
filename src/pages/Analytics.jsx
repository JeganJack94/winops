import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { deliveryService } from '../services/deliveryService';
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
  const [hubEntries, setHubEntries] = useState([]);
  const [riderEntries, setRiderEntries] = useState([]);

  useEffect(() => {
    const unsubHub = deliveryService.subscribeToHubEntries(setHubEntries);
    const unsubRider = deliveryService.subscribeToRiderEntries(setRiderEntries);
    return () => {
      unsubHub();
      unsubRider();
    };
  }, []);

  const deliveryTrendData = useMemo(() => {
    // Last 14 days aggregation
    const days = 14;
    const labels = [];
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      const dayTotal = riderEntries
        .filter(e => e.date === dateStr)
        .reduce((acc, curr) => acc + (Number(curr.delivered) || 0), 0);
      data.push(dayTotal);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Deliveries',
          data,
          borderColor: 'rgba(249, 115, 22, 1)',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          tension: 0.3,
          pointRadius: 3,
          fill: true
        }
      ]
    };
  }, [riderEntries]);

  const riderEfficiencyData = useMemo(() => {
    const efficiency = riderEntries.reduce((acc, curr) => {
      const name = curr.riderName || 'Unknown';
      if (!acc[name]) acc[name] = { assigned: 0, delivered: 0 };
      acc[name].assigned += (Number(curr.assigned) || 0);
      acc[name].delivered += (Number(curr.delivered) || 0);
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
  }, [riderEntries]);

  const kpis = useMemo(() => {
    const totalAssigned = riderEntries.reduce((acc, curr) => acc + (Number(curr.assigned) || 0), 0);
    const totalDelivered = riderEntries.reduce((acc, curr) => acc + (Number(curr.delivered) || 0), 0);
    const rate = totalAssigned > 0 ? (totalDelivered / totalAssigned) * 100 : 0;

    return {
      successRate: rate.toFixed(1),
      onTime: (rate * 0.95).toFixed(1), // Mocked relative to success rate
      satisfaction: (4.5 + (rate / 200)).toFixed(1) // Mocked relative to success rate
    };
  }, [riderEntries]);

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
                      grid: { color: theme === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.5)' },
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
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Overall Success Rate</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{kpis.successRate}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${kpis.successRate}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">On-Time Delivery</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{kpis.onTime}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${kpis.onTime}%` }}></div>
                </div>
              </div>
              
               <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Customer Satisfaction</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{kpis.satisfaction}/5</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${(kpis.satisfaction/5)*100}%` }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
