import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LaunchParams, UnitSystem, CalculatorParams, PredictionResult, WeatherData, APRSPosition } from '../types/index';
import MissionPlanner from './MissionPlanner';
import SafetyInfo from './SafetyInfo';
import LeafletVisualization from './LeafletVisualization';
import CalculatorTab from './CalculatorTab';
import ErrorBoundary from './ErrorBoundary';
import { ComprehensiveWeather } from '../types/index';
import GlobeVisualization from './GlobeVisualization';
import LivePredictionPanel from './LivePredictionPanel';
import APRSService from '../services/aprsService';
import { getCacheStats } from '../services/elevationService';
import { AlgorithmComparisonPanel } from './AlgorithmComparisonPanel';

interface TabbedInterfaceProps {
  launchParams: LaunchParams;
  setLaunchParams: React.Dispatch<React.SetStateAction<LaunchParams>>;
  calculatorParams: CalculatorParams;
  setCalculatorParams: React.Dispatch<React.SetStateAction<CalculatorParams>>;
  onPredict: () => void;
  isLoading: boolean;
  unitSystem: UnitSystem;
  launchWeather: ComprehensiveWeather | null;
  prediction: PredictionResult | null;
  error: string | null;
  launchARTCC: string | null;
  landingARTCC: string | null;
  weatherData?: WeatherData | null;
}

const TabbedInterface: React.FC<TabbedInterfaceProps> = ({
  launchParams,
  setLaunchParams,
  calculatorParams,
  setCalculatorParams,
  onPredict,
  isLoading,
  unitSystem,
  launchWeather,
  prediction,
  error,
  launchARTCC,
  landingARTCC,
  weatherData
}) => {
  const [activeTab, setActiveTab] = useState('calculator');
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const mapResizeRef = useRef<() => void>(() => {});
  const leafletMapResizeRef = useRef<() => void>(() => {});

  const handlePredictAndSwitch = () => {
    onPredict();
    setTimeout(() => setActiveTab('visualization'), 100);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setTabSwitchCount((c: number) => c + 1);
    if (tabId === 'mission' && mapResizeRef.current) {
      setTimeout(() => mapResizeRef.current?.(), 100);
    }
    if (tabId === 'visualization' && leafletMapResizeRef.current) {
      setTimeout(() => leafletMapResizeRef.current?.(), 200);
    }
  };

  const handleApplyAndSwitchToMission = () => {
    setActiveTab('mission');
    if (mapResizeRef.current) {
      setTimeout(() => mapResizeRef.current?.(), 100);
    }
  };

  const tabs = [
    { id: 'calculator', label: 'Ascent & Burst Calculator', icon: '🧮' },
    { id: 'mission', label: 'Mission Planning', icon: '🎈' },
    { id: 'visualization', label: 'Trajectory View', icon: '🗺️' },
    { id: '3d', label: '3D View', icon: '🌍' },
    { id: 'safety', label: 'Prelaunch Communication', icon: '🛡️' },
    { id: 'details', label: 'Flight Details', icon: '📊' },
    { id: 'comparison', label: 'Algorithm Comparison', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'mission':
        return (
          <div className="space-y-6">
            <MissionPlanner
              params={launchParams}
              setParams={setLaunchParams}
              calculatorParams={calculatorParams}
              setCalculatorParams={setCalculatorParams}
              onPredict={handlePredictAndSwitch}
              isLoading={isLoading}
              unitSystem={unitSystem}
              launchWeather={launchWeather}
              mapResizeRef={mapResizeRef}
            />
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Prediction Error</h3>
                <p>{error}</p>
              </div>
            )}
          </div>
        );
      case 'calculator':
        return (
          <CalculatorTab
            calculatorParams={calculatorParams}
            setCalculatorParams={setCalculatorParams}
            unitSystem={unitSystem}
            missionParams={launchParams}
            setMissionParams={setLaunchParams}
            onApplyAndSwitch={handleApplyAndSwitchToMission}
          />
        );
      case 'visualization':
        return prediction ? (
          <div className="min-h-[700px] max-h-[90vh] overflow-auto">
            <ErrorBoundary>
              <LeafletVisualization 
                result={prediction} 
                mapResizeRef={leafletMapResizeRef}
                launchWeather={launchWeather}
                launchParams={launchParams}
                prediction={prediction}
                unitSystem={unitSystem}
                error={error}
                tabSwitchCount={tabSwitchCount}
              />
            </ErrorBoundary>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold mb-2">Trajectory Visualization</h3>
            <p>Run a prediction first to view the trajectory</p>
          </div>
        );
      case '3d':
        return (
          <div className="min-h-[700px] max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-semibold text-cyan-300 mb-2">🌍 Cesium Globe View</h3>
            <GlobeVisualization 
              result={prediction} 
            />
          </div>
        );
      case 'safety':
        return prediction ? (
          <div className="space-y-6">
            <SafetyInfo 
              result={prediction} 
              unitSystem={unitSystem} 
              launchARTCC={launchARTCC}
              landingARTCC={landingARTCC}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">🛡️</div>
            <h3 className="text-xl font-semibold mb-2">Prelaunch Communication</h3>
            <p>Run a prediction first to view safety information</p>
          </div>
        );
      
      case 'details':
        return prediction ? (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Flight Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-blue-400 mb-3">Launch Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Location:</span>
                      <span>{prediction?.launchPoint?.lat?.toFixed(4) || 'N/A'}°, {prediction?.launchPoint?.lon?.toFixed(4) || 'N/A'}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Launch Time:</span>
                      <span>{new Date(launchParams.launchTime).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ARTCC:</span>
                      <span>{launchARTCC || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-green-400 mb-3">Landing Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Location:</span>
                      <span>{prediction?.landingPoint?.lat?.toFixed(4) || 'N/A'}°, {prediction?.landingPoint?.lon?.toFixed(4) || 'N/A'}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Flight Duration:</span>
                      <span>{prediction.flightDuration ? Math.round(prediction.flightDuration / 60) : 'Unknown'} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ARTCC:</span>
                      <span>{landingARTCC || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Trajectory Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {prediction.maxAltitude ? (
                      unitSystem === 'metric' 
                        ? `${Math.round(prediction.maxAltitude)}m`
                        : `${Math.round(prediction.maxAltitude * 3.28084)}ft`
                    ) : 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-400">Max Altitude</div>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {prediction.distance ? (
                      unitSystem === 'metric'
                        ? `${Math.round(prediction.distance / 1000)}km`
                        : `${Math.round(prediction.distance * 0.000621371)}mi`
                    ) : 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-400">Total Distance</div>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {prediction.flightDuration ? Math.round(prediction.flightDuration / 60) : 'Unknown'}min
                  </div>
                  <div className="text-sm text-gray-400">Flight Time</div>
                </div>
              </div>
            </div>
            <APRSTrackingPanel />
            {weatherData && (
              <LivePredictionPanel
                originalPrediction={prediction}
                launchParams={launchParams}
                weatherData={weatherData}
                unitSystem={unitSystem}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Flight Details</h3>
            <p>Run a prediction first to view detailed flight information</p>
          </div>
        );
      
      case 'comparison':
        return (
          <div className="space-y-6">
            <AlgorithmComparisonPanel />
          </div>
        );
      
      case 'settings':
        return <SettingsTab />;
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Mobile-friendly tab navigation */}
      <div className="bg-gray-700 border-b border-gray-600 overflow-x-auto">
        <div className="flex min-w-max sm:justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex-shrink-0 px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium transition-colors duration-200 min-h-[48px] ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white border-b-2 border-cyan-400'
                  : 'text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <span className="text-xs sm:text-sm whitespace-nowrap">{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-3 sm:p-4 lg:p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

const SettingsTab: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [callsign, setCallsign] = useState('');
  const [cesiumToken, setCesiumToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ singlePoints: number; grids: number; totalSize: number }>({ singlePoints: 0, grids: 0, totalSize: 0 });

  useEffect(() => {
    const storedApiKey = localStorage.getItem('aprsFiApiKey');
    if (storedApiKey) setApiKey(storedApiKey);
    const storedCallsign = localStorage.getItem('aprsFiCallsign');
    if (storedCallsign) setCallsign(storedCallsign);
    const storedCesiumToken = localStorage.getItem('cesiumIonAccessToken');
    if (storedCesiumToken) setCesiumToken(storedCesiumToken);
    
    // Update cache statistics
    setCacheStats(getCacheStats());
  }, []);

  const handleSave = () => {
    localStorage.setItem('aprsFiApiKey', apiKey);
    localStorage.setItem('aprsFiCallsign', callsign);
    localStorage.setItem('cesiumIonAccessToken', cesiumToken);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
      <h2 className="text-2xl font-semibold mb-4 text-cyan-300">Settings</h2>
      <div className="mb-4">
        <label className="block text-gray-300 font-medium mb-1">APRS Callsign</label>
        <input
          type="text"
          value={callsign}
          onChange={e => setCallsign(e.target.value.toUpperCase())}
          className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring focus:border-cyan-500"
          placeholder="E.g., N0CALL-9"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-300 font-medium mb-1">APRS.fi API Key</label>
        <div className="text-xs text-gray-400 mb-1">
          <b>How to get your APRS.fi API key:</b>
          <ol className="list-decimal list-inside ml-4">
            <li>Go to <a href="https://aprs.fi/page/api" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">aprs.fi API page</a>.</li>
            <li>Sign in or create a free account.</li>
            <li>Request a new API key for your application.</li>
            <li>Copy the API key and paste it below.</li>
          </ol>
        </div>
        <input
          type="text"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring focus:border-cyan-500"
          placeholder="Enter your aprs.fi API key"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-300 font-medium mb-1">Cesium Ion Access Token</label>
        <div className="text-xs text-gray-400 mb-1">
          <b>How to get your Cesium Ion Access Token:</b>
          <ol className="list-decimal list-inside ml-4">
            <li>Go to <a href="https://cesium.com/ion/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Cesium Ion Tokens page</a>.</li>
            <li>Sign in or create a free account.</li>
            <li>Create a new access token for your application.</li>
            <li>Copy the token and paste it below.</li>
          </ol>
        </div>
        <input
          type="text"
          value={cesiumToken}
          onChange={e => setCesiumToken(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring focus:border-cyan-500"
          placeholder="Enter your Cesium Ion access token"
        />
      </div>
      <button
        onClick={handleSave}
        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow transition"
      >
        Save Settings
      </button>
      {saved && <span className="ml-3 text-green-400">Saved!</span>}
      
      {/* Cache Statistics */}
      <div className="mt-6 p-4 bg-gray-900 rounded border border-gray-700">
        <h3 className="text-lg font-semibold text-cyan-300 mb-3">Elevation Cache Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-800 rounded">
            <div className="text-2xl font-bold text-blue-400">{cacheStats.singlePoints}</div>
            <div className="text-gray-400">Single Points</div>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded">
            <div className="text-2xl font-bold text-green-400">{cacheStats.grids}</div>
            <div className="text-gray-400">Elevation Grids</div>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded">
            <div className="text-2xl font-bold text-purple-400">{Math.round(cacheStats.totalSize / 1024)}KB</div>
            <div className="text-gray-400">Cache Size</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          <p>• Cache reduces API calls and improves performance</p>
          <p>• Data expires after 24 hours</p>
          <p>• Cache is automatically cleaned up</p>
        </div>
      </div>
      
      <div className="bg-gray-900 p-4 rounded border border-gray-700 mt-4">
        <p className="text-yellow-300 text-xs">
          Never share your API keys or access tokens publicly or commit them to version control.
        </p>
      </div>
    </div>
  );
};

// Note: API keys should be managed through environment variables or settings UI

const APRSTrackingPanel: React.FC = () => {
  const [callsign, setCallsign] = useState('');
  const [positions, setPositions] = useState<APRSPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  // Get API key from localStorage
  const apiKey = localStorage.getItem('aprsFiApiKey') || '';

  // Load last used callsign
  useEffect(() => {
    const stored = localStorage.getItem('aprsFiCallsign');
    if (stored) setCallsign(stored);
  }, []);

  // Fetch APRS positions
  const fetchPositions = useCallback(async () => {
    if (!APRSService.isValidCallsign(callsign)) {
      setError('Please enter a valid APRS callsign (e.g., N0CALL-9).');
      setPositions([]);
      return;
    }
    if (!apiKey) {
      setError('API key missing. Enter it in Settings.');
      setPositions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const aprsService = APRSService.create(apiKey);
      const data = await aprsService.fetchPositions(callsign);
      
      if (data.result === 'fail') {
        setError(data.description || 'APRS.fi API error.');
        setPositions([]);
      } else if (data.found > 0 && data.entries) {
        setPositions(data.entries);
        setError(null);
        localStorage.setItem('aprsFiCallsign', callsign);
        if (mapRef.current && window.L) {
          if (!map) {
            const leafletMap = window.L.map(mapRef.current).setView([data.entries[0].lat, data.entries[0].lng], 10);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors'
            }).addTo(leafletMap);
            setMap(leafletMap);
            window.L.marker([data.entries[0].lat, data.entries[0].lng]).addTo(leafletMap);
          } else {
            map.setView([data.entries[0].lat, data.entries[0].lng], 10);
            map.eachLayer((layer: any) => {
              if (layer instanceof window.L.Marker) map.removeLayer(layer);
            });
            window.L.marker([data.entries[0].lat, data.entries[0].lng]).addTo(map);
          }
        }
      } else {
        setError('No recent positions found for this callsign.');
        setPositions([]);
      }
    } catch {
      setError('Failed to fetch APRS data.');
      setPositions([]);
    }
    setLoading(false);
  }, [callsign, apiKey, map]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!callsign || !apiKey) return;
    fetchPositions();
    const interval = setInterval(() => fetchPositions(), 30000);
    return () => clearInterval(interval);
  }, [callsign, apiKey, fetchPositions]);

  // Load Leaflet if not present
  useEffect(() => {
    if (!window.L && mapRef.current) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet/dist/leaflet.js';
      script.onload = () => fetchPositions();
      document.body.appendChild(script);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, [fetchPositions]);

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mt-6">
      <h3 className="text-xl font-semibold mb-4 text-cyan-300">APRS Real-Time Tracking</h3>
      <div className="mb-4 flex flex-col md:flex-row gap-2 items-end">
        <div className="flex-1">
          <label className="block text-gray-300 font-medium mb-1">APRS Callsign</label>
          <input
            type="text"
            value={callsign}
            onChange={e => setCallsign(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring focus:border-cyan-500"
            placeholder="E.g., NOCALL-11"
          />
        </div>
        <button
                          onClick={() => fetchPositions()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow transition"
          disabled={loading || !callsign || !apiKey}
        >
          {loading ? 'Loading...' : 'Track'}
        </button>
      </div>
      {!apiKey && (
        <div className="text-yellow-400 mb-2">Enter your aprs.fi API key in Settings to enable tracking.</div>
      )}
      {error && <div className="text-red-400 mb-2">{error}</div>}
      <div ref={mapRef} className="w-full h-64 rounded mb-4" style={{ minHeight: 256, background: '#222' }} />
      {positions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-gray-200">
            <thead>
              <tr className="bg-gray-800">
                <th className="px-2 py-1">Time</th>
                <th className="px-2 py-1">Latitude</th>
                <th className="px-2 py-1">Longitude</th>
                <th className="px-2 py-1">Altitude</th>
                <th className="px-2 py-1">Speed</th>
                <th className="px-2 py-1">Course</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => (
                <tr key={i} className="odd:bg-gray-800 even:bg-gray-700">
                  <td className="px-2 py-1">{new Date(pos.time * 1000).toLocaleString()}</td>
                  <td className="px-2 py-1">{pos.lat}</td>
                  <td className="px-2 py-1">{pos.lng}</td>
                  <td className="px-2 py-1">{pos.altitude || 'N/A'}</td>
                  <td className="px-2 py-1">{pos.speed || 'N/A'}</td>
                  <td className="px-2 py-1">{pos.course || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TabbedInterface; 