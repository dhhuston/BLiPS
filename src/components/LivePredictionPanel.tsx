import React, { useState, useEffect, useRef } from 'react';
import { 
  LivePredictionComparison, 
  APRSPosition, 
  UnitSystem, 
  LaunchParams, 
  PredictionResult, 
  WeatherData,
  DummyFlightConfig,
  SimulationMetrics
} from '../types/index';
import { createLivePredictionComparison } from '../services/liveAnalysisService';
import { createDummyFlightSimulator } from '../services/dummyFlightSimulator';
import { metersToFeet } from '../constants/index';
import LandingPredictionMap from './LandingPredictionMap';
import EnhancedSimulationPanel from './EnhancedSimulationPanel';

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
  const [dataSource, setDataSource] = useState<'simulation' | 'enhanced' | 'aprs'>('enhanced');
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isImperial = unitSystem === 'imperial';

  // State to store current positions
  const [currentPositions, setCurrentPositions] = useState<APRSPosition[]>([]);
  const [simulationMetrics, setSimulationMetrics] = useState<SimulationMetrics | null>(null);

  // Memoize dummySimulator so it is stable and only recreated when dependencies change
  const dummySimulator = React.useMemo(() => {
    if (originalPrediction && launchParams) {
      return createDummyFlightSimulator(launchParams, originalPrediction, dummyConfig, weatherData);
    }
    return null;
  }, [originalPrediction, launchParams, dummyConfig, weatherData]);

  // Update positions when dependencies change with debouncing for simulation
  useEffect(() => {
    const updatePositions = async () => {
      if (dataSource === 'aprs') {
        setCurrentPositions(aprsPositions);
      } else if (dataSource === 'simulation' && dummyConfig.enabled) {
        if (dummySimulator) {
          const positions = await dummySimulator.generatePositions();
          // Filter out invalid positions to prevent map issues
          const validPositions = positions.filter(pos => 
            pos && 
            typeof pos.lat === 'number' && !isNaN(pos.lat) && pos.lat >= -90 && pos.lat <= 90 &&
            typeof pos.lng === 'number' && !isNaN(pos.lng) && pos.lng >= -180 && pos.lng <= 180 &&
            typeof pos.altitude === 'number' && !isNaN(pos.altitude) && pos.altitude >= 0
          );
          setCurrentPositions(validPositions);
        }
      } else if (dataSource === 'enhanced') {
        // Enhanced simulation is handled by EnhancedSimulationPanel
        // Positions are updated via onPositionsUpdate callback
      } else {
        setCurrentPositions([]);
      }
    };

    // Add slight debouncing to prevent excessive updates during simulation
    const timeoutId = setTimeout(updatePositions, 100);
    
    return () => clearTimeout(timeoutId);
  }, [dataSource, aprsPositions, dummyConfig.enabled, dummySimulator]);

  // Track last processed position to prevent unnecessary recalculations
  const lastProcessedPositionRef = useRef<APRSPosition | null>(null);
  
  // Async effect for live prediction comparison
  useEffect(() => {
    const updateComparison = async () => {
      if (currentPositions.length > 0 && weatherData) {
        const lastPosition = currentPositions[currentPositions.length - 1];
        const lastProcessed = lastProcessedPositionRef.current;
        
        const shouldUpdate = !lastProcessed ||
          lastProcessed.time !== lastPosition.time ||
          lastProcessed.altitude !== lastPosition.altitude ||
          lastProcessed.lat !== lastPosition.lat ||
          lastProcessed.lng !== lastPosition.lng;
        
        if (shouldUpdate) {
          const comparison = await createLivePredictionComparison(
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
    };

    updateComparison();
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
    
    setDummyConfig((prev: DummyFlightConfig) => ({ ...prev, enabled: true }));
    dummySimulator.updateConfig(config);
    setSimulationTime(0);

    // Start simulation timer - update based on selected beacon interval and speed
    const realTimeInterval = config.beaconInterval * 1000; // Real-time interval in milliseconds
    const simulationInterval = realTimeInterval / simulationSpeed; // Adjusted for simulation speed
    setNextBeaconCountdown(config.beaconInterval / simulationSpeed);
    
    intervalRef.current = setInterval(() => {
      setSimulationTime((prev: number) => {
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
      setNextBeaconCountdown((prev: number) => {
        if (prev <= 1) {
          return config.beaconInterval / simulationSpeed; // Reset to full interval
        }
        return prev - 1;
      });
    }, simulationInterval);

    // Start countdown timer that updates every second (adjusted for simulation speed)
    countdownRef.current = setInterval(() => {
      setNextBeaconCountdown((prev: number) => {
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
    setDummyConfig((prev: DummyFlightConfig) => ({ ...prev, enabled: false }));
    setSimulationTime(0);
    setNextBeaconCountdown(0);
  };

  const resetDummySimulation = () => {
    stopDummySimulation();
    setLiveComparison(null);
    setSimulationSpeed(1); // Reset to real-time
    
    // Clear assumed landing state
    setDummyConfig((prev: DummyFlightConfig) => ({
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

  const formatSpeed = (mps: number): string => {
    if (isImperial) {
      const mph = mps * 2.23694;
      return `${mph.toFixed(1)} mph`;
    }
    return `${mps.toFixed(1)} m/s`;
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 0.8) return 'text-green-400';
    if (accuracy >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
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
              value="enhanced"
              checked={dataSource === 'enhanced'}
              onChange={(e) => setDataSource(e.target.value as 'simulation' | 'enhanced' | 'aprs')}
              className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
            />
            <span className="text-white font-medium">Enhanced Simulation</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dataSource"
              value="simulation"
              checked={dataSource === 'simulation'}
              onChange={(e) => setDataSource(e.target.value as 'simulation' | 'enhanced' | 'aprs')}
              className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
            />
            <span className="text-white font-medium">Basic Simulation</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dataSource"
              value="aprs"
              checked={dataSource === 'aprs'}
              onChange={(e) => setDataSource(e.target.value as 'simulation' | 'enhanced' | 'aprs')}
              className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
            />
            <span className="text-white font-medium">APRS.fi</span>
          </label>
        </div>
        <p className="text-sm text-gray-400">
          {dataSource === 'enhanced' 
            ? 'Use advanced simulation with realistic physics and weather modeling'
            : dataSource === 'simulation'
            ? 'Use basic dummy simulation data to test live prediction features'
            : 'Use real-time APRS data from aprs.fi for actual flights'
          }
        </p>
      </div>

      {/* Enhanced Simulation Controls */}
      {dataSource === 'enhanced' && (
        <EnhancedSimulationPanel
          launchParams={launchParams}
          originalPrediction={originalPrediction}
          weatherData={weatherData}
          unitSystem={unitSystem}
          onPositionsUpdate={setCurrentPositions}
          onMetricsUpdate={setSimulationMetrics}
        />
      )}

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
                onChange={(e) => setDummyConfig((prev: DummyFlightConfig) => ({ ...prev, scenario: e.target.value as any }))}
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
                onChange={(e) => setDummyConfig((prev: DummyFlightConfig) => ({ ...prev, beaconInterval: parseInt(e.target.value) }))}
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

      {/* Enhanced Simulation Metrics */}
      {dataSource === 'enhanced' && simulationMetrics && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-lg font-semibold mb-3 text-cyan-300">📊 Enhanced Simulation Analysis</h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {formatAltitude(simulationMetrics.currentAltitude)}
              </div>
              <div className="text-xs text-gray-400">Current Altitude</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {formatSpeed(simulationMetrics.currentSpeed)}
              </div>
              <div className="text-xs text-gray-400">Current Speed</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {simulationMetrics.currentCourse.toFixed(0)}°
              </div>
              <div className="text-xs text-gray-400">Course</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {formatDistance(simulationMetrics.totalDistance)}
              </div>
              <div className="text-xs text-gray-400">Total Distance</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h6 className="text-sm font-medium text-gray-300 mb-2">Flight Performance</h6>
              <div className="space-y-1 text-sm text-gray-400">
                <div>Ascent Rate: {formatSpeed(simulationMetrics.ascentRate)}</div>
                <div>Descent Rate: {formatSpeed(simulationMetrics.descentRate)}</div>
                <div>Max Altitude: {formatAltitude(simulationMetrics.maxAltitude)}</div>
                {simulationMetrics.burstAltitude && (
                  <div>Burst Altitude: {formatAltitude(simulationMetrics.burstAltitude)}</div>
                )}
              </div>
            </div>
            
            <div>
              <h6 className="text-sm font-medium text-gray-300 mb-2">Weather Conditions</h6>
              <div className="space-y-1 text-sm text-gray-400">
                <div>Temperature: {simulationMetrics.weatherConditions.temperature.toFixed(1)}°C</div>
                <div>Pressure: {simulationMetrics.weatherConditions.pressure.toFixed(0)} hPa</div>
                <div>Wind: {simulationMetrics.weatherConditions.windSpeed.toFixed(1)} m/s @ {simulationMetrics.weatherConditions.windDirection.toFixed(0)}°</div>
                <div>Humidity: {simulationMetrics.weatherConditions.humidity.toFixed(0)}%</div>
              </div>
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