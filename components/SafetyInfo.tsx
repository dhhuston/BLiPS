
import React from 'react';
import { PredictionResult, UnitSystem } from '../types';
import { metersToFeet } from '../constants';
import { ExternalLinkIcon } from './icons/IconComponents';

interface SafetyInfoProps {
  result: PredictionResult;
  unitSystem: UnitSystem;
  launchARTCC: string | null;
  landingARTCC: string | null;
}

const InfoRow: React.FC<{ label: string; value: string | null; point: { lat: number; lon: number } }> = ({ label, value, point }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-700/50">
        <p className="text-sm">
            <strong className="text-gray-400 w-28 inline-block">{label}:</strong>
            {value ? (
                <span className="text-cyan-300 font-mono">{value}</span>
            ) : (
                <span className="text-gray-500 italic">Region not in US database</span>
            )}
        </p>
        <a
            href={`https://skyvector.com/?ll=${point.lat},${point.lon}&chart=301&zoom=8`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 mt-2 sm:mt-0 text-xs bg-gray-600 hover:bg-gray-500 text-white font-semibold py-1 px-3 rounded-md transition-colors"
        >
            Manual Lookup <ExternalLinkIcon className="w-3 h-3" />
        </a>
    </div>
);


const SafetyInfo: React.FC<SafetyInfoProps> = ({ result, launchARTCC, landingARTCC }) => {
  const { launchPoint, landingPoint, burstPoint, totalTime } = result;
  
  const flightDurationHours = Math.floor(totalTime / 3600);
  const flightDurationMinutes = Math.round((totalTime % 3600) / 60);
  
  const burstAltitudeMeters = Math.round(burstPoint.altitude);
  const burstAltitudeFeet = Math.round(metersToFeet(burstPoint.altitude));

  const notamText = `
FLIGHT SERVICE STATION (FSS) BRIEFING SCRIPT

- WHO: This is [Your Name/Organization].
- WHAT: I would like to file a notice for a high-altitude unmanned free balloon launch.
- WHERE (Launch): Near ${launchPoint.lat.toFixed(4)}, ${launchPoint.lon.toFixed(4)}.
- WHEN (Launch): We plan to launch on [Date] at approximately [Time] Zulu.
- ALTITUDE: The balloon is expected to ascend to a maximum altitude of approximately ${burstAltitudeFeet.toLocaleString()} feet MSL (${burstAltitudeMeters.toLocaleString()} m).
- DURATION: The estimated total flight duration is ${flightDurationHours} hours and ${flightDurationMinutes} minutes.
- TRAJECTORY & LANDING: The predicted landing location is near ${landingPoint.lat.toFixed(4)}, ${landingPoint.lon.toFixed(4)}. The payload will descend under a parachute.
- CONTACT: On-site contact is [Your Name] at [Your Phone Number].
`.trim();

  return (
    <div className="space-y-8">
      {/* NOTAM Section */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold mb-3 text-amber-300">1. File a Notice to Air Missions (NOTAM)</h3>
        <p className="text-gray-400 mb-4">
          Contact a Flight Service Station (FSS) at least 24-48 hours before launch. In the US, call <strong>1-800-WX-BRIEF</strong> (1-800-992-7433). Use the script below.
        </p>
        <div className="bg-gray-900 p-4 rounded-md border border-gray-600">
          <h4 className="font-semibold text-gray-300 mb-2">Pre-filled NOTAM Template:</h4>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{notamText}</pre>
        </div>
      </div>

      {/* ATC Section */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold mb-3 text-amber-300">2. Coordinate with Air Traffic Control</h3>
         <div className="bg-gray-900 p-4 rounded-md border border-gray-600 mb-4">
          <h4 className="font-semibold text-gray-300 mb-2">Identified Control Centers (ARTCC / FIR):</h4>
          <div className="space-y-1">
            <InfoRow label="Launch Zone" value={launchARTCC} point={launchPoint} />
            <InfoRow label="Landing Zone" value={landingARTCC} point={landingPoint} />
          </div>
        </div>
        <p className="text-gray-400 mb-4">
          The automatic lookup is for US ARTCCs. For international flights or verification, use the manual lookup to view the area on an aeronautical chart and identify the responsible control agency. It is your responsibility to contact all relevant authorities.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a href={`https://www.airnav.com/cgi-bin/airport-search?lat=${launchPoint.lat}&lon=${launchPoint.lon}&radius=50&sort=dist_a`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-blue-600/80 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition">
            Find Nearby Airports
          </a>
        </div>
      </div>
    </div>
  );
};

export default SafetyInfo;