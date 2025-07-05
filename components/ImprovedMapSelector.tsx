import React, { useEffect, useMemo, useRef, useState, RefObject } from 'react';
import { MapContainer, TileLayer, Marker, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';

// Fix for default icon path issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ImprovedMapSelectorProps {
  lat: number;
  lon: number;
  onMapChange: (lat: number, lon: number) => void;
  mapResizeRef?: RefObject<() => void>;
}

const MapUpdater: React.FC<{ lat: number, lon: number, onMapChange: (lat: number, lon: number) => void }> = ({ lat, lon, onMapChange }) => {
  const map = useMap();
  const markerRef = useRef<L.Marker>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      map.panTo([lat, lon]);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
    }
  }, [lat, lon, map, isDragging]);

  // Debounced click handler to prevent rapid updates
  const handleMapClick = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (e: L.LeafletMouseEvent) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onMapChange(e.latlng.lat, e.latlng.lng);
      }, 100);
    };
  }, [onMapChange]);

  useEffect(() => {
    map.off('click').on('click', handleMapClick);
  }, [map, handleMapClick]);

  const eventHandlers = useMemo(
    () => ({
      dragstart() {
        setIsDragging(true);
      },
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onMapChange(lat, lng);
        }
        setIsDragging(false);
      },
    }),
    [onMapChange],
  );

  return (
    <Marker
      position={[lat, lon]}
      draggable={true}
      eventHandlers={eventHandlers}
      ref={markerRef}
    />
  );
};

const ImprovedMapSelector: React.FC<ImprovedMapSelectorProps> = ({ lat, lon, onMapChange, mapResizeRef }) => {
  const mapContainerRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [coordinateInput, setCoordinateInput] = useState({
    lat: lat.toString(),
    lon: lon.toString()
  });

  // Expose a resize function to parent via ref
  useEffect(() => {
    if (mapResizeRef) {
      mapResizeRef.current = () => {
        if (mapContainerRef.current && mapContainerRef.current.leafletElement) {
          mapContainerRef.current.leafletElement.invalidateSize();
        } else if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
          mapContainerRef.current.invalidateSize();
        }
      };
    }
  }, [mapResizeRef]);

  // ResizeObserver to auto-invalidate map size
  useEffect(() => {
    if (!mapDivRef.current) return;
    const observer = new window.ResizeObserver(() => {
      if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
        mapContainerRef.current.invalidateSize();
      }
    });
    observer.observe(mapDivRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon } = data[0];
        onMapChange(parseFloat(lat), parseFloat(lon));
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickLocation = (lat: number, lon: number, name: string) => {
    onMapChange(lat, lon);
    setSearchQuery(name);
  };

  // Update coordinate input when props change
  useEffect(() => {
    setCoordinateInput({
      lat: lat.toString(),
      lon: lon.toString()
    });
  }, [lat, lon]);

  const quickLocations = [
    { name: 'New York', lat: 40.7128, lon: -74.0060 },
    { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
    { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
    { name: 'Houston', lat: 29.7604, lon: -95.3698 },
    { name: 'Phoenix', lat: 33.4484, lon: -112.0740 },
    { name: 'Philadelphia', lat: 39.9526, lon: -75.1652 },
  ];

  return (
    <div className="space-y-4">
      {/* Address Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search for a location (address, city, etc.)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 text-white rounded-md transition-colors"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Quick Locations */}
      <div className="grid grid-cols-2 gap-2">
        {quickLocations.map((location) => (
          <button
            key={location.name}
            onClick={() => handleQuickLocation(location.lat, location.lon, location.name)}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
          >
            {location.name}
          </button>
        ))}
      </div>

      {/* Coordinate Input */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Latitude</label>
          <input
            type="number"
            step="any"
            value={coordinateInput.lat}
            onChange={(e) => {
              const newLat = e.target.value;
              setCoordinateInput(prev => ({ ...prev, lat: newLat }));
              const parsedLat = parseFloat(newLat);
              const parsedLon = parseFloat(coordinateInput.lon);
              if (!isNaN(parsedLat) && !isNaN(parsedLon) && parsedLat >= -90 && parsedLat <= 90 && parsedLon >= -180 && parsedLon <= 180) {
                onMapChange(parsedLat, parsedLon);
              }
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            placeholder="40.7128"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Longitude</label>
          <input
            type="number"
            step="any"
            value={coordinateInput.lon}
            onChange={(e) => {
              const newLon = e.target.value;
              setCoordinateInput(prev => ({ ...prev, lon: newLon }));
              const parsedLat = parseFloat(coordinateInput.lat);
              const parsedLon = parseFloat(newLon);
              if (!isNaN(parsedLat) && !isNaN(parsedLon) && parsedLat >= -90 && parsedLat <= 90 && parsedLon >= -180 && parsedLon <= 180) {
                onMapChange(parsedLat, parsedLon);
              }
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            placeholder="-74.0060"
          />
        </div>
      </div>

      {/* Map */}
      <div ref={mapDivRef} className="h-64 w-full rounded-lg overflow-hidden border border-gray-600">
        <MapContainer 
          center={[lat, lon]} 
          zoom={10} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          ref={mapContainerRef}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Street View">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Terrain">
              <TileLayer
                url='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          <MapUpdater lat={lat} lon={lon} onMapChange={onMapChange} />
        </MapContainer>
      </div>

      {/* Current Coordinates Display */}
      <div className="text-center text-sm text-gray-400">
        Current: {lat.toFixed(6)}, {lon.toFixed(6)}
      </div>
    </div>
  );
};

export default ImprovedMapSelector; 