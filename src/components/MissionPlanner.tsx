import React, { useCallback, useState, RefObject, useEffect } from 'react';
import { LaunchParams, CalculatorParams, UnitSystem, CalculationBreakdown, LaunchWeather } from '../types/index';
import ImprovedMapSelector from './ImprovedMapSelector';
import { LoadingSpinner, ExternalLinkIcon, WindArrowIcon } from './icons/IconComponents';

import { getGroundElevation, formatElevation } from '../services/elevationService';
import CalculationDetailsModal from './CalculationDetailsModal';
import {
  metersToFeet, feetToMeters,
  msToFts, ftsToMs,
} from '../constants/index';

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

  onPredict, isLoading, unitSystem,
  launchWeather, mapResizeRef
}) => {
  const [calculationDetails] = useState<CalculationBreakdown | null>(null);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);

  const [isLoadingElevation, setIsLoadingElevation] = useState(false);
  const [groundElevation, setGroundElevation] = useState<number | null>(null);

  const isImperial = unitSystem === 'imperial';

  // Initialize ground elevation on component mount
  useEffect(() => {
    const initializeElevation = async () => {
      if (params.lat && params.lon) {
        setIsLoadingElevation(true);
        try {
          const elevation = await getGroundElevation(params.lat, params.lon);
          setGroundElevation(elevation);
        } catch (error) {
          console.warn('Failed to initialize ground elevation:', error);
        } finally {
          setIsLoadingElevation(false);
        }
      }
    };

    initializeElevation();
  }, []); // Only run once on mount

  const handleParamChange = (field: keyof Omit<LaunchParams, 'launchTime' | 'lat' | 'lon'>, value: string) => {
    const numericValue = parseFloat(value) || 0;
    let metricValue = numericValue;
    if (isImperial) {
        if (field === 'launchAltitude' || field === 'burstAltitude') metricValue = feetToMeters(numericValue);
        if (field === 'ascentRate' || field === 'descentRate') metricValue = ftsToMs(numericValue);
    }
    setParams((prev: LaunchParams) => ({ ...prev, [field]: metricValue }));
  };
  


  const handleMapChange = useCallback(async (lat: number, lon: number) => {
    setParams((prev: LaunchParams) => ({ ...prev, lat, lon }));
    
    // Fetch ground elevation for the selected location
    setIsLoadingElevation(true);
    try {
      const elevation = await getGroundElevation(lat, lon);
      setGroundElevation(elevation);
      setParams((prev: LaunchParams) => ({ ...prev, launchAltitude: elevation }));
    } catch (error) {
      console.warn('Failed to fetch ground elevation:', error);
    } finally {
      setIsLoadingElevation(false);
    }
  }, [setParams]);
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams((prev: LaunchParams) => ({ ...prev, launchTime: e.target.value }));
  };


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
            <input type="number" value={params.lat} onChange={e => setParams((p: LaunchParams) => ({...p, lat: parseFloat(e.target.value) || 0}))} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400">Launch Longitude</label>
            <input type="number" value={params.lon} onChange={e => setParams((p: LaunchParams) => ({...p, lon: parseFloat(e.target.value) || 0}))} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
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
          {/* Launch Altitude with ground elevation indicator */}
          <div>
            <label className="block text-sm font-medium text-gray-400">
              Launch Alt. ({lUnit})
              {groundElevation && (
                <span className="ml-2 text-xs text-green-400">
                  Ground: {formatElevation(groundElevation, isImperial)}
                </span>
              )}
              {isLoadingElevation && (
                <span className="ml-2 text-xs text-yellow-400">
                  Loading elevation...
                </span>
              )}
            </label>
            <input 
              type="number" 
              value={isImperial ? metersToFeet(params.launchAltitude).toFixed(0) : params.launchAltitude.toString()}
              onChange={e => handleParamChange('launchAltitude', e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          
          {/* Other parameters */}
          {([
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
              {launchWeather.ground && <ForecastRow label="Ground (~1000hPa)" weather={launchWeather.ground} unitSystem={unitSystem} />}
              {launchWeather.mid && <ForecastRow label="Mid (~500hPa)" weather={launchWeather.mid} unitSystem={unitSystem} />}
              {launchWeather.jet && <ForecastRow label="Jet (~250hPa)" weather={launchWeather.jet} unitSystem={unitSystem} />}
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
            <label htmlFor="aprs-callsign" className="block text-sm font-medium text-gray-400">Tracking Callsign</label>
            <div className="flex gap-2">
              <input 
                id="aprs-callsign"
                type="text" 
                value={params.trackingCallsign || ''}
                onChange={e => setParams((prev: LaunchParams) => ({ ...prev, trackingCallsign: e.target.value.toUpperCase() }))}
                placeholder="E.g., N0CALL-11"
                className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              />
              <a 
                href={`https://aprs.fi/#!call=a%2F${params.trackingCallsign || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-white transition-colors
                  ${!params.trackingCallsign ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500'}`}
                onClick={e => !params.trackingCallsign && e.preventDefault()}
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
