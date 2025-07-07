import React, { useState } from 'react';
import { CalculatorParams, UnitSystem, LaunchParams, GoalCalculationResult } from '../types/index';
import { calculateFlightPerformance, calculateGoalOptions } from '../services/predictionService';
import {
  metersToFeet, feetToMeters,
  msToFts,
  gToOz, ozToG
} from '../constants/index';

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
  const [calculationDetails, setCalculationDetails] = useState<{ ascentRate: number; burstAltitude: number } | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [isGoalMode, setIsGoalMode] = useState(false);
  const [targetBurstAltitude, setTargetBurstAltitude] = useState(30000); // Default 30km
  const [goalResults, setGoalResults] = useState<GoalCalculationResult | null>(null);

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

  const handleGoalCalculate = () => {
    setCalcError(null);
    setGoalResults(null);
    
    try {
      const results = calculateGoalOptions(
        targetBurstAltitude,
        calculatorParams.balloonWeight,
        calculatorParams.parachuteWeight,
        calculatorParams.gas,
        missionParams.launchAltitude
      );
      setGoalResults(results);
      
      if (results.warnings.length > 0) {
        setCalcError(results.warnings.join(' '));
      }
    } catch (error) {
      setCalcError('Failed to calculate goal options. Please check your inputs.');
    }
  };

  const handleGoalOptionApply = (payloadWeight: number, neckLift: number, ascentRate: number, burstAltitude: number) => {
    // Update calculator parameters
    setCalculatorParams({
      ...calculatorParams,
      payloadWeight,
      neckLift
    });
    
    // Update mission parameters
    setMissionParams({
      ...missionParams,
      ascentRate,
      burstAltitude
    });
    
    if (onApplyAndSwitch) onApplyAndSwitch();
  };

  const handleModeToggle = () => {
    setIsGoalMode(!isGoalMode);
    setCalculationDetails(null);
    setGoalResults(null);
    setCalcError(null);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-cyan-300 flex items-center gap-2">🧮 Ascent & Burst Calculator</h2>
        
        {/* Mode Toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={isGoalMode}
              onChange={handleModeToggle}
              className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
            />
            <span className="text-sm">Goal Mode</span>
          </label>
        </div>
      </div>
      <div className="mb-6 text-gray-300 text-base leading-relaxed">
        {!isGoalMode ? (
          <>
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
          </>
        ) : (
          <>
            <p>
              <span className="text-cyan-300 font-semibold">Goal Mode:</span> Set your target burst altitude and balloon/parachute specs to get payload weight and neck lift combinations that achieve it. Perfect for mission planning with specific equipment constraints.
            </p>
            <ul className="list-disc pl-6 mt-3 text-sm text-gray-400">
              <li><span className="text-white font-semibold">Target Burst Altitude:</span> The altitude you want your balloon to reach.</li>
              <li><span className="text-white font-semibold">Fixed Parameters:</span> Balloon and parachute weights are your equipment constraints.</li>
              <li><span className="text-white font-semibold">Variable Parameters:</span> Payload weight and neck lift are calculated to meet your target.</li>
              <li><span className="text-white font-semibold">Options:</span> Multiple combinations ranked by feasibility and performance.</li>
            </ul>
            <p className="mt-3 text-yellow-300">
              <b>Tip:</b> Goal mode is ideal when you already know what balloon and parachute you're using and want to optimize payload and gas fill levels.
            </p>
          </>
        )}
      </div>

      {/* Goal Mode Input Fields */}
      {isGoalMode && (
        <div className="mb-6 bg-gray-900/50 p-4 rounded-lg border border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-400">Target Burst Altitude ({lUnit})</label>
              <input
                type="number"
                value={isImperial ? Math.round(metersToFeet(targetBurstAltitude)) : targetBurstAltitude}
                onChange={e => {
                  const value = parseFloat(e.target.value) || 0;
                  const metricValue = isImperial ? feetToMeters(value) : value;
                  setTargetBurstAltitude(metricValue);
                }}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                min={isImperial ? 16404 : 5000} // 5km minimum
                max={isImperial ? 147637 : 45000} // 45km maximum
              />
              <p className="text-xs text-gray-400 mt-1">Typical: 20-40km for weather balloons</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">Lifting Gas</label>
              <select
                value={calculatorParams.gas}
                onChange={e => handleCalcInputChange('gas', e.target.value)}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="Helium">Helium</option>
                <option value="Hydrogen">Hydrogen</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Gas type affects lift capacity</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-400">Balloon Weight ({wUnit})</label>
              <input
                type="number"
                value={isImperial ? gToOz(calculatorParams.balloonWeight).toFixed(2) : calculatorParams.balloonWeight}
                onChange={e => handleCalcInputChange('balloonWeight', e.target.value)}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              />
              <p className="text-xs text-gray-400 mt-1">Balloon size constraint (200g-2000g typical, see packaging)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">Parachute Weight ({wUnit})</label>
              <input
                type="number"
                value={isImperial ? gToOz(calculatorParams.parachuteWeight).toFixed(2) : calculatorParams.parachuteWeight}
                onChange={e => handleCalcInputChange('parachuteWeight', e.target.value)}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              />
              <p className="text-xs text-gray-400 mt-1">Parachute size constraint (50g-500g typical, includes cord)</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Normal Mode Input Fields */}
      {!isGoalMode && (
        <>
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
                <option value="Helium">Helium</option>
                <option value="Hydrogen">Hydrogen</option>
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
        </>
      )}

      {/* Goal Mode Calculate Button and Results */}
      {isGoalMode && (
        <>
          <button
            onClick={handleGoalCalculate}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors mb-2"
          >
            Find Goal Options
          </button>
          {calcError && <p className="text-red-400 text-sm text-center">{calcError}</p>}
          {goalResults && goalResults.options.length > 0 && (
            <div className="bg-gray-900 p-4 rounded-lg mt-4">
              <h3 className="text-lg font-semibold text-cyan-300 mb-4 text-center">
                Goal Options for {isImperial ? Math.round(metersToFeet(targetBurstAltitude)).toLocaleString() + ' ft' : targetBurstAltitude.toLocaleString() + ' m'}
              </h3>
              <div className="space-y-3">
                {goalResults.options.map((option, index) => {
                  const getFeasibilityColor = (feasibility: string) => {
                    switch (feasibility) {
                      case 'excellent': return 'text-green-400 bg-green-900/30';
                      case 'good': return 'text-blue-400 bg-blue-900/30';
                      case 'marginal': return 'text-yellow-400 bg-yellow-900/30';
                      default: return 'text-red-400 bg-red-900/30';
                    }
                  };

                  return (
                    <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="text-white font-semibold">{option.description}</div>
                          <div className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-1 ${getFeasibilityColor(option.feasibility)}`}>
                            {option.feasibility.toUpperCase()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleGoalOptionApply(option.payloadWeight, option.neckLift, option.ascentRate, option.burstAltitude)}
                          className="bg-green-600 hover:bg-green-500 text-white text-sm font-bold py-2 px-3 rounded transition-colors ml-4"
                        >
                          Apply
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-400">Payload:</span>
                          <div className="text-white font-medium">
                            {isImperial ? gToOz(option.payloadWeight).toFixed(1) : option.payloadWeight} {wUnit}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Neck Lift:</span>
                          <div className="text-white font-medium">
                            {isImperial ? gToOz(option.neckLift).toFixed(1) : option.neckLift} {wUnit}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Ascent Rate:</span>
                          <div className="text-white font-medium">
                            {isImperial ? msToFts(option.ascentRate).toFixed(1) : option.ascentRate.toFixed(1)} {sUnit}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Burst Alt:</span>
                          <div className="text-white font-medium">
                            {isImperial ? Math.round(metersToFeet(option.burstAltitude)).toLocaleString() : Math.round(option.burstAltitude).toLocaleString()} {lUnit}
                          </div>
                        </div>
                      </div>
                      
                      {option.notes && (
                        <div className="mt-2 text-xs text-gray-400 italic">
                          {option.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      <div className="mt-8 text-gray-400 text-xs border-t border-gray-700 pt-4">
        <b>Note:</b> The calculator uses standard balloon performance models. Real-world results may vary due to temperature, humidity, and manufacturing differences. Always double-check your values and consult with experienced balloonists for best practices.
      </div>
    </div>
  );
};

export default CalculatorTab; 