import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Trash2, Globe,
  MapPin, ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { zoneService } from '../services/zoneService';

const DEFAULT_ZONES = ['Main', 'East', 'West', 'North', 'South'];

export default function Maps() {
  const toast = useToast();
  const [zones, setZones] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newArea, setNewArea] = useState('');
  const [selectedBucket, setSelectedBucket] = useState('Main');

  useEffect(() => {
    const unsub = zoneService.subscribeToZones((data) => {
      const existingZoneNames = data.map(z => z.name);
      const mergedZones = [...data];
      
      DEFAULT_ZONES.forEach(dz => {
        if (!existingZoneNames.includes(dz)) {
          mergedZones.push({ name: dz, areas: [] });
        }
      });
      
      setZones(mergedZones.sort((a, b) => {
        return DEFAULT_ZONES.indexOf(a.name) - DEFAULT_ZONES.indexOf(b.name);
      }));
    });
    return () => unsub();
  }, []);

  const handleAddToBucket = async (e) => {
    if (e) e.preventDefault();
    if (!newArea.trim()) return;
    
    const zone = zones.find(z => z.name === selectedBucket);
    const updatedAreas = [...(zone?.areas || []), newArea.trim()];
    
    try {
      await zoneService.saveZoneAreas(selectedBucket, updatedAreas);
      toast.success(`'${newArea}' added to ${selectedBucket} Bucket`);
      setNewArea('');
    } catch (error) {
      toast.error('Failed to add to bucket');
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Simplified Header */}
      <div className="text-center">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
          Zone Directory
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400 font-medium">Manage delivery area buckets by zone.</p>
      </div>

      {/* Unified Action Hub */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] shadow-2xl shadow-black/5 p-2 space-y-2 max-w-4xl mx-auto">
        {/* Row 1: Add to Bucket Form */}
        <form onSubmit={handleAddToBucket} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex gap-2">
            <input 
              type="text"
              placeholder="Enter street or area name..."
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              className="flex-1 px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-[24px] font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
            />
            <div className="relative min-w-[140px]">
              <select 
                value={selectedBucket}
                onChange={(e) => setSelectedBucket(e.target.value)}
                className="w-full h-full px-4 py-4 bg-gray-50 dark:bg-gray-800 rounded-[24px] font-black uppercase text-xs appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer dark:text-white"
              >
                {DEFAULT_ZONES.map(z => (
                  <option key={z} value={z}>{z} Zone</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>
          <button 
            type="submit"
            className="bg-primary text-white px-8 py-4 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add to Bucket
          </button>
        </form>

        {/* Row 2: Search Bar */}
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Quick search across all buckets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-transparent text-sm font-bold outline-none placeholder:text-gray-400 dark:text-white"
          />
        </div>
      </div>

      {/* Grid of Buckets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zones.map((zone) => (
          <ZoneBucket 
            key={zone.name}
            zone={zone}
            searchQuery={searchQuery}
            onRemove={(name) => handleRemoveArea(zone.name, name)}
          />
        ))}
      </div>

      {/* Search Empty State */}
      {searchQuery && zones.every(z => !z.areas.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))) && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full">
            <Search size={32} className="opacity-20" />
          </div>
          <p className="font-bold uppercase tracking-widest text-xs">No matching results in any bucket</p>
        </div>
      )}
    </div>
  );
}

/* ─── ZoneBucket Component ─── */
function ZoneBucket({ zone, searchQuery, onRemove }) {
  const filteredAreas = useMemo(() => {
    if (!searchQuery.trim()) return zone.areas || [];
    return (zone.areas || []).filter(a => 
      a.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [zone.areas, searchQuery]);

  if (searchQuery && filteredAreas.length === 0) return null;

  return (
    <motion.div
      layout
      className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] overflow-hidden shadow-xl shadow-black/5 flex flex-col min-h-[300px]"
    >
      {/* Bucket Header */}
      <div className="px-6 py-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
            {zone.name}
          </h2>
        </div>
        <span className="text-[10px] font-black px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg">
          {filteredAreas.length}
        </span>
      </div>

      {/* Item List */}
      <div className="p-4 flex-1 space-y-2 max-h-[400px] overflow-y-auto">
        {filteredAreas.map((area) => (
          <div
            key={area}
            className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-primary/20 transition-all"
          >
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 capitalize truncate pr-4">
              {area}
            </span>
            <button 
              onClick={() => onRemove(area)}
              className="p-1 px-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {filteredAreas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300 grayscale opacity-40">
            <MapPin size={24} />
            <p className="text-[10px] font-black uppercase mt-2 tracking-tighter">Empty Bucket</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
