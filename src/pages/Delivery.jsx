import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, Plus, Trash2, MapPin, User, Calendar, Edit2 } from 'lucide-react';
import { deliveryService } from '../services/deliveryService';
import { riderService } from '../services/riderService';
import { settingsService } from '../services/settingsService';

export default function Delivery() {
  const [activeTab, setActiveTab] = useState('hub');
  const [hubSearch, setHubSearch] = useState('');
  const [riderSearch, setRiderSearch] = useState('');
  
  const [riders, setRiders] = useState([]);
  const [hubEntries, setHubEntries] = useState([]);
  const [riderEntries, setRiderEntries] = useState([]);
  const [rate, setRate] = useState(18);

  // Form States
  const [showHubForm, setShowHubForm] = useState(false);
  const [editingHubId, setEditingHubId] = useState(null);
  const [hubForm, setHubForm] = useState({
    date: new Date().toISOString().split('T')[0],
    received: ''
  });

  const [showRiderForm, setShowRiderForm] = useState(false);
  const [editingRiderId, setEditingRiderId] = useState(null);
  const [riderForm, setRiderForm] = useState({
    riderId: '',
    riderName: '',
    date: new Date().toISOString().split('T')[0],
    area: '',
    assigned: '',
    delivered: '',
    notes: ''
  });

  useEffect(() => {
    const unsubRiders = riderService.subscribeToRiders(setRiders);
    const unsubHub = deliveryService.subscribeToHubEntries(setHubEntries);
    const unsubRiderEntries = deliveryService.subscribeToRiderEntries(setRiderEntries);
    const unsubSettings = settingsService.subscribeToSettings((s) => setRate(s.ratePerParcel));

    return () => {
      unsubRiders();
      unsubHub();
      unsubRiderEntries();
      unsubSettings();
    };
  }, []);

  const handleHubSubmit = async (e) => {
    e.preventDefault();
    const received = Number(hubForm.received);
    try {
      if (editingHubId) {
        await deliveryService.updateHubEntry(editingHubId, {
          date: hubForm.date,
          totalReceived: received
        });
      } else {
        await deliveryService.addHubEntry({
          date: hubForm.date,
          totalReceived: received
        });
      }
      resetHubForm();
    } catch (error) {
      console.error('Error saving hub entry:', error);
    }
  };

  const handleRiderSubmit = async (e) => {
    e.preventDefault();
    const assigned = Number(riderForm.assigned);
    const delivered = Number(riderForm.delivered);
    const income = delivered * rate;
    
    try {
      const entryData = {
        ...riderForm,
        assigned,
        delivered,
        pending: assigned - delivered,
        income
      };

      if (editingRiderId) {
        await deliveryService.updateRiderEntry(editingRiderId, entryData);
      } else {
        await deliveryService.addRiderEntry(entryData);
      }
      resetRiderForm();
    } catch (error) {
      console.error('Error saving rider entry:', error);
    }
  };

  const resetHubForm = () => {
    setHubForm({
      date: new Date().toISOString().split('T')[0],
      received: ''
    });
    setEditingHubId(null);
    setShowHubForm(false);
  };

  const resetRiderForm = () => {
    setRiderForm({
      riderId: '',
      riderName: '',
      date: new Date().toISOString().split('T')[0],
      area: '',
      assigned: '',
      delivered: '',
      notes: ''
    });
    setEditingRiderId(null);
    setShowRiderForm(false);
  };

  const onRiderChange = (e) => {
    const rider = riders.find(r => r.id === e.target.value);
    setRiderForm({
      ...riderForm,
      riderId: e.target.value,
      riderName: rider?.name || ''
    });
  };

  const handleEditHub = (entry) => {
    setHubForm({
      date: entry.date,
      received: entry.totalReceived
    });
    setEditingHubId(entry.id);
    setShowHubForm(true);
  };

  const handleEditRider = (entry) => {
    setRiderForm({
      riderId: entry.riderId,
      riderName: entry.riderName,
      date: entry.date,
      area: entry.area,
      assigned: entry.assigned,
      delivered: entry.delivered,
      notes: entry.notes || ''
    });
    setEditingRiderId(entry.id);
    setShowRiderForm(true);
  };

  const handleDeleteHub = async (id) => {
    if (window.confirm('Delete this hub entry?')) {
      try {
        await deliveryService.deleteHubEntry(id);
      } catch (error) {
        console.error('Error deleting hub entry:', error);
      }
    }
  };

  const handleDeleteRider = async (id) => {
    if (window.confirm('Delete this rider entry?')) {
      try {
        await deliveryService.deleteRiderEntry(id);
      } catch (error) {
        console.error('Error deleting rider entry:', error);
      }
    }
  };

  const calculatedHubEntries = useMemo(() => {
    return hubEntries.map(hub => {
      const relatedRiders = riderEntries.filter(re => re.date === hub.date);
      const totalDelivered = relatedRiders.reduce((sum, re) => sum + Number(re.delivered), 0);
      return {
        ...hub,
        delivered: totalDelivered,
        pending: Number(hub.totalReceived) - totalDelivered
      };
    });
  }, [hubEntries, riderEntries]);

  const filteredHubEntries = calculatedHubEntries.filter(entry => 
    entry.date?.includes(hubSearch)
  );

  const filteredRiderEntries = riderEntries.filter(entry => 
    entry.riderName?.toLowerCase().includes(riderSearch.toLowerCase()) ||
    entry.area?.toLowerCase().includes(riderSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Management</h2>
        <div className="flex bg-gray-100/80 dark:bg-gray-800/80 p-1.5 rounded-xl shadow-inner backdrop-blur-sm">
          <button
            onClick={() => setActiveTab('hub')}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              activeTab === 'hub' 
                ? 'bg-primary text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50 hover:scale-105'
            }`}
          >
            Hub Entry
          </button>
          <button
            onClick={() => setActiveTab('rider')}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              activeTab === 'rider' 
                ? 'bg-primary text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50 hover:scale-105'
            }`}
          >
            Rider Entry
          </button>
        </div>
      </div>

      {activeTab === 'hub' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Hub Entries</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input 
                  placeholder="Search date..." 
                  className="pl-9"
                  value={hubSearch}
                  onChange={(e) => setHubSearch(e.target.value)}
                />
              </div>
              <Button className="flex-shrink-0" onClick={() => showHubForm ? resetHubForm() : setShowHubForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {showHubForm ? 'Cancel' : 'New Entry'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showHubForm && (
              <form onSubmit={handleHubSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input 
                    type="date" 
                    value={hubForm.date}
                    onChange={(e) => setHubForm({ ...hubForm, date: e.target.value })}
                    required
                  />
                  <Input 
                    type="number" 
                    placeholder="Total Received" 
                    value={hubForm.received}
                    onChange={(e) => setHubForm({ ...hubForm, received: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingHubId ? 'Update Hub Entry' : 'Save Hub Entry'}
                </Button>
              </form>
            )}
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Total Received</th>
                    <th className="px-6 py-3">Delivered</th>
                    <th className="px-6 py-3">Pending</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHubEntries.map((entry) => (
                    <tr key={entry.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-medium">{entry.totalReceived}</td>
                      <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-medium">{entry.delivered}</td>
                      <td className="px-6 py-4 text-amber-600 dark:text-amber-400 font-medium">{entry.pending}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-primary"
                            onClick={() => handleEditHub(entry)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-rose-500"
                            onClick={() => handleDeleteHub(entry.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredHubEntries.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-400">No hub entries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'rider' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Rider Entries</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input 
                  placeholder="Search rider..." 
                  className="pl-9"
                  value={riderSearch}
                  onChange={(e) => setRiderSearch(e.target.value)}
                />
              </div>
              <Button className="flex-shrink-0" onClick={() => showRiderForm ? resetRiderForm() : setShowRiderForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {showRiderForm ? 'Cancel' : 'New Entry'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showRiderForm && (
              <form onSubmit={handleRiderSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="relative">
                    <User className="absolute left-3 top-[11px] h-4 w-4 text-gray-400" />
                    <select 
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white"
                      value={riderForm.riderId}
                      onChange={onRiderChange}
                      required
                    >
                      <option value="">Select Rider</option>
                      {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-[11px] h-4 w-4 text-gray-400" />
                    <Input 
                      type="date" 
                      className="pl-10"
                      value={riderForm.date}
                      onChange={(e) => setRiderForm({ ...riderForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-[11px] h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Area (e.g. North)" 
                      className="pl-10"
                      value={riderForm.area}
                      onChange={(e) => setRiderForm({ ...riderForm, area: e.target.value })}
                      required
                    />
                  </div>
                  <Input 
                    type="number" 
                    placeholder="Parcels Assigned" 
                    value={riderForm.assigned}
                    onChange={(e) => setRiderForm({ ...riderForm, assigned: e.target.value })}
                    required
                  />
                  <Input 
                    type="number" 
                    placeholder="Delivered" 
                    value={riderForm.delivered}
                    onChange={(e) => setRiderForm({ ...riderForm, delivered: e.target.value })}
                    required
                  />
                  <Input 
                    placeholder="Notes (optional)" 
                    value={riderForm.notes}
                    onChange={(e) => setRiderForm({ ...riderForm, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingRiderId ? 'Update Rider Entry' : 'Save Rider Entry'}
                </Button>
              </form>
            )}
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Rider Name</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Area</th>
                    <th className="px-6 py-3">Assigned</th>
                    <th className="px-6 py-3">Delivered</th>
                    <th className="px-6 py-3">Pending</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRiderEntries.map((entry) => (
                    <tr key={entry.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.riderName}
                      </td>
                      <td className="px-6 py-4">{entry.date}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          {entry.area}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-medium">{entry.assigned}</td>
                      <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-medium">{entry.delivered}</td>
                      <td className="px-6 py-4 text-amber-600 dark:text-amber-400 font-medium">{entry.pending}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-primary"
                            onClick={() => handleEditRider(entry)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-rose-500"
                            onClick={() => handleDeleteRider(entry.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRiderEntries.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-400">No rider entries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
