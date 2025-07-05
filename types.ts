export type UnitSystem = 'metric' | 'imperial';

export interface CalculatorParams {
  payloadWeight: number; // g
  balloonWeight: number; // g
  parachuteWeight: number; // g
  neckLift: number; // g
  gas: 'Helium' | 'Hydrogen';
}

export interface LaunchParams {
  lat: number;
  lon: number;
  launchTime: string; // ISO format string
  launchAltitude: number; // meters
  ascentRate: number; // m/s
  burstAltitude: number; // meters
  descentRate: number; // m/s
}

export interface FlightPoint {
  time: number; // seconds from launch
  lat: number;
  lon: number;
  altitude: number; // meters
}

export interface PredictionResult {
  path: FlightPoint[];
  launchPoint: FlightPoint;
  burstPoint: FlightPoint;
  landingPoint: FlightPoint;
  totalTime: number; // seconds
  maxAltitude?: number;
  distance?: number;
  flightDuration?: number;
}

export interface WeatherData {
  hourly: {
    time: string[];
    temperature_2m?: (number | null)[];
    relativehumidity_2m?: (number | null)[];
    dewpoint_2m?: (number | null)[];
    apparent_temperature?: (number | null)[];
    precipitation?: (number | null)[];
    rain?: (number | null)[];
    snowfall?: (number | null)[];
    cloudcover?: (number | null)[];
    cloudcover_low?: (number | null)[];
    cloudcover_mid?: (number | null)[];
    cloudcover_high?: (number | null)[];
    visibility?: (number | null)[];
    windspeed_10m?: (number | null)[];
    winddirection_10m?: (number | null)[];
    windgusts_10m?: (number | null)[];
    pressure_msl?: (number | null)[];
    surface_pressure?: (number | null)[];
    cape?: (number | null)[];
    cin?: (number | null)[];
    [key: string]: (number | null)[] | string[];
  };
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface WeatherPoint {
  speed: number;
  direction: number;
}

export interface LaunchWeather {
  ground?: WeatherPoint;
  mid?: WeatherPoint;
  jet?: WeatherPoint;
}

export interface WeatherForecast {
  temperature: number | null;
  humidity: number | null;
  dewpoint: number | null;
  apparentTemperature: number | null;
  precipitation: number | null;
  rain: number | null;
  snowfall: number | null;
  cloudcover: number | null;
  cloudcoverLow: number | null;
  cloudcoverMid: number | null;
  cloudcoverHigh: number | null;
  visibility: number | null;
  windSpeed10m: number | null;
  windDirection10m: number | null;
  windGusts10m: number | null;
  pressure: number | null;
  surfacePressure: number | null;
  cape: number | null;
  cin: number | null;
  description: string;
}

export interface ComprehensiveWeather {
  ground?: WeatherPoint;
  mid?: WeatherPoint;
  jet?: WeatherPoint;
  forecast?: WeatherForecast;
}

// --- New Types for Advanced Features ---

export interface AppConfig {
    launchParams: LaunchParams;
    calculatorParams: CalculatorParams;
    unitSystem: UnitSystem;
    aprsApiKey?: string;
    aprsCallsign?: string;
}

export interface CalculationStep {
    name: string;
    formula: string;
    calculation: string;
    result: string;
    unit: string;
}

export interface CalculationBreakdown {
    steps: CalculationStep[];
    ascentRate: number;
    burstAltitude: number;
}
