import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { 
  LivePredictionComparison, 
  APRSPosition, 
  UnitSystem, 
  LaunchParams, 
  PredictionResult, 
  WeatherData,
  DummyFlightConfig
} from '../types';
import { createLivePredictionComparison } from '../services/liveAnalysisService';
import { DummyFlightSimulator, createDummyFlightSimulator } from '../services/dummyFlightSimulator';
import { metersToFeet } from '../constants';

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
  
  const formatDistance = (meters: number): string => {
    if (isImperial) {
      const miles = meters * 0.000621371;
      return miles < 1 ? `${Math.round(meters * 3.28084)}ft` : `${miles.toFixed(1)}mi`;
    }
    return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
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
    
    return L.latLngBounds(points);
  }, [originalPrediction, liveComparison, currentPositions]);

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

interface LivePredictionPanelProps {
  originalPrediction: PredictionResult;
  launchParams: LaunchParams;
  weatherData: WeatherData | null;
  unitSystem: UnitSystem;
  aprsPositions?: APRSPosition[];
}

const LivePredictionPanel: React.FC<LivePredictionPanelProps> = ({
  originalPrediction,
  launchParams,
  weatherData,
  unitSystem,
  aprsPositions = []
}) => {
  const [liveComparison, setLiveComparison] = useState<LivePredictionComparison | null>(null);
  const [dummySimulator, setDummySimulator] = useState<DummyFlightSimulator | null>(null);
  const [dummyConfig, setDummyConfig] = useState<DummyFlightConfig>({
    enabled: false,
    scenario: 'standard',
    beaconInterval: 15, // 15 seconds for fast beacon timing
    startTime: Date.now() / 1000,
    currentTime: Date.now() / 1000,
    noiseLevel: 0.3
  });
  const [simulationSpeed, setSimulationSpeed] = useState(1); // 1x = real-time
  const [simulationTime, setSimulationTime] = useState(0);
  const [nextBeaconCountdown, setNextBeaconCountdown] = useState(0);
  const [dataSource, setDataSource] = useState<'simulation' | 'aprs'>('simulation');
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isImperial = unitSystem === 'imperial';

  // Initialize dummy simulator
  useEffect(() => {
    if (originalPrediction && launchParams) {
      const simulator = createDummyFlightSimulator(launchParams, originalPrediction, dummyConfig, weatherData);
      setDummySimulator(simulator);
    }
  }, [originalPrediction, launchParams, weatherData]);

  // Memoize positions to prevent unnecessary recalculations
  // Only update when simulation time changes (which happens at beacon intervals)
  const currentPositions = React.useMemo(() => {
    if (dataSource === 'aprs') {
      // Use real APRS data from aprs.fi for the callsign
      return aprsPositions;
    } else if (dataSource === 'simulation' && dummyConfig.enabled) {
      // Use dummy simulation data
      if (dummySimulator) {
        const positions = dummySimulator.generatePositions();
        
        // Debug log to verify position stability
        if (positions.length > 0 && process.env.NODE_ENV === 'development') {
          const latest = positions[positions.length - 1];
          console.log(`[${simulationTime}s] Generated ${positions.length} positions, latest: Alt=${latest.altitude?.toFixed(1)}m, Lat=${latest.lat.toFixed(6)}`);
        }
        
        return positions;
      }
    }
    return [];
  }, [dataSource, aprsPositions, dummyConfig.enabled, simulationTime, dummySimulator]);

  // Track last processed position to prevent unnecessary recalculations
  const lastProcessedPositionRef = useRef<APRSPosition | null>(null);
  
  // Update live comparison when positions actually change
  useEffect(() => {
    if (!weatherData) return;

    if (currentPositions.length > 0) {
      const lastPosition = currentPositions[currentPositions.length - 1];
      const lastProcessed = lastProcessedPositionRef.current;
      
      // Only update if we have a truly new position
      const shouldUpdate = !lastProcessed || 
        lastProcessed.time !== lastPosition.time ||
        lastProcessed.altitude !== lastPosition.altitude ||
        lastProcessed.lat !== lastPosition.lat ||
        lastProcessed.lng !== lastPosition.lng;
      
      if (shouldUpdate) {
        const comparison = createLivePredictionComparison(
          currentPositions,
          originalPrediction,
          launchParams,
          weatherData
        );
        setLiveComparison(comparison);
        lastProcessedPositionRef.current = lastPosition;
      }
    } else {
      setLiveComparison(null);
      lastProcessedPositionRef.current = null;
    }
  }, [currentPositions, originalPrediction, launchParams, weatherData]);

  // Handle dummy simulation controls
  const startDummySimulation = () => {
    if (!dummySimulator) return;
    
    const config = {
      ...dummyConfig,
      enabled: true,
      startTime: Date.now() / 1000,
      currentTime: Date.now() / 1000
    };
    
    setDummyConfig(config);
    dummySimulator.updateConfig(config);
    setSimulationTime(0);

    // Start simulation timer - update based on selected beacon interval and speed
    const realTimeInterval = config.beaconInterval * 1000; // Real-time interval in milliseconds
    const simulationInterval = realTimeInterval / simulationSpeed; // Adjusted for simulation speed
    setNextBeaconCountdown(config.beaconInterval / simulationSpeed);
    
    intervalRef.current = setInterval(() => {
      setSimulationTime(prev => {
        const newTime = prev + config.beaconInterval; // Always advance by beacon interval in simulation time
        const currentTime = config.startTime + newTime;
        
        if (dummySimulator) {
          dummySimulator.updateTime(currentTime);
        }
        
        // Stop simulation after predicted flight time
        if (newTime > originalPrediction.totalTime + 1800) { // 30 minutes after landing
          stopDummySimulation();
          return prev;
        }
        
        return newTime;
      });
      
      // Reset countdown after each beacon
      setNextBeaconCountdown(config.beaconInterval / simulationSpeed);
    }, simulationInterval);

    // Start countdown timer that updates every second (adjusted for simulation speed)
    countdownRef.current = setInterval(() => {
      setNextBeaconCountdown(prev => {
        if (prev <= 1) {
          return config.beaconInterval / simulationSpeed; // Reset to full interval
        }
        return prev - 1;
      });
    }, 1000 / simulationSpeed);
  };

  const stopDummySimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setDummyConfig(prev => ({ ...prev, enabled: false }));
    setSimulationTime(0);
    setNextBeaconCountdown(0);
  };

  const resetDummySimulation = () => {
    stopDummySimulation();
    setLiveComparison(null);
    setSimulationSpeed(1); // Reset to real-time
    
    // Clear assumed landing state
    setDummyConfig(prev => ({
      ...prev,
      assumedLanded: false,
      assumedLandingLocation: undefined,
      lastBeaconTime: undefined
    }));
    
    // Reset simulator state
    if (dummySimulator) {
      dummySimulator.updateConfig({
        assumedLanded: false,
        assumedLandingLocation: undefined,
        lastBeaconTime: undefined
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const formatDistance = (meters: number): string => {
    if (isImperial) {
      const miles = meters * 0.000621371;
      return miles < 1 ? `${Math.round(meters * 3.28084)}ft` : `${miles.toFixed(1)}mi`;
    }
    return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
  };

  const formatAltitude = (meters: number): string => {
    if (isImperial) {
      return `${Math.round(metersToFeet(meters))}ft`;
    }
    return `${Math.round(meters)}m`;
  };

  const formatRate = (ms: number): string => {
    if (isImperial) {
      return `${(ms * 3.28084).toFixed(1)}ft/s`;
    }
    return `${ms.toFixed(1)}m/s`;
  };

  const getAccuracyColor = (accuracy: number): string => {
    return 'text-white';
  };

  const getPhaseColor = (phase: string): string => {
    switch (phase) {
      case 'ascent': return 'text-blue-400';
      case 'burst': return 'text-orange-400';
      case 'descent': return 'text-purple-400';
      case 'landed': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Source Selector */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h4 className="text-lg font-semibold mb-3 text-cyan-300">📡 Data Source</h4>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dataSource"
              value="simulation"
              checked={dataSource === 'simulation'}
              onChange={(e) => setDataSource(e.target.value as 'simulation' | 'aprs')}
              className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
            />
            <span className="text-white font-medium">Simulation</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dataSource"
              value="aprs"
              checked={dataSource === 'aprs'}
              onChange={(e) => setDataSource(e.target.value as 'simulation' | 'aprs')}
              className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
            />
            <span className="text-white font-medium">APRS.fi</span>
          </label>
        </div>
        <p className="text-sm text-gray-400">
          {dataSource === 'simulation' 
            ? 'Use dummy simulation data to test live prediction features'
            : 'Use real-time APRS data from aprs.fi for actual flights'
          }
        </p>
      </div>

      {/* Dummy Simulation Controls */}
      {dataSource === 'simulation' && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-lg font-semibold mb-3 text-cyan-300">🧪 Test Live Predictions</h4>
          <p className="text-sm text-gray-400 mb-4">
            Configure and run a dummy simulation to test the live prediction features.
          </p>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-400 mb-1">Scenario</label>
              <select
                value={dummyConfig.scenario}
                onChange={(e) => setDummyConfig(prev => ({ ...prev, scenario: e.target.value as any }))}
                className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                disabled={dummyConfig.enabled}
              >
                <option value="standard">Standard Flight (Float variations)</option>
                <option value="early_burst">Early Burst (UV damage @ 75-85%)</option>
                <option value="wind_shear">Wind Shear (Severe weather drops)</option>
                <option value="slow_ascent">Slow Ascent (Thermal cycles)</option>
                <option value="fast_descent">Fast Descent (Chute problems)</option>
              </select>
            </div>
            
            <div className="flex-1 min-w-32">
              <label className="block text-sm font-medium text-gray-400 mb-1">Beacon Interval</label>
              <select
                value={dummyConfig.beaconInterval}
                onChange={(e) => setDummyConfig(prev => ({ ...prev, beaconInterval: parseInt(e.target.value) }))}
                className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                disabled={dummyConfig.enabled}
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
            
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Simulation Speed: {simulationSpeed}x
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={simulationSpeed}
                  onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1x</span>
                  <span>25x</span>
                  <span>50x</span>
                  <span>75x</span>
                  <span>100x</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {!dummyConfig.enabled ? (
              <button
                onClick={startDummySimulation}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
              >
                Start Simulation
              </button>
            ) : (
              <button
                onClick={stopDummySimulation}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
              >
                Stop Simulation
              </button>
            )}
            
            <button
              onClick={resetDummySimulation}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
          
          {dummyConfig.enabled && (
            <div className="mt-3 space-y-2">
              <div className="text-sm text-gray-400">
                Simulation time: {Math.round(simulationTime / 60)} minutes | Beacons: {currentPositions.length} | Speed: {simulationSpeed}x
              </div>
              {dummyConfig.assumedLanded ? (
                <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-3">
                  <div className="text-sm text-orange-200">
                    <div className="font-semibold text-orange-300">⚠️ ASSUMED LANDED</div>
                    <div className="mt-1">
                      Beacon lost at low altitude. Search area marked on map.
                    </div>
                    {dummyConfig.assumedLandingLocation && (
                      <div className="mt-1 text-xs text-orange-400">
                        Estimated location: {dummyConfig.assumedLandingLocation.lat.toFixed(4)}°, {dummyConfig.assumedLandingLocation.lng.toFixed(4)}°
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-sm text-cyan-400">
                    Next beacon in: <span className="font-mono font-bold">{Math.ceil(nextBeaconCountdown)}s</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-cyan-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                      style={{ 
                        width: `${((dummyConfig.beaconInterval / simulationSpeed - nextBeaconCountdown) / (dummyConfig.beaconInterval / simulationSpeed)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* APRS.fi Information */}
      {dataSource === 'aprs' && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-lg font-semibold mb-3 text-cyan-300">📡 APRS.fi Connection</h4>
          <div className="space-y-2">
            <div className="text-sm text-gray-400">
              {aprsPositions.length > 0 ? (
                <div>
                  <span className="text-green-400 font-semibold">✓ Connected</span> - 
                  Receiving data from {aprsPositions.length} positions
                </div>
              ) : (
                <div>
                  <span className="text-yellow-400 font-semibold">⚠ No Data</span> - 
                  No APRS positions received. Check callsign and ensure balloon is transmitting.
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              APRS data is automatically fetched for the callsign specified in your mission parameters.
            </div>
          </div>
        </div>
      )}

      {/* Live Prediction Comparison */}
      {liveComparison && (
        <div className="space-y-4">
          {/* Flight Status */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-lg font-semibold mb-3 text-cyan-300">🛰️ Live Flight Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className={`text-xl font-bold ${getPhaseColor(liveComparison.actualMetrics.flightPhase.phase)}`}>
                  {liveComparison.actualMetrics.flightPhase.phase.toUpperCase()}
                </div>
                <div className="text-sm text-gray-400">Flight Phase</div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(liveComparison.actualMetrics.flightPhase.confidence * 100)}% confidence
                </div>
              </div>
              
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-xl font-bold text-white">
                  {liveComparison.actualMetrics.currentPosition.altitude !== undefined 
                    ? formatAltitude(liveComparison.actualMetrics.currentPosition.altitude)
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-gray-400">Current Altitude</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(liveComparison.actualMetrics.currentPosition.time * 1000).toLocaleTimeString()}
                </div>
              </div>
              
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-xl font-bold text-yellow-400">
                  {formatDistance(liveComparison.actualMetrics.deviationFromPredicted.distance)}
                </div>
                <div className="text-sm text-gray-400">Deviation</div>
                <div className="text-xs text-gray-500 mt-1">
                  from predicted path
                </div>
              </div>
            </div>
          </div>

          {/* Prediction Accuracy */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-lg font-semibold mb-3 text-cyan-300">📊 Prediction Accuracy</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className={`text-xl font-bold ${getAccuracyColor(liveComparison.accuracy.trajectoryAccuracy)}`}>
                  {Math.round(liveComparison.accuracy.trajectoryAccuracy * 100)}%
                </div>
                <div className="text-sm text-gray-400">Trajectory</div>
              </div>
              
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className={`text-xl font-bold ${getAccuracyColor(liveComparison.accuracy.altitudeAccuracy)}`}>
                  {Math.round(liveComparison.accuracy.altitudeAccuracy * 100)}%
                </div>
                <div className="text-sm text-gray-400">Altitude</div>
              </div>
              
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className={`text-xl font-bold ${getAccuracyColor(liveComparison.accuracy.timingAccuracy)}`}>
                  {Math.round(liveComparison.accuracy.timingAccuracy * 100)}%
                </div>
                <div className="text-sm text-gray-400">Timing</div>
              </div>
              
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className={`text-xl font-bold ${getAccuracyColor(liveComparison.accuracy.overallAccuracy)}`}>
                  {Math.round(liveComparison.accuracy.overallAccuracy * 100)}%
                </div>
                <div className="text-sm text-gray-400">Overall</div>
              </div>
            </div>
          </div>

          {/* Actual vs Predicted Metrics */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-lg font-semibold mb-3 text-cyan-300">📈 Actual vs Predicted</h4>
            <div className="space-y-3">
              {/* Always show ascent rate field */}
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-400">Ascent Rate:</span>
                <div className="text-right">
                  {liveComparison.actualMetrics.actualAscentRate ? (
                    <div className="text-white font-semibold">
                      {formatRate(liveComparison.actualMetrics.actualAscentRate)} (actual)
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      -- (calculating)
                    </div>
                  )}
                  <div className="text-gray-500 text-sm">
                    {formatRate(launchParams.ascentRate)} (predicted)
                  </div>
                </div>
              </div>
              
              {/* Always show descent rate field */}
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-400">Descent Rate:</span>
                <div className="text-right">
                  {liveComparison.actualMetrics.actualDescentRate ? (
                    <div className="text-white font-semibold">
                      {formatRate(liveComparison.actualMetrics.actualDescentRate)} (actual)
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      -- (waiting for descent)
                    </div>
                  )}
                  <div className="text-gray-500 text-sm">
                    {formatRate(launchParams.descentRate)} (predicted)
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-400">Burst Altitude:</span>
                <div className="text-right">
                  {liveComparison.actualMetrics.actualBurstAltitude ? (
                    <div className="text-white font-semibold">
                      {formatAltitude(liveComparison.actualMetrics.actualBurstAltitude)} (actual)
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      {formatAltitude(launchParams.burstAltitude)} (predicted)
                    </div>
                  )}
                  <div className="text-gray-500 text-sm">
                    {formatAltitude(launchParams.burstAltitude)} (original)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Updated Prediction */}
          {liveComparison.updatedPrediction && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h4 className="text-lg font-semibold mb-3 text-cyan-300">🔄 Updated Prediction</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-700 rounded-lg">
                  <div className="text-xl font-bold text-green-400">
                    {liveComparison.updatedPrediction.landingPoint.lat.toFixed(4)}°, {liveComparison.updatedPrediction.landingPoint.lon.toFixed(4)}°
                  </div>
                  <div className="text-sm text-gray-400">Updated Landing</div>
                </div>
                
                <div className="text-center p-3 bg-gray-700 rounded-lg">
                  <div className="text-xl font-bold text-yellow-400">
                    {liveComparison.actualMetrics.timeToLanding !== undefined
                      ? liveComparison.actualMetrics.timeToLanding === 0
                        ? 'Landed'
                        : `${Math.round(liveComparison.actualMetrics.timeToLanding / 60)}min`
                      : 'Calculating...'
                    }
                  </div>
                  <div className="text-sm text-gray-400">Time to Landing</div>
                </div>
                
                <div className="text-center p-3 bg-gray-700 rounded-lg">
                  <div className="text-xl font-bold text-blue-400">
                    {formatDistance(liveComparison.updatedPrediction.distance || 0)}
                  </div>
                  <div className="text-sm text-gray-400">Remaining Distance</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Live Data Message */}
      {!liveComparison && (dataSource === 'aprs' || (dataSource === 'simulation' && !dummyConfig.enabled)) && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-4">📡</div>
          <h4 className="text-lg font-semibold mb-2">No Live Data Available</h4>
          <p className="text-sm">
            {dataSource === 'simulation' 
              ? 'Start the dummy simulation above to test live prediction features.'
              : 'No APRS data received. Check callsign and ensure balloon is transmitting.'
            }
          </p>
        </div>
      )}

      {/* Landing Prediction Map */}
      {liveComparison && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-lg font-semibold mb-3 text-cyan-300">🗺️ Landing Prediction Map</h4>
          <p className="text-sm text-gray-400 mb-4">
            Compare original (blue O) vs updated (green U) landing predictions. 
            Launch point (orange L), current balloon position (red B), and flight paths are shown.
            Red line shows actual balloon trajectory. Orange circle shows search area for assumed landing (S).
          </p>
          <LandingPredictionMap
            originalPrediction={originalPrediction}
            liveComparison={liveComparison}
            unitSystem={unitSystem}
            currentPositions={currentPositions}
            dummyConfig={dummyConfig}
          />
        </div>
      )}
    </div>
  );
};

export default LivePredictionPanel; 