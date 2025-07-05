import React, { useCallback, useState, RefObject } from 'react';
import { LaunchParams, CalculatorParams, UnitSystem, CalculationBreakdown, LaunchWeather } from '../types';
import ImprovedMapSelector from './ImprovedMapSelector';
import { LoadingSpinner, CalculatorIcon, ExternalLinkIcon, WindArrowIcon } from './icons/IconComponents';
import { calculateFlightPerformance } from '../services/predictionService';
import CalculationDetailsModal from './CalculationDetailsModal';
import {
  metersToFeet, feetToMeters,
  msToFts, ftsToMs,
  gToOz, ozToG
} from '../constants';

interface MissionPlannerProps {
  params: LaunchParams;
  setParams: React.Dispatch<React.SetStateAction<LaunchParams>>;
  calculatorParams: CalculatorParams;
  setCalculatorParams: React.Dispatch<React.SetStateAction<CalculatorParams>>;
  onPredict: () => void;
  isLoading: boolean;
  unitSystem: UnitSystem;
  launchWeather: LaunchWeather | null;
  mapResizeRef?: RefObject<() => void>;
}

const ForecastRow: React.FC<{
  label: string;
  weather: { speed: number; direction: number };
  unitSystem: UnitSystem;
}> = ({ label, weather, unitSystem }) => {
  const isImperial = unitSystem === 'imperial';
  // API provides m/s, convert to mph for imperial display
  const speed = isImperial ? weather.speed * 2.23694 : weather.speed;
  const unit = isImperial ? 'mph' : 'm/s';

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400 w-28">{label}</span>
      <span className="font-mono text-cyan-300 w-24 text-right">{speed.toFixed(1)} {unit}</span>
      <div className="flex items-center gap-2 w-20 justify-end">
        <span className="font-mono text-cyan-300">{weather.direction.toFixed(0)}°</span>
        <WindArrowIcon rotation={weather.direction} />
      </div>
    </div>
  );
};

const MissionPlanner: React.FC<MissionPlannerProps> = ({
  params, setParams,
  calculatorParams, setCalculatorParams,
  onPredict, isLoading, unitSystem,
  launchWeather, mapResizeRef
}) => {
  const [calculationDetails, setCalculationDetails] = useState<CalculationBreakdown | null>(null);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [aprsCallsign, setAprsCallsign] = useState('');

  const isImperial = unitSystem === 'imperial';

  const handleParamChange = (field: keyof Omit<LaunchParams, 'launchTime' | 'lat' | 'lon'>, value: string) => {
    const numericValue = parseFloat(value) || 0;
    let metricValue = numericValue;
    if (isImperial) {
        if (field === 'launchAltitude' || field === 'burstAltitude') metricValue = feetToMeters(numericValue);
        if (field === 'ascentRate' || field === 'descentRate') metricValue = ftsToMs(numericValue);
    }
    setParams(prev => ({ ...prev, [field]: metricValue }));
  };
  
  const handleCalcInputChange = (field: keyof CalculatorParams, value: string) => {
    if (field === 'gas') {
      setCalculatorParams(prev => ({ ...prev, gas: value as 'Helium' | 'Hydrogen' }));
      return;
    }
    const numericValue = parseFloat(value) || 0;
    const metricValue = isImperial ? ozToG(numericValue) : numericValue;
    setCalculatorParams(prev => ({ ...prev, [field]: metricValue }));
  };

  const handleMapChange = useCallback((lat: number, lon: number) => {
    setParams(prev => ({ ...prev, lat, lon }));
  }, [setParams]);
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams(prev => ({ ...prev, launchTime: e.target.value }));
  };

  const handleCalculate = () => {
    setCalcError(null);
    setCalculationDetails(null);
    const results = calculateFlightPerformance(calculatorParams, params.launchAltitude);
    if (!results) {
        setCalcError("Invalid input. Please check balloon weight and other values.");
    } else {
        setCalculationDetails(results);
    }
  };

  const handleApply = () => {
    if (calculationDetails) {
        setParams(prev => ({
            ...prev,
            ascentRate: calculationDetails.ascentRate,
            burstAltitude: calculationDetails.burstAltitude,
        }));
    }
  };
  
  const wUnit = isImperial ? 'oz' : 'g';
  const lUnit = isImperial ? 'ft' : 'm';
  const sUnit = isImperial ? 'ft/s' : 'm/s';

  const today = new Date();
  const minDate = today.toISOString().slice(0, 16);
  today.setDate(today.getDate() + 15);
  const maxDate = today.toISOString().slice(0, 16);

  return (
    <>
      {isCalcModalOpen && calculationDetails && (
        <CalculationDetailsModal
          details={calculationDetails}
          unitSystem={unitSystem}
          onClose={() => setIsCalcModalOpen(false)}
        />
      )}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-cyan-300">Mission Planning</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-400">Launch Latitude</label>
            <input type="number" value={params.lat} onChange={e => setParams(p => ({...p, lat: parseFloat(e.target.value) || 0}))} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400">Launch Longitude</label>
            <input type="number" value={params.lon} onChange={e => setParams(p => ({...p, lon: parseFloat(e.target.value) || 0}))} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
          </div>
        </div>

        <div className="mb-4">
          <ImprovedMapSelector lat={params.lat} lon={params.lon} onMapChange={handleMapChange} mapResizeRef={mapResizeRef} />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400">Launch Date & Time</label>
          <input 
            type="datetime-local" 
            value={params.launchTime} 
            onChange={handleDateChange}
            min={minDate}
            max={maxDate}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {([
            {label: `Launch Alt. (${lUnit})`, field: 'launchAltitude', value: isImperial ? metersToFeet(params.launchAltitude).toFixed(0) : params.launchAltitude.toString()},
            {label: `Burst Alt. (${lUnit})`, field: 'burstAltitude', value: isImperial ? metersToFeet(params.burstAltitude).toFixed(0) : params.burstAltitude.toString()},
            {label: `Ascent Rate (${sUnit})`, field: 'ascentRate', value: isImperial ? msToFts(params.ascentRate).toFixed(2) : params.ascentRate.toString()},
            {label: `Descent Rate (${sUnit})`, field: 'descentRate', value: isImperial ? msToFts(params.descentRate).toFixed(2) : params.descentRate.toString()},
          ] as const).map(({label, field, value}) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-400">{label}</label>
              <input type="number" value={value} onChange={e => handleParamChange(field, e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
            </div>
          ))}
        </div>
        
        {launchWeather && (
          <div className="bg-gray-900/50 border border-gray-700 p-4 rounded-lg mb-4">
            <h4 className="font-semibold text-gray-300 mb-3 text-center">Launch Time Weather Forecast</h4>
            <div className="space-y-2">
              <ForecastRow label="Ground (~1000hPa)" weather={launchWeather.ground} unitSystem={unitSystem} />
              <ForecastRow label="Mid (~500hPa)" weather={launchWeather.mid} unitSystem={unitSystem} />
              <ForecastRow label="Jet (~250hPa)" weather={launchWeather.jet} unitSystem={unitSystem} />
            </div>
          </div>
        )}

        <button 
          onClick={onPredict}
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading ? (
            <>
              <LoadingSpinner />
              Predicting...
            </>
          ) : (
            "Predict Flight Trajectory"
          )}
        </button>
      </div>

      {/* Real-Time Tracking Section */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mt-8">
        <h2 className="text-xl font-semibold mb-4 text-cyan-300">Real-Time Tracking</h2>
        <div className="space-y-2">
            <label htmlFor="aprs-callsign" className="block text-sm font-medium text-gray-400">APRS Callsign</label>
            <div className="flex gap-2">
              <input 
                id="aprs-callsign"
                type="text" 
                value={aprsCallsign}
                onChange={e => setAprsCallsign(e.target.value.toUpperCase())}
                placeholder="E.g., N0CALL-11"
                className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              />
              <a 
                href={`https://aprs.fi/#!call=a%2F${aprsCallsign}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-white transition-colors
                  ${!aprsCallsign ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500'}`}
                onClick={e => !aprsCallsign && e.preventDefault()}
              >
                Track <ExternalLinkIcon />
              </a>
            </div>
            <p className="text-xs text-gray-500 pt-1">Enter your tracker's callsign to view its live position on aprs.fi.</p>
        </div>
      </div>
    </>
  );
};

export default MissionPlanner;
