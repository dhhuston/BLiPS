import React from 'react';
import { ComprehensiveWeather, UnitSystem } from '../types/index';

interface WeatherDisplayProps {
  weather: ComprehensiveWeather | null;
  unitSystem?: UnitSystem;
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weather, unitSystem }) => {
  if (!weather) {
    return (
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-gray-400">No weather data available</span>
          <div className="group relative">
            <span className="text-gray-500 cursor-help">ⓘ</span>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Weather data could not be fetched. This might be due to:
              <br />• Network connectivity issues
              <br />• API service temporarily unavailable
              <br />• Invalid location or time parameters
              <br />• Remote location with limited weather coverage
              <br />• Try refreshing or selecting a different time/location
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const isImperial = unitSystem === 'imperial';
  
  // Handle partial weather data gracefully
  const formatWindLevel = (level: string, speed: number | undefined, direction: number | undefined) => {
    const speedVal = typeof speed === 'number' && !isNaN(speed)
      ? (isImperial ? (speed * 2.23694) : speed).toFixed(1) + (isImperial ? ' mph' : ' m/s')
      : 'N/A';
    const dirVal = typeof direction === 'number' && !isNaN(direction)
      ? `${direction}°`
      : 'N/A';
    
    return (
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{level}:</span>
        <span className="text-cyan-300">{speedVal} {dirVal}</span>
      </div>
    );
  };

  const formatForecastValue = (value: number | null, unit: string, imperialUnit?: string, imperialMultiplier?: number) => {
    if (value === null || isNaN(value)) return 'N/A';
    const displayValue = isImperial && imperialMultiplier ? value * imperialMultiplier : value;
    const displayUnit = isImperial && imperialUnit ? imperialUnit : unit;
    return `${displayValue.toFixed(1)} ${displayUnit}`;
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Wind Data */}
      <div className="space-y-2">
        <div className="font-medium text-gray-300 mb-1">Wind Conditions</div>
        {weather.ground && (
          <div>
            <div className="font-medium text-gray-400 mb-1">Ground Level (1000hPa)</div>
            {formatWindLevel('Speed', weather.ground.speed, weather.ground.direction)}
          </div>
        )}
        {weather.mid && (
          <div>
            <div className="font-medium text-gray-400 mb-1">Mid Level (500hPa)</div>
            {formatWindLevel('Speed', weather.mid.speed, weather.mid.direction)}
          </div>
        )}
        {weather.jet && (
          <div>
            <div className="font-medium text-gray-400 mb-1">Jet Stream (250hPa)</div>
            {formatWindLevel('Speed', weather.jet.speed, weather.jet.direction)}
          </div>
        )}
        {!weather.ground && !weather.mid && !weather.jet && (
          <span className="text-gray-400">No wind data available</span>
        )}
      </div>

      {/* Surface Weather */}
      {weather.forecast && (
        <div className="space-y-2">
          <div className="font-medium text-gray-300 mb-1">Surface Conditions</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Temp:</span>
              <span className="text-cyan-300">
                {formatForecastValue(weather.forecast.temperature, '°C', '°F', 9/5)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Humidity:</span>
              <span className="text-cyan-300">
                {formatForecastValue(weather.forecast.humidity, '%')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cloud Cover:</span>
              <span className="text-cyan-300">
                {formatForecastValue(weather.forecast.cloudcover, '%')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Visibility:</span>
              <span className="text-cyan-300">
                {formatForecastValue(weather.forecast.visibility, 'km', 'mi', 0.621371)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pressure:</span>
              <span className="text-cyan-300">
                {formatForecastValue(weather.forecast.pressure, 'hPa')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Wind (10m):</span>
              <span className="text-cyan-300">
                {formatForecastValue(weather.forecast.windSpeed10m, 'm/s', 'mph', 2.23694)}
              </span>
            </div>
          </div>
          
          {/* Precipitation */}
          {(weather.forecast.precipitation || weather.forecast.rain || weather.forecast.snowfall) && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div className="font-medium text-gray-400 mb-1">Precipitation</div>
              <div className="grid grid-cols-2 gap-2">
                {weather.forecast.precipitation !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total:</span>
                    <span className="text-cyan-300">
                      {formatForecastValue(weather.forecast.precipitation, 'mm', 'in', 0.0393701)}
                    </span>
                  </div>
                )}
                {weather.forecast.rain !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rain:</span>
                    <span className="text-cyan-300">
                      {formatForecastValue(weather.forecast.rain, 'mm', 'in', 0.0393701)}
                    </span>
                  </div>
                )}
                {weather.forecast.snowfall !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Snow:</span>
                    <span className="text-cyan-300">
                      {formatForecastValue(weather.forecast.snowfall, 'mm', 'in', 0.0393701)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Weather Description */}
          {weather.forecast.description && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div className="text-gray-300 font-medium">{weather.forecast.description}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherDisplay; 