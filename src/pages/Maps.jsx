import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Map, 
  MapPin, Trash2, Globe,
  ListOrdered
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { zoneService } from '../services/zoneService';

const DEFAULT_ZONES = ['Main', 'East', 'West', 'North', 'South'];

export default function Maps() {
  const toast = useToast();
  const [zones, setZones] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeZone, setActiveZone] = useState('Main');
  const [newArea, setNewArea] = useState('');

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

  const handleAddArea = async (zoneName, areaName = null) => {
    const areaToAdd = areaName || newArea;
    if (!areaToAdd.trim()) return;
    
    const zone = zones.find(z => z.name === zoneName);
    const updatedAreas = [...(zone?.areas || []), areaToAdd.trim()];
    
    try {
      await zoneService.saveZoneAreas(zoneName, updatedAreas);
      if (!areaName) setNewArea('');
      toast.success(`'${areaToAdd}' added to ${zoneName} Zone`);
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Globe className="text-primary" size={32} />
            WinOps Zone Management
          </h1>
          <p className="mt-1 text-gray-500 font-medium italic">Organize streets and landmarks into delivery zones for operational efficiency.</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl shadow-inner border border-white/5">
          <div className="flex items-center gap-2 px-4 py-1.5 text-sm font-black text-primary">
            <ListOrdered size={18} />
            Zone Directory
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Common Search Bar */}
        <div className="relative group max-w-2xl mx-auto mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Search streets, areas, or landmarks across all zones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[24px] text-lg font-bold shadow-xl shadow-black/5 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Zone Selector Sidebar */}
          <div className={`lg:col-span-1 space-y-2 ${searchQuery ? 'opacity-40 grayscale pointer-events-none' : ''} transition-all`}>
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
            <div className="bg-white/50 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[32px] overflow-hidden shadow-xl min-h-[500px] flex flex-col transition-all">
              {/* Active Zone Header (Hide when searching) */}
              {!searchQuery && (
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
              )}

              {searchQuery && (
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-primary/5">
                  <h2 className="text-xl font-black text-primary uppercase flex items-center gap-3 tracking-tighter">
                    <Search size={20} />
                    Search Results
                  </h2>
                </div>
              )}

              {/* Areas List */}
              <div className="p-8 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {searchQuery ? (
                    // Global Search View
                    zones.flatMap(z => (z.areas || []).map(a => ({ zone: z.name, area: a })))
                      .filter(item => item.area.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((item, idx) => (
                        <div
                          key={`${item.zone}-${item.area}`}
                          className="group flex flex-col bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-primary/30 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                             <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full">{item.zone}</span>
                             <button 
                                onClick={() => handleRemoveArea(item.zone, item.area)}
                                className="p-1 text-gray-400 hover:text-rose-500 rounded-lg"
                             >
                                <Trash2 size={12} />
                             </button>
                          </div>
                          <span className="font-bold text-gray-700 dark:text-gray-300">{item.area}</span>
                        </div>
                      ))
                  ) : (
                    // Standard Zone View
                    (zones.find(z => z.name === activeZone)?.areas || []).map((area, idx) => (
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
                    ))
                  )}

                  {!searchQuery && (zones.find(z => z.name === activeZone)?.areas || []).length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                      <Map size={48} className="opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-[10px]">No areas defined for this zone yet</p>
                    </div>
                  )}

                  {searchQuery && zones.flatMap(z => z.areas).filter(a => a?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                      <Search size={48} className="opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-[10px]">No matches found for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
