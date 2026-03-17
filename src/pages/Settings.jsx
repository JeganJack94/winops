import React, { useState, useEffect } from 'react';
import { User, Users, Sun, Moon, LogOut, IndianRupee, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { riderService } from '../services/riderService';
import { settingsService } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [riders, setRiders] = useState([]);
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderPhone, setNewRiderPhone] = useState('');
  const [showAddRider, setShowAddRider] = useState(false);
  const [settings, setSettings] = useState({
    ratePerParcel: 18,
    companyName: 'Win Express',
    email: 'winexpress630551@gmail.com'
  });

  useEffect(() => {
    // Subscribe to riders
    const unsubscribeRiders = riderService.subscribeToRiders(setRiders);
    
    // Subscribe to settings
    const unsubscribeSettings = settingsService.subscribeToSettings(setSettings);

    return () => {
      unsubscribeRiders();
      unsubscribeSettings();
    };
  }, []);

  const handleSaveRate = async () => {
    try {
      await settingsService.updateSettings({ ratePerParcel: Number(settings.ratePerParcel) });
      alert('Rate updated!');
    } catch (error) {
      console.error('Error updating rate:', error);
    }
  };

  const handleAddRider = async (e) => {
    e.preventDefault();
    if (!newRiderName || !newRiderPhone) return;
    try {
      await riderService.addRider({ name: newRiderName, phone: newRiderPhone });
      setNewRiderName('');
      setNewRiderPhone('');
      setShowAddRider(false);
    } catch (error) {
      console.error('Error adding rider:', error);
    }
  };

  const handleDeleteRider = async (id) => {
    if (window.confirm('Are you sure you want to delete this rider?')) {
      try {
        await riderService.deleteRider(id);
      } catch (error) {
        console.error('Error deleting rider:', error);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-gray-500 dark:text-gray-400">Manage your profile, team, and app preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <User className="w-5 h-5 mr-2 text-primary" />
                Profile Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                  <img src="/logo.png" alt="Win Express" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">{settings.companyName}</h3>
                <p className="text-sm text-gray-500">{settings.email}</p>
              </div>
              <Button variant="outline" className="w-full">Edit Profile</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">App Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {theme === 'dark' ? <Moon className="w-4 h-4 text-gray-500" /> : <Sun className="w-4 h-4 text-gray-500" />}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
                </div>
                <Button variant="outline" size="sm" onClick={toggleTheme}>
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </Button>
              </div>

              <hr className="border-gray-100 dark:border-gray-800" />

              <div>
                <label className="flex items-center space-x-2 mb-2">
                  <IndianRupee className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Default Rate / Parcel</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.ratePerParcel}
                    onChange={(e) => setSettings({ ...settings, ratePerParcel: e.target.value })}
                  />
                <Button variant="primary" onClick={handleSaveRate}>Save</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center text-base">
                <Users className="w-5 h-5 mr-2 text-primary" />
                Rider Management
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddRider(!showAddRider)}>
                {showAddRider ? 'Cancel' : 'Add Rider'}
              </Button>
            </CardHeader>
            <CardContent>
              {showAddRider && (
                <form onSubmit={handleAddRider} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input 
                      placeholder="Rider Name" 
                      value={newRiderName}
                      onChange={(e) => setNewRiderName(e.target.value)}
                      required
                    />
                    <Input 
                      placeholder="Phone Number" 
                      value={newRiderPhone}
                      onChange={(e) => setNewRiderPhone(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Save Rider
                  </Button>
                </form>
              )}
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Phone</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riders.map((rider) => (
                      <tr key={rider.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {rider.name}
                        </td>
                        <td className="px-6 py-4">{rider.phone}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${rider.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                            {rider.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-rose-500 hover:text-rose-600"
                            onClick={() => handleDeleteRider(rider.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {riders.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                          No riders added yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
        <Button variant="danger" className="w-full sm:w-auto px-8" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
