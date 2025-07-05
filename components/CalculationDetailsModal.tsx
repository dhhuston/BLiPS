
import React from 'react';
import { CalculationBreakdown, UnitSystem } from '../types';
import { CloseIcon } from './icons/IconComponents';
import { msToFts, metersToFeet } from '../constants';

interface ModalProps {
  details: CalculationBreakdown;
  unitSystem: UnitSystem;
  onClose: () => void;
}

const CalculationDetailsModal: React.FC<ModalProps> = ({ details, unitSystem, onClose }) => {
  const isImperial = unitSystem === 'imperial';

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-600"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-cyan-300">Flight Performance Calculations</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <CloseIcon />
          </button>
        </header>

        <div className="overflow-y-auto p-6 space-y-6">
          {details.steps.map((step, index) => (
            <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">{index + 1}. {step.name}</h3>
              <div className="space-y-2 text-sm">
                <p className="flex items-baseline">
                  <span className="w-24 font-semibold text-gray-400 shrink-0">Formula:</span>
                  <code className="text-gray-300 bg-gray-700/50 px-2 py-1 rounded">{step.formula}</code>
                </p>
                <p className="flex items-baseline">
                  <span className="w-24 font-semibold text-gray-400 shrink-0">Calculation:</span>
                  <code className="text-gray-300 bg-gray-700/50 px-2 py-1 rounded break-all">{step.calculation}</code>
                </p>
                <p className="flex items-baseline">
                  <span className="w-24 font-semibold text-gray-400 shrink-0">Result:</span>
                  <code className="text-cyan-300 font-bold bg-gray-700/50 px-2 py-1 rounded">{step.result} {step.unit}</code>
                </p>
              </div>
            </div>
          ))}
        </div>

        <footer className="p-4 border-t border-gray-700 bg-gray-800/50 rounded-b-xl">
            <div className="text-center font-bold text-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 p-3 rounded-lg">
                    <span className="text-gray-300 font-semibold">Final Ascent Rate: </span>
                    <span className="text-cyan-300">{isImperial ? msToFts(details.ascentRate).toFixed(2) + ' ft/s' : details.ascentRate.toFixed(2) + ' m/s'}</span>
                </div>
                 <div className="bg-gray-700/50 p-3 rounded-lg">
                    <span className="text-gray-300 font-semibold">Final Burst Altitude: </span>
                    <span className="text-cyan-300">{Math.round(isImperial ? metersToFeet(details.burstAltitude) : details.burstAltitude).toLocaleString()}{isImperial ? ' ft' : ' m'}</span>
                </div>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default CalculationDetailsModal;