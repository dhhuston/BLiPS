import React, { useState, useEffect, useRef } from 'react';
import { 
  SimulationMetrics,
  APRSPosition, 
  LaunchParams, 
  PredictionResult, 
  WeatherData,
  UnitSystem
} from '../types';
import { 
  EnhancedFlightSimulator, 
  createEnhancedFlightSimulator,
  EnhancedSimulationConfig,
  SimulationScenario
} from '../services/enhancedFlightSimulator';

interface EnhancedSimulationPanelProps {
  launchParams: LaunchParams;
  originalPrediction: PredictionResult;
  weatherData: WeatherData | null;
  unitSystem: UnitSystem;
  onPositionsUpdate: (positions: APRSPosition[]) => void;
  onMetricsUpdate: (metrics: SimulationMetrics | null) => void;
}

const PREDEFINED_SCENARIOS: SimulationScenario[] = [
  {
    name: 'Standard Flight',
    description: 'Normal balloon flight with realistic variations',
    type: 'standard',
    parameters: {}
  },
  {
    name: 'Early Burst',
    description: 'Balloon bursts at 75% of predicted altitude due to UV damage',
    type: 'early_burst',
    parameters: {
      burstAltitudeModifier: 0.75,
      descentRateModifier: 1.2
    }
  },
  {
    name: 'Wind Shear',
    description: 'Severe wind shear at 5km altitude causing trajectory deviation',
    type: 'wind_shear',
    parameters: {
      windShearAltitude: 5000,
      windShearIntensity: 0.8,
      turbulenceLevel: 0.6
    }
  },
  {
    name: 'Slow Ascent',
    description: 'Reduced ascent rate due to thermal cycles and atmospheric conditions',
    type: 'slow_ascent',
    parameters: {
      ascentRateModifier: 0.7,
      thermalCyclePeriod: 300
    }
  },
  {
    name: 'Fast Descent',
    description: 'Rapid descent due to parachute deployment issues',
    type: 'fast_descent',
    parameters: {
      descentRateModifier: 2.0
    }
  },
  {
    name: 'Equipment Failure',
    description: 'Beacon failure 30 minutes after launch',
    type: 'equipment_failure',
    parameters: {
      equipmentFailureTime: 1800
    }
  },
  {
    name: 'Storm Conditions',
    description: 'Flight through severe weather with high turbulence',
    type: 'weather_event',
    parameters: {
      weatherEventType: 'storm',
      turbulenceLevel: 0.9,
      windShearIntensity: 0.7
    }
  },
  {
    name: 'Jet Stream',
    description: 'Flight through strong jet stream at high altitude',
    type: 'weather_event',
    parameters: {
      weatherEventType: 'jet_stream',
      windShearAltitude: 8000,
      windShearIntensity: 0.6
    }
  }
];

const EnhancedSimulationPanel: React.FC<EnhancedSimulationPanelProps> = ({
  launchParams,
  originalPrediction,
  weatherData,
  unitSystem,
  onPositionsUpdate,
  onMetricsUpdate
}) => {
  const [config, setConfig] = useState<EnhancedSimulationConfig>({
    enabled: false,
    scenario: PREDEFINED_SCENARIOS[0],
    beaconInterval: 15,
    startTime: Date.now() / 1000,
    currentTime: Date.now() / 1000,
    noiseLevel: 0.3,
    simulationSpeed: 1,
    physicsModel: 'advanced',
    weatherIntegration: true,
    turbulenceModel: true,
    thermalEffects: true,
    replayMode: false
  });

  const [simulationTime, setSimulationTime] = useState(0);
  const [nextBeaconCountdown, setNextBeaconCountdown] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customWindProfile, setCustomWindProfile] = useState(false);
  const [windProfiles, setWindProfiles] = useState<Array<{altitude: number, speed: number, direction: number}>>([]);

  const simulatorRef = useRef<EnhancedFlightSimulator | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isImperial = unitSystem === 'imperial';

  // Initialize simulator
  useEffect(() => {
    simulatorRef.current = createEnhancedFlightSimulator(
      launchParams,
      originalPrediction,
      config,
      weatherData
    );
  }, [launchParams, originalPrediction, config, weatherData]);

  // Update positions and metrics
  useEffect(() => {
    const updateSimulation = async () => {
      if (simulatorRef.current && config.enabled) {
        const positions = await simulatorRef.current.generatePositions();
        const currentMetrics = simulatorRef.current.getMetrics();
        
        // Filter out invalid positions to prevent map issues
        const validPositions = positions.filter(pos => 
          pos && 
          typeof pos.lat === 'number' && !isNaN(pos.lat) && pos.lat >= -90 && pos.lat <= 90 &&
          typeof pos.lng === 'number' && !isNaN(pos.lng) && pos.lng >= -180 && pos.lng <= 180 &&
          typeof pos.altitude === 'number' && !isNaN(pos.altitude) && pos.altitude >= 0
        );
        
        onPositionsUpdate(validPositions);
        onMetricsUpdate(currentMetrics);
        setMetrics(currentMetrics);
      } else {
        onPositionsUpdate([]);
        onMetricsUpdate(null);
        setMetrics(null);
      }
    };

    // Debounce updates to prevent excessive rendering
    const timeoutId = setTimeout(updateSimulation, 150);
    
    return () => clearTimeout(timeoutId);
  }, [config.enabled, simulationTime, onPositionsUpdate, onMetricsUpdate]);

  const startSimulation = () => {
    if (!simulatorRef.current) return;

    const newConfig = {
      ...config,
      enabled: true,
      startTime: Date.now() / 1000,
      currentTime: Date.now() / 1000
    };

    setConfig((prev: EnhancedSimulationConfig) => ({ ...prev, enabled: true, startTime: Date.now() / 1000, currentTime: Date.now() / 1000 }));
    simulatorRef.current.updateConfig(newConfig);
    setSimulationTime(0);
    setIsRunning(true);

    // Start simulation timer
    const realTimeInterval = config.beaconInterval * 1000;
    const simulationInterval = realTimeInterval / config.simulationSpeed;
    setNextBeaconCountdown(config.beaconInterval / config.simulationSpeed);

    intervalRef.current = setInterval(() => {
      setSimulationTime((prev: number) => {
        const newTime = prev + config.beaconInterval;
        const currentTime = newConfig.startTime + newTime;

        if (simulatorRef.current) {
          simulatorRef.current.updateTime(currentTime);
        }

        // Stop simulation after predicted flight time + buffer
        if (newTime > originalPrediction.totalTime + 1800) {
          stopSimulation();
          return prev;
        }

        return newTime;
      });

      setNextBeaconCountdown((prev: number) => {
        if (prev <= 1) {
          return config.beaconInterval / config.simulationSpeed;
        }
        return prev - 1;
      });
    }, simulationInterval);

    // Start countdown timer
    countdownRef.current = setInterval(() => {
      setNextBeaconCountdown((prev: number) => {
        if (prev <= 1) {
          return config.beaconInterval / config.simulationSpeed;
        }
        return prev - 1;
      });
    }, 1000 / config.simulationSpeed);
  };

  const stopSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    setConfig((prev: EnhancedSimulationConfig) => ({ ...prev, enabled: false }));
    setIsRunning(false);
    setSimulationTime(0);
    setNextBeaconCountdown(0);
  };

  const resetSimulation = () => {
    stopSimulation();
    setConfig((prev: EnhancedSimulationConfig) => ({
      ...prev,
      assumedLanded: false,
      assumedLandingLocation: undefined,
      lastBeaconTime: undefined
    }));

    if (simulatorRef.current) {
      simulatorRef.current.clearCache();
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAltitude = (meters: number): string => {
    if (isImperial) {
      const feet = meters * 3.28084;
      return `${feet.toFixed(0)} ft`;
    }
    return `${meters.toFixed(0)} m`;
  };

  const formatSpeed = (mps: number): string => {
    if (isImperial) {
      const mph = mps * 2.23694;
      return `${mph.toFixed(1)} mph`;
    }
    return `${mps.toFixed(1)} m/s`;
  };

  const formatDistance = (meters: number): string => {
    if (isImperial) {
      const miles = meters * 0.000621371;
      return `${miles.toFixed(2)} mi`;
    }
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  const addWindProfile = () => {
    setWindProfiles((prev: Array<{altitude: number, speed: number, direction: number}>) => [...prev, { altitude: 0, speed: 5, direction: 180 }]);
  };

  const updateWindProfile = (index: number, field: 'altitude' | 'speed' | 'direction', value: number) => {
    setWindProfiles((prev: Array<{altitude: number, speed: number, direction: number}>) => prev.map((profile, i) => 
      i === index ? { ...profile, [field]: value } : profile
    ));
  };

  const removeWindProfile = (index: number) => {
    setWindProfiles((prev: Array<{altitude: number, speed: number, direction: number}>) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Main Simulation Controls */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-cyan-300">🧪 Enhanced Flight Simulator</h4>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-400 hover:text-cyan-300 transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>

        {/* Basic Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Scenario</label>
            <select
              value={config.scenario.name}
              onChange={(e) => {
                const scenario = PREDEFINED_SCENARIOS.find(s => s.name === e.target.value);
                if (scenario) {
                  setConfig((prev: EnhancedSimulationConfig) => ({ ...prev, scenario }));
                }
              }}
              className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              disabled={isRunning}
            >
              {PREDEFINED_SCENARIOS.map(scenario => (
                <option key={scenario.name} value={scenario.name}>
                  {scenario.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{config.scenario.description}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Beacon Interval</label>
            <select
              value={config.beaconInterval}
              onChange={(e) => setConfig((prev: EnhancedSimulationConfig) => ({ ...prev, beaconInterval: parseInt(e.target.value) }))}
              className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              disabled={isRunning}
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Simulation Speed: {config.simulationSpeed}x
            </label>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={config.simulationSpeed}
              onChange={(e) => setConfig((prev: EnhancedSimulationConfig) => ({ ...prev, simulationSpeed: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              disabled={isRunning}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1x</span>
              <span>25x</span>
              <span>50x</span>
              <span>75x</span>
              <span>100x</span>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 mb-4">
          {!isRunning ? (
            <button
              onClick={startSimulation}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
            >
              Start Simulation
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
            >
              Stop Simulation
            </button>
          )}
          
          <button
            onClick={resetSimulation}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Simulation Status */}
        {isRunning && (
          <div className="space-y-2">
            <div className="text-sm text-gray-400">
              Flight time: {formatTime(simulationTime)} | Speed: {config.simulationSpeed}x
            </div>
            <div className="text-sm text-cyan-400">
              Next beacon in: <span className="font-mono font-bold">{Math.ceil(nextBeaconCountdown)}s</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-cyan-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ 
                  width: `${((config.beaconInterval / config.simulationSpeed - nextBeaconCountdown) / (config.beaconInterval / config.simulationSpeed)) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h5 className="text-md font-semibold mb-3 text-cyan-300">Advanced Settings</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Physics Model</label>
              <select
                value={config.physicsModel}
                onChange={(e) => setConfig((prev: EnhancedSimulationConfig) => ({ ...prev, physicsModel: e.target.value as 'basic' | 'advanced' | 'realistic' }))}
                className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                disabled={isRunning}
              >
                <option value="basic">Basic</option>
                <option value="advanced">Advanced</option>
                <option value="realistic">Realistic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Noise Level</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.noiseLevel}
                onChange={(e) => setConfig((prev: EnhancedSimulationConfig) => ({ ...prev, noiseLevel: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                disabled={isRunning}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.weatherIntegration}
                  onChange={(e) => setConfig((prev: EnhancedSimulationConfig) => ({ ...prev, weatherIntegration: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
                  disabled={isRunning}
                />
                <span className="text-sm text-gray-400">Weather Integration</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.turbulenceModel}
                  onChange={(e) => setConfig((prev: EnhancedSimulationConfig) => ({ ...prev, turbulenceModel: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
                  disabled={isRunning}
                />
                <span className="text-sm text-gray-400">Turbulence Model</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.thermalEffects}
                  onChange={(e) => setConfig((prev: EnhancedSimulationConfig) => ({ ...prev, thermalEffects: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
                  disabled={isRunning}
                />
                <span className="text-sm text-gray-400">Thermal Effects</span>
              </label>
            </div>
          </div>

          {/* Custom Wind Profile */}
          <div className="border-t border-gray-600 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h6 className="text-sm font-medium text-gray-300">Custom Wind Profile</h6>
              <button
                onClick={() => setCustomWindProfile(!customWindProfile)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {customWindProfile ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {customWindProfile && (
              <div className="space-y-3">
                {windProfiles.map((profile, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="number"
                      placeholder="Altitude (m)"
                      value={profile.altitude}
                      onChange={(e) => updateWindProfile(index, 'altitude', parseInt(e.target.value) || 0)}
                      className="flex-1 bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-white text-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      placeholder="Speed (m/s)"
                      value={profile.speed}
                      onChange={(e) => updateWindProfile(index, 'speed', parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-white text-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      placeholder="Direction (°)"
                      value={profile.direction}
                      onChange={(e) => updateWindProfile(index, 'direction', parseInt(e.target.value) || 0)}
                      className="flex-1 bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-white text-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    />
                    <button
                      onClick={() => removeWindProfile(index)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={addWindProfile}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition-colors"
                >
                  Add Wind Level
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Metrics */}
      {metrics && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h5 className="text-md font-semibold mb-3 text-cyan-300">Live Flight Metrics</h5>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {formatAltitude(metrics.currentAltitude)}
              </div>
              <div className="text-xs text-gray-400">Current Altitude</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {formatSpeed(metrics.currentSpeed)}
              </div>
              <div className="text-xs text-gray-400">Current Speed</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {metrics.currentCourse.toFixed(0)}°
              </div>
              <div className="text-xs text-gray-400">Course</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {formatDistance(metrics.totalDistance)}
              </div>
              <div className="text-xs text-gray-400">Total Distance</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h6 className="text-sm font-medium text-gray-300 mb-2">Flight Phase</h6>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  metrics.flightPhase === 'ascent' ? 'bg-green-500' :
                  metrics.flightPhase === 'burst' ? 'bg-yellow-500' :
                  metrics.flightPhase === 'descent' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-300 capitalize">{metrics.flightPhase}</span>
              </div>
            </div>
            
            <div>
              <h6 className="text-sm font-medium text-gray-300 mb-2">Deviations from Prediction</h6>
              <div className="space-y-1 text-xs text-gray-400">
                <div>Altitude: {formatAltitude(metrics.deviations.fromPredictedAltitude)}</div>
                <div>Position: {formatDistance(metrics.deviations.fromPredictedPosition)}</div>
                <div>Time: {formatTime(metrics.deviations.fromPredictedTime)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSimulationPanel; 