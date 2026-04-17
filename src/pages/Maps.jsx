import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Map, ChevronRight, X, 
  MapPin, Hash, Trash2, Edit3, Globe,
  SearchCode, ListOrdered
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { zoneService } from '../services/zoneService';
import GoogleMapContainer from '../components/ui/GoogleMapContainer';

const DEFAULT_ZONES = ['Main', 'East', 'West', 'North', 'South'];

export default function Maps() {
  const toast = useToast();
  const [zones, setZones] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeZone, setActiveZone] = useState('Main');
  const [newArea, setNewArea] = useState('');
  const [activeTab, setActiveTab] = useState('map'); // 'map' or 'directory'

  useEffect(() => {
    const unsub = zoneService.subscribeToZones((data) => {
      const existingZoneNames = data.map(z => z.name);
      const mergedZones = [...data];
      
      DEFAULT_ZONES.forEach(dz => {
        if (!existingZoneNames.includes(dz)) {
          mergedZones.push({ name: dz, areas: [] });
        }
      });
      
      setZones(mergedZones.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsub();
  }, []);

  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return zones;
    const q = searchQuery.toLowerCase();
    
    return zones.map(z => ({
      ...z,
      areas: (z.areas || []).filter(a => a.toLowerCase().includes(q))
    })).filter(z => z.name.toLowerCase().includes(q) || z.areas.length > 0);
  }, [zones, searchQuery]);

  const handleAddArea = async (zoneName, areaName = null) => {
    const areaToAdd = areaName || newArea;
    if (!areaToAdd.trim()) return;
    
    const zone = zones.find(z => z.name === zoneName);
    const updatedAreas = [...(zone?.areas || []), areaToAdd.trim()];
    
    try {
      await zoneService.saveZoneAreas(zoneName, updatedAreas);
      if (!areaName) setNewArea('');
      toast.success(`'${areaToAdd}' added to ${zoneName} Zone`);
      setActiveTab('directory');
    } catch (error) {
      toast.error('Failed to add area');
    }
  };

  const handleRemoveArea = async (zoneName, areaToRemove) => {
    const zone = zones.find(z => z.name === zoneName);
    const updatedAreas = (zone?.areas || []).filter(a => a !== areaToRemove);
    
    try {
      await zoneService.saveZoneAreas(zoneName, updatedAreas);
      toast.success('Area removed');
    } catch (error) {
      toast.error('Failed to remove area');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Globe className="text-primary" size={32} />
            WinOps Maps
          </h1>
          <p className="mt-1 text-gray-500 font-medium italic">Search landmarks in Kalayarkoil and map them to delivery zones.</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl shadow-inner border border-white/5">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === 'map' 
              ? 'bg-white dark:bg-gray-700 text-primary shadow-lg' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <SearchCode size={18} />
            Search Map
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === 'directory' 
              ? 'bg-white dark:bg-gray-700 text-primary shadow-lg' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ListOrdered size={18} />
            Zone Directory
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'map' ? (
          <motion.div
            key="map-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-[600px] relative"
          >
            <GoogleMapContainer 
              onLocationSelect={(placeName) => {
                setNewArea(placeName);
                // We'll show a quick zone selector overlay or just let them pick the zone in the next tab
                const targetZone = prompt(`Add "${placeName}" to which zone? (Main, East, West, North, South)`, activeZone);
                if (targetZone && DEFAULT_ZONES.includes(targetZone)) {
                  handleAddArea(targetZone, placeName);
                }
              }} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="directory-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Zone Selector Sidebar */}
              <div className="lg:col-span-1 space-y-2">
                {DEFAULT_ZONES.map(z => {
                  const isSelected = activeZone === z;
                  const zoneData = zones.find(zd => zd.name === z);
                  const count = zoneData?.areas?.length || 0;
                  
                  return (
                    <button
                      key={z}
                      onClick={() => setActiveZone(z)}
                      className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 ${
                        isSelected 
                        ? 'bg-primary text-white shadow-xl shadow-primary/25 translate-x-1' 
                        : 'bg-white dark:bg-gray-900/40 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin size={18} className={isSelected ? 'text-white' : 'text-primary/60'} />
                        <span className="font-black uppercase tracking-tight">{z}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Areas Display */}
              <div className="lg:col-span-3">
                <div className="bg-white/50 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[32px] overflow-hidden shadow-xl min-h-[500px] flex flex-col">
                  {/* Active Zone Header */}
                  <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase flex items-center gap-3 tracking-tighter">
                        <span className="w-2 h-8 bg-primary rounded-full" />
                        {activeZone} Zone
                      </h2>
                      <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Defined Areas & Segments</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        placeholder={`Add area to ${activeZone}...`}
                        value={newArea}
                        onChange={(e) => setNewArea(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddArea(activeZone)}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-60"
                      />
                      <button 
                        onClick={() => handleAddArea(activeZone)}
                        className="bg-primary text-white p-2.5 rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Search Bar for Directory */}
                  <div className="px-8 pt-6">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={16} />
                      <input 
                        type="text"
                        placeholder="Search area across current zone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  {/* Areas List */}
                  <div className="p-8 flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {(zones.find(z => z.name === activeZone)?.areas || []).filter(a => a.toLowerCase().includes(searchQuery.toLowerCase())).map((area, idx) => (
                        <div
                          key={area}
                          className="group flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-primary/30 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-gray-300 dark:text-gray-600 font-mono text-xs">#{idx + 1}</div>
                            <span className="font-bold text-gray-700 dark:text-gray-300 line-clamp-1">{area}</span>
                          </div>
                          <button 
                            onClick={() => handleRemoveArea(activeZone, area)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {(zones.find(z => z.name === activeZone)?.areas || []).length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                          <Map size={48} className="opacity-20" />
                          <p className="font-bold uppercase tracking-widest text-[10px]">No areas defined for this zone yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
