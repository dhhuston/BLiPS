import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { 
  LivePredictionComparison, 
  APRSPosition, 
  UnitSystem, 
  PredictionResult, 
  DummyFlightConfig
} from '../types';
import { findNearestRoad } from '../services/elevationService';

// Fix for default icon path issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create custom icons for different prediction types
const createCustomIcon = (color: string, symbol: string) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 14px;">${symbol}</div>`,
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

const originalLandingIcon = createCustomIcon('#3B82F6', 'O'); // Blue for original
const updatedLandingIcon = createCustomIcon('#10B981', 'U'); // Green for updated
const launchIcon = createCustomIcon('#F59E0B', 'L'); // Orange for launch
const balloonIcon = createCustomIcon('#DC2626', 'B'); // Red for balloon
const roadIcon = createCustomIcon('#8B5CF6', '🚗'); // Purple for road

interface LandingPredictionMapProps {
  originalPrediction: PredictionResult;
  liveComparison: LivePredictionComparison | null;
  unitSystem: UnitSystem;
  currentPositions?: APRSPosition[];
  dummyConfig?: DummyFlightConfig;
}

const LandingPredictionMap: React.FC<LandingPredictionMapProps> = ({
  originalPrediction,
  liveComparison,
  unitSystem,
  currentPositions = [],
  dummyConfig
}) => {
  const isImperial = unitSystem === 'imperial';
  const [roadData, setRoadData] = React.useState<{
    roadLat: number;
    roadLon: number;
    distance: number;
    roadName?: string;
  } | null>(null);
  
  const formatDistance = (meters: number): string => {
    if (isImperial) {
      const miles = meters * 0.000621371;
      return miles < 1 ? `${Math.round(meters * 3.28084)}ft` : `${miles.toFixed(1)}mi`;
    }
    return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
  };

  // Fetch road data when landing point changes
  React.useEffect(() => {
    const fetchRoadData = async () => {
      const landingPoint = liveComparison?.updatedPrediction?.landingPoint || originalPrediction.landingPoint;
      const road = await findNearestRoad(landingPoint.lat, landingPoint.lon);
      setRoadData(road);
    };

    fetchRoadData();
  }, [originalPrediction.landingPoint, liveComparison?.updatedPrediction?.landingPoint]);

  // Helper function to get terrain warning color
  const getTerrainWarningColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-500';
      case 'moderate': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  // Helper function to render terrain warnings
  const renderTerrainWarnings = (terrainAnalysis: any) => {
    if (!terrainAnalysis) return null;
    
    return (
      <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
        <div className={`font-semibold ${getTerrainWarningColor(terrainAnalysis.risk)}`}>
          🏔️ {terrainAnalysis.summary}
        </div>
        <div className="text-gray-600 mt-1">
          Risk: <span className={getTerrainWarningColor(terrainAnalysis.risk)}>{terrainAnalysis.risk}</span><br />
          Elevation: {Math.round(terrainAnalysis.details.mean)}m<br />
          Slope: {terrainAnalysis.details.maxSlope.toFixed(1)}m max
        </div>
        {terrainAnalysis.risk === 'high' && (
          <div className="text-red-600 font-semibold mt-1">
            ⚠️ Difficult terrain - consider alternative landing zones
          </div>
        )}
      </div>
    );
  };

  // Calculate map bounds to fit all points
  const bounds = React.useMemo(() => {
    const points: [number, number][] = [
      [originalPrediction.launchPoint.lat, originalPrediction.launchPoint.lon],
      [originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon]
    ];
    
    if (liveComparison?.updatedPrediction) {
      points.push([
        liveComparison.updatedPrediction.landingPoint.lat,
        liveComparison.updatedPrediction.landingPoint.lon
      ]);
    }
    
    // Include balloon's current position and flight history
    if (currentPositions.length > 0) {
      currentPositions.forEach(pos => {
        points.push([pos.lat, pos.lng]);
      });
      
      // If showing search area, include circle bounds
      const currentPos = currentPositions[currentPositions.length - 1];
      const currentAltitudeFt = (currentPos.altitude || 0) * 3.28084;
      const isInDescentPhase = liveComparison?.actualMetrics.flightPhase.phase === 'descent';
      const isBelowSearchAltitude = currentAltitudeFt < 2000;
      
      if (isInDescentPhase && isBelowSearchAltitude) {
        // Calculate search radius and add circle bounds
        const altitudeM = currentPos.altitude || 0;
        const windSpeed = currentPos.speed || 5;
        const baseRadius = Math.max(100, altitudeM * 0.5);
        const windFactor = 1 + (windSpeed / 10);
        const estimatedDescentTime = altitudeM / 5;
        const potentialDrift = windSpeed * estimatedDescentTime;
        const searchRadius = Math.min(2000, (baseRadius + potentialDrift) * windFactor);
        
        // Add points around the circle to ensure it's visible
        const radiusInDegrees = searchRadius / 111320; // Rough conversion to degrees
        points.push([currentPos.lat + radiusInDegrees, currentPos.lng]);
        points.push([currentPos.lat - radiusInDegrees, currentPos.lng]);
        points.push([currentPos.lat, currentPos.lng + radiusInDegrees]);
        points.push([currentPos.lat, currentPos.lng - radiusInDegrees]);
      }
    }
    
    // Include assumed landing location if available
    if (dummyConfig?.assumedLandingLocation) {
      const assumedLoc = dummyConfig.assumedLandingLocation;
      points.push([assumedLoc.lat, assumedLoc.lng]);
      
      // Add search circle bounds for assumed landing
      const searchRadius = 500; // 500m search radius
      const radiusInDegrees = searchRadius / 111320;
      points.push([assumedLoc.lat + radiusInDegrees, assumedLoc.lng]);
      points.push([assumedLoc.lat - radiusInDegrees, assumedLoc.lng]);
      points.push([assumedLoc.lat, assumedLoc.lng + radiusInDegrees]);
      points.push([assumedLoc.lat, assumedLoc.lng - radiusInDegrees]);
    }

    // Include road point if available
    if (roadData) {
      points.push([roadData.roadLat, roadData.roadLon]);
    }
    
    return L.latLngBounds(points);
  }, [originalPrediction, liveComparison, currentPositions, dummyConfig, roadData]);

  // Calculate center point
  const center = React.useMemo(() => {
    const centerBounds = bounds.getCenter();
    return [centerBounds.lat, centerBounds.lng] as [number, number];
  }, [bounds]);

  // Debug logging for map paths
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Map Debug Info:', {
        originalPathLength: originalPrediction.path?.length || 0,
        updatedPathLength: liveComparison?.updatedPrediction?.path?.length || 0,
        currentPositionsLength: currentPositions.length,
        hasLiveComparison: !!liveComparison
      });
    }
  }, [originalPrediction.path, liveComparison?.updatedPrediction?.path, currentPositions.length, liveComparison]);

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-700">
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        bounds={bounds}
        boundsOptions={{ padding: [20, 20] }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Launch Point */}
        <Marker
          position={[originalPrediction.launchPoint.lat, originalPrediction.launchPoint.lon]}
          icon={launchIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>Launch Point</strong><br />
              Lat: {originalPrediction.launchPoint.lat.toFixed(6)}<br />
              Lon: {originalPrediction.launchPoint.lon.toFixed(6)}<br />
              Alt: {formatDistance(originalPrediction.launchPoint.altitude)}
            </div>
          </Popup>
        </Marker>

        {/* Original Landing Prediction */}
        <Marker
          position={[originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon]}
          icon={originalLandingIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>Original Landing Prediction</strong><br />
              Lat: {originalPrediction.landingPoint.lat.toFixed(6)}<br />
              Lon: {originalPrediction.landingPoint.lon.toFixed(6)}<br />
              Time: {new Date(originalPrediction.landingPoint.time * 1000).toLocaleTimeString()}
              {renderTerrainWarnings(originalPrediction.terrainAnalysis)}
            </div>
          </Popup>
        </Marker>

        {/* Updated Landing Prediction */}
        {liveComparison?.updatedPrediction && (
          <>
            <Marker
              position={[
                liveComparison.updatedPrediction.landingPoint.lat,
                liveComparison.updatedPrediction.landingPoint.lon
              ]}
              icon={updatedLandingIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Updated Landing Prediction</strong><br />
                  Lat: {liveComparison.updatedPrediction.landingPoint.lat.toFixed(6)}<br />
                  Lon: {liveComparison.updatedPrediction.landingPoint.lon.toFixed(6)}<br />
                  Time: {new Date(liveComparison.updatedPrediction.landingPoint.time * 1000).toLocaleTimeString()}<br />
                  <span className="text-green-600 font-semibold">
                    Accuracy: {(liveComparison.accuracy.trajectoryAccuracy * 100).toFixed(1)}%
                  </span>
                  {renderTerrainWarnings(liveComparison.updatedPrediction.terrainAnalysis)}
                </div>
              </Popup>
            </Marker>
            
            {/* Line connecting original and updated predictions */}
            <Polyline
              positions={[
                [originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon],
                [liveComparison.updatedPrediction.landingPoint.lat, liveComparison.updatedPrediction.landingPoint.lon]
              ]}
              color="#EF4444"
              weight={2}
              dashArray="5, 5"
            />
          </>
        )}

        {/* Nearest Road Point */}
        {roadData && (
          <Marker
            position={[roadData.roadLat, roadData.roadLon]}
            icon={roadIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong>🚗 Nearest Road Access</strong><br />
                Road: {roadData.roadName}<br />
                Distance: {formatDistance(roadData.distance)}<br />
                Lat: {roadData.roadLat.toFixed(6)}<br />
                Lon: {roadData.roadLon.toFixed(6)}<br />
                <span className="text-purple-600 font-semibold">
                  Vehicle access point
                </span>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Flight path - original prediction (gray) */}
        {originalPrediction.path && originalPrediction.path.length > 1 && (
          <Polyline
            positions={originalPrediction.path.map(point => [point.lat, point.lon])}
            color="#6B7280"
            weight={2}
            opacity={0.7}
          />
        )}
        
        {/* Updated flight path (green) */}
        {liveComparison?.updatedPrediction?.path && liveComparison.updatedPrediction.path.length > 1 && (
          <Polyline
            positions={liveComparison.updatedPrediction.path.map(point => [point.lat, point.lon])}
            color="#10B981"
            weight={2}
            opacity={0.8}
          />
        )}
        
        {/* Balloon's actual flight history (red) */}
        {currentPositions.length > 1 && (
          <Polyline
            positions={currentPositions.map(pos => [pos.lat, pos.lng])}
            color="#DC2626"
            weight={3}
            opacity={0.9}
          />
        )}
        
        {/* Current balloon position */}
        {currentPositions.length > 0 && (
          <Marker
            position={[currentPositions[currentPositions.length - 1].lat, currentPositions[currentPositions.length - 1].lng]}
            icon={balloonIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong>🎈 Current Balloon Position</strong><br />
                Lat: {currentPositions[currentPositions.length - 1].lat.toFixed(6)}<br />
                Lon: {currentPositions[currentPositions.length - 1].lng.toFixed(6)}<br />
                Alt: {formatDistance(currentPositions[currentPositions.length - 1].altitude || 0)}<br />
                Speed: {currentPositions[currentPositions.length - 1].speed?.toFixed(1) || 'N/A'} m/s<br />
                Time: {new Date(currentPositions[currentPositions.length - 1].time * 1000).toLocaleTimeString()}<br />
                <span className="text-blue-600 font-semibold">
                  Positions tracked: {currentPositions.length}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Search Area Circle - shown during descent below 2000ft */}
        {(() => {
          if (currentPositions.length === 0) return null;
          
          const currentPos = currentPositions[currentPositions.length - 1];
          const currentAltitudeFt = (currentPos.altitude || 0) * 3.28084; // Convert to feet
          
          // Show search area only during descent phase and below 2000ft
          const isInDescentPhase = liveComparison?.actualMetrics.flightPhase.phase === 'descent';
          const isBelowSearchAltitude = currentAltitudeFt < 2000;
          
          if (!isInDescentPhase || !isBelowSearchAltitude) return null;
          
          // Calculate search radius based on altitude and wind conditions
          const calculateSearchRadius = () => {
            const altitudeM = currentPos.altitude || 0;
            const windSpeed = currentPos.speed || 5; // m/s, fallback to 5 m/s
            
            // Base radius: higher altitude = larger search area
            const baseRadius = Math.max(100, altitudeM * 0.5); // Minimum 100m, scales with altitude
            
            // Wind factor: stronger winds = larger search area
            const windFactor = 1 + (windSpeed / 10); // 10 m/s wind adds 100% to radius
            
            // Time factor: estimate time to land and potential drift
            const estimatedDescentTime = altitudeM / 5; // Assume 5 m/s descent rate
            const potentialDrift = windSpeed * estimatedDescentTime;
            
            // Final radius combines all factors
            const finalRadius = Math.min(2000, (baseRadius + potentialDrift) * windFactor); // Cap at 2km
            
            return finalRadius;
          };
          
          const searchRadius = calculateSearchRadius();
          
          return (
            <Circle
              center={[currentPos.lat, currentPos.lng]}
              radius={searchRadius}
              pathOptions={{
                color: '#FFA500',
                weight: 3,
                opacity: 0.8,
                fillColor: '#FFA500',
                fillOpacity: 0.2,
                dashArray: '10, 5'
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>🎯 Search Area</strong><br />
                  <span className="text-orange-600 font-semibold">Active below 2000ft</span><br />
                  Radius: {formatDistance(searchRadius)}<br />
                  Current Alt: {Math.round(currentAltitudeFt)}ft<br />
                  Wind Speed: {(currentPos.speed || 0).toFixed(1)} m/s<br />
                  Est. Time to Land: {Math.round((currentPos.altitude || 0) / 5 / 60)}min<br />
                  <span className="text-gray-600 text-xs">
                    Updates with balloon position & wind
                  </span>
                </div>
              </Popup>
            </Circle>
          );
        })()}
        
        {/* Assumed landing location and search circle */}
        {dummyConfig?.assumedLandingLocation && (
          <>
            <Marker
              position={[dummyConfig.assumedLandingLocation.lat, dummyConfig.assumedLandingLocation.lng]}
              icon={createCustomIcon('#FF6B35', 'S')}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Assumed Landing Location</strong><br />
                  Lat: {dummyConfig.assumedLandingLocation.lat.toFixed(6)}<br />
                  Lon: {dummyConfig.assumedLandingLocation.lng.toFixed(6)}<br />
                  Time: {new Date(dummyConfig.assumedLandingLocation.time * 1000).toLocaleTimeString()}<br />
                  <span className="text-orange-600 font-semibold">
                    Beacon lost - search area
                  </span>
                </div>
              </Popup>
            </Marker>
            
            <Circle
              center={[dummyConfig.assumedLandingLocation.lat, dummyConfig.assumedLandingLocation.lng]}
              radius={500}
              pathOptions={{
                color: '#FF6B35',
                weight: 2,
                opacity: 0.8,
                fillColor: '#FF6B35',
                fillOpacity: 0.15,
                dashArray: '5, 5'
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>🔍 Search Area</strong><br />
                  <span className="text-orange-600 font-semibold">Beacon lost at low altitude</span><br />
                  Radius: {formatDistance(500)}<br />
                  Status: Assumed landed<br />
                  <span className="text-gray-600 text-xs">
                    Based on predicted landing location
                  </span>
                </div>
              </Popup>
            </Circle>
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default LandingPredictionMap; 