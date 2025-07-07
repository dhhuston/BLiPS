import React, { useEffect, useRef, RefObject } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, LayersControl, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import { PredictionResult, LaunchParams, UnitSystem, ComprehensiveWeather, WeatherForecast, TerrainAnalysis } from '../types/index';
import { LaunchIcon, BurstIcon, LandingIcon } from './icons/IconComponents';
import WeatherComparisonTable from './WeatherDisplay';
import { findNearestRoad } from '../services/elevationService';
import { isValidCoordinate, filterValidCoordinates } from '../constants/index';

// Safety check for Leaflet
if (typeof L === 'undefined') {
  console.error('Leaflet is not available');
}

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

// Helper to normalize roadData before setting state
function normalizeRoadData(data: {
  roadLat: number;
  roadLon: number;
  distance: number;
  roadName?: string;
  type: string;
  trailheadRoad?: { roadLat: number; roadLon: number; roadName: string };
} | null): {
  roadLat: number;
  roadLon: number;
  distance: number;
  roadName?: string;
  type: string;
  trailheadRoad?: { roadLat: number; roadLon: number; roadName: string };
} | null {
  if (!data) return null;
  if (data.trailheadRoad) {
    return {
      ...data,
      trailheadRoad: {
        ...data.trailheadRoad,
        roadName: data.trailheadRoad.roadName || 'Unknown Road',
      },
    };
  }
  return data;
}

const LeafletVisualization: React.FC<VisualizationProps> = ({ 
  result, 
  mapResizeRef, 
  launchWeather, 
  launchParams: _launchParams, 
  prediction, 
  unitSystem,
  error
}) => {
  // Always call ALL hooks at the top level - no conditional hooks
  const mapRef = useRef<L.Map | null>(null);
  const [landingWeather, setLandingWeather] = React.useState<ComprehensiveWeather | null>(null);
  const [roadData, setRoadData] = React.useState<{
    roadLat: number;
    roadLon: number;
    distance: number;
    roadName?: string;
    type: string;
    trailheadRoad?: { roadLat: number; roadLon: number; roadName: string };
  } | null>(null);

  // Expose a resize/fit function to parent via ref
  useEffect(() => {
    if (mapResizeRef && result && result.path) {
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
      try {
        // Calculate landing time from launch time and flight duration
        const launchTime = new Date(_launchParams?.launchTime || Date.now());
        const flightDuration = prediction.flightDuration || prediction.totalTime || 3600; // seconds
        let landingTime = new Date(launchTime.getTime() + flightDuration * 1000);
        
        console.log('Launch time:', launchTime.toLocaleString());
        console.log('Flight duration:', flightDuration, 'seconds');
        console.log('Calculated landing time:', landingTime.toLocaleString());
        
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
            if (!_launchParams?.launchTime) {
              weatherTimeNote = weatherTimeNote ? 
                `${weatherTimeNote}\n⚠️ Landing time estimated (launch time unavailable)` :
                `⚠️ Landing time estimated (launch time unavailable)`;
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
          console.warn('No weather data found for landing time');
          setLandingWeather(null);
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
      }
    };
    
    fetchLandingWeather();
  }, [prediction, launchWeather, _launchParams?.launchTime]);

  React.useEffect(() => {
    const fetchRoad = async () => {
      if (!result?.landingPoint) return;
      const road = await findNearestRoad(result.landingPoint.lat, result.landingPoint.lon);
      setRoadData(normalizeRoadData(road));
    };
    fetchRoad();
  }, [result?.landingPoint]);

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

  // Move null checks BEFORE destructuring
  if (!result || !result.path || !Array.isArray(result.path) || result.path.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">Invalid Prediction Data</h3>
          <p>No valid flight path data available.</p>
        </div>
      </div>
    );
  }

  // Now safe to destructure and compute values after hooks are called
  const { path, launchPoint, burstPoint, landingPoint } = result;
  if (!launchPoint || !burstPoint || !landingPoint) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">Invalid Prediction Data</h3>
          <p>Missing required flight points (launch, burst, or landing).</p>
        </div>
      </div>
    );
  }
  
  const pathCoordinates: L.LatLngExpression[] = path.map(p => [p.lat, p.lon]);
  
  // Safety check for Leaflet
  if (typeof L === 'undefined') {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">Map Library Error</h3>
          <p>Leaflet map library is not available.</p>
        </div>
      </div>
    );
  }
  
  const bounds = L.latLngBounds(pathCoordinates);
  
  // Validate bounds
  if (!bounds || !bounds.isValid()) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">Invalid Map Bounds</h3>
          <p>Unable to calculate valid map bounds from flight path.</p>
        </div>
      </div>
    );
  }

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

  // Helper function to get terrain warning color
  const getTerrainWarningColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-400';
      case 'moderate': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  // Helper function to render terrain warnings
  const renderTerrainWarnings = (terrainAnalysis: TerrainAnalysis | undefined) => {
    if (!terrainAnalysis) return null;
    
    return (
      <div className="mt-2 p-2 bg-gray-800 rounded border-l-4 border-orange-500">
        <div className={`font-semibold ${getTerrainWarningColor(terrainAnalysis.risk)}`}>
          🏔️ {terrainAnalysis.summary}
        </div>
        <div className="text-xs text-gray-300 mt-1">
          Risk: <span className={getTerrainWarningColor(terrainAnalysis.risk)}>{terrainAnalysis.risk}</span><br />
          Elevation: {Math.round(terrainAnalysis.details.mean)}m<br />
          Slope: {terrainAnalysis.details.maxSlope.toFixed(1)}m max
        </div>
        {terrainAnalysis.risk === 'high' && (
          <div className="text-xs text-red-400 mt-1">
            ⚠️ High terrain risk - consider alternative landing zones
          </div>
        )}
      </div>
    );
  };

  const roadIcon = createIcon('<span style="font-size:22px;">🚗</span>');
  const trailIcon = createIcon('<span style="font-size:22px;">🥾</span>');

  console.log('LandingPoint for weather/road:', landingPoint.lat, landingPoint.lon, 'Time:', landingPoint.time, 'FlightDuration (s):', result.flightDuration, 'TotalTime (s):', result.totalTime);

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
          {(() => {
            const coordinatePairs: [number, number][] = pathCoordinates.map(coord => {
              if (Array.isArray(coord)) {
                return [coord[0], coord[1]];
              }
              return [0, 0]; // fallback for invalid coordinates
            });
            const validPositions = filterValidCoordinates(coordinatePairs);
            return validPositions.length > 1 ? (
              <Polyline pathOptions={{ color: '#2dd4bf', weight: 4, opacity: 0.9 }} positions={validPositions} />
            ) : null;
          })()}
          {isValidCoordinate(launchPoint.lat, launchPoint.lon) && (
            <Marker position={[launchPoint.lat, launchPoint.lon]} icon={launchIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>🚀 Launch Point</strong><br />
                  Lat: {launchPoint.lat.toFixed(6)}<br />
                  Lon: {launchPoint.lon.toFixed(6)}<br />
                  Alt: {Math.round(launchPoint.altitude)}m<br />
                  Time: {new Date(launchPoint.time * 1000).toLocaleTimeString()}
                </div>
              </Popup>
            </Marker>
          )}
          {isValidCoordinate(burstPoint.lat, burstPoint.lon) && (
            <Marker position={[burstPoint.lat, burstPoint.lon]} icon={burstIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>💥 Burst Point</strong><br />
                  Lat: {burstPoint.lat.toFixed(6)}<br />
                  Lon: {burstPoint.lon.toFixed(6)}<br />
                  Alt: {Math.round(burstPoint.altitude)}m<br />
                  Time: {new Date(burstPoint.time * 1000).toLocaleTimeString()}<br />
                  Max Altitude: {Math.round(result.maxAltitude || 0)}m
                </div>
              </Popup>
            </Marker>
          )}
          {isValidCoordinate(landingPoint.lat, landingPoint.lon) && (
            <Marker position={[landingPoint.lat, landingPoint.lon]} icon={landingIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>🎯 Landing Point</strong><br />
                  Lat: {landingPoint.lat.toFixed(6)}<br />
                  Lon: {landingPoint.lon.toFixed(6)}<br />
                  Alt: {Math.round(landingPoint.altitude)}m<br />
                  Time: {new Date(landingPoint.time * 1000).toLocaleTimeString()}<br />
                  Flight Duration: {Math.round((result.flightDuration || result.totalTime || 0) / 60)} minutes<br />
                  Distance: {Math.round((result.distance || 0) / 1000)}km<br />
                  {renderTerrainWarnings(result.terrainAnalysis)}
                </div>
              </Popup>
            </Marker>
          )}
          {roadData && roadData.type === 'road' && isValidCoordinate(roadData.roadLat, roadData.roadLon) && (
            <Marker position={[roadData.roadLat, roadData.roadLon]} icon={roadIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>🚗 Nearest Road Access</strong><br />
                  Road: {roadData.roadName}<br />
                  Lat: {roadData.roadLat.toFixed(6)}<br />
                  Lon: {roadData.roadLon.toFixed(6)}<br />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${roadData.roadLat},${roadData.roadLon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </Popup>
            </Marker>
          )}
          {roadData && roadData.type === 'trail' && isValidCoordinate(roadData.roadLat, roadData.roadLon) && (
            <>
              <Marker position={[roadData.roadLat, roadData.roadLon]} icon={trailIcon}>
                <Popup>
                  <div className="text-sm">
                    <strong>🥾 Nearest Trail Access</strong><br />
                    Trail: {roadData.roadName}<br />
                    Lat: {roadData.roadLat.toFixed(6)}<br />
                    Lon: {roadData.roadLon.toFixed(6)}<br />
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${roadData.roadLat},${roadData.roadLon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </Popup>
              </Marker>
              {roadData.trailheadRoad && isValidCoordinate(roadData.trailheadRoad.roadLat, roadData.trailheadRoad.roadLon) && (
                <Marker position={[roadData.trailheadRoad.roadLat, roadData.trailheadRoad.roadLon]} icon={roadIcon}>
                  <Popup>
                    <div className="text-sm">
                      <strong>🚗 Trailhead Road Access</strong><br />
                      Road: {(roadData.trailheadRoad.roadName || 'Unknown Road')}<br />
                      Lat: {roadData.trailheadRoad.roadLat.toFixed(6)}<br />
                      Lon: {roadData.trailheadRoad.roadLon.toFixed(6)}<br />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${roadData.trailheadRoad.roadLat},${roadData.trailheadRoad.roadLon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  </Popup>
                </Marker>
              )}
            </>
          )}
        </MapContainer>
      </div>
      {/* Weather Forecast Panel - now below the map */}
      <div className="p-3 bg-gray-900/80 rounded-lg border border-gray-700 max-w-4xl mx-auto w-full">
        <WeatherComparisonTable
          launchWeather={launchWeather ?? null}
          landingWeather={landingWeather ?? null}
          unitSystem={unitSystem}
        />
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
