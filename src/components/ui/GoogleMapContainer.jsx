import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { Search, MapPin, Navigation, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const center = {
  lat: 9.8457,
  lng: 78.6314
};

const libraries = ['places'];

export default function GoogleMapContainer({ onLocationSelect }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries
  });

  const [map, setMap] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(center);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const autocompleteRef = useRef(null);

  const onMapLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setMarkerPosition(location);
        setSelectedPlace({
          name: place.name || place.formatted_address,
          address: place.formatted_address,
          location
        });
        map.panTo(location);
        map.setZoom(17);
      }
    }
  };

  const handleHandleSelect = () => {
    if (selectedPlace && onLocationSelect) {
      onLocationSelect(selectedPlace.name);
    }
  };

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[32px] p-8 text-center">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <MapPin size={32} />
          </div>
          <h3 className="text-xl font-black">Map Error</h3>
          <p className="text-gray-500 max-w-xs mx-auto">Please check if your Google Maps API Key is correctly set in the .env file.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-[32px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black text-gray-500 uppercase tracking-widest">Loading Satellite Content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-[32px] overflow-hidden shadow-2xl border border-white/10">
      {/* Search Overlay */}
      <div className="absolute top-6 left-6 right-6 z-10">
        <div className="flex gap-2">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
            <Autocomplete 
              onLoad={(ref) => autocompleteRef.current = ref}
              onPlaceChanged={onPlaceChanged}
              options={{
                componentRestrictions: { country: 'IN' },
                bounds: {
                    north: center.lat + 0.1,
                    south: center.lat - 0.1,
                    east: center.lng + 0.1,
                    west: center.lng - 0.1
                }
              }}
            >
              <input 
                type="text"
                placeholder="Search street, shop, or area in Kalayarkoil..."
                className="w-full pl-12 pr-6 py-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-2xl shadow-2xl focus:ring-2 focus:ring-primary/40 outline-none font-bold text-gray-800 dark:text-white"
              />
            </Autocomplete>
          </div>
          
          {selectedPlace && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleHandleSelect}
              className="bg-primary text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95"
            >
              <Plus size={20} />
              Add to Zone
            </motion.button>
          )}
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={14}
        onLoad={onMapLoad}
        options={{
          mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              "featureType": "all",
              "elementType": "geometry",
              "stylers": [{ "color": "#242f3e" }]
            },
            {
              "featureType": "all",
              "elementType": "labels.text.stroke",
              "stylers": [{ "lightness": -80 }]
            },
            {
              "featureType": "administrative",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#746855" }]
            },
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [{ "color": "#17263c" }]
            }
          ]
        }}
      >
        <Marker 
          position={markerPosition} 
          animation={window.google?.maps.Animation.DROP}
        />
      </GoogleMap>

      {/* Info Card Overlay */}
      <AnimatePresence>
        {selectedPlace && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-8 left-8 right-8 bg-white dark:bg-gray-900 p-6 rounded-[24px] shadow-2xl border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <Navigation size={24} />
                </div>
                <div>
                  <h4 className="font-black text-lg text-gray-900 dark:text-white">{selectedPlace.name}</h4>
                  <p className="text-sm font-medium text-gray-500 mt-1">{selectedPlace.address}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlace(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
