import React from 'react';
import { UnitSystem } from '../types';
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
    <header className="p-4 lg:p-6 border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            BLiPS
          </h1>
          <p className="text-gray-400 text-sm lg:text-base">Balloon Launch Prediction Software</p>
        </div>

        <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
                <button onClick={onSave} title="Save Config" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                    <SaveIcon />
                </button>
                <button onClick={handleLoadClick} title="Load Config" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                    <LoadIcon />
                </button>
                <button 
                    onClick={onLiabilityClick} 
                    title="Legal & Safety Information" 
                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-yellow-400 hover:text-yellow-300"
                >
                    ⚖️
                </button>
                <input type="file" ref={fileInputRef} onChange={onLoad} accept=".json" className="hidden" />
            </div>

            <div className="flex items-center space-x-1 bg-gray-800 p-1 rounded-lg">
                <button 
                    onClick={() => setUnitSystem('metric')} 
                    className={`px-3 py-1 text-sm rounded-md transition-colors duration-200 ${unitSystem === 'metric' ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    Metric
                </button>
                <button 
                    onClick={() => setUnitSystem('imperial')} 
                    className={`px-3 py-1 text-sm rounded-md transition-colors duration-200 ${unitSystem === 'imperial' ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}
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