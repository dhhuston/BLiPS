import React, { useState } from 'react';
import { PredictionResult, UnitSystem } from '../types';
import LeafletVisualization from './LeafletVisualization';
import GlobeVisualization from './GlobeVisualization';
import AltitudeChart from './AltitudeChart';
import { LoadingSpinner } from './icons/IconComponents';

interface VisualizationProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
  unitSystem: UnitSystem;
}

const Visualization: React.FC<VisualizationProps> = ({ prediction, isLoading, unitSystem }) => {
  const [activeView, setActiveView] = useState<'2d' | '3d'>('2d');

  if (isLoading) {
    return (
      <div className="w-full h-[80vh] bg-gray-800/50 rounded-lg p-6 border border-gray-700 flex flex-col justify-center items-center text-cyan-300">
        <LoadingSpinner className="w-16 h-16" />
        <p className="mt-4 text-lg">Running simulation...</p>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="w-full h-[80vh] bg-gray-800/50 rounded-lg p-6 border border-gray-700 flex flex-col justify-center items-center text-center">
        <h2 className="text-2xl font-bold text-cyan-300 mb-2">Ready for Launch</h2>
        <p className="text-gray-400 max-w-md">
          Fill in the mission parameters on the left and click "Predict Flight Trajectory" to visualize the balloon's path here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="h-[55vh] bg-gray-800/50 rounded-lg p-1 border border-gray-700 relative">
        <h3 className="absolute top-0 left-2 text-xl font-semibold text-cyan-300 z-[1000] bg-gray-900/50 px-3 py-1 rounded-br-lg">
          {activeView === '2d' ? '2D Flight Map' : '3D Globe View'}
        </h3>
        <div className="absolute top-2 right-2 z-[1000] flex items-center space-x-1 bg-gray-800/80 p-1 rounded-lg backdrop-blur-sm">
            <button onClick={() => setActiveView('2d')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeView === '2d' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>2D</button>
            <button onClick={() => setActiveView('3d')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeView === '3d' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>3D</button>
        </div>

        {activeView === '2d' ? (
          <LeafletVisualization result={prediction} />
        ) : (
          <GlobeVisualization result={prediction} />
        )}
      </div>
      <div className="h-[35vh] bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-xl font-semibold mb-2 text-cyan-300">Altitude Profile</h3>
        <AltitudeChart path={prediction.path} unitSystem={unitSystem} />
      </div>
    </div>
  );
};

export default Visualization;
