import React from 'react';
import { ComprehensiveWeather, UnitSystem } from '../types/index';

interface WeatherComparisonTableProps {
  launchWeather: ComprehensiveWeather | null;
  landingWeather: ComprehensiveWeather | null;
  unitSystem?: UnitSystem;
}

const WeatherComparisonTable: React.FC<WeatherComparisonTableProps> = ({ launchWeather, landingWeather, unitSystem }) => {
  const isImperial = unitSystem === 'imperial';

  // Helper to format wind
  const formatWind = (weather: ComprehensiveWeather | null, level: 'ground' | 'mid' | 'jet') => {
    const wind = weather?.[level];
    if (!wind) return 'N/A';
    const speed = typeof wind.speed === 'number' && !isNaN(wind.speed)
      ? (isImperial ? (wind.speed * 2.23694) : wind.speed).toFixed(1) + (isImperial ? ' mph' : ' m/s')
      : 'N/A';
    const dir = typeof wind.direction === 'number' && !isNaN(wind.direction)
      ? `${wind.direction}°`
      : 'N/A';
    return `${speed} ${dir}`;
  };

  // Helper to format surface value
  const formatSurface = (weather: ComprehensiveWeather | null, key: keyof NonNullable<ComprehensiveWeather['forecast']>, unit: string, imperialUnit?: string, imperialMultiplier?: number) => {
    const value = weather?.forecast?.[key];
    if (value === null || value === undefined || isNaN(Number(value))) return 'N/A';
    const displayValue = isImperial && imperialMultiplier ? Number(value) * imperialMultiplier : Number(value);
    const displayUnit = isImperial && imperialUnit ? imperialUnit : unit;
    return `${displayValue.toFixed(1)} ${displayUnit}`;
  };

  // Table rows definition
  const rows = [
    { label: 'Wind (Ground ~1000hPa)', launch: formatWind(launchWeather, 'ground'), landing: formatWind(landingWeather, 'ground') },
    { label: 'Wind (Mid ~500hPa)', launch: formatWind(launchWeather, 'mid'), landing: formatWind(landingWeather, 'mid') },
    { label: 'Wind (Jet ~250hPa)', launch: formatWind(launchWeather, 'jet'), landing: formatWind(landingWeather, 'jet') },
    { label: 'Temperature', launch: formatSurface(launchWeather, 'temperature', '°C', '°F', 9/5), landing: formatSurface(landingWeather, 'temperature', '°C', '°F', 9/5) },
    { label: 'Humidity', launch: formatSurface(launchWeather, 'humidity', '%'), landing: formatSurface(landingWeather, 'humidity', '%') },
    { label: 'Cloud Cover', launch: formatSurface(launchWeather, 'cloudcover', '%'), landing: formatSurface(landingWeather, 'cloudcover', '%') },
    { label: 'Visibility', launch: formatSurface(launchWeather, 'visibility', 'km', 'mi', 0.621371), landing: formatSurface(landingWeather, 'visibility', 'km', 'mi', 0.621371) },
    { label: 'Pressure', launch: formatSurface(launchWeather, 'pressure', 'hPa'), landing: formatSurface(landingWeather, 'pressure', 'hPa') },
    { label: 'Wind (10m)', launch: formatSurface(launchWeather, 'windSpeed10m', 'm/s', 'mph', 2.23694), landing: formatSurface(landingWeather, 'windSpeed10m', 'm/s', 'mph', 2.23694) },
  ];

  // If both are missing, show no data
  if (!launchWeather && !landingWeather) {
    return (
      <div className="flex flex-col gap-1 text-xs">
        <span className="text-gray-400">No weather data available</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border border-gray-700 rounded-lg bg-gray-800">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-gray-400 font-semibold">Parameter</th>
            <th className="px-3 py-2 text-center text-cyan-300 font-semibold">Launch</th>
            <th className="px-3 py-2 text-center text-blue-300 font-semibold">Landing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-gray-700">
              <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{row.label}</td>
              <td className="px-3 py-2 text-center text-cyan-200">{row.launch}</td>
              <td className="px-3 py-2 text-center text-blue-200">{row.landing}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WeatherComparisonTable; 