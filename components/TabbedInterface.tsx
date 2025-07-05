import React, { useState, useRef, useEffect } from 'react';
import { LaunchParams, UnitSystem, CalculatorParams, PredictionResult } from '../types';
import MissionPlanner from './MissionPlanner';
import SafetyInfo from './SafetyInfo';
import Visualization from './Visualization';
import ThreeDVisualization from './ThreeDVisualization';
import LeafletVisualization from './LeafletVisualization';
import CalculatorTab from './CalculatorTab';
import { ComprehensiveWeather } from '../types';
import GlobeVisualization from './GlobeVisualization';

interface TabbedInterfaceProps {
  launchParams: LaunchParams;
  setLaunchParams: (params: LaunchParams) => void;
  calculatorParams: CalculatorParams;
  setCalculatorParams: (params: CalculatorParams) => void;
  onPredict: () => void;
  isLoading: boolean;
  unitSystem: UnitSystem;
  launchWeather: ComprehensiveWeather | null;
  prediction: PredictionResult | null;
  error: string | null;
  launchARTCC: string | null;
  landingARTCC: string | null;
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
  landingARTCC
}) => {
  const [activeTab, setActiveTab] = useState('calculator');
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const mapResizeRef = useRef<() => void>();
  const leafletMapResizeRef = useRef<() => void>();

  const handlePredictAndSwitch = () => {
    onPredict();
    setTimeout(() => setActiveTab('visualization'), 100);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setTabSwitchCount(c => c + 1);
    if (tabId === 'mission' && mapResizeRef.current) {
      setTimeout(() => mapResizeRef.current && mapResizeRef.current(), 100);
    }
    if (tabId === 'visualization' && leafletMapResizeRef.current) {
      setTimeout(() => leafletMapResizeRef.current && leafletMapResizeRef.current(), 200);
    }
  };

  const handleApplyAndSwitchToMission = () => {
    setActiveTab('mission');
    if (mapResizeRef.current) {
      setTimeout(() => mapResizeRef.current && mapResizeRef.current(), 100);
    }
  };

  const tabs = [
    { id: 'calculator', label: 'Ascent & Burst Calculator', icon: '🧮' },
    { id: 'mission', label: 'Mission Planning', icon: '🚀' },
    { id: 'visualization', label: 'Trajectory View', icon: '🗺️' },
    { id: '3d', label: '3D View', icon: '🌍' },
    { id: 'safety', label: 'Safety Analysis', icon: '🛡️' },
    { id: 'details', label: 'Flight Details', icon: '📊' },
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
              hideCalculator={true}
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
        return (
          <div className="min-h-[700px] max-h-[90vh] overflow-auto">
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
            <h3 className="text-xl font-semibold mb-2">Safety Analysis</h3>
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
                      <span>{prediction.launchPoint.lat.toFixed(4)}°, {prediction.launchPoint.lon.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Launch Time:</span>
                      <span>{new Date(prediction.launchTime).toLocaleString()}</span>
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
                      <span>{prediction.landingPoint.lat.toFixed(4)}°, {prediction.landingPoint.lon.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Flight Duration:</span>
                      <span>{Math.round(prediction.flightDuration / 60)} minutes</span>
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
                    {unitSystem === 'metric' 
                      ? `${Math.round(prediction.maxAltitude)}m`
                      : `${Math.round(prediction.maxAltitude * 3.28084)}ft`
                    }
                  </div>
                  <div className="text-sm text-gray-400">Max Altitude</div>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {unitSystem === 'metric'
                      ? `${Math.round(prediction.distance / 1000)}km`
                      : `${Math.round(prediction.distance * 0.000621371)}mi`
                    }
                  </div>
                  <div className="text-sm text-gray-400">Total Distance</div>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {Math.round(prediction.flightDuration / 60)}min
                  </div>
                  <div className="text-sm text-gray-400">Flight Time</div>
                </div>
              </div>
            </div>
            <APRSTrackingPanel />
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Flight Details</h3>
            <p>Run a prediction first to view detailed flight information</p>
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
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

const SettingsTab: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [callsign, setCallsign] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('aprsFiApiKey');
    if (storedApiKey) setApiKey(storedApiKey);
    const storedCallsign = localStorage.getItem('aprsFiCallsign');
    if (storedCallsign) setCallsign(storedCallsign);
  }, []);

  const handleSave = () => {
    localStorage.setItem('aprsFiApiKey', apiKey);
    localStorage.setItem('aprsFiCallsign', callsign);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
      <h2 className="text-2xl font-semibold mb-4 text-cyan-300">Settings</h2>
      <div className="mb-4">
        <label className="block text-gray-300 font-medium mb-1">APRS.fi API Key</label>
        <input
          type="text"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring focus:border-cyan-500"
          placeholder="Enter your aprs.fi API key"
        />
      </div>
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
      <button
        onClick={handleSave}
        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow transition"
      >
        Save Settings
      </button>
      {saved && <span className="ml-3 text-green-400">Saved!</span>}
      <div className="bg-gray-900 p-4 rounded border border-gray-700 mt-4">
        <h3 className="text-lg font-semibold text-cyan-200 mb-2">How to get your aprs.fi API key</h3>
        <ol className="list-decimal list-inside text-gray-300 space-y-1">
          <li>Go to <a href="https://aprs.fi/page/api" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">aprs.fi API page</a>.</li>
          <li>Sign in or create a free account.</li>
          <li>Request a new API key for your application.</li>
          <li>Copy the API key and paste it above.</li>
        </ol>
        <p className="mt-2 text-yellow-300 text-xs">Never share your API key publicly or commit it to version control.</p>
      </div>
    </div>
  );
};

// Try to load api.keys from the project root (for local dev convenience)
let fileApiKey = '';
try {
  // @ts-ignore
  if (typeof window === 'undefined') {
    // Node.js context (e.g., SSR or build)
    const fs = require('fs');
    if (fs.existsSync('./api.keys')) {
      const lines = fs.readFileSync('./api.keys', 'utf-8').split('\n');
      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key && value && key.trim() === 'APRS_FI_API_KEY') {
          fileApiKey = value.trim();
        }
      }
    }
  }
} catch {}

const APRSTrackingPanel: React.FC = () => {
  const [callsign, setCallsign] = useState('');
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  // Prefer fileApiKey if present, else localStorage
  const apiKey = fileApiKey || localStorage.getItem('aprsFiApiKey') || '';

  // Load last used callsign
  useEffect(() => {
    const stored = localStorage.getItem('aprsFiCallsign');
    if (stored) setCallsign(stored);
  }, []);

  // Callsign validation
  const isValidCallsign = (cs: string) => /^[A-Z0-9]{1,6}(-[0-9A-Z]{1,2})?$/i.test(cs);

  // Fetch APRS positions
  const fetchPositions = async (manual?: boolean) => {
    if (!isValidCallsign(callsign)) {
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
      const url = `/aprs/get?name=${encodeURIComponent(callsign)}&what=loc&apikey=${apiKey}&format=json`;
      const res = await fetch(url);
      const data = await res.json();
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
    } catch (e) {
      setError('Failed to fetch APRS data.');
      setPositions([]);
    }
    setLoading(false);
  };

  // Auto-refresh every 30s
  useEffect(() => {
    if (!callsign || !apiKey) return;
    fetchPositions();
    const interval = setInterval(() => fetchPositions(), 30000);
    return () => clearInterval(interval);
  }, [callsign, apiKey]);

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
  }, []);

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
          onClick={() => fetchPositions(true)}
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