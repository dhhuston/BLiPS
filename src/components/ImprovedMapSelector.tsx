import React, { useEffect, useMemo, useRef, useState, RefObject } from 'react';
import { MapContainer, TileLayer, Marker, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import GeocodingService from '../services/geocodingService';

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
    let timeoutId: ReturnType<typeof setTimeout>;
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
      const geocodingService = GeocodingService.create();
      const coordinates = await geocodingService.getCoordinates(searchQuery);
      
      if (coordinates) {
        onMapChange(coordinates.lat, coordinates.lon);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Update coordinate input when props change
  useEffect(() => {
    setCoordinateInput({
      lat: lat.toString(),
      lon: lon.toString()
    });
  }, [lat, lon]);

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

      {/* Interactive Map */}
      <div ref={mapDivRef} className="h-64 sm:h-80 md:h-96 w-full rounded-lg overflow-hidden border border-gray-600 shadow-lg">
        <MapContainer 
          center={[lat, lon]} 
          zoom={10} 
          scrollWheelZoom={true} 
          touchZoom={true}
          style={{ height: '100%', width: '100%' }}
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
          </LayersControl>
          <MapUpdater lat={lat} lon={lon} onMapChange={onMapChange} />
        </MapContainer>
      </div>
      
      {/* Coordinate Display */}
      <div className="text-sm text-gray-400 text-center">
        Click on the map or drag the marker to set launch coordinates
      </div>
    </div>
  );
};

export default ImprovedMapSelector; 