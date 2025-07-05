import { WeatherData } from '../types';
import { PRESSURE_LEVELS } from '../constants';

export const fetchWeatherData = async (lat: number, lon: number, launchTime: string): Promise<WeatherData | null> => {
  const windSpeedParams = PRESSURE_LEVELS.map(p => `windspeed_${p}hPa`).join(',');
  const windDirectionParams = PRESSURE_LEVELS.map(p => `winddirection_${p}hPa`).join(',');

  const startDate = new Date(launchTime);
  // Get data for 2 days to cover flights that cross midnight UTC
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 1); 

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Comprehensive weather parameters (removed 'cin' due to API error)
  const weatherParams = [
    windSpeedParams,
    windDirectionParams,
    'temperature_2m',
    'relativehumidity_2m',
    'dewpoint_2m',
    'apparent_temperature',
    'precipitation',
    'rain',
    'snowfall',
    'cloudcover',
    'cloudcover_low',
    'cloudcover_mid',
    'cloudcover_high',
    'visibility',
    'windspeed_10m',
    'winddirection_10m',
    'windgusts_10m',
    'pressure_msl',
    'surface_pressure',
    'cape'
    // 'cin' // <-- Removed due to API error
  ].join(',');

  const params = `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=${weatherParams}&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`;
  const url = `https://api.open-meteo.com/v1/gfs?${params}`;

  try {
    const response = await fetch(url);
    const rawText = await response.clone().text();
    if (!response.ok) {
      let errorData = {};
      try {
        errorData = JSON.parse(rawText);
      } catch {}
      const status = response.status;
      
      let errorMessage = "Weather data unavailable";
      if (status === 400) {
        errorMessage = "Invalid location or time parameters. Please check your coordinates and launch time.";
      } else if (status === 404) {
        errorMessage = "Weather service not found. The API endpoint may have changed.";
      } else if (status === 429) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (status >= 500) {
        errorMessage = "Weather service temporarily unavailable. Please try again later.";
      } else {
        errorMessage = (errorData as any).reason || `Weather API error (${status})`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data: WeatherData = JSON.parse(rawText);
    if (!data.hourly || !data.hourly.time || data.hourly.time.length === 0) {
      throw new Error("No weather forecast available for the selected time and location. Please try a different date or location.");
    }
    
    // Check if we have any wind data
    const hasWindData = PRESSURE_LEVELS.some(level => {
      const speedData = data.hourly[`windspeed_${level}hPa`];
      const dirData = data.hourly[`winddirection_${level}hPa`];
      return speedData && dirData && speedData.length > 0 && dirData.length > 0;
    });
    
    if (!hasWindData) {
      throw new Error("Wind data not available for this location or time. Please try a different location or time.");
    }
    
    return data;
  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("Network error while fetching weather data. Please check your internet connection.");
  }
};