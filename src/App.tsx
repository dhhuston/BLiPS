import React, { useState, useEffect } from 'react';
import { LaunchParams, UnitSystem, CalculatorParams, AppConfig } from './types';
import { usePrediction } from './hooks/usePrediction';
import Header from './components/Header';
import TabbedInterface from './components/TabbedInterface';
import LiabilityModal from './components/LiabilityModal';
import ErrorBoundary from './components/ErrorBoundary';
import { getARTCC } from './services/atcService';
import { initializeElevationCache } from './services/elevationService';

const getDefaultLaunchTime = () => {
  const now = new Date();
  // Round up to the next hour for a sensible default
  now.setHours(now.getHours() + 1);
  now.setMinutes(0);
  now.setSeconds(0);
  now.setMilliseconds(0);
  
  // Format for datetime-local input (YYYY-MM-DDTHH:mm)
  const offset = now.getTimezoneOffset();
  const localTime = new Date(now.getTime() - (offset*60*1000));
  return localTime.toISOString().slice(0,16);
};


const App: React.FC = () => {
  const [launchParams, setLaunchParams] = useState<LaunchParams>({
    lat: 40.4123056,
    lon: -86.9368889,
    launchTime: getDefaultLaunchTime(),
    launchAltitude: 204,
    ascentRate: 5,
    burstAltitude: 30000,
    descentRate: 6,
    trackingCallsign: '',
  });

  const [calculatorParams, setCalculatorParams] = useState<CalculatorParams>({
    payloadWeight: 1200,
    balloonWeight: 600,
    parachuteWeight: 150,
    neckLift: 800,
    gas: 'Helium',
  });

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [showLiabilityModal, setShowLiabilityModal] = useState(false);
  
  const { prediction, isLoading, error, runPrediction, launchWeather, weatherData } = usePrediction();
  const [launchARTCC, setLaunchARTCC] = useState<string | null>(null);
  const [landingARTCC, setLandingARTCC] = useState<string | null>(null);

  useEffect(() => {
    if (prediction && prediction.launchPoint && prediction.landingPoint) {
      const launchCenter = getARTCC(prediction.launchPoint.lat, prediction.launchPoint.lon);
      const landingCenter = getARTCC(prediction.landingPoint.lat, prediction.landingPoint.lon);
      setLaunchARTCC(launchCenter);
      setLandingARTCC(landingCenter);
    } else {
      // Clear ARTCC info if there's no prediction
      setLaunchARTCC(null);
      setLandingARTCC(null);
    }
  }, [prediction]);

  useEffect(() => {
    initializeElevationCache();
  }, []);

  const handlePredict = () => {
    runPrediction(launchParams);
  };

  const handleSaveConfig = () => {
    const config: AppConfig = {
      launchParams,
      calculatorParams,
      unitSystem,
      aprsApiKey: localStorage.getItem('aprsFiApiKey') || '',
      aprsCallsign: localStorage.getItem('aprsFiCallsign') || '',
    };
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `blips-config-${new Date().toISOString().slice(0,10)}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const config: AppConfig = JSON.parse(text);
        
        // Basic validation
        if (config.launchParams && config.calculatorParams && config.unitSystem) {
          setLaunchParams(config.launchParams);
          setCalculatorParams(config.calculatorParams);
          setUnitSystem(config.unitSystem);
          if (config.aprsApiKey !== undefined) {
            localStorage.setItem('aprsFiApiKey', config.aprsApiKey);
          }
          if (config.aprsCallsign !== undefined) {
            localStorage.setItem('aprsFiCallsign', config.aprsCallsign);
          }
        } else {
          alert("Invalid configuration file.");
        }
      } catch (err) {
        console.error("Failed to parse config file:", err);
        alert("Error loading configuration file. It may be corrupt.");
      }
    };
    reader.readAsText(file);
    // Reset file input to allow loading the same file again
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header 
        className="sticky top-0 z-50 bg-gray-900 shadow"
        unitSystem={unitSystem} 
        setUnitSystem={setUnitSystem}
        onSave={handleSaveConfig}
        onLoad={handleLoadConfig}
        onLiabilityClick={() => setShowLiabilityModal(true)}
      />
      <main className="pt-20 p-2 sm:p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <ErrorBoundary>
            <TabbedInterface
              launchParams={launchParams}
              setLaunchParams={setLaunchParams}
              calculatorParams={calculatorParams}
              setCalculatorParams={setCalculatorParams}
              onPredict={handlePredict}
              isLoading={isLoading}
              unitSystem={unitSystem}
              launchWeather={launchWeather}
              prediction={prediction}
              error={error}
              launchARTCC={launchARTCC}
              landingARTCC={landingARTCC}
              weatherData={weatherData}
            />
          </ErrorBoundary>
        </div>
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>BLiPS &copy; 2024. For simulation purposes only. Not for operational use.</p>
        <button 
          onClick={() => setShowLiabilityModal(true)}
          className="text-blue-400 hover:text-blue-300 underline mt-1 min-h-[44px] px-2"
        >
          Legal & Safety Information
        </button>
      </footer>
      
      <LiabilityModal 
        isOpen={showLiabilityModal} 
        onClose={() => setShowLiabilityModal(false)} 
      />
    </div>
  );
};

export default App;
