import React, { useState } from 'react';
import { CalculatorParams, UnitSystem, LaunchParams } from '../types';
import { calculateFlightPerformance } from '../services/predictionService';
import {
  metersToFeet, feetToMeters,
  msToFts, ftsToMs,
  gToOz, ozToG
} from '../constants';

interface CalculatorTabProps {
  calculatorParams: CalculatorParams;
  setCalculatorParams: (params: CalculatorParams) => void;
  unitSystem: UnitSystem;
  missionParams: LaunchParams;
  setMissionParams: (params: LaunchParams) => void;
  onApplyAndSwitch?: () => void;
}

const CalculatorTab: React.FC<CalculatorTabProps> = ({
  calculatorParams,
  setCalculatorParams,
  unitSystem,
  missionParams,
  setMissionParams,
  onApplyAndSwitch
}) => {
  const [calculationDetails, setCalculationDetails] = useState<any>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const isImperial = unitSystem === 'imperial';
  const wUnit = isImperial ? 'oz' : 'g';
  const lUnit = isImperial ? 'ft' : 'm';
  const sUnit = isImperial ? 'ft/s' : 'm/s';

  const handleCalcInputChange = (field: keyof CalculatorParams, value: string) => {
    if (field === 'gas') {
      setCalculatorParams({ ...calculatorParams, gas: value as 'Helium' | 'Hydrogen' });
      return;
    }
    const numericValue = parseFloat(value) || 0;
    const metricValue = isImperial ? ozToG(numericValue) : numericValue;
    setCalculatorParams({ ...calculatorParams, [field]: metricValue });
  };

  const handleCalculate = () => {
    setCalcError(null);
    setCalculationDetails(null);
    const results = calculateFlightPerformance(calculatorParams, missionParams.launchAltitude);
    if (!results) {
      setCalcError('Invalid input. Please check balloon weight and other values.');
    } else {
      setCalculationDetails(results);
    }
  };

  const handleApply = () => {
    if (calculationDetails) {
      setMissionParams({
        ...missionParams,
        ascentRate: calculationDetails.ascentRate,
        burstAltitude: calculationDetails.burstAltitude,
      });
      if (onApplyAndSwitch) onApplyAndSwitch();
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-cyan-300 flex items-center gap-2">🧮 Ascent & Burst Calculator</h2>
      <div className="mb-6 text-gray-300 text-base leading-relaxed">
        <p>
          This calculator estimates your balloon's <span className="text-cyan-300 font-semibold">ascent rate</span> and <span className="text-cyan-300 font-semibold">burst altitude</span> based on your payload, balloon, parachute, neck lift, and gas type. Accurate values are critical for predicting the flight path and ensuring a safe recovery.
        </p>
        <ul className="list-disc pl-6 mt-3 text-sm text-gray-400">
          <li><span className="text-white font-semibold">Payload Weight:</span> Total mass of all equipment attached to the balloon (trackers, cameras, etc).</li>
          <li><span className="text-white font-semibold">Balloon Weight:</span> The empty mass of the latex or plastic balloon.</li>
          <li><span className="text-white font-semibold">Parachute Weight:</span> The mass of the parachute used for descent.</li>
          <li><span className="text-white font-semibold">Neck Lift:</span> The upward force (in {wUnit}) measured at the balloon neck after inflation. This is a key value for ascent rate.</li>
          <li><span className="text-white font-semibold">Lifting Gas:</span> Choose between Helium and Hydrogen. Hydrogen provides more lift for the same mass.</li>
        </ul>
        <p className="mt-3 text-yellow-300">
          <b>Tip:</b> Use a digital scale to measure neck lift. Too much lift can cause a fast ascent and early burst; too little can result in a slow ascent and missed predictions.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-400">Payload Weight ({wUnit})</label>
          <input
            type="number"
            value={isImperial ? gToOz(calculatorParams.payloadWeight).toFixed(2) : calculatorParams.payloadWeight}
            onChange={e => handleCalcInputChange('payloadWeight', e.target.value)}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
          />
          <p className="text-xs text-gray-400 mt-1">All equipment attached to the balloon.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Balloon Weight ({wUnit})</label>
          <input
            type="number"
            value={isImperial ? gToOz(calculatorParams.balloonWeight).toFixed(2) : calculatorParams.balloonWeight}
            onChange={e => handleCalcInputChange('balloonWeight', e.target.value)}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
          />
          <p className="text-xs text-gray-400 mt-1">Empty mass of the balloon (from packaging).</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Parachute Weight ({wUnit})</label>
          <input
            type="number"
            value={isImperial ? gToOz(calculatorParams.parachuteWeight).toFixed(2) : calculatorParams.parachuteWeight}
            onChange={e => handleCalcInputChange('parachuteWeight', e.target.value)}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
          />
          <p className="text-xs text-gray-400 mt-1">Mass of the parachute for descent.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Neck Lift ({wUnit})</label>
          <input
            type="number"
            value={isImperial ? gToOz(calculatorParams.neckLift).toFixed(2) : calculatorParams.neckLift}
            onChange={e => handleCalcInputChange('neckLift', e.target.value)}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
          />
          <p className="text-xs text-gray-400 mt-1">Measured upward force at the balloon neck after inflation.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Lifting Gas</label>
          <select
            value={calculatorParams.gas}
            onChange={e => handleCalcInputChange('gas', e.target.value)}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option>Helium</option>
            <option>Hydrogen</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Hydrogen is lighter and provides more lift than Helium.</p>
        </div>
      </div>
      <button
        onClick={handleCalculate}
        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors mb-2"
      >
        Calculate
      </button>
      {calcError && <p className="text-red-400 text-sm text-center">{calcError}</p>}
      {calculationDetails && (
        <div className="bg-gray-900 p-4 rounded-lg text-center space-y-3 mt-4">
          <div className="text-lg">
            <span className="font-semibold text-gray-300">Estimated Ascent Rate: </span>
            <span className="font-bold text-cyan-300">{isImperial ? msToFts(calculationDetails.ascentRate).toFixed(2) : calculationDetails.ascentRate.toFixed(2)} {sUnit}</span>
            <p className="text-xs text-gray-400 mt-1">Typical ascent rates are 4-6 m/s (13-20 ft/s). Too fast or too slow can affect prediction accuracy.</p>
          </div>
          <div className="text-lg">
            <span className="font-semibold text-gray-300">Estimated Burst Altitude: </span>
            <span className="font-bold text-cyan-300">{Math.round(isImperial ? metersToFeet(calculationDetails.burstAltitude) : calculationDetails.burstAltitude).toLocaleString()} {lUnit}</span>
            <p className="text-xs text-gray-400 mt-1">Burst altitude depends on balloon size, neck lift, and atmospheric conditions.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Apply to Mission Plan
            </button>
          </div>
        </div>
      )}
      <div className="mt-8 text-gray-400 text-xs border-t border-gray-700 pt-4">
        <b>Note:</b> The calculator uses standard balloon performance models. Real-world results may vary due to temperature, humidity, and manufacturing differences. Always double-check your values and consult with experienced balloonists for best practices.
      </div>
    </div>
  );
};

export default CalculatorTab; 