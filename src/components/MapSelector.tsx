import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';

// Fix for default icon path issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapSelectorProps {
  lat: number;
  lon: number;
  onMapChange: (lat: number, lon: number) => void;
}

const MapUpdater: React.FC<{ lat: number, lon: number, onMapChange: (lat: number, lon: number) => void }> = ({ lat, lon, onMapChange }) => {
  const map = useMap();
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    // When the coordinates change (e.g. from text input), pan to the new location.
    // This preserves the user's current zoom level for a better experience.
    map.panTo([lat, lon]);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    }
  }, [lat, lon, map]);

  map.off('click').on('click', (e) => {
    onMapChange(e.latlng.lat, e.latlng.lng);
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onMapChange(lat, lng);
        }
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

const MapSelector: React.FC<MapSelectorProps> = ({ lat, lon, onMapChange }) => {
  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-600">
      <MapContainer center={[lat, lon]} zoom={10} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
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
  );
};

export default MapSelector;