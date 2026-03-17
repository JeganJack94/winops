import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, Plus, Filter, Trash2, Calendar, Tag, Info } from 'lucide-react';
import { expenseService } from '../services/expenseService';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const EXPENSE_TYPES = ['Fuel', 'Salary', 'Maintenance', 'Utilities', 'Rent', 'Misc'];

export default function Expenses() {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Fuel',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    const unsub = expenseService.subscribeToExpenses(setExpenses);
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await expenseService.addExpense({
        ...form,
        amount: Number(form.amount)
      });
      setForm({
        date: new Date().toISOString().split('T')[0],
        type: 'Fuel',
        amount: '',
        notes: ''
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const chartData = useMemo(() => {
    const totals = expenses.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + (Number(curr.amount) || 0);
      return acc;
    }, {});

    const labels = Object.keys(totals);
    const data = Object.values(totals);

    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [
        {
          data: data.length > 0 ? data : [1],
          backgroundColor: [
            'rgba(249, 115, 22, 0.8)', // Primary (Orange)
            'rgba(30, 58, 138, 0.8)', // Secondary (Blue)
            'rgba(16, 185, 129, 0.8)', // Emerald
            'rgba(139, 92, 246, 0.8)', // Violet
            'rgba(236, 72, 153, 0.8)', // Pink
            'rgba(107, 114, 128, 0.8)', // Gray
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [expenses]);

  const filteredExpenses = expenses.filter(exp => 
    exp.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage and track your operational costs.</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? 'Cancel' : 'Add Expense'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>New Expense Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  type="date" 
                  className="pl-10"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="relative">
                <Tag className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <select 
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Input 
                type="number" 
                placeholder="Amount (₹)" 
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Info className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Notes..." 
                    className="pl-10"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Recent Expenses</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Notes</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap">{expense.date}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          {expense.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">{expense.notes}</td>
                      <td className="px-6 py-4 text-right font-semibold text-rose-500 dark:text-rose-400">
                        ₹{expense.amount}
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-400">No expenses found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center -mx-4">
              <Pie 
                data={chartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        padding: 20,
                        color: theme === 'dark' ? '#9ca3af' : '#4b5563'
                      }
                    }
                  }
                }} 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
