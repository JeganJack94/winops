import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { deliveryService } from '../services/deliveryService';
import { settingsService } from '../services/settingsService';
import { useTheme } from '../context/ThemeContext';
import { 
  Users, User as UserIcon, Calendar, TrendingUp, 
  CheckCircle2, AlertCircle, Share2, Download, 
  IndianRupee, Package, ArrowUpRight, ArrowDownRight, MapPin
} from 'lucide-react';
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

export default function Analytics() {
  const { theme } = useTheme();
  const reportRef = useRef(null);
  const chartRef = useRef(null);
  
  // State
  const [allRecords, setAllRecords] = useState([]);
  const [settings, setSettings] = useState({ ratePerParcel: 18 });
  const [timeframe, setTimeframe] = useState('week'); // week, month
  const [viewMode, setViewMode] = useState('team'); // team, rider
  const [selectedRider, setSelectedRider] = useState(null);

  useEffect(() => {
    const unsubRecords = deliveryService.subscribeToDailyRecords(setAllRecords, 100);
    const unsubSettings = settingsService.subscribeToSettings(setSettings);
    return () => {
      unsubRecords();
      unsubSettings();
    };
  }, []);

  // Filter and Aggregate Data
  const analyticsData = useMemo(() => {
    const now = new Date();
    const daysToLookBack = timeframe === 'week' ? 7 : 30;
    const cutoffDate = new Date(now.setDate(now.getDate() - daysToLookBack)).toISOString().split('T')[0];
    
    // Sort records by date for consistent charting
    const filteredRecords = allRecords
      .filter(r => r.date >= cutoffDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate Rider List
    const riderList = Array.from(new Set(
      allRecords.flatMap(r => (r.riders || []).map(ri => ri.riderName))
    )).sort();

    // Aggregation Logic
    let totalAssigned = 0;
    let totalCompleted = 0;
    let totalCollected = 0;
    let trendLabels = [];
    let trendSuccessData = [];
    let trendVolumeData = [];

    // Map for Individual Performance
    const riderStats = {};
    const zoneStats = {};

    filteredRecords.forEach(record => {
      trendLabels.push(new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
      
      let dayAssigned = 0;
      let dayCompleted = 0;

      const recordRiders = record.riders || [];
      recordRiders.forEach(r => {
        const name = r.riderName;
        const zone = r.zone || 'Unassigned';
        const assigned = (Number(r.assignedDelivery) || 0) + (Number(r.assignedPickup) || 0);
        const completed = (Number(r.completedDelivery) || 0) + (Number(r.completedPickup) || 0);
        const collected = Number(r.amountCollected) || 0;

        if (!riderStats[name]) {
          riderStats[name] = { totalAssigned: 0, totalCompleted: 0, totalCollected: 0, daily: {} };
        }

        if (!zoneStats[zone]) {
          zoneStats[zone] = { totalAssigned: 0, totalCompleted: 0, totalCollected: 0 };
        }

        riderStats[name].totalAssigned += assigned;
        riderStats[name].totalCompleted += completed;
        riderStats[name].totalCollected += collected;
        riderStats[name].daily[record.date] = { assigned, completed, collected };

        zoneStats[zone].totalAssigned += assigned;
        zoneStats[zone].totalCompleted += completed;
        zoneStats[zone].totalCollected += collected;

        if (viewMode === 'team' || (viewMode === 'rider' && name === selectedRider)) {
          dayAssigned += assigned;
          dayCompleted += completed;
        }
      });

      totalAssigned += dayAssigned;
      totalCompleted += dayCompleted;
      totalCollected += recordRiders.reduce((acc, r) => {
        if (viewMode === 'team' || (viewMode === 'rider' && r.riderName === selectedRider)) {
          return acc + (Number(r.amountCollected) || 0);
        }
        return acc;
      }, 0);

      trendSuccessData.push(dayAssigned > 0 ? (dayCompleted / dayAssigned) * 100 : 0);
      trendVolumeData.push(dayCompleted);
    });

    const successRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;

    return {
      kpis: {
        totalAssigned,
        totalCompleted,
        totalCollected,
        successRate: successRate.toFixed(1),
        revenue: totalCompleted * (Number(settings.ratePerParcel) || 18)
      },
      charts: {
        labels: trendLabels,
        successRate: trendSuccessData,
        volume: trendVolumeData
      },
      riderList,
      riderStats,
      zoneStats
    };
  }, [allRecords, timeframe, viewMode, selectedRider, settings]);

  const shareTextSummary = () => {
    const { kpis } = analyticsData;
    const timeframeText = timeframe === 'week' ? "This Week" : "This Month";
    const modeText = viewMode === 'team' ? "Team Analytics" : `Rider Analytics: ${selectedRider}`;
    
    const text = `*Win Express - ${modeText}*\nPeriod: ${timeframeText}\n\n📦 Total Delivered: ${kpis.totalCompleted}\n✅ Success Rate: ${kpis.successRate}%\n💰 Total Collected: ₹${kpis.totalCollected.toLocaleString()}\n📈 Op. Revenue: ₹${kpis.revenue.toLocaleString()}`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const downloadChart = () => {
    if (!chartRef.current) return;
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.download = `WinExpress_Performance_${timeframe}_${viewMode}.png`;
    
    // Convert chart to base64 image
    const imageBase64 = chartRef.current.toBase64Image();
    link.href = imageBase64;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const trendChartData = {
    labels: analyticsData.charts.labels,
    datasets: [
      {
        label: 'Deliveries',
        data: analyticsData.charts.volume,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Success Rate (%)',
        data: analyticsData.charts.successRate,
        borderColor: '#06b6d4',
        borderDash: [5, 5],
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top', 
        labels: { 
          usePointStyle: true, 
          font: { size: 10, weight: 'bold' },
          color: theme === 'dark' ? '#94a3b8' : '#64748b'
        } 
      },
      tooltip: { 
        backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
        titleColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
        bodyColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
        borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        cornerRadius: 12, 
        padding: 12 
      }
    },
    scales: {
      x: { 
        grid: { display: false }, 
        ticks: { 
          font: { size: 10 },
          color: theme === 'dark' ? '#94a3b8' : '#64748b'
        } 
      },
      y: { 
        position: 'left', 
        title: { 
          display: true, 
          text: 'Volume', 
          font: { weight: 'bold' },
          color: theme === 'dark' ? '#94a3b8' : '#64748b'
        },
        grid: {
          color: theme === 'dark' ? 'rgba(71, 85, 105, 0.1)' : 'rgba(226, 232, 240, 0.8)'
        },
        ticks: {
          color: theme === 'dark' ? '#94a3b8' : '#64748b'
        }
      },
      y1: { 
        position: 'right', 
        max: 100, 
        min: 0, 
        grid: { drawOnChartArea: false },
        title: { 
          display: true, 
          text: 'Success %', 
          font: { weight: 'bold' },
          color: theme === 'dark' ? '#94a3b8' : '#64748b'
        },
        ticks: {
          color: theme === 'dark' ? '#94a3b8' : '#64748b'
        }
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8" ref={reportRef}>
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <TrendingUp size={32} className="text-primary"/>
            Operational Analytics
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
            Projecting performance across riders and hubs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          {/* Timeframe Toggle */}
          <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
            {['week', 'month'].map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${timeframe === t ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* View Mode Toggle */}
          <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setViewMode('team')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'team' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
            >
              <Users size={14}/> Team
            </button>
            <button
              onClick={() => {
                setViewMode('rider');
                if (!selectedRider) setSelectedRider(analyticsData.riderList[0]);
              }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'rider' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
            >
              <UserIcon size={14}/> Individual
            </button>
          </div>
          
          <Button onClick={downloadChart} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-4 flex items-center gap-2 text-xs font-black shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
            <Download size={14}/> Chart Image
          </Button>
          
          <Button onClick={shareTextSummary} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 px-4 flex items-center gap-2 text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">
            <Share2 size={14}/> Share Report
          </Button>
        </div>
      </div>

      {/* Rider Selector (Conditional) */}
      {viewMode === 'rider' && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {analyticsData.riderList.map(name => (
            <button
              key={name}
              onClick={() => setSelectedRider(name)}
              className={`flex-none px-6 py-2.5 rounded-2xl text-sm font-bold border transition-all ${selectedRider === name ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-50'}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KPICard label="Total Delivered" value={analyticsData.kpis.totalCompleted} icon={Package} color="blue" subtitle={`out of ${analyticsData.kpis.totalAssigned}`} />
        <KPICard label="Success Rate" value={`${analyticsData.kpis.successRate}%`} icon={CheckCircle2} color="emerald" subtitle={analyticsData.kpis.successRate >= 90 ? "Excellent Performance" : "Needs Attention"} />
        <KPICard label="Collected amount" value={`₹${analyticsData.kpis.totalCollected.toLocaleString()}`} icon={IndianRupee} color="orange" subtitle="COD + UPI Received" />
        <KPICard label="Operational Revenue" value={`₹${analyticsData.kpis.revenue.toLocaleString()}`} icon={TrendingUp} color="indigo" subtitle={`at ₹${settings.ratePerParcel}/parcel`} />
      </div>

      {/* Main Analysis Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Performance Trends</CardTitle>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{timeframe === 'week' ? 'Last 7 Days' : 'Last 30 Days'}</div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <Line ref={chartRef} data={trendChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Breakdown Card */}
        <div className="space-y-6">
          <div className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-indigo-600 text-white p-6 rounded-[2.5rem]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <TrendingUp size={24}/>
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Efficiency Goal</p>
                <p className="text-xl font-black">95.0% Target</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold text-indigo-100 uppercase">
                <span>Current Performance</span>
                <span>{analyticsData.kpis.successRate}%</span>
              </div>
              <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-1000" 
                  style={{ width: `${analyticsData.kpis.successRate}%` }}
                />
              </div>
              <p className="text-[11px] text-indigo-100 italic leading-relaxed pt-2">
                {analyticsData.kpis.successRate >= 95 
                  ? "Outstanding! You are currently exceeding the operational target for this period."
                  : "Keep pushing! Focus on last-mile accuracy to reach the 95% threshold."}
              </p>
            </div>
          </div>

          {/* Leaderboard or Rider Quick Stats */}
          {viewMode === 'team' ? (
            <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 p-6 rounded-[2.5rem]">
              <h4 className="font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Users size={18} className="text-primary"/> Top Performers
              </h4>
              <div className="space-y-4">
                {Object.entries(analyticsData.riderStats)
                  .sort((a, b) => b[1].totalCompleted - a[1].totalCompleted)
                  .slice(0, 3)
                  .map(([name, stats]) => (
                    <div key={name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                          {name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-600">{stats.totalCompleted} <span className="text-slate-400 font-medium">Del</span></div>
                        <div className="text-[10px] text-slate-400">{((stats.totalCompleted / stats.totalAssigned) * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          ) : (
            <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 p-6 rounded-[2.5rem]">
               <h4 className="font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-tighter">
                <UserIcon size={18} className="text-primary"/> Profile Focus
              </h4>
              <div className="space-y-5">
                <PerformanceRow icon={Package} label="Avg Deliveries" value={(analyticsData.kpis.totalCompleted / (timeframe === 'week' ? 7 : 30)).toFixed(1)} />
                <PerformanceRow icon={IndianRupee} label="Avg Collection" value={`₹${(analyticsData.kpis.totalCollected / (timeframe === 'week' ? 7 : 30)).toLocaleString()}`} />
                <PerformanceRow icon={CheckCircle2} label="Consistency" value="Very High" />
              </div>
            </Card>
          )}

          {/* Area/Zone Breakdown */}
          {viewMode === 'team' && (
            <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 p-6 rounded-[2.5rem]">
              <h4 className="font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-primary"/> Zone Performance
              </h4>
              <div className="space-y-4">
                {Object.entries(analyticsData.zoneStats)
                  .sort((a, b) => b[1].totalCompleted - a[1].totalCompleted)
                  .map(([zone, stats]) => (
                    <div key={zone} className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{zone}</span>
                        <div className="text-xs font-black text-emerald-600">
                          {stats.totalCompleted} <span className="text-slate-400 font-medium">/ {stats.totalAssigned}</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${(() => {
                            const rate = stats.totalAssigned > 0 ? (stats.totalCompleted / stats.totalAssigned) * 100 : 0;
                            if (rate >= 90) return 'bg-emerald-500';
                            if (rate >= 80) return 'bg-orange-500';
                            return 'bg-rose-500';
                          })()}`}
                          style={{ width: `${stats.totalAssigned > 0 ? (stats.totalCompleted / stats.totalAssigned) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {Object.keys(analyticsData.zoneStats).length === 0 && (
                    <p className="text-xs text-slate-400 font-bold text-center py-2">No zone data available for this period.</p>
                  )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color, subtitle }) {
  const colorMap = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    orange: "bg-orange-500",
    indigo: "bg-indigo-600"
  };

  return (
    <Card className="relative overflow-hidden border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 group hover:translate-y-[-4px] transition-all duration-300 rounded-[2.5rem]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between relative z-10">
          <div className={`p-2.5 rounded-2xl ${colorMap[color]} text-white shadow-lg`}>
            <Icon size={20} />
          </div>
          {subtitle && (
            <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-50 text-slate-500 dark:bg-slate-900/50'}`}>
              {subtitle}
            </div>
          )}
        </div>
        
        <div className="mt-6 space-y-1 relative z-10">
          <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
            {label}
          </p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
            {value}
          </h3>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
          <Icon size={16} className="text-slate-400"/>
        </div>
        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{value}</span>
    </div>
  );
}
