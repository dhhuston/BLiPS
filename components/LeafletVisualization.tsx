import React, { useEffect, useRef, RefObject } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { PredictionResult, LaunchParams, UnitSystem, ComprehensiveWeather, WeatherForecast } from '../types';
import { LaunchIcon, BurstIcon, LandingIcon } from './icons/IconComponents';

interface VisualizationProps {
  result: PredictionResult;
  mapResizeRef?: RefObject<() => void>;
  launchWeather?: ComprehensiveWeather | null;
  launchParams?: LaunchParams;
  prediction?: PredictionResult | null;
  unitSystem?: UnitSystem;
  error?: string | null;
  tabSwitchCount?: number;
}

// Helper component to automatically fit the map bounds to the trajectory
const MapBoundsFitter = ({ bounds }: { bounds: L.LatLngBounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds?.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, bounds]);
  return null;
};

// New helper to fit bounds on load and path change
const FitBoundsOnLoad: React.FC<{ bounds: L.LatLngBounds }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds?.isValid()) {
      setTimeout(() => {
        map.fitBounds(bounds, { padding: [40, 40] });
      }, 50);
    }
  }, [map, bounds]);
  return null;
};

// Helper to auto-invalidate map size on container resize
const MapResizeObserver: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const node = map.getContainer();
    if (!node || !window.ResizeObserver) return;
    const observer = new window.ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [map]);
  return null;
};

function formatWeather(weather: ComprehensiveWeather | null, unitSystem: UnitSystem | undefined) {
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
}

const LeafletVisualization: React.FC<VisualizationProps> = ({ 
  result, 
  mapResizeRef, 
  launchWeather, 
  launchParams: _launchParams, 
  prediction, 
  unitSystem,
  error,
  tabSwitchCount: _tabSwitchCount
}) => {
  // Always call ALL hooks at the top level - no conditional hooks
  const mapRef = useRef<L.Map | null>(null);
  const [landingWeather, setLandingWeather] = React.useState<ComprehensiveWeather | null>(null);
  const [isLoadingLandingWeather, setIsLoadingLandingWeather] = React.useState(false);

  // Expose a resize/fit function to parent via ref
  useEffect(() => {
    if (mapResizeRef && result) {
      const path = result.path;
      const pathCoordinates: L.LatLngExpression[] = path.map(p => [p.lat, p.lon]);
      const bounds = L.latLngBounds(pathCoordinates);
      
      mapResizeRef.current = () => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          if (bounds?.isValid()) {
            setTimeout(() => {
              mapRef.current!.fitBounds(bounds, { padding: [40, 40] });
            }, 100);
          }
        }
      };
    }
  }, [mapResizeRef, result]);

  // Fetch real landing weather for landing location and time
  React.useEffect(() => {
    const fetchLandingWeather = async () => {
      if (!prediction) {
        setLandingWeather(null);
        return;
      }
      
             setIsLoadingLandingWeather(true);
       try {
         // Validate and calculate landing time from prediction
         const rawLandingTime = prediction.landingPoint.time;
         const rawLaunchTime = prediction.launchPoint.time;
         console.log('Raw times - Landing:', rawLandingTime, 'Launch:', rawLaunchTime);
         
         let landingTime: Date;
         
         // Check if we have a valid timestamp
         if (!rawLandingTime || rawLandingTime < 946684800) { // Before year 2000
           console.warn('Invalid landing time detected, using fallback calculation');
           
           // Try to use launch time + flight duration
           if (rawLaunchTime && rawLaunchTime > 946684800) {
             const launchTime = new Date(rawLaunchTime * 1000);
             const flightDuration = prediction.flightDuration || prediction.totalTime || 3600; // Default 1 hour
             landingTime = new Date(launchTime.getTime() + flightDuration * 1000);
             console.log('Using launch time + duration:', landingTime.toLocaleString());
           } else {
             // Last resort: use current time + 2 hours
             landingTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
             console.log('Using current time + 2 hours as fallback:', landingTime.toLocaleString());
           }
         } else {
           landingTime = new Date(rawLandingTime * 1000);
           console.log('Using valid landing time:', landingTime.toLocaleString());
         }
         
         // Validate that the landing time isn't too far in the future (weather APIs have limits)
         const maxFutureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
         if (landingTime > maxFutureDate) {
           console.warn('Landing time is too far in the future, using current time + 1 hour');
           landingTime = new Date(Date.now() + 60 * 60 * 1000);
         }
         
         const landingTimeISO = landingTime.toISOString();
         
         console.log(`Fetching landing weather for: ${prediction.landingPoint.lat.toFixed(4)}, ${prediction.landingPoint.lon.toFixed(4)} at ${landingTime.toLocaleString()}`);
        
        // Import weather service dynamically to avoid issues
        const { fetchWeatherData } = await import('../services/weatherService');
        
        // Fetch weather for landing location and time
        const landingWeatherData = await fetchWeatherData(
          prediction.landingPoint.lat,
          prediction.landingPoint.lon,
          landingTimeISO
        );
        
        if (landingWeatherData) {
          // Find the closest time to landing in the weather data (more flexible approach)
          const landingTimeSeconds = Math.floor(landingTime.getTime() / 1000);
          const landingTimeHour = Math.floor(landingTimeSeconds / 3600) * 3600;
          let timeIndex = -1;
          let minTimeDiff = Infinity;
          
          // Find the closest available time, even if it's more than 30 minutes away
          landingWeatherData.hourly.time.forEach((t, index) => {
            const weatherTime = new Date(t).getTime() / 1000;
            const timeDiff = Math.abs(weatherTime - landingTimeHour);
            if (timeDiff < minTimeDiff) {
              minTimeDiff = timeDiff;
              timeIndex = index;
            }
          });
          
          if (timeIndex >= 0) {
            const timeDiffHours = minTimeDiff / 3600;
            console.log(`Using weather data from ${timeDiffHours.toFixed(1)} hours ${timeDiffHours > 0 ? 'after' : 'before'} landing time`);
            
                         // Add a note about time difference if it's significant
             let weatherTimeNote = timeDiffHours > 2 ? 
               `⚠️ Weather data is from ${timeDiffHours.toFixed(1)} hours ${timeDiffHours > 0 ? 'after' : 'before'} estimated landing time` : 
               '';
             
             // Add note if we used fallback time calculation
             if (!rawLandingTime || rawLandingTime < 946684800) {
               weatherTimeNote = weatherTimeNote ? 
                 `${weatherTimeNote}\n⚠️ Landing time estimated (original data invalid)` :
                 `⚠️ Landing time estimated (original data invalid)`;
             }
            // Extract weather data for landing time
            const forecast = landingWeatherData.hourly;
            
                         // Helper function to safely convert to number
             const toNumber = (value: string | number | null | undefined): number | null => {
               if (typeof value === 'number') return value;
               if (typeof value === 'string') {
                 const num = parseFloat(value);
                 return isNaN(num) ? null : num;
               }
               return null;
             };
             
             // Extract surface weather
             const surfaceWeather: WeatherForecast = {
               temperature: toNumber(forecast.temperature_2m?.[timeIndex]),
               humidity: toNumber(forecast.relativehumidity_2m?.[timeIndex]),
               dewpoint: toNumber(forecast.dewpoint_2m?.[timeIndex]),
               apparentTemperature: toNumber(forecast.apparent_temperature?.[timeIndex]),
               precipitation: toNumber(forecast.precipitation?.[timeIndex]),
               rain: toNumber(forecast.rain?.[timeIndex]),
               snowfall: toNumber(forecast.snowfall?.[timeIndex]),
               cloudcover: toNumber(forecast.cloudcover?.[timeIndex]),
               cloudcoverLow: toNumber(forecast.cloudcover_low?.[timeIndex]),
               cloudcoverMid: toNumber(forecast.cloudcover_mid?.[timeIndex]),
               cloudcoverHigh: toNumber(forecast.cloudcover_high?.[timeIndex]),
               visibility: toNumber(forecast.visibility?.[timeIndex]),
               windSpeed10m: toNumber(forecast.windspeed_10m?.[timeIndex]),
               windDirection10m: toNumber(forecast.winddirection_10m?.[timeIndex]),
               windGusts10m: toNumber(forecast.windgusts_10m?.[timeIndex]),
               pressure: toNumber(forecast.pressure_msl?.[timeIndex]),
               surfacePressure: toNumber(forecast.surface_pressure?.[timeIndex]),
               cape: toNumber(forecast.cape?.[timeIndex]),
               cin: toNumber(forecast.cin?.[timeIndex]),
               description: weatherTimeNote // Include time difference note if significant
             };
             
             // Extract wind levels (pressure levels) with proper type conversion
             const groundSpeed = toNumber(forecast[`windspeed_1000hPa`]?.[timeIndex]);
             const groundDirection = toNumber(forecast[`winddirection_1000hPa`]?.[timeIndex]);
             const ground = (groundSpeed !== null && groundDirection !== null) ? {
               speed: groundSpeed,
               direction: groundDirection
             } : undefined;
             
             const midSpeed = toNumber(forecast[`windspeed_500hPa`]?.[timeIndex]);
             const midDirection = toNumber(forecast[`winddirection_500hPa`]?.[timeIndex]);
             const mid = (midSpeed !== null && midDirection !== null) ? {
               speed: midSpeed,
               direction: midDirection
             } : undefined;
             
             const jetSpeed = toNumber(forecast[`windspeed_250hPa`]?.[timeIndex]);
             const jetDirection = toNumber(forecast[`winddirection_250hPa`]?.[timeIndex]);
             const jet = (jetSpeed !== null && jetDirection !== null) ? {
               speed: jetSpeed,
               direction: jetDirection
             } : undefined;
            
            const comprehensiveLandingWeather: ComprehensiveWeather = {
              forecast: surfaceWeather
            };
            
                         // Add wind levels if available
             if (ground) {
               comprehensiveLandingWeather.ground = ground;
             }
             if (mid) {
               comprehensiveLandingWeather.mid = mid;
             }
             if (jet) {
               comprehensiveLandingWeather.jet = jet;
             }
            
            setLandingWeather(comprehensiveLandingWeather);
          } else {
            console.warn('No weather data found for landing time');
            setLandingWeather(null);
          }
        } else {
          console.warn('No weather data returned from API');
          // Fallback to launch weather if available
          if (launchWeather) {
            console.log('Using launch weather as fallback for landing weather');
            const fallbackWeather: ComprehensiveWeather = {
              ...launchWeather,
              forecast: launchWeather.forecast ? {
                ...launchWeather.forecast,
                description: `⚠️ Using launch weather as fallback (API unavailable)`
              } : launchWeather.forecast
            };
            setLandingWeather(fallbackWeather);
          } else {
            setLandingWeather(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch landing weather:', error);
        // Fallback to launch weather if available
        if (launchWeather) {
          console.log('Using launch weather as fallback after API error');
          const fallbackWeather: ComprehensiveWeather = {
            ...launchWeather,
            forecast: launchWeather.forecast ? {
              ...launchWeather.forecast,
              description: `⚠️ Using launch weather as fallback (API error)`
            } : launchWeather.forecast
          };
          setLandingWeather(fallbackWeather);
        } else {
          setLandingWeather(null);
        }
      } finally {
        setIsLoadingLandingWeather(false);
      }
    };
    
    fetchLandingWeather();
  }, [prediction, launchWeather]);

  // Early return after ALL hooks are called
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!result) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        No prediction available. Please run a prediction.
      </div>
    );
  }

  // Now safe to destructure and compute values after hooks are called
  const { path, launchPoint, burstPoint, landingPoint } = result;
  const pathCoordinates: L.LatLngExpression[] = path.map(p => [p.lat, p.lon]);
  const bounds = L.latLngBounds(pathCoordinates);

  // Handler for reset view button
  const handleResetView = () => {
    if (mapRef.current && bounds?.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  // Creates a custom Leaflet icon using an SVG string
  const createIcon = (iconSvg: string): L.DivIcon => {
    return L.divIcon({
      html: iconSvg,
      className: 'leaflet-div-icon-custom',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const launchIcon = createIcon(LaunchIcon('#34d399'));
  const burstIcon = createIcon(BurstIcon('#f87171'));
  const landingIcon = createIcon(LandingIcon('#60a5fa'));

  return (
    <div className="w-full relative">
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-red-400 text-lg">⚠️</div>
            <div>
              <h3 className="font-semibold mb-1">Weather Data Error</h3>
              <p className="text-sm">{error}</p>
              <p className="text-xs text-red-400 mt-2">
                The prediction was completed, but weather data may be incomplete or unavailable.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Reset View Button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleResetView}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow transition"
        >
          Reset Map View
        </button>
      </div>
      {/* Map Panel */}
      <div className="w-full min-h-[400px] max-h-[600px] h-[50vh] mb-4 rounded-lg overflow-hidden" style={{ background: '#1f2937' }}>
        <MapContainer
          center={[launchPoint.lat, launchPoint.lon]}
          zoom={10}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', borderRadius: '0.5rem', background: '#1f2937' }}
          whenReady={((event: any) => {
            const map = (event as { map: L.Map }).map;
            mapRef.current = map;
          }) as any}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Street View">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                attribution='Tiles &copy; Esri'
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          <MapResizeObserver />
          <FitBoundsOnLoad bounds={bounds} />
          <Polyline pathOptions={{ color: '#2dd4bf', weight: 4, opacity: 0.9 }} positions={pathCoordinates} />
          <Marker position={[launchPoint.lat, launchPoint.lon]} icon={launchIcon}>
            <Tooltip>Launch Point</Tooltip>
          </Marker>
          <Marker position={[burstPoint.lat, burstPoint.lon]} icon={burstIcon}>
            <Tooltip>Burst Point</Tooltip>
          </Marker>
          <Marker position={[landingPoint.lat, landingPoint.lon]} icon={landingIcon}>
            <Tooltip>Landing Point</Tooltip>
          </Marker>
        </MapContainer>
      </div>
      {/* Weather Forecast Panel - now below the map */}
      <div className="flex flex-col md:flex-row gap-4 p-3 bg-gray-900/80 rounded-lg border border-gray-700 max-w-4xl mx-auto w-full">
        <div className="flex-1">
          <div className="font-semibold text-cyan-300 mb-1">Launch Weather</div>
          {formatWeather(launchWeather ?? null, unitSystem)}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-blue-300 mb-1">Landing Weather</div>
          {isLoadingLandingWeather ? (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              Loading forecast...
            </div>
          ) : (
            formatWeather(landingWeather ?? null, unitSystem)
          )}
        </div>
      </div>
      <style>{`
        .leaflet-div-icon-custom {
          background: none;
          border: none;
          filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.7));
        }
      `}</style>
    </div>
  );
};

export default LeafletVisualization;
