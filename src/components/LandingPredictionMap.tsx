import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  LivePredictionComparison, 
  APRSPosition, 
  UnitSystem, 
  PredictionResult, 
  DummyFlightConfig
} from '../types';
import { findNearestRoad } from '../services/elevationService';
import { isValidCoordinate, filterValidCoordinates } from '../constants/index';
import { getGroundElevation } from '../services/elevationService';

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

// Custom component for smooth balloon marker animation
const AnimatedBalloonMarker: React.FC<{
  position: [number, number];
  previousPosition?: [number, number];
  isActive: boolean;
  altitude: number;
  speed: number;
  time: number;
  positionCount: number;
}> = ({ position, previousPosition, isActive, altitude, speed, time, positionCount }) => {
  const map = useMap();
  const markerRef = React.useRef<L.Marker | null>(null);
  const [currentPos, setCurrentPos] = React.useState(position);

  // Smooth animation between positions
  React.useEffect(() => {
    if (!isActive || !previousPosition || !markerRef.current) {
      setCurrentPos(position);
      return;
    }

    const startPos = previousPosition;
    const endPos = position;
    const duration = 2000; // 2 seconds animation
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function
      const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const easedProgress = easeInOutQuad(progress);
      
      // Interpolate position
      const lat = startPos[0] + (endPos[0] - startPos[0]) * easedProgress;
      const lng = startPos[1] + (endPos[1] - startPos[1]) * easedProgress;
      
      setCurrentPos([lat, lng]);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [position, previousPosition, isActive]);

  const formatDistance = (meters: number): string => {
    return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
  };

  return isValidCoordinate(currentPos[0], currentPos[1]) ? (
    <Marker
      position={currentPos}
      icon={balloonIcon}
      ref={markerRef}
    >
      <Popup>
        <div className="text-sm">
          <strong>🎈 Current Balloon Position</strong><br />
          Lat: {currentPos[0].toFixed(6)}<br />
          Lon: {currentPos[1].toFixed(6)}<br />
          Alt: {formatDistance(altitude)}<br />
          Speed: {speed?.toFixed(1) || 'N/A'} m/s<br />
          Time: {new Date(time * 1000).toLocaleTimeString()}<br />
          <span className="text-blue-600 font-semibold">
            Positions tracked: {positionCount}
          </span>
        </div>
      </Popup>
    </Marker>
  ) : null;
};

// Map control buttons component
const MapControls: React.FC<{
  onSnapToBalloon: () => void;
  onSnapToOriginalLanding: () => void;
  onSnapToUpdatedLanding: () => void;
  onFitAll: () => void;
  hasBalloon: boolean;
  hasUpdatedLanding: boolean;
}> = ({ 
  onSnapToBalloon, 
  onSnapToOriginalLanding, 
  onSnapToUpdatedLanding, 
  onFitAll,
  hasBalloon,
  hasUpdatedLanding
}) => {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <button
        onClick={onFitAll}
        className="px-3 py-2 bg-gray-800/90 hover:bg-gray-700 text-white text-sm rounded shadow-lg border border-gray-600 transition-colors"
        title="Fit all markers"
      >
        🗺️ Fit All
      </button>
      
      {hasBalloon && (
        <button
          onClick={onSnapToBalloon}
          className="px-3 py-2 bg-red-600/90 hover:bg-red-500 text-white text-sm rounded shadow-lg border border-red-500 transition-colors"
          title="Center on balloon"
        >
          🎈 Balloon
        </button>
      )}
      
      <button
        onClick={onSnapToOriginalLanding}
        className="px-3 py-2 bg-blue-600/90 hover:bg-blue-500 text-white text-sm rounded shadow-lg border border-blue-500 transition-colors"
        title="Center on original landing prediction"
      >
        🎯 Original
      </button>
      
      {hasUpdatedLanding && (
        <button
          onClick={onSnapToUpdatedLanding}
          className="px-3 py-2 bg-green-600/90 hover:bg-green-500 text-white text-sm rounded shadow-lg border border-green-500 transition-colors"
          title="Center on updated landing prediction"
        >
        ✨ Updated
        </button>
      )}
    </div>
  );
};

// Map controller to handle programmatic map movements
const MapController: React.FC<{
  balloonPosition?: [number, number];
  originalLandingPosition?: [number, number];
  updatedLandingPosition?: [number, number];
  bounds: L.LatLngBounds;
  snapToBalloon: boolean;
  snapToOriginal: boolean;
  snapToUpdated: boolean;
  fitAll: boolean;
  onSnapComplete: () => void;
}> = ({ 
  balloonPosition, 
  originalLandingPosition, 
  updatedLandingPosition, 
  bounds,
  snapToBalloon, 
  snapToOriginal, 
  snapToUpdated, 
  fitAll,
  onSnapComplete 
}) => {
  const map = useMap();

  React.useEffect(() => {
    if (snapToBalloon && balloonPosition) {
      map.setView(balloonPosition, 13, { animate: true, duration: 1 });
      onSnapComplete();
    }
  }, [snapToBalloon, balloonPosition, map, onSnapComplete]);

  React.useEffect(() => {
    if (snapToOriginal && originalLandingPosition) {
      map.setView(originalLandingPosition, 13, { animate: true, duration: 1 });
      onSnapComplete();
    }
  }, [snapToOriginal, originalLandingPosition, map, onSnapComplete]);

  React.useEffect(() => {
    if (snapToUpdated && updatedLandingPosition) {
      map.setView(updatedLandingPosition, 13, { animate: true, duration: 1 });
      onSnapComplete();
    }
  }, [snapToUpdated, updatedLandingPosition, map, onSnapComplete]);

  React.useEffect(() => {
    if (fitAll && bounds.isValid()) {
      setTimeout(() => {
        map.fitBounds(bounds, { padding: [20, 20], animate: true, duration: 1 });
        onSnapComplete();
      }, 100);
    }
  }, [fitAll, bounds, map, onSnapComplete]);

  return null;
};

const LandingPredictionMap: React.FC<LandingPredictionMapProps> = ({
  originalPrediction,
  liveComparison,
  unitSystem,
  currentPositions = [],
  dummyConfig
}) => {
  const [roadData, setRoadData] = React.useState<any>(null);
  const [snapToBalloon, setSnapToBalloon] = React.useState(false);
  const [snapToOriginal, setSnapToOriginal] = React.useState(false);
  const [snapToUpdated, setSnapToUpdated] = React.useState(false);
  const [fitAll, setFitAll] = React.useState(false);
  const [terrainElevation, setTerrainElevation] = React.useState<number>(0);
  const [lastRoadFetchKey, setLastRoadFetchKey] = React.useState<string>('');

  const formatDistance = (meters: number): string => {
    return unitSystem === 'imperial' ? 
      `${(meters * 3.28084).toFixed(0)}ft` : 
      `${meters.toFixed(0)}m`;
  };

  // Fetch terrain elevation for current balloon position
  React.useEffect(() => {
    const fetchTerrainElevation = async () => {
      if (currentPositions.length === 0) return;
      
      const currentPos = currentPositions[currentPositions.length - 1];
      if (!isValidCoordinate(currentPos.lat, currentPos.lng)) return;
      
      try {
        const elevation = await getGroundElevation(currentPos.lat, currentPos.lng);
        setTerrainElevation(elevation);
      } catch (error) {
        console.warn('Failed to get terrain elevation for search circle:', error);
        setTerrainElevation(0); // Fallback to sea level
      }
    };

    fetchTerrainElevation();
  }, [currentPositions]);

  // Fetch road data
  React.useEffect(() => {
    const fetchRoadData = async () => {
      const landingPoint = liveComparison?.updatedPrediction?.landingPoint || originalPrediction.landingPoint;
      
      // Create a key to detect significant changes in landing point
      const currentKey = `${landingPoint.lat.toFixed(4)},${landingPoint.lon.toFixed(4)}`;
      
      // Only fetch if landing point has changed significantly (>100m)
      if (currentKey !== lastRoadFetchKey) {
        try {
          const road = await findNearestRoad(landingPoint.lat, landingPoint.lon);
          setRoadData(road);
          setLastRoadFetchKey(currentKey);
        } catch (error) {
          console.warn('Failed to fetch road data:', error);
        }
      }
    };

    // Debounce the fetch operation
    const timeoutId = setTimeout(fetchRoadData, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [originalPrediction.landingPoint, liveComparison?.updatedPrediction?.landingPoint, lastRoadFetchKey]);

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

  // Memoize search circle parameters to reduce recalculation
  const searchCircleParams = React.useMemo(() => {
    if (currentPositions.length === 0) return null;
    
    const currentPos = currentPositions[currentPositions.length - 1];
    if (!isValidCoordinate(currentPos.lat, currentPos.lng)) return null;
    
    const currentAltitudeFt = (currentPos.altitude || 0) * 3.28084;
    const isInDescentPhase = liveComparison?.actualMetrics.flightPhase.phase === 'descent';
    
    // Calculate search altitude threshold: terrain elevation + 2000ft
    const terrainElevationFt = terrainElevation * 3.28084;
    const searchAltitudeThresholdFt = terrainElevationFt + 2000;
    const isBelowSearchAltitude = currentAltitudeFt < searchAltitudeThresholdFt;
    
    if (!isInDescentPhase || !isBelowSearchAltitude) return null;
    
    // Stable search radius calculation with hysteresis to prevent flickering
    const altitudeM = currentPos.altitude || 0;
    const windSpeed = Math.min(currentPos.speed || 5, 25); // Cap wind speed to prevent extreme values
    const baseRadius = Math.max(100, altitudeM * 0.5);
    const windFactor = 1 + (windSpeed / 10);
    const estimatedDescentTime = altitudeM / 5;
    const potentialDrift = windSpeed * estimatedDescentTime;
    const searchRadius = Math.min(2000, (baseRadius + potentialDrift) * windFactor);
    
    return {
      center: [currentPos.lat, currentPos.lng] as [number, number],
      radius: searchRadius,
      altitude: currentAltitudeFt,
      terrainElevation: terrainElevationFt,
      searchThreshold: searchAltitudeThresholdFt
    };
  }, [currentPositions, liveComparison?.actualMetrics.flightPhase.phase, terrainElevation]);

  // Calculate map bounds to fit all points
  const bounds = React.useMemo(() => {
    const points: [number, number][] = [];
    
    // Add launch and landing points if they exist and are valid
    if (originalPrediction?.launchPoint && isValidCoordinate(originalPrediction.launchPoint.lat, originalPrediction.launchPoint.lon)) {
      points.push([originalPrediction.launchPoint.lat, originalPrediction.launchPoint.lon]);
    }
    if (originalPrediction?.landingPoint && isValidCoordinate(originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon)) {
      points.push([originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon]);
    }
    
    if (liveComparison?.updatedPrediction && isValidCoordinate(liveComparison.updatedPrediction.landingPoint.lat, liveComparison.updatedPrediction.landingPoint.lon)) {
      points.push([
        liveComparison.updatedPrediction.landingPoint.lat,
        liveComparison.updatedPrediction.landingPoint.lon
      ]);
    }
    
    // Include valid balloon positions
    currentPositions.forEach(pos => {
      if (isValidCoordinate(pos.lat, pos.lng)) {
        points.push([pos.lat, pos.lng]);
      }
    });
    
    // Include search circle bounds if active
    if (searchCircleParams) {
      const radiusInDegrees = searchCircleParams.radius / 111320;
      const [lat, lng] = searchCircleParams.center;
      points.push([lat + radiusInDegrees, lng]);
      points.push([lat - radiusInDegrees, lng]);
      points.push([lat, lng + radiusInDegrees]);
      points.push([lat, lng - radiusInDegrees]);
    }
    
    // Include assumed landing location if available and valid
    if (dummyConfig?.assumedLandingLocation && isValidCoordinate(dummyConfig.assumedLandingLocation.lat, dummyConfig.assumedLandingLocation.lng)) {
      const assumedLoc = dummyConfig.assumedLandingLocation;
      points.push([assumedLoc.lat, assumedLoc.lng]);
      
      // Add search circle bounds for assumed landing
      const searchRadius = 500;
      const radiusInDegrees = searchRadius / 111320;
      points.push([assumedLoc.lat + radiusInDegrees, assumedLoc.lng]);
      points.push([assumedLoc.lat - radiusInDegrees, assumedLoc.lng]);
      points.push([assumedLoc.lat, assumedLoc.lng + radiusInDegrees]);
      points.push([assumedLoc.lat, assumedLoc.lng - radiusInDegrees]);
    }

    // Include road point if available and valid
    if (roadData && isValidCoordinate(roadData.roadLat, roadData.roadLon)) {
      points.push([roadData.roadLat, roadData.roadLon]);
    }
    
    // Ensure we have at least one valid point for bounds
    if (points.length === 0) {
      // Fallback to a default location if no valid points
      points.push([40.7128, -74.0060]); // NYC as fallback
    }
    
    return L.latLngBounds(points);
  }, [originalPrediction, liveComparison, currentPositions, dummyConfig, roadData, searchCircleParams]);

  // Calculate center point with better initialization
  const center = React.useMemo(() => {
    // Prefer launch point for initial center, then landing point, then bounds center
    if (originalPrediction?.launchPoint && isValidCoordinate(originalPrediction.launchPoint.lat, originalPrediction.launchPoint.lon)) {
      return [originalPrediction.launchPoint.lat, originalPrediction.launchPoint.lon] as [number, number];
    }
    if (originalPrediction?.landingPoint && isValidCoordinate(originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon)) {
      return [originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon] as [number, number];
    }
    const centerBounds = bounds.getCenter();
    return [centerBounds.lat, centerBounds.lng] as [number, number];
  }, [originalPrediction, bounds]);

  // Get current balloon position for animation
  const currentBalloonPosition = React.useMemo(() => {
    if (currentPositions.length === 0) return undefined;
    const pos = currentPositions[currentPositions.length - 1];
    return isValidCoordinate(pos.lat, pos.lng) ? [pos.lat, pos.lng] as [number, number] : undefined;
  }, [currentPositions]);

  const previousBalloonPosition = React.useMemo(() => {
    if (currentPositions.length < 2) return undefined;
    const pos = currentPositions[currentPositions.length - 2];
    return isValidCoordinate(pos.lat, pos.lng) ? [pos.lat, pos.lng] as [number, number] : undefined;
  }, [currentPositions]);

  // Snap-to handlers
  const handleSnapToBalloon = () => setSnapToBalloon(true);
  const handleSnapToOriginal = () => setSnapToOriginal(true);
  const handleSnapToUpdated = () => setSnapToUpdated(true);
  const handleFitAll = () => setFitAll(true);
  
  const handleSnapComplete = () => {
    setSnapToBalloon(false);
    setSnapToOriginal(false);
    setSnapToUpdated(false);
    setFitAll(false);
  };

  // Get position coordinates for snap buttons
  const originalLandingPosition = React.useMemo(() => {
    if (!originalPrediction?.landingPoint) return undefined;
    return isValidCoordinate(originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon) 
      ? [originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon] as [number, number]
      : undefined;
  }, [originalPrediction]);

  const updatedLandingPosition = React.useMemo(() => {
    if (!liveComparison?.updatedPrediction?.landingPoint) return undefined;
    return isValidCoordinate(liveComparison.updatedPrediction.landingPoint.lat, liveComparison.updatedPrediction.landingPoint.lon)
      ? [liveComparison.updatedPrediction.landingPoint.lat, liveComparison.updatedPrediction.landingPoint.lon] as [number, number]
      : undefined;
  }, [liveComparison]);

  // Debug logging for map paths
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Map Debug Info:', {
        originalPathLength: originalPrediction.path?.length || 0,
        updatedPathLength: liveComparison?.updatedPrediction?.path?.length || 0,
        currentPositionsLength: currentPositions.length,
        hasLiveComparison: !!liveComparison,
        boundsValid: bounds.isValid(),
        centerPoint: center
      });
    }
  }, [originalPrediction.path, liveComparison?.updatedPrediction?.path, currentPositions.length, liveComparison, bounds, center]);

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-700 relative">
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        bounds={bounds.isValid() ? bounds : undefined}
        boundsOptions={{ padding: [20, 20] }}
        key={`map-${center[0]}-${center[1]}`} // Force remount when center changes significantly
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController
          balloonPosition={currentBalloonPosition}
          originalLandingPosition={originalLandingPosition}
          updatedLandingPosition={updatedLandingPosition}
          bounds={bounds}
          snapToBalloon={snapToBalloon}
          snapToOriginal={snapToOriginal}
          snapToUpdated={snapToUpdated}
          fitAll={fitAll}
          onSnapComplete={handleSnapComplete}
        />
        
        {/* Launch Point */}
        {originalPrediction?.launchPoint && isValidCoordinate(originalPrediction.launchPoint.lat, originalPrediction.launchPoint.lon) && (
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
        )}

        {/* Original Landing Prediction */}
        {originalPrediction?.landingPoint && isValidCoordinate(originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon) && (
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
        )}

        {/* Updated Landing Prediction */}
        {liveComparison?.updatedPrediction && isValidCoordinate(liveComparison.updatedPrediction.landingPoint.lat, liveComparison.updatedPrediction.landingPoint.lon) && (
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
            {originalPrediction?.landingPoint && liveComparison?.updatedPrediction?.landingPoint && 
             isValidCoordinate(originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon) &&
             isValidCoordinate(liveComparison.updatedPrediction.landingPoint.lat, liveComparison.updatedPrediction.landingPoint.lon) && (
              <Polyline
                positions={[
                  [originalPrediction.landingPoint.lat, originalPrediction.landingPoint.lon],
                  [liveComparison.updatedPrediction.landingPoint.lat, liveComparison.updatedPrediction.landingPoint.lon]
                ]}
                color="#EF4444"
                weight={2}
                dashArray="5, 5"
              />
            )}
          </>
        )}

        {/* Nearest Road Point */}
        {roadData && isValidCoordinate(roadData.roadLat, roadData.roadLon) && (
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
        {(() => {
          if (!originalPrediction.path || originalPrediction.path.length <= 1) return null;
          const validPositions = filterValidCoordinates(originalPrediction.path.map(point => [point.lat, point.lon]));
          return validPositions.length > 1 ? (
            <Polyline
              positions={validPositions}
              color="#6B7280"
              weight={2}
              opacity={0.7}
            />
          ) : null;
        })()}
        
        {/* Updated flight path (green) */}
        {(() => {
          if (!liveComparison?.updatedPrediction?.path || liveComparison.updatedPrediction.path.length <= 1) return null;
          const validPositions = filterValidCoordinates(liveComparison.updatedPrediction.path.map(point => [point.lat, point.lon]));
          return validPositions.length > 1 ? (
            <Polyline
              positions={validPositions}
              color="#10B981"
              weight={2}
              opacity={0.8}
            />
          ) : null;
        })()}
        
        {/* Balloon's actual flight history (red) */}
        {(() => {
          if (currentPositions.length <= 1) return null;
          const validPositions = filterValidCoordinates(currentPositions.map(pos => [pos.lat, pos.lng]));
          return validPositions.length > 1 ? (
            <Polyline
              positions={validPositions}
              color="#DC2626"
              weight={3}
              opacity={0.9}
            />
          ) : null;
        })()}
        
        {/* Current balloon position with smooth animation */}
        {currentBalloonPosition && (
          <AnimatedBalloonMarker
            position={currentBalloonPosition}
            previousPosition={previousBalloonPosition}
            isActive={currentPositions.length > 1}
            altitude={currentPositions[currentPositions.length - 1]?.altitude || 0}
            speed={currentPositions[currentPositions.length - 1]?.speed || 0}
            time={currentPositions[currentPositions.length - 1]?.time || 0}
            positionCount={currentPositions.length}
          />
        )}

        {/* Search Area Circle - shown during descent below 2000ft above terrain */}
        {searchCircleParams && (
          <Circle
            center={searchCircleParams.center}
            radius={searchCircleParams.radius}
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
                <span className="text-orange-600 font-semibold">Active below 2000ft above terrain</span><br />
                Radius: {formatDistance(searchCircleParams.radius)}<br />
                Current Alt: {Math.round(searchCircleParams.altitude)}ft<br />
                Terrain Elev: {Math.round(searchCircleParams.terrainElevation)}ft<br />
                Threshold: {Math.round(searchCircleParams.searchThreshold)}ft<br />
                <span className="text-gray-600 text-xs">
                  Search area activated when balloon descends to within 2000ft of ground
                </span>
              </div>
            </Popup>
          </Circle>
        )}
        
        {/* Assumed landing location and search circle */}
        {dummyConfig?.assumedLandingLocation && isValidCoordinate(dummyConfig.assumedLandingLocation.lat, dummyConfig.assumedLandingLocation.lng) && (
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
      
      {/* Map control buttons overlay */}
      <MapControls
        onSnapToBalloon={handleSnapToBalloon}
        onSnapToOriginalLanding={handleSnapToOriginal}
        onSnapToUpdatedLanding={handleSnapToUpdated}
        onFitAll={handleFitAll}
        hasBalloon={!!currentBalloonPosition}
        hasUpdatedLanding={!!updatedLandingPosition}
      />
    </div>
  );
};

export default LandingPredictionMap; 