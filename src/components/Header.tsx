import React from 'react';
import { UnitSystem } from '../types/index';
import { SaveIcon, LoadIcon } from './icons/IconComponents';

interface HeaderProps {
    unitSystem: UnitSystem;
    setUnitSystem: (system: UnitSystem) => void;
    onSave: () => void;
    onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onLiabilityClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ unitSystem, setUnitSystem, onSave, onLoad, onLiabilityClick }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <header className="p-3 sm:p-4 lg:p-6 border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            BLiPS
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm lg:text-base">Balloon Launch Prediction Software</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <button 
              onClick={onSave} 
              title="Save Config" 
              className="p-2 sm:p-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <SaveIcon />
            </button>
            <button 
              onClick={handleLoadClick} 
              title="Load Config" 
              className="p-2 sm:p-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <LoadIcon />
            </button>
            <button 
              onClick={onLiabilityClick} 
              title="Legal & Safety Information" 
              className="p-2 sm:p-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-yellow-400 hover:text-yellow-300 min-h-[44px] min-w-[44px] flex items-center justify-center text-lg"
            >
              ⚖️
            </button>
            <input type="file" ref={fileInputRef} onChange={onLoad} accept=".json" className="hidden" />
          </div>

          <div className="flex items-center space-x-1 bg-gray-800 p-1 rounded-lg">
            <button 
              onClick={() => setUnitSystem('metric')} 
              className={`px-3 py-2 text-sm rounded-md transition-colors duration-200 min-h-[44px] font-medium ${
                unitSystem === 'metric' 
                  ? 'bg-cyan-500 text-white shadow-md' 
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              Metric
            </button>
            <button 
              onClick={() => setUnitSystem('imperial')} 
              className={`px-3 py-2 text-sm rounded-md transition-colors duration-200 min-h-[44px] font-medium ${
                unitSystem === 'imperial' 
                  ? 'bg-cyan-500 text-white shadow-md' 
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              Imperial
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;