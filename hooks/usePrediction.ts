import { useState, useCallback } from 'react';
import { LaunchParams, PredictionResult, WeatherPoint, WeatherForecast, ComprehensiveWeather } from '../types';
import { fetchWeatherData } from '../services/weatherService';
import { runPredictionSimulation } from '../services/predictionService';

export const usePrediction = () => {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [launchWeather, setLaunchWeather] = useState<ComprehensiveWeather | null>(null);
  const [weatherData, setWeatherData] = useState<{ hourly: { time: string[]; [key: string]: any } } | null>(null);

  const runPrediction = useCallback(async (params: LaunchParams) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    setLaunchWeather(null);

    try {
      const fetchedWeatherData = await fetchWeatherData(params.lat, params.lon, params.launchTime);
      if (!fetchedWeatherData) {
        throw new Error("Could not fetch weather data. The API might be temporarily unavailable.");
      }
      setWeatherData(fetchedWeatherData);
      
      // Get detailed forecast for launch time
      const launchHourIndex = fetchedWeatherData.hourly.time.findIndex((t: string) => new Date(t) >= new Date(params.launchTime));
      
      if (launchHourIndex !== -1) {
        const getWeatherPoint = (level: number): WeatherPoint | null => {
            const speed = fetchedWeatherData.hourly[`windspeed_${level}hPa`]?.[launchHourIndex];
            const direction = fetchedWeatherData.hourly[`winddirection_${level}hPa`]?.[launchHourIndex];
            if (typeof speed === 'number' && typeof direction === 'number') {
                return { speed, direction };
            }
            return null;
        }

        const ground = getWeatherPoint(1000);
        const mid = getWeatherPoint(500);
        const jet = getWeatherPoint(250);

        // Extract comprehensive forecast data
        const getForecastValue = (key: string): number | null => {
          const value = fetchedWeatherData.hourly[key]?.[launchHourIndex];
          return typeof value === 'number' && !isNaN(value) ? value : null;
        };

        const forecast: WeatherForecast = {
          temperature: getForecastValue('temperature_2m'),
          humidity: getForecastValue('relativehumidity_2m'),
          dewpoint: getForecastValue('dewpoint_2m'),
          apparentTemperature: getForecastValue('apparent_temperature'),
          precipitation: getForecastValue('precipitation'),
          rain: getForecastValue('rain'),
          snowfall: getForecastValue('snowfall'),
          cloudcover: getForecastValue('cloudcover'),
          cloudcoverLow: getForecastValue('cloudcover_low'),
          cloudcoverMid: getForecastValue('cloudcover_mid'),
          cloudcoverHigh: getForecastValue('cloudcover_high'),
          visibility: getForecastValue('visibility'),
          windSpeed10m: getForecastValue('windspeed_10m'),
          windDirection10m: getForecastValue('winddirection_10m'),
          windGusts10m: getForecastValue('windgusts_10m'),
          pressure: getForecastValue('pressure_msl'),
          surfacePressure: getForecastValue('surface_pressure'),
          cape: getForecastValue('cape'),
          cin: getForecastValue('cin'),
          description: generateWeatherDescription({
            temperature: getForecastValue('temperature_2m'),
            humidity: getForecastValue('relativehumidity_2m'),
            cloudcover: getForecastValue('cloudcover'),
            precipitation: getForecastValue('precipitation'),
            windSpeed10m: getForecastValue('windspeed_10m')
          })
        };

        // Set comprehensive weather data even if some levels are missing
        const availableLevels: string[] = [];
        if (ground) availableLevels.push('ground');
        if (mid) availableLevels.push('mid');
        if (jet) availableLevels.push('jet');

        if (availableLevels.length > 0 || forecast.temperature !== null) {
            const comprehensiveWeather: ComprehensiveWeather = {};
            if (ground) comprehensiveWeather.ground = ground;
            if (mid) comprehensiveWeather.mid = mid;
            if (jet) comprehensiveWeather.jet = jet;
            comprehensiveWeather.forecast = forecast;
            
            setLaunchWeather(comprehensiveWeather);
            
            // Warn if not all wind levels are available
            if (availableLevels.length < 3) {
                const missingLevels = ['ground', 'mid', 'jet'].filter(level => !availableLevels.includes(level));
                setError(`Weather data partially available. Missing wind levels: ${missingLevels.join(', ')}. Prediction may be less accurate.`);
            }
        } else {
            setError("No weather data available for the selected time and location. Please try a different time or location.");
        }
      } else {
        setError("No weather forecast available for the selected launch time. Please try a different time.");
      }

      const result = runPredictionSimulation(params, fetchedWeatherData);
      setPrediction(result);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred during prediction.");
      }
      setPrediction(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { prediction, isLoading, error, runPrediction, launchWeather, weatherData };
};

// Helper function to generate weather description
const generateWeatherDescription = (data: {
  temperature: number | null;
  humidity: number | null;
  cloudcover: number | null;
  precipitation: number | null;
  windSpeed10m: number | null;
}): string => {
  const parts: string[] = [];
  
  if (data.temperature !== null) {
    parts.push(`${data.temperature.toFixed(1)}°C`);
  }
  
  if (data.cloudcover !== null) {
    if (data.cloudcover < 25) parts.push('Clear');
    else if (data.cloudcover < 50) parts.push('Partly Cloudy');
    else if (data.cloudcover < 75) parts.push('Mostly Cloudy');
    else parts.push('Overcast');
  }
  
  if (data.precipitation !== null && data.precipitation > 0) {
    parts.push('Rain');
  }
  
  if (data.humidity !== null) {
    if (data.humidity > 80) parts.push('Humid');
    else if (data.humidity < 30) parts.push('Dry');
  }
  
  if (data.windSpeed10m !== null) {
    if (data.windSpeed10m > 10) parts.push('Windy');
    else if (data.windSpeed10m > 5) parts.push('Breezy');
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Unknown conditions';
};
